// Qairaq клубы — басты беттің логикасы:
// байланыс блогы, тіркелу формасы, өтініш/арыз/пікір формасы,
// айналдырғанда пайда болу және мәзірдегі белсенді бөлім.
(function () {
  "use strict";

  var cfg = window.QAIRAQ_CONFIG || {};

  // ── Байланыс блогы ──────────────────────────────────────────────
  var phone     = cfg.PHONE || "";
  var phoneText = document.getElementById("phone-text");
  var phoneLink = document.getElementById("phone-link");
  var footPhone = document.getElementById("foot-phone");

  function telHref(v) { return "tel:" + String(v).replace(/[^\d+]/g, ""); }

  if (phone) {
    phoneText.textContent = phone;
    phoneLink.href = telHref(phone);
    if (footPhone) {
      footPhone.textContent = phone;
      footPhone.href = telHref(phone);
    }
  } else {
    phoneLink.hidden = true;
    if (footPhone) footPhone.closest("li").hidden = true;
  }

  // Instagram сілтемесі config.js-те толтырылғанда ғана көрінеді
  var ig = (cfg.INSTAGRAM_URL || "").trim();
  if (ig) {
    var igLink = document.getElementById("ig-link");
    igLink.href = ig;
    igLink.hidden = false;
    document.getElementById("ig-pending").hidden = true;

    var footIg = document.getElementById("foot-ig");
    if (footIg) { footIg.href = ig; footIg.hidden = false; }
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
    // Мұғалімге «оқитын» емес, «жұмыс істейтін» мектебі.
    // Жұлдызшаны жоғалтып алмау үшін мәтін түйінін ғана ауыстырамыз.
    schoolLbl.firstChild.nodeValue = isStudent
      ? "5. Оқитын мектебі "
      : "4. Жұмыс істейтін мектебі ";
  }

  form.querySelectorAll('input[name="role"]').forEach(function (r) {
    r.addEventListener("change", syncRole);
  });
  syncRole();

  function show(kind, text) {
    msg.className = kind ? "msg is-" + kind : "msg";
    msg.textContent = text || "";
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

  var NO_DB = "Сайт дерекқорға әлі қосылмаған. assets/config.js ішіне Supabase мекенжайы мен кілтін қойыңыз.";

  // ── Тіркелуді жіберу ────────────────────────────────────────────
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
    if (!sb) { show("bad", NO_DB); return; }

    btn.disabled = true;
    btn.textContent = "Жіберілуде...";
    show("", "");

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
    if (!sb) { mShow("bad", NO_DB); return; }

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

  // ── Айналдырғанда пайда болу ────────────────────────────────────
  var reveals = document.querySelectorAll(".reveal");
  if (!window.IntersectionObserver) {
    // Ескі браузер — бірден көрсетеміз, жасырып қалмайық
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "80px 0px 80px 0px", threshold: .02 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  // ── Мәзір: қай бөлімде тұрғанымызды белгілеу ────────────────────
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("#nav a[href^='#']"));
  var targets = navLinks
    .map(function (a) {
      var el = document.getElementById(a.getAttribute("href").slice(1));
      return el ? { link: a, el: el } : null;
    })
    .filter(Boolean);

  function markActive() {
    // Экранның жоғарғы үштен біріне ең жақын бөлімді белсенді етеміз
    var line = window.scrollY + window.innerHeight * 0.3;
    var best = targets[0];
    targets.forEach(function (t) {
      if (t.el.offsetTop <= line) best = t;
    });
    // Беттің ең түбіне жеткенде — соңғы бөлім
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) {
      best = targets[targets.length - 1];
    }
    if (!best || best.link.classList.contains("is-active")) return;
    navLinks.forEach(function (a) { a.classList.remove("is-active"); });
    best.link.classList.add("is-active");
    // Кіші экранда мәзір жанынан сырғиды — белсенді тармақ көрініп тұрсын
    if (best.link.scrollIntoView) {
      best.link.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  if (targets.length) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { markActive(); ticking = false; });
    }, { passive: true });
    markActive();
  }
})();
