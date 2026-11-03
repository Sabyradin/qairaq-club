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

  // Телефон: пішімге қатаң талап қоймаймыз (+7, 8, бос орын, сызықша —
  // бәрі жарайды), тек сан саны жеткілікті ме, соны тексереміз.
  function isPhoneOk(value) {
    return (String(value || "").replace(/\D/g, "")).length >= 10;
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
      phone:      form.phone.value.trim(),
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
    if (!isPhoneOk(data.phone)) {
      show("bad", "Телефон нөміріңізді толық жазыңыз (кемінде 10 сан).");
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

  // ── Өтініш / арыз / пікір формасы ───────────────────────────────
  var mForm = document.getElementById("msg-form");
  var mBtn  = document.getElementById("msg-btn");
  var mMsg  = document.getElementById("msg-result");

  function mShow(kind, text) {
    mMsg.className = kind ? "msg is-" + kind : "msg";
    mMsg.textContent = text || "";
  }

  function pickedValue(name, fallback) {
    var el = mForm.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : fallback;
  }

  mForm.addEventListener("submit", function (e) {
    e.preventDefault();

    var data = {
      kind:      pickedValue("kind", "feedback"),
      role:      pickedValue("m_role", "student"),
      full_name: mForm.m_name.value.trim(),
      phone:     mForm.m_phone.value.trim(),
      school:    mForm.m_school.value.trim() || null,
      body:      mForm.m_body.value.trim(),
    };

    if (!data.full_name) { mShow("bad", "Аты-жөніңізді жазыңыз."); return; }
    if (!isPhoneOk(data.phone)) {
      mShow("bad", "Телефон нөміріңізді толық жазыңыз (кемінде 10 сан).");
      return;
    }
    if (data.body.length < 10) {
      mShow("bad", "Хатыңызды толығырақ жазыңыз (кемінде 10 таңба).");
      return;
    }

    if (!sb) {
      mShow("bad", "Сайт дерекқорға әлі қосылмаған. assets/config.js ішіне Supabase мекенжайы мен кілтін қойыңыз.");
      return;
    }

    mBtn.disabled = true;
    mBtn.textContent = "Жіберілуде...";
    mShow("", "");

    sb.from("messages").insert([data]).then(function (res) {
      mBtn.disabled = false;
      mBtn.textContent = "Жіберу";
      if (res.error) {
        mShow("bad", "Жіберілмеді: " + res.error.message);
        return;
      }
      mForm.reset();
      mShow("ok", "Хатыңыз жіберілді. Рақмет! Әкімші оны міндетті түрде қарайды.");
    });
  });
})();
