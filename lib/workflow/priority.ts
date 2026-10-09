import type { Concern, Signal } from "../types/cases.ts";

// Challenge 3: how urgent is a case, and by when must someone act?
// Plain rules a clinician can read and change. They are DRAFTS pending clinician sign-off (the screens say so).
//
//   Immediate (act within 1 hour)   any safety signal; any red alert not yet handled; a red alert with no reply to the follow-up
//   Urgent    (act the same day)    amber getting worse; red handled but care not confirmed; EPDS 13 or more
//   Soon      (act within 48 hours) EPDS 10 to 12; a single amber; a falling mood or sleep trend
//   Monitor   (next check)          actions done and care confirmed; information only
//
// Modifiers raise the level by ONE step (never more): no reply to the follow-up, overdue, a matching high-risk history,
// three or more sources agreeing, the first 7 days after birth. The priority only goes DOWN after a recorded action.

export type Priority = "P1" | "P2" | "P3" | "P4";
export const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4"];
export const RANK: Record<Priority, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };   // lower = more urgent
export const higher = (a: Priority, b: Priority) => (RANK[a] <= RANK[b] ? a : b);
const raise = (p: Priority): Priority => PRIORITIES[Math.max(0, RANK[p] - 1)];

/** How long a case may wait at each priority. P4 has no deadline: it is looked at on the next routine check. */
export const WINDOW_MINUTES: Record<Priority, number | null> = { P1: 60, P2: 12 * 60, P3: 48 * 60, P4: null };

// ---------- what the professional has done ----------
/** The fixed choices for what happened. `handled` = a person acted on it; `confirmed` = care is confirmed (she is being looked after). */
export const OUTCOMES = {
  reached_hospital: { handled: true, confirmed: true, resolves: false },     // Reached her, she is going to hospital
  reached_ok: { handled: true, confirmed: true, resolves: false },           // Reached her, advised, she is comfortable
  not_reached: { handled: false, confirmed: false, resolves: false },
  session_booked: { handled: true, confirmed: false, resolves: false },
  referred: { handled: true, confirmed: false, resolves: false },
  family_informed: { handled: false, confirmed: false, resolves: false },
  monitoring: { handled: true, confirmed: false, resolves: false },
  resolved_seen: { handled: true, confirmed: true, resolves: true },          // Resolved: seen by a doctor
} as const;
export type Outcome = keyof typeof OUTCOMES;

export type ActionLite = { type: string; outcome: string | null; at: string };

export type Reason =
  | { key: "safety" } | { key: "red_unhandled" } | { key: "red_handled" } | { key: "amber_worse" } | { key: "epds_high"; total?: number }
  | { key: "epds_mid"; total?: number } | { key: "amber_single" } | { key: "mood_trend" } | { key: "care_confirmed" } | { key: "info_only" } | { key: "safety_followup" }
  | { key: "no_reply"; raises: true } | { key: "overdue"; raises: true } | { key: "history"; raises: true; what?: string } | { key: "sources"; raises: true; n: number } | { key: "first_week"; raises: true; day: number };

export type PriorityContext = {
  now: number;
  /** days since the birth (0 on the day) */
  day: number;
  /** her recovery profile has a risk that matches this concern (high BP history for a blood pressure case ...) */
  historyMatch: boolean;
  /** the case is past its due time and nobody has acted */
  overdue: boolean;
};

export type PriorityResult = { priority: Priority; base: Priority; reasons: Reason[]; dueMinutes: number | null };

const ms = (iso: string) => new Date(iso).getTime();
const isHandled = (a: ActionLite) => !!a.outcome && a.outcome in OUTCOMES && OUTCOMES[a.outcome as Outcome].handled;
const isConfirmed = (a: ActionLite) => !!a.outcome && a.outcome in OUTCOMES && OUTCOMES[a.outcome as Outcome].confirmed;

/** The concerns whose history in her recovery profile matters ("pre-eclampsia history" for a blood pressure case). */
export function historyMatches(concern: Concern, risk: Record<string, unknown> | null | undefined): { match: boolean; what?: string } {
  const r = risk ?? {};
  if (concern === "HYPERTENSIVE" && r.htn) return { match: true, what: "htn" };
  if (concern === "HAEMORRHAGE" && r.pph) return { match: true, what: "pph" };
  if (concern === "INFECTION" && (r.csection || r.gdm)) return { match: true, what: r.csection ? "csection" : "gdm" };
  return { match: false };
}

