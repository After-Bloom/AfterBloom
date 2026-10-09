import type { SupabaseClient } from "@supabase/supabase-js";
import type { Case, Concern, RoutingResult, Severity, Signal } from "../types/cases.ts";
import { CASE_REOPEN_DAYS, SEVERITY_RANK } from "../signals/config.ts";
import { CASE_TITLE } from "./titles.ts";
import { mapSignal } from "../signals/record.ts";

// Putting alerts into cases. Plain rules, one place, no free text:
//   - an alert joins the OPEN case for its concern (one open case per mother, subject and concern, enforced by a unique index)
//   - if there is none, and a case for that concern was resolved within 7 days, that case REOPENS (labelled Reopened)
//   - otherwise a new case opens, routed to the right professional (continuity of care)
//   - a "possibly related" alert from another concern waits INSIDE the case it may belong to until a clinician confirms or separates it
//   - nothing here ever closes a case, and nothing lowers its severity: only a professional resolves a case
// Every function works on a client passed in, so the same code runs in the app, in the seed and in the tests.

export type Owner = { proId: string | null; result: RoutingResult | null };
export type OwnerFn = (motherId: string, concern: Concern) => Promise<Owner>;

const DAY = 86400000;
const worse = (a: Severity, b: Severity) => (SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b);

export const mapCase = (r: any): Case => ({
  id: r.id, motherId: r.mother_id, subject: r.subject, concern: r.concern, title: r.title, status: r.status, severityPeak: r.severity_peak, severityCurrent: r.severity_current,
  priority: r.priority ?? null, dueBy: r.due_by ?? null, ownerProId: r.owner_pro_id ?? null, ownerReason: r.owner_reason ?? null, acknowledgedAt: r.acknowledged_at ?? null,
  triggerSignalId: r.trigger_signal_id ?? null, openedAt: r.opened_at, lastSignalAt: r.last_signal_at, resolvedAt: r.resolved_at ?? null, reopenedCount: r.reopened_count ?? 0,
  prioritySince: r.priority_since ?? null, escalationLevel: r.escalation_level ?? 0, lastActionAt: r.last_action_at ?? null,
  priorityReasons: Array.isArray(r.priority_reasons) ? r.priority_reasons : [],
});

async function event(admin: SupabaseClient, caseId: string, type: string, detail: Record<string, unknown> = {}, actor?: { role: string; id: string }, at?: string) {
  await admin.from("case_events").insert({ case_id: caseId, type, detail, actor_role: actor?.role ?? "system", actor_id: actor?.id ?? null, ...(at ? { at } : {}) });
}

async function openCaseOf(admin: SupabaseClient, motherId: string, subject: string, concern: string): Promise<Case | null> {
  const { data } = await admin.from("cases").select("*").eq("mother_id", motherId).eq("subject", subject).eq("concern", concern).neq("status", "resolved").limit(1);
  return data?.[0] ? mapCase(data[0]) : null;
}

/** Add a signal to a case: point it at the case, and keep the case's worst severity and latest time up to date. */
async function join(admin: SupabaseClient, c: Case, sig: Signal): Promise<Case> {
  await admin.from("signals").update({ case_id: c.id }).eq("id", sig.id);
  const peak = worse(c.severityPeak, sig.severity);
  const last = new Date(sig.observedAt) > new Date(c.lastSignalAt) ? sig.observedAt : c.lastSignalAt;
  if (peak === c.severityPeak && last === c.lastSignalAt) return c;
  const { data } = await admin.from("cases").update({ severity_peak: peak, severity_current: worse(c.severityCurrent, sig.severity), last_signal_at: last }).eq("id", c.id).select("*").single();
  if (peak !== c.severityPeak) await event(admin, c.id, "severity_raised", { signalId: sig.id, from: c.severityPeak, to: peak, code: sig.code }, undefined, sig.observedAt);
  return data ? mapCase(data) : c;
}

