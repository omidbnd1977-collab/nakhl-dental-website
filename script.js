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

  /* Scroll-scrub cinematic hero */
  if (scrollHero && heroVideo) {
    heroVideo.pause();
    heroVideo.muted = true;
    heroVideo.playsInline = true;
    let duration = 0;
    let ticking = false;
    let seeking = false;
    let targetTime = 0;
    const overlayAt = 0.7;
    const frameStrip = document.getElementById("heroFrames");
    const frameImgs = frameStrip ? [...frameStrip.querySelectorAll("img")] : [];

    const setDuration = () => {
      if (Number.isFinite(heroVideo.duration) && heroVideo.duration > 0) {
        duration = heroVideo.duration;
      }
    };
    heroVideo.addEventListener("loadedmetadata", setDuration);
    heroVideo.addEventListener("seeked", () => {
      seeking = false;
      if (Math.abs(heroVideo.currentTime - targetTime) > 0.08) {
        seeking = true;
        heroVideo.currentTime = targetTime;
      }
    });
    setDuration();

    // Warm decoder so the first seek paints a frame
    const warm = heroVideo.play();
    if (warm && typeof warm.then === "function") {
      warm.then(() => heroVideo.pause()).catch(() => {});
    }

    const paintFrames = (progress) => {
      if (!frameImgs.length) return;
      const max = frameImgs.length - 1;
      const pos = progress * max;
      frameImgs.forEach((img, index) => {
        const dist = Math.abs(pos - index);
        const opacity = Math.max(0, 1 - dist);
        img.style.opacity = String(opacity);
      });
    };

    const scrub = () => {
      ticking = false;
      const rect = scrollHero.getBoundingClientRect();
      const total = scrollHero.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      const progress = scrolled / Math.max(total, 1);

      paintFrames(progress);

      if (duration > 0) {
        targetTime = progress * Math.max(duration - 0.04, 0);
        if (!seeking && Math.abs(heroVideo.currentTime - targetTime) > 0.04) {
          seeking = true;
          try {
            heroVideo.currentTime = targetTime;
          } catch (_) {
            seeking = false;
          }
        }
      }

      if (heroCopy) heroCopy.classList.toggle("is-on", progress >= overlayAt);
      if (scrollHint) scrollHint.classList.toggle("is-gone", progress > 0.06);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(scrub);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    heroVideo.addEventListener("loadedmetadata", scrub);
    scrub();
  }

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
