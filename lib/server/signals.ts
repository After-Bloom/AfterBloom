import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SYMPTOMS } from "../symptoms";
import { mapSignal, recordAll as recordAllCore, recordSignal as recordSignalCore, shouldNotify, type Hooks, type Recorded } from "../signals/record";
import { attachSignal, raiseSignal, type OwnerFn } from "../cases/attach";
import { loadContext, ownerOf } from "./routingCore";
import { visibleSignals } from "../signals/access";
import { deriveFromCheckin, deriveFromEpds, deriveFromSymptomLog, loopSignal, type SymptomLookup } from "../signals/derive";
import type { Concern, Severity, Signal, SignalInput } from "../types/cases";

// Recording signals. Every producer (symptom checker, check-in, EPDS, care loop, callbacks, circle posts) calls recordSignal() next to
// the flag or alert it already creates. It NEVER throws and never blocks the producer: if signals cannot be saved (for example the
// 007 migration has not been run yet) the app behaves exactly as it did before and the care team is told, because the safe default is "tell".

const BY_LABEL = new Map(SYMPTOMS.map((s) => [s.label, { id: s.id, who: s.who, level: s.level }]));
export const symptomLookup: SymptomLookup = (label) => BY_LABEL.get(label);

/**
 * Who a new case is routed to when it opens: the professional she already knows for that concern, else the least busy colleague
 * (continuity of care). The owner is matched with her, so they can see her record; what she shares is still decided by her consent.
 */
export const ownerFn = (admin: SupabaseClient): OwnerFn => async (motherId, concern) => {
  const result = ownerOf(await loadContext(admin, [motherId]), motherId, concern);
  if (result.proId) await admin.from("pro_patients").upsert({ pro_id: result.proId, mother_id: motherId });
  return { proId: result.proId, result: result.proId ? result : null };
};

/** Every saved alert is also put into its case (opening or reopening one if needed). If the cases table is missing, the alert is still recorded. */
const caseHooks = (admin: SupabaseClient): Hooks => ({
  created: (s) => attachSignal(admin, s, ownerFn(admin)),
  raised: (s) => raiseSignal(admin, s),
});
export const recordSignal = (admin: SupabaseClient, input: SignalInput) => recordSignalCore(admin, input, caseHooks(admin));
export const recordAll = (admin: SupabaseClient, inputs: SignalInput[]) => recordAllCore(admin, inputs, caseHooks(admin));
export { mapSignal, shouldNotify };
export type { Recorded };

// ---------- rows the app saved on her phone: read them back and turn them into signals ----------
type Origin = "symptom_logs" | "checkins";

/**
 * The browser saves symptom logs and check-ins straight to the database, so the server reads the saved row back and works out the signals
 * itself. Nothing the browser says about severity is trusted. Safe to call more than once for the same row.
 */
export async function syncOrigin(admin: SupabaseClient, motherId: string, table: Origin, id: string): Promise<Recorded[]> {
  if (table === "symptom_logs") {
    const { data } = await admin.from("symptom_logs").select("id, level, labels, created_at").eq("id", id).eq("mother_id", motherId).maybeSingle();
    if (!data) return [];
    return recordAll(admin, deriveFromSymptomLog(motherId, data as any, symptomLookup));
  }
  const { data } = await admin.from("checkins").select("id, level, reasons, bp_sys, bp_dia, created_at").eq("id", id).eq("mother_id", motherId).maybeSingle();
  if (!data) return [];
  // a check-in is saved once a day and can be re-saved; the signal time is when it was first saved
  return recordAll(admin, deriveFromCheckin(motherId, data as any));
}

export async function recordEpds(admin: SupabaseClient, motherId: string, row: { id: string; total: number; band: "low" | "possible" | "probable"; self_harm: boolean; created_at: string }) {
  return recordAll(admin, deriveFromEpds(motherId, row));
}

/** The alert a follow-up exists because of: the latest red or amber alert (of that concern, if given) at or before the loop or callback was created. */
export async function followUpParent(admin: SupabaseClient, motherId: string, createdAt: string, concern?: Concern): Promise<Signal | null> {
  try {
    const upTo = new Date(new Date(createdAt).getTime() + 5 * 60000).toISOString(); // the browser saves the symptom log a moment before or after the loop opens
    let q = admin.from("signals").select("*").eq("mother_id", motherId).in("severity", ["red", "amber"]).not("source", "in", "(care_loop,callback)").lte("observed_at", upTo);
    if (concern) q = q.eq("concern", concern);
    const { data } = await q.order("observed_at", { ascending: false }).limit(1);
    return data?.[0] ? mapSignal(data[0]) : null;
  } catch { return null; }
}

/** Record that she did not answer (or answered "worse" / "can't reach") as a follow-up of the alert that started the loop. */
export async function recordLoopSignal(admin: SupabaseClient, loop: { id: string; mother_id: string; level: "RED" | "AMBER"; created_at: string; check_at?: string }, status: "no_answer" | "worse" | "cant_reach") {
  const parent = await followUpParent(admin, loop.mother_id, loop.created_at);
  const { code, severity } = loopSignal(status, loop.level);
  const concern: Concern = parent?.concern ?? "GENERAL";
  const r = await recordSignal(admin, {
    motherId: loop.mother_id, subject: parent?.subject ?? "mother", source: "care_loop", code, concern, severity: severity as Severity,
    originTable: "care_loops", originId: loop.id, followUpOf: parent?.id ?? null,
    value: loop.check_at ? { askedAt: loop.check_at } : null, // when she was asked, for "no reply since 10:10 pm"
    forceNotify: true, // a mother who has gone silent after a red or amber result must always reach a human; grouping never holds this back
  });
  return { ...r, concern };
}

// ---------- reading signals back for a professional ----------
export { visibleSignals };
export async function signalsFor(admin: SupabaseClient, motherId: string, days = 14): Promise<Signal[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await admin.from("signals").select("*").eq("mother_id", motherId).gte("observed_at", since).order("observed_at").limit(400);
  return (data ?? []).map(mapSignal);
}
