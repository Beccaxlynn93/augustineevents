-- "How did you hear about us?" on the booking form (2026-10-26), so bookings can be
-- tied back to ads and referrals.
ALTER TABLE inquiries ADD COLUMN heard_from TEXT;
