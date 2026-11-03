-- ҚАУІПСІЗДІК ЕРЕЖЕЛЕРІН ҚОСУ (RLS policies)
--
-- Бұл файл кесте бұрыннан жасалған, бірақ ережелері қосылмаған жағдайға
-- арналған. Белгісі: сайттағы форма «Жіберілмеді: new row violates
-- row-level security policy» деп қате береді.
--
-- ҚАЛАЙ ҚОЛДАНУ: Supabase → SQL Editor → New query → осы файлдың БӘРІН
-- көшіріп қойыңыз → Run. «Success» деп шықса, бәрі дайын.
--
-- Қайта-қайта орындауға болады — ештеңе бұзылмайды.

alter table registrations enable row level security;

drop policy if exists "anyone can register" on registrations;
drop policy if exists "admins can read"     on registrations;
drop policy if exists "admins can update"   on registrations;
drop policy if exists "admins can delete"   on registrations;

-- 1) Тіркелу: сайтқа кірген кез келген адам ЖАЗА алады
create policy "anyone can register" on registrations
  for insert to anon, authenticated
  with check (true);

-- 2) Тізімді ОҚУ: тек кірген әкімші
create policy "admins can read" on registrations
  for select to authenticated
  using (true);

-- 3) Мәртебені ӨЗГЕРТУ: тек әкімші
create policy "admins can update" on registrations
  for update to authenticated
  using (true) with check (true);

-- 4) ӨШІРУ: тек әкімші
create policy "admins can delete" on registrations
  for delete to authenticated
  using (true);

-- Тексеру: төмендегі сұрау 4 жол қайтаруы тиіс
select policyname, cmd, roles
from pg_policies
where tablename = 'registrations'
order by policyname;