export function computePriority(concern: Concern, signals: Signal[], actions: ActionLite[], ctx: PriorityContext): PriorityResult {
  // alerts waiting inside the case for a clinician's decision count like any other: they are not hidden, they are flagged
  const live = signals.filter((s) => s.linkStatus !== "unlinked");
  const handledAt = actions.filter(isHandled).map((a) => ms(a.at)).sort((a, b) => b - a)[0] ?? -Infinity;
  const unhandled = live.filter((s) => ms(s.observedAt) > handledAt);                       // alerts that came after the last time someone acted
  const confirmedAfter = actions.some((a) => isConfirmed(a) && ms(a.at) >= Math.max(...live.map((s) => ms(s.observedAt)), -Infinity));
  const reasons: Reason[] = [];
  const has = (code: string) => unhandled.some((s) => s.code === code);

  const safetySignal = live.some((s) => s.concern === "SELF_HARM");
  const safetyUnhandled = unhandled.some((s) => s.concern === "SELF_HARM");
  const redUnhandled = unhandled.some((s) => s.severity === "red");
  const redEver = live.some((s) => s.severity === "red");
  const amberUnhandled = unhandled.filter((s) => s.severity === "amber");
  const epdsTotal = Math.max(0, ...unhandled.filter((s) => s.code.startsWith("epds")).map((s) => Number((s.value as { total?: number } | null)?.total ?? 0)));

  let base: Priority;
  if (safetyUnhandled) { base = "P1"; reasons.push({ key: "safety" }); }
  else if (redUnhandled) { base = "P1"; reasons.push({ key: "red_unhandled" }); }
  else if (safetySignal) {
    // a safety case never drops below Urgent until a professional resolves it
    base = confirmedAfter && actions.some((a) => a.outcome === "resolved_seen") ? "P4" : "P2";
    reasons.push({ key: "safety_followup" });
  } else if (redEver && !confirmedAfter) { base = "P2"; reasons.push({ key: "red_handled" }); }
  else if (epdsTotal >= 13) { base = "P2"; reasons.push({ key: "epds_high", total: epdsTotal }); }
  else if (amberUnhandled.length >= 3 || has("bp_rising") || has("loop_worse") || has("loop_cant_reach")) { base = "P2"; reasons.push({ key: "amber_worse" }); }
  else if (epdsTotal >= 10) { base = "P3"; reasons.push({ key: "epds_mid", total: epdsTotal }); }
  else if (amberUnhandled.length > 0) {
    base = "P3";
    reasons.push({ key: concern === "MOOD" && amberUnhandled.length > 1 ? "mood_trend" : "amber_single" });
  } else if (actions.some(isHandled) && confirmedAfter) { base = "P4"; reasons.push({ key: "care_confirmed" }); }
  else if (actions.some(isHandled)) { base = "P3"; reasons.push({ key: "red_handled" }); }
  else { base = "P4"; reasons.push({ key: "info_only" }); }

  // modifiers: raise by ONE level in total, and only while there is something still open
  if (base !== "P4") {
    const mods: Reason[] = [];
    if (unhandled.some((s) => s.code === "loop_no_reply")) mods.push({ key: "no_reply", raises: true });
    if (ctx.overdue) mods.push({ key: "overdue", raises: true });
    if (ctx.historyMatch) mods.push({ key: "history", raises: true });
    const sources = new Set(unhandled.filter((s) => s.severity !== "info").map((s) => s.source));
    if (sources.size >= 3) mods.push({ key: "sources", raises: true, n: sources.size });
    if (ctx.day <= 7) mods.push({ key: "first_week", raises: true, day: ctx.day });
    reasons.push(...mods);
    if (mods.length) base = raise(base);
  }
  const priority = base;
  return { priority, base, reasons, dueMinutes: WINDOW_MINUTES[priority] };
}

/**
 * The priority that is actually stored. If nobody has acted on the case, it can never be lower than it already was
 * (priority goes down only after a recorded action).
 */
export function settle(computed: Priority, stored: Priority | null, actions: ActionLite[]): Priority {
  if (!stored || actions.length > 0) return computed;
  return higher(computed, stored);
}
