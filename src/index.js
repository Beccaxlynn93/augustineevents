/**
 * augustineevents.com
 *
 * This Worker has two jobs: serve the rental catalog to the booking form, and
 * durably record contact form submissions. Everything else on the site is static
 * assets, which Cloudflare matches and serves BEFORE this code runs. If this file
 * throws on every request, the six pages, the images and the PDF all keep
 * serving. The blast radius is limited to paths that match no asset.
 *
 * The inquiry is written to D1 first, then the notification is sent. That order
 * is deliberate: storage is the durable thing, and a mail failure is recorded
 * rather than raised, so it can never cost us the record of a lead.
 */

import { sendNotification } from './email.js';
import { screen } from './guards.js';
// Shared with the browser. contact.html imports these same files for its live
// estimate, so the estimate a visitor sees and the price stored here are
// computed by one implementation and cannot drift apart.
import { buildCatalog } from '../js/catalog.js';
import { resolveCart, describeQuote, dollars } from '../js/pricing.js';

const MAX_BODY_BYTES = 16 * 1024;

// Only these keys are read from a submission. Anything else is discarded.
const FIELDS = [
  'first_name',
  'last_name',
  'email',
  'event_date',
  'venue_address',
  'package_type',
  'music_package',
  'rental_items',
  'estimated_total',
  'rental_delivery',
  'delivery_address',
  'message',
];

const MAX_FIELD_LEN = 4000;

function clean(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > MAX_FIELD_LEN ? trimmed.slice(0, MAX_FIELD_LEN) : trimmed;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// The fields the booking form needs, and nothing else. SELECT * rather than a
// column list so that code deployed ahead of a migration degrades to "no photo"
// instead of failing the whole query.
const ITEM_FIELDS = [
  'id', 'slug', 'name', 'category', 'note', 'unit_price', 'min_qty', 'total_qty',
  'delivery_only', 'listed', 'active', 'sort_order', 'photo', 'photo_position',
];

async function readCatalogRows(env) {
  const db = env.augustine_inquiries;
  const [items, bundles, bundleItems] = await Promise.all([
    db.prepare('SELECT * FROM items WHERE active = 1 ORDER BY sort_order').all(),
    db.prepare('SELECT id, slug, name, price, priority, active FROM bundles WHERE active = 1').all(),
    db.prepare('SELECT bundle_id, item_id, qty FROM bundle_items').all(),
  ]);
  return {
    items: items.results.map((r) => {
      const o = {};
      for (const k of ITEM_FIELDS) o[k] = r[k] === undefined ? null : r[k];
      return o;
    }),
    bundles: bundles.results,
    bundle_items: bundleItems.results,
  };
}

// Unlisted items are included on purpose: the Entire Brass Collection contains
// the Italian vases, which are bundle only, and the browser cannot price that
// bundle without knowing they exist. `listed` tells the page what to show.
async function serveCatalog(env) {
  const rows = await readCatalogRows(env);
  return new Response(JSON.stringify(rows), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // The catalog changes when Becca's inventory does, not per request.
      'cache-control': 'public, max-age=60',
    },
  });
}

/**
 * Prices the submitted cart on the server and returns the text to store.
 *
 * Returns null when there is nothing to do or pricing could not run, in which
 * case the caller keeps what the browser sent. An inquiry is a lead: nothing
 * in here is allowed to reject it or stop it being stored. A cart below the
 * order minimum, or over what is in stock, is still recorded, with a note,
 * because Becca approves every booking and can resolve it by reply.
 */
async function priceSubmittedCart(payload, env) {
  if (!Array.isArray(payload.cart) || payload.cart.length === 0) return null;
  if (payload.cart.length > 50) return null;

  const rows = await readCatalogRows(env);
  const catalog = buildCatalog(rows.items, rows.bundles, rows.bundle_items);
  const quote = resolveCart(payload.cart, catalog);

  if (!quote.lines.length) {
    // Invalid cart: unknown item, over stock, under a minimum. Keep the
    // visitor's own summary and flag what the check found.
    return { rental_note: 'Pricing check: ' + quote.errors.join(' '), quote };
  }

  const out = describeQuote(quote, catalog);
  out.push('Priced by the website from the live catalog.');
  return { rental_items: out.join('\n'), quote };
}

