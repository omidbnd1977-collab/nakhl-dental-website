(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* —— Landing mobile nav —— */
  const landingNav = document.getElementById("landingNav");
  const landingToggle = document.getElementById("landingToggle");
  if (landingNav && landingToggle) {
    const setOpen = (open) => {
      landingNav.classList.toggle("is-open", open);
      landingToggle.classList.toggle("is-open", open);
      landingToggle.setAttribute("aria-expanded", open ? "true" : "false");
      landingToggle.setAttribute("aria-label", open ? "بستن منو" : "باز کردن منو");
    };
    const close = () => setOpen(false);
    landingToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setOpen(!landingNav.classList.contains("is-open"));
    });
    landingNav.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
    document.addEventListener("click", (event) => {
      if (!landingNav.classList.contains("is-open")) return;
      const target = event.target;
      if (landingNav.contains(target) || landingToggle.contains(target)) return;
      close();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  /* —— Hero: scroll-scrubbed frames (progressive load, capped concurrency) —— */
  const scrollRoot = document.getElementById("heroScroll");
  const canvas = document.getElementById("heroCanvas");
  const frameEl = document.getElementById("heroFrame");
  const progressBar = document.getElementById("heroProgressBar");
  const copyPanel = document.querySelector(".hero-copy-panel");
  const pin = document.getElementById("heroPin");

  if (scrollRoot && (canvas || frameEl)) {
    const FRAME_COUNT = 121;
    const LOOKAHEAD = 10;
    const MAX_INFLIGHT = 4;
    const frameUrl = (i) =>
      `assets/hero-frames/f-${String(i + 1).padStart(3, "0")}.jpg`;

    const pxPerFrame = () =>
      (window.matchMedia("(max-width: 899px)").matches ? 16 : 20);

    const clamp01 = (n) => Math.min(1, Math.max(0, n));
    const images = new Array(FRAME_COUNT);
    const loading = new Set();
    const queue = [];
    let inflight = 0;
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
      ctx.fillStyle = "#0a192f";
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const nearestReady = (index) => {
      if (images[index]?.complete && images[index].naturalWidth) return index;
      for (let d = 1; d < FRAME_COUNT; d++) {
        const a = index - d;
        const b = index + d;
        if (a >= 0 && images[a]?.complete && images[a].naturalWidth) return a;
        if (b < FRAME_COUNT && images[b]?.complete && images[b].naturalWidth) return b;
      }
      return -1;
    };

    const paint = (index) => {
      const ready = nearestReady(index);
      if (ready < 0) return;
      const img = images[ready];
      if (canvas && ctx) {
        coverDraw(img);
        if (frameEl) frameEl.hidden = true;
      } else if (frameEl) {
        frameEl.src = img.src || frameUrl(ready);
        frameEl.hidden = false;
      }
    };

    const pump = () => {
      while (inflight < MAX_INFLIGHT && queue.length) {
        const i = queue.shift();
        if (i < 0 || i >= FRAME_COUNT) continue;
        if (images[i]?.complete && images[i].naturalWidth) continue;
        if (loading.has(i)) continue;
        loading.add(i);
        inflight += 1;
        const img = images[i] || new Image();
        img.decoding = "async";
        images[i] = img;
        const done = () => {
          loading.delete(i);
          inflight = Math.max(0, inflight - 1);
          if (current < 0) current = 0;
          if (i === current || Math.abs(i - current) <= 1) paint(current);
          pump();
        };
        if (img.complete && img.naturalWidth) {
          done();
          continue;
        }
        img.onload = done;
        img.onerror = done;
        if (!img.src) img.src = frameUrl(i);
      }
    };

    const enqueue = (i, urgent) => {
      if (i < 0 || i >= FRAME_COUNT) return;
      if (images[i]?.complete && images[i].naturalWidth) return;
      if (loading.has(i)) return;
      if (queue.includes(i)) {
        if (urgent) {
          const at = queue.indexOf(i);
          if (at > 0) {
            queue.splice(at, 1);
            queue.unshift(i);
          }
        }
        return;
      }
      if (urgent) queue.unshift(i);
      else queue.push(i);
      pump();
    };

    const ensureAround = (index) => {
      enqueue(index, true);
      for (let d = 1; d <= LOOKAHEAD; d++) {
        enqueue(index + d, d <= 3);
        enqueue(index - d, d <= 3);
      }
    };

    // First paint ASAP from the already-in-HTML poster, then progressive frames
    if (frameEl) {
      const bindPoster = () => {
        const poster = new Image();
        poster.src = frameEl.currentSrc || frameEl.src;
        images[0] = poster;
        current = 0;
        paint(0);
      };
      if (frameEl.complete && frameEl.naturalWidth) bindPoster();
      else frameEl.addEventListener("load", bindPoster, { once: true });
    }
    enqueue(0, true);

    const progressFromScroll = () => {
      const travel = Math.max(1, scrollRoot.offsetHeight - window.innerHeight);
      return clamp01(-scrollRoot.getBoundingClientRect().top / travel);
    };

    const syncChrome = (p) => {
      if (progressBar) progressBar.style.width = `${(p * 100).toFixed(2)}%`;
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
      ensureAround(index);
      if (index !== current) {
        current = index;
        paint(index);
      } else {
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

    // Warm a few early frames after first paint without saturating the network
    const warm = () => {
      for (let i = 1; i <= 12; i++) enqueue(i, false);
    };
    if ("requestIdleCallback" in window) {
      requestIdleCallback(warm, { timeout: 1200 });
    } else {
      setTimeout(warm, 400);
    }

    kick();
  }

  /* —— Post-hero 3D tooth scene (does not touch video hero) —— */
  const toothScene = document.getElementById("lvToothScene");
  const toothStage = toothScene?.querySelector(".lv-tooth-scene");
  if (toothScene && toothStage && !reduceMotion && toothScene.hasAttribute("data-tilt")) {
    const max = 14;
    let rafId = 0;
    const apply = (nx, ny) => {
      rafId = 0;
      toothStage.style.transform = `rotateY(${nx * max}deg) rotateX(${-ny * max}deg)`;
    };
    const onMove = (event) => {
      const rect = toothScene.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const nx = (event.clientX - cx) / (rect.width * 0.5);
      const ny = (event.clientY - cy) / (rect.height * 0.5);
      const clampedX = Math.max(-1, Math.min(1, nx));
      const clampedY = Math.max(-1, Math.min(1, ny));
      if (!rafId) rafId = requestAnimationFrame(() => apply(clampedX, clampedY));
    };
    const reset = () => {
      toothStage.style.transform = "";
    };
    toothScene.addEventListener("pointermove", onMove, { passive: true });
    toothScene.addEventListener("pointerleave", reset, { passive: true });
  }

  /* —— Services carousel: enter from left, exit to right —— */
  const svcCarousel = document.getElementById("svcCarousel");
  const svcTrack = document.getElementById("svcTrack");
  const svcViewport = document.getElementById("svcViewport");
  const svcPrev = document.getElementById("svcPrev");
  const svcNext = document.getElementById("svcNext");
  const svcDots = document.getElementById("svcDots");

  if (svcCarousel && svcTrack && svcViewport) {
    const slides = [...svcTrack.querySelectorAll(".lv-svc-slide")];
    const total = slides.length;
    const EXIT_MS = reduceMotion ? 0 : 520;
    const ENTER_MS = reduceMotion ? 0 : 680;
    const AUTO_MS = 3200;
    let index = 0;
    let visible = 1;
    let busy = false;
    let timer = 0;
    let inView = true;
    let userPaused = false;
    let pointerStartX = 0;
    let pointerDelta = 0;
    let pointerActive = false;

    const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

    const readVisible = () => {
      const raw = getComputedStyle(svcCarousel).getPropertyValue("--svc-visible").trim();
      const n = Number.parseInt(raw, 10);
      return Number.isFinite(n) && n > 0 ? n : 1;
    };

    const pageCount = () => Math.max(1, total - visible + 1);

    const stepPx = () => {
      const slide = slides[0];
      if (!slide) return 0;
      const gap = Number.parseFloat(getComputedStyle(svcTrack).gap) || 0;
      return slide.getBoundingClientRect().width + gap;
    };

    const restingX = (i = index) => -i * stepPx();

    const setX = (x, instant) => {
      if (instant) svcTrack.classList.add("is-instant");
      else svcTrack.classList.remove("is-instant");
      svcTrack.style.transform = `translate3d(${x}px, 0, 0)`;
      if (instant) {
        void svcTrack.offsetWidth;
        svcTrack.classList.remove("is-instant");
      }
    };

    const syncDots = () => {
      if (!svcDots) return;
      const pages = pageCount();
      svcDots.innerHTML = "";
      for (let i = 0; i < pages; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "lv-svc-dot" + (i === index ? " is-active" : "");
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-label", `اسلاید ${i + 1}`);
        btn.setAttribute("aria-selected", i === index ? "true" : "false");
        btn.addEventListener("click", () => {
          void goTo(i, i >= index ? 1 : -1);
        });
        svcDots.appendChild(btn);
      }
    };

    const wrapIndex = (value) => {
      const pages = pageCount();
      return ((value % pages) + pages) % pages;
    };

    const stopAuto = () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = 0;
      }
    };

    const startAuto = () => {
      stopAuto();
      if (reduceMotion || userPaused || !inView || document.hidden || pageCount() <= 1 || busy) {
        return;
      }
      timer = window.setTimeout(() => {
        void goTo(index + 1, 1);
      }, AUTO_MS);
    };

    /**
     * direction > 0 (next): current page exits to the right, next enters from the left
     * direction < 0 (prev): current exits left, previous enters from the right
     */
    const goTo = async (nextIndex, direction = 1) => {
      const target = wrapIndex(nextIndex);
      if (busy || target === index) {
        startAuto();
        return;
      }
      busy = true;
      stopAuto();

      const width = Math.max(svcViewport.clientWidth, stepPx(), 1);
      const from = restingX(index);
      const dir = direction >= 0 ? 1 : -1;

      if (EXIT_MS === 0 && ENTER_MS === 0) {
        index = target;
        setX(restingX(index), true);
        syncDots();
        busy = false;
        startAuto();
        return;
      }

      // Phase 1 — exit (next: to the right)
      setX(from + dir * width, false);
      await wait(EXIT_MS);

      // Phase 2 — park off-screen on the opposite side, then enter (next: from the left)
      index = target;
      setX(restingX(index) - dir * width, true);
      syncDots();
      await wait(20);
      setX(restingX(index), false);
      await wait(ENTER_MS);

      busy = false;
      startAuto();
    };

    const next = () => goTo(index + 1, 1);
    const prev = () => goTo(index - 1, -1);

    const layout = () => {
      visible = readVisible();
      const pages = pageCount();
      if (index > pages - 1) index = pages - 1;
      setX(restingX(index), true);
      syncDots();
      startAuto();
    };

    if (svcNext) {
      svcNext.addEventListener("click", () => {
        void next();
      });
    }
    if (svcPrev) {
      svcPrev.addEventListener("click", () => {
        void prev();
      });
    }

    svcViewport.addEventListener(
      "pointerdown",
      (event) => {
        if (busy) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        pointerActive = true;
        pointerStartX = event.clientX;
        pointerDelta = 0;
        userPaused = true;
        stopAuto();
        try {
          svcViewport.setPointerCapture(event.pointerId);
        } catch (_) {
          /* ignore */
        }
      },
      { passive: true }
    );
    svcViewport.addEventListener(
      "pointermove",
      (event) => {
        if (!pointerActive) return;
        pointerDelta = event.clientX - pointerStartX;
      },
      { passive: true }
    );
    const endPointer = () => {
      if (!pointerActive) return;
      pointerActive = false;
      userPaused = false;
      const threshold = Math.min(72, svcViewport.clientWidth * 0.18);
      // Swipe right → next (exit right / enter left)
      if (pointerDelta > threshold) void next();
      else if (pointerDelta < -threshold) void prev();
      else startAuto();
      pointerDelta = 0;
    };
    svcViewport.addEventListener("pointerup", endPointer);
    svcViewport.addEventListener("pointercancel", endPointer);

    // Pause only while keyboard-focus is inside controls (hover no longer kills autoplay)
    svcCarousel.addEventListener("focusin", () => {
      userPaused = true;
      stopAuto();
    });
    svcCarousel.addEventListener("focusout", (event) => {
      if (!svcCarousel.contains(event.relatedTarget)) {
        userPaused = false;
        startAuto();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopAuto();
      else startAuto();
    });

    window.addEventListener(
      "resize",
      () => {
        window.clearTimeout(svcCarousel._resizeTimer);
        svcCarousel._resizeTimer = window.setTimeout(layout, 120);
      },
      { passive: true }
    );

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            inView = entry.isIntersecting;
            if (inView) startAuto();
            else stopAuto();
          });
        },
        { threshold: 0.12, rootMargin: "40px 0px" }
      );
      io.observe(svcCarousel);
    }

    layout();
  }

})();
