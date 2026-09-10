-- Phase 01: inventory becomes data.
--
-- Until now the catalog lived in two places: the cards in event-rentals.html and
-- the checkbox rows in contact.html. They drifted, which is how the florals ended
-- up priced differently on the two pages. This table is the single source of truth;
-- both pages will render from it.
--
-- Money is integer cents throughout. Never floats: 0.75 * 20 is not 15 in binary
-- floating point, and this arithmetic ends up on a customer's contract.
--
-- Dates are ISO YYYY-MM-DD. They sort and compare correctly as TEXT in SQLite and
-- sidestep timezone drift for what is really a calendar-day concept.

CREATE TABLE IF NOT EXISTS items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT    NOT NULL UNIQUE,
  -- Item ID from augustine-inventory-master.numbers, the physical inventory
  -- workbook. Kept so a row here can be reconciled against that sheet by eye.
  sku           TEXT    NOT NULL UNIQUE,
  name          TEXT    NOT NULL,
  category      TEXT    NOT NULL,           -- linens | decor | tableware | outdoor
  note          TEXT,                       -- the dimension/detail line shown to visitors
  unit_price    INTEGER NOT NULL,           -- cents
  min_qty       INTEGER NOT NULL DEFAULT 1, -- 20 for plates, 2 for urns
  total_qty     INTEGER NOT NULL,
  delivery_only INTEGER NOT NULL DEFAULT 0,

  -- Per-item hold buffers, in days, on top of the rental period itself.
  --
  -- Becca, 2026-09-09: the rental price covers 48 hours, typically Friday 10am to
  -- Sunday 10am. So the rental period is already the day either side of a Saturday
  -- event, and that is carried on the booking, not here.
  --
  -- buffer_after is the extra turnaround an item needs before it can go out again.
  -- Sourced from the Turnaround Days column of the inventory workbook, which has a
  -- figure for every item: 3 for linens, 2 for plates and anything washed, 1 for
  -- everything else. Nothing is 0, because nothing goes straight back out.
  buffer_before_days INTEGER NOT NULL DEFAULT 0,
  buffer_after_days  INTEGER NOT NULL DEFAULT 0,

  sort_order    INTEGER NOT NULL DEFAULT 0,

  -- active: exists and can be reserved. listed: shown in the public catalog.
  -- The Italian vases are active but unlisted, so the Brass Collection Bundle can
  -- reserve them against a date while they stay bundle only on the site, which is
  -- the decision recorded in CLAUDE.md on 2026-09-09.
  listed        INTEGER NOT NULL DEFAULT 1,
  active        INTEGER NOT NULL DEFAULT 1
);

-- Bundles are first class, because price is a function of the whole cart and not
-- of any one line. A volume discount ("$250 for all four florals") is modelled as a
-- bundle containing 4 of one item, so the resolver has exactly one concept to
-- handle rather than two.
--
-- priority breaks overlaps: the Entire Brass Collection contains the candlestick
-- collection and the candelabra set, so it must win over both when it applies.
CREATE TABLE IF NOT EXISTS bundles (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  slug     TEXT    NOT NULL UNIQUE,
  name     TEXT    NOT NULL,
  price    INTEGER NOT NULL,               -- cents
  priority INTEGER NOT NULL DEFAULT 0,     -- larger/more inclusive bundle wins
  active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bundle_items (
  bundle_id INTEGER NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  item_id   INTEGER NOT NULL REFERENCES items(id),
  qty       INTEGER NOT NULL,
  PRIMARY KEY (bundle_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_items_active   ON items(active, sort_order);
CREATE INDEX IF NOT EXISTS idx_bundle_items   ON bundle_items(item_id);
