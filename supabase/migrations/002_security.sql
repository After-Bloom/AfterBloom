-- AfterBloom schema, part 2 of 2: access rules (Row Level Security), helper functions, RPCs and realtime.
-- Safe to run more than once. Run AFTER 001_schema.sql.
--
-- Privacy model in one paragraph: a mother's records belong to her. A matched professional sees urgent flags and booked
-- sessions always, and her check-ins, symptoms and screening results only while she shares them. A family member sees only
-- what she switched on for them, never raw screening answers. Moderators see circle posts and who wrote flagged ones.
-- Typed symptom text is never stored. Screening answers are encrypted by the server before they reach the database.

-- ---------- helper functions (security definer so policies can use them without recursion) ----------
create or replace function app_role() returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;
create or replace function is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('moderator','admin') from profiles where id = auth.uid()), false)
$$;
create or replace function is_matched_pro(m uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from pro_patients where pro_id = auth.uid() and mother_id = m)
$$;
create or replace function pro_can_see_health(m uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from pro_patients pp join mothers mo on mo.id = pp.mother_id
                 where pp.pro_id = auth.uid() and pp.mother_id = m and mo.consent_share_pro)
$$;
create or replace function is_family_of(m uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from family_members where mother_id = m and user_id = auth.uid() and status = 'active')
$$;
create or replace function family_sees_trends(m uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from family_members where mother_id = m and user_id = auth.uid() and status = 'active' and sees_trends)
$$;
create or replace function in_circle(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from circle_members where circle_id = c and user_id = auth.uid())
$$;

-- ---------- table privileges ----------
grant usage on schema public to anon, authenticated;
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
-- people cannot change their own role or demo flag
revoke update on profiles from authenticated;
grant update (full_name, lang, city) on profiles to authenticated;

-- ---------- enable RLS everywhere ----------
alter table hospitals enable row level security;
alter table circles enable row level security;
alter table profiles enable row level security;
alter table mothers enable row level security;
alter table consent_log enable row level security;
alter table pros enable row level security;
alter table pro_patients enable row level security;
alter table asha_assignments enable row level security;
alter table family_members enable row level security;
alter table checkins enable row level security;
alter table symptom_logs enable row level security;
alter table epds_results enable row level security;
alter table flags enable row level security;
alter table alerts enable row level security;
alter table bookings enable row level security;
alter table audit_log enable row level security;
alter table baby_vaccines enable row level security;
alter table baby_growth enable row level security;
alter table baby_milestones enable row level security;
alter table benefit_steps enable row level security;
alter table night_shifts enable row level security;
alter table partner_screens enable row level security;
alter table circle_members enable row level security;
alter table posts enable row level security;
alter table post_authors enable row level security;
alter table mod_queue enable row level security;
alter table weekly_reports enable row level security;
alter table push_subscriptions enable row level security;
alter table clinical_config enable row level security;

-- ---------- hospitals, circles, clinical settings: readable by anyone signed in ----------
drop policy if exists hospitals_read on hospitals;
create policy hospitals_read on hospitals for select to authenticated using (true);
drop policy if exists circles_read on circles;
create policy circles_read on circles for select to authenticated using (true);
drop policy if exists circles_admin on circles;
create policy circles_admin on circles for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');
drop policy if exists config_read on clinical_config;
create policy config_read on clinical_config for select to authenticated using (true);
drop policy if exists config_admin on clinical_config;
create policy config_admin on clinical_config for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');

-- ---------- profiles ----------
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_pro_directory on profiles;
create policy profiles_pro_directory on profiles for select to authenticated using (role = 'pro');
drop policy if exists profiles_related on profiles;
create policy profiles_related on profiles for select to authenticated using (
  exists (select 1 from pro_patients pp where pp.pro_id = auth.uid() and pp.mother_id = profiles.id)
  or exists (select 1 from family_members fm where (fm.mother_id = auth.uid() and fm.user_id = profiles.id) or (fm.user_id = auth.uid() and fm.mother_id = profiles.id))
);
drop policy if exists profiles_admin on profiles;
create policy profiles_admin on profiles for select to authenticated using (app_role() = 'admin');
drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------- mothers ----------
drop policy if exists mothers_read on mothers;
create policy mothers_read on mothers for select to authenticated using (id = auth.uid() or is_matched_pro(id) or is_family_of(id));
drop policy if exists mothers_update on mothers;
create policy mothers_update on mothers for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists consent_log_own on consent_log;
create policy consent_log_own on consent_log for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- professionals ----------
drop policy if exists pros_read on pros;
create policy pros_read on pros for select to authenticated using (true);
drop policy if exists pros_update on pros;
create policy pros_update on pros for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists pro_patients_read on pro_patients;
create policy pro_patients_read on pro_patients for select to authenticated using (pro_id = auth.uid() or mother_id = auth.uid());
drop policy if exists pro_patients_unmatch on pro_patients;
create policy pro_patients_unmatch on pro_patients for delete to authenticated using (mother_id = auth.uid());

