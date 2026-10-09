import type { SupabaseClient } from "@supabase/supabase-js";
import type { Case, Signal } from "../types/cases.ts";
import { mapCase, resolveCase } from "../cases/attach.ts";
import { mapSignal } from "../signals/record.ts";
import { OUTCOMES, WINDOW_MINUTES, computePriority, historyMatches, settle, RANK, type ActionLite, type Outcome, type Priority, type PriorityResult } from "./priority.ts";
import { FAMILY_TEMPLATES, OUTCOMES_FOR, auditSentence, type ActionType, type TemplateId } from "./playbook.ts";
import { canAsk, canSend, snapshotOf, type ConsentSnapshot, type FamilyMember, type RequestState } from "./family.ts";
import { ladderLevel } from "./escalation.ts";
import { effectiveShares } from "../consent.ts";

// The workflow, applied to the database: work out each case's priority, record what a professional does (three records written together),
// tell family only under her consent, ask her when she has said no, and climb the escalation ladder when nobody picks a case up.
// Every function takes the database client (and the sending of notifications) as an argument, so the same code runs in the app and in the tests.

export type Notify = (userId: string, n: { mother_id?: string | null; kind: string; title: string; body?: string; url?: string }) => Promise<unknown>;
export type Actor = { id: string; role: string; name: string };
const DAY = 86400000;
const first = (name: string) => (name || "She").split(" ")[0];

export class WorkflowError extends Error {
  code: string;
  constructor(code: string, message?: string) { super(message ?? code); this.code = code; }
}

// ---------- reading what a case needs ----------
export type Gathered = { c: Case; signals: Signal[]; actions: (ActionLite & { id: string; actorId: string | null; detail: Record<string, unknown>; noteEnc: string | null })[]; risk: Record<string, unknown>; birth: string | null };

export async function gather(admin: SupabaseClient, caseId: string): Promise<Gathered | null> {
  const { data: row } = await admin.from("cases").select("*").eq("id", caseId).maybeSingle();
  if (!row) return null;
  const c = mapCase(row);
  const [{ data: sigs }, { data: acts }, { data: mother }] = await Promise.all([
    admin.from("signals").select("*").eq("case_id", caseId).order("observed_at").limit(500),
    admin.from("case_actions").select("*").eq("case_id", caseId).order("created_at").limit(300),
    admin.from("mothers").select("risk, birth_date").eq("id", c.motherId).maybeSingle(),
  ]);
  return {
    c, signals: (sigs ?? []).map(mapSignal),
    actions: (acts ?? []).map((a: any) => ({ id: a.id, type: a.action_type, outcome: a.outcome ?? null, at: a.created_at, actorId: a.actor_id ?? null, detail: a.detail ?? {}, noteEnc: a.note_enc ?? null })),
    risk: (mother as any)?.risk ?? {}, birth: (mother as any)?.birth_date ?? null,
  };
}

/** The priority and the reasons for it, worked out now. Does not save anything. */
export function explain(g: Gathered, now = Date.now()): PriorityResult {
  const day = g.birth ? Math.max(0, Math.floor((now - new Date(g.birth).getTime()) / DAY)) : 99;
  const since = g.c.prioritySince ? new Date(g.c.prioritySince).getTime() : null;
  const actedSince = since !== null && g.actions.some((a) => new Date(a.at).getTime() >= since);
  const overdue = !!g.c.dueBy && now > new Date(g.c.dueBy).getTime() && !actedSince && !g.c.acknowledgedAt;
  return computePriority(g.c.concern, g.signals, g.actions, { now, day, historyMatch: historyMatches(g.c.concern, g.risk).match, overdue });
}

// ---------- priority ----------
/**
 * Work out a case's priority and save it. The due time counts from the moment it reached that priority. A rise starts a fresh
 * escalation (nobody has acknowledged this level yet); a drop only ever follows a recorded action (see settle()).
 * `anchor` lets the demo say "it became Immediate 5 minutes ago" so a countdown is visible straight after reset.
 */
