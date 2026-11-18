(() => {
  "use strict";

  const header = document.querySelector(".site-header");
  const nav = document.getElementById("mainNav");
  const navToggle = document.getElementById("navToggle");
  const bookingForm = document.getElementById("bookingForm");
  const formStatus = document.getElementById("formStatus");
  const reveals = document.querySelectorAll(".reveal");
  const counters = document.querySelectorAll("[data-count]");

  const toPersianDigits = (value) =>
    String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

  /* Sticky header shadow */
  const onScrollHeader = () => {
    if (!header) return;
    header.style.boxShadow =
      window.scrollY > 12 ? "0 10px 30px rgba(0,0,0,0.25)" : "none";
  };

  /* Mobile nav */
  if (navToggle && nav) {
    navToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const open = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("nav-open", open);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      });
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("open")) return;
      if (nav.contains(event.target) || navToggle.contains(event.target)) return;
      nav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    });
  }

  /* Smooth active section highlight for nav */
  const sections = [...document.querySelectorAll("section[id]")];
  const navLinks = [...document.querySelectorAll(".nav a[href^='#']")];

  const highlightNav = () => {
    const offset = window.scrollY + 120;
    let currentId = "";
    for (const section of sections) {
      if (section.offsetTop <= offset) currentId = section.id;
    }
    navLinks.forEach((link) => {
      const match = link.getAttribute("href") === `#${currentId}`;
      link.style.color = match ? "#fff" : "";
    });
  };

  /* Reveal on scroll */
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => revealObserver.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
  }

  /* Animated counters */
  const animateCounter = (el) => {
    const target = Number(el.getAttribute("data-count") || 0);
    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      el.textContent = toPersianDigits(value);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  if ("IntersectionObserver" in window && counters.length) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => counterObserver.observe(el));
  } else {
    counters.forEach((el) => {
      el.textContent = toPersianDigits(el.getAttribute("data-count") || "0");
    });
  }

  /* Booking form → WhatsApp */
  if (bookingForm) {
    bookingForm.addEventListener("submit", (event) => {
      event.preventDefault();
      formStatus.classList.remove("error");

      const data = new FormData(bookingForm);
      const name = String(data.get("name") || "").trim();
      const phone = String(data.get("phone") || "").trim();
      const service = String(data.get("service") || "").trim();
      const message = String(data.get("message") || "").trim();

      if (!name || !phone || !service) {
        formStatus.textContent = "لطفاً نام، شماره تماس و نوع خدمت را وارد کنید.";
        formStatus.classList.add("error");
        formStatus.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }

      const text = [
        "سلام، درخواست نوبت از وب‌سایت کلینیک نخل:",
        `نام: ${name}`,
        `شماره: ${phone}`,
        `خدمت: ${service}`,
        message ? `توضیح: ${message}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const url = `https://wa.me/989120153255?text=${encodeURIComponent(text)}`;
      formStatus.textContent = "در حال انتقال به واتساپ برای هماهنگی نوبت…";
      window.open(url, "_blank", "noopener,noreferrer");
      bookingForm.reset();
    });
  }

  window.addEventListener("scroll", () => {
    onScrollHeader();
    highlightNav();
  }, { passive: true });

  onScrollHeader();
  highlightNav();
})();
