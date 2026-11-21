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
    heroVideo.playsInline = true;
    heroVideo.removeAttribute("autoplay");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const overlayAt = 0.72;
    const proxy = { time: 0 };
    let duration = 0;
    let seeking = false;
    let pendingTime = 0;
    let rafId = 0;

    const applyTime = (time) => {
      pendingTime = Math.min(Math.max(time, 0), Math.max(duration - 0.001, 0));
      if (seeking || !duration) return;
      if (Math.abs(heroVideo.currentTime - pendingTime) < 0.012) return;
      seeking = true;
      try {
        if (typeof heroVideo.fastSeek === "function") heroVideo.fastSeek(pendingTime);
        else heroVideo.currentTime = pendingTime;
      } catch (_) {
        seeking = false;
      }
    };

    heroVideo.addEventListener("seeked", () => {
      seeking = false;
      if (Math.abs(heroVideo.currentTime - pendingTime) > 0.02) applyTime(pendingTime);
    });

    const syncUi = (progress) => {
      if (heroCopy) heroCopy.classList.toggle("is-on", progress >= overlayAt);
      if (scrollHint) scrollHint.classList.toggle("is-gone", progress > 0.05);
    };

    const startScrub = () => {
      duration = heroVideo.duration || 0;
      if (!duration) return;

      const existing = ScrollTrigger.getById("heroScrub");
      if (existing) existing.kill();

      if (reduceMotion) {
        heroVideo.currentTime = Math.max(duration - 0.05, 0);
        syncUi(1);
        return;
      }

      proxy.time = heroVideo.currentTime || 0;
      gsap.to(proxy, {
        time: duration - 0.001,
        ease: "none",
        scrollTrigger: {
          id: "heroScrub",
          trigger: scrollHero,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.2,
          invalidateOnRefresh: true,
          onUpdate: (self) => syncUi(self.progress),
        },
        onUpdate: () => {
          if (rafId) return;
          rafId = requestAnimationFrame(() => {
            rafId = 0;
            applyTime(proxy.time);
          });
        },
      });

      ScrollTrigger.refresh();
    };

    const ready = () => {
      if (heroVideo.readyState >= 1) startScrub();
    };

    heroVideo.addEventListener("loadedmetadata", ready, { once: true });
    heroVideo.addEventListener("loadeddata", ready, { once: true });
    if (heroVideo.readyState >= 1) ready();

    // Keep decoder warm without autoplaying content
    heroVideo.addEventListener(
      "canplay",
      () => {
        const t = heroVideo.currentTime;
        heroVideo.currentTime = Math.min(t + 0.001, heroVideo.duration || t);
      },
      { once: true }
    );

    return true;
  };

  const bootHero = () => {
    if (initHeroScrub()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (initHeroScrub() || tries > 40) clearInterval(timer);
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

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("open")) return;
      if (nav.contains(event.target) || navToggle.contains(event.target)) return;
      nav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  }

  /* Active nav link */
  const highlightNav = () => {
    const offset = window.scrollY + 140;
    let currentId = "top";
    for (const section of sections) {
      if (section.offsetTop <= offset) currentId = section.id;
    }
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${currentId}`);
    });
  };

  /* Services carousel */
  if (prevBtn) prevBtn.addEventListener("click", () => {
    if (!track) return;
    const card = track.querySelector(".svc-card");
    const step = card ? card.getBoundingClientRect().width + 16 : 280;
    track.scrollBy({ left: step, behavior: "smooth" });
  });
  if (nextBtn) nextBtn.addEventListener("click", () => {
    if (!track) return;
    const card = track.querySelector(".svc-card");
    const step = card ? card.getBoundingClientRect().width + 16 : 280;
    track.scrollBy({ left: -step, behavior: "smooth" });
  });

  /* Reveal */
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -30px 0px" }
    );
    reveals.forEach((el) => revealObserver.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
  }

  /* Counters */
  const animateCounter = (el) => {
    const target = Number(el.getAttribute("data-count") || 0);
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = toPersianDigits(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if ("IntersectionObserver" in window && counters.length) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.45 }
    );
    counters.forEach((el) => counterObserver.observe(el));
  } else {
    counters.forEach((el) => {
      el.textContent = toPersianDigits(el.getAttribute("data-count") || "0");
    });
  }

  /* Booking form */
  if (bookingForm && formStatus) {
    bookingForm.addEventListener("submit", (event) => {
      event.preventDefault();
      formStatus.classList.remove("error");

      const data = new FormData(bookingForm);
      const name = String(data.get("name") || "").trim();
      const phone = String(data.get("phone") || "").trim();
      const service = String(data.get("service") || "").trim();
      const message = String(data.get("message") || "").trim();

      if (!name || !phone || !service) {
        formStatus.textContent = "لطفاً نام، شماره تماس و نوع خدمت را وارد کنید.";
        formStatus.classList.add("error");
        formStatus.focus({ preventScroll: true });
        formStatus.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const text = [
        "سلام، درخواست نوبت از وب‌سایت کلینیک نخل:",
        `نام: ${name}`,
        `شماره: ${phone}`,
        `خدمت: ${service}`,
        message ? `توضیح: ${message}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      formStatus.textContent = "در حال انتقال به واتساپ برای هماهنگی نوبت…";
      window.open(`https://wa.me/989120153255?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      bookingForm.reset();
    });
  }

  window.addEventListener("scroll", highlightNav, { passive: true });
  highlightNav();
})();
