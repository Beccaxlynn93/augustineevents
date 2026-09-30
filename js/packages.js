/**
 * Music packages (event-music.html): choosing a package card opens a panel
 * with everything it includes. The panel sits under the row of cards, or under
 * the chosen card itself once the cards stack on a phone. Switching between
 * Ceremony Only and Ceremony + Cocktail Hour keeps the same ensemble open.
 *
 * Without this file the cards still show each package's price and players.
 */
(function () {
  'use strict';
  var root = document.getElementById('pkg-detail');
  var section = document.getElementById('packages');
  if (!root || !section) return;
  var cards = Array.prototype.slice.call(section.querySelectorAll('.pkg-card[data-package]'));
  var art = function (name) {
    if (!window.__lineArt) return '';
    return '<svg class="line-art" data-art="' + name + '" viewBox="' + window.__lineArtBox(name) + '" aria-hidden="true" focusable="false">' +
      window.__lineArt(name) + '</svg>';
  };

  // Who plays, as the owners worded it on 2026-09-30.
  var PLAYERS = {
    Solo: ['Violin and/or voice with Becca (comes with custom piano backing tracks)', 'Piano with Justin'],
    Duo: ['Violin or voice with Becca', 'Piano or guitar with Justin'],
    Trio: ['Violin or voice with Becca', 'Piano', 'Guitar'],
  };
  var CEREMONY = [
    ['Prelude', '20 to 30 minutes of music while your guests are being seated'],
    ['Processional', 'Bridal party and bride entrance'],
    ['Special song / unity song', 'Optional'],
    ['Recessional', 'Grand exit'],
  ];
  var COVERAGE = { ceremony: 'Ceremony only', cocktail: 'Ceremony + cocktail hour' };
  var ARROW = '<svg class="arrow" viewBox="0 0 16 10" aria-hidden="true" focusable="false"><path d="M0 5h14M10 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';

  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var list = function (items) { return '<ul>' + items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>'; };

  function render(card) {
    var name = card.getAttribute('data-package'), tier = card.getAttribute('data-tier');
    var coverage = card.getAttribute('data-coverage'), price = card.querySelector('.pkg-price').textContent;
    var timeline = CEREMONY.map(function (m) {
      return '<li><strong>' + esc(m[0]) + '</strong><span>' + esc(m[1]) + '</span></li>';
    }).join('');
    return '<div class="pkg-detail-inner">' +
      '<div class="pkg-detail-head">' +
        '<div><p class="eyebrow">' + esc(COVERAGE[coverage]) + ' · ' + esc(tier) + '</p>' +
        '<h3 class="pkg-detail-name">' + esc(name) + ' <span class="pkg-detail-price">' + esc(price) + '</span></h3></div>' +
        '<a class="btn" href="contact.html?package=' + encodeURIComponent(name) + '">Book ' + esc(name) + ' ' + ARROW + '</a>' +
      '</div>' +
      '<div class="pkg-detail-cols">' +
        '<section class="pkg-col"><div class="pkg-col-art">' + art('ens-' + tier.toLowerCase()) + '</div>' +
          '<h4>Who plays</h4>' + list(PLAYERS[tier]) + '</section>' +
        '<section class="pkg-col"><div class="pkg-col-art">' + art('notes') + '</div>' +
          '<h4>Your ceremony</h4><ol class="pkg-timeline">' + timeline + '</ol>' +
          '<p class="pkg-note">We learn up to four songs chosen by you, so your ceremony feels personal to the two of you.</p>' +
          (coverage === 'cocktail'
            ? '<h4>Cocktail hour</h4>' + list(['1 full hour of music in your choice of genre', 'Classical, pop/rock, Disney, and more'])
            : '') +
        '</section>' +
        '<section class="pkg-col"><div class="pkg-col-art">' + art('calendar') + '</div>' +
          '<h4>Also included</h4>' + list(['Sound equipment', 'Travel within 30 minutes of Nashville, TN, and $50 for each additional hour']) +
          '<h4>To hold your date</h4><p>A $200 non-refundable deposit secures your date.</p>' +
        '</section>' +
      '</div></div>';
  }

  var current = null;
  // Under the row of cards, or right under the chosen card once they stack.
  function place(card) {
    var grid = card.parentNode;
    var stacked = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length === 1;
    var target = stacked ? card : grid;
    if (target.nextElementSibling !== root) target.parentNode.insertBefore(root, target.nextSibling);
  }
  function open(card, scroll) {
    cards.forEach(function (c) {
      var on = c === card;
      c.classList.toggle('is-selected', on);
      c.setAttribute('aria-expanded', String(on));
    });
    current = card;
    root.innerHTML = render(card);
    place(card);
    root.hidden = false;
    root.classList.remove('is-open');
    void root.offsetWidth;
    root.classList.add('is-open');
    if (window.__fitStroke) window.__fitStroke(root);
    requestAnimationFrame(function () {
      root.querySelectorAll('.line-art').forEach(function (el) { el.classList.add('is-drawn'); });
    });
    if (scroll) {
      var r = root.getBoundingClientRect();
      if (r.top > window.innerHeight - 160) root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
  function close() {
    cards.forEach(function (c) { c.classList.remove('is-selected'); c.setAttribute('aria-expanded', 'false'); });
    current = null;
    root.hidden = true;
  }

  section.classList.add('pkg-ready');
  // The dark card now marks the chosen package, not a favourite.
  cards.forEach(function (c) {
    c.classList.remove('featured');
    c.addEventListener('click', function () { if (current === c) close(); else open(c, true); });
  });

  // When the tabs switch to the other set of packages, keep the same ensemble open.
  var groups = section.querySelectorAll('.pkg-group');
  if ('MutationObserver' in window) {
    var watch = new MutationObserver(function () {
      if (!current || !current.closest('.pkg-group').hidden) return;
      var shown = Array.prototype.filter.call(groups, function (g) { return !g.hidden; })[0];
      var twin = shown && shown.querySelector('.pkg-card[data-tier="' + current.getAttribute('data-tier') + '"]');
      if (twin) open(twin, false); else close();
    });
    Array.prototype.forEach.call(groups, function (g) { watch.observe(g, { attributes: true, attributeFilter: ['hidden'] }); });
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (current) place(current); }, 150);
  });
})();
