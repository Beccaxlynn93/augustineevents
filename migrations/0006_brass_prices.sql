-- Brass price changes (owners, 2026-10-21). Not applied to production until the
-- site changes are merged; see the vault note.
-- Candlestick holders $3 -> $4 each; the 50-piece collection stays $140.
UPDATE items SET unit_price = 400  WHERE slug = 'brass-candlestick';
-- 3 arm candelabras $7 -> $10 each; the set of 8 stays $50.
UPDATE items SET unit_price = 1000 WHERE slug = 'brass-candelabra-3arm';
