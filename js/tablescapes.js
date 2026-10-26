(function () {
  var video = document.getElementById('tbVideo');
  var playBtn = document.getElementById('tbPlay');
  var header = document.querySelector('.site-header');
  if (!video) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  var userPaused = !!(reduce || saveData);
  var visible = true;
  var loaded = false;

  // The video file is chosen here, not in markup, so it is only fetched once and
  // only for visitors who will actually see it moving.
  function pickSrc() {
    var small = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
    return video.getAttribute(small ? 'data-src-small' : 'data-src-large');
  }
  // Safari and every iPhone browser (all WebKit) will only stream a video from a
  // server that answers byte-range requests with 206. Workers static assets answer
  // 200 with the whole file, which WebKit refuses to play. So WebKit downloads the
  // (small) file and plays it from memory; everyone else streams it normally.
  var ua = navigator.userAgent;
  var webkitOnly = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua);
  function load() {
    if (loaded) return;
    loaded = true;
    var src = pickSrc();
    video.preload = 'auto';
    if (!webkitOnly) { video.src = src; return update(); }
    fetch(src).then(function (r) { return r.blob(); }).then(function (b) {
      video.src = URL.createObjectURL(b);
      update();
    }).catch(function () {});
  }

  function sync() {
    playBtn.classList.toggle('is-paused', video.paused);
    playBtn.setAttribute('aria-label', video.paused ? 'Play background video' : 'Pause background video');
  }
  function update() {
    if (!loaded) { sync(); return; }
    if (userPaused || !visible || document.hidden) {
      video.pause();
    } else {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }
    sync();
  }

  // Motion-sensitive visitors and data-saver users get the still poster and
  // download nothing until they press play.
  if (!userPaused) load();

  playBtn.addEventListener('click', function () {
    if (!loaded) { userPaused = false; load(); return; }
    userPaused = !video.paused;
    update();
  });
  video.addEventListener('play', sync);
  video.addEventListener('pause', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      update();
    }, { threshold: 0.1 }).observe(video);
  }
  document.addEventListener('visibilitychange', update);
  sync();

  // Intro slideshow. Each change is revealed through a growing circle that starts
  // at the slide's flame point (--fx / --fy); see the .tb-reel rules.
  var reel = document.getElementById('tbReel');
  if (reel) {
    var slides = Array.prototype.slice.call(reel.querySelectorAll('.tb-reel-slide'));
    var dotsEl = document.getElementById('tbReelDots');
    var rbtn = document.getElementById('tbReelPlay');
    var glow = reel.querySelector('.tb-reel-glow');
    var HOLD = 5200;
    var idx = 0, playing = !reduce, inView = true, timer = null;
    if (window.CSS && CSS.registerProperty && !reduce) reel.classList.add('tb-reveal');

    slides.forEach(function (sl, i) {
      var d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('aria-label', 'Photo ' + (i + 1) + ' of ' + slides.length);
      if (i === 0) d.setAttribute('aria-current', 'true');
      d.addEventListener('click', function () { playing = false; go(i); syncBtn(); });
      dotsEl.appendChild(d);
    });
    var dots = Array.prototype.slice.call(dotsEl.children);

    function go(n) {
      n = (n + slides.length) % slides.length;
      if (n === idx) return;
      var from = slides[idx], to = slides[n];
      slides.forEach(function (sl) { sl.classList.remove('is-prev', 'is-entering'); });
      from.classList.remove('is-active');
      from.classList.add('is-prev');
      to.classList.add('is-active', 'is-entering');
      reel.style.setProperty('--fx', to.style.getPropertyValue('--fx'));
      reel.style.setProperty('--fy', to.style.getPropertyValue('--fy'));
      reel.classList.remove('is-changing');
      void reel.offsetWidth; // restart the glow
      reel.classList.add('is-changing');
      var done = function () { from.classList.remove('is-prev'); to.classList.remove('is-entering'); };
      var ended = false;
      to.addEventListener('animationend', function h(e) {
        if (e.target !== to || ended) return;
        ended = true; to.removeEventListener('animationend', h); done();
      });
      setTimeout(function () { if (!ended) { ended = true; done(); } }, 3200);
      dots.forEach(function (d, i) { if (i === n) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      idx = n;
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      if (playing && inView && !document.hidden) timer = setTimeout(function () { go(idx + 1); }, HOLD);
    }
    function syncBtn() {
      rbtn.classList.toggle('is-paused', !playing);
      rbtn.setAttribute('aria-label', playing ? 'Pause slideshow' : 'Play slideshow');
      schedule();
    }
    rbtn.addEventListener('click', function () { playing = !playing; syncBtn(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { inView = e[0].isIntersecting; schedule(); }, { threshold: 0.3 }).observe(reel);
    }
    document.addEventListener('visibilitychange', schedule);
    syncBtn();
  }
})();
