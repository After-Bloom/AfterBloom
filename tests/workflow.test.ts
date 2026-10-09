// Run with: node --test tests/workflow.test.ts   (Node 22.6+, no extra dependencies)
// Challenges 3 and 4: priority, one next action, the three audit records, consent-checked family messages, Ask Priya, the escalation ladder.
import test from "node:test";
import assert from "node:assert/strict";
import { recordSignal, type Hooks } from "../lib/signals/record.ts";
import { attachSignal, type OwnerFn } from "../lib/cases/attach.ts";
import { askMother, recomputeCase, recordAction, runChecks, sendFamilyMessage, WorkflowError, type Notify } from "../lib/workflow/engine.ts";
import { computePriority, settle, WINDOW_MINUTES, type PriorityContext } from "../lib/workflow/priority.ts";
import { ladderLevel, nextStepIn } from "../lib/workflow/escalation.ts";
import { canAsk, canSend } from "../lib/workflow/family.ts";
import { auditSentence, recommended, withOverrides } from "../lib/workflow/playbook.ts";
import type { Concern, Severity, Signal, SignalInput, SignalSource } from "../lib/types/cases.ts";
import { fakeDb } from "./fakeDb.ts";

const NOW = Date.now();
const MIN = 60000, H = 3600000, DAY = 86400000;
const ago = (h: number) => new Date(NOW - h * H).toISOString();
let k = 0;
const input = (code: string, concern: Concern, hoursAgo: number, severity: Severity = "amber", source: SignalSource = "checkin", extra: Partial<SignalInput> = {}): SignalInput =>
  ({ motherId: "priya", subject: "mother", source, code, concern, severity, observedAt: ago(hoursAgo), originTable: "checkins", originId: `00000000-0000-0000-0000-${String(++k).padStart(12, "0")}`, ...extra });

const owner: OwnerFn = async () => ({ proId: "mehta", result: { proId: "mehta", proName: "Dr Mehta", kind: "returning", sessions: 2 } });
const MEHTA = { id: "mehta", role: "pro", name: "Dr Mehta" };
const SEN = { id: "sen", role: "pro", name: "Dr Sen" };

function setup(over: { shares?: boolean; emergency?: boolean; risk?: Record<string, boolean> } = {}) {
  const db = fakeDb({
    mothers: [{ id: "priya", consent_share_pro: over.shares ?? true, consent_emergency_alert: over.emergency ?? true, risk: over.risk ?? { set: true, htn: true, csection: true }, birth_date: new Date(NOW - 16 * DAY).toISOString().slice(0, 10) }],
    profiles: [{ id: "priya", full_name: "Priya Verma", role: "mother" }, { id: "admin1", full_name: "Admin", role: "admin" }, { id: "mehta", full_name: "Dr Mehta", role: "pro" }, { id: "sen", full_name: "Dr Sen", role: "pro" }],
    family_members: [
      { id: "rohan", mother_id: "priya", name: "Rohan", relation: "Husband", sees_alerts: true, user_id: "rohan-user", status: "active" },
      { id: "kamla", mother_id: "priya", name: "Kamla", relation: "Mother-in-law", sees_alerts: false, user_id: "kamla-user", status: "active" },
    ],
    pros: [{ id: "mehta", is_on_call: false, on_duty: true }, { id: "sen", is_on_call: true, on_duty: true }],
  });
  const hooks: Hooks = {
    created: async (s: Signal) => { const c = await attachSignal(db.client, s, owner); if (c) await recomputeCase(db.client, c.id, { now: new Date(s.observedAt).getTime() }); },
    raised: async (s: Signal) => { if (s.caseId) await recomputeCase(db.client, s.caseId, { now: new Date(s.observedAt).getTime() }); },
  };
  const rec = (i: SignalInput) => recordSignal(db.client, i, hooks);
  const sent: { to: string; body?: string; title: string }[] = [];
  const notify: Notify = async (to, n) => { sent.push({ to, body: n.body, title: n.title }); };
  return { ...db, rec, sent, notify };
}

