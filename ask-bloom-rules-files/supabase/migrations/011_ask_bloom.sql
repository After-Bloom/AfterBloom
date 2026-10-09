-- 011_ask_bloom.sql: Ask Bloom without AI. Safe to run again.
-- 1. ask_questions: a question she CHOSE to send to her care team (encrypted), and the professional's reply (encrypted).
-- 2. ask_gaps:      questions with no reviewed answer that she CHOSE to share, with no name, no id and only the day.
-- 3. ask_stats:     anonymous daily counts (which topics are asked, how often there is no answer). No text at all.
-- Use the next free migration number if 011 is taken.

-- ---------- 1. questions to a human ----------
create table if not exists ask_questions (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  pro_id uuid references pros(id) on delete set null,          -- who it was sent to
  question_enc text not null,                                   -- AES-256-GCM, same server key as EPDS answers
  lang text not null default 'en' check (lang in ('en','hi')),
  near_topic text,                                              -- closest library topic, if any (helps the professional)
  status text not null default 'open' check (status in ('open','answered','closed')),
  reply_enc text,
  replied_by uuid references profiles(id) on delete set null,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ask_questions_by_mother on ask_questions (mother_id, created_at desc);
create index if not exists ask_questions_by_pro on ask_questions (pro_id, status, created_at desc);
alter table ask_questions enable row level security;
-- Read: the mother, or a professional matched to her. Text is encrypted, so the server routes decrypt it.
-- There are no insert or update policies: every write goes through a server route that checks who is asking.
drop policy if exists askq_read on ask_questions;
create policy askq_read on ask_questions for select to authenticated using (mother_id = auth.uid() or is_matched_pro(mother_id));

-- ---------- 2. anonymous gaps ----------
create table if not exists ask_gaps (
  id bigserial primary key,
  question text not null check (char_length(question) <= 200),  -- scrubbed on the server: numbers, emails and phone numbers removed
  lang text not null default 'en' check (lang in ('en','hi')),
  near_topic text,
  day date not null default current_date,                       -- the day only, never the time, so it cannot be matched to a person
  status text not null default 'new' check (status in ('new','planned','done','ignored'))
);
create index if not exists ask_gaps_day on ask_gaps (day desc);
alter table ask_gaps enable row level security;
-- No policies at all: nobody can read or write it from the browser. Only the server (service key) can, after checking the role.

-- ---------- 3. anonymous counts ----------
create table if not exists ask_stats (
  day date not null default current_date,
  topic text not null,                                          -- topic id, or '-' when nothing matched
  outcome text not null check (outcome in ('answer','picked','multi','clarify','maybe','none','human','browse')),
  n integer not null default 0,
  primary key (day, topic, outcome)
);
alter table ask_stats enable row level security;

create or replace function bump_ask_stat(p_topic text, p_outcome text) returns void
language sql security definer set search_path = public as $$
  insert into ask_stats (day, topic, outcome, n) values (current_date, left(coalesce(p_topic, '-'), 40), p_outcome, 1)
  on conflict (day, topic, outcome) do update set n = ask_stats.n + 1;
$$;
revoke all on function bump_ask_stat(text, text) from public;
grant execute on function bump_ask_stat(text, text) to authenticated;

-- live updates: a reply appears on her Ask Bloom page without a reload
do $$ begin alter publication supabase_realtime add table ask_questions; exception when duplicate_object then null; end $$;
