/**
 * The inquiry notification sent to Becca and Justin.
 *
 * Replaces the EmailJS template, which lived in a third party dashboard nobody
 * here can edit. Because this is built from the same object that is written to
 * D1, a field can never be captured but silently missing from the email, which
 * is exactly how venue_address went missing before.
 *
 * House copy rule: no em dashes or en dashes anywhere in customer facing text.
 */

export const NOTIFY = ['raugustinemusic@gmail.com', 'justinben2335@gmail.com'];
export const FROM = { email: 'bookings@augustineevents.com', name: 'Augustine Website' };

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 2027-06-12 becomes "Saturday, 12 June 2027". Anything unexpected is passed through. */
function prettyDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || 'Not given';
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const [y, m, d] = iso.split('-').map(Number);
  if (!months[m - 1]) return iso;
  const dow = days[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${dow}, ${d} ${months[m - 1]} ${y}`;
}

/** A value worth showing: drops blanks and the placeholders the form sends. */
function real(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return !t || /^(none|n\/a|not given|0)$/i.test(t) ? null : t;
}

/**
 * Lays the inquiry out by what the visitor is booking: contact and event first,
 * then one section per service they ticked (music, tablescape, rentals), then the
 * total and their own message. Only filled-in fields are shown.
 *
 * `extras` carries the structured tablescape answers and the visitor's own message
 * without the tablescape lines the browser appends to it for storage.
 */
export function buildEmail(row, extras = {}) {
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Someone';
  const when = prettyDate(row.event_date);
  const services = real(row.package_type);
  const wants = (word) => !!services && services.toLowerCase().includes(word);

  const subject = `New inquiry: ${name}, ${when}${services ? ' · ' + services : ''}`;

  const rentals = real(row.rental_items);
  const music = real(row.music_package);
  const guests = real(extras.ts_guests);
  const setting = real(extras.ts_setting);
  const theme = real(extras.theme_inspiration);
  const delivery = real(row.rental_delivery);
  const deliveryAddr = delivery === 'Delivery' ? real(row.delivery_address) : null;
  const total = real(row.estimated_total);
  // Prefer the visitor's own words; fall back to the stored message.
  const message = extras.client_message !== undefined ? real(extras.client_message) : real(row.message);

  // Sections: [title, [[label, value, href?], ...], preformatted block?]
  const sections = [];
  sections.push(['Event', [
    ['Date', when],
    ['Venue', real(row.venue_address) || 'Not given'],
  ]]);
  if (wants('music') || music) {
    sections.push(['Live music', [['Package', music || 'Not chosen yet']]]);
  }
  if (wants('tablescape') || guests || setting || theme) {
    sections.push(['Custom tablescape', [
      ['Guests', guests || 'Not given'],
      ['Indoor or outdoor', setting || 'Not given'],
      ['Theme inspiration', theme || 'None shared', theme && /^https?:\/\//i.test(theme) ? theme : null],
    ]]);
  }
  if (wants('rental') || rentals) {
    const rows = [['Delivery or pickup', delivery || 'Not chosen']];
    if (deliveryAddr) rows.push(['Delivery address', deliveryAddr]);
    sections.push(['Event rentals', rows, rentals || 'No items selected']);
  }

  const covered = [music && 'music', rentals && 'rentals'].filter(Boolean).join(' and ') || 'the selection';
  const totalNote = total
    ? `Covers ${covered}, as priced by the website.` + (wants('tablescape') ? ' Tablescapes are quoted separately.' : '')
    : null;

  // ---- plain text ----
  const text = [
    `New inquiry from the website`,
    ``,
    `${name}`,
    `${row.email || 'No email given'}`,
    ...(services ? [`Booking: ${services}`] : []),
    ...sections.flatMap(([title, rows, block]) => [
      ``,
      title.toUpperCase(),
      ...rows.map(([l, v]) => `${l}: ${v}`),
      ...(block ? [``, block] : []),
    ]),
    ...(total ? [``, `ESTIMATED TOTAL: ${total}`, totalNote] : []),
    ``,
    `THEIR MESSAGE`,
    message || 'No message left.',
    ``,
    `Reply directly to this email to reach them.`,
  ].join('\n');

  // ---- html ----
  // Inline styles only. Email clients strip <style> blocks, and the palette is
  // the site's own so the notification looks like it came from the brand.
  const line = (label, value, href) => `
        <tr>
          <td style="padding:6px 16px 6px 0;color:#5a5a5a;font-size:13px;white-space:nowrap;vertical-align:top;width:140px;">${esc(label)}</td>
          <td style="padding:6px 0;color:#2c2c2c;font-size:14px;vertical-align:top;">${href ? `<a href="${esc(href)}" style="color:#4a5e40;">${esc(value)}</a>` : esc(value)}</td>
        </tr>`;
  const heading = (t) => `<div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#4a5e40;font-weight:700;">${esc(t)}</div>`;
  const section = ([title, rows, block]) => `
      <div style="margin-top:22px;padding-top:16px;border-top:1px solid #e8e4dc;">
        ${heading(title)}
        <table style="width:100%;border-collapse:collapse;margin-top:6px;">${rows.map((r) => line(...r)).join('')}
        </table>${block ? `
        <pre style="margin:10px 0 0;padding:12px 14px;background:#faf8f4;font-family:inherit;font-size:13px;color:#2c2c2c;white-space:pre-wrap;line-height:1.6;">${esc(block)}</pre>` : ''}
      </div>`;

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f5f2ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e8e4dc;">
    <div style="background:#2e3b28;padding:20px 28px;">
      <div style="color:#f5f2ec;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">Augustine Music &amp; Events</div>
      <div style="color:#ffffff;font-size:20px;margin-top:6px;font-family:Georgia,'Times New Roman',serif;">New website inquiry</div>
    </div>

    <div style="padding:24px 28px;">
      <div style="font-size:21px;color:#2e3b28;font-family:Georgia,'Times New Roman',serif;">${esc(name)}</div>
      <div style="margin-top:4px;font-size:14px;">
        <a href="mailto:${esc(row.email || '')}" style="color:#4a5e40;">${esc(row.email || 'No email given')}</a>
      </div>
      ${services ? `<div style="margin-top:12px;font-size:13px;color:#2c2c2c;"><span style="display:inline-block;padding:4px 12px;border-radius:999px;background:#eef2ea;color:#2e3b28;">${esc(services)}</span></div>` : ''}
      ${sections.map(section).join('')}
      ${total ? `
      <div style="margin-top:22px;padding:14px 16px;background:#f8faf7;border-left:3px solid #4a5e40;">
        <span style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5a5a5a;font-weight:700;">Estimated total</span>
        <span style="float:right;font-size:17px;font-weight:700;color:#4a5e40;">${esc(total)}</span>
        <div style="clear:both;margin-top:4px;font-size:12px;color:#5a5a5a;">${esc(totalNote)}</div>
      </div>` : ''}

      <div style="margin-top:22px;padding-top:16px;border-top:1px solid #e8e4dc;">
        ${heading('Their message')}
        <p style="margin:8px 0 0;font-size:14px;color:#2c2c2c;line-height:1.7;white-space:pre-wrap;">${esc(message || 'No message left.')}</p>
      </div>

      <p style="margin:24px 0 0;font-size:12px;color:#5a5a5a;line-height:1.6;">
        Reply to this email to answer them directly. A copy of this inquiry is
        stored on the site, so it is not lost if this message goes astray.
      </p>
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Best effort. Returns true only on a confirmed send. Never throws, because a
 * mail failure must not cost us the stored inquiry.
 */
export async function sendNotification(env, row, extras = {}) {
  if (!env.EMAIL) return { sent: false, error: 'EMAIL binding not configured' };

  // Recipients come from config when present, so they can be changed without a
  // code edit. Falls back to the two owners.
  const recipients = (env.NOTIFY_EMAILS || '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
  const to = recipients.length ? recipients : NOTIFY;

  const { subject, text, html } = buildEmail(row, extras);

  // Sent one recipient at a time on purpose. On the free path a send is only
  // permitted to verified destination addresses, and a single unverified
  // address would otherwise fail the whole call and cost everyone the
  // notification.
  const results = await Promise.all(
    to.map(async (address) => {
      try {
        await env.EMAIL.send({
          to: address,
          from: FROM,
          // Lets Becca hit reply and land in the customer's inbox.
          replyTo: row.email || undefined,
          subject,
          text,
          html,
        });
        return { address, ok: true };
      } catch (err) {
        return { address, ok: false, error: (err && err.message) || 'unknown' };
      }
    })
  );

  const delivered = results.filter((r) => r.ok).map((r) => r.address);
  const failed = results.filter((r) => !r.ok);

  return {
    sent: delivered.length > 0,
    delivered,
    failed: failed.map((f) => `${f.address}: ${f.error}`),
  };
}
