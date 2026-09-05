/**
 * Abuse guards for the public inquiry endpoint.
 *
 * This endpoint both writes to the database and triggers an email, so an
 * unprotected version is a spam relay pointed at Becca's own inbox. These are
 * deliberately dependency free: no third party, no widget for a visitor to
 * solve, nothing that can break the form if an external service is down.
 *
 * A rejected bot is answered with a normal success response. Telling a bot why
 * it failed only helps it try again, and the real form ignores the response
 * body anyway.
 */

// A human filling in a wedding inquiry does not do it in under three seconds.
export const MIN_FILL_MS = 3000;

// Per hashed IP, per hour. Generous for a real couple comparing options,
// tight enough that a flood is capped.
export const RATE_LIMIT = 5;
export const RATE_WINDOW_MS = 60 * 60 * 1000;

// Not a validator, just a sanity check. Real address validation is delivery.
const EMAIL_SHAPE = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/;

/** Salted so the stored value cannot be reversed into an IP by rainbow table. */
export async function hashIp(ip, salt) {
  if (!ip) return null;
  const data = new TextEncoder().encode(`${salt || 'augustine'}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

/**
 * Returns { ok: true } to proceed, or { ok: false, reason } to discard.
 * Discarding is silent by design: see the note above.
 */
export async function screen(payload, row, request, env) {
  // 1. Honeypot. The field is off screen and hidden from assistive tech, so a
  //    human never sees it. Anything that fills it in is automated.
  if (typeof payload.website === 'string' && payload.website.trim() !== '') {
    return { ok: false, reason: 'honeypot' };
  }

  // 2. Time to fill. The form stamps when it rendered; too fast is scripted.
  const loadedAt = Number(payload.form_loaded_at);
  if (Number.isFinite(loadedAt) && loadedAt > 0) {
    const elapsed = Date.now() - loadedAt;
    if (elapsed >= 0 && elapsed < MIN_FILL_MS) {
      return { ok: false, reason: `too_fast:${elapsed}ms` };
    }
  }

  // 3. An inquiry with no usable reply address is not actionable, and is the
  //    shape most junk arrives in.
  if (!row.email || !EMAIL_SHAPE.test(row.email)) {
    return { ok: false, reason: 'no_usable_email' };
  }

  // 4. Rate limit per hashed IP. Caps the damage from anything that gets past
  //    the cheaper checks above.
  const ipHash = await hashIp(
    request.headers.get('cf-connecting-ip'),
    env.IP_SALT
  );
  if (ipHash) {
    try {
      const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
      const { results } = await env.augustine_inquiries
        .prepare(
          'SELECT COUNT(*) AS n FROM inquiries WHERE ip_hash = ? AND received_at > ?'
        )
        .bind(ipHash, since)
        .all();
      const recent = results && results[0] ? results[0].n : 0;
      if (recent >= RATE_LIMIT) {
        return { ok: false, reason: `rate_limited:${recent}`, ipHash };
      }
    } catch (err) {
      // A failure to count must not block a real inquiry. Fail open: the
      // cost of losing a lead is higher than the cost of one extra row.
      console.error('rate limit check failed, allowing:', err && err.message);
    }
  }

  return { ok: true, ipHash };
}
