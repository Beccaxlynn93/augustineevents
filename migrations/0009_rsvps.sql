-- RSVPs for private family event pages (first one: /thanksgiving-2026/).
-- Kept apart from inquiries on purpose: these are not leads, and nothing that
-- reads inquiries (the notification email, Becca's lead list) should see them.
--
-- One row per party (a couple, or one person). `people` is JSON:
--   [{"name": "...", "dinner": true, "cave": false, ...}, ...]
-- The browser keeps `token` so the same party can change its answers later.

CREATE TABLE IF NOT EXISTS rsvps (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  names       TEXT NOT NULL,
  people      TEXT NOT NULL,
  diet        TEXT,
  note        TEXT,
  ip_hash     TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rsvps_event ON rsvps(event, updated_at);
CREATE INDEX IF NOT EXISTS idx_rsvps_iphash ON rsvps(ip_hash, created_at);
