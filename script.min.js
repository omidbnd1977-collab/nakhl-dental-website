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

  /* —— Exact-quality frame scrub (from original PixVerse file) —— */
  const scrollRoot = document.getElementById("heroScroll");
  const frameEl = document.getElementById("heroFrame");
  const progressBar = document.getElementById("heroProgressBar");
  const hint = document.getElementById("heroScrollHint");
  const copyPanel = document.querySelector(".hero-copy-panel");

  if (scrollRoot && frameEl) {
    const FRAME_COUNT = 121;
    const PAD = 3;
    // Pixels of scroll per frame — locks motion 1:1 with finger/wheel
    const pxPerFrame = () =>
      (window.matchMedia("(max-width: 899px)").matches ? 11 : 14);

    const clamp01 = (n) => Math.min(1, Math.max(0, n));
    const frameSrc = (i) =>
      `assets/hero-frames/f-${String(i + 1).padStart(PAD, "0")}.jpg`;

    const cache = new Array(FRAME_COUNT);
    let loaded = 0;
    let current = 0;
    let raf = 0;

    const setScrollHeight = () => {
      const travel = (FRAME_COUNT - 1) * pxPerFrame();
      scrollRoot.style.height = `${window.innerHeight + travel}px`;
    };
    setScrollHeight();

    // Preload every original frame into memory
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = frameSrc(i);
      img.onload = img.onerror = () => {
        loaded += 1;
      };
      cache[i] = img;
    }

    const progressFromScroll = () => {
      const travel = Math.max(1, scrollRoot.offsetHeight - window.innerHeight);
      return clamp01(-scrollRoot.getBoundingClientRect().top / travel);
    };

    const showFrame = (index) => {
      const i = Math.min(FRAME_COUNT - 1, Math.max(0, index | 0));
      if (i === current && frameEl.getAttribute("data-i") === String(i)) return;
      current = i;
      frameEl.setAttribute("data-i", String(i));
      const cached = cache[i];
      if (cached && cached.complete && cached.naturalWidth) {
        frameEl.src = cached.src;
      } else {
        frameEl.src = frameSrc(i);
      }
    };

    const syncChrome = (p) => {
      if (progressBar) progressBar.style.width = `${(p * 100).toFixed(2)}%`;
      if (hint) hint.style.opacity = p > 0.04 ? "0" : "1";
      if (copyPanel) {
        const fade = clamp01((p - 0.82) / 0.18);
        copyPanel.style.opacity = String(1 - fade * 0.45);
        copyPanel.style.transform = `translate3d(0, ${(-14 * fade).toFixed(1)}px, 0)`;
      }
    };

    const tick = () => {
      raf = 0;
      const p = progressFromScroll();
      syncChrome(p);
      if (reduceMotion) {
        showFrame(FRAME_COUNT - 1);
        return;
      }
      const index = Math.round(p * (FRAME_COUNT - 1));
      showFrame(index);
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("touchmove", kick, { passive: true });
    window.addEventListener(
      "resize",
      () => {
        setScrollHeight();
        kick();
      },
      { passive: true }
    );

    showFrame(0);
    kick();
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