/** Priya's story, as the live app would record it. Returns the id of the BP case. */
async function story(t: ReturnType<typeof setup>) {
  await t.rec(input("bp_raised", "HYPERTENSIVE", 26, "amber", "checkin", { value: { sys: 142, dia: 90 } }));
  const red = await t.rec(input("bp_raised", "HYPERTENSIVE", 13, "red", "checkin", { value: { sys: 148, dia: 94 } }));
  await t.rec(input("headache_vision", "HYPERTENSIVE", 12.6, "red", "symptom_checker", { originTable: "symptom_logs" }));
  await t.rec(input("loop_no_reply", "HYPERTENSIVE", 8, "red", "care_loop", { originTable: "care_loops", followUpOf: red.signal!.id, forceNotify: true }));
  await t.rec(input("bp_raised", "HYPERTENSIVE", 2, "red", "checkin", { value: { sys: 152, dia: 96 } }));
  return t.tables.cases.find((c) => c.concern === "HYPERTENSIVE")!.id as string;
}
const row = (t: ReturnType<typeof setup>, id: string) => t.tables.cases.find((c) => c.id === id)!;

// ---------- priority ----------

const ctx = (o: Partial<PriorityContext> = {}): PriorityContext => ({ now: NOW, day: 30, historyMatch: false, overdue: false, ...o });
const sig = (code: string, concern: Concern, hoursAgo: number, severity: Severity, source: SignalSource = "checkin", value: unknown = null): Signal => ({
  id: `s${++k}`, motherId: "priya", subject: "mother", source, code, concern, severity, value: value as any, observedAt: ago(hoursAgo), originTable: "x", originId: `o${k}`,
  relation: "NEW", relationDetail: { kind: "NEW" }, relatedTo: null, linkStatus: "auto", notified: true, caseId: null,
});

test("Immediate: any safety signal, any red not yet handled", () => {
  assert.equal(computePriority("SELF_HARM", [sig("self_harm", "SELF_HARM", 1, "amber")], [], ctx()).priority, "P1", "safety is Immediate whatever its colour");
  assert.equal(computePriority("HYPERTENSIVE", [sig("bp_raised", "HYPERTENSIVE", 2, "red")], [], ctx()).priority, "P1");
});

test("Urgent: red handled but care not confirmed, EPDS 13 or more, amber getting worse", () => {
  const red = sig("bp_raised", "HYPERTENSIVE", 5, "red");
  const booked = [{ type: "book_session", outcome: "session_booked", at: ago(1) }];
  assert.equal(computePriority("HYPERTENSIVE", [red], booked, ctx()).priority, "P2");
  assert.equal(computePriority("MOOD", [sig("epds_probable", "MOOD", 2, "amber", "epds", { total: 15 })], [], ctx()).priority, "P2");
  assert.equal(computePriority("HYPERTENSIVE", [sig("bp_raised", "HYPERTENSIVE", 5, "amber"), sig("bp_rising", "HYPERTENSIVE", 4, "amber", "bp_trend")], [], ctx()).priority, "P2");
});

test("Soon: EPDS 10 to 12, a single amber", () => {
  assert.equal(computePriority("MOOD", [sig("epds_possible", "MOOD", 2, "amber", "epds", { total: 11 })], [], ctx()).priority, "P3");
  assert.equal(computePriority("INFECTION", [sig("fever", "INFECTION", 2, "amber")], [], ctx()).priority, "P3");
});

test("Monitor: actions done and care confirmed", () => {
  const r = computePriority("HYPERTENSIVE", [sig("bp_raised", "HYPERTENSIVE", 5, "red")], [{ type: "call", outcome: "reached_hospital", at: ago(1) }], ctx());
  assert.equal(r.priority, "P4");
  assert.ok(r.reasons.some((x) => x.key === "care_confirmed"));
});

