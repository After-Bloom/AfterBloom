-- AfterBloom schema, part 10: continuity of care (the right professional for each concern). Additive and safe to run more than once.
-- Run AFTER 001 to 007. (008 and 009 belong to the case and action layers that come in the next challenges.)
--
-- A returning mother is offered the doctor she already knows, and her alerts go to that doctor. New work goes to the least busy
-- colleague. Continuity decides WHO, never how urgent. She can change her preferred doctor at any time and the change is logged.

-- ---------- what each professional does, and how busy they may be ----------
alter table pros add column if not exists specialty text;                                  -- psychologist | gynaecologist | paediatrician | lactation
alter table pros add column if not exists on_duty boolean not null default true;
alter table pros add column if not exists max_open_cases integer not null default 5;      -- a soft limit: returning patients may go over it
alter table pros add column if not exists is_on_call boolean not null default false;      -- backup when everyone is at capacity

update pros set specialty = case
  when title in ('Clinical psychologist','Counsellor','Psychiatrist') then 'psychologist'
  when title = 'Gynaecologist' then 'gynaecologist'
  when title = 'Paediatrician' then 'paediatrician'
  when title = 'Lactation consultant' then 'lactation'
  else specialty end
where specialty is null;

-- ---------- her preferred professional for each specialty ----------
create table if not exists care_preferences (
  mother_id uuid not null references mothers(id) on delete cascade,
  specialty text not null,
  pro_id uuid not null references pros(id) on delete cascade,
  set_by text not null default 'booking' check (set_by in ('booking','mother')),
  set_at timestamptz not null default now(),
  primary key (mother_id, specialty)
);
alter table care_preferences enable row level security;
drop policy if exists care_prefs_read on care_preferences;
create policy care_prefs_read on care_preferences for select to authenticated using (mother_id = auth.uid() or is_matched_pro(mother_id));
grant select on care_preferences to authenticated;   -- written only through the functions below

-- ---------- the doctors she has already seen ----------
-- A session counts as completed when it is marked done, or when it was booked and its time passed more than an hour ago.
-- Looking at the list also keeps her preferred doctor up to date: after a completed session that professional becomes her
-- preferred one for that specialty, unless she has already chosen someone herself.
create or replace function my_doctors() returns table (
  pro_id uuid, name text, title text, specialty text, sessions integer, last_seen timestamptz, preferred boolean, accepting boolean
) language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if app_role() is distinct from 'mother' then return; end if;

  insert into care_preferences (mother_id, specialty, pro_id, set_by)
  select auth.uid(), s.specialty, s.pro_id, 'booking'
  from (
    select distinct on (t.specialty) t.specialty, t.pro_id
    from (
      select p.specialty, b.pro_id, count(*) as n, max(b.starts_at) as last_at
      from bookings b join pros p on p.id = b.pro_id
      where b.mother_id = auth.uid() and p.specialty is not null
        and (b.status = 'done' or (b.status = 'booked' and b.starts_at < now() - interval '1 hour'))
      group by p.specialty, b.pro_id
    ) t
    order by t.specialty, t.n desc, t.last_at desc
  ) s
  where not exists (select 1 from care_preferences c where c.mother_id = auth.uid() and c.specialty = s.specialty and c.set_by = 'mother')
  on conflict (mother_id, specialty) do update set pro_id = excluded.pro_id, set_by = 'booking', set_at = now()
    where care_preferences.set_by = 'booking' and care_preferences.pro_id is distinct from excluded.pro_id;

  return query
  with seen as (
    select b.pro_id as sid, count(*)::int as n, max(b.starts_at) as last_at
    from bookings b
    where b.mother_id = auth.uid() and b.status <> 'cancelled'
      and (b.status = 'done' or (b.status = 'booked' and b.starts_at < now() - interval '1 hour'))
    group by b.pro_id
  )
  select p.id, pf.full_name, p.title, p.specialty, coalesce(seen.n, 0), seen.last_at,
         coalesce(c.pro_id = p.id, false), p.accepting
  from pros p
  join profiles pf on pf.id = p.id
  left join seen on seen.sid = p.id
  left join care_preferences c on c.mother_id = auth.uid() and c.specialty = p.specialty
  where seen.sid is not null or c.pro_id = p.id        -- doctors she has seen, plus one she chose herself
  order by coalesce(c.pro_id = p.id, false) desc, coalesce(seen.n, 0) desc, seen.last_at desc nulls last;
end $$;

-- ---------- she changes her preferred doctor (and the change is logged) ----------
create or replace function set_preferred_pro(p_pro uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_spec text; v_name text; v_me text;
begin
  if app_role() is distinct from 'mother' then raise exception 'only mothers choose a preferred doctor'; end if;
  select p.specialty, pf.full_name into v_spec, v_name from pros p join profiles pf on pf.id = p.id where p.id = p_pro and p.accepting;
  if v_spec is null then raise exception 'this professional is not available'; end if;
  insert into care_preferences (mother_id, specialty, pro_id, set_by) values (auth.uid(), v_spec, p_pro, 'mother')
  on conflict (mother_id, specialty) do update set pro_id = excluded.pro_id, set_by = 'mother', set_at = now();
  select full_name into v_me from profiles where id = auth.uid();
  insert into audit_log (actor_id, actor_name, mother_id, action)
  values (auth.uid(), coalesce(v_me, ''), auth.uid(), left('Chose ' || v_name || ' as her preferred doctor', 200));
end $$;

revoke execute on function my_doctors(), set_preferred_pro(uuid) from public, anon;
grant execute on function my_doctors(), set_preferred_pro(uuid) to authenticated;

notify pgrst, 'reload schema';
