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

  // ---- page-hero line art: vines hung on the heading's frame and the photo's --
  // A fine frame around the heading and the photo's own outline are the
  // furniture; the vines are laid over them and left to hang. They rest along
  // the top of each frame, swag across the gaps under their own weight, drop
  // down the sides and end in curled tendrils. Measured, not drawn by hand,
  // because the text and the photo sit differently at every screen size.
  // Redrawn (without animating) on resize.
  var NS = 'http://www.w3.org/2000/svg';
  var SHIFT = 14; // .arch::before is the frame shifted 14px up and left
  var STEP = 6;   // px between the points a vine is built from
  var BOX_PAD = 30, BOX_R = 14;

  function pt(x, y, mode, n) { return { x: x, y: y, mode: mode, n: n || null }; }
  function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
  function steps(len) { return Math.max(3, Math.ceil(len / STEP)); }

  // Hangs from a to b under its own weight, dipping about `sag` below the lower
  // end, and more over a long span, but never more than `room`.
  function swag(a, b, sag, room) {
    sag = Math.min(Math.max(sag, Math.abs(b.x - a.x) * 0.12), room || Infinity);
    var low = Math.max(a.y, b.y) + sag, cx = (a.x + b.x) / 2, cy = (4 * low - a.y - b.y) / 2;
    var n = steps(dist(a, b) + sag), out = [];
    for (var k = 0; k <= n; k++) {
      var t = k / n, u = 1 - t;
      out.push(pt(u * u * a.x + 2 * u * t * cx + t * t * b.x, u * u * a.y + 2 * u * t * cy + t * t * b.y, 'hang'));
    }
    return out;
  }
  // The top of a box with rounded corners (r = w/2 makes an arch), measured from
  // its left side (s = 0) over the top to its right side (s = rimLen). Points sit
  // just outside it, lifting here and there like a vine lying loose on a ledge.
  function rimLen(b) { return Math.PI * b.r + b.w - 2 * b.r; }
  function rimPt(b, s) {
    var arc = Math.PI * b.r / 2, flat = b.w - 2 * b.r, ang, cx, cy = b.y + b.r;
    if (s < arc) { ang = Math.PI + s / b.r; cx = b.x + b.r; }
    else if (s < arc + flat) { ang = 1.5 * Math.PI; cx = b.x + b.r + s - arc; }
    else { ang = 1.5 * Math.PI + (s - arc - flat) / b.r; cx = b.x + b.w - b.r; }
    var lift = 1.5 + 2.5 * Math.pow(Math.max(0, Math.sin(s / 11)), 2);
    var nx = Math.cos(ang), ny = Math.sin(ang);
    return pt(cx + nx * (b.r + lift), cy + ny * (b.r + lift), 'rest', [nx, ny]);
  }
  function rim(b, from, to) {
    var n = steps(Math.abs(to - from)), out = [];
    for (var k = 0; k <= n; k++) out.push(rimPt(b, from + (to - from) * k / n));
    return out;
  }
  // Drops down the side of box b (side -1 left, 1 right), bowing slightly away.
  function drop(b, side, len) {
    var x0 = side < 0 ? b.x - 1.5 : b.x + b.w + 1.5, y0 = b.y + b.r, n = steps(len), out = [];
    for (var k = 0; k <= n; k++) {
      var t = k / n;
      out.push(pt(x0 + side * 6 * Math.sin(t * Math.PI * 0.8), y0 + len * t, 'hang', [side, 0]));
    }
    return out;
  }
  // Hangs straight down from a, with a slight sway.
  function drip(a, len) {
    var n = steps(len), out = [];
    for (var k = 0; k <= n; k++) { var t = k / n; out.push(pt(a.x + 4 * Math.sin(t * 3) * t, a.y + len * t, 'hang')); }
    return out;
  }
  // Where a vine lying over frame a should pass onto frame b, which stands out
  // further from there on (the photo and its offset outline cross like this).
  function crossover(a, b) {
    var best = { d: Infinity }, La = rimLen(a), Lb = rimLen(b);
    for (var i = 0; i <= 40; i++) {
      var sa = La * (0.5 + 0.5 * i / 40), p = rimPt(a, sa);
      for (var j = 0; j <= 80; j++) {
        var sb = Lb * (0.5 + 0.5 * j / 80), d = dist(p, rimPt(b, sb));
        if (d < best.d) best = { d: d, a: sa, b: sb };
      }
    }
    return best;
  }
  function lowest(pts) {
    return pts.reduce(function (m, q, i) { return q.y > pts[m].y ? i : m; }, 0);
  }

  function Vine(root) { this.p = []; this.root = root || null; }
  Vine.prototype.add = function (pts) {
    var p = this.p;
    pts.forEach(function (q, i) { if (!(i === 0 && p.length && dist(p[p.length - 1], q) < 1)) p.push(q); });
    return this;
  };
  Vine.prototype.here = function () { return this.p.length - 1; };
  // A tendril curling in at the tip (turn 1 or -1 picks which way it winds).
  Vine.prototype.curl = function (turn, R) {
    var v = this.p[this.p.length - 1], w = this.p[this.p.length - 3] || this.p[0];
    var dx = v.x - w.x, dy = v.y - w.y, m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
    var cx = v.x - dy * turn * R, cy = v.y + dx * turn * R, a0 = Math.atan2(v.y - cy, v.x - cx);
    var dir = -Math.sin(a0) * dx + Math.cos(a0) * dy > 0 ? 1 : -1, out = [];
    for (var k = 1; k <= 24; k++) {
      var t = k / 24, a = a0 + dir * t * 1.7 * Math.PI, rr = R * (1 - 0.55 * t);
      out.push(pt(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 'curl'));
    }
    return this.add(out);
  };
  Vine.prototype.finish = function () {
    var p = this.p, S = [0], f = function (n) { return n.toFixed(1); };
    for (var i = 1; i < p.length; i++) S.push(S[i - 1] + dist(p[i - 1], p[i]));
    this.S = S; this.len = S[S.length - 1];
    // Catmull-Rom through the points, so the joins between pieces stay smooth.
    var d = 'M' + f(p[0].x) + ' ' + f(p[0].y);
    for (i = 0; i < p.length - 1; i++) {
      var a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      d += ' C' + f(b.x + (c.x - a.x) / 6) + ' ' + f(b.y + (c.y - a.y) / 6) + ', ' +
        f(c.x - (e.x - b.x) / 6) + ' ' + f(c.y - (e.y - b.y) / 6) + ', ' + f(c.x) + ' ' + f(c.y);
    }
    this.d = d;
    return this;
  };
  Vine.prototype.at = function (i) { return this.S[i] / this.len; };

  // Leaves every `gap` px. Where the vine lies on or against a frame they point
  // away from it; where it hangs they droop a little.
  function leavesOn(v, vi, gap, size) {
    var out = [], p = v.p, alt = 1, f = function (n) { return n.toFixed(1); };
    for (var s = 20, i = 1; s < v.len - 10; s += gap) {
      while (i < p.length - 2 && v.S[i] < s) i++;
      var q = p[i];
      if (q.mode === 'curl') break;
      var ta = Math.atan2(p[i + 1].y - p[i - 1].y, p[i + 1].x - p[i - 1].x), dir = (alt = -alt);
      if (q.n) {
        var out1 = Math.cos(ta + 0.85) * q.n[0] + Math.sin(ta + 0.85) * q.n[1];
        var out2 = Math.cos(ta - 0.85) * q.n[0] + Math.sin(ta - 0.85) * q.n[1];
        dir = out1 > out2 ? 1 : -1;
      }
      // Leaves on a vine lying along a frame lie flatter than hanging ones.
      var a = ta + dir * (q.mode === 'rest' ? 0.6 : 0.85);
      if (q.mode === 'hang') a += 0.3 * Math.atan2(Math.sin(Math.PI / 2 - a), Math.cos(Math.PI / 2 - a));
      var len = size * (1 - 0.3 * s / v.len) * (alt > 0 ? 1 : 0.88), w = len * 0.36;
      var ex = q.x + Math.cos(a) * len, ey = q.y + Math.sin(a) * len;
      var nx = -Math.sin(a) * w, ny = Math.cos(a) * w, mx = (q.x + ex) / 2, my = (q.y + ey) / 2;
      out.push({ vine: vi, at: v.at(i), dir: dir, x: q.x, y: q.y,
        d: 'M' + f(q.x) + ' ' + f(q.y) + ' Q' + f(mx + nx) + ' ' + f(my + ny) + ' ' + f(ex) + ' ' + f(ey) +
          ' Q' + f(mx - nx) + ' ' + f(my - ny) + ' ' + f(q.x) + ' ' + f(q.y) });
    }
    return out;
  }
  function bloomSvg(x, y, s) {
    var petals = '';
    for (var k = 0; k < 5; k++) {
      petals += '<path transform="rotate(' + k * 72 + ')" d="M0 0 C -3.2 -3 -3.2 -8.5 0 -10.5 C 3.2 -8.5 3.2 -3 0 0 Z"/>';
    }
    return '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + s + ')"><g class="bloom grow">' + petals +
      '<circle class="bloom-core" r="2.2"/></g></g>';
  }
  function boxPath(b) {
    var r = b.r, f = function (n) { return n.toFixed(1); };
    return 'M' + f(b.x + r) + ' ' + f(b.y) + ' H' + f(b.x + b.w - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + f(b.x + b.w) + ' ' + f(b.y + r) +
      ' V' + f(b.y + b.h - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + f(b.x + b.w - r) + ' ' + f(b.y + b.h) +
      ' H' + f(b.x + r) + ' A' + r + ' ' + r + ' 0 0 1 ' + f(b.x) + ' ' + f(b.y + b.h - r) +
      ' V' + f(b.y + r) + ' A' + r + ' ' + r + ' 0 0 1 ' + f(b.x + r) + ' ' + f(b.y) + ' Z';
  }

  function layVines(W, HH, B, O, P, stacked) {
    var vines = [], blooms = [];
    var arcB = Math.PI * B.r / 2, arcO = Math.PI * O.r / 2, LB = rimLen(B), LO = rimLen(O);
    var clampY = function (y) { return Math.max(8, Math.min(HH - 10, y)); };
    var bloom = function (vi, i, s) { blooms.push({ vine: vi, i: i, s: s }); };
    var bottomL = pt(B.x + 10, B.y + B.h + 1.5), bottomR = pt(B.x + B.w - 10, B.y + B.h + 1.5);

    // Lands on the heading's frame from the page edge, lies along its top, and
    // one shoot falls back over the near corner and down the side.
    var onBox = function (v, sag) {
      if (B.x > 24) v.add(swag(pt(0, clampY(B.y - 30)), rimPt(B, arcB * 0.5), sag));
      var land = Math.max(0, v.here());
      bloom(vines.indexOf(v), land, 0.95);
      v.add(rim(B, arcB * 0.5, LB));
      var fall = new Vine({ vine: vines.indexOf(v), i: land });
      fall.add(rim(B, arcB * 0.5, 0)).add(drop(B, -1, stacked ? Math.min(40, B.h * 0.12) : B.h * 0.42)).curl(1, 6);
      return fall;
    };
    // A garland slung under the heading's frame, with a drip from its low point.
    var garland = function () {
      // Kept clear of the section's bottom edge, leaves included; the drip only
      // where there is room for it.
      var room = HH - bottomL.y - 26, dripping = room > 70;
      if (room < 8) return;
      var g = new Vine(), under = swag(bottomL, bottomR, stacked ? 16 : 20, Math.max(4, room - (dripping ? 44 : 0)));
      vines.push(g);
      g.add(under);
      var low = lowest(under);
      if (!stacked) {
        var c = pt(O.x + 8, O.y + O.h + 1.5);
        g.add(swag(bottomR, c, 22, Math.max(4, HH - Math.max(bottomR.y, c.y) - 26)));
        bloom(vines.indexOf(g), g.here(), 0.85);
      }
      if (dripping) vines.push(new Vine({ vine: vines.indexOf(g), i: low }).add(drip(under[low], 26)).curl(1, 5));
    };

    if (!stacked) {
      // Side by side. One vine lies along the top of the heading's frame, swags
      // across to the photo, rests over the top of its outline and hangs down
      // the far side.
      var main = new Vine();
      vines.push(main);
      var fall = onBox(main, 24);
      var toPhoto = swag(main.p[main.here()], rimPt(O, arcO * 0.5), 28), base = main.here();
      main.add(toPhoto);
      var sagAt = base + lowest(toPhoto);
      bloom(0, main.here(), 1.15);
      // Over the outline's top, then onto the photo itself where it stands out
      // further, and down the photo's right edge (the outline's is behind it).
      var x = crossover(O, P);
      main.add(rim(O, arcO * 0.5, x.a)).add(rim(P, x.b, rimLen(P))).add(drop(P, 1, P.h * 0.3)).curl(-1, 7);
      vines.push(fall);
      if (O.x - (B.x + B.w) > 50) {
        var bud = new Vine({ vine: 0, i: sagAt }).add(drip(main.p[sagAt], 34));
        vines.push(bud);
        bloom(vines.length - 1, bud.here(), 0.6);
      }
      garland();
    } else {
      // Phone: the photo sits above the text. One vine drapes over the photo's
      // outline from edge to edge; another lies along the heading's frame.
      var over = new Vine();
      vines.push(over);
      over.add(swag(pt(0, clampY(O.y + O.h * 0.22)), rimPt(O, arcO * 0.5), 20));
      bloom(0, over.here(), 1.05);
      var xo = crossover(O, P);
      over.add(rim(O, arcO * 0.5, xo.a)).add(rim(P, xo.b, rimLen(P)))
        .add(swag(rimPt(P, rimLen(P)), pt(W, clampY(P.y + P.h * 0.3)), 20));
      var ledge = new Vine();
      vines.push(ledge);
      var fallP = onBox(ledge, 18);
      ledge.add(drop(B, 1, Math.min(40, B.h * 0.12))).curl(-1, 6);
      vines.push(fallP);
      garland();
    }

    var leaves = [];
    vines.forEach(function (v, vi) {
      v.finish();
      leaves = leaves.concat(leavesOn(v, vi, v.root ? 36 : 44, v.root ? 15 : 19));
    });
    vines.forEach(function (v) { if (v.root) v.root.at = vines[v.root.vine].at(v.root.i); });
    blooms.forEach(function (b) { var v = vines[b.vine]; b.at = v.at(b.i); b.x = v.p[b.i].x; b.y = v.p[b.i].y; });
    return { vines: vines, leaves: leaves, blooms: blooms };
  }

  function drawVines(hero, animate) {
    var fig = hero.querySelector('.arch'), text = hero.querySelector('.page-hero-text');
    if (!fig || !text) return;
    var H = hero.getBoundingClientRect(), F = fig.getBoundingClientRect();
    var W = H.width, HH = H.height;
    // The text's own extent, not its grid column, which can be much wider.
    var T = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
    Array.prototype.forEach.call(text.children, function (c) {
      var R = c.getBoundingClientRect();
      if (!R.width) return;
      T.l = Math.min(T.l, R.left - H.left); T.r = Math.max(T.r, R.right - H.left);
      T.t = Math.min(T.t, R.top - H.top); T.b = Math.max(T.b, R.bottom - H.top);
    });
    var framed = fig.classList.contains('is-framed');
    var ox = F.left - H.left - SHIFT, oy = F.top - H.top - SHIFT;
    var O = { x: ox, y: oy, w: F.width, h: F.height, r: framed ? 14 : F.width / 2 };
    var stacked = F.bottom <= T.t + H.top + 2;
    // On a phone the text nearly fills the width; keep room for vines at the sides.
    var padX = Math.max(8, Math.min(BOX_PAD, stacked ? Math.min(T.l, W - T.r) - 16 : Math.min(T.l - 6, (ox - T.r) / 2)));
    var padY = Math.max(10, Math.min(BOX_PAD, stacked ? (T.t - (oy + SHIFT + F.height)) / 2 : BOX_PAD));
    var padB = Math.max(6, Math.min(padY, HH - T.b - 8));
    var B = { x: T.l - padX, y: T.t - padY, w: T.r - T.l + 2 * padX, h: T.b - T.t + padY + padB, r: BOX_R };
    var P = { x: ox + SHIFT, y: oy + SHIFT, w: F.width, h: F.height, r: O.r };
    var art = layVines(W, HH, B, O, P, stacked);

    var html = '<path class="frame" d="' + boxPath(B) + '"/>';
    art.vines.forEach(function (v) { html += '<path class="vine" d="' + v.d + '"/>'; });
    art.leaves.forEach(function (l) { html += '<path class="leaf grow" d="' + l.d + '"/>'; });
    art.blooms.forEach(function (b) { html += bloomSvg(b.x, b.y, b.s); });

    var svg = hero.querySelector('svg.hero-vines');
    if (!svg) {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'hero-vines');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      hero.insertBefore(svg, hero.firstChild);
    }
    svg.setAttribute('viewBox', '0 0 ' + W.toFixed(0) + ' ' + HH.toFixed(0));
    svg.innerHTML = html;
    if (animate) growVines(svg, art);
  }

  // Grow like a live vine. The heading's frame draws first, since the vines
  // need something to lie on; then each stem grows out from where it starts,
  // side shoots set off when the stem reaches them, every leaf unfurls from its
  // base once the tip has passed it, and blooms open just behind the tip.
  var FRAME_START = 250, FRAME_DUR = 700;
  var GROW_START = 800;   // ms; the frame is mostly drawn and the photo is in
  var GROW_STAGGER = 220; // ms between independent vines setting off
  var GROW_SPEED = 0.95;  // px per ms, so long and short stems grow alike
  var LEAF_LAG = 60, BLOOM_LAG = 120; // ms after the tip passes
  var EASE = 2.2;         // stems ease out: offset = len * (1 - x)^EASE
  function tipTime(s, at) { return s.start + s.dur * (1 - Math.pow(1 - at, 1 / EASE)); }

  function growVines(svg, art) {
    var frameEl = svg.querySelector('.frame'), frameLen = frameEl.getTotalLength();
    var stems = [{ el: frameEl, len: frameLen, start: FRAME_START, dur: FRAME_DUR }];
    var free = 0;
    Array.prototype.forEach.call(svg.querySelectorAll('.vine'), function (el, i) {
      var v = art.vines[i], len = el.getTotalLength(), dur = Math.max(450, Math.min(1700, len / GROW_SPEED));
      // Parents come before their shoots, so a parent's timing is always known here.
      var start = v.root ? tipTime(stems[v.root.vine + 1], v.root.at) : GROW_START + GROW_STAGGER * free++;
      stems.push({ el: el, len: len, start: start, dur: dur });
    });
    stems.forEach(function (s) {
      s.el.style.transition = 'none'; s.el.style.strokeDasharray = s.len; s.el.style.strokeDashoffset = s.len;
    });

    var events = [];
    Array.prototype.forEach.call(svg.querySelectorAll('.leaf'), function (el, i) {
      var l = art.leaves[i];
      el.style.transition = 'none'; el.style.transformBox = 'view-box';
      el.style.transformOrigin = l.x.toFixed(1) + 'px ' + l.y.toFixed(1) + 'px';
      el.style.transform = 'rotate(' + (l.dir * -35) + 'deg) scale(0)'; el.style.opacity = '0';
      events.push({ t: tipTime(stems[l.vine + 1], l.at) + LEAF_LAG, go: function () {
        el.style.transition = 'transform .55s cubic-bezier(.34, 1.45, .64, 1), opacity .25s ease-out';
        el.style.transform = ''; el.style.opacity = '';
      } });
    });
    Array.prototype.forEach.call(svg.querySelectorAll('.bloom'), function (el, i) {
      var b = art.blooms[i];
      el.style.transform = 'scale(0)'; el.style.opacity = '0';
      events.push({ t: tipTime(stems[b.vine + 1], b.at) + BLOOM_LAG, go: function () { el.style.transform = ''; el.style.opacity = ''; } });
    });
    events.sort(function (a, b) { return a.t - b.t; });

    var t0 = performance.now();
    (function frame(now) {
      if (!svg.isConnected) return;
      var t = now - t0, busy = false;
      stems.forEach(function (s) {
        var x = Math.max(0, Math.min(1, (t - s.start) / s.dur));
        s.el.style.strokeDashoffset = s.len * Math.pow(1 - x, EASE);
        if (x < 1) busy = true;
      });
      while (events.length && events[0].t <= t) events.shift().go();
      if (busy || events.length) requestAnimationFrame(frame);
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

  // ---- buttons: a sprig of vine grows around the pill on hover --------------
  // Wraps the left end with a small bloom and runs a little along the top, with
  // a shorter sprig over the right end; the same leaves and tendrils as the
  // hero vines. Built on first hover (a button's size is only known then) and
  // grown by a class rather than :hover, so the very first hover animates too.
  var BV_PAD = 14; // room around the pill for leaves
  function pillPt(w, h, s) {
    var r = h / 2, L = w - h, P = 2 * L + 2 * Math.PI * r, a, nx, ny, x, y;
    var d = 3.5 + 1.5 * Math.pow(Math.max(0, Math.sin(s / 7)), 2);
    s = ((s % P) + P) % P;
    if (s < L) { x = r + s; y = -d; nx = 0; ny = -1; }
    else if (s < L + Math.PI * r) {
      a = -Math.PI / 2 + (s - L) / r; nx = Math.cos(a); ny = Math.sin(a); x = w - r + nx * (r + d); y = r + ny * (r + d);
    } else if (s < 2 * L + Math.PI * r) { x = w - r - (s - L - Math.PI * r); y = h + d; nx = 0; ny = 1; }
    else {
      a = Math.PI / 2 + (s - 2 * L - Math.PI * r) / r; nx = Math.cos(a); ny = Math.sin(a); x = r + nx * (r + d); y = r + ny * (r + d);
    }
    return pt(x + BV_PAD, y + BV_PAD, 'rest', [nx, ny]);
  }
  function buttonVine(w, h) {
    var r = h / 2, L = w - h, P = 2 * L + 2 * Math.PI * r;
    var run = function (a, b) {
      var n = Math.max(4, Math.ceil((b - a) / 4)), out = [];
      for (var k = 0; k <= n; k++) out.push(pillPt(w, h, a + (b - a) * k / n));
      return out;
    };
    var from = 2 * L + Math.PI * r - 14;
    var stems = [
      new Vine().add(run(from, P + L * 0.35)).curl(-1, 3.5).finish(),
      new Vine().add(run(L * 0.78, L + Math.PI * r * 0.62)).curl(-1, 3).finish(),
    ];
    var GROW = 0.6, SECOND = 0.15; // s: stem growth, and the second sprig's head start delay
    var html = '';
    stems.forEach(function (v, i) {
      html += '<path class="bv-stem" pathLength="1" style="--d:' + (i * SECOND) + 's" d="' + v.d + '"/>';
    });
    stems.forEach(function (v, i) {
      leavesOn(v, i, 15, 8).forEach(function (l) {
        html += '<path class="bv-leaf" style="--d:' + (i * SECOND + l.at * GROW + 0.04).toFixed(2) + 's;transform-origin:' +
          l.x.toFixed(1) + 'px ' + l.y.toFixed(1) + 'px" d="' + l.d + '"/>';
      });
    });
    var b = pillPt(w, h, 2 * L + 1.5 * Math.PI * r), at = (14 + Math.PI * r / 2) / stems[0].len;
    html += '<g class="bv-bloom" style="--d:' + (at * GROW + 0.1).toFixed(2) + 's;transform-origin:' + b.x.toFixed(1) + 'px ' + b.y.toFixed(1) + 'px">' +
      bloomSvg(b.x, b.y, 0.55) + '</g>';
    var W = w + 2 * BV_PAD, H = h + 2 * BV_PAD;
    return '<svg class="btn-vine" aria-hidden="true" focusable="false" width="' + W.toFixed(0) + '" height="' + H.toFixed(0) +
      '" viewBox="0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0) + '">' + html + '</svg>';
  }
  var canHover = window.matchMedia('(hover: hover)').matches;
  document.querySelectorAll('.btn, .btn-green, .btn-outline, .btn-outline-white, .btn-light').forEach(function (el) {
    var on = function (e) {
      if (e.type === 'pointerenter' && (!canHover || e.pointerType === 'touch')) return;
      var w = el.offsetWidth, h = el.offsetHeight, svg = el.querySelector('.btn-vine');
      if (!w || !h) return;
      if (!svg || el._bvSize !== w + 'x' + h) {
        if (svg) svg.remove();
        el.insertAdjacentHTML('beforeend', buttonVine(w, h));
        el._bvSize = w + 'x' + h;
        el.querySelector('.btn-vine').getBoundingClientRect(); // start from the bare state
      }
      el.classList.add('vine-on');
    };
    var off = function () { el.classList.remove('vine-on'); };
    el.addEventListener('pointerenter', on);
    el.addEventListener('pointerleave', off);
    el.addEventListener('focus', function (e) { if (el.matches(':focus-visible')) on(e); });
    el.addEventListener('blur', off);
  });

  // ---- reveals ------------------------------------------------------------
  var revealables = document.querySelectorAll('.fade-in, .reveal-clip, .flourish, .category-art');
  var reveal = function (el) {
    el.classList.add(el.classList.contains('flourish') || el.classList.contains('category-art') ? 'is-drawn' : 'visible');
  };
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
