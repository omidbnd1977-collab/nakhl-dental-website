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
  const heroPin = document.querySelector(".scroll-hero-pin");
  const heroVideo = document.getElementById("heroScrubVideo");
  const heroPoster = document.getElementById("heroPoster");
  const heroCopy = document.getElementById("heroCopy");
  const scrollHint = document.getElementById("scrollHint");

  const toPersianDigits = (value) =>
    String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

  /* GSAP ScrollTrigger pin + video.currentTime scrub */
  const initHeroScrub = () => {
    if (!scrollHero || !heroPin || !heroVideo) return false;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return false;

    gsap.registerPlugin(ScrollTrigger);

    // Kill any previous hero triggers to avoid duplicates
    ScrollTrigger.getAll().forEach((st) => {
      if (st.vars && st.vars.id === "heroScrub") st.kill();
    });
    const byId = ScrollTrigger.getById("heroScrub");
    if (byId) byId.kill();

    heroVideo.pause();
    heroVideo.muted = true;
    heroVideo.defaultMuted = true;
    heroVideo.playsInline = true;
    heroVideo.setAttribute("playsinline", "");
    heroVideo.removeAttribute("autoplay");
    heroVideo.removeAttribute("controls");
    // Full buffer helps scrub seeking; file is optimized (~2MB).
    heroVideo.preload = "auto";
    try {
      heroVideo.load();
    } catch (_) {
      /* ignore */
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const overlayAt = 0.72;
    let duration = 0;
    let ready = false;
    let started = false;
    let pendingTime = 0;
    let rafId = 0;
    let lastApplied = -1;

    const syncUi = (progress) => {
      if (heroCopy) heroCopy.classList.toggle("is-on", progress >= overlayAt);
      if (scrollHint) scrollHint.classList.toggle("is-gone", progress > 0.04);
    };

    const isSeekable = () => {
      if (!Number.isFinite(duration) || duration <= 0) return false;
      if (heroVideo.readyState < 1) return false;
      try {
        return heroVideo.seekable && heroVideo.seekable.length > 0;
      } catch (_) {
        return heroVideo.readyState >= 2;
      }
    };

    const clampTime = (t) => Math.min(Math.max(t, 0), Math.max(duration - 0.05, 0));

    const flushSeek = () => {
      rafId = 0;
      if (!ready || !isSeekable()) return;
      const target = clampTime(pendingTime);
      if (Math.abs(heroVideo.currentTime - target) < 0.02 && Math.abs(lastApplied - target) < 0.02) {
        return;
      }
      try {
        heroVideo.pause();
        heroVideo.currentTime = target;
        lastApplied = target;
        if (heroPoster) heroPoster.classList.add("is-hidden");
      } catch (_) {
        /* seek may fail until more data buffers */
      }
    };

    const queueSeek = (time) => {
      pendingTime = time;
      if (rafId) return;
      rafId = requestAnimationFrame(flushSeek);
    };

    const applyProgress = (progress) => {
      const p = Math.min(Math.max(progress, 0), 1);
      syncUi(p);
      if (!ready || !duration) return;
      queueSeek(p * duration);
    };

    const startScrub = () => {
      duration = heroVideo.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      if (!isSeekable() && heroVideo.readyState < 2) return;

      ready = true;
      if (started) {
        ScrollTrigger.refresh();
        return;
      }
      started = true;

      const existing = ScrollTrigger.getById("heroScrub");
      if (existing) existing.kill();

      if (reduceMotion) {
        queueSeek(duration);
        syncUi(1);
        return;
      }

      // Pin the fullscreen hero and scrub video across ~350vh of scroll.
      ScrollTrigger.create({
        id: "heroScrub",
        trigger: heroPin,
        start: "top top",
        end: "+=350%",
        pin: true,
        scrub: 0.4,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => applyProgress(self.progress),
        onRefresh: (self) => applyProgress(self.progress),
      });

      ScrollTrigger.refresh();
      applyProgress(0);
      // Nudge first frame paint
      queueSeek(0.001);
    };

    const onMeta = () => {
      if (Number.isFinite(heroVideo.duration) && heroVideo.duration > 0) {
        duration = heroVideo.duration;
      }
      if (isSeekable() || heroVideo.readyState >= 2) startScrub();
    };

    heroVideo.addEventListener("loadedmetadata", onMeta);
    heroVideo.addEventListener("durationchange", onMeta);
    heroVideo.addEventListener("loadeddata", onMeta);
    heroVideo.addEventListener("canplay", onMeta);
    heroVideo.addEventListener("seeked", () => {
      if (heroPoster) heroPoster.classList.add("is-hidden");
    });

    // If metadata already available
    if (heroVideo.readyState >= 1) onMeta();

    window.addEventListener("load", () => ScrollTrigger.refresh());
    window.addEventListener("resize", () => ScrollTrigger.refresh());
    window.addEventListener("orientationchange", () => {
      setTimeout(() => ScrollTrigger.refresh(), 250);
    });

    return true;
  };

  const bootHero = () => {
    if (initHeroScrub()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (initHeroScrub() || tries > 80) clearInterval(timer);
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

  /* In-page nav */
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
    const durationMs = 1200;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / durationMs, 1);
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
