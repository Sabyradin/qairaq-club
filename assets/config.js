// Supabase байланыс параметрлері.
//
// ҚАЙДАН АЛАСЫЗ:
//   supabase.com → жобаңыз → Project Settings → API
//   • Project URL        → SUPABASE_URL
//   • Project API keys → anon / public → SUPABASE_ANON_KEY
//
// anon кілтті жариялаудан қорықпаңыз: ол әдейі браузерге арналған. Деректерді
// кім оқи алатынын Supabase-тегі RLS ережелері шешеді (supabase-schema.sql
// файлын қараңыз): бөтен адам тек тіркеле алады, тізімді тек әкімші көреді.

window.QAIRAQ_CONFIG = {
  SUPABASE_URL: "https://zeeasupbvotuytngpvjo.supabase.co",
  // «publishable» кілт — браузерге АРНАЙЫ жасалған ашық кілт.
  // Құпия (sb_secret_…) кілтті мұнда ЕШҚАШАН қоймаңыз: ол RLS қорғанысын
  // айналып өтеді де, сайтқа кірген кез келген адам бүкіл деректі
  // оқып, өшіре алатын болады.
  SUPABASE_ANON_KEY: "sb_publishable_bf-qHMTcFOrjXBAvlV4_tA_ydVrpm0z",

  // Байланыс деректері (сайтта көрсетіледі)
  PHONE: "+7 771 323 8133",

  // Qairaq Instagram парақшасы (бақылау параметрлерінсіз таза сілтеме).
  INSTAGRAM_URL: "https://www.instagram.com/qa1raq",
};