export async function recomputeCase(admin: SupabaseClient, caseId: string, opts: { now?: number; anchor?: string } = {}): Promise<Case | null> {
  const now = opts.now ?? Date.now();
  const g = await gather(admin, caseId);
  if (!g || g.c.status === "resolved") return g?.c ?? null;
  const res = explain(g, now);
  const stored = (g.c.priority as Priority | null) ?? null;
  const next = settle(res.priority, stored, g.actions);
  const patch: Record<string, unknown> = {};

  if (next !== stored) {
    const rising = !stored || RANK[next] < RANK[stored];
    const since = opts.anchor ?? new Date(now).toISOString();
    patch.priority = next;
    patch.priority_since = since;
    patch.due_by = WINDOW_MINUTES[next] === null ? null : new Date(new Date(since).getTime() + WINDOW_MINUTES[next]! * 60000).toISOString();
    if (rising) { patch.escalation_level = 0; patch.acknowledged_at = null; }   // a new level has not been picked up yet
    await admin.from("case_events").insert({ case_id: caseId, type: "priority_changed", detail: { from: stored, to: next }, actor_role: "system", at: new Date(now).toISOString() });
  } else if (opts.anchor && stored) {
    patch.priority_since = opts.anchor;
    patch.due_by = WINDOW_MINUTES[stored] === null ? null : new Date(new Date(opts.anchor).getTime() + WINDOW_MINUTES[stored]! * 60000).toISOString();
  }
  if (JSON.stringify(res.reasons) !== JSON.stringify(g.c.priorityReasons)) patch.priority_reasons = res.reasons;   // the card shows why, without re-working it
  // a case that is Monitor with care confirmed is "monitoring"; any new alert opens it again
  const status = next === "P4" && g.actions.some((a) => a.outcome && a.outcome in OUTCOMES && OUTCOMES[a.outcome as Outcome].handled) ? "monitoring" : "open";
  if (status !== g.c.status) patch.status = status;
  if (!Object.keys(patch).length) return g.c;
  const { data } = await admin.from("cases").update(patch).eq("id", caseId).select("*").single();
  return data ? mapCase(data) : g.c;
}

// ---------- her consent, now ----------
async function consentOf(admin: SupabaseClient, motherId: string) {
  const [{ data: m }, { data: fam }, { data: p }] = await Promise.all([
    admin.from("mothers").select("consent_share_pro, consent_emergency_alert, sharing_paused_until").eq("id", motherId).maybeSingle(),
    admin.from("family_members").select("id, name, relation, sees_alerts, user_id, status").eq("mother_id", motherId).neq("status", "removed"),
    admin.from("profiles").select("full_name").eq("id", motherId).maybeSingle(),
  ]);
  const members = (fam ?? []).map((f: any) => ({ id: f.id as string, name: f.name as string, relation: f.relation as string, alerts: !!f.sees_alerts, userId: (f.user_id ?? null) as string | null }));
  // a pause (B8) works exactly like switching consent_share_pro off for a while; family alert consent is a separate switch and is untouched by it
  const shares = effectiveShares(!!(m as any)?.consent_share_pro, (m as any)?.sharing_paused_until ?? null), emergency = !!(m as any)?.consent_emergency_alert;
  return { shares, emergency, members, motherName: ((p as any)?.full_name as string) ?? "", snapshot: snapshotOf(shares, emergency, members) as ConsentSnapshot };
}
export { consentOf };

const requestOf = async (admin: SupabaseClient, caseId: string, memberId: string): Promise<(RequestState & { id: string }) | null> => {
  const { data } = await admin.from("consent_requests").select("*").eq("case_id", caseId).eq("family_member_id", memberId).maybeSingle();
  return data ? { id: data.id, status: data.status, usedAt: data.used_at ?? null } : null;
};
export { requestOf };

// ---------- recording an action: three records, written together ----------
export type ActionParams = { caseId: string; actor: Actor; type: ActionType; outcome?: Outcome | null; detail?: Record<string, unknown>; note?: string | null; seal?: (plain: string) => string; now?: number };

/**
 * One action = a case_actions row + a case_events row + an audit_log row (with a snapshot of her consent at that moment).
 * The outcome must be one of the fixed choices for that action. An optional note is encrypted; if it cannot be, it is dropped, never stored plain.
 */
