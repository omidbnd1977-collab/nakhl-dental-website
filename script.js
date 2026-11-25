(() => {
  "use strict";
  const nav = document.getElementById("mainNav");
  const toggle = document.getElementById("navToggle");
  if (nav && toggle) {
    const close = () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "باز کردن منو");
    };
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "بستن منو" : "باز کردن منو");
    });
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  const track = document.getElementById("servicesTrack");
  const prev = document.getElementById("svcPrev");
  const next = document.getElementById("svcNext");
  if (!track || !prev || !next) return;

  const step = () => {
    const card = track.querySelector(".svc-card");
    if (!card) return track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).gap || "0") || 0;
    return card.getBoundingClientRect().width + gap;
  };
  // In RTL, positive scrollLeft moves toward the visual "start" in most engines.
  const rtl = getComputedStyle(track).direction === "rtl";
  const delta = (dir) => {
    const d = step();
    return rtl ? (dir === "next" ? -d : d) : (dir === "next" ? d : -d);
  };
  prev.addEventListener("click", () => track.scrollBy({ left: delta("prev"), behavior: "smooth" }));
  next.addEventListener("click", () => track.scrollBy({ left: delta("next"), behavior: "smooth" }));
})();
