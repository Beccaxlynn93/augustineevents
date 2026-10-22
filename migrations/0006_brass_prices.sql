-- Brass price changes (owners, 2026-10-21). Not applied to production until the
-- site changes are merged; see the vault note.
-- Candlestick holders $3 -> $4 each; the 50-piece collection goes $140 -> $175.
UPDATE items SET unit_price = 400  WHERE slug = 'brass-candlestick';
-- 3 arm candelabras $7 -> $10 each; the set of 8 goes $50 -> $70.
UPDATE items SET unit_price = 1000 WHERE slug = 'brass-candelabra-3arm';
UPDATE bundles SET price = 7000 WHERE slug = 'candelabra-set';
UPDATE bundles SET price = 17500 WHERE slug = 'candlestick-collection';
-- Entire Brass Collection Bundle $230 -> $250.
UPDATE bundles SET price = 25000 WHERE slug = 'brass-collection';
