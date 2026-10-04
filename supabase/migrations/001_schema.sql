-- AfterBloom schema, part 1 of 2: tables. Safe to run more than once.
-- Paste this whole file into Supabase > SQL Editor > New query > Run. Then run 002_security.sql.
create extension if not exists pgcrypto;

-- ---------- places and circles ----------
create table if not exists hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  partner boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  lang text not null default 'en',
  cohort_month date,                 -- first day of the birth month this circle is for
  mentor_id uuid,                    -- "Bloom Buddy" (set after profiles exist)
  created_at timestamptz not null default now()
);

-- ---------- people ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'mother' check (role in ('mother','family','pro','moderator','asha','admin')),
  full_name text not null default '',
  lang text not null default 'en' check (lang in ('en','hi')),
  city text,
  hospital_id uuid references hospitals(id),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists mothers (
  id uuid primary key references profiles(id) on delete cascade,
  baby_name text not null default '',
  birth_date date not null default current_date,
  delivery text not null default 'Normal',
  city text,
  hospital_id uuid references hospitals(id),
  emergency_contact_name text,
  emergency_contact_phone text,
  consent_share_pro boolean not null default true,
  consent_emergency_alert boolean not null default false,
  consent_family_note boolean not null default false,
  consent_cloud_match boolean,        -- null = not asked yet
  neutral_notifications boolean not null default true,
  pmmvy_enrolled boolean not null default false,
  circle_id uuid references circles(id),
  created_at timestamptz not null default now()
);

alter table circles drop constraint if exists circles_mentor_fk;
alter table circles add constraint circles_mentor_fk foreign key (mentor_id) references profiles(id) on delete set null;

create table if not exists consent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  key text not null,
  value boolean not null,
  at timestamptz not null default now()
);

create table if not exists pros (
  id uuid primary key references profiles(id) on delete cascade,
  title text not null default 'Clinical psychologist',   -- Clinical psychologist | Counsellor | Psychiatrist | Gynaecologist | Lactation consultant | Paediatrician
  qualification text not null default '',
  reg_no text not null default '',                      -- RCI number or medical council number, shown on the profile
  langs text[] not null default '{English}',
  fee integer not null default 0,
  bio text not null default '',
  is_sample boolean not null default true,              -- clearly labelled "Sample profile" in the demo
  accepting boolean not null default true
);

create table if not exists pro_patients (
  pro_id uuid not null references pros(id) on delete cascade,
  mother_id uuid not null references mothers(id) on delete cascade,
  matched_at timestamptz not null default now(),
  primary key (pro_id, mother_id)
);

create table if not exists asha_assignments (
  asha_id uuid not null references profiles(id) on delete cascade,
  mother_id uuid not null references mothers(id) on delete cascade,
  primary key (asha_id, mother_id)
);

create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  name text not null,
  relation text not null default 'Family',
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8)),
  status text not null default 'invited' check (status in ('invited','active','removed')),
  sees_alerts boolean not null default true,
  sees_trends boolean not null default false,
  sees_weekly boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- health records ----------
create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  day date not null,
  mood smallint not null check (mood between 1 and 5),
  appetite smallint not null check (appetite between 1 and 5),
  sleep_hours numeric(3,1) not null,
  level text not null default 'GREEN' check (level in ('RED','AMBER','GREEN')),
  bp_sys integer,
  bp_dia integer,
  reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (mother_id, day)
);

-- Typed symptom text is never stored: only the matched labels and the level.
create table if not exists symptom_logs (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  level text not null check (level in ('RED','AMBER','GREEN')),
  labels text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- answers_enc is AES-256-GCM encrypted by the server before it is stored (extra encryption for screening answers).
create table if not exists epds_results (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  total smallint not null check (total between 0 and 30),
  band text not null check (band in ('low','possible','probable')),
  self_harm boolean not null default false,
  answers_enc text,
  created_at timestamptz not null default now()
);

create table if not exists flags (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  kind text not null check (kind in ('q10','red','epds','selfharm')),
  text text not null default '',
  resolved boolean not null default false,
  due_at timestamptz not null default now(),
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- In-app notifications (also delivered as web push). Wording stays neutral when the mother asks for it.
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,   -- recipient
  mother_id uuid references mothers(id) on delete cascade,
  kind text not null default 'info',   -- emergency | missed_checkin | callback | support | info
  title text not null,
  body text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  pro_id uuid not null references pros(id) on delete cascade,
  starts_at timestamptz not null,
  room text not null default encode(gen_random_bytes(6), 'hex'),
  status text not null default 'booked' check (status in ('booked','done','cancelled')),
  created_at timestamptz not null default now()
);

-- Every time a professional opens a mother's record, a row is written here (kept at least a year).
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  actor_name text not null default '',
  mother_id uuid references mothers(id) on delete cascade,
  action text not null,
  at timestamptz not null default now()
);

