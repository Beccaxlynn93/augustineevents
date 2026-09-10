-- Phase 01: product photos become catalog data.
--
-- The booking form's rental picker now renders from GET /api/catalog and shows a
-- photo beside each item, so the photo has to live with the rest of the item row.
-- Until now the only record of which photo belongs to which item was the <img>
-- tags in event-rentals.html.
--
-- photo is a root-relative path to a file deployed with the site. It is stored raw,
-- spaces included, and URL-encoded by the page that renders it. A test checks that
-- every path here exists on disk, so renaming a photo without updating this table
-- fails the suite instead of shipping a broken image.
--
-- photo_position is a CSS object-position value for cropping the photo into a tile,
-- carried over from the crop-* classes event-rentals.html used. NULL means centred.
--
-- ALTER TABLE has no IF NOT EXISTS in SQLite, so this file relies on the migrations
-- runner to apply it once. The UPDATEs are idempotent. One statement per row, per
-- the D1 compound-statement ceiling described in CLAUDE.md.

ALTER TABLE items ADD COLUMN photo TEXT;
ALTER TABLE items ADD COLUMN photo_position TEXT;

UPDATE items SET photo = '/Photographer photos/Round Toile Tablecloths.jpg',     photo_position = 'center 65%' WHERE slug = 'toile-round-tablecloth';
UPDATE items SET photo = '/Photographer photos/Rectangle Toile Tablecloths.jpg', photo_position = 'center 65%' WHERE slug = 'toile-rect-tablecloth';
UPDATE items SET photo = '/Photographer photos/Wisteria Chandelier.jpg'                                        WHERE slug = 'wisteria-chandelier';
UPDATE items SET photo = '/Photographer photos/Faux Floral Arrangements.jpg'                                   WHERE slug = 'faux-floral-arrangement';
UPDATE items SET photo = '/Photographer photos/Single Assorted Brass Candlesticks.jpg'                          WHERE slug = 'brass-candlestick';
UPDATE items SET photo = '/Photographer photos/3 arm candelabra.jpg'                                           WHERE slug = 'brass-candelabra-3arm';
UPDATE items SET photo = '/Photographer photos/9 arm candelabra.jpg'                                           WHERE slug = 'brass-candelabra-9arm';
UPDATE items SET photo = '/Photographer photos/Dinner Plates.jpg'                                              WHERE slug = 'dinner-plate';
UPDATE items SET photo = '/Photographer photos/Salad Plates.jpg'                                               WHERE slug = 'salad-plate';
UPDATE items SET photo = '/Photographer photos/Dessert Ramekins.jpg'                                           WHERE slug = 'dessert-ramekin';
UPDATE items SET photo = '/Photographer photos/Breadstick Baskets.jpg'                                         WHERE slug = 'breadstick-basket';
UPDATE items SET photo = '/Photographer photos/Beverage Dispensers.jpg'                                        WHERE slug = 'glass-beverage-dispenser';
UPDATE items SET photo = '/Photographer photos/Beverage Urns.jpg'                                              WHERE slug = 'beverage-urn';
UPDATE items SET photo = '/Photographer photos/Sage Green Fringe Umbrella.jpg',  photo_position = 'center top' WHERE slug = 'patio-umbrella';
UPDATE items SET photo = '/Photographer photos/Cornhole Boards.jpg'                                            WHERE slug = 'cornhole-boards';

-- The Italian vases (italian-vase-small, italian-vase-large) are deliberately left
-- without a photo. They are bundle only and unlisted, and no photo of them exists.
