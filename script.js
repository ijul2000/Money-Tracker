/* =========================================================
   Money Tracker - script.js
   ========================================================= */
(function () {
  "use strict";

  // URL Web App Google Apps Script (Deploy > Web app > salin URL berakhir /exec)
  var SHEET_URL = "https://script.google.com/macros/s/AKfycbwih6nimzaC79N9YP3CsaaEyagJuYdMmSF2-l41Kr_WYZl7A3xk9rnu4jbWObdf4VZvSw/exec";

  var PAGES = ["dashboard", "income", "expense"];
  var TITLES = {
    dashboard: "Overview",
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

  /* ---------- Senarai rekod Income & Expense (dari Google Sheet) ---------- */
  var MAX_ROWS = 31;   // had rekod yang dipaparkan
  var MONTH_NAMES = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai",
                     "Ogos", "September", "Oktober", "November", "Disember"];
  var MONTHS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
  var nowDate = new Date();

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;   // textContent: selamat daripada HTML dalam note
    return n;
  }

  function option(value, label) {
    var o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    return o;
  }

  function fmtDate(iso) {
    var p = String(iso).split("-");
    if (p.length !== 3 || !MONTHS[Number(p[1]) - 1]) return String(iso);
    return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1] + " " + p[0];
  }

  function fmtNum(n) {
    return Number(n).toLocaleString("en-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function fmtMoney(n) {
    return "RM " + fmtNum(n);
  }

  function catLabel(type, key) {
    var c = CATEGORIES[type] && CATEGORIES[type][key];
    return c ? c.title : String(key);
  }

  // Satu halaman rekod (income atau expense): penapis, kad jumlah, senarai
  function createRecordsPage(type) {
    var SIGN = (type === "income") ? "+ " : "\u2212 ";
    var listEl = document.getElementById(type + "List");
    var monthSel = document.getElementById(type + "Month");
    var yearSel = document.getElementById(type + "Year");
    var totalEl = document.getElementById(type + "TotalValue");

    var rows = [];
    var loaded = false;
    var loading = false;
    var reload = false;

    // Lalai: bulan & tahun semasa
    var filterMonth = String(nowDate.getMonth() + 1).padStart(2, "0");
    var filterYear = String(nowDate.getFullYear());

    function setTotal(total) {
      if (totalEl) totalEl.textContent = (total == null) ? "\u2014" : fmtNum(total);
    }

    function renderState(msg, withRetry) {
      listEl.textContent = "";
      var box = el("div", "panel");
      box.appendChild(el("p", null, msg));
      if (withRetry) {
        var btn = el("button", "btn-retry", "Cuba lagi");
        btn.type = "button";
        btn.setAttribute("data-retry", type);
        box.appendChild(btn);
      }
      listEl.appendChild(box);
    }

    // Pilihan bulan (tetap)
    function buildMonthOptions() {
      if (!monthSel) return;
      monthSel.textContent = "";
      monthSel.appendChild(option("all", "Semua bulan"));
      MONTH_NAMES.forEach(function (name, i) {
        monthSel.appendChild(option(String(i + 1).padStart(2, "0"), name));
      });
      monthSel.value = filterMonth;
    }

    // Pilihan tahun: tahun yang ada dalam data + tahun semasa
    function buildYearOptions() {
      if (!yearSel) return;
      var years = {};
      years[String(nowDate.getFullYear())] = true;
      rows.forEach(function (r) {
        var y = String(r.date).slice(0, 4);
        if (/^\d{4}$/.test(y)) years[y] = true;
      });
      var list = Object.keys(years).sort().reverse();

      yearSel.textContent = "";
      yearSel.appendChild(option("all", "Semua tahun"));
      list.forEach(function (y) { yearSel.appendChild(option(y, y)); });

      if (filterYear !== "all" && !years[filterYear]) filterYear = "all";
      yearSel.value = filterYear;
    }

    function periodLabel() {
      var m = filterMonth !== "all" ? MONTH_NAMES[Number(filterMonth) - 1] : "";
      var y = filterYear !== "all" ? filterYear : "";
      if (m && y) return m + " " + y;
      if (m) return "bulan " + m;
      if (y) return "tahun " + y;
      return "";
    }

    function render() {
      buildYearOptions();

      if (!rows.length) {
        setTotal(0);
        renderState("Belum ada rekod " + type + ". Tekan Add Transaction untuk mula.");
        return;
      }

      // Tapis ikut bulan & tahun yang dipilih
      var filtered = rows.filter(function (r) {
        var d = String(r.date);
        if (filterYear !== "all" && d.slice(0, 4) !== filterYear) return false;
        if (filterMonth !== "all" && d.slice(5, 7) !== filterMonth) return false;
        return true;
      });

      // Jumlah dikira daripada semua rekod yang sepadan dengan penapis
      var total = filtered.reduce(function (s, r) { return s + Number(r.amount || 0); }, 0);
      setTotal(total);

      if (!filtered.length) {
        var label = periodLabel();
        renderState("Tiada rekod " + type + (label ? " untuk " + label : "") + ".");
        return;
      }

      filtered.sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return String(a.timestamp) < String(b.timestamp) ? 1 : -1;
      });

      var shown = filtered.slice(0, MAX_ROWS);

      listEl.textContent = "";

      var head = el("div", "records-head");
      head.setAttribute("aria-hidden", "true");
      ["Tarikh", "Kategori", "Note", "Amount"].forEach(function (t) {
        head.appendChild(el("span", null, t));
      });
      listEl.appendChild(head);

      var list = el("div", "records");
      shown.forEach(function (r, i) {
        var item = el("article", "record record--" + type);
        item.style.setProperty("--i", Math.min(i, 12));

        item.appendChild(el("span", "record-date", fmtDate(r.date)));
        item.appendChild(el("span", "record-cat", catLabel(type, r.category)));

        var note = String(r.note == null ? "" : r.note).replace(/^'(?=[=+\-@])/, "");
        item.appendChild(el("span", note ? "record-note" : "record-note is-empty", note || "\u2014"));

        item.appendChild(el("span", "record-amount", SIGN + fmtMoney(r.amount)));
        list.appendChild(item);
      });
      listEl.appendChild(list);

      if (filtered.length > MAX_ROWS) {
        listEl.appendChild(el("p", "records-note",
          "Menunjukkan " + MAX_ROWS + " rekod terbaru daripada " + filtered.length +
          ". Pilih bulan tertentu untuk kecilkan senarai."));
      }
    }

    function load() {
      if (!listEl) return;
      if (!SHEET_URL) {
        renderState("URL Google Sheet belum diset dalam script.js.");
        return;
      }
      if (loading) { reload = true; return; }

      loading = true;
      if (!loaded) renderState("Memuatkan rekod...");

      var url = SHEET_URL + (SHEET_URL.indexOf("?") === -1 ? "?" : "&") +
                "action=list&t=" + Date.now();

      fetch(url).then(function (res) {
        if (!res.ok) throw new Error("Server " + res.status);
        return res.json();
      }).then(function (out) {
        if (!out || !out.ok) throw new Error((out && out.error) || "Ralat tidak diketahui");
        rows = out[type] || [];
        loaded = true;
        render();
      }).catch(function () {
        if (!loaded) {
          renderState("Gagal memuatkan rekod " + type + ".", true);
        } else {
          showToast("Gagal kemas kini senarai", true);
        }
      }).then(function () {
        loading = false;
        if (reload) { reload = false; load(); }
      });
    }

    buildMonthOptions();
    buildYearOptions();

    if (monthSel) {
      monthSel.addEventListener("change", function () {
        filterMonth = monthSel.value;
        if (loaded) render();
      });
    }
    if (yearSel) {
      yearSel.addEventListener("change", function () {
        filterYear = yearSel.value;
        if (loaded) render();
      });
    }
    if (listEl) {
      listEl.addEventListener("click", function (e) {
        if (e.target.closest("[data-retry]")) load();
      });
    }

    return { load: load };
  }

  var recordPages = {
    income: createRecordsPage("income"),
    expense: createRecordsPage("expense")
  };

  /* ---------- Overview: jumlah ikut bulan & tahun ---------- */
  var overview = (function () {
    var monthSel = document.getElementById("overviewMonth");
    var yearSel = document.getElementById("overviewYear");
    var elBalance = document.getElementById("ovBalanceValue");
    var elIncome = document.getElementById("ovIncomeValue");
    var elExpense = document.getElementById("ovExpenseValue");
    var panel = document.getElementById("ovPanel");
    var panelText = document.getElementById("ovPanelText");

    var data = { income: [], expense: [] };
    var loaded = false;
    var loading = false;
    var reload = false;

    // Lalai: bulan & tahun semasa
    var filterMonth = String(nowDate.getMonth() + 1).padStart(2, "0");
    var filterYear = String(nowDate.getFullYear());

    function buildMonths() {
      if (!monthSel) return;
      monthSel.textContent = "";
      monthSel.appendChild(option("all", "Semua"));
      MONTH_NAMES.forEach(function (name, i) {
        monthSel.appendChild(option(String(i + 1).padStart(2, "0"), name));
      });
      monthSel.value = filterMonth;
    }

    function buildYears() {
      if (!yearSel) return;
      var years = {};
      years[String(nowDate.getFullYear())] = true;
      data.income.concat(data.expense).forEach(function (r) {
        var y = String(r.date).slice(0, 4);
        if (/^\d{4}$/.test(y)) years[y] = true;
      });
      yearSel.textContent = "";
      yearSel.appendChild(option("all", "Semua"));
      Object.keys(years).sort().reverse().forEach(function (y) {
        yearSel.appendChild(option(y, y));
      });
      if (filterYear !== "all" && !years[filterYear]) filterYear = "all";
      yearSel.value = filterYear;
    }

    function inPeriod(r) {
      var d = String(r.date);
      if (filterYear !== "all" && d.slice(0, 4) !== filterYear) return false;
      if (filterMonth !== "all" && d.slice(5, 7) !== filterMonth) return false;
      return true;
    }

    function sum(list) {
      return list.reduce(function (s, r) { return s + Number(r.amount || 0); }, 0);
    }

    function periodLabel() {
      var m = filterMonth !== "all" ? MONTH_NAMES[Number(filterMonth) - 1] : "";
      var y = filterYear !== "all" ? filterYear : "";
      if (m && y) return m + " " + y;
      if (m) return "bulan " + m;
      if (y) return "tahun " + y;
      return "";
    }

    function setValues(b, i, e) {
      if (elBalance) elBalance.textContent = (b == null) ? "\u2014" : fmtNum(b);
      if (elIncome) elIncome.textContent = (i == null) ? "\u2014" : fmtNum(i);
      if (elExpense) elExpense.textContent = (e == null) ? "\u2014" : fmtNum(e);
    }

    function showPanel(msg) {
      if (!panel) return;
      if (msg) {
        panelText.textContent = msg;
        panel.hidden = false;
      } else {
        panel.hidden = true;
      }
    }

    function render() {
      buildYears();
      var inc = data.income.filter(inPeriod);
      var exp = data.expense.filter(inPeriod);
      var totalInc = sum(inc);
      var totalExp = sum(exp);

      // Baki = jumlah income - jumlah expense bagi tempoh yang dipilih
      setValues(totalInc - totalExp, totalInc, totalExp);

      if (!inc.length && !exp.length) {
        var label = periodLabel();
        showPanel("Tiada rekod" + (label ? " untuk " + label : "") + ".");
      } else {
        showPanel(null);
      }
    }

    function load() {
      if (!SHEET_URL) {
        showPanel("URL Google Sheet belum diset dalam script.js.");
        return;
      }
      if (loading) { reload = true; return; }
      loading = true;

      var url = SHEET_URL + (SHEET_URL.indexOf("?") === -1 ? "?" : "&") +
                "action=list&t=" + Date.now();

      fetch(url).then(function (res) {
        if (!res.ok) throw new Error("Server " + res.status);
        return res.json();
      }).then(function (out) {
        if (!out || !out.ok) throw new Error((out && out.error) || "Ralat tidak diketahui");
        data.income = out.income || [];
        data.expense = out.expense || [];
        loaded = true;
        render();
      }).catch(function () {
        if (!loaded) {
          setValues(null, null, null);
          showPanel("Gagal memuatkan data.");
        } else {
          showToast("Gagal kemas kini overview", true);
        }
      }).then(function () {
        loading = false;
        if (reload) { reload = false; load(); }
      });
    }

    buildMonths();
    buildYears();

    if (monthSel) {
      monthSel.addEventListener("change", function () {
        filterMonth = monthSel.value;
        if (loaded) render();
      });
    }
    if (yearSel) {
      yearSel.addEventListener("change", function () {
        filterYear = yearSel.value;
        if (loaded) render();
      });
    }

    return { load: load };
  })();

  /* ---------- Ingat halaman terakhir (kekal selepas refresh) ---------- */
  var STORE_KEY = "moneyTracker.page";

  function savePage(page) {
    try { localStorage.setItem(STORE_KEY, page); } catch (e) { /* storan tidak tersedia */ }
  }

  function savedPage() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
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
    savePage(page);
    if (recordPages[page]) recordPages[page].load();
    if (page === "dashboard") overview.load();
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
          if (recordPages[detail.type]) recordPages[detail.type].load();
          overview.load();
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
        month: "long",
        year: "numeric"
      });
    } catch (e) {
      /* kekalkan teks asal jika pelayar tidak menyokong */
    }
  }

  /* ---------- Mula ---------- */
  // Utamakan hash dalam URL; kalau tiada, guna halaman terakhir yang disimpan
  var startPage = location.hash.slice(1);
  if (PAGES.indexOf(startPage) === -1) {
    startPage = savedPage();
    if (PAGES.indexOf(startPage) === -1) startPage = "dashboard";
    if (history.replaceState) {
      history.replaceState(null, "", "#" + startPage);
    }
  }
  show(startPage);

  // Kira semula kedudukan penanda apabila saiz skrin atau fon berubah
  window.addEventListener("resize", moveIndicator);
  if (window.ResizeObserver) {
    new ResizeObserver(moveIndicator).observe(nav);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(moveIndicator);
  }
})();
