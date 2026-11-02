// Qairaq клубы — әкімші панелі: кіру, тізім, мәртебе өзгерту, CSV.
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

  var rows = [];   // серверден келген толық тізім

  // ── Көріністі ауыстыру ──────────────────────────────────────────
  function showLogin() { loginView.hidden = false; listView.hidden = true; }
  function showList(email) {
    loginView.hidden = true;
    listView.hidden = false;
    document.getElementById("who").textContent = email ? email + " ретінде кірдіңіз" : "";
    load();
  }

  function note(id, kind, text) {
    var el = document.getElementById(id);
    el.className = kind ? "msg is-" + kind : "msg";
    el.textContent = text || "";
  }

  // ── Кіру / шығу ─────────────────────────────────────────────────
  document.getElementById("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = document.getElementById("login-btn");
    btn.disabled = true; btn.textContent = "Кіруде...";
    note("login-msg", "", "");

    sb.auth.signInWithPassword({
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
    }).then(function (res) {
      btn.disabled = false; btn.textContent = "Кіру";
      if (res.error) { note("login-msg", "bad", "Кіру сәтсіз: " + res.error.message); return; }
      showList(res.data && res.data.user ? res.data.user.email : "");
    });
  });

  document.getElementById("logout-btn").addEventListener("click", function () {
    sb.auth.signOut().then(showLogin);
  });

  // ── Деректерді жүктеу ───────────────────────────────────────────
  function load() {
    note("list-msg", "", "");
    sb.from("registrations")
      .select("*")
      .order("created_at", { ascending: false })
      .then(function (res) {
        if (res.error) { note("list-msg", "bad", "Жүктеу қатесі: " + res.error.message); return; }
        rows = res.data || [];
        render();
      });
  }

  document.getElementById("refresh-btn").addEventListener("click", load);

  // ── Сүзгі + кесте ───────────────────────────────────────────────
  function filtered() {
    var q      = document.getElementById("q").value.trim().toLowerCase();
    var role   = document.getElementById("f-role").value;
    var status = document.getElementById("f-status").value;

    return rows.filter(function (r) {
      if (role && r.role !== role) return false;
      if (status && (r.status || "new") !== status) return false;
      if (q) {
        var hay = [r.last_name, r.first_name, r.school, r.grade].join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

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

  function render() {
    var list = filtered();
    var tbody = document.getElementById("rows");
    tbody.innerHTML = "";

    // Статистика — сүзгіге тәуелсіз, жалпы сан
    document.getElementById("st-total").textContent   = rows.length;
    document.getElementById("st-student").textContent = rows.filter(function (r) { return r.role === "student"; }).length;
    document.getElementById("st-teacher").textContent = rows.filter(function (r) { return r.role === "teacher"; }).length;
    document.getElementById("st-new").textContent     = rows.filter(function (r) { return (r.status || "new") === "new"; }).length;

    document.getElementById("empty").hidden = list.length > 0;

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
      cell(fmtDate(r.created_at), "num");

      // Мәртебе — орнында өзгертіледі
      var stTd = document.createElement("td");
      var sel = document.createElement("select");
      sel.className = "status-select";
      Object.keys(STATUS_LABEL).forEach(function (key) {
        var opt = document.createElement("option");
        opt.value = key;
        opt.textContent = STATUS_LABEL[key];
        if ((r.status || "new") === key) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener("change", function () {
        var prev = r.status || "new";
        sel.disabled = true;
        sb.from("registrations").update({ status: sel.value }).eq("id", r.id).then(function (res) {
          sel.disabled = false;
          if (res.error) {
            sel.value = prev;
            note("list-msg", "bad", "Сақталмады: " + res.error.message);
          } else {
            r.status = sel.value;
            note("list-msg", "ok", "Мәртебе сақталды.");
            render();
          }
        });
      });
      stTd.appendChild(sel);
      tr.appendChild(stTd);

      tbody.appendChild(tr);
    });
  }

  ["q", "f-role", "f-status"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", render);
    document.getElementById(id).addEventListener("change", render);
  });

  // ── CSV жүктеу (Excel қазақша әріптерді дұрыс оқуы үшін BOM қосамыз) ──
  document.getElementById("export-btn").addEventListener("click", function () {
    var list = filtered();
    var head = ["Тегі", "Аты", "Рөлі", "Сыныбы", "Мектебі", "Мәртебесі", "Тіркелген күні"];
    var lines = [head];

    list.forEach(function (r) {
      lines.push([
        r.last_name || "",
        r.first_name || "",
        ROLE_LABEL[r.role] || r.role || "",
        r.grade || "",
        r.school || "",
        STATUS_LABEL[r.status || "new"] || "",
        fmtDate(r.created_at),
      ]);
    });

    var csv = lines.map(function (row) {
      return row.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(";");
    }).join("\r\n");

    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "qairaq-tirkelgender-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  });

  // ── Бет ашылғанда: сессия бар ма? ───────────────────────────────
  sb.auth.getSession().then(function (res) {
    var session = res && res.data ? res.data.session : null;
    if (session && session.user) showList(session.user.email);
    else showLogin();
  });
})();
