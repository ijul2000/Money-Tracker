/* =========================================================
   Money Tracker - script.js
   ========================================================= */
(function () {
  "use strict";

  // URL Web App Google Apps Script (Deploy > Web app > salin URL berakhir /exec)
  var SHEET_URL = "https://script.google.com/macros/s/AKfycbwih6nimzaC79N9YP3CsaaEyagJuYdMmSF2-l41Kr_WYZl7A3xk9rnu4jbWObdf4VZvSw/exec";

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

  /* ---------- Toast & simpan ke Google Sheet ---------- */
  var toastEl = null;
  var toastTimer = null;

  function showToast(msg, isError) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    // Modal <dialog> berada di "top layer", jadi toast mesti masuk dalam dialog bila ia terbuka
    var host = (modal && modal.open) ? modal : document.body;
    if (toastEl.parentNode !== host) host.appendChild(toastEl);
    toastEl.textContent = msg;
    toastEl.classList.toggle("toast--error", !!isError);
    // reflow supaya animasi main semula
    toastEl.classList.remove("is-show");
    void toastEl.offsetWidth;
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-show");
    }, 3200);
  }

  // Content-Type text/plain supaya tiada preflight CORS (Apps Script tak sokong OPTIONS)
  function saveToSheet(detail) {
    return fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(detail)
    }).then(function (res) {
      if (!res.ok) throw new Error("Server " + res.status);
      return res.json();
    }).then(function (out) {
      if (!out || !out.ok) throw new Error((out && out.error) || "Ralat tidak diketahui");
      return out;
    });
  }

  /* ---------- Modal Add Transaction ---------- */
  var modal = document.getElementById("addModal");
  var stepType = document.getElementById("stepType");
  var stepIncome = document.getElementById("stepIncome");
  var stepExpense = document.getElementById("stepExpense");
  var stepForm = document.getElementById("stepForm");
  var txForm = document.getElementById("txForm");
  var formTitle = document.getElementById("txFormTitle");
  var formHint = document.getElementById("txFormHint");
  var currentType = "income";
  var currentCategory = null;

  // Tajuk, penerangan dan contoh note bagi setiap kategori
  var CATEGORIES = {
    income: {
      "salary":       { title: "Salary",       hint: "Isi maklumat gaji.",                placeholder: "Contoh: Gaji bulan Oktober" },
      "overtime":     { title: "Overtime",     hint: "Isi maklumat kerja lebih masa.",    placeholder: "Contoh: OT hujung minggu" },
      "extra-income": { title: "Extra Income", hint: "Isi maklumat pendapatan tambahan.", placeholder: "Contoh: Jual barang terpakai" },
      "balance":      { title: "Balance",      hint: "Isi maklumat baki sedia ada.",      placeholder: "Contoh: Baki bawa dari bulan lepas" }
    },
    expense: {
      "food-drink":    { title: "Food & Drink",  hint: "Isi maklumat makan & minum.",       placeholder: "Contoh: Makan tengah hari" },
      "shopping":      { title: "Shopping",      hint: "Isi maklumat membeli-belah.",       placeholder: "Contoh: Baju raya" },
      "home":          { title: "Home",          hint: "Isi maklumat perbelanjaan rumah.",  placeholder: "Contoh: Baiki paip sinki" },
      "bill-fee":      { title: "Bill & Fee",    hint: "Isi maklumat bil & yuran.",         placeholder: "Contoh: Bil elektrik" },
      "entertainment": { title: "Entertainment", hint: "Isi maklumat hiburan.",             placeholder: "Contoh: Tiket wayang" },
      "loan":          { title: "Loan",          hint: "Isi maklumat bayaran pinjaman.",    placeholder: "Contoh: Ansuran kereta" },
      "groceries":     { title: "Groceries",     hint: "Isi maklumat barang dapur.",        placeholder: "Contoh: Barang dapur mingguan" },
      "transport":     { title: "Transport",     hint: "Isi maklumat pengangkutan.",        placeholder: "Contoh: Minyak kereta" },
      "medical":       { title: "Medical",       hint: "Isi maklumat perubatan.",           placeholder: "Contoh: Ubat di farmasi" }
    }
  };

  function setCategory(type, cat) {
    var info = CATEGORIES[type] && CATEGORIES[type][cat];
    if (!info) return false;
    currentType = type;
    currentCategory = cat;
    if (formTitle) formTitle.textContent = info.title;
    if (formHint) formHint.textContent = info.hint;
    if (txForm) txForm.elements.note.placeholder = info.placeholder;
    if (stepForm) stepForm.dataset.kind = type;   // warna borang ikut jenis
    return true;
  }

  // Tukar antara langkah "type", "income"/"expense" (kategori) dan "form" (borang)
  function showStep(name) {
    if (!stepType || !stepIncome) return;
    stepType.hidden = (name !== "type");
    stepIncome.hidden = (name !== "income");
    if (stepExpense) stepExpense.hidden = (name !== "expense");
    if (stepForm) stepForm.hidden = (name !== "form");
  }

  // Tarikh hari ini (zon masa tempatan) dalam format YYYY-MM-DD
  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function resetForm() {
    if (!txForm) return;
    txForm.reset();
    txForm.elements.date.value = todayISO();
  }

  function focusFirst(container, selector) {
    var el = container && container.querySelector(selector);
    if (el) el.focus();
  }

  function openModal() {
    if (!modal) return;
    resetForm();
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

    // Langkah 1: pilih Income atau Expense -> pilih kategori
    Array.prototype.forEach.call(modal.querySelectorAll("[data-type]"), function (b) {
      b.addEventListener("click", function () {
        var isIncome = (b.dataset.type === "income");
        showStep(isIncome ? "income" : "expense");
        focusFirst(isIncome ? stepIncome : stepExpense, ".choice");
      });
    });

    // Langkah 2: kategori Income / Expense
    Array.prototype.forEach.call(modal.querySelectorAll("[data-category]"), function (b) {
      b.addEventListener("click", function () {
        if (setCategory(b.dataset.kind || "income", b.dataset.category)) {
          resetForm();
          showStep("form");
          // Desktop: terus fokus pada Amount. Telefon: jangan fokus automatik
          // supaya date picker / papan kekunci tidak terbuka sendiri.
          if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            focusFirst(stepForm, "#txAmount");
          }
        } else {
          pick(b.dataset.kind || "income", b.dataset.category);
        }
      });
    });

    // Butang kembali dari borang ke senarai kategori
    Array.prototype.forEach.call(modal.querySelectorAll("[data-back-form]"), function (b) {
      b.addEventListener("click", function () {
        showStep(currentType);
        focusFirst(currentType === "expense" ? stepExpense : stepIncome,
                   '[data-category="' + currentCategory + '"]');
      });
    });

    // Hantar borang (semua kategori income & expense) -> simpan ke Google Sheet
    if (txForm) {
      var submitBtn = txForm.querySelector(".btn-submit");

      txForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (txForm.dataset.busy === "1") return;

        var f = txForm.elements;
        var amount = parseFloat(f.amount.value);
        if (!currentCategory || !f.date.value || !(amount > 0)) return;

        var detail = {
          type: currentType,
          category: currentCategory,
          date: f.date.value,
          amount: Math.round(amount * 100) / 100,
          note: f.note.value.trim()
        };

        if (!SHEET_URL) {
          showToast("URL Google Sheet belum diset dalam script.js", true);
          return;
        }

        setBusy(true);
        saveToSheet(detail).then(function () {
          setBusy(false);
          closeModal();
          showToast("Transaksi disimpan");
          document.dispatchEvent(new CustomEvent("transaction-save", { detail: detail }));
        }).catch(function (err) {
          setBusy(false);
          showToast("Gagal simpan: " + (err && err.message ? err.message : "cuba lagi"), true);
        });
      });

      function setBusy(on) {
        txForm.dataset.busy = on ? "1" : "0";
        if (submitBtn) {
          submitBtn.disabled = on;
          submitBtn.textContent = on ? "Menyimpan..." : "Simpan";
        }
      }
    }

    // Butang kembali
    Array.prototype.forEach.call(modal.querySelectorAll("[data-back]"), function (b) {
      b.addEventListener("click", function () {
        showStep("type");
        focusFirst(stepType, b.closest("#stepExpense") ? '[data-type="expense"]' : '[data-type="income"]');
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
