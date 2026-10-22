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

  function sync() {
    playBtn.classList.toggle('is-paused', video.paused);
    playBtn.setAttribute('aria-label', video.paused ? 'Play background video' : 'Pause background video');
  }
  function update() {
    if (userPaused || !visible || document.hidden) {
      video.pause();
    } else {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }
    sync();
  }

  // Motion-sensitive visitors and data-saver users get the still poster; they can opt in with the button.
  if (userPaused) { video.removeAttribute('autoplay'); video.preload = 'none'; }

  playBtn.addEventListener('click', function () {
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