-- ---------- baby ----------
create table if not exists baby_vaccines (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  vaccine_id text not null,
  done_on date not null default current_date,
  unique (mother_id, vaccine_id)
);
create table if not exists baby_growth (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  on_date date not null default current_date,
  weight_kg numeric(4,2),
  length_cm numeric(4,1),
  created_at timestamptz not null default now()
);
create table if not exists baby_milestones (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  milestone_id text not null,
  done_on date not null default current_date,
  unique (mother_id, milestone_id)
);
create table if not exists benefit_steps (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  step text not null,
  done_on date not null default current_date,
  unique (mother_id, step)
);

-- ---------- family circle ----------
create table if not exists night_shifts (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  day date not null,
  slot text not null check (slot in ('10pm','1am','4am')),
  assignee text not null default '',
  assignee_user uuid references profiles(id) on delete set null,
  unique (mother_id, day, slot)
);
create table if not exists partner_screens (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  by_user uuid references profiles(id) on delete set null,
  yes_count smallint not null,
  answers smallint[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- Bloom Circles ----------
create table if not exists circle_members (
  circle_id uuid not null references circles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  alias text not null,
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
-- posts carry only an alias. Who wrote a post lives in post_authors, visible to the author and moderators only.
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  alias text not null,
  anon boolean not null default false,
  topic text not null default 'General',
  text text not null check (char_length(text) between 1 and 1000),
  note text,                           -- automatic "please check this with your doctor" note
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists post_authors (
  post_id uuid primary key references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade
);
create table if not exists mod_queue (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  circle_id uuid not null references circles(id) on delete cascade,
  reason text not null,
  done boolean not null default false,
  handled_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- reports, push, clinical settings ----------
create table if not exists weekly_reports (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  week_start date not null,
  payload jsonb not null default '{}',
  family_note_sent boolean not null default false,
  created_at timestamptz not null default now(),
  unique (mother_id, week_start)
);
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
-- Clinician-editable settings (EPDS cut-offs, triage overrides) with a sign-off record.
create table if not exists clinical_config (
  key text primary key,
  value jsonb not null,
  version integer not null default 1,
  signed_off_by text,
  signed_off_at timestamptz,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

-- ---------- indexes ----------
create index if not exists idx_checkins_mother on checkins (mother_id, day desc);
create index if not exists idx_symptom_logs_mother on symptom_logs (mother_id, created_at desc);
create index if not exists idx_epds_mother on epds_results (mother_id, created_at desc);
create index if not exists idx_flags_mother on flags (mother_id, resolved, created_at desc);
create index if not exists idx_alerts_user on alerts (user_id, read, created_at desc);
create index if not exists idx_bookings_pro on bookings (pro_id, starts_at);
create index if not exists idx_bookings_mother on bookings (mother_id, starts_at);
create index if not exists idx_audit_mother on audit_log (mother_id, at desc);
create index if not exists idx_posts_circle on posts (circle_id, created_at);
create index if not exists idx_family_mother on family_members (mother_id);
create index if not exists idx_family_user on family_members (user_id);
create index if not exists idx_pro_patients_mother on pro_patients (mother_id);

-- ---------- defaults ----------
insert into clinical_config (key, value) values
  ('epds', '{"possible": 10, "probable": 13}'),
  ('callback_hours', '{"urgent": 0, "elevated": 48}')
on conflict (key) do nothing;

insert into hospitals (id, name, city, partner) values
  ('00000000-0000-0000-0000-0000000000a1', 'Sample Maternity Hospital', 'Delhi', true)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