drop policy if exists asha_read on asha_assignments;
create policy asha_read on asha_assignments for select to authenticated using (asha_id = auth.uid() or app_role() = 'admin');
drop policy if exists asha_admin on asha_assignments;
create policy asha_admin on asha_assignments for all to authenticated using (app_role() = 'admin') with check (app_role() = 'admin');

-- ---------- family ----------
drop policy if exists family_read on family_members;
create policy family_read on family_members for select to authenticated using (mother_id = auth.uid() or user_id = auth.uid());
drop policy if exists family_insert on family_members;
create policy family_insert on family_members for insert to authenticated with check (mother_id = auth.uid());
drop policy if exists family_update on family_members;
create policy family_update on family_members for update to authenticated using (mother_id = auth.uid()) with check (mother_id = auth.uid());
drop policy if exists family_delete on family_members;
create policy family_delete on family_members for delete to authenticated using (mother_id = auth.uid());

-- ---------- health records ----------
drop policy if exists checkins_read on checkins;
create policy checkins_read on checkins for select to authenticated using (mother_id = auth.uid() or pro_can_see_health(mother_id) or family_sees_trends(mother_id));
drop policy if exists checkins_write on checkins;
create policy checkins_write on checkins for all to authenticated using (mother_id = auth.uid()) with check (mother_id = auth.uid());

drop policy if exists symptoms_read on symptom_logs;
create policy symptoms_read on symptom_logs for select to authenticated using (mother_id = auth.uid() or pro_can_see_health(mother_id));
drop policy if exists symptoms_write on symptom_logs;
create policy symptoms_write on symptom_logs for insert to authenticated with check (mother_id = auth.uid());

-- screening answers are only written by the server (which encrypts them); clients read totals and bands
drop policy if exists epds_read on epds_results;
create policy epds_read on epds_results for select to authenticated using (mother_id = auth.uid() or pro_can_see_health(mother_id));

-- urgent flags: her matched professional always sees them (that is the point of the crisis protocol)
drop policy if exists flags_read on flags;
create policy flags_read on flags for select to authenticated using (mother_id = auth.uid() or is_matched_pro(mother_id));
drop policy if exists flags_insert on flags;
create policy flags_insert on flags for insert to authenticated with check (mother_id = auth.uid());
drop policy if exists flags_update on flags;
create policy flags_update on flags for update to authenticated using (is_matched_pro(mother_id)) with check (is_matched_pro(mother_id));

-- notifications are created by the server only; a person reads and marks their own
drop policy if exists alerts_read on alerts;
create policy alerts_read on alerts for select to authenticated using (user_id = auth.uid());
drop policy if exists alerts_update on alerts;
create policy alerts_update on alerts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists bookings_read on bookings;
create policy bookings_read on bookings for select to authenticated using (mother_id = auth.uid() or pro_id = auth.uid());
drop policy if exists bookings_update on bookings;
create policy bookings_update on bookings for update to authenticated using (mother_id = auth.uid() or pro_id = auth.uid()) with check (mother_id = auth.uid() or pro_id = auth.uid());

-- the mother can see who looked at her record; professionals see their own trail
drop policy if exists audit_read on audit_log;
create policy audit_read on audit_log for select to authenticated using (mother_id = auth.uid() or actor_id = auth.uid());

-- ---------- baby ----------
drop policy if exists vaccines_read on baby_vaccines;
create policy vaccines_read on baby_vaccines for select to authenticated using (mother_id = auth.uid() or is_family_of(mother_id) or pro_can_see_health(mother_id));
drop policy if exists vaccines_write on baby_vaccines;
create policy vaccines_write on baby_vaccines for all to authenticated using (mother_id = auth.uid()) with check (mother_id = auth.uid());
drop policy if exists growth_read on baby_growth;
create policy growth_read on baby_growth for select to authenticated using (mother_id = auth.uid() or pro_can_see_health(mother_id));
drop policy if exists growth_write on baby_growth;
create policy growth_write on baby_growth for all to authenticated using (mother_id = auth.uid()) with check (mother_id = auth.uid());
drop policy if exists milestones_read on baby_milestones;
create policy milestones_read on baby_milestones for select to authenticated using (mother_id = auth.uid() or pro_can_see_health(mother_id));
drop policy if exists milestones_write on baby_milestones;
create policy milestones_write on baby_milestones for all to authenticated using (mother_id = auth.uid()) with check (mother_id = auth.uid());
drop policy if exists benefits_own on benefit_steps;
create policy benefits_own on benefit_steps for all to authenticated using (mother_id = auth.uid()) with check (mother_id = auth.uid());