test("modifiers raise by ONE level only, however many apply", () => {
  const one = computePriority("INFECTION", [sig("fever", "INFECTION", 2, "amber")], [], ctx());
  assert.equal(one.priority, "P3");
  const day3 = computePriority("INFECTION", [sig("fever", "INFECTION", 2, "amber")], [], ctx({ day: 3 }));
  assert.equal(day3.priority, "P2", "first 7 days raises it one level");
  const all = computePriority("INFECTION", [sig("fever", "INFECTION", 2, "amber")], [], ctx({ day: 3, historyMatch: true, overdue: true }));
  assert.equal(all.priority, "P2", "first week + history + overdue together: still just one step up, never two");
  assert.ok(["first_week", "history", "overdue"].every((key) => all.reasons.some((x) => x.key === key)), "every reason that fired is listed");
  const three = computePriority("INFECTION", [sig("fever", "INFECTION", 2, "amber", "checkin"), sig("wound_infection", "INFECTION", 2, "amber", "symptom_checker"), sig("foul_discharge", "INFECTION", 1, "amber", "partner_screen")], [], ctx());
  assert.ok(three.reasons.some((x) => x.key === "sources"), "three sources agreeing is a modifier");
  assert.equal(computePriority("INFECTION", [sig("fever", "INFECTION", 2, "amber")], [], ctx({ overdue: true })).priority, "P2", "overdue raises one level");
  assert.equal(computePriority("HYPERTENSIVE", [sig("bp_raised", "HYPERTENSIVE", 2, "red")], [], ctx({ day: 2, historyMatch: true })).priority, "P1", "nothing goes above Immediate");
});

test("a Monitor case is not raised by modifiers: there is nothing open", () => {
  const r = computePriority("HYPERTENSIVE", [sig("bp_raised", "HYPERTENSIVE", 5, "red")], [{ type: "call", outcome: "reached_ok", at: ago(1) }], ctx({ day: 2, historyMatch: true }));
  assert.equal(r.priority, "P4");
});

test("priority goes down only after a recorded action", () => {
  assert.equal(settle("P3", "P1", []), "P1", "no action: it stays where it was");
  assert.equal(settle("P3", "P1", [{ type: "call", outcome: "reached_ok", at: ago(1) }]), "P3", "after an action it may drop");
  assert.equal(settle("P1", "P3", []), "P1", "and it can always rise");
  assert.equal(settle("P2", null, []), "P2");
});

test("a safety case never drops below Urgent until a professional resolves it", () => {
  const s = [sig("self_harm", "SELF_HARM", 5, "red")];
  assert.equal(computePriority("SELF_HARM", s, [{ type: "call", outcome: "reached_ok", at: ago(1) }], ctx()).priority, "P2");
  assert.equal(computePriority("SELF_HARM", s, [{ type: "resolve", outcome: "resolved_seen", at: ago(1) }], ctx()).priority, "P4");
});

test("time windows: 1 hour, same day, 48 hours, none", () => {
  assert.deepEqual([WINDOW_MINUTES.P1, WINDOW_MINUTES.P2, WINDOW_MINUTES.P3, WINDOW_MINUTES.P4], [60, 720, 2880, null]);
});

// ---------- the live case ----------

test("Priya's blood pressure case is Immediate, with every reason that fired and a one-hour due time", async () => {
  const t = setup();
  const id = await story(t);
  const c = row(t, id);
  assert.equal(c.priority, "P1");
  assert.equal(c.status, "open");
  assert.ok(c.due_by && c.priority_since);
  assert.equal(new Date(c.due_by).getTime() - new Date(c.priority_since).getTime(), 60 * MIN);
  const { gather, explain } = await import("../lib/workflow/engine.ts");
  const why: string[] = explain((await gather(t.client, id))!, NOW).reasons.map((r) => r.key);
  for (const key of ["red_unhandled", "no_reply", "history", "sources"]) assert.ok(why.includes(key), `${key} should be a listed reason: ${why}`);
});

test("one action writes three records together: the action, the case event, and an audit line with her consent at that moment", async () => {
  const t = setup();
  const id = await story(t);
  const r = await recordAction(t.client, { caseId: id, actor: MEHTA, type: "call", outcome: "reached_hospital", now: NOW });
  assert.equal(t.tables.case_actions.length, 1);
  assert.equal(t.tables.case_actions[0].outcome, "reached_hospital");
  assert.ok(t.tables.case_events.some((e) => e.type === "action" && e.detail.outcome === "reached_hospital"));
  const audit = t.tables.audit_log.at(-1)!;
  assert.equal(audit.action, "Called her: reached her, she is going to hospital");
  assert.equal(audit.case_id, id);
  assert.deepEqual(audit.consent_snapshot.family.map((f: any) => [f.name, f.alerts]), [["Rohan", true], ["Kamla", false]], "Rohan: alerts ON | Kamla: OFF");
  assert.equal(audit.consent_snapshot.shares, true);
  assert.equal(r.case!.priority, "P4", "the case drops to Monitor");
  assert.equal(r.case!.status, "monitoring");
  assert.ok(row(t, id).acknowledged_at, "acting on it acknowledges it");
});

