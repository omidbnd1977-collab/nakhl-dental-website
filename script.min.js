(() => {
  "use strict";
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
