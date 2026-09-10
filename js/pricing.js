/**
 * Server-authoritative cart pricing.
 *
 * The browser may show an estimate. This decides the price. Today the total is
 * computed entirely in contact.html and posted as a text field, which means it
 * arrives from the client and can be edited before sending. Nothing that ends up
 * on a contract should come from the client.
 *
 * The central rule: a cart total is NOT the sum of its lines. 50 candlesticks and
 * 8 candelabras is not 50*$3 + 8*$7 = $206. It is the candlestick collection at
 * $140 plus the candelabra set at $50, so $190. Bundles overlap and nest, so the
 * only honest way to price is to resolve the whole cart at once.
 *
 * All money is integer cents.
 */

// event-rentals.html: "All rental orders have a $100 minimum."
export const ORDER_MINIMUM = 10000;

// Guard on the subset enumeration below. Four bundles today; this trips long
// before 2^n becomes a problem, and fails loudly rather than hanging.
const MAX_BUNDLES = 16;

function normalize(cart) {
  const merged = new Map();
  for (const line of Array.isArray(cart) ? cart : []) {
    if (!line || typeof line.slug !== 'string') continue;
    const qty = Number(line.qty);
    if (!Number.isInteger(qty) || qty <= 0) continue;
    merged.set(line.slug, (merged.get(line.slug) || 0) + qty);
  }
  return merged;
}

/**
 * @param cart    [{ slug, qty }]
 * @param catalog { items: Map<slug, item>, bundles: [{ slug, name, price, priority, items: Map<slug, qty> }] }
 */
export function resolveCart(cart, catalog) {
  const wanted = normalize(cart);
  const errors = [];

  if (wanted.size === 0) {
    return { ok: false, errors: ['No rental items selected.'], lines: [], bundles: [], subtotal: 0 };
  }

  // Validate against the catalog before pricing anything. An invalid cart has no
  // meaningful total, so we do not compute one.
  for (const [slug, qty] of wanted) {
    const item = catalog.items.get(slug);
    if (!item || !item.active) {
      errors.push(`${slug} is not available.`);
      continue;
    }
    if (qty > item.total_qty) {
      errors.push(`${item.name}: only ${item.total_qty} available, ${qty} requested.`);
    }
    if (qty < item.min_qty) {
      errors.push(`${item.name}: minimum ${item.min_qty}.`);
    }
  }
  if (errors.length) return { ok: false, errors, lines: [], bundles: [], subtotal: 0 };

  // Only bundles the cart could possibly satisfy are worth enumerating.
  const candidates = catalog.bundles.filter(
    (b) => b.active !== 0 && [...b.items].every(([slug, qty]) => (wanted.get(slug) || 0) >= qty)
  );
  if (candidates.length > MAX_BUNDLES) {
    throw new Error(`pricing: ${candidates.length} candidate bundles exceeds MAX_BUNDLES`);
  }

  // Enumerate every combination of applicable bundles and keep the cheapest valid
  // one. This is exhaustive rather than greedy on purpose: greedy picks the biggest
  // bundle first and can lose to a pair of smaller ones. At this catalog size the
  // exhaustive answer is free, and it is the only way to honour "the customer is
  // never punished for how they clicked".
  let best = null;
  for (let mask = 0; mask < (1 << candidates.length); mask++) {
    const chosen = candidates.filter((_, i) => mask & (1 << i));

    // A bundle can only be counted once, and two bundles cannot both claim the
    // same physical item. Sum their demands and check the cart covers all of it.
    const claimed = new Map();
    for (const b of chosen) {
      for (const [slug, qty] of b.items) claimed.set(slug, (claimed.get(slug) || 0) + qty);
    }
    let feasible = true;
    for (const [slug, qty] of claimed) {
      if (qty > (wanted.get(slug) || 0)) { feasible = false; break; }
    }
    if (!feasible) continue;

    let total = chosen.reduce((sum, b) => sum + b.price, 0);
    for (const [slug, qty] of wanted) {
      const remainder = qty - (claimed.get(slug) || 0);
      total += remainder * catalog.items.get(slug).unit_price;
    }

    if (best === null || total < best.total) best = { total, chosen, claimed };
  }

  // Build the customer-facing breakdown from the winning combination.
  const bundles = best.chosen.map((b) => ({ slug: b.slug, name: b.name, price: b.price }));
  const lines = [];
  for (const [slug, qty] of wanted) {
    const item = catalog.items.get(slug);
    const inBundle = best.claimed.get(slug) || 0;
    const billable = qty - inBundle;
    lines.push({
      slug,
      name: item.name,
      qty,
      qty_in_bundle: inBundle,
      qty_billed: billable,
      unit_price: item.unit_price,
      amount: billable * item.unit_price,
      delivery_only: !!item.delivery_only,
    });
  }

  const deliveryOnly = lines.some((l) => l.delivery_only);

  return {
    ok: best.total >= ORDER_MINIMUM,
    errors: best.total >= ORDER_MINIMUM
      ? []
      : [`Rental orders have a $${(ORDER_MINIMUM / 100).toFixed(0)} minimum. This order is $${(best.total / 100).toFixed(2)}.`],
    lines,
    bundles,
    subtotal: best.total,
    delivery_required: deliveryOnly,
  };
}

export const dollars = (cents) => '$' + (cents / 100).toFixed(2);

/**
 * A resolved cart as human-readable lines, for the inquiry email and the stored
 * record. Shared by the browser and the Worker so both emails read identically.
 *
 * @param quote   the result of resolveCart
 * @param catalog the same catalog resolveCart was given
 */
export function describeQuote(quote, catalog) {
  const chosen = new Set(quote.bundles.map((b) => b.slug));
  // The bundle an item was absorbed into, for "included in ..." wording.
  const bundleFor = (slug) => {
    for (const b of catalog.bundles) if (chosen.has(b.slug) && b.items.has(slug)) return b.name;
    return 'a bundle';
  };

  const out = [];
  for (const l of quote.lines) {
    if (l.qty_in_bundle && l.qty_billed) {
      out.push(`${l.name} x${l.qty}: ${l.qty_in_bundle} in ${bundleFor(l.slug)}, ${l.qty_billed} at ${dollars(l.unit_price)} = ${dollars(l.amount)}`);
    } else if (l.qty_in_bundle) {
      out.push(`${l.name} x${l.qty}: included in ${bundleFor(l.slug)}`);
    } else {
      out.push(`${l.name} x${l.qty} at ${dollars(l.unit_price)} = ${dollars(l.amount)}`);
    }
  }
  for (const b of quote.bundles) out.push(`${b.name}: ${dollars(b.price)}`);
  out.push(`Rental subtotal: ${dollars(quote.subtotal)}`);
  if (quote.delivery_required) out.push('Includes delivery only items.');
  for (const e of quote.errors) out.push('Note: ' + e);
  return out;
}
