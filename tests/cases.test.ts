// Run with: node --test tests/cases.test.ts   (Node 22.6+, no extra dependencies)
// Challenge 2: related alerts become one case per concern, with a timeline of what changed.
import test from "node:test";
import assert from "node:assert/strict";
import { recordSignal, type Hooks } from "../lib/signals/record.ts";
import { attachSignal, backfillCases, confirmLink, mapCase, raiseSignal, resolveCase, unlinkSignal, type OwnerFn } from "../lib/cases/attach.ts";
import { bpSeries, newSince, summarySentence, triggeredBy, whatChanged } from "../lib/cases/summary.ts";
import { visibleCases } from "../lib/signals/access.ts";
import type { Concern, Severity, SignalInput, SignalSource } from "../lib/types/cases.ts";
import { fakeDb } from "./fakeDb.ts";

const NOW = Date.now();
const H = 3600000;
const ago = (h: number) => new Date(NOW - h * H).toISOString();
let k = 0;
const input = (code: string, concern: Concern, hoursAgo: number, severity: Severity = "amber", source: SignalSource = "checkin", extra: Partial<SignalInput> = {}): SignalInput =>
  ({ motherId: "priya", subject: "mother", source, code, concern, severity, observedAt: ago(hoursAgo), originTable: "checkins", originId: `00000000-0000-0000-0000-${String(++k).padStart(12, "0")}`, ...extra });

const owner: OwnerFn = async (_m, concern) => ({ proId: concern === "MOOD" ? "rao" : "mehta", result: { proId: concern === "MOOD" ? "rao" : "mehta", proName: concern === "MOOD" ? "Dr Rao" : "Dr Mehta", kind: "returning", sessions: 2 } });
const setup = () => {
  const db = fakeDb();
  const hooks: Hooks = { created: (s) => attachSignal(db.client, s, owner), raised: (s) => raiseSignal(db.client, s) };
  const rec = (i: SignalInput) => recordSignal(db.client, i, hooks);
  return { ...db, rec };
};

test("the first alert opens a case: title, owner, trigger and an 'opened' event", async () => {
  const { tables, rec } = setup();
  const r = await rec(input("bp_raised", "HYPERTENSIVE", 26, "amber", "checkin", { value: { sys: 142, dia: 90 } }));
  assert.equal(tables.cases.length, 1);
  const c = mapCase(tables.cases[0]);
  assert.equal(c.title, "Possible high blood pressure after birth");
  assert.equal(c.status, "open");
  assert.equal(c.severityPeak, "amber");
  assert.equal(c.ownerProId, "mehta");
  assert.equal(c.ownerReason?.kind, "returning");
  assert.equal(c.triggerSignalId, r.signal!.id);
  assert.equal(tables.signals[0].case_id, c.id);
  assert.deepEqual(tables.case_events.map((e) => e.type), ["opened"]);
});

test("related alerts join the same case, and a rise in severity is recorded with its time", async () => {
  const { tables, rec } = setup();
  await rec(input("bp_raised", "HYPERTENSIVE", 26, "amber"));
  await rec(input("headache", "HYPERTENSIVE", 13, "amber"));
  await rec(input("bp_raised", "HYPERTENSIVE", 13, "red"));
  assert.equal(tables.cases.length, 1, "one case, not three");
  assert.ok(tables.signals.every((s) => s.case_id === tables.cases[0].id));
  assert.equal(tables.cases[0].severity_peak, "red");
  const raise = tables.case_events.find((e) => e.type === "severity_raised")!;
  assert.deepEqual([raise.detail.from, raise.detail.to], ["amber", "red"]);
  assert.equal(raise.at, ago(13), "the event carries the time the alert happened");
  assert.equal(tables.cases[0].last_signal_at, ago(13));
});

test("each concern has its own case, and a baby alert never joins the mother's", async () => {
  const { tables, rec } = setup();
  await rec(input("bp_raised", "HYPERTENSIVE", 5, "red"));
  await rec(input("epds_possible", "MOOD", 5, "amber", "epds", { originTable: "epds_results" }));
  await rec(input("b_jaundice", "NEWBORN", 4, "amber", "symptom_checker", { originTable: "symptom_logs", subject: "baby" }));
  assert.deepEqual(tables.cases.map((c) => c.concern).sort(), ["HYPERTENSIVE", "MOOD", "NEWBORN"]);
  assert.equal(tables.cases.find((c) => c.concern === "MOOD")!.owner_pro_id, "rao", "mood goes to the psychologist she knows");
  assert.equal(tables.cases.find((c) => c.concern === "NEWBORN")!.subject, "baby");
});

