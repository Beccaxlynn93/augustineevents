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

const LABELS = [
  ['event_date', 'Event date'],
  ['venue_address', 'Venue'],
  ['package_type', 'Package type'],
  ['music_package', 'Music package'],
  ['rental_delivery', 'Delivery or pickup'],
  ['delivery_address', 'Delivery address'],
];

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 2027-06-12 becomes "12 June 2027". Anything unexpected is passed through. */
function prettyDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || 'Not given';
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const [y, m, d] = iso.split('-').map(Number);
  if (!months[m - 1]) return iso;
  return `${d} ${months[m - 1]} ${y}`;
}

export function buildEmail(row) {
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Someone';
  const when = prettyDate(row.event_date);

  const subject = `New inquiry: ${name}, ${when}`;

  const details = LABELS
    .filter(([key]) => row[key])
    .map(([key, label]) => [label, key === 'event_date' ? when : row[key]]);

  const rentals = (row.rental_items || '').trim();
  const hasRentals = rentals && rentals !== 'None';

  // ---- plain text ----
  // null means "omit this line". Empty strings are kept, because they are the
  // blank lines that give the message its paragraph breaks.
  const text = [
    `New inquiry from the website`,
    ``,
    `Name:  ${name}`,
    `Email: ${row.email || 'Not given'}`,
    ...details.map(([l, v]) => `${l}: ${v}`),
    ``,
    hasRentals ? `Rental items:\n${rentals}` : `Rental items: none selected`,
    row.estimated_total ? `Estimated total: ${row.estimated_total}` : null,
    ``,
    row.message ? `Message:\n${row.message}` : `No message left.`,
    ``,
    `Reply directly to this email to reach them.`,
  ].filter((line) => line !== null).join('\n');

  // ---- html ----
  // Inline styles only. Email clients strip <style> blocks, and the palette is
  // the site's own so the notification looks like it came from the brand.
  const row2 = (label, value) => `
      <tr>
        <td style="padding:7px 16px 7px 0;color:#5a5a5a;font-size:13px;white-space:nowrap;vertical-align:top;">${esc(label)}</td>
        <td style="padding:7px 0;color:#2c2c2c;font-size:14px;vertical-align:top;">${esc(value)}</td>
      </tr>`;

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f5f2ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e8e4dc;">
    <div style="background:#2e3b28;padding:20px 28px;">
      <div style="color:#f5f2ec;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">Augustine Music &amp; Events</div>
      <div style="color:#ffffff;font-size:20px;margin-top:6px;font-family:Georgia,'Times New Roman',serif;">New website inquiry</div>
    </div>

    <div style="padding:24px 28px;">
      <div style="font-size:19px;color:#2e3b28;font-family:Georgia,'Times New Roman',serif;">${esc(name)}</div>
      <div style="margin-top:4px;font-size:14px;">
        <a href="mailto:${esc(row.email || '')}" style="color:#4a5e40;">${esc(row.email || 'No email given')}</a>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:18px;">
        ${details.map(([l, v]) => row2(l, v)).join('')}
      </table>

      ${hasRentals ? `
      <div style="margin-top:22px;padding-top:16px;border-top:1px solid #e8e4dc;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5a5a5a;font-weight:700;">Rental items</div>
        <pre style="margin:8px 0 0;font-family:inherit;font-size:14px;color:#2c2c2c;white-space:pre-wrap;line-height:1.6;">${esc(rentals)}</pre>
      </div>` : ''}

      ${row.estimated_total ? `
      <div style="margin-top:16px;padding:12px 16px;background:#f8faf7;border-left:3px solid #4a5e40;">
        <span style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5a5a5a;font-weight:700;">Estimated total</span>
        <span style="float:right;font-size:16px;font-weight:700;color:#4a5e40;">${esc(row.estimated_total)}</span>
      </div>` : ''}

      ${row.message ? `
      <div style="margin-top:22px;padding-top:16px;border-top:1px solid #e8e4dc;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5a5a5a;font-weight:700;">Message</div>
        <p style="margin:8px 0 0;font-size:14px;color:#2c2c2c;line-height:1.7;white-space:pre-wrap;">${esc(row.message)}</p>
      </div>` : ''}

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
export async function sendNotification(env, row) {
  if (!env.EMAIL) return { sent: false, error: 'EMAIL binding not configured' };

  // Recipients come from config when present, so they can be changed without a
  // code edit. Falls back to the two owners.
  const recipients = (env.NOTIFY_EMAILS || '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
  const to = recipients.length ? recipients : NOTIFY;

  const { subject, text, html } = buildEmail(row);

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
