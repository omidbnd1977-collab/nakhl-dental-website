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
  const heroVideo = document.getElementById("heroScrub");
  const heroCopy = document.getElementById("heroCopy");
  const scrollHint = document.getElementById("scrollHint");

  const toPersianDigits = (value) =>
    String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

  /* GSAP ScrollTrigger cinematic video scrub */
  const initHeroScrub = () => {
    if (!scrollHero || !heroVideo || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      return false;
    }

    gsap.registerPlugin(ScrollTrigger);

    heroVideo.pause();
    heroVideo.muted = true;
    heroVideo.defaultMuted = true;
    heroVideo.playsInline = true;
    heroVideo.setAttribute("playsinline", "");
    heroVideo.setAttribute("webkit-playsinline", "");
    heroVideo.removeAttribute("controls");
    heroVideo.removeAttribute("autoplay");
    heroVideo.preload = "auto";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const overlayAt = 0.72;
    const proxy = { time: 0 };
    let duration = 0;
    let seeking = false;
    let pendingTime = 0;
    let rafId = 0;
    let seekWatch = 0;
    let started = false;

    const clearSeekLock = () => {
      seeking = false;
      if (seekWatch) {
        clearTimeout(seekWatch);
        seekWatch = 0;
      }
    };

    const clampTime = (time) => {
      if (!duration) return 0;
      return Math.min(Math.max(time, 0), Math.max(duration - 0.04, 0));
    };

    const applyTime = (time) => {
      if (!duration) return;
      pendingTime = clampTime(time);
      if (Math.abs(heroVideo.currentTime - pendingTime) < 0.02) return;
      if (seeking) return;

      seeking = true;
      try {
        heroVideo.pause();
        heroVideo.currentTime = pendingTime;
      } catch (_) {
        clearSeekLock();
        return;
      }

      seekWatch = window.setTimeout(() => {
        seeking = false;
        seekWatch = 0;
        if (Math.abs(heroVideo.currentTime - pendingTime) > 0.05) applyTime(pendingTime);
      }, 90);
    };

    heroVideo.addEventListener("seeked", () => {
      clearSeekLock();
      if (Math.abs(heroVideo.currentTime - pendingTime) > 0.04) applyTime(pendingTime);
    });

    const syncUi = (progress) => {
      if (heroCopy) heroCopy.classList.toggle("is-on", progress >= overlayAt);
      if (scrollHint) scrollHint.classList.toggle("is-gone", progress > 0.04);
    };

    const queueFrame = (time) => {
      proxy.time = clampTime(time);
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        applyTime(proxy.time);
      });
    };

    const startScrub = () => {
      if (!Number.isFinite(heroVideo.duration) || heroVideo.duration <= 0) return;
      duration = heroVideo.duration;
      if (started) {
        ScrollTrigger.refresh();
        return;
      }
      started = true;

      const existing = ScrollTrigger.getById("heroScrub");
      if (existing) existing.kill();

      if (reduceMotion) {
        applyTime(duration);
        syncUi(1);
        return;
      }

      // Pin via sticky CSS; ScrollTrigger only maps scroll → video time.
      ScrollTrigger.create({
        id: "heroScrub",
        trigger: scrollHero,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.85,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          syncUi(self.progress);
          queueFrame(self.progress * duration);
        },
        onRefresh: (self) => {
          syncUi(self.progress);
          queueFrame(self.progress * duration);
        },
      });

      ScrollTrigger.refresh();
      queueFrame(0);
    };

    const warmDecoder = () => {
      // Tiny nudge helps some mobile browsers unlock frame paints without autoplay.
      const t = heroVideo.currentTime || 0;
      try {
        heroVideo.currentTime = Math.min(t + 0.001, heroVideo.duration || t);
      } catch (_) {
        /* ignore */
      }
    };

    heroVideo.addEventListener("loadedmetadata", startScrub);
    heroVideo.addEventListener("durationchange", startScrub);
    heroVideo.addEventListener("loadeddata", () => {
      startScrub();
      warmDecoder();
    });
    heroVideo.addEventListener("canplay", warmDecoder, { once: true });

    if (heroVideo.readyState >= 1) startScrub();

    // Re-measure after fonts/images settle.
    window.addEventListener("load", () => ScrollTrigger.refresh());
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

  /* Smooth in-page nav without forcing CSS scroll-behavior on the whole page */
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