export async function recordAction(admin: SupabaseClient, p: ActionParams): Promise<{ case: Case | null; actionId: string }> {
  const g = await gather(admin, p.caseId);
  if (!g) throw new WorkflowError("not_found");
  if (g.c.status === "resolved" && p.type !== "acknowledge") throw new WorkflowError("closed", "This case is already resolved");
  const allowed = (OUTCOMES_FOR as Record<string, Outcome[]>)[p.type];
  if (allowed && !(p.outcome && allowed.includes(p.outcome))) throw new WorkflowError("bad_outcome");
  const now = p.now ?? Date.now();
  const at = new Date(now).toISOString();

  let noteEnc: string | null = null;
  if (p.note && p.seal) { try { noteEnc = p.seal(String(p.note).slice(0, 500)); } catch { noteEnc = null; } }   // no key, no note: never stored in the clear

  const cs = await consentOf(admin, g.c.motherId);
  const outcome = p.type === "family_message" ? "family_informed" : (p.outcome ?? null);
  const detail = { ...(p.detail ?? {}) };
  const { data: act, error } = await admin.from("case_actions").insert({ case_id: p.caseId, actor_id: p.actor.id, actor_role: p.actor.role, action_type: p.type, outcome, detail, note_enc: noteEnc, created_at: at }).select("id").single();
  if (error || !act) throw new WorkflowError("save_failed", error?.message);
  await admin.from("case_events").insert({ case_id: p.caseId, type: "action", actor_role: p.actor.role, actor_id: p.actor.id, detail: { actionId: act.id, actionType: p.type, outcome, ...detail }, at });
  await admin.from("audit_log").insert({
    actor_id: p.actor.id, actor_name: p.actor.name, mother_id: g.c.motherId, case_id: p.caseId, consent_snapshot: cs.snapshot,
    action: auditSentence(p.type, outcome as Outcome | null, { reason: detail.reason as string | undefined, familyName: detail.familyName as string | undefined }), at,
  });

  // acknowledging, and the effects of the action itself
  const patch: Record<string, unknown> = { last_action_at: at };
  if (!g.c.acknowledgedAt && p.type !== "family_message") patch.acknowledged_at = at;   // telling family is not the same as picking the case up
  if (p.type === "take_over") {
    patch.owner_pro_id = p.actor.id;
    patch.owner_reason = { proId: p.actor.id, proName: p.actor.name, kind: "taken_over", sessions: 0, at };
    await admin.from("case_events").insert({ case_id: p.caseId, type: "taken_over", actor_role: p.actor.role, actor_id: p.actor.id, detail: { from: g.c.ownerProId }, at });
  }
  await admin.from("cases").update(patch).eq("id", p.caseId);
  if (outcome && OUTCOMES[outcome as Outcome]?.resolves) await resolveCase(admin, p.caseId, { role: p.actor.role, id: p.actor.id });
  const c = await recomputeCase(admin, p.caseId, { now });
  return { case: c, actionId: act.id };
}

// ---------- telling family, only under her consent ----------
const CUSTOM_MESSAGE_MAX = 300;

/**
 * `customText`, when given, replaces the fixed template. Her consent is still checked exactly the same way,
 * and the send is still recorded the same way; only the wording stops being limited to the three templates.
 */
export async function sendFamilyMessage(admin: SupabaseClient, p: { caseId: string; actor: Actor; memberId: string; template: TemplateId; customText?: string | null; notify: Notify; lang?: "en" | "hi"; now?: number }) {
  const g = await gather(admin, p.caseId);
  if (!g) throw new WorkflowError("not_found");
  if (!(p.template in FAMILY_TEMPLATES)) throw new WorkflowError("bad_template");
  const custom = p.customText?.trim().slice(0, CUSTOM_MESSAGE_MAX) || null;
  const cs = await consentOf(admin, g.c.motherId);                         // read now, not from what the screen showed
  const member = cs.members.find((m) => m.id === p.memberId);
  if (!member) throw new WorkflowError("no_member");
  const req = await requestOf(admin, p.caseId, p.memberId);
  const check = canSend(cs.emergency, member as FamilyMember, req);
  if (check.ok === false) throw new WorkflowError(check.reason, `Not sent: ${check.reason}`);
  if (!member.userId) throw new WorkflowError("not_joined", "That person has not joined the family circle yet");

  const body = custom ?? FAMILY_TEMPLATES[p.template][p.lang ?? "en"](first(cs.motherName));
  await p.notify(member.userId, { mother_id: g.c.motherId, kind: "support", title: "AfterBloom", body, url: "/family-view" });   // neutral title
  if (check.via === "allow_once" && req) await admin.from("consent_requests").update({ used_at: new Date(p.now ?? Date.now()).toISOString() }).eq("id", req.id);
  return recordAction(admin, { caseId: p.caseId, actor: p.actor, type: "family_message", detail: { familyMemberId: member.id, familyName: member.name, template: p.template, via: check.via, ...(custom ? { customText: custom } : {}) }, now: p.now });
}

