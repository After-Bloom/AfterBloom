-- AfterBloom schema, part 3: feature additions and hardening. Safe to run more than once. Run AFTER 001 and 002.

-- ---------- hardening: functions are callable by signed-in people only ----------
revoke execute on function join_family(text), join_circle(uuid, text), create_post(uuid, text, text, boolean, text),
  log_view(uuid, text), book_session(uuid, timestamptz), ensure_matched_pro(), asha_overview(), hospital_stats() from public;
revoke execute on function app_role(), is_staff(), is_matched_pro(uuid), pro_can_see_health(uuid), is_family_of(uuid), family_sees_trends(uuid), in_circle(uuid) from public;
grant execute on function app_role(), is_staff(), is_matched_pro(uuid), pro_can_see_health(uuid), is_family_of(uuid), family_sees_trends(uuid), in_circle(uuid) to authenticated;

-- ---------- mothers: baby's sex (for the right growth reference) and a phone number so a callback can actually call ----------
alter table mothers add column if not exists baby_sex text check (baby_sex in ('boy','girl'));
alter table mothers add column if not exists phone text;

-- ---------- bookings: nobody can double-book a professional ----------
create unique index if not exists uq_booking_slot on bookings (pro_id, starts_at) where status = 'booked';

-- times already taken (just the times, never who booked them)
create or replace function pro_booked_slots(p_pro uuid) returns setof timestamptz language sql stable security definer set search_path = public as $$
  select starts_at from bookings where pro_id = p_pro and status = 'booked' and starts_at > now() - interval '1 hour'
$$;
revoke execute on function pro_booked_slots(uuid) from public;
grant execute on function pro_booked_slots(uuid) to authenticated;

-- ---------- Bloom Circles: monthly expert Q&A sessions ----------
create table if not exists circle_events (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  host_id uuid not null references pros(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  room text not null default encode(gen_random_bytes(6), 'hex'),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_events_circle on circle_events (circle_id, starts_at);
alter table circle_events enable row level security;
drop policy if exists events_read on circle_events;
create policy events_read on circle_events for select to authenticated using (in_circle(circle_id) or is_staff());
drop policy if exists events_staff on circle_events;
create policy events_staff on circle_events for all to authenticated using (is_staff()) with check (is_staff());

-- ---------- ASHA home visits (HBNC schedule: days 3, 7, 14, 21, 28, 42) ----------
create table if not exists asha_visits (
  id uuid primary key default gen_random_uuid(),
  asha_id uuid not null references profiles(id) on delete cascade,
  mother_id uuid not null references mothers(id) on delete cascade,
  day smallint not null check (day in (3, 7, 14, 21, 28, 42)),
  done_on date not null default current_date,
  mood_screen_done boolean not null default false,   -- depression screening is not part of standard HBNC visits; this records when she did it
  created_at timestamptz not null default now(),
  unique (asha_id, mother_id, day)
);
alter table asha_visits enable row level security;
drop policy if exists visits_asha on asha_visits;
create policy visits_asha on asha_visits for all to authenticated
  using (asha_id = auth.uid() and exists (select 1 from asha_assignments a where a.asha_id = auth.uid() and a.mother_id = asha_visits.mother_id))
  with check (asha_id = auth.uid() and exists (select 1 from asha_assignments a where a.asha_id = auth.uid() and a.mother_id = asha_visits.mother_id));
drop policy if exists visits_mother on asha_visits;
create policy visits_mother on asha_visits for select to authenticated using (mother_id = auth.uid());
grant select, insert, update, delete on asha_visits, circle_events to authenticated;

-- the ASHA overview now also reports which HBNC visits are done
create or replace function asha_visits_done(p_mother uuid) returns table (day smallint) language sql stable security definer set search_path = public as $$
  select v.day from asha_visits v where v.asha_id = auth.uid() and v.mother_id = p_mother
$$;
revoke execute on function asha_visits_done(uuid) from public;
grant execute on function asha_visits_done(uuid) to authenticated;

-- ---------- clinical settings the admin can edit and sign off ----------
insert into clinical_config (key, value) values ('triage_overrides', '{}') on conflict (key) do nothing;

notify pgrst, 'reload schema';
