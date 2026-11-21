(() => {
  "use strict";

  const nav = document.getElementById("mainNav");
  const navToggle = document.getElementById("navToggle");
  const bookingForm = document.getElementById("bookingForm");
  const formStatus = document.getElementById("formStatus");
  const track = document.getElementById("servicesTrack");
  const prevBtn = document.getElementById("svcPrev");
  const nextBtn = document.getElementById("svcNext");
  const reveals = document.querySelectorAll(".reveal");
  const counters = document.querySelectorAll("[data-count]");
  const navLinks = [...document.querySelectorAll(".nav-links a[href^='#']")];
  const sections = [...document.querySelectorAll("section[id]")];
  const scrollHero = document.querySelector(".scroll-hero");
  const heroVideo = document.getElementById("heroScrubVideo");
  const heroCanvas = document.getElementById("heroScrub");
  const heroPoster = document.getElementById("heroPoster");
  const heroCopy = document.getElementById("heroCopy");
  const scrollHint = document.getElementById("scrollHint");

  const toPersianDigits = (value) =>
    String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

  const FRAME_COUNT = 61;
  const FRAME_PATH = (i) =>
    `assets/images/clinic-tour-frames/frame-${String(i).padStart(3, "0")}.jpg`;

  /* GSAP ScrollTrigger hero: visible frame scrub + synced clinic-tour.mp4 */
  const initHeroScrub = () => {
    if (!scrollHero || !heroCanvas || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      return false;
    }

    gsap.registerPlugin(ScrollTrigger);

    if (heroVideo) {
      heroVideo.pause();
      heroVideo.muted = true;
      heroVideo.defaultMuted = true;
      heroVideo.playsInline = true;
      heroVideo.setAttribute("playsinline", "");
      heroVideo.removeAttribute("autoplay");
      heroVideo.removeAttribute("controls");
      heroVideo.preload = "auto";
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const overlayAt = 0.72;
    const ctx = heroCanvas.getContext("2d", { alpha: false });
    const frames = new Array(FRAME_COUNT);
    const proxy = { frame: 0 };
    let loaded = 0;
    let drawn = -1;
    let started = false;
    let seeking = false;
    let pendingTime = 0;
    let seekWatch = 0;
    let videoDuration = 0;

    const syncUi = (progress) => {
      if (heroCopy) heroCopy.classList.toggle("is-on", progress >= overlayAt);
      if (scrollHint) scrollHint.classList.toggle("is-gone", progress > 0.04);
    };

    const fitCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = heroCanvas.clientWidth || window.innerWidth;
      const h = heroCanvas.clientHeight || window.innerHeight;
      const nextW = Math.max(1, Math.round(w * dpr));
      const nextH = Math.max(1, Math.round(h * dpr));
      if (heroCanvas.width !== nextW || heroCanvas.height !== nextH) {
        heroCanvas.width = nextW;
        heroCanvas.height = nextH;
        drawn = -1;
      }
    };

    const drawFrame = (index) => {
      const img = frames[index];
      if (!img || !img.complete || !img.naturalWidth) return false;
      fitCanvas();
      const cw = heroCanvas.width;
      const ch = heroCanvas.height;
      const ir = img.naturalWidth / img.naturalHeight;
      const cr = cw / ch;
      let dw;
      let dh;
      let dx;
      let dy;
      if (ir > cr) {
        dh = ch;
        dw = ch * ir;
        dx = (cw - dw) / 2;
        dy = 0;
      } else {
        dw = cw;
        dh = cw / ir;
        dx = 0;
        dy = (ch - dh) / 2;
      }
      ctx.fillStyle = "#0b121a";
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, dw, dh);
      drawn = index;
      return true;
    };

    const clearSeekLock = () => {
      seeking = false;
      if (seekWatch) {
        clearTimeout(seekWatch);
        seekWatch = 0;
      }
    };

    const syncVideoTime = (progress) => {
      if (!heroVideo || !videoDuration) return;
      pendingTime = Math.min(Math.max(progress * videoDuration, 0), Math.max(videoDuration - 0.04, 0));
      if (Math.abs(heroVideo.currentTime - pendingTime) < 0.03) return;
      if (seeking) return;
      seeking = true;
      try {
        heroVideo.pause();
        heroVideo.currentTime = pendingTime;
      } catch (_) {
        clearSeekLock();
        return;
      }
      seekWatch = window.setTimeout(clearSeekLock, 100);
    };

    if (heroVideo) {
      heroVideo.addEventListener("seeked", clearSeekLock);
      const captureDuration = () => {
        if (Number.isFinite(heroVideo.duration) && heroVideo.duration > 0) {
          videoDuration = heroVideo.duration;
        }
      };
      heroVideo.addEventListener("loadedmetadata", captureDuration);
      heroVideo.addEventListener("durationchange", captureDuration);
      if (heroVideo.readyState >= 1) captureDuration();
    }

    const showFrame = (raw, progress) => {
      if (!loaded) return;
      const index = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(raw)));
      if (index !== drawn && drawFrame(index) && heroPoster) {
        heroPoster.classList.add("is-hidden");
      }
      syncVideoTime(typeof progress === "number" ? progress : index / Math.max(FRAME_COUNT - 1, 1));
    };

    const startScrub = () => {
      if (started || loaded < 1) return;
      started = true;
      heroCanvas.classList.add("is-ready");
      showFrame(0, 0);

      const existing = ScrollTrigger.getById("heroScrub");
      if (existing) existing.kill();

      if (reduceMotion) {
        showFrame(FRAME_COUNT - 1, 1);
        syncUi(1);
        return;
      }

      proxy.frame = 0;
      gsap.to(proxy, {
        frame: FRAME_COUNT - 1,
        ease: "none",
        scrollTrigger: {
          id: "heroScrub",
          trigger: scrollHero,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.65,
          invalidateOnRefresh: true,
          onUpdate: (self) => syncUi(self.progress),
        },
        onUpdate: () => {
          const progress = proxy.frame / Math.max(FRAME_COUNT - 1, 1);
          showFrame(proxy.frame, progress);
        },
      });

      ScrollTrigger.refresh();
    };

    for (let i = 1; i <= FRAME_COUNT; i += 1) {
      const img = new Image();
      img.decoding = "async";
      img.src = FRAME_PATH(i);
      frames[i - 1] = img;
      const mark = () => {
        loaded += 1;
        if (loaded === 1) {
          drawFrame(0);
          heroCanvas.classList.add("is-ready");
          if (heroPoster) heroPoster.classList.add("is-hidden");
          startScrub();
        } else if (loaded === FRAME_COUNT) {
          ScrollTrigger.refresh();
        }
      };
      if (img.complete) mark();
      else {
        img.addEventListener("load", mark, { once: true });
        img.addEventListener("error", mark, { once: true });
      }
    }

    window.addEventListener("load", () => ScrollTrigger.refresh());
    window.addEventListener("resize", () => {
      drawn = -1;
      showFrame(proxy.frame);
      ScrollTrigger.refresh();
    });
    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        drawn = -1;
        showFrame(proxy.frame);
        ScrollTrigger.refresh();
      }, 250);
    });

    return true;
  };

  const bootHero = () => {
    if (initHeroScrub()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (initHeroScrub() || tries > 60) clearInterval(timer);
    }, 50);
  };
  bootHero();

  /* Mobile nav */
  if (navToggle && nav) {
    navToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const open = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", (event) => {
      if (!nav.contains(event.target) && !navToggle.contains(event.target)) {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* Smooth in-page nav without page-wide CSS scroll-behavior */
  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      if (!id || !id.startsWith("#")) return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      nav?.classList.remove("open");
      navToggle?.setAttribute("aria-expanded", "false");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* Reveal on scroll */
  if ("IntersectionObserver" in window) {
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => revealObs.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
  }

  /* Counters */
  const animateCount = (el) => {
    const end = Number(el.dataset.count || 0);
    const duration = 1200;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = toPersianDigits(Math.round(end * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if ("IntersectionObserver" in window) {
    const countObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => countObs.observe(el));
  }

  /* Services carousel */
  if (track && prevBtn && nextBtn) {
    const step = () => Math.max(track.clientWidth * 0.78, 260);
    prevBtn.addEventListener("click", () => {
      track.scrollBy({ left: step(), behavior: "smooth" });
    });
    nextBtn.addEventListener("click", () => {
      track.scrollBy({ left: -step(), behavior: "smooth" });
    });
  }

  /* Booking form */
  if (bookingForm && formStatus) {
    bookingForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(bookingForm);
      const name = String(data.get("name") || "").trim();
      const phone = String(data.get("phone") || "").trim();
      if (!name || !phone) {
        formStatus.textContent = "لطفاً نام و شماره تماس را وارد کنید.";
        formStatus.dataset.state = "error";
        return;
      }
      formStatus.textContent = "درخواست شما ثبت شد. به‌زودی تماس می‌گیریم.";
      formStatus.dataset.state = "ok";
      bookingForm.reset();
    });
  }

  /* Active nav highlight */
  const highlightNav = () => {
    const y = window.scrollY + window.innerHeight * 0.28;
    let current = "top";
    sections.forEach((section) => {
      if (section.offsetTop <= y) current = section.id;
    });
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${current}`);
    });
  };
  window.addEventListener("scroll", highlightNav, { passive: true });
  highlightNav();
})();
