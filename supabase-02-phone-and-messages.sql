-- 2-ҚАДАМ: телефон нөмірі + өтініш/арыз/пікір бөлімі
--
-- ҚАЛАЙ ҚОЛДАНУ: Supabase → SQL Editor → New query → осы файлдың БӘРІН
-- көшіріп қойыңыз → Run. «Success» деп шықса, бәрі дайын.
--
-- Қайта-қайта орындауға болады — ештеңе бұзылмайды, дерек жоғалмайды.
-- Бұл файл 1-қадамдағы ережелерді де қайта орнатады, сондықтан тіркелу
-- «row-level security policy» қатесін беріп тұрса, осы файл соны да түзейді.

-- ── 1) Тіркелуге телефон нөмірі ──────────────────────────────────────
alter table registrations add column if not exists phone text;

-- ── 2) Өтініш / арыз / пікір кестесі ─────────────────────────────────
create table if not exists messages (
  id          bigserial primary key,
  kind        text        not null default 'feedback'
              check (kind in ('request', 'complaint', 'feedback')),
  role        text        not null check (role in ('student', 'teacher')),
  full_name   text        not null,
  phone       text,
  school      text,
  body        text        not null,
  status      text        not null default 'new'
              check (status in ('new', 'reviewing', 'accepted', 'rejected')),
  admin_note  text,
  created_at  timestamptz not null default now()
);

create index if not exists ix_messages_created on messages (created_at desc);
create index if not exists ix_messages_kind    on messages (kind);
create index if not exists ix_messages_status  on messages (status);

-- ── 3) Қауіпсіздік ережелері (екі кестеге де) ────────────────────────
alter table registrations enable row level security;
alter table messages      enable row level security;

drop policy if exists "anyone can register" on registrations;
drop policy if exists "admins can read"     on registrations;
drop policy if exists "admins can update"   on registrations;
drop policy if exists "admins can delete"   on registrations;

create policy "anyone can register" on registrations
  for insert to anon, authenticated with check (true);
create policy "admins can read" on registrations
  for select to authenticated using (true);
create policy "admins can update" on registrations
  for update to authenticated using (true) with check (true);
create policy "admins can delete" on registrations
  for delete to authenticated using (true);

drop policy if exists "anyone can send"      on messages;
drop policy if exists "admins can read msg"  on messages;
drop policy if exists "admins can update msg" on messages;
drop policy if exists "admins can delete msg" on messages;

-- Өтінішті кез келген адам жібере алады
create policy "anyone can send" on messages
  for insert to anon, authenticated with check (true);
-- Оқу / өңдеу / өшіру — тек кірген әкімші
create policy "admins can read msg" on messages
  for select to authenticated using (true);
create policy "admins can update msg" on messages
  for update to authenticated using (true) with check (true);
create policy "admins can delete msg" on messages
  for delete to authenticated using (true);

-- ── Тексеру: 8 жол қайтуы тиіс (әр кестеге 4-тен) ────────────────────
select tablename, policyname, cmd, roles
from pg_policies
where tablename in ('registrations', 'messages')
order by tablename, policyname;
