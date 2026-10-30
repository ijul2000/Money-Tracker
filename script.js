/* =========================================================
   Money Tracker - script.js
   ========================================================= */
(function () {
  "use strict";

  var PAGES = ["dashboard", "income", "expense"];
  var TITLES = {
    dashboard: "Dashboard",
    income: "Income",
    expense: "Expense"
  };

  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  var indicator = nav.querySelector(".nav-indicator");
  var buttons = Array.prototype.slice.call(nav.querySelectorAll("button"));
  var wide = window.matchMedia("(min-width: 640px)");

  /* ---------- Penanda navbar yang meluncur ---------- */
  function moveIndicator() {
    var active = nav.querySelector('button[aria-current="page"]');
    if (!active) return;

    indicator.style.width = active.offsetWidth + "px";
    indicator.style.height = active.offsetHeight + "px";
    indicator.style.transform =
      "translate(" + active.offsetLeft + "px," + active.offsetTop + "px)";
    nav.classList.add("has-indicator");
  }

  /* ---------- Menu 3 garis (telefon) ---------- */
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
  }

  toggle.addEventListener("click", function () {
    setMenu(!nav.classList.contains("is-open"));
  });

  // Tutup bila tekan di luar header
  document.addEventListener("click", function (e) {
    if (nav.classList.contains("is-open") && !e.target.closest(".site-header")) {
      setMenu(false);
    }
  });

  // Tutup dengan butang Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      setMenu(false);
      toggle.focus();
    }
  });

  // Bila saiz skrin bertukar antara telefon dan tablet/desktop
  function onBreakpoint() {
    setMenu(false);
    moveIndicator();
  }
  if (wide.addEventListener) {
    wide.addEventListener("change", onBreakpoint);
  } else if (wide.addListener) {
    wide.addListener(onBreakpoint);
  }

  /* ---------- Tukar halaman ---------- */
  function show(page) {
    if (PAGES.indexOf(page) === -1) page = "dashboard";

    PAGES.forEach(function (p) {
      document.getElementById(p).hidden = (p !== page);
    });

    buttons.forEach(function (b) {
      if (b.dataset.page === page) {
        b.setAttribute("aria-current", "page");
      } else {
        b.removeAttribute("aria-current");
      }
    });

    document.title = TITLES[page] + " \u00B7 Money Tracker";
    moveIndicator();
  }

  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      setMenu(false);
      if (location.hash.slice(1) === b.dataset.page) return;
      location.hash = b.dataset.page;
    });
  });

  window.addEventListener("hashchange", function () {
    show(location.hash.slice(1));
  });

  /* ---------- Tarikh hari ini ---------- */
  var todayEl = document.getElementById("today");
  if (todayEl) {
    try {
      todayEl.textContent = new Date().toLocaleDateString("ms-MY", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch (e) {
      /* kekalkan teks asal jika pelayar tidak menyokong */
    }
  }

  /* ---------- Mula ---------- */
  show(location.hash.slice(1));

  // Hidupkan animasi meluncur selepas kedudukan awal ditetapkan
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      nav.classList.add("is-ready");
    });
  });

  // Kira semula kedudukan apabila saiz skrin atau fon berubah
  window.addEventListener("resize", moveIndicator);
  if (window.ResizeObserver) {
    new ResizeObserver(moveIndicator).observe(nav);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(moveIndicator);
  }
})();