-- ---------- family circle ----------
drop policy if exists shifts_read on night_shifts;
create policy shifts_read on night_shifts for select to authenticated using (mother_id = auth.uid() or is_family_of(mother_id));
drop policy if exists shifts_write on night_shifts;
create policy shifts_write on night_shifts for all to authenticated using (mother_id = auth.uid() or is_family_of(mother_id)) with check (mother_id = auth.uid() or is_family_of(mother_id));
drop policy if exists screens_read on partner_screens;
create policy screens_read on partner_screens for select to authenticated using (mother_id = auth.uid() or by_user = auth.uid() or pro_can_see_health(mother_id));
drop policy if exists screens_insert on partner_screens;
create policy screens_insert on partner_screens for insert to authenticated with check (by_user = auth.uid() and (mother_id = auth.uid() or is_family_of(mother_id)));

-- ---------- Bloom Circles ----------
drop policy if exists members_read on circle_members;
create policy members_read on circle_members for select to authenticated using (user_id = auth.uid() or in_circle(circle_id) or is_staff());
drop policy if exists members_leave on circle_members;
create policy members_leave on circle_members for delete to authenticated using (user_id = auth.uid());

drop policy if exists posts_read on posts;
create policy posts_read on posts for select to authenticated using ((in_circle(circle_id) and not hidden) or is_staff());
drop policy if exists posts_moderate on posts;
create policy posts_moderate on posts for update to authenticated using (is_staff()) with check (is_staff());

drop policy if exists authors_read on post_authors;
create policy authors_read on post_authors for select to authenticated using (author_id = auth.uid() or is_staff());

drop policy if exists modq_read on mod_queue;
create policy modq_read on mod_queue for select to authenticated using (is_staff());
drop policy if exists modq_update on mod_queue;
create policy modq_update on mod_queue for update to authenticated using (is_staff()) with check (is_staff());

-- ---------- reports and push ----------
drop policy if exists reports_read on weekly_reports;
create policy reports_read on weekly_reports for select to authenticated using (mother_id = auth.uid() or pro_can_see_health(mother_id));
drop policy if exists reports_write on weekly_reports;
create policy reports_write on weekly_reports for all to authenticated using (mother_id = auth.uid()) with check (mother_id = auth.uid());
drop policy if exists push_own on push_subscriptions;
create policy push_own on push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- RPCs: the only ways to do things a plain policy cannot express safely ----------

-- A family member joins with the code the mother gave them.
create or replace function join_family(p_code text) returns uuid language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if app_role() is distinct from 'family' then raise exception 'only family accounts can join with a code'; end if;
  update family_members set user_id = auth.uid(), status = 'active'
   where invite_code = upper(trim(p_code)) and status = 'invited'
   returning mother_id into m;
  if m is null then raise exception 'That code is not valid or has already been used'; end if;
  return m;
end $$;

-- A mother joins a Bloom Circle under an alias.
create or replace function join_circle(p_circle uuid, p_alias text) returns void language plpgsql security definer set search_path = public as $$
begin
  if app_role() is distinct from 'mother' then raise exception 'only mothers join circles as members'; end if;
  insert into circle_members (circle_id, user_id, alias) values (p_circle, auth.uid(), left(coalesce(nullif(trim(p_alias), ''), 'Mother'), 30))
  on conflict (circle_id, user_id) do update set alias = excluded.alias;
  update mothers set circle_id = p_circle where id = auth.uid();
end $$;

-- Posting: members cannot insert posts directly, so who wrote a post stays private.
create or replace function create_post(p_circle uuid, p_text text, p_topic text, p_anon boolean, p_note text)
returns posts language plpgsql security definer set search_path = public as $$
declare v_alias text; v_post posts;
begin
  if not in_circle(p_circle) then raise exception 'not a member of this circle'; end if;
  select alias into v_alias from circle_members where circle_id = p_circle and user_id = auth.uid();
  if p_anon then v_alias := 'Anonymous mother'; end if;
  insert into posts (circle_id, alias, anon, topic, text, note)
  values (p_circle, v_alias, coalesce(p_anon, false), coalesce(nullif(p_topic, ''), 'General'), left(trim(p_text), 1000), p_note)
  returning * into v_post;
  insert into post_authors (post_id, author_id) values (v_post.id, auth.uid());
  return v_post;