test("only one open case per mother, subject and concern, even if two alerts open it at once", async () => {
  const { tables, client } = setup();
  const make = async (code: string) => (await recordSignal(client, input(code, "INFECTION", 1))).signal!;
  const a = await make("fever"), b = await make("urine_burn");
  await Promise.all([attachSignal(client, a, owner), attachSignal(client, b, owner)]);
  assert.equal(tables.cases.filter((c) => c.status !== "resolved").length, 1);
  assert.ok(tables.signals.every((s) => s.case_id === tables.cases[0].id));
});

test("a possibly-related alert waits inside the case it may belong to, flagged to confirm, and opens no case of its own", async () => {
  const { tables, rec } = setup();
  await rec(input("bp_raised", "HYPERTENSIVE", 13, "red"));
  await rec(input("dizzy", "HAEMORRHAGE", 12, "amber", "symptom_checker", { originTable: "symptom_logs" }));
  assert.equal(tables.cases.length, 1, "no bleeding case yet: a clinician decides first");
  const dizzy = tables.signals.find((s) => s.code === "dizzy")!;
  assert.equal(dizzy.case_id, tables.cases[0].id);
  assert.equal(dizzy.link_status, "suggested");
});

test("confirming keeps it in the case and records the decision", async () => {
  const { tables, rec, client } = setup();
  await rec(input("bp_raised", "HYPERTENSIVE", 13, "red"));
  await rec(input("dizzy", "HAEMORRHAGE", 12, "amber", "symptom_checker", { originTable: "symptom_logs" }));
  const row = tables.signals.find((s) => s.code === "dizzy")!;
  await confirmLink(client, { id: row.id, caseId: row.case_id, code: "dizzy" } as any, { role: "pro", id: "mehta" });
  assert.equal(tables.signals.find((s) => s.code === "dizzy")!.link_status, "confirmed");
  assert.equal(tables.case_events.filter((e) => e.type === "link_confirmed").length, 1);
  assert.equal(tables.cases.length, 1);
});

test("unlinking gives the alert its own case and the case it left is recalculated", async () => {
  const { tables, rec, client } = setup();
  await rec(input("bp_raised", "HYPERTENSIVE", 13, "amber"));
  await rec(input("fainting", "HAEMORRHAGE", 12, "red", "symptom_checker", { originTable: "symptom_logs" }));
  const bp = tables.cases.find((c) => c.concern === "HYPERTENSIVE")!;
  assert.equal(bp.severity_peak, "red", "the waiting red alert counts while it sits in the case");
  const row = tables.signals.find((s) => s.code === "fainting")!;
  assert.equal(row.link_status, "suggested");
  const own = await unlinkSignal(client, { ...mapRow(row) }, { role: "pro", id: "mehta" }, owner);
  assert.equal(own!.concern, "HAEMORRHAGE");
  assert.equal(tables.cases.length, 2);
  assert.equal(tables.cases.find((c) => c.concern === "HYPERTENSIVE")!.severity_peak, "amber", "peak follows what is left");
  assert.equal(tables.signals.find((s) => s.code === "fainting")!.case_id, own!.id);
  assert.equal(tables.signals.find((s) => s.code === "fainting")!.link_status, "unlinked");
  assert.equal(tables.case_events.filter((e) => e.type === "link_unlinked").length, 1);
});
const mapRow = (r: any) => ({ id: r.id, motherId: r.mother_id, subject: r.subject, source: r.source, code: r.code, concern: r.concern, severity: r.severity, value: r.value, observedAt: r.observed_at, originTable: r.origin_table, originId: r.origin_id, relation: r.relation, relationDetail: r.relation_detail, relatedTo: r.related_to, linkStatus: r.link_status, notified: r.notified, caseId: r.case_id });

test("only a professional resolves a case, and a new alert within 7 days reopens it", async () => {
  const { tables, rec, client } = setup();
  await rec(input("bp_raised", "HYPERTENSIVE", 60, "red"));
  assert.equal(tables.cases[0].status, "open", "nothing closed it");
  const done = await resolveCase(client, tables.cases[0].id, { role: "pro", id: "mehta" });
  assert.equal(done!.status, "resolved");
  assert.equal(tables.cases[0].resolved_by, "mehta");
  assert.equal(await resolveCase(client, tables.cases[0].id, { role: "pro", id: "mehta" }), null, "resolving twice does nothing");

  await rec(input("headache", "HYPERTENSIVE", 0, "amber"));   // resolved just now, so within 7 days
  assert.equal(tables.cases.length, 1, "reopened, not a second case");
  assert.equal(tables.cases[0].status, "open");
  assert.equal(tables.cases[0].reopened_count, 1);
  assert.ok(tables.case_events.some((e) => e.type === "reopened"));
});

