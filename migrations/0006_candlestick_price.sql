-- Brass candlestick holders go from $3 to $4 each (owners, 2026-10-21).
-- The 50-piece collection stays $140, so 50 holders still price as the bundle.
UPDATE items SET unit_price = 400 WHERE slug = 'brass-candlestick';
