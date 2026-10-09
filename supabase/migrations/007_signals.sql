-- AfterBloom schema, part 7: signals (Challenge 1 - identify and represent related alerts). Additive and safe to run more than once.
-- Run AFTER 001 to 006. (008 cases and 009 actions are added in the next challenges.)
--
-- Every alert the app raises (symptom checker, check-in, blood pressure trend, EPDS, care loop, overdue callback, self-harm wording)
-- is also saved here in one standard shape, with a label saying how it relates to the mother's earlier alerts:
-- a repeat, a follow-up, also reported by another source, the same concern, possibly related, or new.
-- The existing flags and alerts tables are NOT replaced: the old dashboard keeps working next to this.
-- Typed text is never stored: only a code, a concern, a severity and a small structured value (for example a BP reading).

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  subject text not null default 'mother' check (subject in ('mother','baby')),
  source text not null,                                  -- symptom_checker | checkin | bp_trend | epds | care_loop | callback | circle_post | partner_screen
  code text not null,                                    -- e.g. heavy_bleeding, bp_raised, epds_probable
  concern text not null,                                 -- HYPERTENSIVE | HAEMORRHAGE | INFECTION | CLOT_RISK | MOOD | SELF_HARM | NEWBORN | ENGAGEMENT | GENERAL
  severity text not null check (severity in ('info','amber','red')),
  value jsonb,                                           -- structured only, e.g. {"sys":148,"dia":94} or {"total":11}
  observed_at timestamptz not null default now(),
  origin_table text not null,                            -- the row this came from (symptom_logs, checkins, epds_results, flags, care_loops, ...)
  origin_id uuid not null,
  relation text not null default 'NEW' check (relation in ('NEW','RELATED','POSSIBLY_RELATED','DUPLICATE','CORROBORATES','FOLLOW_UP')),
  relation_detail jsonb not null default '{}'::jsonb,   -- the "why linked" facts; the screen turns them into a sentence in her language
  related_to uuid references signals(id) on delete set null,
  link_status text not null default 'auto' check (link_status in ('auto','suggested','confirmed','unlinked')),
  notified boolean not null default true,                -- true = the care team was told; false = held back because it repeats a known concern
  case_id uuid,                                          -- filled in by the case layer (next challenge)
  created_at timestamptz not null default now()
);

-- re-saving a check-in updates the same signal instead of creating a duplicate
create unique index if not exists signals_origin_uq on signals (origin_table, origin_id, code);
create index if not exists signals_mother_concern on signals (mother_id, concern, observed_at desc);
create index if not exists signals_mother_time on signals (mother_id, observed_at desc);

-- Only the server reads and writes signals (after one shared consent check). No policy = no direct access for anyone signed in.
alter table signals enable row level security;
revoke all on signals from anon, authenticated;

notify pgrst, 'reload schema';