test("after 7 days a resolved case stays closed and a new case opens", async () => {
  const { tables, rec } = setup();
  await rec(input("bp_raised", "HYPERTENSIVE", 24 * 20, "red"));
  tables.cases[0].status = "resolved";
  tables.cases[0].resolved_at = ago(24 * 10);   // resolved 10 days before the new alert
  await rec(input("bp_raised", "HYPERTENSIVE", 0, "amber"));
  assert.equal(tables.cases.length, 2);
  assert.equal(tables.cases.filter((c) => c.status === "open").length, 1);
  assert.equal(tables.cases.find((c) => c.status === "open")!.reopened_count, 0);
});

test("red and safety cases never close by themselves, however many alerts or however long", async () => {
  const { tables, rec } = setup();
  await rec(input("epds_q10", "SELF_HARM", 200, "red", "epds", { originTable: "epds_results" }));
  await rec(input("bp_raised", "HYPERTENSIVE", 100, "red"));
  for (let i = 0; i < 6; i++) await rec(input("headache", "HYPERTENSIVE", 90 - i * 10, "amber", i % 2 ? "symptom_checker" : "checkin"));
  assert.ok(tables.cases.every((c) => c.status === "open" && !c.resolved_at), "no code path closes a case except a professional resolving it");
});

test("a re-saved check-in that gets worse raises its case", async () => {
  const { tables, rec } = setup();
  const first = input("bp_raised", "HYPERTENSIVE", 3, "amber", "checkin", { value: { sys: 142, dia: 90 } });
  await rec(first);
  await rec({ ...first, severity: "red", value: { sys: 150, dia: 95 } });
  assert.equal(tables.cases.length, 1);
  assert.equal(tables.cases[0].severity_peak, "red");
  assert.ok(tables.case_events.some((e) => e.type === "severity_raised"));
});

test("alerts saved before cases existed get their case, once, oldest first", async () => {
  const { tables, client } = setup();
  const plain = (code: string, concern: Concern, h: number, severity: Severity) => recordSignal(client, input(code, concern, h, severity)); // no hooks: no case
  await plain("bp_raised", "HYPERTENSIVE", 10, "amber");
  await plain("bp_raised", "HYPERTENSIVE", 2, "red");
  await plain("epds_possible", "MOOD", 5, "amber");
  assert.equal(tables.cases?.length ?? 0, 0);
  assert.equal(await backfillCases(client, ["priya"], owner), 3);
  assert.equal(tables.cases.length, 2);
  assert.equal(tables.cases.find((c) => c.concern === "HYPERTENSIVE")!.severity_peak, "red");
  assert.equal(tables.cases.find((c) => c.concern === "HYPERTENSIVE")!.opened_at, ago(10), "the case opens when its first alert happened");
  assert.equal(await backfillCases(client, ["priya"], owner), 0, "safe to run again");
  assert.equal(tables.cases.length, 2);
});

test("if the cases table is missing the alert is still recorded", async () => {
  const db = fakeDb({}, { failTables: ["cases"] });
  const hooks: Hooks = { created: (s) => attachSignal(db.client, s, owner) };
  const r = await recordSignal(db.client, input("fever", "INFECTION", 1), hooks);
  assert.ok(r.signal, "the alert exists");
  assert.equal(db.tables.signals.length, 1);
  assert.equal(r.notify, true);
});

// ---------- the case page: triggered by, what changed, summary, new since ----------

