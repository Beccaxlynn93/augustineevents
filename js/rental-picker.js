/**
 * The rental picker on the booking form, rendered from GET /api/catalog.
 *
 * Until this existed the picker was 16 hand-written rows in contact.html, a second
 * copy of the catalog that drifted from the rentals page. The catalog in D1 is now
 * the only copy: items, stock, minimums, photos and bundles all come from it, and
 * the estimate is computed by the same resolveCart the Worker uses to price the
 * submitted inquiry, so the two cannot disagree.
 *
 * This module is deliberately NOT load-bearing for the form. The page's ordinary
 * script owns submission. If this file, the catalog request, or anything in here
 * fails, the picker shows a fallback asking the visitor to describe what they
 * need in the message box, and the form still submits. It talks to the page only
 * through window.RentalPicker and a 'rentals:change' event on document.
 */
import { buildCatalog } from './catalog.js';
import { resolveCart, describeQuote, dollars } from './pricing.js';

const SECTIONS = [
  ['linens', 'Linens'],
  ['decor', 'Décor & Lighting'],
  ['tableware', 'Tableware & Serveware'],
  ['outdoor', 'Outdoor & Entertainment'],
];

const list = document.getElementById('rentalList');
const notes = document.getElementById('rentalNotes');
const dialog = document.getElementById('photoDialog');

let catalog = null;
let lastQuote = null;

// ---- helpers --------------------------------------------------------------

function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('data-')) node.setAttribute(k, v === true ? '' : v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children) if (c) node.append(c);
  return node;
}

// Stored raw with spaces ("Photographer photos/..."), encoded here.
const photoUrl = (path) => encodeURI(path);

// Labels read "$10/ea" rather than "$10.00/ea". Totals keep their cents.
const short = (cents) => (cents % 100 === 0 ? '$' + cents / 100 : dollars(cents));

function announce() {
  document.dispatchEvent(new CustomEvent('rentals:change'));
}

// ---- rendering ------------------------------------------------------------

function itemNote(item, volumeBundles) {
  const parts = [];
  if (item.note) parts.push(item.note);
  // A fixed set (the urns come as a pair) reads as a set, not as stock. A
  // single piece keeps "1 available": it tells people there is only one.
  const fixedSet = item.min_qty > 1 && item.total_qty === item.min_qty;
  if (!fixedSet) parts.push(`${item.total_qty} available`);
  for (const b of volumeBundles) {
    const qty = b.items.get(item.slug);
    parts.push(qty === item.total_qty ? `${short(b.price)} for all ${qty}` : `${short(b.price)} for ${qty}`);
  }
  if (item.min_qty > 1 && item.total_qty !== item.min_qty) parts.push(`${item.min_qty} minimum`);
  if (item.delivery_only) parts.push('Delivery only');
  return parts.join(' · ');
}

function priceLabel(item) {
  if (item.total_qty === item.min_qty) {
    const whole = item.unit_price * item.min_qty;
    return item.min_qty > 1 ? `${short(whole)}/set` : short(whole);
  }
  return `${short(item.unit_price)}/ea`;
}

function thumb(photo, position, name) {
  if (!photo) return el('span', { class: 'rental-thumb rental-thumb-empty', 'aria-hidden': 'true' });
  const img = el('img', {
    src: photoUrl(photo),
    alt: '',                      // decorative here; the name is right beside it
    loading: 'lazy',
    decoding: 'async',
    width: '64', height: '64',
  });
  if (position) img.style.objectPosition = position;
  // A button, not a bare image, so it is reachable by keyboard and tapping it
  // enlarges the photo instead of toggling the row.
  const btn = el('button', {
    type: 'button',
    class: 'rental-thumb',
    'aria-label': `View a larger photo of ${name}`,
    'data-photo': photo,
    'data-name': name,
    'data-position': position || '',
  }, img);
  return btn;
}

