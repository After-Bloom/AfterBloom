// Run with: node --test tests/record.test.ts   (Node 22.6+, no extra dependencies)
// recordSignal() against an in-memory database: saving, re-saving, racing, failing safely, and the demo story end to end.
import test from "node:test";
import assert from "node:assert/strict";
import { recordAll, recordSignal, shouldNotify } from "../lib/signals/record.ts";
import { deriveFromCheckin, deriveFromEpds } from "../lib/signals/derive.ts";
import type { Concern, Severity, SignalInput, SignalSource } from "../lib/types/cases.ts";
import { fakeDb } from "./fakeDb.ts";

const NOW = Date.now();
const ago = (h: number) => new Date(NOW - h * 3600000).toISOString();
let k = 0;
const input = (code: string, concern: Concern, hoursAgo: number, severity: Severity = "amber", source: SignalSource = "checkin", extra: Partial<SignalInput> = {}): SignalInput =>
  ({ motherId: "priya", subject: "mother", source, code, concern, severity, observedAt: ago(hoursAgo), originTable: "checkins", originId: `00000000-0000-0000-0000-${String(++k).padStart(12, "0")}`, ...extra });

test("a first alert is saved as a new concern and tells the care team", async () => {
  const { client, tables } = fakeDb();
  const r = await recordSignal(client, input("bp_raised", "HYPERTENSIVE", 5, "amber", "checkin", { value: { sys: 142, dia: 90 } }));
  assert.equal(r.created, true);
  assert.equal(r.notify, true);
  assert.equal(tables.signals.length, 1);
  assert.equal(tables.signals[0].relation, "NEW");
  assert.deepEqual(tables.signals[0].value, { sys: 142, dia: 90 });
});

test("saving the same check-in again updates the same signal and never adds a duplicate", async () => {
  const { client, tables } = fakeDb();
  const first = input("bp_raised", "HYPERTENSIVE", 5, "amber", "checkin", { value: { sys: 142, dia: 90 } });
  await recordSignal(client, first);
  const same = await recordSignal(client, { ...first, value: { sys: 142, dia: 90 } });
  assert.equal(tables.signals.length, 1);
  assert.equal(same.created, false);
  const rose = await recordSignal(client, { ...first, severity: "red", value: { sys: 148, dia: 94 } });
  assert.equal(tables.signals.length, 1, "re-saving with a worse reading still one signal");
  assert.equal(tables.signals[0].severity, "red");
  assert.deepEqual(tables.signals[0].value, { sys: 148, dia: 94 });
  assert.equal(rose.notify, true, "amber to red on a re-save tells the care team");
  await recordSignal(client, { ...first, severity: "amber" });
  assert.equal(tables.signals[0].severity, "red", "severity never lowers on its own, even if the same check-in is re-saved milder");
});

test("two alerts racing for the same origin keep only one signal (the unique index) and both get the same answer", async () => {
  const { client, tables } = fakeDb();
  const one = input("fever", "INFECTION", 1, "amber", "symptom_checker");
  const [a, b] = await Promise.all([recordSignal(client, one), recordSignal(client, { ...one })]);
  assert.equal(tables.signals.length, 1);
  assert.equal(a.notify, b.notify);
});

test("if signals cannot be saved at all (migration not run), nothing throws and the care team is told", async () => {
  const { client } = fakeDb({}, { failTables: ["signals"] });
  const r = await recordSignal(client, input("bp_raised", "HYPERTENSIVE", 1, "red"));
  assert.equal(r.signal, null);
  assert.equal(r.notify, true, "the safe default when grouping is unavailable is to tell");
  assert.equal(shouldNotify([r]), true);
  assert.equal(shouldNotify([]), true, "an event with no signals at all is also told");
});

test("a repeat of something already known is held back, but is still saved and counted", async () => {
  const { client, tables } = fakeDb();
  await recordSignal(client, input("headache", "HYPERTENSIVE", 4, "amber", "symptom_checker"));
  const again = await recordSignal(client, input("headache", "HYPERTENSIVE", 0, "amber", "symptom_checker"));
  assert.equal(tables.signals.length, 2, "nothing is dropped");
  assert.equal(again.notify, false);
  assert.equal(tables.signals[1].relation, "DUPLICATE");
  assert.equal(tables.signals[1].notified, false);
  assert.equal(tables.signals[1].relation_detail.count, 2);
  assert.equal(tables.signals[1].related_to, tables.signals[0].id);
});

test("alerts from another mother never leak into this mother's grouping", async () => {
  const { client, tables } = fakeDb();
  await recordSignal(client, input("bp_raised", "HYPERTENSIVE", 2, "red", "checkin", { motherId: "anjali" }));
  const r = await recordSignal(client, input("bp_raised", "HYPERTENSIVE", 1, "red"));
  assert.equal(tables.signals.at(-1)!.relation, "NEW");
  assert.equal(r.notify, true);
});

