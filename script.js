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

  /* —— Frame-accurate scroll-scrub hero video —— */
  const scrollRoot = document.getElementById("heroScroll");
  const video = document.getElementById("heroVideo");
  const progressBar = document.getElementById("heroProgressBar");
  const hint = document.getElementById("heroScrollHint");
  const copyPanel = document.querySelector(".hero-copy-panel");

  if (scrollRoot && video) {
    const clamp01 = (n) => Math.min(1, Math.max(0, n));

    let duration = 0;
    let ready = false;
    let seeking = false;
    let targetTime = 0;
    let displayedTime = 0;
    let raf = 0;

    const scrollMul = () =>
      (window.matchMedia("(max-width: 899px)").matches ? 2.05 : 2.35);

    const setScrollHeight = () => {
      // Tighter mapping: ~2–2.35 viewports so video feels locked to scroll
      scrollRoot.style.height = `${scrollMul() * 100}vh`;
    };
    setScrollHeight();

    const progressFromScroll = () => {
      const total = Math.max(1, scrollRoot.offsetHeight - window.innerHeight);
      const top = scrollRoot.getBoundingClientRect().top;
      return clamp01(-top / total);
    };

    const syncChrome = (p) => {
      if (progressBar) progressBar.style.width = `${(p * 100).toFixed(2)}%`;
      if (hint) hint.style.opacity = p > 0.06 ? "0" : "1";
      if (copyPanel) {
        const fade = clamp01((p - 0.78) / 0.22);
        copyPanel.style.opacity = String(1 - fade * 0.4);
        copyPanel.style.transform = `translate3d(0, ${(-16 * fade).toFixed(1)}px, 0)`;
      }
    };

    const seekTo = (t) => {
      const next = Math.min(Math.max(t, 0), Math.max(duration - 0.001, 0));
      if (Math.abs(next - displayedTime) < 0.0005) return;
      if (seeking) {
        targetTime = next;
        return;
      }
      seeking = true;
      displayedTime = next;
      try {
        video.currentTime = next;
      } catch (_) {
        seeking = false;
      }
    };

    video.addEventListener("seeked", () => {
      seeking = false;
      // If scroll moved during seek, catch up immediately
      if (Math.abs(targetTime - displayedTime) > 0.001) {
        seekTo(targetTime);
      }
    });

    const tick = () => {
      raf = 0;
      if (!ready || !duration) return;
      const p = progressFromScroll();
      syncChrome(p);

      if (reduceMotion) {
        seekTo(Math.min(duration * 0.92, duration - 0.05));
        return;
      }

      targetTime = p * duration;
      // Snap to nearest frame (~24fps) for cleaner scrub
      const frame = 1 / 24;
      const snapped = Math.round(targetTime / frame) * frame;
      seekTo(snapped);

      // Keep looping while hero is in view and not settled
      const inHero = p > 0 && p < 1;
      if (inHero || seeking || Math.abs(targetTime - displayedTime) > 0.001) {
        raf = requestAnimationFrame(tick);
      }
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const markReady = () => {
      duration = video.duration || 0;
      if (!duration || !Number.isFinite(duration)) return;
      ready = true;
      video.pause();
      try {
        video.currentTime = 0;
      } catch (_) {}
      kick();
    };

    video.addEventListener("loadedmetadata", markReady);
    if (video.readyState >= 1) markReady();

    // Prefetch whole clip into buffer for scrubbing
    const warmBuffer = () => {
      if (!duration) return;
      const end = () =>
        video.buffered.length && video.buffered.end(video.buffered.length - 1);
      if (end() >= duration - 0.15) return;
      // Nudge browser to keep downloading
      video.preload = "auto";
    };
    video.addEventListener("progress", warmBuffer);
    video.addEventListener("canplaythrough", () => {
      video.pause();
      kick();
    });

    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener(
      "resize",
      () => {
        setScrollHeight();
        kick();
      },
      { passive: true }
    );

    // Touch scroll also fires scroll; extra pointermove helps some mobile browsers
    window.addEventListener("touchmove", kick, { passive: true });
  }

  /* —— 3D tilt on hover (non-hero panels) —— */
  if (reduceMotion || !finePointer) return;

  document.querySelectorAll(".tilt-3d").forEach((el) => {
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