function itemRow(item, volumeBundles, bundleSlug) {
  const fixed = item.total_qty === item.min_qty;
  const id = 'rental-' + item.slug;

  const cb = el('input', {
    type: 'checkbox', id,
    'data-slug': item.slug,
    'data-delivery-only': item.delivery_only ? true : null,
    'data-bundle-member': bundleSlug || null,
  });

  const qty = fixed ? el('div', { class: 'rental-qty' }) : el('div', { class: 'rental-qty' },
    el('button', { type: 'button', class: 'qty-btn', 'data-step': '-1', 'aria-label': `Fewer ${item.name}` }, '−'),
    el('input', {
      type: 'number', class: 'qty-num', inputmode: 'numeric',
      value: String(item.min_qty), min: String(item.min_qty), max: String(item.total_qty),
      'aria-label': `Quantity of ${item.name}`,
    }),
    el('button', { type: 'button', class: 'qty-btn', 'data-step': '1', 'aria-label': `More ${item.name}` }, '+'),
  );

  const included = el('span', { class: 'rental-item-note bundle-included', text: '' });
  included.hidden = true;

  return el('div', { class: 'rental-row', 'data-kind': 'item', 'data-slug': item.slug },
    cb,
    thumb(item.photo, item.photo_position, item.name),
    el('label', { class: 'rental-item-name', for: id },
      item.name,
      el('span', { class: 'rental-item-note', text: itemNote(item, volumeBundles) }),
      included,
    ),
    qty,
    el('span', { class: 'rental-item-price', text: priceLabel(item) }),
  );
}

function bundleRow(bundle) {
  const id = 'rental-bundle-' + bundle.slug;
  const members = [...bundle.items].map(([slug, qty]) => {
    const it = catalog.items.get(slug);
    return qty > 1 ? `${it.name} ×${qty}` : it.name;
  });
  // Show it with the photo of its first photographed member.
  const cover = [...bundle.items.keys()].map((s) => catalog.items.get(s)).find((i) => i && i.photo);

  const cb = el('input', { type: 'checkbox', id, 'data-bundle': bundle.slug });
  return el('div', { class: 'rental-row rental-row-bundle', 'data-kind': 'bundle', 'data-slug': bundle.slug },
    cb,
    thumb(cover && cover.photo, cover && cover.photo_position, bundle.name),
    el('label', { class: 'rental-item-name', for: id },
      bundle.name,
      el('span', { class: 'rental-item-note', text: 'Includes ' + members.join(', ') }),
    ),
    el('div', { class: 'rental-qty' }),
    el('span', { class: 'rental-item-price', text: short(bundle.price) }),
  );
}

function render(rows) {
  catalog = buildCatalog(rows.items, rows.bundles, rows.bundle_items);

  // Two kinds of bundle, told apart by shape. One item at a quantity is a
  // volume discount ("$250 for all four") that applies by itself as the
  // quantity rises. Several different items is a package the visitor chooses
  // as a unit, which is the only way to get the unlisted Italian vases.
  const volume = catalog.bundles.filter((b) => b.items.size === 1);
  const packages = catalog.bundles.filter((b) => b.items.size > 1);
  const memberOf = new Map();
  for (const p of packages) for (const slug of p.items.keys()) memberOf.set(slug, p.slug);

  const listed = rows.items.filter((i) => i.listed).sort((a, b) => a.sort_order - b.sort_order);
  const frag = document.createDocumentFragment();

  for (const [key, title] of SECTIONS) {
    const inSection = listed.filter((i) => i.category === key);
    if (!inSection.length) continue;
    frag.append(el('div', { class: 'rental-section-title', text: title }));
    for (const item of inSection) {
      const vb = volume.filter((b) => b.items.has(item.slug));
      frag.append(itemRow(item, vb, memberOf.get(item.slug)));
    }
    // A package sits at the end of the section its first member lives in.
    for (const p of packages) {
      const first = catalog.items.get([...p.items.keys()][0]);
      if (first && first.category === key) frag.append(bundleRow(p));
    }
  }

  list.replaceChildren(frag);
  list.setAttribute('aria-busy', 'false');
}

function renderUnavailable() {
  list.setAttribute('aria-busy', 'false');
  list.replaceChildren(el('p', {
    class: 'rental-fallback',
    text: 'The rental list could not be loaded just now. List the items you would like in the message box below and Becca will put together a quote.',
  }));
}

// ---- selection ------------------------------------------------------------

function rowQty(row) {
  const num = row.querySelector('.qty-num');
  const item = catalog.items.get(row.dataset.slug);
  if (!num) return item.min_qty;
  const min = Number(num.min), max = Number(num.max);
  const v = Math.round(Number(num.value));
  return Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
}

function currentCart() {
  if (!catalog) return [];
  const cart = [];
  for (const row of list.querySelectorAll('.rental-row')) {
    const cb = row.querySelector('input[type="checkbox"]');
    if (!cb.checked) continue;
    if (row.dataset.kind === 'bundle') {
      // Choosing a package is choosing all of its members at the package
      // quantities. resolveCart then finds the package price on its own.
      const b = catalog.bundles.find((x) => x.slug === row.dataset.slug);
      for (const [slug, qty] of b.items) cart.push({ slug, qty });
    } else {
      cart.push({ slug: row.dataset.slug, qty: rowQty(row) });
    }
  }
  return cart;
}

