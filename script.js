(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

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

  /* —— Specialty marquee: duplicate group for seamless L→R loop —— */
  const specialtyTrack = document.getElementById("specialtyTrack");
  if (specialtyTrack) {
    const group = specialtyTrack.querySelector(".marquee-group");
    if (group) {
      const clone = group.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("a").forEach((a) => a.setAttribute("tabindex", "-1"));
      clone.querySelectorAll("[id]").forEach((node) => {
        const oldId = node.id;
        const nextId = `${oldId}-b`;
        node.id = nextId;
        clone.querySelectorAll(`[fill="url(#${oldId})"]`).forEach((el) => {
          el.setAttribute("fill", `url(#${nextId})`);
        });
      });
      specialtyTrack.appendChild(clone);
    }
  }

  /* —— 3D hover on landing nav links —— */
  if (!reduceMotion && finePointer) {
    document.querySelectorAll(".nav-3d").forEach((el) => {
      el.addEventListener("pointermove", (event) => {
        const rect = el.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        el.style.transform =
          `translateZ(22px) rotateX(${(-y * 14).toFixed(2)}deg) rotateY(${(x * 16).toFixed(2)}deg)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
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

  /* —— Marquee: pause while interacting (desktop hover + mobile touch) —— */
  document.querySelectorAll("[data-marquee]").forEach((root) => {
    const pause = () => root.classList.add("is-paused");
    const resume = () => root.classList.remove("is-paused");
    root.addEventListener("pointerenter", pause);
    root.addEventListener("pointerleave", resume);
    root.addEventListener("pointerdown", pause);
    root.addEventListener("pointerup", resume);
    root.addEventListener("pointercancel", resume);
  });

  /* —— 3D tilt (fine pointer) + tap pop (touch) —— */
  if (!reduceMotion) {
    document.querySelectorAll(".tilt-3d").forEach((el) => {
      if (el.closest(".hero-pin")) return;
      const strength = Number(el.dataset.tiltStrength || 8);
      const max = Math.min(Math.max(strength, 4), 18);
      const pop = el.classList.contains("spec-item") ? 28 : 12;
      const reset = () => {
        el.classList.remove("is-tilting", "is-active");
        el.style.transform = "";
      };

      if (finePointer) {
        el.addEventListener("pointerenter", () => el.classList.add("is-tilting"));
        el.addEventListener("pointerleave", reset);
        el.addEventListener("pointermove", (event) => {
          const rect = el.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width;
          const y = (event.clientY - rect.top) / rect.height;
          el.style.transform =
            `perspective(900px) rotateX(${((0.5 - y) * max * 2).toFixed(2)}deg) rotateY(${(((x - 0.5) * max * 2)).toFixed(2)}deg) translateZ(${pop}px)`;
        });
      } else {
        // Mobile/touch: press pop + sheen without requiring hover
        el.addEventListener("pointerdown", () => {
          el.classList.add("is-active", "is-tilting");
          el.style.transform =
            `perspective(900px) rotateX(6deg) rotateY(-5deg) translateZ(${Math.min(pop, 18)}px) scale(1.03)`;
        });
        el.addEventListener("pointerup", reset);
        el.addEventListener("pointercancel", reset);
        el.addEventListener("pointerleave", reset);
      }
    });
  }

})();