test("outcomes are fixed choices: anything else is refused and nothing is written", async () => {
  const t = setup();
  const id = await story(t);
  await assert.rejects(recordAction(t.client, { caseId: id, actor: MEHTA, type: "call", outcome: "whatever" as any }), (e: WorkflowError) => e.code === "bad_outcome");
  await assert.rejects(recordAction(t.client, { caseId: id, actor: MEHTA, type: "call", outcome: "session_booked" }), (e: WorkflowError) => e.code === "bad_outcome", "an outcome for a different action is refused too");
  assert.equal((t.tables.case_actions ?? []).length, 0);
  assert.equal((t.tables.audit_log ?? []).length, 0);
});

test("not reaching her leaves it Immediate; a booked session makes it Urgent until care is confirmed", async () => {
  const t = setup({ risk: {} });
  const id = await story(t);
  assert.equal((await recordAction(t.client, { caseId: id, actor: MEHTA, type: "call", outcome: "not_reached", now: NOW })).case!.priority, "P1");
  assert.equal((await recordAction(t.client, { caseId: id, actor: MEHTA, type: "book_session", outcome: "session_booked", now: NOW + MIN })).case!.priority, "P2");
  assert.equal((await recordAction(t.client, { caseId: id, actor: MEHTA, type: "call", outcome: "reached_ok", now: NOW + 2 * MIN })).case!.priority, "P4");
});

test("a matching high-risk history keeps a handled-but-unconfirmed case Immediate (it raises one level)", async () => {
  const t = setup();   // Priya has high blood pressure in her recovery profile
  const id = await story(t);
  assert.equal((await recordAction(t.client, { caseId: id, actor: MEHTA, type: "book_session", outcome: "session_booked", now: NOW })).case!.priority, "P1");
  assert.equal((await recordAction(t.client, { caseId: id, actor: MEHTA, type: "call", outcome: "reached_hospital", now: NOW + MIN })).case!.priority, "P4", "once care is confirmed nothing is open, so no modifier applies");
});

test("a new red alert after the case was handled brings it straight back to Immediate", async () => {
  const t = setup();
  const id = await story(t);
  await recordAction(t.client, { caseId: id, actor: MEHTA, type: "call", outcome: "reached_hospital", now: NOW - 30 * MIN });
  assert.equal(row(t, id).status, "monitoring");
  await t.rec(input("headache_vision", "HYPERTENSIVE", 0, "red", "symptom_checker", { originTable: "symptom_logs" }));
  const c = row(t, id);
  assert.equal(c.priority, "P1");
  assert.equal(c.status, "open");
  assert.equal(c.acknowledged_at, null, "a new level has not been picked up yet");
});

test("the optional note is encrypted, and dropped (never stored in the clear) if encryption fails", async () => {
  const t = setup();
  const id = await story(t);
  await recordAction(t.client, { caseId: id, actor: MEHTA, type: "call", outcome: "reached_ok", note: "she said she is fine", seal: (s) => `sealed:${Buffer.from(s).toString("base64")}`, now: NOW });
  assert.ok(t.tables.case_actions[0].note_enc.startsWith("sealed:"));
  assert.ok(!JSON.stringify(t.tables).includes("she said she is fine"), "the plain note is nowhere in the database");
  await recordAction(t.client, { caseId: id, actor: MEHTA, type: "call", outcome: "reached_ok", note: "second note", seal: () => { throw new Error("no key"); }, now: NOW + MIN });
  assert.equal(t.tables.case_actions[1].note_enc, null);
  assert.ok(!JSON.stringify(t.tables).includes("second note"));
});