end $$;

-- Opening a patient's record writes an audit row.
create or replace function log_view(p_mother uuid, p_action text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_matched_pro(p_mother) then raise exception 'not your patient'; end if;
  insert into audit_log (actor_id, actor_name, mother_id, action)
  values (auth.uid(), coalesce((select full_name from profiles where id = auth.uid()), ''), p_mother, left(p_action, 200));
end $$;

-- Booking a session also matches her with that professional.
create or replace function book_session(p_pro uuid, p_at timestamptz) returns bookings language plpgsql security definer set search_path = public as $$
declare v bookings;
begin
  if app_role() is distinct from 'mother' then raise exception 'only mothers book sessions'; end if;
  if not exists (select 1 from pros where id = p_pro and accepting) then raise exception 'this professional is not accepting bookings'; end if;
  insert into bookings (mother_id, pro_id, starts_at) values (auth.uid(), p_pro, p_at) returning * into v;
  insert into pro_patients (pro_id, mother_id) values (p_pro, auth.uid()) on conflict do nothing;
  return v;
end $$;

-- Every mother has a matched psychologist so an elevated screening result always reaches a human.
create or replace function ensure_matched_pro() returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if app_role() is distinct from 'mother' then return null; end if;
  select pro_id into v from pro_patients where mother_id = auth.uid() order by matched_at limit 1;
  if v is not null then return v; end if;
  select p.id into v from pros p
   where p.accepting and p.title in ('Clinical psychologist','Counsellor')
   order by (select count(*) from pro_patients x where x.pro_id = p.id) limit 1;
  if v is not null then insert into pro_patients (pro_id, mother_id) values (v, auth.uid()) on conflict do nothing; end if;
  return v;
end $$;

-- ASHA workers see only a risk summary for the mothers assigned to them, never the detail.
create or replace function asha_overview() returns table (
  mother_id uuid, full_name text, baby_name text, day integer, open_flags integer, last_epds text, last_checkin date, risk integer
) language sql stable security definer set search_path = public as $$
  select m.id, p.full_name, m.baby_name, (current_date - m.birth_date)::int,
         (select count(*)::int from flags f where f.mother_id = m.id and not f.resolved),
         (select e.band from epds_results e where e.mother_id = m.id order by e.created_at desc limit 1),
         (select max(c.day) from checkins c where c.mother_id = m.id),
         ( (select count(*)::int from flags f where f.mother_id = m.id and not f.resolved) * 3
         + case (select e.band from epds_results e where e.mother_id = m.id order by e.created_at desc limit 1) when 'probable' then 3 when 'possible' then 1 else 0 end
         + case when coalesce((select max(c.day) from checkins c where c.mother_id = m.id), date '1970-01-01') < current_date - 3 then 1 else 0 end )
  from asha_assignments a
  join mothers m on m.id = a.mother_id
  join profiles p on p.id = m.id
  where a.asha_id = auth.uid()
  order by 8 desc, 4
$$;

-- Admin: anonymised totals per hospital for the partner report. No names, no records.
create or replace function hospital_stats() returns table (
  hospital text, mothers integer, with_open_flags integer, probable_screens integer, checkins_last_7d integer
) language plpgsql stable security definer set search_path = public as $$
begin
  if app_role() is distinct from 'admin' then raise exception 'admin only'; end if;
  return query
  select h.name,
         (select count(*)::int from mothers m where m.hospital_id = h.id),
         (select count(distinct f.mother_id)::int from flags f join mothers m on m.id = f.mother_id where m.hospital_id = h.id and not f.resolved),
         (select count(distinct e.mother_id)::int from epds_results e join mothers m on m.id = e.mother_id where m.hospital_id = h.id and e.band = 'probable'),
         (select count(*)::int from checkins c join mothers m on m.id = c.mother_id where m.hospital_id = h.id and c.day >= current_date - 7)
  from hospitals h order by h.name;
end $$;

grant execute on function join_family(text), join_circle(uuid, text), create_post(uuid, text, text, boolean, text),
  log_view(uuid, text), book_session(uuid, timestamptz), ensure_matched_pro(), asha_overview(), hospital_stats() to authenticated;
revoke execute on function join_family(text), join_circle(uuid, text), create_post(uuid, text, text, boolean, text),
  log_view(uuid, text), book_session(uuid, timestamptz), ensure_matched_pro(), asha_overview(), hospital_stats() from anon;

-- ---------- realtime: live circle chat, alerts, flags and the moderator queue ----------
do $$ begin alter publication supabase_realtime add table posts; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table alerts; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table flags; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table mod_queue; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table night_shifts; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table checkins; exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
