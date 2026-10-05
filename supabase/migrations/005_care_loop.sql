-- AfterBloom schema, part 5: the care loop. Safe to run more than once. Run AFTER 001 to 004.
-- After a RED or AMBER result the app follows up: "did you get the care you needed?". If she does not answer, her professional
-- (and, only if she agreed, her family) is told. Rows are written by the server only; a mother reads her own, her matched professional reads them too.

create table if not exists care_loops (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  level text not null check (level in ('RED','AMBER')),
  reason text not null default '',                       -- symptom labels only, never what she typed
  status text not null default 'open' check (status in ('open','got_care','better','cant_reach','worse','no_answer')),
  check_at timestamptz not null,                         -- when the app asks her
  answered_at timestamptz,
  escalated_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists care_loops_mother_status on care_loops (mother_id, status);

alter table care_loops enable row level security;
drop policy if exists care_loops_read on care_loops;
create policy care_loops_read on care_loops for select to authenticated using (mother_id = auth.uid() or is_matched_pro(mother_id));

notify pgrst, 'reload schema';
