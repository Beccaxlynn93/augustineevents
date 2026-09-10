/**
 * Turns catalog rows into the shape the pricing resolver expects.
 *
 * Takes plain row arrays rather than a database handle, so the same code serves
 * D1 in production (.prepare().all() -> { results }) and node:sqlite in the tests
 * (.prepare().all() -> array). The two APIs differ just enough to be annoying and
 * not enough to be worth an abstraction layer.
 */

export function buildCatalog(itemRows, bundleRows, bundleItemRows) {
  const items = new Map();
  const byId = new Map();
  for (const r of itemRows) {
    items.set(r.slug, r);
    byId.set(r.id, r);
  }

  const bundles = [];
  const bundleById = new Map();
  for (const r of bundleRows) {
    const b = { ...r, items: new Map() };
    bundles.push(b);
    bundleById.set(r.id, b);
  }

  for (const r of bundleItemRows) {
    const b = bundleById.get(r.bundle_id);
    const i = byId.get(r.item_id);
    if (b && i) b.items.set(i.slug, r.qty);
  }

  // A bundle with no members would be satisfied by every cart, including an empty
  // one, and would price at its flat rate. That is a seeding bug, not a discount.
  return { items, bundles: bundles.filter((b) => b.items.size > 0) };
}

export async function loadCatalogFromD1(db) {
  const [items, bundles, bundleItems] = await Promise.all([
    db.prepare('SELECT * FROM items WHERE active = 1').all(),
    db.prepare('SELECT * FROM bundles WHERE active = 1').all(),
    db.prepare('SELECT * FROM bundle_items').all(),
  ]);
  return buildCatalog(items.results, bundles.results, bundleItems.results);
}