test("a follow-up points at the alert it exists because of, and forceNotify makes sure a silent mother reaches a human", async () => {
  const { client, tables } = fakeDb();
  const red = await recordSignal(client, input("bp_raised", "HYPERTENSIVE", 6, "red"));
  const f = await recordSignal(client, input("loop_no_reply", "HYPERTENSIVE", 0, "red", "care_loop", { originTable: "care_loops", followUpOf: red.signal!.id, forceNotify: true }));
  assert.equal(tables.signals[1].relation, "FOLLOW_UP");
  assert.equal(tables.signals[1].related_to, red.signal!.id);
  assert.equal(f.notify, true);
  const quiet = await recordSignal(client, input("callback_overdue", "HYPERTENSIVE", 0, "red", "callback", { originTable: "flags", followUpOf: red.signal!.id }));
  assert.equal(quiet.notify, false, "without forceNotify the rules hold back a follow-up of a known red");
});

test("a mother's check-in and EPDS rows become signals that group together by concern", async () => {
  const { client, tables } = fakeDb();
  await recordAll(client, deriveFromEpds("priya", { id: "00000000-0000-0000-0000-0000000000e1", total: 11, band: "possible", self_harm: false, created_at: ago(48) }));
  await recordAll(client, deriveFromCheckin("priya", { id: "00000000-0000-0000-0000-0000000000c1", level: "AMBER", reasons: ["Raised blood pressure 142/90"], bp_sys: 142, bp_dia: 90, created_at: ago(26) }));
  await recordAll(client, deriveFromEpds("priya", { id: "00000000-0000-0000-0000-0000000000e2", total: 14, band: "probable", self_harm: true, created_at: ago(1) }));
  assert.deepEqual(tables.signals.map((s) => [s.code, s.relation]), [["epds_possible", "NEW"], ["bp_raised", "NEW"], ["epds_q10", "NEW"], ["epds_probable", "RELATED"]]);
  assert.equal(tables.signals.find((s) => s.code === "epds_q10")!.notified, true, "question 10 always tells");
});

// ---------- the demo story, end to end through the real recording path ----------

test("Priya's story: 12 alerts, the labels a judge sees, and only the alerts that matter tell the care team", async () => {
  const { client, tables } = fakeDb();
  const rec = (i: SignalInput) => recordSignal(client, i);
  await rec(input("epds_possible", "MOOD", 48, "amber", "epds", { originTable: "epds_results", value: { total: 11 } }));
  await rec(input("partner_concerns", "MOOD", 30, "amber", "partner_screen", { originTable: "partner_screens" }));
  await rec(input("bp_raised", "HYPERTENSIVE", 26, "amber", "checkin", { value: { sys: 142, dia: 90 } }));
  const red = await rec(input("bp_raised", "HYPERTENSIVE", 13, "red", "checkin", { value: { sys: 148, dia: 94 } }));
  await rec(input("headache", "HYPERTENSIVE", 13, "amber", "checkin"));
  await rec(input("headache_vision", "HYPERTENSIVE", 12.6, "red", "symptom_checker", { originTable: "symptom_logs" }));
  await rec(input("headache", "HYPERTENSIVE", 12.6, "amber", "symptom_checker", { originTable: "symptom_logs" }));
  await rec(input("dizzy", "HAEMORRHAGE", 12.2, "amber", "symptom_checker", { originTable: "symptom_logs" }));
  await rec(input("loop_no_reply", "HYPERTENSIVE", 8, "red", "care_loop", { originTable: "care_loops", followUpOf: red.signal!.id, forceNotify: true }));
  await rec(input("bp_raised", "HYPERTENSIVE", 2, "red", "checkin", { value: { sys: 152, dia: 96 } }));
  await rec(input("callback_overdue", "HYPERTENSIVE", 1, "red", "callback", { originTable: "flags", followUpOf: red.signal!.id, forceNotify: true }));
  await rec(input("b_jaundice", "NEWBORN", 5, "amber", "symptom_checker", { originTable: "symptom_logs", subject: "baby" }));

  const by = (code: string, source?: string, nth = 0) => tables.signals.filter((s) => s.code === code && (!source || s.source === source))[nth];
  assert.equal(by("partner_concerns").relation, "RELATED", "Rohan's screening joins the mood concern");
  assert.equal(by("bp_raised", "checkin", 0).relation, "NEW");
  assert.equal(by("bp_raised", "checkin", 1).relation, "RELATED");
  assert.equal(by("bp_raised", "checkin", 1).notified, true, "amber to red tells the care team again");
  assert.equal(by("headache", "symptom_checker").relation, "CORROBORATES", "also reported in the check-in");
  assert.equal(by("headache", "symptom_checker").notified, false);
  assert.equal(by("dizzy").relation, "POSSIBLY_RELATED");
  assert.equal(by("dizzy").link_status, "suggested");
  assert.equal(by("loop_no_reply").relation, "FOLLOW_UP");
  assert.equal(by("bp_raised", "checkin", 2).relation, "DUPLICATE");
  assert.equal(by("bp_raised", "checkin", 2).relation_detail.count, 2, "Repeat x2");
  assert.equal(by("bp_raised", "checkin", 2).notified, false);
  assert.equal(by("callback_overdue").relation, "FOLLOW_UP");
  assert.equal(by("b_jaundice").relation, "NEW", "a separate baby concern");

  assert.equal(tables.signals.length, 12);
  const told = tables.signals.filter((s) => s.notified).length, held = tables.signals.length - told;
  assert.ok(held >= 4, `expected several alerts to be held back, got ${held}`);
  assert.ok(told < tables.signals.length, "grouping cuts the number of times the care team is pinged");
  assert.equal(by("epds_possible").notified, true, "the first alert in each concern always tells");
  assert.equal(by("b_jaundice").notified, true);
});
