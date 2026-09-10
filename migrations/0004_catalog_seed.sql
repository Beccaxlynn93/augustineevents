-- Seed the catalog from augustine-inventory-master.numbers (v2, Sept 2026), which
-- is the physical inventory workbook and the real source of truth. Where the
-- workbook and the live pages disagreed, the owners decided on 2026-09-09 and the
-- decision is recorded in a comment at each spot. Prices are never changed here on
-- inference: a published price is Becca's call, not a migration's.
--
-- Turnaround Days comes straight from the workbook. Nothing is 0: even a brass
-- candlestick needs a day back before it can go out again.

-- D1 caps the number of terms in a compound SELECT, and SQLite implements a
-- multi-row VALUES clause as exactly that. A single 17 row insert therefore fails
-- with SQLITE_ERROR 7500. One statement per row is verbose but immune, and this is
-- a seed file that runs once.

  -- Linens. Workbook turnaround: 3 days, the longest in the catalog.
INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('LN-TO-RND',    'toile-round-tablecloth',   'Sage Green Toile Round Tablecloths',       'linens',    '120" round',                      1000,  1, 11, 0, 3, 1, 10);

  -- The workbook shows 2 of 3 available, with one out of service. Confirmed by the
  -- owners 2026-09-09 that the third is back in service, so all 3 rent. The
  -- workbook's Qty Available cell is stale and needs correcting at the source.
INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('LN-TO-RCT',    'toile-rect-tablecloth',    'Sage Green Toile Rectangular Tablecloths', 'linens',    '90"x156"',                        1000,  1,  3, 0, 3, 1, 20);

  -- Decor and large installs
INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('IN-CH-WIS',    'wisteria-chandelier',      'Wisteria Chandelier',                      'decor',     '55" cream',                       2500,  1,  1, 0, 1, 1, 30);

INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('IN-FL-GRD',    'faux-floral-arrangement',  'Faux Floral Large Arrangements',           'decor',     'Ivory, white and light blush',    7500,  1,  4, 0, 2, 1, 40);

INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('BR-CS-AST',    'brass-candlestick',        'Brass Candlestick Holders',                'decor',     'Assorted short, medium and tall',  300,  1, 50, 0, 1, 1, 50);

INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('BR-CD-3AR',    'brass-candelabra-3arm',    '3 Arm Brass Candelabras',                  'decor',     'Set of 8, matching',               700,  1,  8, 0, 1, 1, 60);

INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('BR-CD-9AR',    'brass-candelabra-9arm',    '9 Arm Candelabra',                         'decor',     'Focal brass piece',               2500,  1,  1, 0, 1, 1, 70);

  -- The Italian vases, finally. Real inventory across two SKUs, per the workbook.
  -- listed = 0: they stay bundle only on the site (CLAUDE.md, 2026-09-09) but must
  -- exist as items so the bundle can reserve them against a date.
INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('BR-VS-ITL-SM', 'italian-vase-small',       'Small Brass Italian Vases',                'decor',     'Bundle component',                 500,  2,  2, 0, 1, 0, 75);

INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('BR-VS-ITL-LG', 'italian-vase-large',       'Large Brass Italian Vase',                 'decor',     'Bundle component',                1500,  1,  1, 0, 1, 0, 76);

  -- Tableware and glassware
INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('TB-PL-DIN',    'dinner-plate',             'White Round Dinner Plates',                'tableware', '10.5" coupe',                      125, 20, 60, 1, 2, 1, 80);

INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('TB-PL-SAL',    'salad-plate',              'White Round Salad Plates',                 'tableware', '7.5" coupe',                        75, 20, 60, 1, 2, 1, 90);

INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('TB-RA-DES',    'dessert-ramekin',          'White Dessert Ramekins',                   'tableware', 'Ruffled rim',                      175, 20, 60, 1, 2, 1, 100);

INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('TB-BK-BRD',    'breadstick-basket',        'Breadstick Baskets',                       'tableware', '4.5x4.5x4" woven',                 125,  1, 18, 0, 1, 1, 110);

INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('GL-BD-3G',     'glass-beverage-dispenser', 'Glass Beverage Dispensers',                'tableware', '3 gal hammered glass with stand', 2000,  1,  4, 1, 2, 1, 120);

  -- DELIVERY CONFLICT: the workbook marks urns Delivery Only = Y, but Becca said
  -- directly on 2026-09-09 that they are not. Her answer is the more recent and
  -- more specific, so it wins here and the workbook cell needs correcting.
INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('GL-BU-GDN',    'beverage-urn',             'Beverage Urns',                            'tableware', 'Garden style, set of 2',          1000,  2,  2, 0, 2, 1, 130);

  -- Outdoor
INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('OD-UM-FRG',    'patio-umbrella',           'Sage Green Outdoor Umbrella',              'outdoor',   '7ft fringe, push button tilt',    2500,  1,  1, 0, 1, 1, 140);

INSERT OR IGNORE INTO items
  (sku, slug, name, category, note, unit_price, min_qty, total_qty, delivery_only, buffer_after_days, listed, sort_order)
VALUES ('OD-CH-SET',    'cornhole-boards',          'Cornhole Game Boards',                     'outdoor',   'Handmade, bags not included',     4000,  1,  2, 0, 1, 1, 150);

  -- Live on the site but missing from the workbook's Collections tab. Confirmed a
  -- real offer by the owners 2026-09-09; it is the workbook that needs the row
  -- added. $250 against $300 of parts, a 17% discount, which is in the normal band.
INSERT OR IGNORE INTO bundles (slug, name, price, priority, active) VALUES ('floral-four',            'All Four Floral Arrangements',      25000,  10, 1);

  -- Workbook says $145; owners confirmed 2026-09-09 that the live $140 is correct.
INSERT OR IGNORE INTO bundles (slug, name, price, priority, active) VALUES ('candlestick-collection', 'Full Brass Candlestick Collection',  14000,  10, 1);

INSERT OR IGNORE INTO bundles (slug, name, price, priority, active) VALUES ('candelabra-set',         'All 8 Brass Candelabras',             5000,  10, 1);

  -- Workbook says $240; owners confirmed 2026-09-09 that the live $230 is correct.
  -- Now ACTIVE: the vases exist as items, so the bundle finally contains what it
  -- has always claimed to sell. Parts total $256, so it is a genuine discount at
  -- either price and the resolver will choose it correctly.
INSERT OR IGNORE INTO bundles (slug, name, price, priority, active) VALUES ('brass-collection',       'Entire Brass Collection Bundle',     23000, 100, 1);

-- Same reason: one statement per membership rather than a UNION ALL chain.
-- Resolved by slug so the seed does not depend on autoincrement ids.

INSERT OR IGNORE INTO bundle_items (bundle_id, item_id, qty)
SELECT b.id, i.id, 4 FROM bundles b, items i
 WHERE b.slug = 'floral-four' AND i.slug = 'faux-floral-arrangement';

INSERT OR IGNORE INTO bundle_items (bundle_id, item_id, qty)
SELECT b.id, i.id, 50 FROM bundles b, items i
 WHERE b.slug = 'candlestick-collection' AND i.slug = 'brass-candlestick';

INSERT OR IGNORE INTO bundle_items (bundle_id, item_id, qty)
SELECT b.id, i.id, 8 FROM bundles b, items i
 WHERE b.slug = 'candelabra-set' AND i.slug = 'brass-candelabra-3arm';

INSERT OR IGNORE INTO bundle_items (bundle_id, item_id, qty)
SELECT b.id, i.id, 50 FROM bundles b, items i
 WHERE b.slug = 'brass-collection' AND i.slug = 'brass-candlestick';

INSERT OR IGNORE INTO bundle_items (bundle_id, item_id, qty)
SELECT b.id, i.id, 8 FROM bundles b, items i
 WHERE b.slug = 'brass-collection' AND i.slug = 'brass-candelabra-3arm';

INSERT OR IGNORE INTO bundle_items (bundle_id, item_id, qty)
SELECT b.id, i.id, 1 FROM bundles b, items i
 WHERE b.slug = 'brass-collection' AND i.slug = 'brass-candelabra-9arm';

INSERT OR IGNORE INTO bundle_items (bundle_id, item_id, qty)
SELECT b.id, i.id, 2 FROM bundles b, items i
 WHERE b.slug = 'brass-collection' AND i.slug = 'italian-vase-small';

INSERT OR IGNORE INTO bundle_items (bundle_id, item_id, qty)
SELECT b.id, i.id, 1 FROM bundles b, items i
 WHERE b.slug = 'brass-collection' AND i.slug = 'italian-vase-large';

