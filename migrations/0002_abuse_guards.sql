-- Supports rate limiting without storing raw IP addresses.
-- ip_hash is a salted SHA-256, so it can identify a repeat sender within the
-- window but is not personal data at rest.

ALTER TABLE inquiries ADD COLUMN ip_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_inquiries_iphash ON inquiries(ip_hash, received_at);
