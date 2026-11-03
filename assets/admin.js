// Qairaq клубы — әкімші панелі: кіру, тіркелгендер тізімі,
// өтініш/арыз/пікір хаттары, мәртебе өзгерту, CSV.
(function () {
  "use strict";

  var cfg = window.QAIRAQ_CONFIG || {};
  document.getElementById("year").textContent = new Date().getFullYear();

  var loginView = document.getElementById("login-view");
  var listView  = document.getElementById("list-view");
  var setupView = document.getElementById("setup-view");

  // Баптау жоқ болса — әрі қарай жүрудің мәні жоқ
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) {
    setupView.hidden = false;
    return;
  }

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  var ROLE_LABEL   = { student: "Оқушы", teacher: "Мұғалім" };
  var STATUS_LABEL = {
    new: "Жаңа", reviewing: "Қаралуда",
    accepted: "Қабылданды", rejected: "Қабылданбады",
  };
  var KIND_LABEL = { request: "Өтініш", complaint: "Арыз", feedback: "Пікір" };
  var MSG_STATUS_LABEL = {
    new: "Жаңа", reviewing: "Қаралуда",
    accepted: "Шешілді", rejected: "Қабылданбады",
  };

  var rows = [];   // тіркелгендер
  var msgs = [];   // өтініш / арыз / пікір
  var tab  = "regs";

  function $(id) { return document.getElementById(id); }

  // ── Көріністі ауыстыру ──────────────────────────────────────────
  function showLogin() { loginView.hidden = false; listView.hidden = true; }
  function showList(email) {
    loginView.hidden = true;
    listView.hidden = false;
    $("who").textContent = email ? email + " ретінде кірдіңіз" : "";
    load();
  }

  function note(id, kind, text) {
    var el = $(id);
    el.className = kind ? "msg is-" + kind : "msg";
    el.textContent = text || "";
  }

  // ── Кіру / шығу ─────────────────────────────────────────────────
  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = $("login-btn");
    btn.disabled = true; btn.textContent = "Кіруде...";
    note("login-msg", "", "");

    sb.auth.signInWithPassword({
      email: $("email").value.trim(),
      password: $("password").value,
    }).then(function (res) {
      btn.disabled = false; btn.textContent = "Кіру";
      if (res.error) { note("login-msg", "bad", "Кіру сәтсіз: " + res.error.message); return; }
      showList(res.data && res.data.user ? res.data.user.email : "");
    });
  });

  $("logout-btn").addEventListener("click", function () {
    sb.auth.signOut().then(showLogin);
  });

  // ── Қойындылар ──────────────────────────────────────────────────
  var headTitle = document.querySelector(".admin-head .section__title");

  function setTab(name) {
    tab = name;
    document.querySelectorAll(".tab").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-tab") === name);
    });
    $("pane-regs").hidden = name !== "regs";
    $("pane-msgs").hidden = name !== "msgs";
    if (headTitle) {
      headTitle.textContent = name === "msgs" ? "Өтініш / арыз / пікір" : "Тіркелгендер";
    }
    note("list-msg", "", "");
  }

  document.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () { setTab(b.getAttribute("data-tab")); });
  });

  // ── Деректерді жүктеу ───────────────────────────────────────────
  function load() {
    note("list-msg", "", "");

    sb.from("registrations")
      .select("*")
      .order("created_at", { ascending: false })
      .then(function (res) {
        if (res.error) { note("list-msg", "bad", "Тіркелгендер жүктелмеді: " + res.error.message); return; }
        rows = res.data || [];
        render();
      });

    sb.from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .then(function (res) {
        if (res.error) {
          // messages кестесі әлі құрылмаған болуы мүмкін — тіркелгендер бұзылмасын
          note("list-msg", "bad", "Хаттар жүктелмеді: " + res.error.message +
            " (supabase-02-phone-and-messages.sql орындалды ма?)");
          msgs = [];
          renderMsgs();
          return;
        }
        msgs = res.data || [];
        renderMsgs();
      });
  }

  $("refresh-btn").addEventListener("click", load);

  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("kk-KZ", {
      timeZone: "Asia/Almaty",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function telHref(phone) {
    return "tel:" + String(phone || "").replace(/[^\d+]/g, "");
  }

  // Мәртебе таңдағышын жасау (екі кестеге де ортақ)
  function statusSelect(labels, record, table, onSaved) {
    var sel = document.createElement("select");
    sel.className = "status-select";
    Object.keys(labels).forEach(function (key) {
      var opt = document.createElement("option");
      opt.value = key;
      opt.textContent = labels[key];
      if ((record.status || "new") === key) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function () {
      var prev = record.status || "new";
      sel.disabled = true;
      sb.from(table).update({ status: sel.value }).eq("id", record.id).then(function (res) {
        sel.disabled = false;
        if (res.error) {
          sel.value = prev;
          note("list-msg", "bad", "Сақталмады: " + res.error.message);
          return;
        }
        record.status = sel.value;
        note("list-msg", "ok", "Мәртебе сақталды.");
        if (onSaved) onSaved();
      });
    });
    return sel;
  }

  // ── Тіркелгендер: сүзгі + кесте ─────────────────────────────────
  function filtered() {
    var q      = $("q").value.trim().toLowerCase();
    var role   = $("f-role").value;
    var status = $("f-status").value;

    return rows.filter(function (r) {
      if (role && r.role !== role) return false;
      if (status && (r.status || "new") !== status) return false;
      if (q) {
        var hay = [r.last_name, r.first_name, r.school, r.grade, r.phone].join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function render() {
    var list = filtered();
    var tbody = $("rows");
    tbody.innerHTML = "";

    // Статистика — сүзгіге тәуелсіз, жалпы сан
    $("st-total").textContent   = rows.length;
    $("st-student").textContent = rows.filter(function (r) { return r.role === "student"; }).length;
    $("st-teacher").textContent = rows.filter(function (r) { return r.role === "teacher"; }).length;
    $("st-new").textContent     = rows.filter(function (r) { return (r.status || "new") === "new"; }).length;
    $("tc-regs").textContent    = rows.length;

    $("empty").hidden = list.length > 0;

    list.forEach(function (r, i) {
      var tr = document.createElement("tr");

      function cell(text, cls) {
        var td = document.createElement("td");
        if (cls) td.className = cls;
        td.textContent = text;
        tr.appendChild(td);
        return td;
      }

      cell(String(i + 1), "num");
      cell((r.last_name || "") + " " + (r.first_name || ""));

      var roleTd = document.createElement("td");
      var chip = document.createElement("span");
      chip.className = "chip chip--" + (r.role === "teacher" ? "teacher" : "student");
      chip.textContent = ROLE_LABEL[r.role] || r.role;
      roleTd.appendChild(chip);
      tr.appendChild(roleTd);

      cell(r.grade || "—", "num");
      cell(r.school || "—");

      // Телефон — басуға келетін сілтеме
      var phTd = document.createElement("td");
      phTd.className = "num";
      if (r.phone) {
        var a = document.createElement("a");
        a.href = telHref(r.phone);
        a.textContent = r.phone;
        a.style.color = "#22406f";
        a.style.fontWeight = "600";
        a.style.textDecoration = "none";
        phTd.appendChild(a);
      } else {
        phTd.textContent = "—";
      }
      tr.appendChild(phTd);

      cell(fmtDate(r.created_at), "num");

      var stTd = document.createElement("td");
      stTd.appendChild(statusSelect(STATUS_LABEL, r, "registrations", render));
      tr.appendChild(stTd);

      tbody.appendChild(tr);
    });
  }

  ["q", "f-role", "f-status"].forEach(function (id) {
    $(id).addEventListener("input", render);
    $(id).addEventListener("change", render);
  });

  // ── Хаттар: сүзгі + карточкалар ─────────────────────────────────
  function filteredMsgs() {
    var q      = $("mq").value.trim().toLowerCase();
    var kind   = $("mf-kind").value;
    var status = $("mf-status").value;

    return msgs.filter(function (m) {
      if (kind && m.kind !== kind) return false;
      if (status && (m.status || "new") !== status) return false;
      if (q) {
        var hay = [m.full_name, m.school, m.phone, m.body].join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function renderMsgs() {
    var list = filteredMsgs();
    var box = $("msg-cards");
    box.innerHTML = "";

    $("ms-total").textContent     = msgs.length;
    $("ms-request").textContent   = msgs.filter(function (m) { return m.kind === "request"; }).length;
    $("ms-complaint").textContent = msgs.filter(function (m) { return m.kind === "complaint"; }).length;
    $("ms-new").textContent       = msgs.filter(function (m) { return (m.status || "new") === "new"; }).length;
    $("tc-msgs").textContent      = msgs.length;

    $("msg-empty").hidden = list.length > 0;

    list.forEach(function (m) {
      var card = document.createElement("div");
      card.className = "msg-card";

      // Жоғарғы жол: түрі · аты-жөні · мәртебе
      var top = document.createElement("div");
      top.className = "msg-card__top";

      var kindChip = document.createElement("span");
      kindChip.className = "chip chip--" + (m.kind || "feedback");
      kindChip.textContent = KIND_LABEL[m.kind] || m.kind || "—";
      top.appendChild(kindChip);

      var name = document.createElement("span");
      name.className = "msg-card__name";
      name.textContent = m.full_name || "—";
      top.appendChild(name);

      top.appendChild(statusSelect(MSG_STATUS_LABEL, m, "messages", renderMsgs));
      card.appendChild(top);

      // Деректер жолы
      var meta = document.createElement("div");
      meta.className = "msg-card__meta";

      var roleSpan = document.createElement("span");
      roleSpan.textContent = ROLE_LABEL[m.role] || m.role || "—";
      meta.appendChild(roleSpan);

      if (m.school) {
        var sc = document.createElement("span");
        sc.textContent = m.school;
        meta.appendChild(sc);
      }
      if (m.phone) {
        var ph = document.createElement("a");
        ph.href = telHref(m.phone);
        ph.textContent = m.phone;
        meta.appendChild(ph);
      }
      var dt = document.createElement("span");
      dt.textContent = fmtDate(m.created_at);
      meta.appendChild(dt);

      card.appendChild(meta);

      // Хат мәтіні
      var body = document.createElement("div");
      body.className = "msg-card__body";
      body.textContent = m.body || "";
      card.appendChild(body);

      box.appendChild(card);
    });
  }

  ["mq", "mf-kind", "mf-status"].forEach(function (id) {
    $(id).addEventListener("input", renderMsgs);
    $(id).addEventListener("change", renderMsgs);
  });

  // ── CSV жүктеу (Excel қазақша әріптерді дұрыс оқуы үшін BOM қосамыз) ──
  function download(name, lines) {
    var csv = lines.map(function (row) {
      return row.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(";");
    }).join("\r\n");

    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name + "-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  $("export-btn").addEventListener("click", function () {
    if (tab === "msgs") {
      var mLines = [["Түрі", "Аты-жөні", "Рөлі", "Мектебі", "Телефон", "Мәртебесі", "Келген күні", "Хат"]];
      filteredMsgs().forEach(function (m) {
        mLines.push([
          KIND_LABEL[m.kind] || m.kind || "",
          m.full_name || "",
          ROLE_LABEL[m.role] || m.role || "",
          m.school || "",
          m.phone || "",
          MSG_STATUS_LABEL[m.status || "new"] || "",
          fmtDate(m.created_at),
          m.body || "",
        ]);
      });
      download("qairaq-otinishter", mLines);
      return;
    }

    var lines = [["Тегі", "Аты", "Рөлі", "Сыныбы", "Мектебі", "Телефон", "Мәртебесі", "Тіркелген күні"]];
    filtered().forEach(function (r) {
      lines.push([
        r.last_name || "",
        r.first_name || "",
        ROLE_LABEL[r.role] || r.role || "",
        r.grade || "",
        r.school || "",
        r.phone || "",
        STATUS_LABEL[r.status || "new"] || "",
        fmtDate(r.created_at),
      ]);
    });
    download("qairaq-tirkelgender", lines);
  });

  // ── Бет ашылғанда: сессия бар ма? ───────────────────────────────
  setTab("regs");
  sb.auth.getSession().then(function (res) {
    var session = res && res.data ? res.data.session : null;
    if (session && session.user) showList(session.user.email);
    else showLogin();
  });
})();