// ---------- asking her ----------
export async function askMother(admin: SupabaseClient, p: { caseId: string; actor: Actor; memberId: string; notify: Notify; now?: number }) {
  const g = await gather(admin, p.caseId);
  if (!g) throw new WorkflowError("not_found");
  const cs = await consentOf(admin, g.c.motherId);
  const member = cs.members.find((m) => m.id === p.memberId);
  if (!member) throw new WorkflowError("no_member");
  const safety = g.c.concern === "SELF_HARM" || g.signals.some((s) => s.concern === "SELF_HARM");
  const check = canAsk(member as FamilyMember, safety, await requestOf(admin, p.caseId, p.memberId));
  if (check.ok === false) throw new WorkflowError(check.reason);
  const at = new Date(p.now ?? Date.now()).toISOString();
  const { data, error } = await admin.from("consent_requests").insert({ case_id: p.caseId, mother_id: g.c.motherId, family_member_id: member.id, requested_by: p.actor.id, status: "pending", created_at: at }).select("*").single();
  if (error || !data) throw new WorkflowError("already_asked");   // the unique index: a second request for the same person and case
  await admin.from("case_events").insert({ case_id: p.caseId, type: "family_asked", actor_role: p.actor.role, actor_id: p.actor.id, detail: { familyMemberId: member.id, familyName: member.name }, at });
  await admin.from("audit_log").insert({ actor_id: p.actor.id, actor_name: p.actor.name, mother_id: g.c.motherId, case_id: p.caseId, consent_snapshot: cs.snapshot, action: `Asked her whether to tell ${member.name}`, at });
  await p.notify(g.c.motherId, { mother_id: g.c.motherId, kind: "info", title: "AfterBloom", body: "You have a new message.", url: "/home" });   // neutral wording for a shared phone
  return data;
}

// ---------- the clock: priorities and the escalation ladder ----------
/**
 * Called whenever the queue loads and from "Run checks now". It re-works every open case's priority (so an overdue case rises) and moves
 * unacknowledged Immediate cases up the ladder: the assigned doctor, then the on-call backup at 15 minutes, then the admin desk at 30.
 * Safe to run twice: a step is only taken when the case is not already on it.
 */
export async function runChecks(admin: SupabaseClient, p: { notify: Notify; now?: number }): Promise<{ checked: number; escalated: number }> {
  const now = p.now ?? Date.now();
  const { data: open } = await admin.from("cases").select("id, priority, due_by, acknowledged_at, escalation_level").neq("status", "resolved").limit(500);
  let escalated = 0;
  // Only the cases the clock can change need a closer look: one with no priority yet, one past its due time, or an Immediate one nobody has picked up.
  // Everything else is left alone, so loading the queue stays quick however many cases there are.
  const watch = (open ?? []).filter((r: any) => !r.priority || (r.priority !== "P4" && r.due_by && new Date(r.due_by).getTime() < now) || (r.priority === "P1" && !r.acknowledged_at));
  for (const r of watch) {
    let c = await recomputeCase(admin, r.id, { now });
    if (!c || c.status === "resolved") continue;
    const level = ladderLevel({ priority: c.priority as Priority | null, status: c.status, acknowledgedAt: c.acknowledgedAt, prioritySince: c.prioritySince }, now);
    if (level <= Math.max(1, c.escalationLevel)) continue;
    const { data: moved } = await admin.from("cases").update({ escalation_level: level }).eq("id", c.id).lt("escalation_level", level).select("id");   // claim the step first, so two runs cannot both send
    if (!moved?.length) continue;
    escalated++;
    await admin.from("case_events").insert({ case_id: c.id, type: "escalated", actor_role: "system", detail: { level }, at: new Date(now).toISOString() });
    const who = level === 2
      ? ((await admin.from("pros").select("id").eq("is_on_call", true).eq("on_duty", true)).data ?? []).map((x: any) => x.id as string).filter((id) => id !== c.ownerProId)
      : ((await admin.from("profiles").select("id").eq("role", "admin")).data ?? []).map((x: any) => x.id as string);
    if (level === 2) await Promise.all(who.map((id) => admin.from("pro_patients").upsert({ pro_id: id, mother_id: c!.motherId })));   // the backup must be able to open her case
    await Promise.all(who.map((id) => p.notify(id, { mother_id: c.motherId, kind: "emergency", title: level === 2 ? "URGENT: a case has not been picked up" : "URGENT: admin desk, a case is still not picked up", body: level === 2 ? "You are the on-call backup. Please open the action queue." : "Nobody has acknowledged an Immediate case for 30 minutes.", url: "/pro/alerts" })));
  }
  return { checked: open?.length ?? 0, escalated };
}
