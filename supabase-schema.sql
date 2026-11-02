-- Qairaq клубы — дерекқор схемасы (Supabase / PostgreSQL)
--
-- ҚАЛАЙ ҚОЛДАНУ:
--   supabase.com → жобаңыз → SQL Editor → осы файлдың бәрін көшіріп қойыңыз → Run
--
-- Қауіпсіздік қағидасы (RLS):
--   • кез келген адам ТІРКЕЛЕ алады (insert), бірақ
--   • тізімді тек кірген әкімші ОҚИ алады (select),
--   • өзгерту мен өшіру де тек әкімшіге рұқсат.
-- Сондықтан сайттағы anon кілт ашық тұрса да, бөтен адам тіркелгендердің
-- деректерін көре алмайды.

create table if not exists registrations (
  id          bigserial primary key,
  role        text        not null check (role in ('student', 'teacher')),
  first_name  text        not null,
  last_name   text        not null,
  grade       text,                     -- тек оқушыға толтырылады
  school      text        not null,
  status      text        not null default 'new'
              check (status in ('new', 'reviewing', 'accepted', 'rejected')),
  note        text,                     -- әкімшінің жазбасы
  created_at  timestamptz not null default now()
);

create index if not exists ix_registrations_created on registrations (created_at desc);
create index if not exists ix_registrations_role    on registrations (role);
create index if not exists ix_registrations_status  on registrations (status);

alter table registrations enable row level security;

-- Ескілерін қайта іске қосқанда қақтығыс болмас үшін алдымен өшіреміз
drop policy if exists "anyone can register"      on registrations;
drop policy if exists "admins can read"          on registrations;
drop policy if exists "admins can update"        on registrations;
drop policy if exists "admins can delete"        on registrations;

-- Тіркелу: сайтқа кірген кез келген адам (anon) ЖАЗА алады
create policy "anyone can register" on registrations
  for insert to anon, authenticated
  with check (true);

-- Оқу / өзгерту / өшіру: тек кірген пайдаланушы (әкімші)
create policy "admins can read" on registrations
  for select to authenticated using (true);

create policy "admins can update" on registrations
  for update to authenticated using (true) with check (true);

create policy "admins can delete" on registrations
  for delete to authenticated using (true);