async function recordInquiry(request, env) {
  const raw = await request.text();

  if (raw.length > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'Submission too large.' }, 413);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: 'Could not read that submission.' }, 400);
  }
  if (!payload || typeof payload !== 'object') {
    return json({ ok: false, error: 'Could not read that submission.' }, 400);
  }

  const row = {};
  for (const key of FIELDS) row[key] = clean(payload[key]);

  // A submission with no name, no email and no message carries nothing worth
  // keeping, and is the shape an empty automated POST arrives in.
  if (!row.first_name && !row.last_name && !row.email && !row.message) {
    return json({ ok: false, error: 'Nothing to record.' }, 422);
  }

  // Abuse screening. A rejection is answered as success on purpose, so an
  // automated caller learns nothing about why it was dropped.
  const verdict = await screen(payload, row, request, env);
  if (!verdict.ok) {
    console.log('discarded submission:', verdict.reason);
    return json({ ok: true });
  }

  // Server-authoritative rental pricing. The browser's own summary is kept if
  // this cannot run, so a catalog or pricing failure never costs the lead.
  try {
    const priced = await priceSubmittedCart(payload, env);
    if (priced && priced.rental_items) {
      row.rental_items = clean(priced.rental_items);
      // Music packages are not in the catalog yet, so their price is the one
      // price still taken from the browser. It is a fixed list of six.
      const music = Number(payload.music_price);
      const musicCents = Number.isFinite(music) && music > 0 && music < 10000 ? Math.round(music * 100) : 0;
      const total = priced.quote.subtotal + musicCents;
      const client = row.estimated_total;
      row.estimated_total = dollars(total);
      if (client && client !== row.estimated_total) {
        console.warn('estimate mismatch: browser sent', client, 'server priced', row.estimated_total);
      }
    } else if (priced && priced.rental_note) {
      row.rental_items = clean([row.rental_items, priced.rental_note].filter(Boolean).join('\n'));
    }
  } catch (err) {
    console.error('rental pricing failed, keeping the browser summary:', err && err.message);
  }

  const stored = await env.augustine_inquiries
    .prepare(
      `INSERT INTO inquiries (
         received_at, first_name, last_name, email, event_date, venue_address,
         package_type, music_package, rental_items, estimated_total,
         rental_delivery, delivery_address, message, email_sent,
         user_agent, country, ip_hash
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      new Date().toISOString(),
      row.first_name,
      row.last_name,
      row.email,
      row.event_date,
      row.venue_address,
      row.package_type,
      row.music_package,
      row.rental_items,
      row.estimated_total,
      row.rental_delivery,
      row.delivery_address,
      row.message,
      0,
      clean(request.headers.get('user-agent')),
      request.headers.get('cf-ipcountry') || null,
      verdict.ipHash || null
    )
    .run();

  const id = stored && stored.meta ? stored.meta.last_row_id : null;

  // The inquiry is safe at this point. Sending is best effort from here: a mail
  // failure is recorded, never raised, and never costs us the record.
  const result = await sendNotification(env, row);

  if (result.sent && id) {
    try {
      await env.augustine_inquiries
        .prepare('UPDATE inquiries SET email_sent = 1 WHERE id = ?')
        .bind(id)
        .run();
    } catch {
      /* the row exists, which is what matters */
    }
  } else if (!result.sent) {
    console.error('inquiry', id, 'stored but no notification delivered:',
      (result.failed || [result.error]).join(' | '));
  }

  if (result.failed && result.failed.length && result.sent) {
    console.warn('inquiry', id, 'partially delivered, failed:', result.failed.join(' | '));
  }

  return json({ ok: true, notified: result.sent });
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/catalog') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return json({ ok: false, error: 'Use GET.' }, 405);
      }
      try {
        return await serveCatalog(env);
      } catch (err) {
        // The booking form treats any failure here as "catalog unavailable" and
        // falls back to a free-text request, so the form itself keeps working.
        console.error('catalog read failed:', err && err.message);
        return json({ ok: false, error: 'Catalog unavailable.' }, 503);
      }
    }

    if (pathname === '/api/inquiries') {
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'Use POST.' }, 405);
      }
      try {
        return await recordInquiry(request, env);
      } catch (err) {
        // Never surface a stack trace, and never let a storage failure read as
        // anything the visitor needs to act on. The browser ignores this
        // response either way.
        console.error('inquiry insert failed:', err && err.message);
        return json({ ok: false, error: 'Could not record that right now.' }, 500);
      }
    }

    // Matches today's behavior for any path that is not a static asset:
    // status 404, empty body.
    return new Response(null, { status: 404 });
  },
};
