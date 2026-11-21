(() => {
  "use strict";

  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("mobileMenu");
  const video = document.getElementById("heroVideo");
  const bars = [...document.querySelectorAll(".bar")];
  const houses = document.getElementById("houses");
  const langButtons = [...document.querySelectorAll(".lang button")];

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  langButtons.forEach((button) => {
    button.addEventListener("click", () => {
      langButtons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      document.documentElement.lang = button.dataset.lang === "ba" ? "bs" : "en";
    });
  });

  const play = () => {
    if (!video) return;
    const pending = video.play();
    if (pending && typeof pending.catch === "function") pending.catch(() => {});
  };

  if (video) {
    video.muted = true;
    play();
    ["pause", "ended", "stalled", "waiting"].forEach((eventName) => {
      video.addEventListener(eventName, () => {
        if (eventName === "ended") video.currentTime = 0;
        play();
      });
    });
    setInterval(() => {
      if (video.paused || video.ended) play();
    }, 1000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) play();
    });
    const resume = () => play();
    window.addEventListener("pointerdown", resume, { once: true });

    const syncBars = () => {
      if (!video.duration) return;
      const index = Math.min(3, Math.floor((video.currentTime / video.duration) * 4));
      bars.forEach((bar, i) => bar.classList.toggle("is-active", i === index));
    };
    video.addEventListener("timeupdate", syncBars);
    video.addEventListener("loadedmetadata", syncBars);

    bars.forEach((bar) => {
      bar.addEventListener("click", () => {
        if (!video.duration) return;
        const part = Number(bar.dataset.part || 0);
        video.currentTime = (part / 4) * video.duration;
        play();
      });
    });
  }

  if (houses && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          houses.classList.add("is-in");
          observer.disconnect();
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(houses);
  } else if (houses) {
    houses.classList.add("is-in");
  }
})();
