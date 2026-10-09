-- AfterBloom schema, part 8: patient cases (Challenge 2 - one case and one timeline per concern). Additive and safe to run more than once.
-- Run AFTER 007_signals.sql.
--
-- Related alerts for the same concern become ONE case, with a timeline of what changed, when, and which alerts triggered it.
-- A mother never sees cases or priorities: her home screen only learns "your care team is looking into this" (my_care_status below).
-- Nothing here closes a case by itself. Only a professional resolves one, and a signal that arrives within 7 days of a resolved case
-- reopens it instead of starting a new one.

create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  subject text not null default 'mother' check (subject in ('mother','baby')),
  concern text not null,
  title text not null,                                       -- plain words, e.g. "Possible high blood pressure after birth"
  status text not null default 'open' check (status in ('open','monitoring','resolved')),
  severity_peak text not null check (severity_peak in ('info','amber','red')),      -- the worst it has been; never lowered by the system
  severity_current text not null check (severity_current in ('info','amber','red')),
  priority text,                                             -- filled in by the priority workflow (next challenge)
  due_by timestamptz,                                        -- same
  owner_pro_id uuid references pros(id) on delete set null,  -- who the case was routed to when it opened (continuity of care); never moved automatically
  owner_reason jsonb,                                        -- why: returning patient, least busy, on call ...
  acknowledged_at timestamptz,
  trigger_signal_id uuid references signals(id) on delete set null,
  opened_at timestamptz not null default now(),
  last_signal_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null,
  reopened_count integer not null default 0
);

-- one open case per mother, subject and concern. If two alerts race, the second insert hits this index and joins the existing case.
create unique index if not exists one_open_case on cases (mother_id, subject, concern) where status <> 'resolved';
create index if not exists cases_mother on cases (mother_id, status);
create index if not exists cases_owner on cases (owner_pro_id, status);

-- what happened to a case: opened, reopened, severity raised, a link confirmed or separated, resolved
create table if not exists case_events (
  id bigserial primary key,
  case_id uuid not null references cases(id) on delete cascade,
  at timestamptz not null default now(),
  type text not null,
  actor_role text,
  actor_id uuid,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists case_events_case on case_events (case_id, at);

-- when each professional last looked at a case, so the page can say "3 new since you last looked"
create table if not exists case_views (
  case_id uuid not null references cases(id) on delete cascade,
  pro_id uuid not null references pros(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (case_id, pro_id)
);

-- signals point at their case
do $$ begin
  alter table signals add constraint signals_case_fk foreign key (case_id) references cases(id) on delete set null;
exception when duplicate_object then null; end $$;
create index if not exists signals_case on signals (case_id, observed_at);

-- Only the server reads and writes these (after the shared consent check).
alter table cases enable row level security;
alter table case_events enable row level security;
alter table case_views enable row level security;
revoke all on cases, case_events, case_views from anon, authenticated;
revoke all on sequence case_events_id_seq from anon, authenticated;

-- The only thing a mother learns about cases: whether her care team is looking into something. No case, no concern, no priority.
create or replace function my_care_status() returns boolean language sql stable security definer set search_path = public as $$
  select app_role() = 'mother' and exists (select 1 from cases where mother_id = auth.uid() and status <> 'resolved')
$$;
revoke execute on function my_care_status() from public, anon;
grant execute on function my_care_status() to authenticated;

notify pgrst, 'reload schema';
