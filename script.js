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
  var stepType = document.getElementById("stepType");
  var stepIncome = document.getElementById("stepIncome");
  var stepSalary = document.getElementById("stepSalary");
  var salaryForm = document.getElementById("salaryForm");

  // Tukar antara langkah "type", "income" (kategori) dan "salary" (borang)
  function showStep(name) {
    if (!stepType || !stepIncome) return;
    stepType.hidden = (name !== "type");
    stepIncome.hidden = (name !== "income");
    if (stepSalary) stepSalary.hidden = (name !== "salary");
  }

  // Tarikh hari ini (zon masa tempatan) dalam format YYYY-MM-DD
  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function resetSalaryForm() {
    if (!salaryForm) return;
    salaryForm.reset();
    salaryForm.elements.date.value = todayISO();
  }

  function focusFirst(container, selector) {
    var el = container && container.querySelector(selector);
    if (el) el.focus();
  }

  function openModal() {
    if (!modal) return;
    resetSalaryForm();
    showStep("type");
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

  // Tutup modal dan beritahu halaman apa yang dipilih
  // (borang transaksi boleh disambungkan pada event "transaction-select")
  function pick(type, category) {
    closeModal();
    document.dispatchEvent(new CustomEvent("transaction-select", {
      detail: { type: type, category: category }
    }));
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

    // Langkah 1: Income -> pilih kategori; Expense -> terus pilih
    Array.prototype.forEach.call(modal.querySelectorAll("[data-type]"), function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.type === "income") {
          showStep("income");
          focusFirst(stepIncome, ".choice");
        } else {
          pick(b.dataset.type, null);
        }
      });
    });

    // Langkah 2: kategori Income
    Array.prototype.forEach.call(modal.querySelectorAll("[data-category]"), function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.category === "salary") {
          showStep("salary");
          focusFirst(stepSalary, "input");
        } else {
          pick("income", b.dataset.category);
        }
      });
    });

    // Butang kembali dari borang Salary ke senarai kategori
    Array.prototype.forEach.call(modal.querySelectorAll("[data-back-income]"), function (b) {
      b.addEventListener("click", function () {
        showStep("income");
        focusFirst(stepIncome, '[data-category="salary"]');
      });
    });

    // Hantar borang Salary
    if (salaryForm) {
      salaryForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var f = salaryForm.elements;
        var amount = parseFloat(f.amount.value);
        if (!f.date.value || !(amount > 0)) return;

        closeModal();
        document.dispatchEvent(new CustomEvent("transaction-save", {
          detail: {
            type: "income",
            category: "salary",
            date: f.date.value,
            amount: Math.round(amount * 100) / 100,
            note: f.note.value.trim()
          }
        }));
      });
    }

    // Butang kembali
    Array.prototype.forEach.call(modal.querySelectorAll("[data-back]"), function (b) {
      b.addEventListener("click", function () {
        showStep("type");
        focusFirst(stepType, '[data-type="income"]');
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