test("resolving is an action: only a professional's 'resolved: seen by a doctor' closes the case", async () => {
  const t = setup();
  const id = await story(t);
  const r = await recordAction(t.client, { caseId: id, actor: MEHTA, type: "resolve", outcome: "resolved_seen", now: NOW });
  assert.equal(r.case!.status, "resolved");
  assert.equal(t.tables.audit_log.at(-1)!.action, "Marked a case as resolved: seen by a doctor");
  await assert.rejects(recordAction(t.client, { caseId: id, actor: MEHTA, type: "call", outcome: "reached_ok" }), (e: WorkflowError) => e.code === "closed");
});

// ---------- family, under her consent ----------

test("a family message goes only to someone she allowed, from a fixed neutral template, and is recorded", async () => {
  const t = setup();
  const id = await story(t);
  await sendFamilyMessage(t.client, { caseId: id, actor: MEHTA, memberId: "rohan", template: "please_call", notify: t.notify, now: NOW });
  assert.deepEqual(t.sent.map((s) => [s.to, s.title, s.body]), [["rohan-user", "AfterBloom", "Please call Priya and check on her today"]]);
  assert.ok(!/blood|pressure|red|hospital|case|score/i.test(t.sent[0].body!), "nothing clinical can leak");
  assert.equal(t.tables.case_actions.at(-1)!.action_type, "family_message");
  assert.equal(t.tables.audit_log.at(-1)!.action, "Sent Rohan a 'please call' message");
});

test("Kamla's alerts are OFF: the message is refused and nothing is sent", async () => {
  const t = setup();
  const id = await story(t);
  await assert.rejects(sendFamilyMessage(t.client, { caseId: id, actor: MEHTA, memberId: "kamla", template: "please_call", notify: t.notify }), (e: WorkflowError) => e.code === "alerts_off");
  assert.equal(t.sent.length, 0);
  assert.equal((t.tables.case_actions ?? []).length, 0);
});

test("consent is checked at the moment of sending: switched off a second ago means refused", async () => {
  const t = setup();
  const id = await story(t);
  t.tables.family_members.find((f) => f.id === "rohan")!.sees_alerts = false;   // she switched Rohan off after the screen loaded
  await assert.rejects(sendFamilyMessage(t.client, { caseId: id, actor: MEHTA, memberId: "rohan", template: "please_call", notify: t.notify }), (e: WorkflowError) => e.code === "alerts_off");
  t.tables.family_members.find((f) => f.id === "rohan")!.sees_alerts = true;
  t.tables.mothers[0].consent_emergency_alert = false;                             // or she withdrew family alerts altogether
  await assert.rejects(sendFamilyMessage(t.client, { caseId: id, actor: MEHTA, memberId: "rohan", template: "please_call", notify: t.notify }), (e: WorkflowError) => e.code === "no_emergency_consent");
  assert.equal(t.sent.length, 0);
});

test("only the fixed templates exist", async () => {
  const t = setup();
  const id = await story(t);
  await assert.rejects(sendFamilyMessage(t.client, { caseId: id, actor: MEHTA, memberId: "rohan", template: "she has high blood pressure" as any, notify: t.notify }), (e: WorkflowError) => e.code === "bad_template");
});

test("Ask Priya: once per family member per case, and her answer is final", async () => {
  const t = setup();
  const id = await story(t);
  const req = await askMother(t.client, { caseId: id, actor: MEHTA, memberId: "kamla", notify: t.notify, now: NOW });
  assert.equal(req.status, "pending");
  assert.deepEqual(t.sent.map((s) => [s.to, s.body]), [["priya", "You have a new message."]], "she is told, in neutral words");
  await assert.rejects(askMother(t.client, { caseId: id, actor: MEHTA, memberId: "kamla", notify: t.notify }), (e: WorkflowError) => e.code === "already_asked");
  // she says Not now
  t.tables.consent_requests[0].status = "declined";
  await assert.rejects(askMother(t.client, { caseId: id, actor: SEN, memberId: "kamla", notify: t.notify }), (e: WorkflowError) => e.code === "already_asked", "No means no: nobody can ask again for this case");
  await assert.rejects(sendFamilyMessage(t.client, { caseId: id, actor: MEHTA, memberId: "kamla", template: "please_call", notify: t.notify }), (e: WorkflowError) => e.code === "declined");
  assert.ok(t.tables.audit_log.some((a) => a.action === "Asked her whether to tell Kamla"));
});