/** The case this alert belongs in, creating or reopening one if needed. */
export async function attachSignal(admin: SupabaseClient, sig: Signal, owner?: OwnerFn): Promise<Case | null> {
  // a possibly-related alert from another concern waits inside the case it may belong to, flagged "to confirm"
  if (sig.relation === "POSSIBLY_RELATED" && sig.linkStatus === "suggested" && sig.relatedTo) {
    const { data: anchor } = await admin.from("signals").select("case_id").eq("id", sig.relatedTo).maybeSingle();
    if (anchor?.case_id) {
      const { data: row } = await admin.from("cases").select("*").eq("id", anchor.case_id).maybeSingle();
      if (row) return join(admin, mapCase(row), sig);
    }
  }

  const open = await openCaseOf(admin, sig.motherId, sig.subject, sig.concern);
  if (open) return join(admin, open, sig);

  // resolved less than 7 days before this alert: reopen it instead of starting over
  const since = new Date(new Date(sig.observedAt).getTime() - CASE_REOPEN_DAYS * DAY).toISOString();
  const { data: resolved } = await admin.from("cases").select("*").eq("mother_id", sig.motherId).eq("subject", sig.subject).eq("concern", sig.concern).eq("status", "resolved").gte("resolved_at", since).order("resolved_at", { ascending: false }).limit(1);
  if (resolved?.[0]) {
    const old = mapCase(resolved[0]);
    const { data } = await admin.from("cases").update({ status: "open", resolved_at: null, resolved_by: null, reopened_count: old.reopenedCount + 1 }).eq("id", old.id).select("*").single();
    await event(admin, old.id, "reopened", { signalId: sig.id, code: sig.code }, undefined, sig.observedAt);
    return join(admin, data ? mapCase(data) : old, sig);
  }

  const o = (await owner?.(sig.motherId, sig.concern).catch(() => null)) ?? { proId: null, result: null };
  const { data, error } = await admin.from("cases").insert({
    mother_id: sig.motherId, subject: sig.subject, concern: sig.concern, title: CASE_TITLE[sig.concern].en, status: "open",
    severity_peak: sig.severity, severity_current: sig.severity, owner_pro_id: o.proId, owner_reason: o.result, trigger_signal_id: sig.id,
    opened_at: sig.observedAt, last_signal_at: sig.observedAt,
  }).select("*").single();
  if (error || !data) {
    // two alerts opened it at the same moment: the unique index kept one, so join that one
    const won = await openCaseOf(admin, sig.motherId, sig.subject, sig.concern);
    if (won) return join(admin, won, sig);
    throw error ?? new Error("could not open a case");
  }
  const made = mapCase(data);
  await admin.from("signals").update({ case_id: made.id }).eq("id", sig.id);
  await event(admin, made.id, "opened", { signalId: sig.id, code: sig.code, severity: sig.severity }, undefined, sig.observedAt);
  return made;
}

/** A saved alert got worse (a re-saved check-in went from amber to red): the case's severity follows. */
export async function raiseSignal(admin: SupabaseClient, sig: Signal): Promise<void> {
  if (!sig.caseId) return;
  const { data } = await admin.from("cases").select("*").eq("id", sig.caseId).maybeSingle();
  if (data) await join(admin, mapCase(data), sig);
}

async function recompute(admin: SupabaseClient, caseId: string) {
  const { data } = await admin.from("signals").select("severity, observed_at").eq("case_id", caseId);
  if (!data?.length) return;
  const peak = data.reduce<Severity>((a: Severity, r: any) => worse(a, r.severity), "info");
  const last = data.map((r: any) => r.observed_at as string).sort().at(-1)!;
  await admin.from("cases").update({ severity_peak: peak, severity_current: peak, last_signal_at: last }).eq("id", caseId);
}

/** A clinician confirms that a possibly-related alert belongs with this case. It stays where it is. */
export async function confirmLink(admin: SupabaseClient, sig: Signal, actor: { role: string; id: string }): Promise<void> {
  await admin.from("signals").update({ link_status: "confirmed" }).eq("id", sig.id);
  if (sig.caseId) await event(admin, sig.caseId, "link_confirmed", { signalId: sig.id, code: sig.code }, actor);
}

/**
 * A clinician says this alert does not belong with the others. It leaves the case and gets its own (its concern's open case, or a new one).
 * The case it left is recalculated from what remains.
 */
export async function unlinkSignal(admin: SupabaseClient, sig: Signal, actor: { role: string; id: string }, owner?: OwnerFn): Promise<Case | null> {
  const from = sig.caseId;
  await admin.from("signals").update({ link_status: "unlinked", case_id: null }).eq("id", sig.id);
  if (from) { await event(admin, from, "link_unlinked", { signalId: sig.id, code: sig.code }, actor); await recompute(admin, from); }
  return attachSignal(admin, { ...sig, caseId: null, linkStatus: "unlinked", relation: "NEW", relatedTo: null }, owner);
}

/** Only a professional resolves a case. Nothing else in the app sets this. */
export async function resolveCase(admin: SupabaseClient, caseId: string, actor: { role: string; id: string }): Promise<Case | null> {
  const { data } = await admin.from("cases").update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: actor.id }).eq("id", caseId).neq("status", "resolved").select("*").single();
  if (!data) return null;
  await event(admin, caseId, "resolved", {}, actor);
  return mapCase(data);
}

/** Alerts saved before cases existed (or while the cases table was missing) get their case, oldest first. Safe to run again. */
export async function backfillCases(admin: SupabaseClient, motherIds: string[], owner?: OwnerFn, limit = 300): Promise<number> {
  if (!motherIds.length) return 0;
  const { data, error } = await admin.from("signals").select("*").in("mother_id", motherIds).is("case_id", null).neq("link_status", "unlinked").order("observed_at").limit(limit);
  if (error || !data?.length) return 0;
  let n = 0;
  for (const r of data) { await attachSignal(admin, mapSignal(r), owner); n++; }
  return n;
}
