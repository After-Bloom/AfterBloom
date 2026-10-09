-- AfterBloom schema, part 9: one clear action per case, a tamper-evident audit trail, consent requests (Challenges 3 and 4).
-- Additive and safe to run more than once. Run AFTER 001 to 008 and 010.
--
-- What this adds
--   case_actions        every action a professional takes on a case (a call and its outcome, a referral, a family message ...)
--   audit_log           now also records the case, a snapshot of her consent at that moment, and is SEALED: each row stores a hash of the
--                       row before it, so any later edit or deletion shows up when the chain is verified
--   append-only         audit_log, case_events and case_actions cannot be updated or deleted, not even by the server's own key.
--                       (Deleting a person's whole account still works: that runs as the database's own cascade.)
--   consent_requests    "Can we tell Rohan?" asked of the mother. One per family member per case. Her answer is final.
--   my_care_activity()  the plain-sentence list the mother sees: who looked, who called, who was told. No scores, no case names.

-- ---------- case columns for priority and the escalation ladder ----------
alter table cases add column if not exists priority_since timestamptz;              -- when the case reached its current priority (the due time counts from here)
alter table cases add column if not exists escalation_level integer not null default 0;   -- 0 or 1 = assigned doctor, 2 = on-call backup, 3 = admin desk
alter table cases add column if not exists last_action_at timestamptz;
alter table cases add column if not exists priority_reasons jsonb;                 -- why it has this priority, as facts (the screens turn them into plain sentences)

-- ---------- actions ----------
create table if not exists case_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  actor_role text not null default 'pro',
  action_type text not null,          -- call | book_session | refer | family_message | monitor | resolve | acknowledge | take_over
  outcome text,                       -- a fixed choice, never free text
  detail jsonb not null default '{}'::jsonb,
  note_enc text,                      -- optional note, AES-256-GCM encrypted by the server (dropped, never stored plain, if encryption is unavailable)
  created_at timestamptz not null default now()
);
create index if not exists case_actions_case on case_actions (case_id, created_at);
alter table case_actions enable row level security;
revoke all on case_actions from anon, authenticated;

-- ---------- audit_log: the case, her consent at that moment, and the seal ----------
alter table audit_log add column if not exists case_id uuid references cases(id) on delete set null;
alter table audit_log add column if not exists consent_snapshot jsonb;
alter table audit_log add column if not exists seq bigint;
alter table audit_log add column if not exists prev_hash text;
alter table audit_log add column if not exists hash text;
create index if not exists audit_log_chain on audit_log (mother_id, seq);

create sequence if not exists audit_log_seq;

-- number the rows that already exist, oldest first (this runs before the protection below is switched on)
update audit_log a set seq = n.rn
from (select id, row_number() over (order by at, id) + coalesce((select max(seq) from audit_log), 0) as rn from audit_log where seq is null) n
where a.id = n.id;
select setval('audit_log_seq', coalesce((select max(seq) from audit_log), 0) + 1, false);
alter table audit_log alter column seq set default nextval('audit_log_seq');

