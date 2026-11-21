(() => {
  "use strict";

  const nav = document.getElementById("mainNav");
  const navToggle = document.getElementById("navToggle");
  const bookingForm = document.getElementById("bookingForm");
  const formStatus = document.getElementById("formStatus");
  const reveals = document.querySelectorAll(".reveal");
  const navLinks = [...document.querySelectorAll(".nav-links a[href^='#']")];
  const sections = [...document.querySelectorAll("section[id], header[id]")];
  const scrollHero = document.querySelector(".scroll-hero");
  const heroPin = document.querySelector(".scroll-hero-pin");
  const heroVideo = document.getElementById("heroScrubVideo");
  const heroPoster = document.getElementById("heroPoster");
  const heroCopy = document.getElementById("heroCopy");
  const scrollHint = document.getElementById("scrollHint");

  const isMobile = () => window.matchMedia("(max-width: 767px)").matches;
  const WA_NUMBER = "989120153255";

  /* Ensure video source + smart preload (avoid heavy mobile download until needed) */
  const prepareHeroVideo = () => {
    if (!heroVideo) return;
    const source = heroVideo.querySelector("source");
    const src = source?.getAttribute("src") || "assets/videos/clinic-tour.mp4";
    if (!heroVideo.getAttribute("src") && !source) {
      heroVideo.src = src;
    }
    heroVideo.preload = isMobile() ? "metadata" : "auto";
  };

  const ensureVideoFullyLoaded = () => {
    if (!heroVideo) return;
    if (heroVideo.preload !== "auto") {
      heroVideo.preload = "auto";
      try {
        heroVideo.load();
      } catch (_) {
        /* ignore */
      }
    }
  };

  /* GSAP ScrollTrigger pin + video.currentTime scrub */
  const initHeroScrub = () => {
    if (!scrollHero || !heroPin || !heroVideo) return false;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return false;

    gsap.registerPlugin(ScrollTrigger);
    prepareHeroVideo();

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
      if (progress > 0.02) ensureVideoFullyLoaded();
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
        ensureVideoFullyLoaded();
        queueSeek(duration);
        syncUi(1);
        return;
      }

      ScrollTrigger.create({
        id: "heroScrub",
        trigger: heroPin,
        start: "top top",
        end: "+=350%",
        pin: true,
        scrub: 0.45,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => applyProgress(self.progress),
        onRefresh: (self) => applyProgress(self.progress),
      });

      ScrollTrigger.refresh();
      applyProgress(0);
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

    if (heroVideo.readyState >= 1) onMeta();

    // Desktop: start buffering early for smooth scrub
    if (!isMobile()) ensureVideoFullyLoaded();

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
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
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
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
    );
    reveals.forEach((el) => revealObs.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
  }

  /* Booking form → WhatsApp */
  if (bookingForm && formStatus) {
    bookingForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(bookingForm);
      const name = String(data.get("name") || "").trim();
      const phone = String(data.get("phone") || "").trim();
      const service = String(data.get("service") || "").trim();

      if (!name || !phone) {
        formStatus.textContent = "لطفاً نام و شماره تماس را وارد کنید.";
        formStatus.dataset.state = "error";
        formStatus.focus();
        return;
      }

      const lines = [
        "درخواست نوبت — کلینیک نخل",
        `نام: ${name}`,
        `تماس: ${phone}`,
      ];
      if (service) lines.push(`خدمت: ${service}`);
      const text = encodeURIComponent(lines.join("\n"));
      const url = `https://wa.me/${WA_NUMBER}?text=${text}`;

      formStatus.textContent = "در حال انتقال به واتساپ برای هماهنگی…";
      formStatus.dataset.state = "ok";
      window.open(url, "_blank", "noopener,noreferrer");
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
