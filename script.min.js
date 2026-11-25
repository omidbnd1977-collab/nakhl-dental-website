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

  /* —— Hero: exact PixVerse frames on canvas, 1 scroll-step = 1 frame —— */
  const scrollRoot = document.getElementById("heroScroll");
  const canvas = document.getElementById("heroCanvas");
  const frameEl = document.getElementById("heroFrame");
  const progressBar = document.getElementById("heroProgressBar");
  const hint = document.getElementById("heroScrollHint");
  const copyPanel = document.querySelector(".hero-copy-panel");
  const pin = document.getElementById("heroPin");

  if (scrollRoot && (canvas || frameEl)) {
    const FRAME_COUNT = 121;
    const frameUrl = (i) =>
      `assets/hero-frames/f-${String(i + 1).padStart(3, "0")}.jpg`;

    const pxPerFrame = () =>
      (window.matchMedia("(max-width: 899px)").matches ? 16 : 20);

    const clamp01 = (n) => Math.min(1, Math.max(0, n));
    const images = new Array(FRAME_COUNT);
    let current = -1;
    let raf = 0;
    let ctx = null;

    const setScrollHeight = () => {
      const travel = (FRAME_COUNT - 1) * pxPerFrame();
      scrollRoot.style.height = `${Math.round(window.innerHeight + travel)}px`;
    };
    setScrollHeight();

    if (canvas) {
      ctx = canvas.getContext("2d", { alpha: false });
      const fit = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = pin?.clientWidth || window.innerWidth;
        const h = pin?.clientHeight || window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (current >= 0) paint(current);
      };
      fit();
      window.addEventListener("resize", fit, { passive: true });
    }

    const coverDraw = (img) => {
      if (!ctx || !img || !img.naturalWidth) return;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
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
      ctx.fillStyle = "#0f1c22";
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const paint = (index) => {
      const img = images[index];
      if (!img) return;
      if (canvas && ctx) {
        coverDraw(img);
        if (frameEl) frameEl.hidden = true;
      } else if (frameEl) {
        frameEl.src = img.src || frameUrl(index);
        frameEl.hidden = false;
      }
    };

    // Preload all frames (original export quality, upscaled for sharp cover)
    let loaded = 0;
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = frameUrl(i);
      images[i] = img;
      img.onload = () => {
        loaded += 1;
        if (i === 0) {
          current = 0;
          paint(0);
        }
      };
    }

    const progressFromScroll = () => {
      const travel = Math.max(1, scrollRoot.offsetHeight - window.innerHeight);
      return clamp01(-scrollRoot.getBoundingClientRect().top / travel);
    };

    const syncChrome = (p) => {
      if (progressBar) progressBar.style.width = `${(p * 100).toFixed(2)}%`;
      if (hint) hint.style.opacity = p > 0.03 ? "0" : "1";
      if (copyPanel) {
        const fade = clamp01((p - 0.85) / 0.15);
        copyPanel.style.opacity = String(1 - fade * 0.5);
        copyPanel.style.transform = `translate3d(0, ${(-10 * fade).toFixed(1)}px, 0)`;
      }
    };

    const tick = () => {
      raf = 0;
      const p = progressFromScroll();
      syncChrome(p);
      const index = reduceMotion
        ? FRAME_COUNT - 1
        : Math.round(p * (FRAME_COUNT - 1));
      if (index !== current) {
        current = index;
        paint(index);
      }
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

    kick();
  }

  /* —— 3D tilt —— */
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
      el.style.transform =
        `perspective(900px) rotateX(${((0.5 - y) * max * 2).toFixed(2)}deg) rotateY(${(((x - 0.5) * max * 2)).toFixed(2)}deg) translateZ(12px)`;
    });
  });
})();