test("Ask Priya is not offered for someone already on, and never during a safety case", async () => {
  const t = setup();
  const id = await story(t);
  await assert.rejects(askMother(t.client, { caseId: id, actor: MEHTA, memberId: "rohan", notify: t.notify }), (e: WorkflowError) => e.code === "alerts_on");
  const s = setup();
  await s.rec(input("epds_q10", "SELF_HARM", 1, "red", "epds", { originTable: "epds_results" }));
  const safetyId = s.tables.cases.find((c) => c.concern === "SELF_HARM")!.id;
  await assert.rejects(askMother(s.client, { caseId: safetyId, actor: MEHTA, memberId: "kamla", notify: s.notify }), (e: WorkflowError) => e.code === "safety_case");
  assert.equal(s.sent.length, 0);
});

test("'Allow once' lets exactly one message through; 'Always allow' turns it on", async () => {
  const t = setup();
  const id = await story(t);
  await askMother(t.client, { caseId: id, actor: MEHTA, memberId: "kamla", notify: t.notify });
  t.tables.consent_requests[0].status = "allow_once";
  await sendFamilyMessage(t.client, { caseId: id, actor: MEHTA, memberId: "kamla", template: "please_call", notify: t.notify });
  assert.ok(t.tables.consent_requests[0].used_at, "marked as used");
  await assert.rejects(sendFamilyMessage(t.client, { caseId: id, actor: MEHTA, memberId: "kamla", template: "check_in", notify: t.notify }), (e: WorkflowError) => e.code === "used");
});

test("the consent rules on their own", () => {
  const on = { id: "a", name: "A", relation: "x", alerts: true }, off = { ...on, alerts: false };
  assert.equal(canSend(true, on, null).ok, true);
  assert.equal(canSend(false, on, null).ok, false);
  assert.equal(canSend(true, off, null).ok, false);
  assert.equal(canSend(true, off, { status: "allow_once", usedAt: null }).ok, true);
  assert.equal(canSend(true, off, { status: "declined", usedAt: null }).ok, false);
  assert.equal(canAsk(off, false, null).ok, true);
  assert.equal(canAsk(off, true, null).ok, false);
  assert.equal(canAsk(on, false, null).ok, false);
});

// ---------- the escalation ladder ----------

test("ladder: assigned doctor, on-call at 15 minutes, admin desk at 30, and never twice", async () => {
  const t = setup();
  const id = await story(t);
  const since = new Date(row(t, id).priority_since).getTime();
  assert.equal((await runChecks(t.client, { notify: t.notify, now: since + 5 * MIN })).escalated, 0);
  assert.equal(t.sent.length, 0);

  assert.equal((await runChecks(t.client, { notify: t.notify, now: since + 16 * MIN })).escalated, 1);
  assert.deepEqual(t.sent.map((s) => s.to), ["sen"], "the on-call backup, not the assigned doctor");
  assert.equal(row(t, id).escalation_level, 2);
  assert.ok(t.tables.pro_patients.some((p) => p.pro_id === "sen" && p.mother_id === "priya"), "the backup is matched with her so they can open the case");
  assert.equal((await runChecks(t.client, { notify: t.notify, now: since + 17 * MIN })).escalated, 0, "running again repeats nothing");
  assert.equal(t.sent.length, 1);

  assert.equal((await runChecks(t.client, { notify: t.notify, now: since + 31 * MIN })).escalated, 1);
  assert.deepEqual(t.sent.map((s) => s.to), ["sen", "admin1"], "then the admin desk");
  assert.equal(row(t, id).escalation_level, 3);
  assert.ok(t.tables.case_events.filter((e) => e.type === "escalated").length === 2);
});

test("acknowledging stops the ladder", async () => {
  const t = setup();
  const id = await story(t);
  const since = new Date(row(t, id).priority_since).getTime();
  await recordAction(t.client, { caseId: id, actor: MEHTA, type: "acknowledge", now: since + 10 * MIN });
  assert.equal((await runChecks(t.client, { notify: t.notify, now: since + 40 * MIN })).escalated, 0);
  assert.equal(t.sent.length, 0);
});

