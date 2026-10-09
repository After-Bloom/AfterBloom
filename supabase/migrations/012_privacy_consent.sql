-- 012_privacy_consent.sql: live consent withdrawal, privacy blur, plain-word receipts and pause-all-sharing.
-- No new tables: this reuses mothers, consent_log and audit_log exactly as they already are. Safe to run again.
-- Use the next free migration number if 012 is taken.

-- ---------- B8: pause all sharing ----------
-- A timestamp in the future means "paused until then". A far-future value (set by the "pause until I resume" button)
-- means "paused until she taps Resume now". Null (the default) means not paused. Checked everywhere consent_share_pro
-- is checked (lib/consent.ts effectiveShares()), so it behaves exactly like switching sharing off for a while.
-- Emergencies are never affected: red and self-harm alerts bypass this, same as they already bypass consent_share_pro.
alter table mothers add column if not exists sharing_paused_until timestamptz;

-- ---------- B6: "What my care team did" also lists reveals of a hidden detail and her own consent changes ----------
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
    union all
    -- a care team member revealed a detail you had hidden (mood/EPDS/partner-screen numbers are blurred until shown, and each Show is logged)
    select a.at, coalesce(nullif(a.actor_name, ''), 'Someone on your care team') || ' viewed a detail you had hidden'
    from audit_log a where a.mother_id = auth.uid() and a.actor_id is distinct from auth.uid() and a.action like 'Revealed:%'
    union all
    -- her own consent changes, in plain words
    select cl.at, case cl.key
      when 'shareWithPro' then case when cl.value then 'You turned on sharing your check-ins and screening results with your professional' else 'You turned off sharing your check-ins and screening results with your professional' end
      when 'emergencyAlert' then case when cl.value then 'You turned on alerting your family on a RED result' else 'You turned off alerting your family on a RED result' end
      when 'familyNote' then case when cl.value then 'You turned on the weekly note to family' else 'You turned off the weekly note to family' end
      when 'sms' then case when cl.value then 'You turned on text-message reminders' else 'You turned off text-message reminders' end
      when 'cloudMatch' then case when cl.value then 'You turned on smarter symptom matching' else 'You turned off smarter symptom matching' end
      when 'sharingPaused' then case when cl.value then 'You paused sharing with your care team' else 'You resumed sharing with your care team' end
      else 'You changed a privacy setting' end
    from consent_log cl where cl.user_id = auth.uid()
  ) x order by x.happened_at desc limit greatest(1, least(coalesce(p_limit, 40), 100))
$$;
revoke execute on function my_care_activity(integer) from public, anon;
grant execute on function my_care_activity(integer) to authenticated;

notify pgrst, 'reload schema';
