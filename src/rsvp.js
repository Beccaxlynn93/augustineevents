/**
 * RSVPs for private family event pages (not part of the business site).
 *
 *   POST /api/rsvp               save or update a party's answers
 *   GET  /api/rsvp?token=...     read them back, so the page can show "change my RSVP"
 *   GET  /api/rsvp/list          every RSVP for the event (x-admin-key header; read by JB Home)
 *
 * Only reads and writes the `rsvps` table (migration 0009). A failure here can
 * never reach the inquiry form or the catalog: index.js only routes /api/rsvp* here.
 */

import { hashIp } from './guards.js';

const EVENTS = new Set(['thanksgiving-2026']);
const CHOICES = ['dinner', 'cave', 'steakhouse', 'fishing', 'no_film'];
const MAX_BODY_BYTES = 8 * 1024;
const MAX_PEOPLE = 2;
const NEW_PER_IP_PER_HOUR = 15;

// SHA-256 of the admin key. The key itself lives only on the homelab
// (claude-agent: /root/.config/augustine/rsvp-admin-key) and in JB Home.
// Only the hash is here, and the repo is public, so the key must stay random and long.
const ADMIN_KEY_SHA256 = 'e997cb05624ab0de38f0d3fbf41dab4f83809538c75c9a2bf41f3b83831a825a';
// No phone alert from here: this repo is public, so the alert topic cannot live
// in it. JB Home polls /api/rsvp/list and sends the alert from the homelab.

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function text(value, max) {
  if (typeof value !== 'string') return null;
  const t = value.trim().replace(/\s+/g, ' ');
  return t ? t.slice(0, max) : null;
}

function cleanPeople(list) {
  if (!Array.isArray(list)) return null;
  const people = [];
  for (const p of list.slice(0, MAX_PEOPLE)) {
    const name = text(p && p.name, 60);
    if (!name) continue;
    const row = { name };
    for (const c of CHOICES) row[c] = p[c] === true;
    people.push(row);
  }
  return people.length ? people : null;
}

async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function save(request, env) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false, error: 'Too long.' }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: 'Bad request.' }, 400);
  }
  const event = EVENTS.has(body.event) ? body.event : null;
  const people = cleanPeople(body.people);
  if (!event || !people) return json({ ok: false, error: 'Please add your name.' }, 400);

  // Honeypot: a bot gets a normal-looking answer and nothing is stored.
  if (typeof body.website === 'string' && body.website.trim()) {
    return json({ ok: true, token: crypto.randomUUID().replace(/-/g, '') });
  }

  const db = env.augustine_inquiries;
  const now = new Date().toISOString();
  const names = people.map((p) => p.name).join(' & ');
  const diet = text(body.diet, 500);
  const note = text(body.note, 1000);
  const token = typeof body.token === 'string' && /^[a-f0-9]{32}$/.test(body.token) ? body.token : null;

  let updated = false;
  if (token) {
    const r = await db
      .prepare('UPDATE rsvps SET names = ?, people = ?, diet = ?, note = ?, updated_at = ? WHERE token = ? AND event = ?')
      .bind(names, JSON.stringify(people), diet, note, now, token, event)
      .run();
    updated = r.meta && r.meta.changes > 0;
  }

  let saved = token;
  if (!updated) {
    const ipHash = await hashIp(request.headers.get('cf-connecting-ip'), env.IP_SALT);
    if (ipHash) {
      const since = new Date(Date.now() - 3600_000).toISOString();
      const { results } = await db
        .prepare('SELECT COUNT(*) AS n FROM rsvps WHERE ip_hash = ? AND created_at > ?')
        .bind(ipHash, since)
        .all();
      if (results[0] && results[0].n >= NEW_PER_IP_PER_HOUR) {
        return json({ ok: false, error: 'Too many RSVPs from here. Try again later.' }, 429);
      }
    }
    saved = crypto.randomUUID().replace(/-/g, '');
    await db
      .prepare('INSERT INTO rsvps (event, token, names, people, diet, note, ip_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(event, saved, names, JSON.stringify(people), diet, note, ipHash, now, now)
      .run();
  }

  return json({ ok: true, token: saved, updated });
}

async function readOne(url, env) {
  const token = url.searchParams.get('token') || '';
  if (!/^[a-f0-9]{32}$/.test(token)) return json({ ok: false }, 404);
  const row = await env.augustine_inquiries
    .prepare('SELECT people, diet, note, updated_at FROM rsvps WHERE token = ?')
    .bind(token)
    .first();
  if (!row) return json({ ok: false }, 404);
  return json({ ok: true, rsvp: { ...row, people: JSON.parse(row.people) } });
}

async function list(request, url, env) {
  const key = request.headers.get('x-admin-key') || '';
  if (!key || (await sha256(key)) !== ADMIN_KEY_SHA256) return json({ ok: false }, 404);
  const event = url.searchParams.get('event') || 'thanksgiving-2026';
  const { results } = await env.augustine_inquiries
    .prepare('SELECT id, names, people, diet, note, created_at, updated_at FROM rsvps WHERE event = ? ORDER BY created_at')
    .bind(event)
    .all();
  return json({ ok: true, rsvps: results.map((r) => ({ ...r, people: JSON.parse(r.people) })) });
}

export async function handleRsvp(request, env) {
  const url = new URL(request.url);
  try {
    if (url.pathname === '/api/rsvp/list' && request.method === 'GET') return await list(request, url, env);
    if (url.pathname === '/api/rsvp' && request.method === 'GET') return await readOne(url, env);
    if (url.pathname === '/api/rsvp' && request.method === 'POST') return await save(request, env);
    return json({ ok: false, error: 'Not found.' }, 404);
  } catch (err) {
    console.error('rsvp failed:', err && err.message);
    return json({ ok: false, error: 'Could not save that right now. Please try again.' }, 500);
  }
}