-- the hash of one row, given the hash of the row before it
create or replace function audit_row_hash(prev text, r audit_log) returns text language sql stable set search_path = public, extensions as $$
  select encode(digest(
    coalesce(prev, '') || '|' || r.seq::text || '|' || r.id::text || '|' || coalesce(r.actor_id::text, '') || '|' || coalesce(r.actor_name, '') || '|' ||
    coalesce(r.mother_id::text, '') || '|' || coalesce(r.action, '') || '|' || to_char(r.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') || '|' ||
    coalesce(r.case_id::text, '') || '|' || coalesce(r.consent_snapshot::text, ''), 'sha256'), 'hex')
$$;

-- seal the rows that already exist, one chain per mother, in order (still before the protection is switched on)
do $$
declare r audit_log; prev text; cur uuid; zero uuid := '00000000-0000-0000-0000-000000000000'; started boolean := false; h text;
begin
  for r in select * from audit_log where hash is null order by coalesce(mother_id, zero), seq loop
    if not started or cur is distinct from coalesce(r.mother_id, zero) then
      cur := coalesce(r.mother_id, zero); started := true;
      select x.hash into prev from audit_log x where x.mother_id is not distinct from r.mother_id and x.hash is not null order by x.seq desc limit 1;
    end if;
    h := audit_row_hash(prev, r);
    update audit_log set prev_hash = prev, hash = h where id = r.id;
    prev := h;
  end loop;
end $$;

-- every new row is sealed as it is written, whoever writes it (the app, a database function, the service key)
create or replace function audit_seal() returns trigger language plpgsql set search_path = public, extensions as $$
declare prev text;
begin
  perform pg_advisory_xact_lock(hashtext(coalesce(new.mother_id::text, 'none')));   -- two writers for one mother take turns, so the chain cannot fork
  if new.seq is null then new.seq := nextval('audit_log_seq'); end if;
  select x.hash into prev from audit_log x where x.mother_id is not distinct from new.mother_id and x.hash is not null order by x.seq desc limit 1;
  new.prev_hash := prev;
  new.hash := audit_row_hash(prev, new);
  return new;
end $$;
drop trigger if exists audit_seal_trg on audit_log;
create trigger audit_seal_trg before insert on audit_log for each row execute function audit_seal();

-- Walk one mother's chain (or everyone's) and report the first row that does not match. Admins check anyone; a professional checks their own patients.
create or replace function verify_audit_chain(p_mother uuid default null)
returns table (checked integer, broken_id uuid, broken_seq bigint, broken_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare r audit_log; prev text; cur uuid; zero uuid := '00000000-0000-0000-0000-000000000000'; n integer := 0; started boolean := false;
begin
  if app_role() = 'pro' then
    if p_mother is null or not is_matched_pro(p_mother) then raise exception 'not your patient'; end if;
  elsif app_role() is distinct from 'admin' then
    raise exception 'not allowed';
  end if;
  for r in select * from audit_log where (p_mother is null or mother_id = p_mother) order by coalesce(mother_id, zero), seq loop
    if not started or cur is distinct from coalesce(r.mother_id, zero) then cur := coalesce(r.mother_id, zero); started := true; prev := null; end if;
    n := n + 1;
    if r.hash is null or r.prev_hash is distinct from prev or r.hash is distinct from audit_row_hash(prev, r) then
      return query select n, r.id, r.seq, r.at;
      return;
    end if;
    prev := r.hash;
  end loop;
  return query select n, null::uuid, null::bigint, null::timestamptz;
end $$;
revoke execute on function verify_audit_chain(uuid) from public, anon;
grant execute on function verify_audit_chain(uuid) to authenticated;

-- ---------- append-only ----------
-- A direct UPDATE or DELETE is refused for everyone, including the service role (triggers still run for it).
-- Removing a person's whole account runs inside the database's own cascade (trigger depth above 1), so erasure still works.
create or replace function block_change() returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() = 1 then raise exception 'this record is append-only and cannot be changed or deleted'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists no_edit on audit_log;
create trigger no_edit before update or delete on audit_log for each row execute function block_change();
drop trigger if exists no_edit on case_events;
create trigger no_edit before update or delete on case_events for each row execute function block_change();
drop trigger if exists no_edit on case_actions;
create trigger no_edit before update or delete on case_actions for each row execute function block_change();

-- ---------- asking the mother ----------
create table if not exists consent_requests (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  mother_id uuid not null references mothers(id) on delete cascade,
  family_member_id uuid not null references family_members(id) on delete cascade,
  requested_by uuid references profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','allow_once','always','declined')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  used_at timestamptz,
  unique (case_id, family_member_id)        -- once per family member per case
);
alter table consent_requests enable row level security;
drop policy if exists consent_requests_own on consent_requests;
create policy consent_requests_own on consent_requests for select to authenticated using (mother_id = auth.uid());
revoke all on consent_requests from anon, authenticated;
grant select on consent_requests to authenticated;     -- she reads her own; answers go through the function below, so a "No" cannot be taken back

-- She answers: Allow once, Always allow, or Not now. Final. "Always allow" switches that person's alerts on, and the change is logged.
create or replace function answer_consent_request(p_id uuid, p_answer text) returns void language plpgsql security definer set search_path = public as $$
declare q consent_requests; fm family_members; me text;
begin
  if app_role() is distinct from 'mother' then raise exception 'only the mother answers'; end if;
  if p_answer not in ('allow_once','always','declined') then raise exception 'invalid answer'; end if;
  update consent_requests set status = p_answer, answered_at = now() where id = p_id and mother_id = auth.uid() and status = 'pending' returning * into q;
  if q.id is null then raise exception 'this request was already answered'; end if;
  select * into fm from family_members where id = q.family_member_id;
  if p_answer = 'always' then
    update family_members set sees_alerts = true where id = q.family_member_id and mother_id = auth.uid();
    insert into consent_log (user_id, key, value) values (auth.uid(), 'family_alerts:' || coalesce(fm.name, ''), true);
  end if;
  select full_name into me from profiles where id = auth.uid();
  insert into audit_log (actor_id, actor_name, mother_id, action, case_id)
  values (auth.uid(), coalesce(me, ''), auth.uid(),
    left('Answered a request to tell ' || coalesce(fm.name, 'a family member') || ': ' || case p_answer when 'always' then 'always allow' when 'allow_once' then 'allow once' else 'not now' end, 200), q.case_id);
end $$;
revoke execute on function answer_consent_request(uuid, text) from public, anon;
grant execute on function answer_consent_request(uuid, text) to authenticated;

-- ---------- "What my care team did": plain sentences for the mother, no scores and no case names ----------
create or replace function my_care_activity(p_limit integer default 40) returns table (happened_at timestamptz, sentence text)
language sql stable security definer set search_path = public as $$
  select x.happened_at, x.sentence from (
    -- who looked at her record
    select a.at as happened_at, coalesce(nullif(a.actor_name, ''), 'Someone on your care team') || ' looked at your record' as sentence
    from audit_log a where a.mother_id = auth.uid() and a.actor_id is distinct from auth.uid() and (a.action like 'Viewed record%' or a.action like 'Opened a case%')
    union all
    -- who called her, and who was told
    select c.created_at,
      coalesce(p.full_name, 'Your care team') ||
      case c.action_type
        when 'call' then case when c.outcome = 'not_reached' then ' tried to call you' else ' called you' end
        when 'family_message' then ' sent ' || coalesce(fm.name, 'a family member') || ' a ''please call'' message'
        when 'book_session' then ' booked a session for you'
        else ' updated your care plan' end
    from case_actions c
    join cases k on k.id = c.case_id
    left join profiles p on p.id = c.actor_id
    left join family_members fm on fm.id::text = c.detail ->> 'familyMemberId'
    where k.mother_id = auth.uid() and c.action_type in ('call', 'family_message', 'book_session')
    union all
    -- what the care team asked her, and what she chose
    select coalesce(r.answered_at, r.created_at),
      'Care team asked to inform ' || coalesce(fm.name, 'a family member') || '. ' ||
      case r.status when 'pending' then 'Waiting for your answer' when 'declined' then 'You chose: Not now' when 'always' then 'You chose: Always allow' else 'You chose: Allow once' end
    from consent_requests r left join family_members fm on fm.id = r.family_member_id where r.mother_id = auth.uid()
  ) x order by x.happened_at desc limit greatest(1, least(coalesce(p_limit, 40), 100))
$$;
revoke execute on function my_care_activity(integer) from public, anon;
grant execute on function my_care_activity(integer) to authenticated;

notify pgrst, 'reload schema';
