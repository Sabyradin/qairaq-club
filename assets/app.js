// Qairaq клубы — басты беттің логикасы: тіркелу формасы + байланыс блогы.
(function () {
  "use strict";

  var cfg = window.QAIRAQ_CONFIG || {};

  // ── Байланыс блогы ──────────────────────────────────────────────
  var phone = cfg.PHONE || "";
  var phoneText = document.getElementById("phone-text");
  var phoneLink = document.getElementById("phone-link");
  if (phone) {
    phoneText.textContent = phone;
    phoneLink.href = "tel:" + phone.replace(/[^\d+]/g, "");
  } else {
    phoneLink.hidden = true;
  }

  // Instagram сілтемесі config.js-те толтырылғанда ғана көрінеді
  var ig = (cfg.INSTAGRAM_URL || "").trim();
  if (ig) {
    var igLink = document.getElementById("ig-link");
    igLink.href = ig;
    igLink.hidden = false;
    document.getElementById("ig-pending").hidden = true;
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  // ── Рөлге қарай «сыныбы» өрісі ──────────────────────────────────
  var form      = document.getElementById("reg-form");
  var gradeWrap = document.getElementById("grade-field");
  var gradeInput= document.getElementById("grade");
  var schoolLbl = document.querySelector('label[for="school"]');
  var msg       = document.getElementById("form-msg");
  var btn       = document.getElementById("submit-btn");

  function currentRole() {
    var checked = form.querySelector('input[name="role"]:checked');
    return checked ? checked.value : "student";
  }

  function syncRole() {
    var isStudent = currentRole() === "student";
    gradeWrap.hidden = !isStudent;
    if (!isStudent) gradeInput.value = "";
    // Мұғалімге «оқитын» емес, «жұмыс істейтін» мектебі
    schoolLbl.textContent = isStudent ? "5. Оқитын мектебі" : "4. Жұмыс істейтін мектебі";
  }

  form.querySelectorAll('input[name="role"]').forEach(function (r) {
    r.addEventListener("change", syncRole);
  });
  syncRole();

  function show(kind, text) {
    msg.className = "msg is-" + kind;
    msg.textContent = text;
  }

  // ── Supabase ────────────────────────────────────────────────────
  var sb = null;
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  // ── Жіберу ──────────────────────────────────────────────────────
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var data = {
      role:       currentRole(),
      last_name:  form.last_name.value.trim(),
      first_name: form.first_name.value.trim(),
      grade:      gradeWrap.hidden ? null : (gradeInput.value.trim() || null),
      school:     form.school.value.trim(),
    };

    if (!data.last_name || !data.first_name) {
      show("bad", "Тегіңіз бен атыңызды толтырыңыз.");
      return;
    }
    if (!data.school) {
      show("bad", "Мектебіңізді жазыңыз.");
      return;
    }
    if (data.role === "student" && !data.grade) {
      show("bad", "Сыныбыңызды жазыңыз.");
      return;
    }

    if (!sb) {
      show("bad", "Сайт дерекқорға әлі қосылмаған. assets/config.js ішіне Supabase мекенжайы мен кілтін қойыңыз.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Жіберілуде...";
    show("ok", "");
    msg.className = "msg";

    sb.from("registrations").insert([data]).then(function (res) {
      btn.disabled = false;
      btn.textContent = "Жіберу";
      if (res.error) {
        show("bad", "Жіберілмеді: " + res.error.message);
        return;
      }
      form.reset();
      syncRole();
      show("ok", "Өтінішіңіз қабылданды. Рақмет! Жақын арада хабарласамыз.");
    });
  });
})();