// A package already contains its members, so they cannot be added on top of it
// and counted twice. Checking the package clears and locks them.
function syncPackages() {
  for (const pkgCb of list.querySelectorAll('input[data-bundle]')) {
    const bundle = catalog.bundles.find((b) => b.slug === pkgCb.dataset.bundle);
    const locked = pkgCb.checked;
    for (const cb of list.querySelectorAll(`input[data-bundle-member="${pkgCb.dataset.bundle}"]`)) {
      const row = cb.closest('.rental-row');
      if (locked && cb.checked) {
        cb.checked = false;
        row.classList.remove('selected');
      }
      cb.disabled = locked;
      row.classList.toggle('in-bundle', locked);
      const flag = row.querySelector('.bundle-included');
      flag.textContent = `Included in the ${bundle.name}`;
      flag.hidden = !locked;
    }
  }
}

function update() {
  syncPackages();
  for (const row of list.querySelectorAll('.rental-row')) {
    row.classList.toggle('selected', row.querySelector('input[type="checkbox"]').checked);
  }
  const cart = currentCart();
  lastQuote = cart.length ? resolveCart(cart, catalog) : null;
  renderNotes();
  announce();
}

function renderNotes() {
  if (!notes) return;
  const q = lastQuote;
  const lines = [];
  if (q && q.bundles.length) lines.push('Bundle pricing applied: ' + q.bundles.map((b) => `${b.name} (${short(b.price)})`).join(', ') + '.');
  if (q) for (const e of q.errors) lines.push(e);
  notes.textContent = lines.join(' ');
  notes.hidden = lines.length === 0;
}

// ---- events ---------------------------------------------------------------

function wire() {
  list.addEventListener('change', (e) => {
    const t = e.target;
    if (t.classList.contains('qty-num')) {
      t.value = String(rowQty(t.closest('.rental-row')));
    }
    update();
  });

  list.addEventListener('input', (e) => {
    if (e.target.classList.contains('qty-num')) update();
  });

  list.addEventListener('click', (e) => {
    const step = e.target.closest('.qty-btn');
    if (step) {
      const row = step.closest('.rental-row');
      const num = row.querySelector('.qty-num');
      num.value = String(Math.min(Number(num.max), Math.max(Number(num.min), rowQty(row) + Number(step.dataset.step))));
      update();
      return;
    }

    const t = e.target.closest('.rental-thumb');
    if (t && t.dataset.photo) {
      openPhoto(t.dataset.photo, t.dataset.name, t.dataset.position);
      return;
    }

    // Clicking anywhere else on a row toggles it. The label already does this
    // for the name; this covers the gaps, the price and the stepper area.
    const row = e.target.closest('.rental-row');
    if (!row || e.target.closest('label, input, button')) return;
    const cb = row.querySelector('input[type="checkbox"]');
    if (cb.disabled) return;
    cb.checked = !cb.checked;
    update();
  });
}

function openPhoto(photo, name, position) {
  if (!dialog || typeof dialog.showModal !== 'function') {
    window.open(photoUrl(photo), '_blank', 'noopener');
    return;
  }
  const img = dialog.querySelector('img');
  img.src = photoUrl(photo);
  img.alt = name;
  img.style.objectPosition = position || '';
  dialog.querySelector('.photo-dialog-caption').textContent = name;
  dialog.showModal();
}

if (dialog) {
  dialog.querySelector('.photo-dialog-close').addEventListener('click', () => dialog.close());
  // A click on the backdrop lands on the dialog element itself.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
}

// ---- the page's view of the picker ----------------------------------------

window.RentalPicker = {
  get available() { return !!catalog; },
  cart: currentCart,
  subtotalCents: () => (lastQuote ? lastQuote.subtotal : 0),
  summary: () => (lastQuote ? describeQuote(lastQuote, catalog) : []),
  hasDeliveryOnly: () => !!(lastQuote && lastQuote.delivery_required),
};

// ---- boot -----------------------------------------------------------------

async function boot() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch('/api/catalog', { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error('catalog ' + res.status);
    const rows = await res.json();
    if (!rows || !Array.isArray(rows.items) || !rows.items.some((i) => i.listed)) throw new Error('empty catalog');
    render(rows);
    wire();
    update();
  } catch (err) {
    console.warn('rental picker unavailable:', err && err.message);
    renderUnavailable();
    announce();
  } finally {
    clearTimeout(timer);
  }
}

boot();
