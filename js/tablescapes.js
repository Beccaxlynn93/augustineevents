(function () {
  var video = document.getElementById('tbVideo');
  var playBtn = document.getElementById('tbPlay');
  var header = document.querySelector('.site-header');
  if (!video) return;
  // The page is dark and the top panel is a dark video, so the header reads on dark.
  if (header) header.classList.add('on-dark');

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
})();
