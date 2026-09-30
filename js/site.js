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
  // A note floating just above the vine, tilted a little either way.
  function noteSvg(x, y, kind, s, tilt) {
    var g = kind === 'pair'
      ? '<ellipse cx="0" cy="0" rx="3.4" ry="2.4" transform="rotate(-20)"/><ellipse cx="10" cy="-3" rx="3.4" ry="2.4" transform="rotate(-20 10 -3)"/>' +
        '<path d="M3.1 -0.8 V-16 M13.1 -3.8 V-19"/><path class="beam" d="M3.1 -16 L13.1 -19"/>'
      : '<ellipse cx="0" cy="0" rx="3.4" ry="2.4" transform="rotate(-20)"/><path d="M3.1 -0.8 V-16 C 5 -12, 9 -11, 8.5 -5.5"/>';
    return '<g transform="translate(' + (x + 2).toFixed(1) + ' ' + (y - 16).toFixed(1) + ') rotate(' + tilt + ') scale(' + s + ')">' +
      '<g class="bloom grow note">' + g + '</g></g>';
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

  function layVines(W, HH, B, O, P, stacked, notes) {
    var vines = [], blooms = [];
    var arcB = Math.PI * B.r / 2, arcO = Math.PI * O.r / 2, LB = rimLen(B), LO = rimLen(O);
    var clampY = function (y) { return Math.max(8, Math.min(HH - 10, y)); };
    var bloom = function (vi, i, s) { blooms.push({ vine: vi, i: i, s: s }); };

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
    // Nothing hangs under the heading: the box is not drawn, so a garland there
    // would hang from nothing.

    if (!stacked) {
      // Side by side. One vine runs the whole width: in from the left edge,
      // along the top of the heading's frame, across to the photo, over the top
      // of its outline and out to the right edge, with a shoot hanging down the
      // photo's far side.
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
      main.add(rim(O, arcO * 0.5, x.a)).add(rim(P, x.b, rimLen(P)));
      var overP = main.here();
      if (W - (P.x + P.w) > 30) {
        main.add(swag(main.p[overP], pt(W, clampY(P.y + P.h * 0.22)), 26));
        vines.push(fall, new Vine({ vine: 0, i: overP }).add(drop(P, 1, P.h * 0.3)).curl(-1, 7));
      } else {
        main.add(drop(P, 1, P.h * 0.3)).curl(-1, 7);
        vines.push(fall);
      }
      if (O.x - (B.x + B.w) > 50) {
        var bud = new Vine({ vine: 0, i: sagAt }).add(drip(main.p[sagAt], 34));
        vines.push(bud);
        bloom(vines.length - 1, bud.here(), 0.6);
      }
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
      var fallP = onBox(ledge, 18), edgeR = ledge.here();
      // Out to the right edge too, with a short tendril down the frame's side.
      ledge.add(swag(ledge.p[edgeR], pt(W, clampY(B.y - 20)), 12));
      vines.push(fallP, new Vine({ vine: 1, i: edgeR }).add(drop(B, 1, Math.min(40, B.h * 0.12))).curl(-1, 6));
    }

    // Music notes drifting up off the main vine (the Event Music header).
    // On a phone they sit on the vine above the heading instead, clear of the header bar.
    if (notes) {
      var nv = stacked ? 1 : 0, spots = stacked ? [0.22, 0.5, 0.78] : [0.08, 0.24, 0.42, 0.6, 0.76, 0.92];
      spots.forEach(function (f, k) {
        blooms.push({ vine: nv, i: Math.round(f * (vines[nv].p.length - 1)), note: k % 3 === 1 ? 'pair' : 'eighth', s: (stacked ? 0.8 : 1) * (k % 2 ? 0.9 : 1.1) });
      });
    }
    return finishArt(vines, blooms, 1);
  }

  // Smooths every vine, sets its leaves (scaled by `k`) and resolves where the
  // side shoots and blooms sit along their parents.
  function finishArt(vines, blooms, k) {
    var leaves = [];
    vines.forEach(function (v, vi) {
      v.finish();
      leaves = leaves.concat(leavesOn(v, vi, (v.root ? 36 : 44) * k, (v.root ? 15 : 19) * k));
    });
    vines.forEach(function (v) { if (v.root) v.root.at = vines[v.root.vine].at(v.root.i); });
    blooms.forEach(function (b) { var v = vines[b.vine]; b.at = v.at(b.i); b.x = v.p[b.i].x; b.y = v.p[b.i].y; });
    return { vines: vines, leaves: leaves, blooms: blooms };
  }

  // A closing banner (section[data-vines]): no photo, so the frame around its
  // text carries everything. One vine crosses the whole banner, swagging in from
  // the left edge, lying along the frame's top and swagging out to the right
  // edge; shoots fall down both sides; a garland hangs underneath.
  function layBanner(W, HH, B, narrow) {
    var vines = [], blooms = [];
    var arc = Math.PI * B.r / 2, L = rimLen(B);
    var clampY = function (y) { return Math.max(8, Math.min(HH - 10, y)); };
    var main = new Vine();
    vines.push(main);
    main.add(swag(pt(0, clampY(B.y - 50)), rimPt(B, arc * 0.5), 30));
    var landL = main.here();
    blooms.push({ vine: 0, i: landL, s: 1.3 });
    main.add(rim(B, arc * 0.5, L / 2));
    blooms.push({ vine: 0, i: main.here(), s: 1.05 });
    main.add(rim(B, L / 2, L - arc * 0.5));
    var landR = main.here();
    blooms.push({ vine: 0, i: landR, s: 1.3 });
    main.add(swag(main.p[landR], pt(W, clampY(B.y - 40)), 30));

    // On a phone the frame is near the screen's edges, so the side shoots are
    // shorter and curl in toward it rather than out past the edge.
    var turn = narrow ? -1 : 1, R = narrow ? 5 : 8;
    vines.push(new Vine({ vine: 0, i: landL }).add(rim(B, arc * 0.5, 0)).add(drop(B, -1, B.h * (narrow ? 0.22 : 0.5))).curl(turn, R));
    vines.push(new Vine({ vine: 0, i: landR }).add(rim(B, L - arc * 0.5, L)).add(drop(B, 1, B.h * (narrow ? 0.16 : 0.38))).curl(-turn, R));

    var room = HH - (B.y + B.h) - 34;
    if (room > 16) {
      var a = pt(B.x + 18, B.y + B.h + 1.5), b = pt(B.x + B.w - 18, B.y + B.h + 1.5);
      var under = swag(a, b, 26, room - (room > 80 ? 50 : 0)), g = new Vine();
      vines.push(g);
      g.add(under);
      var low = lowest(under);
      if (room > 80) {
        var bud = new Vine({ vine: vines.length - 1, i: low }).add(drip(under[low], 40));
        vines.push(bud);
        blooms.push({ vine: vines.length - 1, i: bud.here(), s: 0.9 });
      }
    }
    return finishArt(vines, blooms, 1.2);
  }

  function drawBanner(sec, animate) {
    var inner = sec.firstElementChild;
    while (inner && !/\bwrap/.test(inner.className)) inner = inner.nextElementSibling;
    if (!inner) return;
    var H = sec.getBoundingClientRect(), I = inner.getBoundingClientRect(), W = H.width, HH = H.height;
    // Offsets, not bounding boxes: the children may still be mid fade-in, shifted.
    var T = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
    Array.prototype.forEach.call(inner.children, function (c) {
      if (!c.offsetWidth) return;
      var x = I.left - H.left + c.offsetLeft, y = I.top - H.top + c.offsetTop;
      T.l = Math.min(T.l, x); T.r = Math.max(T.r, x + c.offsetWidth);
      T.t = Math.min(T.t, y); T.b = Math.max(T.b, y + c.offsetHeight);
    });
    var narrow = Math.min(T.l, W - T.r) < 60, padY = narrow ? 32 : 40;
    var B = narrow
      ? { x: 12, y: T.t - padY, w: W - 24, h: T.b - T.t + 2 * padY, r: 16 }
      : { x: T.l - 48, y: T.t - padY, w: T.r - T.l + 96, h: T.b - T.t + 2 * padY, r: 18 };
    paint(sec, B, layBanner(W, HH, B, narrow), animate ? 300 : -1);
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
    paint(hero, B, layVines(W, HH, B, O, P, stacked, hero.hasAttribute('data-vine-notes')), animate ? 0 : -1);
  }

  // Writes one art set into host's line-art layer. `lead` < 0 draws it complete;
  // otherwise it grows, `lead` ms further along than a page hero's timing.
  function paint(hero, B, art, lead) {
    var W = hero.getBoundingClientRect().width, HH = hero.getBoundingClientRect().height;
    var html = '<path class="frame" d="' + boxPath(B) + '"/>';
    art.vines.forEach(function (v) { html += '<path class="vine" d="' + v.d + '"/>'; });
    art.leaves.forEach(function (l) { html += '<path class="leaf grow" d="' + l.d + '"/>'; });
    art.blooms.forEach(function (b, k) { html += b.note ? noteSvg(b.x, b.y, b.note, b.s, k % 2 ? 12 : -10) : bloomSvg(b.x, b.y, b.s); });

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
    if (lead >= 0) growVines(svg, art, lead);
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

  function growVines(svg, art, lead) {
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

    var t0 = performance.now() - (lead || 0);
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

  // Closing banners grow their vines when they scroll into view.
  var banners = Array.prototype.slice.call(document.querySelectorAll('section[data-vines]'));
  if (banners.length) {
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var grow = function (sec) {
      if (sec._vines) return;
      sec._vines = true;
      fontsReady.then(function () { drawBanner(sec, !reduceMotion); });
    };
    if (!io || reduceMotion) banners.forEach(grow);
    else {
      var bannerWatch = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { grow(e.target); bannerWatch.unobserve(e.target); } });
      }, { threshold: 0.35 });
      banners.forEach(function (b) { bannerWatch.observe(b); });
    }
    var bannerTimer;
    window.addEventListener('resize', function () {
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(function () { banners.forEach(function (b) { if (b._vines) drawBanner(b, false); }); }, 150);
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

  // ---- line illustrations: <svg class="line-art" data-art="violin"> ----------
  // Small hand-drawn pictures in the site's fine line, filled in here by name
  // and drawn in by the reveal observer below. Shapes: "M…" is a path,
  // "c cx cy r" a circle, "e cx cy rx ry [rotate]" an ellipse.
  var NOTE = function (x, y, h, flag) {
    return ['e ' + x + ' ' + y + ' 3.6 2.6 -20', 'M' + (x + 3.3) + ' ' + (y - 1) + ' V' + (y - h)].concat(flag ?
      ['M' + (x + 3.3) + ' ' + (y - h) + ' C ' + (x + 5.3) + ' ' + (y - h + 4.5) + ', ' + (x + 10) + ' ' + (y - h + 5.5) + ', ' + (x + 9) + ' ' + (y - h + 12)] : []);
  };
  // Instruments, drawn once and placed into the package scenes. A shape that
  // starts with "!" is solid: filled with the colour behind it (--art-bg), so
  // an instrument in front hides the lines of the one behind it.
  var VIOLIN = [
    '!M32 44 C 40 44, 47 46, 48.5 52 C 49.5 57, 46 61, 44 63 C 42 67, 42 73, 44 77 C 49 80, 52.5 86, 52.5 94 C 52.5 106, 43 114, 32 114 C 21 114, 11.5 106, 11.5 94 C 11.5 86, 15 80, 20 77 C 22 73, 22 67, 20 63 C 18 61, 14.5 57, 15.5 52 C 17 46, 24 44, 32 44 Z',
    '!M30 18 L28 80 Q32 82 36 80 L34 18 Z', '!M30 18 L29.5 9 H34.5 L34 18 Z',
    'M29.5 9 C 28 5, 30 1.5, 33 1.8 C 36 2.1, 37 5.5, 35 7.2 C 33.5 8.4, 31.5 7.2, 32.2 5.6',
    'M29.6 11.5 H26.5 M29.8 15.5 H27 M34.4 12.5 H37.5 M34.2 16.5 H37',
    'M24.5 71 C 23 76, 26.5 80, 24 86', 'M39.5 71 C 41 76, 37.5 80, 40 86',
    'c 24.7 70.6 0.9', 'c 23.8 86.4 0.9', 'c 39.3 70.6 0.9', 'c 40.2 86.4 0.9',
    'M27 88.5 Q32 86.8 37 88.5', 'M31 18 V100 M33 18 V100', '!M29 99 L30 108 Q32 109.5 34 108 L35 99 Z', 'M32 114 V116.5',
  ];
  var BOW = ['M53 117 L61 5', 'M55.8 116 L62.6 11', '!M51.5 110 L56.5 110.8 L55.8 116 L50.8 115.2 Z', 'M61 5 L63 4 L62.6 11'];
  var GUITAR = [
    '!M30 54 C 40 54, 47 57, 47 64 C 47 69, 43 72, 43 76 C 43 80, 52 84, 52 98 C 52 112, 42 120, 30 120 C 18 120, 8 112, 8 98 C 8 84, 17 80, 17 76 C 17 72, 13 69, 13 64 C 13 57, 20 54, 30 54 Z',
    '!M27.5 14 H32.5 V70 H27.5 Z', 'c 30 78 6.5', 'c 30 78 8.4',
    'M37 86 C 43 88, 44 94, 40.5 96 C 37.5 97.5, 35.5 93, 37 86 Z', '!M22.5 102 H37.5 V106 H22.5 Z',
    'M27.5 20 H32.5 M27.5 26 H32.5 M27.5 31.5 H32.5 M27.5 36.5 H32.5 M27.5 41 H32.5 M27.5 45 H32.5',
    '!M27 14 L25.5 2.5 Q30 0.5 34.5 2.5 L33 14 Z', 'c 23.6 5.5 1.3', 'c 23.9 10 1.3', 'c 36.4 5.5 1.3', 'c 36.1 10 1.3',
    'M29 14 V104 M31 14 V104',
  ];
  var PIANO = [
    '!M9 14 H81 V56 H9 Z', '!M6 10 H84 V14 H6 Z', 'M17 44 V26 Q17 20 23 20 H67 Q73 20 73 26 V44',
    'M35 37.5 Q40 35.5 45 37.5 Q50 35.5 55 37.5 V47 Q50 45 45 47 Q40 45 35 47 Z', 'M45 37.5 V47',
    'M37.5 40 H42.5 M37.5 42 H42.5 M37.5 44 H42.5 M47.5 40 H52.5 M47.5 42 H52.5 M47.5 44 H52.5', 'M28 48.5 H62',
    '!M9 66 H81 V92 H9 Z', 'M17 70 H73 V86 H17 Z', '!M3 56 H87 V61 H3 Z', '!M3 61 H87 V66 H3 Z', 'M9 61 V66 M15 61 V66 M21 61 V66 M27 61 V66 M33 61 V66 M39 61 V66 M45 61 V66 M51 61 V66 M57 61 V66 M63 61 V66 M69 61 V66 M75 61 V66 M81 61 V66',
    '!M5 92 H15 V95 H5 Z', '!M75 92 H85 V95 H75 Z', 'M38.5 91 H41.5 M43.5 91 H46.5 M48.5 91 H51.5',
  ];
  var at = function (transform, parts) { return { g: transform, parts: parts }; };
  var ART = {
    violin: ['0 0 66 122', [at('translate(0 2)', VIOLIN.concat(BOW))]],
    piano: ['0 0 90 97', [at('translate(0 1)', PIANO)]],
    guitar: ['0 0 60 124', [at('translate(0 2)', GUITAR)]],
    // The music packages, each as one small scene.
    'ens-solo': ['0 0 66 122', [at('translate(0 2)', VIOLIN.concat(BOW))]],
    'ens-duo': ['0 0 118 124', [at('translate(4 4) rotate(9 32 116)', VIOLIN), at('translate(56 1) rotate(-9 30 120)', GUITAR)]],
    'ens-trio': ['0 0 178 124', [at('translate(40 27)', PIANO), at('translate(2 4) rotate(-4 32 116)', VIOLIN), at('translate(112 2) rotate(5 30 120)', GUITAR)]],
    candelabra: ['0 0 72 84', [
      'M20 83 H52', 'M24 83 C 26 77, 46 77, 48 83', 'M36 78 V44', 'e 36 66 3.5 2', 'e 36 54 2.5 1.6',
      'M36 50 C 30 56, 14 54, 14 40', 'M36 50 C 42 56, 58 54, 58 40', 'M36 44 V34',
      'M9 40 H19', 'M53 40 H63', 'M31 34 H41',
      'M11.5 40 V20 H16.5 V40', 'M55.5 40 V20 H60.5 V40', 'M33.5 34 V12 H38.5 V34',
      'M14 17 C 11.8 14, 13 10.5, 14 8.5 C 15 10.5, 16.2 14, 14 17 Z',
      'M58 17 C 55.8 14, 57 10.5, 58 8.5 C 59 10.5, 60.2 14, 58 17 Z',
      'M36 9 C 33.8 6, 35 2.5, 36 0.8 C 37 2.5, 38.2 6, 36 9 Z',
    ]],
    vase: ['0 0 52 70', [
      'M17 68 H33 C 36 60, 38 52, 33 44 V38 H17 V44 C 12 52, 14 60, 17 68 Z', 'M15 38 H35',
      'M25 38 C 24 28, 18 22, 12 17', 'M25 38 V10', 'M25 38 C 27 28, 33 24, 40 19',
      'c 12 15.5 3.2', 'c 25 8 3.4', 'c 41 17.5 3.2', 'c 12 15.5 1.1', 'c 25 8 1.2', 'c 41 17.5 1.1',
      'M20.5 28 c -6 -1 -8 -5 -7 -8 c 4 1 7 4 7 8', 'M29.5 30 c 5 -2 8 -6 7 -9 c -4 1 -7 5 -7 9',
    ]],
    notes: ['0 0 64 56', [].concat(NOTE(12, 46, 32), NOTE(32, 40, 32), ['M15.3 14 L35.3 8', 'M15.3 19.5 L35.3 13.5'], NOTE(52, 30, 22, true))],
    calendar: ['0 0 70 70', [
      'M8 14 H62 Q64 14 64 16 V62 Q64 64 62 64 H8 Q6 64 6 62 V16 Q6 14 8 14 Z', 'M6 26 H64', 'M20 8 V20 M50 8 V20',
      'M14 36 h6 M28 36 h6 M42 36 h6 M14 46 h6 M28 46 h6 M14 56 h6 M28 56 h6',
      'M49 51 C 46 47, 41 49, 43 53 L49 58.5 L55 53 C 57 49, 52 47, 49 51 Z',
    ]],
    road: ['0 0 80 72', [
      'M40 44 C 30 32, 28 28, 28 22 C 28 15, 33.5 10, 40 10 C 46.5 10, 52 15, 52 22 C 52 28, 50 32, 40 44 Z', 'c 40 22 4.5',
      'M4 70 C 18 62, 30 58, 36 50', 'M76 70 C 62 62, 50 58, 44 50', 'M40 70 V65 M40 60 V56.5 M40 53 V51',
      'M10 50 C 10 44, 14 42, 16 40 M16 40 C 18 44, 18 48, 14 50 M13 50 V56',
      'M66 46 C 66 40, 70 38, 72 36 M72 36 C 74 40, 74 44, 70 46 M69 46 V52',
    ]],
    envelope: ['0 0 92 64', [
      'M6 14 H74 V58 H6 Z', 'M6 14 L40 38 L74 14', 'M6 58 L32 32 M74 58 L48 32',
      'M40 43 C 37.5 39.5, 33 41, 35 44.5 L40 49 L45 44.5 C 47 41, 42.5 39.5, 40 43 Z',
      'M70 14 C 74 8, 80 5, 88 3', 'M77 7 c 1 -4 5 -6 8 -5 c -1 4 -5 6 -8 5', 'M83 4 c -1 -3 0 -3 1 -3',
    ]],
    tag: ['0 0 72 60', [
      'M24 10 H60 Q64 10 64 14 V46 Q64 50 60 50 H24 L8 30 Z', 'c 21 30 3',
      'M18 30 C 11 30, 4 22, 6 14 C 8 8, 14 8, 14 3',
      'M49 23 C 47 20, 39 20, 39 25 C 39 30, 49 29, 49 35 C 49 40, 41 40, 39 37', 'M44 18 V42',
    ]],
    van: ['0 0 100 62', [
      'M6 46 V18 Q6 14 10 14 H62 V46', 'M62 22 H78 L92 36 V46 Q92 48 90 48 H84', 'M66 26 H77 L86 35 H66 Z',
      'M6 46 Q6 48 8 48 H17 M31 48 H69', 'c 24 48 7', 'c 24 48 2.5', 'c 76 48 7', 'c 76 48 2.5',
      'M16 38 C 24 30, 36 34, 46 26', 'M24 32 c -2 -4 1 -7 4 -6 c 0 4 -2 6 -4 6', 'M36 32 c 1 -4 5 -5 7 -3 c -2 3 -5 4 -7 3',
    ]],
  };
  function shapeSvg(d) {
    var solid = d.charAt(0) === '!';
    if (solid) d = d.slice(1);
    var cls = solid ? ' class="solid"' : '', n = d.split(' ');
    if (n[0] === 'c') return '<circle pathLength="1"' + cls + ' cx="' + n[1] + '" cy="' + n[2] + '" r="' + n[3] + '"/>';
    if (n[0] === 'e') return '<ellipse pathLength="1"' + cls + ' cx="' + n[1] + '" cy="' + n[2] + '" rx="' + n[3] + '" ry="' + n[4] + '"' +
      (n[5] ? ' transform="rotate(' + n[5] + ' ' + n[1] + ' ' + n[2] + ')"' : '') + '/>';
    return '<path pathLength="1"' + cls + ' d="' + d + '"/>';
  }
  function partsSvg(list) {
    return list.map(function (it) {
      return typeof it === 'string' ? shapeSvg(it) : '<g transform="' + it.g + '">' + partsSvg(it.parts) + '</g>';
    }).join('');
  }
  function artSvg(name) { return ART[name] ? partsSvg(ART[name][1]) : ''; }
  // Keep every drawing's line about 1.1px on screen whatever size it is shown
  // at. (non-scaling-stroke did this, but Chrome then measures the draw-in dash
  // in screen pixels, so on high-density screens the drawings stopped short.)
  function fitStroke(el) {
    var h = el.getBoundingClientRect().height, vb = el.viewBox && el.viewBox.baseVal;
    if (h && vb && vb.height) el.style.setProperty('--sw', (1.1 * vb.height / h).toFixed(3));
  }
  window.__fitStroke = function (root) {
    (root || document).querySelectorAll('svg.line-art, svg.category-art').forEach(fitStroke);
  };
  document.querySelectorAll('svg.line-art[data-art]').forEach(function (el) {
    var a = ART[el.getAttribute('data-art')];
    if (!a) return;
    el.setAttribute('viewBox', a[0]);
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('focusable', 'false');
    el.innerHTML = artSvg(el.getAttribute('data-art'));
  });
  window.__fitStroke();
  var strokeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(strokeTimer);
    strokeTimer = setTimeout(function () { window.__fitStroke(); }, 150);
  });
  // For page scripts that build markup later.
  window.__lineArt = artSvg;
  window.__lineArtBox = function (name) { return ART[name] ? ART[name][0] : '0 0 60 60'; };

  // ---- reveals ------------------------------------------------------------
  var revealables = document.querySelectorAll('.fade-in, .reveal-clip, .flourish, .category-art, .line-art');
  var drawn = /\b(flourish|category-art|line-art)\b/;
  var reveal = function (el) { el.classList.add(drawn.test(el.getAttribute('class')) ? 'is-drawn' : 'visible'); };
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
          if (window.__fitStroke) window.__fitStroke(panel);
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
