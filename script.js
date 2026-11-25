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

  /* —— 3D tilt on hover —— */
  if (reduceMotion || !finePointer) return;

  const tilts = document.querySelectorAll(".tilt-3d");
  tilts.forEach((el) => {
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

  /* Soft parallax for floating orbs near cursor in hero */
  const hero = document.querySelector(".hero");
  const orbs = document.querySelectorAll(".hero .orb");
  if (hero && orbs.length) {
    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      orbs.forEach((orb, i) => {
        const k = (i + 1) * 8;
        orb.style.transform = `translate(${(-nx * k).toFixed(1)}px, ${(-ny * k).toFixed(1)}px)`;
      });
    });
    hero.addEventListener("pointerleave", () => {
      orbs.forEach((orb) => { orb.style.transform = ""; });
    });
  }
})();
