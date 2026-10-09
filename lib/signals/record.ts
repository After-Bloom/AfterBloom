import type { SupabaseClient } from "@supabase/supabase-js";
import { classify } from "./correlate.ts";
import { LOOKBACK_HOURS, SEVERITY_RANK } from "./config.ts";
import type { Signal, SignalInput } from "../types/cases.ts";

// Recording signals. Every producer (symptom checker, check-in, EPDS, care loop, callbacks, circle posts) calls recordSignal() next to
// the flag or alert it already creates. It NEVER throws and never blocks the producer: if signals cannot be saved (for example the
// 007 migration has not been run yet) the app behaves exactly as it did before and the care team is told, because the safe default is "tell".
// Kept free of server-only code so the same function is tested with an in-memory database (tests/record.test.ts).

export const mapSignal = (r: any): Signal => ({
  id: r.id, motherId: r.mother_id, subject: r.subject, source: r.source, code: r.code, concern: r.concern, severity: r.severity, value: r.value ?? null,
  observedAt: r.observed_at, originTable: r.origin_table, originId: r.origin_id, relation: r.relation, relationDetail: r.relation_detail ?? { kind: r.relation },
  relatedTo: r.related_to, linkStatus: r.link_status, notified: r.notified, caseId: r.case_id ?? null,
});

export type Recorded = { signal: Signal | null; /** tell the care team now? */ notify: boolean; created: boolean };

async function loadHistory(admin: SupabaseClient, motherId: string, observedAt: string, followUpOf?: string | null): Promise<Signal[]> {
  const from = new Date(new Date(observedAt).getTime() - LOOKBACK_HOURS * 3600000).toISOString();
  const { data, error } = await admin.from("signals").select("*").eq("mother_id", motherId).gte("observed_at", from).lte("observed_at", observedAt).order("observed_at", { ascending: false }).limit(300);
  if (error) throw error;
  const list = (data ?? []).map(mapSignal);
  if (followUpOf && !list.some((s) => s.id === followUpOf)) {
    const { data: parent } = await admin.from("signals").select("*").eq("id", followUpOf).maybeSingle();
    if (parent) list.push(mapSignal(parent));
  }
  return list;
}

export async function recordSignal(admin: SupabaseClient, input: SignalInput): Promise<Recorded> {
  try {
    const observedAt = input.observedAt ?? new Date().toISOString();
    const find = async () => (await admin.from("signals").select("*").eq("origin_table", input.originTable).eq("origin_id", input.originId).eq("code", input.code).maybeSingle()).data;

    // saving the same thing again (a re-saved check-in) updates the same signal and never adds a duplicate
    const existing = await find();
    if (existing) {
      const was = mapSignal(existing);
      const rose = SEVERITY_RANK[input.severity] > SEVERITY_RANK[was.severity];
      if (!rose && input.value == null) return { signal: was, notify: was.notified, created: false };
      const { data } = await admin.from("signals").update({ severity: rose ? input.severity : was.severity, value: input.value ?? was.value, notified: was.notified || rose }).eq("id", was.id).select("*").single();
      return { signal: data ? mapSignal(data) : was, notify: rose || was.notified, created: false };
    }

    const history = await loadHistory(admin, input.motherId, observedAt, input.followUpOf);
    const d = classify({ ...input, observedAt }, history);
    const row = {
      mother_id: input.motherId, subject: input.subject, source: input.source, code: input.code, concern: input.concern, severity: input.severity, value: input.value ?? null,
      observed_at: observedAt, origin_table: input.originTable, origin_id: input.originId, relation: d.relation, relation_detail: d.detail, related_to: d.relatedTo,
      link_status: d.linkStatus, notified: d.notify,
    };
    const { data, error } = await admin.from("signals").insert(row).select("*").single();
    if (error) {
      // two alerts raced for the same origin: the unique index kept only one, so use the one that won
      if ((error as any).code === "23505") { const won = await find(); if (won) return { signal: mapSignal(won), notify: (mapSignal(won)).notified, created: false }; }
      throw error;
    }
    return { signal: mapSignal(data), notify: d.notify, created: true };
  } catch (e: any) {
    console.error("recordSignal failed", e?.message ?? e);
    return { signal: null, notify: true, created: false };
  }
}

export async function recordAll(admin: SupabaseClient, inputs: SignalInput[]): Promise<Recorded[]> {
  const out: Recorded[] = [];
  for (const i of inputs) out.push(await recordSignal(admin, i)); // one at a time, so the second alert in a batch sees the first
  return out;
}

/** Should the care team be told? Yes if anything in this event is worth telling, and always if nothing could be recorded. */
export const shouldNotify = (r: Recorded[]) => r.length === 0 || r.some((x) => x.notify);
