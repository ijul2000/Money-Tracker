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
  if (!nav) return;

  var toggle = document.getElementById("navToggle");
  var indicator = nav.querySelector(".nav-indicator");
  var buttons = Array.prototype.slice.call(nav.querySelectorAll("button[data-page]"));
  var addButtons = Array.prototype.slice.call(document.querySelectorAll('[data-action="add"]'));
  var wide = window.matchMedia("(min-width: 640px)");

  /* ---------- Penanda emas yang meluncur (tablet & desktop sahaja) ---------- */
  function moveIndicator() {
    if (!indicator || !wide.matches) return;

    var active = nav.querySelector('button[aria-current="page"]');
    if (!active) return;

    var first = !nav.classList.contains("has-indicator");
    if (first) nav.classList.remove("is-ready");

    indicator.style.width = active.offsetWidth + "px";
    indicator.style.height = active.offsetHeight + "px";
    indicator.style.transform =
      "translate(" + active.offsetLeft + "px," + active.offsetTop + "px)";
    nav.classList.add("has-indicator");

    // Kali pertama: letak terus tanpa animasi, kemudian hidupkan animasi
    if (first) {
      void indicator.offsetWidth;
      requestAnimationFrame(function () {
        nav.classList.add("is-ready");
      });
    }
  }

  /* ---------- Menu 3 garis (telefon) ---------- */
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
    }
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      setMenu(!nav.classList.contains("is-open"));
    });
  }

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
      if (toggle) toggle.focus();
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
      var el = document.getElementById(p);
      if (el) el.hidden = (p !== page);
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

  /* ---------- Modal Add Transaction ---------- */
  var modal = document.getElementById("addModal");

  function openModal() {
    if (!modal) return;
    if (typeof modal.showModal === "function") {
      modal.showModal();
    } else {
      modal.setAttribute("open", "");
    }
    document.documentElement.classList.add("modal-open");
  }

  function closeModal() {
    if (!modal) return;
    if (typeof modal.close === "function") {
      modal.close();
    } else {
      modal.removeAttribute("open");
      document.documentElement.classList.remove("modal-open");
    }
  }

  if (modal) {
    // Buang kunci skrol bila modal ditutup (termasuk dengan Escape)
    modal.addEventListener("close", function () {
      document.documentElement.classList.remove("modal-open");
    });

    // Tekan di luar kotak modal (pada latar gelap) untuk tutup
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });

    Array.prototype.forEach.call(modal.querySelectorAll("[data-close]"), function (b) {
      b.addEventListener("click", closeModal);
    });

    // Pilihan Income / Expense
    Array.prototype.forEach.call(modal.querySelectorAll("[data-type]"), function (b) {
      b.addEventListener("click", function () {
        var type = b.dataset.type;
        closeModal();
        // Borang transaksi boleh disambungkan pada event ini
        document.dispatchEvent(new CustomEvent("transaction-type", { detail: { type: type } }));
      });
    });
  }

  // Butang Add Transaction: tutup menu telefon, kemudian buka modal
  addButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      setMenu(false);
      openModal();
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

  // Kira semula kedudukan penanda apabila saiz skrin atau fon berubah
  window.addEventListener("resize", moveIndicator);
  if (window.ResizeObserver) {
    new ResizeObserver(moveIndicator).observe(nav);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(moveIndicator);
  }
})();
