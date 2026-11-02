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
  SUPABASE_URL: "",       // мыс. "https://abcdefgh.supabase.co"
  SUPABASE_ANON_KEY: "",  // мыс. "eyJhbGciOi..."

  // Байланыс деректері (сайтта көрсетіледі)
  PHONE: "+7 771 323 8133",

  // Qairaq Instagram парақшасы (бақылау параметрлерінсіз таза сілтеме).
  INSTAGRAM_URL: "https://www.instagram.com/qa1raq",
};