test("Priya's story becomes one blood pressure case, one mood case and one baby case, with the right numbers", async () => {
  const { tables, rec } = setup();
  const sc: SignalSource = "symptom_checker";
  await rec(input("epds_possible", "MOOD", 48, "amber", "epds", { originTable: "epds_results", value: { total: 11 } }));
  await rec(input("partner_concerns", "MOOD", 30, "amber", "partner_screen", { originTable: "partner_screens" }));
  await rec(input("bp_raised", "HYPERTENSIVE", 26, "amber", "checkin", { value: { sys: 142, dia: 90 } }));
  const red = await rec(input("bp_raised", "HYPERTENSIVE", 13, "red", "checkin", { value: { sys: 148, dia: 94 } }));
  await rec(input("headache", "HYPERTENSIVE", 13, "amber", "checkin"));
  await rec(input("headache_vision", "HYPERTENSIVE", 12.6, "red", sc, { originTable: "symptom_logs" }));
  await rec(input("dizzy", "HAEMORRHAGE", 12.2, "amber", sc, { originTable: "symptom_logs" }));
  await rec(input("loop_no_reply", "HYPERTENSIVE", 8, "red", "care_loop", { originTable: "care_loops", followUpOf: red.signal!.id, forceNotify: true, value: { askedAt: ago(10) } }));
  await rec(input("bp_raised", "HYPERTENSIVE", 2, "red", "checkin", { value: { sys: 152, dia: 96 } }));
  await rec(input("callback_overdue", "HYPERTENSIVE", 1, "red", "callback", { originTable: "flags", followUpOf: red.signal!.id, forceNotify: true }));
  await rec(input("b_jaundice", "NEWBORN", 5, "amber", sc, { originTable: "symptom_logs", subject: "baby" }));

  assert.deepEqual(tables.cases.map((c) => c.concern).sort(), ["HYPERTENSIVE", "MOOD", "NEWBORN"]);
  const bp = mapCase(tables.cases.find((c) => c.concern === "HYPERTENSIVE")!);
  const inBp = tables.signals.filter((s) => s.case_id === bp.id).map(mapRow) as any[];
  assert.equal(inBp.length, 8, "the dizziness waits inside it too");
  assert.equal(inBp.filter((s) => s.linkStatus === "suggested").length, 1, "1 to confirm");
  assert.equal(bp.severityPeak, "red");

  // Triggered by: the alert that opened it and every alert that raised its severity
  const trig = triggeredBy(inBp);
  assert.deepEqual(trig.map((s) => [s.code, s.severity, (s.value as any)?.sys]), [["bp_raised", "amber", 142], ["bp_raised", "red", 148]]);

  // What changed: BP readings, amber to red with its time, sleep
  const chips = whatChanged(inBp, [{ date: ago(72), sleepHours: 5.5 }, { date: ago(24), sleepHours: 4.6 }, { date: ago(1), sleepHours: 3.8 }]);
  const text = chips.map((c) => c.text);
  assert.ok(text.some((t) => t === "BP 142/90 → 148/94 → 152/96"), text.join(" | "));
  assert.ok(text.some((t) => /^Amber → Red at \d{1,2}:\d{2} (am|pm)$/.test(t)), text.join(" | "));
  assert.ok(text.includes("Sleep 5.5 h → 3.8 h"));

  // the summary uses the real numbers and the time she was asked
  const sentence = summarySentence(bp, inBp, "en", (s) => s.code.replace(/_/g, " "));
  assert.match(sentence, /^8 alerts in 25 hours point to raised blood pressure\./);
  assert.match(sentence, /BP rose from 142\/90 to 152\/96/);
  assert.match(sentence, /No reply to the follow-up question since \d{1,2}:\d{2} (am|pm)\./);
  assert.ok(!/AI|undefined|NaN/.test(sentence));
});

test("the Hindi summary is built from the same facts", () => {
  const s = (code: string, h: number, v: any = null): any => ({ id: code + h, code, concern: "HYPERTENSIVE", severity: "amber", value: v, observedAt: ago(h), relation: "NEW", relationDetail: { kind: "NEW" } });
  const out = summarySentence({ concern: "HYPERTENSIVE" }, [s("bp_raised", 5, { sys: 142, dia: 90 }), s("bp_raised", 1, { sys: 150, dia: 95 })], "hi", () => "x");
  assert.match(out, /2 अलर्ट/);
  assert.match(out, /142\/90/);
});

test("'new since you last looked': nothing the first time, then only alerts after your last visit", () => {
  const list: any[] = [{ id: "a", observedAt: ago(10) }, { id: "b", observedAt: ago(3) }, { id: "c", observedAt: ago(1) }];
  assert.equal(newSince(list, null).size, 0, "first time: nothing is called new");
  assert.deepEqual([...newSince(list, ago(5))].sort(), ["b", "c"]);
  assert.equal(newSince(list, ago(0.5)).size, 0);
});

test("the BP chart takes one point per check-in, oldest first, at most 14", () => {
  const cs = Array.from({ length: 20 }, (_, i) => ({ date: ago(24 * (20 - i)), sleepHours: 5, bp: { sys: 110 + i, dia: 70 } }));
  const s = bpSeries([...cs, { date: ago(0), sleepHours: 6 }]);
  assert.equal(s.length, 14);
  assert.equal(s.at(-1)!.sys, 129);
  assert.ok(s[0].sys < s.at(-1)!.sys);
});

test("consent: when she is not sharing, only red or safety cases are visible at all", () => {
  const c = (concern: Concern, peak: Severity): any => ({ id: concern, concern, severityPeak: peak });
  const all = [c("MOOD", "amber"), c("HYPERTENSIVE", "red"), c("SELF_HARM", "amber")];
  assert.equal(visibleCases(all, true).length, 3);
  assert.deepEqual(visibleCases(all, false).map((x) => x.id), ["HYPERTENSIVE", "SELF_HARM"]);
});
