-- 014_audit_seal_fix.sql: fixes a race in the audit hash chain that makes Verify report a mismatch.
--
-- The bug: audit_log.seq had a column DEFAULT of nextval('audit_log_seq'). Postgres fills in column defaults
-- while building the row, BEFORE any "before insert" trigger runs -- so by the time audit_seal() acquired its
-- per-mother advisory lock, new.seq had already been handed out, unsynchronised with the lock. Two near-
-- simultaneous writes for the same mother (the app does this routinely: an auto "view" POST fires right after
-- a GET, the case page polls every 3s, a Show click writes its own row) could get their seq numbers in one
-- order but resolve their prev-hash lookup (which runs INSIDE the lock) in the other order. That writes a
-- prev_hash pointing at a row with a HIGHER seq than itself. verify_audit_chain() walks strictly in seq order,
-- so it reports a break there, and everything after reads as broken too. Rows written one at a time (the 009
-- backfill, this migration's own reseal) never hit it -- only concurrent app traffic does.
--
-- The fix: seq is now assigned INSIDE the trigger's locked section (no column default), so seq order and
-- lock-acquisition order can never disagree again. Existing rows are then resealed from scratch (same
-- algorithm as the original 009 backfill), which repairs any chain already broken by the race above.
-- Safe to run again.

alter table audit_log alter column seq drop default;

create or replace function audit_seal() returns trigger language plpgsql set search_path = public, extensions as $$
declare prev text;
begin
  perform pg_advisory_xact_lock(hashtext(coalesce(new.mother_id::text, 'none')));   -- two writers for one mother take turns, so the chain cannot fork
  new.seq := nextval('audit_log_seq');   -- assigned INSIDE the lock now: seq order can never disagree with lock-acquisition order
  select x.hash into prev from audit_log x where x.mother_id is not distinct from new.mother_id and x.hash is not null order by x.seq desc limit 1;
  new.prev_hash := prev;
  new.hash := audit_row_hash(prev, new);
  return new;
end $$;

-- reseal every row (not only the ones missing a hash): existing hash/prev_hash values may be wrong because of
-- the race above, and this is a pure function of (seq order, row content), so recomputing is always safe.
-- The exclusive lock is held only for this migration's brief do-block, so a reseal running while the app is
-- live can't interleave with a concurrent insert and end up resealing against a half-written chain.
drop trigger if exists no_edit on audit_log;
lock table audit_log in exclusive mode;
do $$
declare r audit_log; prev text; cur uuid; zero uuid := '00000000-0000-0000-0000-000000000000'; started boolean := false; h text;
begin
  for r in select * from audit_log order by coalesce(mother_id, zero), seq loop
    if not started or cur is distinct from coalesce(r.mother_id, zero) then cur := coalesce(r.mother_id, zero); started := true; prev := null; end if;
    h := audit_row_hash(prev, r);
    update audit_log set prev_hash = prev, hash = h where id = r.id;
    prev := h;
  end loop;
end $$;
create trigger no_edit before update or delete on audit_log for each row execute function block_change();

notify pgrst, 'reload schema';
