/**
 * augustineevents.com
 *
 * This Worker exists for one job: durably record contact form submissions.
 * Everything else on the site is static assets, which Cloudflare matches and
 * serves BEFORE this code runs. If this file throws on every request, the six
 * pages, the images and the PDF all keep serving. The blast radius is limited
 * to paths that match no asset.
 *
 * The email is still sent from the browser via EmailJS and is deliberately not
 * routed through here. Capturing an inquiry must never be able to stop one
 * being delivered.
 */

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

  await env.augustine_inquiries
    .prepare(
      `INSERT INTO inquiries (
         received_at, first_name, last_name, email, event_date, venue_address,
         package_type, music_package, rental_items, estimated_total,
         rental_delivery, delivery_address, message, email_sent,
         user_agent, country
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      payload.email_sent ? 1 : 0,
      clean(request.headers.get('user-agent')),
      request.headers.get('cf-ipcountry') || null
    )
    .run();

  return json({ ok: true });
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

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
