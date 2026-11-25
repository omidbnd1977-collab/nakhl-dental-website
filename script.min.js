(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* —— Mobile nav —— */
  const nav = document.getElementById("mainNav");
  const toggle = document.getElementById("navToggle");
  const wrap = document.querySelector(".nav-wrap");

  if (nav && toggle) {
    const setOpen = (open) => {
      nav.classList.toggle("open", open);
      wrap?.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "بستن منو" : "باز کردن منو");
    };
    const close = () => setOpen(false);

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setOpen(!nav.classList.contains("open"));
    });

    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("open")) return;
      const target = event.target;
      if (nav.contains(target) || toggle.contains(target)) return;
      close();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  /* —— Services carousel —— */
  const track = document.getElementById("servicesTrack");
  const prev = document.getElementById("svcPrev");
  const next = document.getElementById("svcNext");
  if (track && prev && next) {
    const step = () => {
      const card = track.querySelector(".svc-card");
      if (!card) return track.clientWidth;
      const gap = parseFloat(getComputedStyle(track).gap || "0") || 0;
      return card.getBoundingClientRect().width + gap;
    };
    const rtl = getComputedStyle(track).direction === "rtl";
    const delta = (dir) => {
      const d = step();
      return rtl ? (dir === "next" ? -d : d) : (dir === "next" ? d : -d);
    };
    prev.addEventListener("click", () => track.scrollBy({ left: delta("prev"), behavior: "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: delta("next"), behavior: "smooth" }));
  }

  /* —— Scroll-scrubbed hero video (no GSAP) —— */
  const scrollRoot = document.getElementById("heroScroll");
  const video = document.getElementById("heroVideo");
  const progressBar = document.getElementById("heroProgressBar");
  const hint = document.getElementById("heroScrollHint");
  const copyPanel = document.querySelector(".hero-copy-panel");

  if (scrollRoot && video) {
    const vhMul = Number(scrollRoot.dataset.scrollHeight || 320) / 100;
    const setScrollHeight = () => {
      scrollRoot.style.height = `${Math.max(vhMul, 2.2) * 100}vh`;
    };
    setScrollHeight();

    let duration = 0;
    let ready = false;
    let ticking = false;
    let lastTime = -1;

    const clamp01 = (n) => Math.min(1, Math.max(0, n));

    const progressFromScroll = () => {
      const total = scrollRoot.offsetHeight - window.innerHeight;
      if (total <= 0) return 0;
      const scrolled = Math.min(Math.max(-scrollRoot.getBoundingClientRect().top, 0), total);
      return clamp01(scrolled / total);
    };

    const applyFrame = () => {
      ticking = false;
      if (!ready || !duration) return;
      const p = progressFromScroll();
      if (progressBar) progressBar.style.width = `${(p * 100).toFixed(2)}%`;
      if (hint) hint.style.opacity = p > 0.08 ? "0" : "0.9";
      if (copyPanel) {
        const fade = clamp01((p - 0.72) / 0.28);
        copyPanel.style.opacity = String(1 - fade * 0.35);
        copyPanel.style.transform = `translateY(${(-12 * fade).toFixed(1)}px)`;
      }

      if (reduceMotion) {
        video.currentTime = Math.min(duration * 0.85, duration - 0.05);
        return;
      }

      const t = Math.min(duration - 0.04, p * duration);
      if (Math.abs(t - lastTime) < 0.012) return;
      lastTime = t;
      try {
        video.currentTime = t;
      } catch (_) {
        /* ignore seek while not ready */
      }
    };

    const requestTick = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(applyFrame);
    };

    const onMeta = () => {
      duration = video.duration || 0;
      if (!duration || !Number.isFinite(duration)) return;
      ready = true;
      video.pause();
      video.currentTime = 0;
      requestTick();
    };

    video.addEventListener("loadedmetadata", onMeta);
    if (video.readyState >= 1) onMeta();

    // Warm decode for smoother scrubbing
    video.addEventListener(
      "canplay",
      () => {
        video.pause();
      },
      { once: true }
    );

    window.addEventListener("scroll", requestTick, { passive: true });
    window.addEventListener("resize", () => {
      setScrollHeight();
      requestTick();
    }, { passive: true });
  }

  /* —— 3D tilt on hover (non-hero panels) —— */
  if (reduceMotion || !finePointer) return;

  const tilts = document.querySelectorAll(".tilt-3d");
  tilts.forEach((el) => {
    if (el.closest(".hero-pin")) return;
    const strength = Number(el.dataset.tiltStrength || 8);
    const max = Math.min(Math.max(strength, 4), 18);

    const reset = () => {
      el.classList.remove("is-tilting");
      el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)";
    };

    el.addEventListener("pointerenter", () => el.classList.add("is-tilting"));
    el.addEventListener("pointerleave", reset);
    el.addEventListener("pointermove", (event) => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const rotateY = (x - 0.5) * max * 2;
      const rotateX = (0.5 - y) * max * 2;
      el.style.transform =
        `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(12px)`;
    });
  });
})();
