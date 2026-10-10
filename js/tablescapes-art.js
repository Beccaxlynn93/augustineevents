/* Procedural line art for the Custom Tablescapes page. Builds the Fall and
   Winter drawings once, as SVG paths that paint outward from the slideshow
   (each path's --d delay grows with its distance from the centre). */
(function () {
  var W = 1600, H = 900, CX = 800, CY = 450, SPEED = 700;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function n1(v) { return Math.round(v * 10) / 10; }
  function ring(x, y) { return Math.max(0, Math.hypot(x - CX, (y - CY) * 0.8) - 330) / SPEED; }

  function str(cmds, mirror) {
    return cmds.map(function (c) {
      var out = c[0];
      for (var i = 1; i < c.length; i += 2) {
        out += (i > 1 ? ' ' : '') + n1(mirror ? W - c[i] : c[i]) + ' ' + n1(c[i + 1]);
      }
      return out;
    }).join('');
  }
  function place(shape, x, y, a, s) {
    var ca = Math.cos(a), sa = Math.sin(a);
    return shape.map(function (c) {
      var o = [c[0]];
      for (var i = 1; i < c.length; i += 2) {
        var px = c[i] * s, py = c[i + 1] * s;
        o.push(x + px * ca - py * sa, y + px * sa + py * ca);
      }
      return o;
    });
  }

  var LEAF = [['M', 0, 0], ['C', 0.25, -0.32, 0.7, -0.34, 1, 0], ['C', 0.7, 0.34, 0.25, 0.32, 0, 0],
    ['M', 0, 0], ['L', 0.92, 0], ['M', 0.35, 0], ['L', 0.58, -0.15], ['M', 0.35, 0], ['L', 0.58, 0.15]];
  var MAPLE = [['M', 0, 0], ['L', 0.18, -0.08], ['L', 0.2, -0.3], ['L', 0.38, -0.2], ['L', 0.5, -0.46], ['L', 0.62, -0.22],
    ['L', 0.82, -0.28], ['L', 0.74, -0.08], ['L', 1, 0], ['L', 0.74, 0.08], ['L', 0.82, 0.28], ['L', 0.62, 0.22],
    ['L', 0.5, 0.46], ['L', 0.38, 0.2], ['L', 0.2, 0.3], ['L', 0.18, 0.08], ['L', 0, 0], ['M', 0, 0], ['L', 0.95, 0]];
  var GRAIN = [['M', 0, 0], ['C', 0.2, -0.45, 0.8, -0.45, 1, 0], ['C', 0.8, 0.45, 0.2, 0.45, 0, 0]];

  function smooth(pts) {
    var cmds = [['M', pts[0][0], pts[0][1]]];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      cmds.push(['C', p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]]);
    }
    return cmds;
  }
  function stemPts(r, x, y, ang, len, curl, bias) {
    var n = Math.max(6, Math.round(len / 26)), step = len / n, pts = [[x, y]];
    for (var i = 0; i < n; i++) {
      ang += (r() - 0.5) * curl + bias;
      x += Math.cos(ang) * step; y += Math.sin(ang) * step;
      pts.push([x, y]);
    }
    return pts;
  }
  function at(pts, f) {
    var i = Math.min(pts.length - 2, Math.floor(f * (pts.length - 1)));
    var t = f * (pts.length - 1) - i, a = pts[i], b = pts[i + 1];
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  function plen(pts) {
    var s = 0;
    for (var i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return s;
  }

  function build(look) {
    var items = [];
    function add(cmds, cls, delay, dur, mirror) {
      if (cmds.length) items.push({ d: str(cmds, mirror), cls: cls, delay: delay, dur: Math.max(0.5, dur) });
    }

    function sideArt(side) {
      var mirror = side === 'r', r = rng(side === 'l' ? 11 : 37), out = [];
      var X0 = 360;
      var sgn = 1; // growth runs toward smaller x in the left-hand frame

      function stemItem(pts, cls, depth, f0, parentDelay, parentDur) {
        var len = plen(pts);
        var delay = depth === 0 ? ring(pts[0][0], pts[0][1]) : parentDelay + f0 * parentDur + 0.05;
        var dur = len / SPEED + 0.3;
        add(smooth(pts), cls, delay, dur, mirror);
        return { delay: delay, dur: dur };
      }

      function vine(x, y, ang, len, curl, bias, depth, f0, pd, pdur) {
        var pts = stemPts(r, x, y, ang, len, curl, bias);
        var info = stemItem(pts, 'st', depth, f0, pd, pdur);
        var leaves = [], berries = [], flip = r() > 0.5 ? 1 : -1, nL = Math.round(len / 34);
        for (var i = 2; i < nL; i++) {
          var f = i / nL, p = at(pts, f), taper = 1 - 0.45 * f;
          flip = -flip;
          var s = (22 + r() * 18) * taper * (depth ? 0.8 : 1);
          var shape = r() < 0.3 ? MAPLE : LEAF;
          leaves = leaves.concat(place(shape, p.x, p.y, p.a + flip * (0.7 + r() * 0.5), s));
        }
        var tip = at(pts, 1);
        leaves = leaves.concat(place(LEAF, tip.x, tip.y, tip.a, 22 * (depth ? 0.8 : 1)));
        add(leaves, 'lf', info.delay + 0.1, info.dur, mirror);
        if (r() < 0.7 || depth) {
          var cl = [];
          var m = 3 + Math.floor(r() * 3), bp = at(pts, 0.55 + r() * 0.35);
          for (var k = 0; k < m; k++) {
            var bx = bp.x + (r() - 0.5) * 34, by = bp.y + 14 + r() * 28, br = 4.5 + r() * 3;
            cl.push(['M', bp.x, bp.y], ['L', bx, by], ['M', bx - br, by], ['C', bx - br, by - br * 1.4, bx + br, by - br * 1.4, bx + br, by],
              ['C', bx + br, by + br * 1.4, bx - br, by + br * 1.4, bx - br, by]);
          }
          add(cl, 'am', info.delay + info.dur * 0.55, 0.9, mirror);
        }
        if (depth < 2 && len > 140) {
          var subs = depth === 0 ? [0.25, 0.45, 0.65, 0.82] : [0.5];
          subs.forEach(function (sf, si) {
            var p = at(pts, sf), dir = (si % 2 ? 1 : -1);
            vine(p.x, p.y, p.a + dir * (0.7 + r() * 0.4), len * (0.34 + r() * 0.14), curl * 1.2, -dir * 0.05, depth + 1, sf, info.delay, info.dur);
          });
        }
        if (depth === 1 || r() < 0.4) {
          var sp = [], a0 = tip.a, rad = 15;
          for (var t = 0; t <= 2.1 * Math.PI; t += 0.35) {
            var rr = rad * (1 - t / (2.6 * Math.PI));
            sp.push([tip.x + Math.cos(a0 + t * flip) * rr - Math.cos(a0) * rad + Math.cos(a0 + 0) * 0, tip.y + Math.sin(a0 + t * flip) * rr - Math.sin(a0) * rad]);
          }
          if (sp.length > 3) add(smooth(sp), 'st', info.delay + info.dur, 0.7, mirror);
        }
      }

      function wheat(x, y, h, lean) {
        var pts = [[x, y], [x + lean * 0.4, y - h * 0.5], [x + lean, y - h]];
        var d0 = ring(x, y - h * 0.3);
        add(smooth(pts), 'st', d0, h / SPEED + 0.4, mirror);
        var grains = [], awns = [];
        for (var i = 0; i < 7; i++) {
          var p = at(pts, 0.62 + i * 0.055);
          grains = grains.concat(place(GRAIN, p.x, p.y, p.a - 0.5, 20), place(GRAIN, p.x, p.y, p.a + 0.5, 20));
        }
        var top = at(pts, 1);
        grains = grains.concat(place(GRAIN, top.x, top.y, top.a, 20));
        for (var k = -1; k <= 1; k++) awns.push(['M', top.x, top.y], ['L', top.x + Math.cos(top.a + k * 0.18) * 56, top.y + Math.sin(top.a + k * 0.18) * 56]);
        add(grains, 'lf', d0 + h / SPEED * 0.6, 0.9, mirror);
        add(awns, 'st', d0 + h / SPEED + 0.2, 0.5, mirror);
      }

      function pumpkin(cx, cy, ry) {
        var rx = ry * 1.28, c = [['M', cx - rx, cy], ['C', cx - rx, cy - ry * 1.3, cx + rx, cy - ry * 1.3, cx + rx, cy],
          ['C', cx + rx, cy + ry * 1.3, cx - rx, cy + ry * 1.3, cx - rx, cy]];
        [-0.62, -0.28, 0.28, 0.62].forEach(function (k) {
          c.push(['M', cx + k * rx * 0.55, cy - ry * 0.92], ['Q', cx + k * rx * 1.25, cy, cx + k * rx * 0.55, cy + ry * 0.92]);
        });
        c.push(['M', cx, cy - ry * 0.95], ['L', cx + 4, cy - ry * 1.5], ['M', cx + 4, cy - ry * 1.3], ['Q', cx + ry * 0.8, cy - ry * 1.6, cx + ry * 0.7, cy - ry * 1.05]);
        add(c, 'am', ring(cx, cy) + 0.2, 1.8, mirror);
      }

      function floatLeaf(x, y, s) {
        add(place(r() < 0.5 ? LEAF : MAPLE, x, y, r() * 6.28, s), 'lf fl', ring(x, y) + 0.4, 0.9, mirror);
      }

      function fir(x, y, ang, len, curl, bias, depth, f0, pd, pdur) {
        var pts = stemPts(r, x, y, ang, len, curl, bias);
        var info = stemItem(pts, 'st', depth, f0, pd, pdur), needles = [], nN = Math.round(len / 15);
        for (var i = 1; i <= nN; i++) {
          var f = i / nN, p = at(pts, f), L = (24 - 13 * f) * (depth ? 0.8 : 1);
          [-1, 1].forEach(function (sd) {
            var na = p.a + sd * (0.95 - 0.25 * f);
            needles.push(['M', p.x, p.y], ['L', p.x + Math.cos(na) * L, p.y + Math.sin(na) * L]);
          });
        }
        add(needles, 'lf', info.delay + 0.1, info.dur, mirror);
        if (depth < 2 && len > 150) {
          (depth === 0 ? [0.28, 0.5, 0.72] : [0.55]).forEach(function (sf, si) {
            var p = at(pts, sf), dir = si % 2 ? 1 : -1;
            fir(p.x, p.y, p.a + dir * (0.85 + r() * 0.3), len * (0.36 + r() * 0.12), curl, -dir * 0.04, depth + 1, sf, info.delay, info.dur);
          });
        }
      }

      function twig(x, y, ang, len, depth) {
        var segs = [];
        (function go(x, y, ang, len, depth) {
          var x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
          segs.push(['M', x, y], ['Q', (x + x2) / 2 + (r() - 0.5) * len * 0.2, (y + y2) / 2 + (r() - 0.5) * len * 0.2, x2, y2]);
          if (depth > 0) {
            go(x2, y2, ang + 0.2 + r() * 0.4, len * 0.7, depth - 1);
            go(x2, y2, ang - 0.2 - r() * 0.45, len * 0.68, depth - 1);
            if (r() < 0.5) go((x + x2 * 2) / 3, (y + y2 * 2) / 3, ang + (r() < 0.5 ? 1 : -1) * 0.9, len * 0.45, depth - 2);
          }
        })(x, y, ang, len, depth);
        add(segs, 'st', ring(x, y) + 0.3, 3.2, mirror);
      }

      function snowflake(cx, cy, rad, rot) {
        var c = [];
        for (var k = 0; k < 6; k++) {
          var a = rot + k * Math.PI / 3, ex = cx + Math.cos(a) * rad, ey = cy + Math.sin(a) * rad;
          c.push(['M', cx, cy], ['L', ex, ey]);
          [0.45, 0.72].forEach(function (f) {
            var bx = cx + Math.cos(a) * rad * f, by = cy + Math.sin(a) * rad * f, bl = rad * (0.34 - f * 0.12);
            c.push(['M', bx, by], ['L', bx + Math.cos(a + 0.95) * bl, by + Math.sin(a + 0.95) * bl],
              ['M', bx, by], ['L', bx + Math.cos(a - 0.95) * bl, by + Math.sin(a - 0.95) * bl]);
          });
        }
        add(c, 'sn', ring(cx, cy) + 0.2 + r() * 0.3, 1.1, mirror);
      }

      function sparkle(x, y, s) {
        add([['M', x, y - s], ['Q', x, y, x + s, y], ['Q', x, y, x, y + s], ['Q', x, y, x - s, y], ['Q', x, y, x, y - s]], 'sn tw', ring(x, y) + 0.5, 0.7, mirror);
      }

      if (look === 'fall') {
        vine(X0, 395, Math.PI + 0.05, 560, 0.42, -0.045, 0, 0, 0, 0);
        vine(X0, 505, Math.PI - 0.5, 520, 0.4, 0.04, 0, 0, 0, 0);
        vine(X0 + 20, 300, Math.PI + 0.62, 470, 0.4, -0.05, 0, 0, 0, 0);
        vine(X0 + 30, 600, Math.PI - 0.95, 400, 0.36, 0.05, 0, 0, 0, 0);
        wheat(60, 910, 300, 26); wheat(112, 915, 340, -6); wheat(168, 915, 270, 18);
        pumpkin(235, 858, 36); pumpkin(305, 872, 24);
        for (var i = 0; i < 7; i++) floatLeaf(30 + r() * 270, 40 + r() * 800, 18 + r() * 14);
      } else {
        fir(X0, 395, Math.PI + 0.06, 500, 0.3, -0.04, 0, 0, 0, 0);
        fir(X0, 505, Math.PI - 0.45, 460, 0.3, 0.03, 0, 0, 0, 0);
        fir(X0 + 20, 300, Math.PI + 0.58, 400, 0.3, -0.04, 0, 0, 0, 0);
        fir(X0 + 30, 600, Math.PI - 0.9, 360, 0.28, 0.04, 0, 0, 0, 0);
        twig(-10, 905, -1.15, 230, 5);
        if (side === 'l') twig(40, -10, 1.2, 210, 5);
        for (var j = 0; j < 9; j++) snowflake(20 + r() * 300, 50 + r() * 800, 14 + r() * 30, r() * 1.05);
        for (var q = 0; q < 8; q++) sparkle(20 + r() * 320, 30 + r() * 840, 6 + r() * 9);
      }
    }

    sideArt('l'); sideArt('r');

    if (look === 'winter') {
      var mx = 1020, my = 118, mr = 36;
      add([['M', mx, my - mr], ['C', mx - mr * 1.5, my - mr * 0.55, mx - mr * 1.5, my + mr * 0.55, mx, my + mr],
        ['C', mx - mr * 0.45, my + mr * 0.5, mx - mr * 0.45, my - mr * 0.5, mx, my - mr]], 'sn moon', 0.3, 2.4, false);
      var r2 = rng(5);
      [[930, 78, 7], [1110, 92, 9], [1170, 168, 6], [890, 150, 5]].forEach(function (s) {
        add([['M', s[0], s[1] - s[2]], ['Q', s[0], s[1], s[0] + s[2], s[1]], ['Q', s[0], s[1], s[0], s[1] + s[2]],
          ['Q', s[0], s[1], s[0] - s[2], s[1]], ['Q', s[0], s[1], s[0], s[1] - s[2]]], 'sn tw', 0.8 + r2() * 1.2, 0.7, false);
      });
    }

    var maxDelay = 0;
    items.forEach(function (it) { maxDelay = Math.max(maxDelay, it.delay); });
    return items.map(function (it) {
      return '<path class="' + it.cls + '" pathLength="1" style="--d:' + n1(it.delay * 100) / 100 + 's;--du:' + n1(it.dur * 100) / 100 +
        's;--r:' + n1((maxDelay - it.delay) * 35) / 100 + 's" d="' + it.d + '"/>';
    }).join('');
  }

  var layer = document.querySelector('.tb-art-layer');
  if (!layer) return;
  ['fall', 'winter'].forEach(function (look) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'tb-art');
    svg.setAttribute('data-look', look);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = build(look);
    layer.appendChild(svg);
  });

  function fit() {
    var w = layer.clientWidth, h = layer.clientHeight;
    if (!w || !h) return;
    layer.style.setProperty('--sw', (1.5 / Math.max(w / W, h / H)).toFixed(3));
  }
  fit();
  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fit, 120); });
  document.dispatchEvent(new CustomEvent('tb-art-ready'));
})();
