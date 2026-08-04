(function () {
  var list = document.querySelectorAll(".sidebar-music-list li");
  var titleEl = document.getElementById("sm-title");
  var artistEl = document.getElementById("sm-artist");
  var playBtn = document.getElementById("sm-play");
  var prevBtn = document.getElementById("sm-prev");
  var nextBtn = document.getElementById("sm-next");
  var loopBtn = document.getElementById("sm-loop");
  var volumeBtn = document.getElementById("sm-volume-btn");
  var volumeBar = document.getElementById("sm-volume");
  var currentEl = document.getElementById("sm-current");
  var durationEl = document.getElementById("sm-duration");
  var bar = document.getElementById("sm-bar");
  var fill = document.getElementById("sm-fill");
  if (!list.length) return;

  var audio = new Audio();
  var current = 0;
  var isPlaying = false;
  var loopMode = "list";
  audio.volume = 0.8;
  var STORAGE_KEY = "foxwzh_music_state";
  var lastSave = 0;

  function saveState() {
    var state = {
      id: list[current] ? list[current].getAttribute("data-id") : null,
      time: audio.currentTime || 0,
      playing: isPlaying,
      volume: audio.volume,
      muted: audio.muted,
      loopMode: loopMode
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function throttleSave() {
    var now = Date.now();
    if (now - lastSave > 1000) {
      lastSave = now;
      saveState();
    }
  }

  function restoreState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function updateLoopUI() {
    loopBtn.classList.toggle("active", loopMode === "one");
    loopBtn.title = loopMode === "one" ? "单曲循环" : "列表循环";
    loopBtn.innerHTML =
      loopMode === "one"
        ? '<i class="fas fa-repeat-1"></i>'
        : '<i class="fas fa-repeat"></i>';
  }

  function updateVolumeIcon() {
    volumeBtn.innerHTML = audio.muted
      ? '<i class="fas fa-volume-xmark"></i>'
      : audio.volume === 0
        ? '<i class="fas fa-volume-off"></i>'
        : '<i class="fas fa-volume-up"></i>';
  }

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function load(index) {
    var li = list[index];
    if (!li) return;
    current = index;
    list.forEach(function (x, i) {
      x.classList.toggle("active", i === index);
    });
    titleEl.textContent = li.getAttribute("data-title");
    artistEl.textContent = li.getAttribute("data-artist");
    audio.src =
      "https://music.163.com/song/media/outer/url?id=" +
      li.getAttribute("data-id") +
      ".mp3";
    currentEl.textContent = "0:00";
    durationEl.textContent = "0:00";
    fill.style.width = "0%";
    if (isPlaying) {
      audio.play().catch(function () {});
    }
    saveState();
  }

  function play() {
    audio
      .play()
      .then(function () {
        isPlaying = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        saveState();
      })
      .catch(function () {
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        saveState();
      });
  }

  function pause() {
    audio.pause();
    isPlaying = false;
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    saveState();
  }

  function startPlaying() {
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    isPlaying = true;
    saveState();
  }

  playBtn.addEventListener("click", function () {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  });

  prevBtn.addEventListener("click", function () {
    load((current - 1 + list.length) % list.length);
  });

  nextBtn.addEventListener("click", function () {
    load((current + 1) % list.length);
  });

  loopBtn.addEventListener("click", function () {
    loopMode = loopMode === "list" ? "one" : "list";
    updateLoopUI();
    saveState();
  });

  volumeBtn.addEventListener("click", function () {
    audio.muted = !audio.muted;
    updateVolumeIcon();
    saveState();
  });

  volumeBar.addEventListener("input", function () {
    audio.volume = parseFloat(volumeBar.value);
    audio.muted = false;
    updateVolumeIcon();
    saveState();
  });

  list.forEach(function (li, i) {
    li.addEventListener("click", function () {
      if (i !== current) {
        load(i);
      } else {
        play();
      }
    });
  });

  audio.addEventListener("timeupdate", function () {
    currentEl.textContent = fmt(audio.currentTime);
    if (audio.duration) {
      durationEl.textContent = fmt(audio.duration);
      fill.style.width = (audio.currentTime / audio.duration) * 100 + "%";
    }
    throttleSave();
  });

  audio.addEventListener("ended", function () {
    if (loopMode === "one") {
      audio.currentTime = 0;
      audio.play().catch(function () {});
    } else {
      load((current + 1) % list.length);
    }
  });

  bar.addEventListener("click", function (e) {
    if (!audio.duration) return;
    var rect = bar.getBoundingClientRect();
    var ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
  });

  window.addEventListener("pagehide", saveState);

  var resumeOnInteraction = function () {
    audio.play().then(startPlaying).catch(function () {});
    document.removeEventListener("pointerdown", resumeOnInteraction);
    document.removeEventListener("keydown", resumeOnInteraction);
  };

  var saved = restoreState();
  var startIndex = 0;
  if (saved && saved.id) {
    list.forEach(function (li, i) {
      if (li.getAttribute("data-id") === saved.id) {
        startIndex = i;
      }
    });
  }

  load(startIndex);

  if (saved) {
    audio.volume = typeof saved.volume === "number" ? saved.volume : 0.8;
    volumeBar.value = audio.volume;
    audio.muted = !!saved.muted;
    loopMode = saved.loopMode === "one" ? "one" : "list";
    updateLoopUI();
    updateVolumeIcon();
    if (saved.time > 0.5) {
      audio.addEventListener(
        "loadedmetadata",
        function () {
          audio.currentTime = saved.time;
          currentEl.textContent = fmt(saved.time);
        },
        { once: true }
      );
    }
    if (saved.playing) {
      audio
        .play()
        .then(startPlaying)
        .catch(function () {
          document.addEventListener("pointerdown", resumeOnInteraction);
          document.addEventListener("keydown", resumeOnInteraction);
        });
    }
  } else {
    audio
      .play()
      .then(startPlaying)
      .catch(function () {
        document.addEventListener("pointerdown", resumeOnInteraction);
        document.addEventListener("keydown", resumeOnInteraction);
      });
  }
})();
