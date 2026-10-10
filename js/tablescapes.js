(function () {
  var root = document.querySelector('.tb');
  if (!root) return;
  var slides = Array.prototype.slice.call(root.querySelectorAll('.tb-slide'));
  var frame = root.querySelector('.tb-frame');
  var header = document.querySelector('.site-header');
  var dotsEl = document.getElementById('tbDots');
  var playBtn = document.getElementById('tbPlay');
  var nameEl = document.getElementById('tbLookName');
  var noteEl = document.getElementById('tbLookNote');
  var HOLD = 4600;
  var LOOKS = {
    fall: { label: 'Fall Harvest', note: 'Sage toile, white pumpkins and burnt orange tapers.' },
    winter: { label: 'Winter', note: 'Cream linen, rosemary and brass candlelight.' }
  };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = { look: 'fall', idx: 0, playing: !reduce, visible: true, timer: null };


  // ---- theme switch: wipe from the slideshow, art repaints, light flash ----
  var show = root.querySelector('.tb-show');
  var bgs = {};
  show.querySelectorAll('.tb-bg').forEach(function (b) { bgs[b.dataset.look] = b; });
  var ring = show.querySelector('.tb-ring');
  var layer = show.querySelector('.tb-art-layer');
  var zTop = 1;
  var theme = null;
  if (header) header.classList.add('on-dark');

  function artFor(look) { return layer.querySelector('.tb-art[data-look="' + look + '"]'); }
  function setArt(look) {
    ['fall', 'winter'].forEach(function (l) {
      var a = artFor(l);
      if (a) a.classList.toggle('is-on', l === look);
    });
  }

  function setTheme(look) {
    if (theme === look) return;
    var first = theme === null;
    var other = look === 'fall' ? 'winter' : 'fall';
    theme = look;
    root.dataset.theme = look;
    var fr = frame.getBoundingClientRect(), sr = show.getBoundingClientRect();
    var cx = fr.left - sr.left + fr.width / 2, cy = fr.top - sr.top + fr.height / 2;
    show.style.setProperty('--cx', cx + 'px');
    show.style.setProperty('--cy', cy + 'px');
    show.style.setProperty('--R', (1.5 * Math.hypot(sr.width, sr.height) / Math.SQRT2) + 'px');
    if (first || reduce) {
      bgs[look].classList.add('is-on');
      bgs[other].classList.remove('is-on');
      if (first) {
        show.style.setProperty('--lead', '0.9s');
        setTimeout(function () { setArt(look); startFx(); }, 150);
      } else {
        setArt(look);
      }
      return;
    }
    show.style.setProperty('--lead', '0.45s');
    var layerEl = bgs[look];
    layerEl.classList.remove('is-on');
    layerEl.style.zIndex = ++zTop;
    void layerEl.offsetWidth;
    layerEl.classList.add('is-on');
    clearTimeout(setTheme.t);
    setTheme.t = setTimeout(function () { bgs[other].classList.remove('is-on'); }, 1800);
    setArt(look);
    ring.classList.remove('go'); void ring.offsetWidth; ring.classList.add('go');
    frame.classList.remove('flash'); void frame.offsetWidth; frame.classList.add('flash');
    burst(look, cx, cy);
  }

  // ---- falling leaves and snow ---------------------------------------------
  var cv = show.querySelector('.tb-fx'), ctx = cv && cv.getContext && cv.getContext('2d');
  var parts = [], fxOn = false, fxRaf = 0, cw = 0, ch = 0, dpr = 1;
  var LEAF_COL = ['#e8962e', '#c9702a', '#e9d9b4', '#b5532a'];
  function sizeFx() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = show.clientWidth; ch = show.clientHeight;
    cv.width = cw * dpr; cv.height = ch * dpr;
  }
  function spawn(look, x, y, vx, vy) {
    parts.push({
      look: look, x: x, y: y, vx: vx, vy: vy, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.04,
      s: look === 'fall' ? 5 + Math.random() * 6 : 1 + Math.random() * 2.4, ph: Math.random() * 6.28,
      col: LEAF_COL[Math.floor(Math.random() * LEAF_COL.length)], life: 1, dying: false
    });
  }
  function ambient(look) {
    var want = Math.round(cw / 28);
    var have = parts.filter(function (p) { return p.look === look && !p.dying; }).length;
    if (have < want && Math.random() < 0.35) spawn(look, Math.random() * cw, -12, (Math.random() - 0.5) * 0.4, 0.5 + Math.random() * 0.8);
  }
  function burst(look, cx, cy) {
    if (!ctx) return;
    parts.forEach(function (p) { if (p.look !== look) p.dying = true; });
    for (var i = 0; i < 46; i++) {
      var a = Math.random() * 6.28, sp = 2 + Math.random() * 5;
      spawn(look, cx, cy, Math.cos(a) * sp, Math.sin(a) * sp - 1);
    }
    startFx();
  }
  function frameFx() {
    fxRaf = 0;
    if (!fxOn) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ambient(theme);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.ph += 0.02;
      p.vx *= 0.985; if (p.vy > 1.4 && p.life === 1) p.vy *= 0.985;
      var drift = Math.sin(p.ph) * (p.look === 'fall' ? 0.9 : 0.35);
      p.x += p.vx + drift; p.y += Math.max(p.vy, 0.5 + p.s * 0.06); p.rot += p.vr;
      if (p.dying) p.life -= 0.02;
      if (p.y > ch + 16 || p.x < -30 || p.x > cw + 30 || p.life <= 0) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life) * (p.look === 'fall' ? 0.8 : 0.85);
      ctx.fillStyle = p.look === 'fall' ? p.col : '#eaf2fb';
      ctx.beginPath();
      if (p.look === 'fall') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(p.ph)));
        ctx.ellipse(0, 0, p.s * 1.5, p.s * 0.8, 0, 0, 6.28); ctx.fill(); ctx.restore();
      } else {
        ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.fill();
      }
    }
    fxRaf = requestAnimationFrame(frameFx);
  }
  function startFx() {
    if (!ctx || reduce || !fxOn || fxRaf) return;
    fxRaf = requestAnimationFrame(frameFx);
  }
  if (ctx && !reduce) {
    sizeFx();
    window.addEventListener('resize', sizeFx);
    fxOn = true;
    document.addEventListener('visibilitychange', function () { fxOn = !document.hidden && state.visible; startFx(); });
  }

  // ---- gentle pointer parallax on the art ----------------------------------
  if (!reduce && window.matchMedia('(pointer: fine)').matches) {
    var tx = 0, ty = 0, cx0 = 0, cy0 = 0, pr = 0;
    show.addEventListener('pointermove', function (e) {
      var r = show.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * -22;
      ty = ((e.clientY - r.top) / r.height - 0.5) * -14;
      if (!pr) pr = requestAnimationFrame(glide);
    });
    var glide = function () {
      cx0 += (tx - cx0) * 0.08; cy0 += (ty - cy0) * 0.08;
      layer.style.setProperty('--px', cx0.toFixed(2) + 'px');
      layer.style.setProperty('--py', cy0.toFixed(2) + 'px');
      pr = (Math.abs(tx - cx0) > 0.05 || Math.abs(ty - cy0) > 0.05) ? requestAnimationFrame(glide) : 0;
    };
  }

  function inLook(look) {
    return slides.filter(function (s) { return s.dataset.look === look; });
  }

  function render() {
    var group = inLook(state.look);
    slides.forEach(function (s) {
      var on = s === group[state.idx];
      s.classList.toggle('is-active', on);
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    setTheme(state.look);
    root.querySelectorAll('.tb-toggle button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.look === state.look ? 'true' : 'false');
    });
    nameEl.textContent = LOOKS[state.look].label;
    noteEl.textContent = LOOKS[state.look].note;
    dotsEl.innerHTML = '';
    group.forEach(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', LOOKS[state.look].label + ' photo ' + (i + 1) + ' of ' + group.length);
      if (i === state.idx) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', function () { state.idx = i; stop(); render(); });
      dotsEl.appendChild(b);
    });
    playBtn.classList.toggle('is-paused', !state.playing);
    playBtn.setAttribute('aria-label', state.playing ? 'Pause slideshow' : 'Play slideshow');
    schedule();
  }

  function next() {
    var group = inLook(state.look);
    if (state.idx < group.length - 1) {
      state.idx++;
    } else if (state.look === 'fall') {
      state.look = 'winter';
      state.idx = 0;
    } else {
      state.playing = false;
    }
    render();
  }

  function schedule() {
    clearTimeout(state.timer);
    if (state.playing && state.visible && !document.hidden) {
      state.timer = setTimeout(next, HOLD);
    }
  }

  function stop() {
    state.playing = false;
    clearTimeout(state.timer);
  }

  function setLook(look) {
    stop();
    state.look = look;
    state.idx = 0;
    render();
  }

  root.querySelectorAll('.tb-toggle button').forEach(function (b) {
    b.addEventListener('click', function () { setLook(b.dataset.look); });
  });
  root.querySelectorAll('.tb-look-card').forEach(function (c) {
    c.addEventListener('click', function () {
      setLook(c.dataset.look);
      frame.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    });
  });
  playBtn.addEventListener('click', function () {
    if (state.playing) {
      stop();
    } else {
      var atEnd = state.look === 'winter' && state.idx === inLook('winter').length - 1;
      if (atEnd) { state.look = 'fall'; state.idx = 0; }
      state.playing = true;
    }
    render();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      state.visible = entries[0].isIntersecting;
      fxOn = state.visible && !document.hidden && !!ctx && !reduce;
      startFx();
      schedule();
    }, { threshold: 0.25 }).observe(frame);
  }
  document.addEventListener('visibilitychange', schedule);

  render();
})();
