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
    root.dataset.theme = state.look;
    if (header) header.classList.toggle('on-dark', state.look === 'fall');
    root.querySelectorAll('.tb-toggle button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.look === state.look ? 'true' : 'false');
    });
    if (nameEl) nameEl.textContent = LOOKS[state.look].label;
    if (noteEl) noteEl.textContent = LOOKS[state.look].note;
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
      schedule();
    }, { threshold: 0.25 }).observe(frame);
  }
  document.addEventListener('visibilitychange', schedule);

  render();
})();
