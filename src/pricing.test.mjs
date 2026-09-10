/**
 * Fixture tests for the pricing resolver.
 *
 * These load the real migration files into an in-memory SQLite database rather
 * than using a hand-written fixture. A fixture would drift from the seed, which is
 * precisely the class of bug Phase 01 exists to kill.
 *
 * Run: node --test src/pricing.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolveCart, ORDER_MINIMUM } from './pricing.js';
import { buildCatalog } from './catalog.js';

const db = new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../migrations/0003_catalog.sql', import.meta.url), 'utf8'));
db.exec(readFileSync(new URL('../migrations/0004_catalog_seed.sql', import.meta.url), 'utf8'));

const catalog = buildCatalog(
  db.prepare('SELECT * FROM items WHERE active = 1').all(),
  db.prepare('SELECT * FROM bundles WHERE active = 1').all(),
  db.prepare('SELECT * FROM bundle_items').all()
);

const price = (...lines) => resolveCart(lines, catalog);

test('the whole brass collection prices as two bundles, not 58 line items', () => {
  const r = price({ slug: 'brass-candlestick', qty: 50 }, { slug: 'brass-candelabra-3arm', qty: 8 });
  // Naive per-line would be 50*300 + 8*700 = 20600.
  assert.equal(r.subtotal, 19000, '$140 collection + $50 candelabra set');
  assert.deepEqual(r.bundles.map((b) => b.slug).sort(), ['candelabra-set', 'candlestick-collection']);
  assert.equal(r.ok, true);
});

test('four florals take the bundle price, three do not', () => {
  assert.equal(price({ slug: 'faux-floral-arrangement', qty: 4 }).subtotal, 25000);
  assert.equal(price({ slug: 'faux-floral-arrangement', qty: 3 }).subtotal, 22500);
});

test('a partial collection prices per unit', () => {
  const r = price({ slug: 'brass-candlestick', qty: 30 });
  assert.equal(r.subtotal, 9000);
  assert.equal(r.bundles.length, 0);
});

test('the customer is never punished for buying more', () => {
  // 49 candlesticks costs $147 per unit; 50 costs $140. Buying one more must never
  // cost more, so the resolver has to pick the bundle the moment it is satisfied.
  const fortyNine = price({ slug: 'brass-candlestick', qty: 49 }).subtotal;
  const fifty = price({ slug: 'brass-candlestick', qty: 50 }).subtotal;
  assert.ok(fifty <= fortyNine, `50 (${fifty}) must not cost more than 49 (${fortyNine})`);
});

test('bundle surplus is billed at unit rate', () => {
  // 4 florals = the $250 bundle. There are only 4, so this is the ceiling.
  const r = price({ slug: 'faux-floral-arrangement', qty: 4 }, { slug: 'brass-candlestick', qty: 52 });
  assert.equal(r.errors.length, 1, 'only 50 candlesticks exist');
  assert.equal(r.ok, false);
});

test('per-item minimums are enforced', () => {
  const r = price({ slug: 'dinner-plate', qty: 10 });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /minimum 20/);
});

test('beverage urns carry a 2 minimum and are not delivery only', () => {
  const one = price({ slug: 'beverage-urn', qty: 1 });
  assert.equal(one.ok, false, 'a single urn is below the 2 urn minimum');

  const both = price({ slug: 'beverage-urn', qty: 2 }, { slug: 'wisteria-chandelier', qty: 1 },
    { slug: 'patio-umbrella', qty: 1 }, { slug: 'cornhole-boards', qty: 1 });
  assert.equal(both.lines.find((l) => l.slug === 'beverage-urn').amount, 2000, '$20 for both');
  assert.equal(both.delivery_required, false, 'confirmed by Becca 2026-09-09');
});

test('delivery is required when the cart holds a delivery only item', () => {
  const r = price({ slug: 'dinner-plate', qty: 60 }, { slug: 'salad-plate', qty: 60 });
  assert.equal(r.delivery_required, true);
  assert.equal(r.subtotal, 60 * 125 + 60 * 75);
});

test('all three rectangular tablecloths are rentable', () => {
  // The workbook shows one out of service; the owners confirmed it is back.
  const r = price({ slug: 'toile-rect-tablecloth', qty: 3 }, { slug: 'toile-round-tablecloth', qty: 8 });
  assert.equal(r.ok, true);
  assert.equal(r.subtotal, 11000);
  assert.equal(price({ slug: 'toile-rect-tablecloth', qty: 4 }).ok, false, 'only 3 exist');
});

test('the $100 order minimum is enforced', () => {
  const r = price({ slug: 'wisteria-chandelier', qty: 1 });
  assert.equal(r.subtotal, 2500);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /\$100 minimum/);
  assert.equal(ORDER_MINIMUM, 10000);
});

test('an unknown item is rejected rather than silently priced at zero', () => {
  const r = price({ slug: 'italian-vase', qty: 2 });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /not available/);
});

test('an empty cart has no total', () => {
  assert.equal(price().ok, false);
  assert.equal(price({ slug: 'brass-candlestick', qty: 0 }).ok, false);
});

test('the brass bundle needs the vases before it applies', () => {
  // The bundle has always been sold as "candlesticks, candelabras and Italian
  // vases". A cart without the vases has not earned it.
  const r = price({ slug: 'brass-candlestick', qty: 50 }, { slug: 'brass-candelabra-3arm', qty: 8 },
    { slug: 'brass-candelabra-9arm', qty: 1 });
  assert.equal(r.subtotal, 21500, '$140 + $50 + $25, no bundle');
  assert.ok(!r.bundles.some((b) => b.slug === 'brass-collection'));
});

test('the full brass collection resolves to the bundle, beating its own parts', () => {
  const r = price({ slug: 'brass-candlestick', qty: 50 }, { slug: 'brass-candelabra-3arm', qty: 8 },
    { slug: 'brass-candelabra-9arm', qty: 1 }, { slug: 'italian-vase-small', qty: 2 },
    { slug: 'italian-vase-large', qty: 1 });
  // Parts are $150 + $56 + $25 + $10 + $15 = $256. The bundle must win.
  assert.equal(r.subtotal, 23000);
  assert.deepEqual(r.bundles.map((b) => b.slug), ['brass-collection']);
  assert.ok(r.subtotal < 25600, 'bundle must beat the sum of its parts');
});

test('the vases are reservable but not publicly listed', () => {
  const vases = ['italian-vase-small', 'italian-vase-large'];
  for (const slug of vases) {
    const row = db.prepare('SELECT active, listed FROM items WHERE slug = ?').get(slug);
    assert.equal(row.active, 1, `${slug} must be reservable so the bundle can hold it`);
    assert.equal(row.listed, 0, `${slug} stays bundle only per CLAUDE.md 2026-09-09`);
  }
});

test('turnaround days match the inventory workbook', () => {
  // Nothing is 0. An item always needs at least a day back before it goes out again.
  const expected = {
    'toile-round-tablecloth': 3, 'toile-rect-tablecloth': 3,
    'dinner-plate': 2, 'salad-plate': 2, 'dessert-ramekin': 2,
    'glass-beverage-dispenser': 2, 'beverage-urn': 2, 'faux-floral-arrangement': 2,
    'breadstick-basket': 1, 'wisteria-chandelier': 1, 'brass-candlestick': 1,
    'cornhole-boards': 1, 'patio-umbrella': 1,
  };
  for (const [slug, days] of Object.entries(expected)) {
    const row = db.prepare('SELECT buffer_after_days AS d FROM items WHERE slug = ?').get(slug);
    assert.equal(row.d, days, `${slug} turnaround`);
  }
  const zero = db.prepare('SELECT count(*) AS n FROM items WHERE buffer_after_days < 1').get();
  assert.equal(zero.n, 0, 'no item may have a zero day turnaround');
});
