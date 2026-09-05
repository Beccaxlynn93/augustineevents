-- Every contact form submission, captured independently of the email.
-- The email remains the notification; this table is the durable record.

CREATE TABLE IF NOT EXISTS inquiries (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at      TEXT    NOT NULL,          -- ISO 8601 UTC
  first_name       TEXT,
  last_name        TEXT,
  email            TEXT,
  event_date       TEXT,                      -- as typed, may be blank
  venue_address    TEXT,
  package_type     TEXT,
  music_package    TEXT,
  rental_items     TEXT,                      -- newline separated summary
  estimated_total  TEXT,                      -- as shown to the visitor
  rental_delivery  TEXT,
  delivery_address TEXT,
  message          TEXT,
  email_sent       INTEGER NOT NULL DEFAULT 0,-- did the browser report EmailJS success
  user_agent       TEXT,
  country          TEXT
);

CREATE INDEX IF NOT EXISTS idx_inquiries_received ON inquiries(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_event    ON inquiries(event_date);
