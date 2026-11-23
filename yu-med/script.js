(() => {
  const nav = document.getElementById("mainNav");
  const toggle = document.getElementById("navToggle");
  if (nav && toggle) {
    const close = () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Apri menu");
    };
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Chiudi menu" : "Apri menu");
    });
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  const track = document.getElementById("solutionsTrack");
  const prev = document.getElementById("solPrev");
  const next = document.getElementById("solNext");
  if (!track || !prev || !next) return;

  const cardStep = () => {
    const card = track.querySelector(".sol-card");
    if (!card) return track.clientWidth;
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || "0") || 0;
    return card.getBoundingClientRect().width + gap;
  };

  const scrollByCard = (dir) => {
    track.scrollBy({ left: dir * cardStep(), behavior: "smooth" });
  };

  prev.addEventListener("click", () => scrollByCard(-1));
  next.addEventListener("click", () => scrollByCard(1));
})();
