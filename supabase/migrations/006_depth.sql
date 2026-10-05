-- AfterBloom schema, part 6: risk profile, newborn feeding log, SMS reminders, ASHA notes. Safe to run more than once. Run AFTER 001 to 005.

-- ---------- her recovery profile (what made this pregnancy or birth higher risk) and the baby's birth weight ----------
alter table mothers add column if not exists risk jsonb not null default '{}'::jsonb;   -- e.g. {"set":true,"htn":true,"csection":true}
alter table mothers add column if not exists birth_weight_kg numeric(4,2);
alter table mothers add column if not exists consent_sms boolean not null default false; -- text-message reminders (needs her phone number)

-- ---------- newborn feeding and nappy log (feeds, wet nappies, stools) ----------
create table if not exists baby_logs (
  id uuid primary key default gen_random_uuid(),
  mother_id uuid not null references mothers(id) on delete cascade,
  kind text not null check (kind in ('feed','wet','stool')),
  at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists baby_logs_mother_at on baby_logs (mother_id, at desc);
alter table baby_logs enable row level security;
drop policy if exists baby_logs_read on baby_logs;
create policy baby_logs_read on baby_logs for select to authenticated using (mother_id = auth.uid() or pro_can_see_health(mother_id));
drop policy if exists baby_logs_write on baby_logs;
create policy baby_logs_write on baby_logs for all to authenticated using (mother_id = auth.uid()) with check (mother_id = auth.uid());
grant select, insert, update, delete on baby_logs to authenticated;

-- ---------- ASHA visit notes (typed or dictated). The mother can read the notes about her own visits. ----------
alter table asha_visits add column if not exists note text;

-- ---------- the ASHA overview now also reports risk factors, a recent high BP, and the next visit that is due ----------
drop function if exists asha_overview();
create or replace function asha_overview() returns table (
  mother_id uuid, full_name text, baby_name text, day integer, open_flags integer, last_epds text, last_checkin date, risk integer,
  risk_factors integer, high_bp boolean, open_loop boolean
) language sql stable security definer set search_path = public as $$
  select m.id, p.full_name, m.baby_name, (current_date - m.birth_date)::int,
         (select count(*)::int from flags f where f.mother_id = m.id and not f.resolved),
         (select e.band from epds_results e where e.mother_id = m.id order by e.created_at desc limit 1),
         (select max(c.day) from checkins c where c.mother_id = m.id),
         ( (select count(*)::int from flags f where f.mother_id = m.id and not f.resolved) * 3
         + case (select e.band from epds_results e where e.mother_id = m.id order by e.created_at desc limit 1) when 'probable' then 3 when 'possible' then 1 else 0 end
         + case when coalesce((select max(c.day) from checkins c where c.mother_id = m.id), date '1970-01-01') < current_date - 3 then 1 else 0 end
         + case when exists (select 1 from care_loops l where l.mother_id = m.id and l.status in ('open','no_answer','cant_reach','worse')) then 2 else 0 end
         + case when exists (select 1 from checkins c where c.mother_id = m.id and c.day >= current_date - 3 and (c.bp_sys >= 140 or c.bp_dia >= 90)) then 2 else 0 end ),
         (select count(*)::int from jsonb_each(m.risk) k where k.key <> 'set' and k.value = 'true'::jsonb),
         exists (select 1 from checkins c where c.mother_id = m.id and c.day >= current_date - 3 and (c.bp_sys >= 140 or c.bp_dia >= 90)),
         exists (select 1 from care_loops l where l.mother_id = m.id and l.status in ('open','no_answer','cant_reach','worse'))
  from asha_assignments a
  join mothers m on m.id = a.mother_id
  join profiles p on p.id = m.id
  where a.asha_id = auth.uid()
  order by 8 desc, 4
$$;
revoke execute on function asha_overview() from public, anon;
grant execute on function asha_overview() to authenticated;

notify pgrst, 'reload schema';
