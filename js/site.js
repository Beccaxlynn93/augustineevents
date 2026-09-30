/**
 * Shared page behaviour: header state, mobile menu, scroll reveals, the drawn
 * botanical dividers, gentle parallax, tabs and scroll-spy.
 *
 * Nothing here is needed to read or use a page. Content is only hidden for
 * reveal animations once .reveal-ready is on <html>, and the inline snippet in
 * each page's <head> removes that class again if this file never runs.
 */
(function () {
  'use strict';
  window.__siteReady = true;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = 'IntersectionObserver' in window;

  // ---- header: solid once the page has scrolled ---------------------------
  var header = document.querySelector('.site-header');
  if (header) {
    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:40px;pointer-events:none;';
    document.body.prepend(sentinel);
    if (io) {
      new IntersectionObserver(function (entries) {
        header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
      }).observe(sentinel);
    } else {
      header.classList.add('is-scrolled');
    }
  }

  // ---- mobile menu --------------------------------------------------------
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    links.querySelectorAll('li').forEach(function (li, i) { li.style.setProperty('--i', i); });
    var setOpen = function (open) {
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', function () { setOpen(!document.body.classList.contains('nav-open')); });
    links.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  // ---- stagger: children of [data-stagger] reveal one after another -------
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    var i = 0;
    Array.prototype.forEach.call(group.children, function (child) {
      if (child.classList.contains('fade-in') || child.classList.contains('reveal-clip')) {
        child.style.setProperty('--d', i++);
      }
    });
  });

  // ---- botanical divider: a sprig between two leaves ---------------------
  var SPRIG =
    '<svg viewBox="0 0 58 26" aria-hidden="true" focusable="false">' +
    '<path d="M29 13 C 22 5, 12 6, 6 13 C 12 19, 22 20, 29 13"/>' +
    '<path d="M29 13 C 36 5, 46 6, 52 13 C 46 19, 36 20, 29 13"/>' +
    '<path d="M29 9.2 a3.8 3.8 0 1 0 0.01 0"/>' +
    '<path d="M1 13 H 6 M52 13 H 57"/></svg>';
  document.querySelectorAll('.flourish').forEach(function (el) {
    if (!el.querySelector('svg')) el.insertAdjacentHTML('beforeend', SPRIG);
    el.setAttribute('aria-hidden', 'true');
  });

  // ---- large line-drawn branch, generated along a curve -------------------
  function branch() {
    var pt = function (t) {
      var a = [30, 470], b = [120, 300], c = [330, 150], d = [410, 20], u = 1 - t;
      return [
        u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
        u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
      ];
    };
    var p = 'M30 470 C 120 300, 330 150, 410 20';
    for (var k = 1; k <= 11; k++) {
      var t = k / 12.5, P = pt(t), Q = pt(t + 0.01);
      var ang = Math.atan2(Q[1] - P[1], Q[0] - P[0]) + (k % 2 ? -1 : 1) * 0.95;
      var len = 58 - k * 2.4, w = len * 0.34;
      var ex = P[0] + Math.cos(ang) * len, ey = P[1] + Math.sin(ang) * len;
      var nx = -Math.sin(ang) * w, ny = Math.cos(ang) * w;
      var mx = (P[0] + ex) / 2, my = (P[1] + ey) / 2;
      p += ' M' + P[0].toFixed(1) + ' ' + P[1].toFixed(1) +
        ' Q' + (mx + nx).toFixed(1) + ' ' + (my + ny).toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1) +
        ' Q' + (mx - nx).toFixed(1) + ' ' + (my - ny).toFixed(1) + ' ' + P[0].toFixed(1) + ' ' + P[1].toFixed(1);
    }
    return '<svg viewBox="0 0 440 490" aria-hidden="true" focusable="false"><path d="' + p + '"/></svg>';
  }
  document.querySelectorAll('[data-botanical]').forEach(function (el) { el.innerHTML = branch(); });

  // ---- page-hero vines: flowing lines from the heading into the photo frame --
  // Measured, not drawn by hand, because the frame sits somewhere different at
  // every screen size. Each vine arrives at the frame's outline tangentially so
  // it reads as growing into it. Redrawn (without animating) on resize.
  var NS = 'http://www.w3.org/2000/svg';
  var SHIFT = 14; // .arch::before is the frame shifted 14px up and left

  function bez(c, t) {
    var u = 1 - t;
    return [
      u * u * u * c[0][0] + 3 * u * u * t * c[1][0] + 3 * u * t * t * c[2][0] + t * t * t * c[3][0],
      u * u * u * c[0][1] + 3 * u * u * t * c[1][1] + 3 * u * t * t * c[2][1] + t * t * t * c[3][1],
    ];
  }
  // How far along the curve's length parameter t sits, 0 to 1, so a leaf can
  // sprout the moment the growing stem reaches it.
  function arcFrac(c, t) {
    var total = 0, upto = 0, prev = c[0], N = 64;
    for (var k = 1; k <= N; k++) {
      var q = bez(c, k / N), d = Math.hypot(q[0] - prev[0], q[1] - prev[1]);
      total += d; if (k / N <= t) upto += d; prev = q;
    }
    return total ? upto / total : 0;
  }
  function leaf(c, t, side, len, v) {
    var P = bez(c, t), Q = bez(c, Math.min(1, t + 0.01));
    var a = Math.atan2(Q[1] - P[1], Q[0] - P[0]) + side * 0.85;
    var w = len * 0.36, ex = P[0] + Math.cos(a) * len, ey = P[1] + Math.sin(a) * len;
    var nx = -Math.sin(a) * w, ny = Math.cos(a) * w, mx = (P[0] + ex) / 2, my = (P[1] + ey) / 2;
    var f = function (n) { return n.toFixed(1); };
    return '<path class="leaf grow" data-v="' + v + '" data-at="' + arcFrac(c, t).toFixed(3) + '" data-side="' + side +
      '" data-o="' + f(P[0]) + ' ' + f(P[1]) + '" d="M' + f(P[0]) + ' ' + f(P[1]) + ' Q' + f(mx + nx) + ' ' + f(my + ny) + ' ' + f(ex) + ' ' + f(ey) +
      ' Q' + f(mx - nx) + ' ' + f(my - ny) + ' ' + f(P[0]) + ' ' + f(P[1]) + '"/>';
  }
  function curve(c) {
    var f = function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); };
    return '<path class="draw" d="M' + f(c[0]) + ' C' + f(c[1]) + ', ' + f(c[2]) + ', ' + f(c[3]) + '"/>';
  }
  function bloom(x, y, s) {
    var petals = '';
    for (var k = 0; k < 5; k++) {
      petals += '<path transform="rotate(' + k * 72 + ')" d="M0 0 C -3.2 -3 -3.2 -8.5 0 -10.5 C 3.2 -8.5 3.2 -3 0 0 Z"/>';
    }
    return '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + s + ')"><g class="bloom grow" data-bloom>' + petals +
      '<circle class="bloom-core" r="2.2"/></g></g>';
  }

  function drawVines(hero, animate) {
    var fig = hero.querySelector('.arch'), text = hero.querySelector('.page-hero-text');
    if (!fig || !text) return;
    var H = hero.getBoundingClientRect(), F = fig.getBoundingClientRect(), T = text.getBoundingClientRect();
    var W = H.width, HH = H.height;
    var o = { x: F.left - H.left - SHIFT, y: F.top - H.top - SHIFT, w: F.width, h: F.height };
    var framed = fig.classList.contains('is-framed');
    var r = framed ? 18 : o.w / 2;
    var tx = T.left - H.left, tr = T.right - H.left, ty = T.top - H.top, tb = T.bottom - H.top;
    var sideL = [o.x, o.y + r], sideR = [o.x + o.w, o.y + r];
    var apex = [o.x + o.w / 2, o.y], cornerBL = [o.x + 6, o.y + o.h], cornerBR = [o.x + o.w - 6, o.y + o.h];
    var clampY = function (y) { return Math.max(8, Math.min(HH - 10, y)); };
    var parts = [];

    if (F.bottom <= T.top + 2) {
      // Phone: the photo sits above the text. Vines grow from the frame's
      // lower corners out toward the heading, and one climbs into its side.
      var cl = [cornerBL, [cornerBL[0] - 70, cornerBL[1]], [8, clampY(ty - 40)], [0, clampY(ty + 26)]];
      var cr = [cornerBR, [cornerBR[0] + 70, cornerBR[1]], [W - 8, clampY(ty - 40)], [W, clampY(ty + 26)]];
      var cs = [[0, clampY(o.y + o.h * 0.8)], [o.x * 0.1, clampY(o.y + o.h * 0.5)], [sideL[0], sideL[1] - 60], sideL];
      parts.push(curve(cl), curve(cr), curve(cs));
      parts.push(leaf(cl, 0.45, 1, 18, 0), leaf(cl, 0.7, -1, 15, 0), leaf(cr, 0.45, -1, 18, 1), leaf(cr, 0.7, 1, 15, 1), leaf(cs, 0.4, 1, 15, 2));
      parts.push(bloom(sideL[0], sideL[1], 1.05));
    } else {
      // Side by side: one vine arches over the heading and flows down into the
      // frame's side, one sweeps under the text into its bottom corner, and a
      // third drapes onto the top of the arch.
      var over = [[0, clampY(ty - 18)], [tx + (tr - tx) * 0.5, clampY(ty - 120)], [sideL[0], clampY(sideL[1] - 140)], sideL];
      var under = [[0, clampY(tb + 44)], [tx + (tr - tx) * 0.55, clampY(tb + 120)], [cornerBL[0] - 150, cornerBL[1]], cornerBL];
      var start = [tr + (o.x - tr) * 0.25, clampY(ty - 60)];
      var drape = [start, [start[0] + 20, clampY(apex[1] + 70)], [apex[0] - 110, apex[1]], apex];
      parts.push(curve(over), curve(under), curve(drape));
      parts.push(leaf(over, 0.26, 1, 22, 0), leaf(over, 0.42, -1, 20, 0), leaf(over, 0.6, 1, 19, 0), leaf(over, 0.78, -1, 16, 0));
      parts.push(leaf(under, 0.3, -1, 20, 1), leaf(under, 0.5, 1, 19, 1), leaf(under, 0.72, -1, 16, 1));
      parts.push(leaf(drape, 0.35, 1, 15, 2), leaf(drape, 0.62, -1, 14, 2));
      parts.push(bloom(sideL[0], sideL[1], 1.25), bloom(start[0], start[1], 0.8));
    }

    var svg = hero.querySelector('svg.hero-vines');
    if (!svg) {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'hero-vines');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      hero.insertBefore(svg, hero.firstChild);
    }
    svg.setAttribute('viewBox', '0 0 ' + W.toFixed(0) + ' ' + HH.toFixed(0));
    svg.innerHTML = parts.join('');

    if (!animate) return;
    growVines(svg);
  }

  // Grow like a live vine: each stem draws out from its root, and every leaf
  // unfurls from its base only once the tip has passed it. Blooms open last.
  var GROW_START = 600;  // ms; lets the photo appear first
  var GROW_STAGGER = 180; // ms between the stems setting off
  var GROW_SPEED = 0.75;  // px per ms, so long and short stems grow alike
  var LEAF_LAG = 60;      // ms after the tip passes before a leaf sprouts
  function growVines(svg) {
    var stems = Array.prototype.map.call(svg.querySelectorAll('.draw'), function (p, i) {
      var len = p.getTotalLength();
      p.style.transition = 'none'; p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      return { el: p, len: len, start: GROW_START + i * GROW_STAGGER, dur: Math.max(650, Math.min(1400, len / GROW_SPEED)) };
    });
    var leaves = Array.prototype.map.call(svg.querySelectorAll('.leaf'), function (g) {
      var s = stems[+g.dataset.v];
      g.style.transformBox = 'view-box'; g.style.transformOrigin = g.dataset.o.replace(' ', 'px ') + 'px';
      g.style.transition = 'none';
      g.style.transform = 'rotate(' + (g.dataset.side * -35) + 'deg) scale(0)'; g.style.opacity = '0';
      // The stem eases out, so invert that easing to find when the tip gets here.
      return { el: g, at: s ? s.start + s.dur * (1 - Math.pow(1 - g.dataset.at, 1 / 2.2)) + LEAF_LAG : 0, done: false };
    });
    var end = stems.reduce(function (m, s) { return Math.max(m, s.start + s.dur); }, GROW_START);
    var blooms = svg.querySelectorAll('[data-bloom]');
    Array.prototype.forEach.call(blooms, function (b) { b.style.transform = 'scale(0)'; b.style.opacity = '0'; });

    var t0 = performance.now();
    (function frame(now) {
      if (!svg.isConnected) return;
      var t = now - t0, busy = false;
      stems.forEach(function (s) {
        var x = Math.max(0, Math.min(1, (t - s.start) / s.dur));
        s.el.style.strokeDashoffset = s.len * Math.pow(1 - x, 2.2);
        if (x < 1) busy = true;
      });
      leaves.forEach(function (l) {
        if (l.done) return;
        if (t < l.at) { busy = true; return; }
        l.done = true;
        l.el.style.transition = 'transform .55s cubic-bezier(.34, 1.45, .64, 1), opacity .25s ease-out';
        l.el.style.transform = ''; l.el.style.opacity = '';
      });
      if (t >= end) {
        Array.prototype.forEach.call(blooms, function (b, i) {
          b.style.transitionDelay = (i * 0.12) + 's'; b.style.transform = ''; b.style.opacity = '';
        });
        return;
      }
      if (busy) requestAnimationFrame(frame);
    })(t0);
  }

  var heroes = document.querySelectorAll('.page-hero');
  if (heroes.length) {
    var firstDraw = function () { heroes.forEach(function (h) { drawVines(h, !reduceMotion); }); };
    // Wait for the web fonts, which change the heading's size and so the curves.
    var started = false;
    var go = function () { if (!started) { started = true; firstDraw(); } };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    setTimeout(go, 1500);
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { heroes.forEach(function (h) { drawVines(h, false); }); }, 150);
    });
  }

  // ---- reveals ------------------------------------------------------------
  var revealables = document.querySelectorAll('.fade-in, .reveal-clip, .flourish');
  var reveal = function (el) { el.classList.add(el.classList.contains('flourish') ? 'is-drawn' : 'visible'); };
  if (!io || reduceMotion) {
    revealables.forEach(reveal);
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { reveal(entry.target); revealer.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealables.forEach(function (el) { revealer.observe(el); });
  }

  // ---- gentle parallax on [data-parallax] images -------------------------
  var drifting = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (drifting.length && !reduceMotion) {
    var ticking = false;
    var wide = window.matchMedia('(min-width: 821px)');
    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      drifting.forEach(function (el) {
        if (!wide.matches) { el.style.transform = ''; return; }
        var r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var f = parseFloat(el.getAttribute('data-parallax')) || 0.08;
        var shift = (r.top + r.height / 2 - vh / 2) * -f;
        el.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0) scale(1.08)';
      });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // ---- tabs: [data-tabs] with a sliding indicator -------------------------
  document.querySelectorAll('[data-tabs]').forEach(function (wrap) {
    var tabs = Array.prototype.slice.call(wrap.querySelectorAll('[role="tab"]'));
    var indicator = wrap.querySelector('.tab-indicator');
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (!panel) return;
        panel.hidden = !on;
        if (on) {
          // A panel hidden at load never scrolled into view, so its reveals
          // never fired. Reveal them now or they stay invisible.
          panel.querySelectorAll('.fade-in, .reveal-clip').forEach(function (el) { el.classList.add('visible'); });
          // Restart the entrance animation each time a panel is shown.
          panel.classList.remove('panel-in');
          void panel.offsetWidth;
          panel.classList.add('panel-in');
        }
      });
      if (indicator) { indicator.style.width = tab.offsetWidth + 'px'; indicator.style.transform = 'translateX(' + tab.offsetLeft + 'px)'; }
      if (focus) tab.focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (n) { e.preventDefault(); select(tabs[(i + n + tabs.length) % tabs.length], true); }
      });
    });
    wrap.classList.add('tabs-ready');
    var current = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    select(current);
    window.addEventListener('resize', function () {
      var on = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
      if (on && indicator) { indicator.style.width = on.offsetWidth + 'px'; indicator.style.transform = 'translateX(' + on.offsetLeft + 'px)'; }
    });
  });

  // ---- scroll-spy: highlight the chip for the section in view -------------
  document.querySelectorAll('[data-spy]').forEach(function (bar) {
    var chips = Array.prototype.slice.call(bar.querySelectorAll('a[href^="#"]'));
    var targets = chips.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    if (!io || !targets.length) return;
    var setActive = function (id) {
      chips.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + id;
        a.classList.toggle('active', on);
        if (on && bar.scrollWidth > bar.clientWidth) {
          bar.scrollTo({ left: a.offsetLeft - bar.clientWidth / 2 + a.offsetWidth / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      });
    };
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-35% 0px -60% 0px' });
    targets.forEach(function (t) { spy.observe(t); });
  });
})();