test("Take over: the on-call doctor becomes the owner, it is audited, and it counts as picking it up", async () => {
  const t = setup();
  const id = await story(t);
  const since = new Date(row(t, id).priority_since).getTime();
  await runChecks(t.client, { notify: t.notify, now: since + 16 * MIN });
  await recordAction(t.client, { caseId: id, actor: SEN, type: "take_over", now: since + 20 * MIN });
  const c = row(t, id);
  assert.equal(c.owner_pro_id, "sen");
  assert.equal(c.owner_reason.kind, "taken_over");
  assert.ok(c.acknowledged_at);
  assert.equal(t.tables.audit_log.at(-1)!.action, "Took over a case");
  assert.ok(t.tables.case_events.some((e) => e.type === "taken_over"));
  assert.equal((await runChecks(t.client, { notify: t.notify, now: since + 40 * MIN })).escalated, 0);
});

test("the ladder in numbers", () => {
  const base = { priority: "P1" as const, status: "open", acknowledgedAt: null, prioritySince: new Date(NOW).toISOString() };
  assert.equal(ladderLevel(base, NOW + 14 * MIN), 1);
  assert.equal(ladderLevel(base, NOW + 15 * MIN), 2);
  assert.equal(ladderLevel(base, NOW + 30 * MIN), 3);
  assert.equal(ladderLevel({ ...base, acknowledgedAt: "x" }, NOW + 90 * MIN), 1);
  assert.equal(ladderLevel({ ...base, priority: "P2" as any }, NOW + 90 * MIN), 1, "only Immediate cases climb");
  assert.deepEqual(nextStepIn(base, NOW + 5 * MIN), { level: 2, minutes: 10 });
  assert.equal(nextStepIn(base, NOW + 45 * MIN), null);
});

test("running the checks raises an overdue case by one level", async () => {
  const t = setup({ risk: {} });
  await t.rec(input("fever", "INFECTION", 60, "amber"));   // a single amber, day 16: Soon (48 hours), and it has waited 60 hours
  const id = t.tables.cases.find((c) => c.concern === "INFECTION")!.id;
  assert.equal(row(t, id).priority, "P3");
  await runChecks(t.client, { notify: t.notify, now: NOW });
  assert.equal(row(t, id).priority, "P2", "overdue: one level up");
  assert.ok(t.tables.case_events.some((e) => e.type === "priority_changed" && e.detail.to === "P2"));
  await runChecks(t.client, { notify: t.notify, now: NOW });
  assert.equal(row(t, id).priority, "P2", "and it does not flap back or climb again");
});

// ---------- the playbook ----------

test("one recommended action per concern and priority, with the Call & log outcome button for Immediate", () => {
  const bp = recommended("HYPERTENSIVE", "P1");
  assert.equal(bp.button.en, "Call & log outcome");
  assert.match(bp.guidance.en, /direct her to hospital today/);
  assert.equal(recommended("MOOD", "P3").kind, "book_session");
  assert.equal(recommended("INFECTION", "P4").kind, "monitor");
  assert.ok(recommended("GENERAL", "P2").button.en.length > 0, "every concern has a default");
});

test("a clinician's override replaces the default and falls back where there is none", () => {
  const o = { HYPERTENSIVE: { P1: { button: { en: "Call now", hi: "अभी कॉल करें" } } } };
  assert.equal(withOverrides("HYPERTENSIVE", "P1", o).button.en, "Call now");
  assert.equal(withOverrides("HYPERTENSIVE", "P1", o).guidance.en, recommended("HYPERTENSIVE", "P1").guidance.en, "the guidance is kept");
  assert.equal(withOverrides("MOOD", "P1", o).button.en, recommended("MOOD", "P1").button.en);
  assert.equal(withOverrides("MOOD", "P1", null).button.en, recommended("MOOD", "P1").button.en);
});

test("audit sentences are plain words", () => {
  assert.equal(auditSentence("call", "not_reached"), "Tried to call her: could not reach her");
  assert.equal(auditSentence("monitor", "monitoring", { reason: "improving" }), "Chose to keep watching: she is improving");
  assert.equal(auditSentence("take_over", null), "Took over a case");
});
