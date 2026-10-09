// Run with: node --test tests/signals.test.ts   (Node 22.6+, no extra dependencies)
// Challenge 1: identify and represent related alerts. Every rule in the approach document has a test here.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classify, collapseRepeats, groupSignals, peakSeverity } from "../lib/signals/correlate.ts";
import { visibleSignals } from "../lib/signals/access.ts";
import { CHECKIN_REASONS, concernOfSymptom, concernsOfReason, deriveFromCheckin, deriveFromEmergency, deriveFromEpds, deriveFromSymptomLog, derivePartnerScreen, loopSignal } from "../lib/signals/derive.ts";
import type { Concern, Severity, Signal, SignalSource } from "../lib/types/cases.ts";

const NOW = new Date("2026-10-10T12:00:00Z").getTime();
const ago = (h: number) => new Date(NOW - h * 3600000).toISOString();
let n = 0;

/** A stored signal, with sensible defaults. */
const sig = (o: Partial<Signal> & { code: string; concern: Concern; hoursAgo: number }): Signal => ({
  id: `s${++n}`, motherId: "priya", subject: "mother", source: "checkin", severity: "amber", value: null, observedAt: ago(o.hoursAgo),
  originTable: "checkins", originId: `o${n}`, relation: "NEW", relationDetail: { kind: "NEW" }, relatedTo: null, linkStatus: "auto", notified: true, caseId: null, ...o,
});
/** A new alert arriving `hoursAgo` hours before NOW. */
const inc = (code: string, concern: Concern, hoursAgo: number, severity: Severity = "amber", source: SignalSource = "checkin", extra = {}) =>
  ({ motherId: "priya", subject: "mother" as const, source, code, concern, severity, observedAt: ago(hoursAgo), ...extra });

// ---------- the five relations, in order ----------

test("a first alert is a new concern and tells the care team", () => {
  const d = classify(inc("bp_raised", "HYPERTENSIVE", 26), []);
  assert.equal(d.relation, "NEW");
  assert.equal(d.notify, true);
  assert.equal(d.detail.notify, "new_concern");
});

test("repeat: same code from the same source within 12 hours, with a count, held back", () => {
  const first = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 11, severity: "red" });
  const d = classify(inc("bp_raised", "HYPERTENSIVE", 0, "red"), [first]);
  assert.equal(d.relation, "DUPLICATE");
  assert.equal(d.relatedTo, first.id);
  assert.equal(d.detail.count, 2);
  assert.equal(d.notify, false, "a repeat of a known red is held back");
});

test("repeat window is 12 hours: 13 hours apart is the same concern, not a repeat", () => {
  const first = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 13 });
  assert.equal(classify(inc("bp_raised", "HYPERTENSIVE", 0), [first]).relation, "RELATED");
});

test("a third report counts all the repeats in the window", () => {
  const a = sig({ code: "headache", concern: "HYPERTENSIVE", hoursAgo: 8 });
  const b = sig({ code: "headache", concern: "HYPERTENSIVE", hoursAgo: 4, relation: "DUPLICATE", relatedTo: a.id });
  assert.equal(classify(inc("headache", "HYPERTENSIVE", 0), [a, b]).detail.count, 3);
});

test("also reported: same code from a different source within 12 hours", () => {
  const checkin = sig({ code: "headache_vision", concern: "HYPERTENSIVE", hoursAgo: 0.6, severity: "red" });
  const d = classify(inc("headache_vision", "HYPERTENSIVE", 0, "red", "symptom_checker"), [checkin]);
  assert.equal(d.relation, "CORROBORATES");
  assert.equal(d.relatedTo, checkin.id);
  assert.equal(d.notify, false, "already reported and already red: held back");
});

test("follow-up: created because of an earlier alert, and it points at that alert", () => {
  const red = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 5, severity: "red" });
  const d = classify(inc("loop_no_reply", "HYPERTENSIVE", 0, "red", "care_loop", { followUpOf: red.id }), [red]);
  assert.equal(d.relation, "FOLLOW_UP");
  assert.equal(d.relatedTo, red.id);
  assert.equal(d.detail.ofCode, "bp_raised");
});

test("follow-up is checked before repeat", () => {
  const red = sig({ code: "loop_no_reply", concern: "HYPERTENSIVE", hoursAgo: 1, source: "care_loop", severity: "red" });
  const d = classify(inc("loop_no_reply", "HYPERTENSIVE", 0, "red", "care_loop", { followUpOf: red.id }), [red]);
  assert.equal(d.relation, "FOLLOW_UP");
});

test("same concern: inside the window it joins, outside it does not (blood pressure 72 h)", () => {
  const old = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 71 });
  assert.equal(classify(inc("headache", "HYPERTENSIVE", 0), [old]).relation, "RELATED");
  const older = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 73 });
  const d = classify(inc("headache", "HYPERTENSIVE", 0), [older]);
  assert.equal(d.relation, "NEW", "outside the window it is a new concern");
  assert.equal(d.notify, true);
});

test("windows: bleeding 48 h, infection 72 h, mood 14 days, safety 7 days", () => {
  const rel = (concern: Concern, code: string, otherCode: string, hours: number) => classify(inc(code, concern, 0), [sig({ code: otherCode, concern, hoursAgo: hours })]).relation;
  assert.equal(rel("HAEMORRHAGE", "clots", "heavy_bleeding", 47), "RELATED");
  assert.equal(rel("HAEMORRHAGE", "clots", "heavy_bleeding", 49), "NEW");
  assert.equal(rel("INFECTION", "fever", "wound_infection", 71), "RELATED");
  assert.equal(rel("INFECTION", "fever", "wound_infection", 73), "NEW");
  assert.equal(rel("MOOD", "epds_possible", "no_sleep", 13 * 24), "RELATED");
  assert.equal(rel("MOOD", "epds_possible", "no_sleep", 15 * 24), "NEW");
  assert.equal(rel("SELF_HARM", "self_harm", "epds_q10", 6 * 24), "RELATED");
  assert.equal(rel("SELF_HARM", "self_harm", "epds_q10", 8 * 24), "NEW");
});

test("possibly related: only a cross-concern pair, never automatic, and it is suggested", () => {
  const bp = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 1, severity: "red" });
  const d = classify(inc("dizzy", "HAEMORRHAGE", 0), [bp]);
  assert.equal(d.relation, "POSSIBLY_RELATED");
  assert.equal(d.linkStatus, "suggested");
  assert.equal(d.relatedTo, bp.id);
  assert.equal(d.detail.otherConcern, "HYPERTENSIVE");
  assert.equal(d.notify, true, "it is a new concern, so the care team is still told");
});

test("the three cross-concern pairs: dizziness+BP, breathlessness+BP, fever+fast heart rate (both directions)", () => {
  const pair = (a: [string, Concern], b: [string, Concern]) => classify(inc(a[0], a[1], 0), [sig({ code: b[0], concern: b[1], hoursAgo: 2 })]).relation;
  assert.equal(pair(["dizzy", "HAEMORRHAGE"], ["bp_raised", "HYPERTENSIVE"]), "POSSIBLY_RELATED");
  assert.equal(pair(["bp_raised", "HYPERTENSIVE"], ["dizzy", "HAEMORRHAGE"]), "POSSIBLY_RELATED");
  assert.equal(pair(["breathless", "CLOT_RISK"], ["bp_raised", "HYPERTENSIVE"]), "POSSIBLY_RELATED");
  assert.equal(pair(["fever", "INFECTION"], ["palpitations", "CLOT_RISK"]), "POSSIBLY_RELATED");
});

test("a same-concern pair is NOT a cross-concern suggestion, and unrelated concerns stay new", () => {
  assert.equal(classify(inc("headache", "HYPERTENSIVE", 0), [sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 2 })]).relation, "RELATED");
  assert.equal(classify(inc("fever", "INFECTION", 0), [sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 2 })]).relation, "NEW");
  assert.equal(classify(inc("dizzy", "HAEMORRHAGE", 0), [sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 30 })]).relation, "NEW", "30 hours apart is too far for a suggestion");
});

test("a baby alert is its own concern, never mixed with the mother's", () => {
  const mum = sig({ code: "fever", concern: "INFECTION", hoursAgo: 1 });
  const d = classify({ ...inc("b_jaundice", "NEWBORN", 0), subject: "baby" }, [mum]);
  assert.equal(d.relation, "NEW");
  const baby = sig({ code: "b_jaundice", concern: "NEWBORN", subject: "baby", hoursAgo: 1 });
  assert.equal(classify(inc("fever", "NEWBORN", 0), [baby]).relation, "NEW", "same concern name but a different subject");
});

test("alerts of one mother never relate to another mother's", () => {
  const other = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 1, motherId: "anjali" });
  assert.equal(classify(inc("bp_raised", "HYPERTENSIVE", 0), [other]).relation, "NEW");
});

// ---------- grouping never hides danger ----------

test("a rise in severity notifies even though it is the same concern", () => {
  const amber = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 26, severity: "amber" });
  const d = classify(inc("bp_raised", "HYPERTENSIVE", 0, "red"), [amber]);
  assert.equal(d.relation, "RELATED");
  assert.equal(d.notify, true);
  assert.equal(d.detail.notify, "severity_rise");
});

test("a rise inside a repeat still notifies", () => {
  const amber = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 3, severity: "amber" });
  const d = classify(inc("bp_raised", "HYPERTENSIVE", 0, "red"), [amber]);
  assert.equal(d.relation, "DUPLICATE");
  assert.equal(d.notify, true);
});

test("severity never lowers: a milder alert after a red one is held back and the peak stays red", () => {
  const red = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 10, severity: "red" });
  const d = classify(inc("headache", "HYPERTENSIVE", 0, "amber"), [red]);
  assert.equal(d.notify, false);
  assert.equal(peakSeverity([red], "HYPERTENSIVE", "mother", ago(0)), "red");
  const mild = sig({ code: "headache", concern: "HYPERTENSIVE", hoursAgo: 0, severity: "amber" });
  assert.equal(peakSeverity([red, mild], "HYPERTENSIVE", "mother", ago(0)), "red");
});

test("any self-harm signal always notifies, even a repeat of the same one", () => {
  const first = sig({ code: "epds_q10", concern: "SELF_HARM", hoursAgo: 1, severity: "red", source: "epds" });
  const again = classify(inc("epds_q10", "SELF_HARM", 0, "red", "epds"), [first]);
  assert.equal(again.relation, "DUPLICATE");
  assert.equal(again.notify, true);
  assert.equal(again.detail.notify, "self_harm");
  assert.equal(classify(inc("selfharm_wording", "SELF_HARM", 0, "red", "circle_post"), []).notify, true);
});

test("a care-loop no-reply can be forced through so a silent mother is never lost", () => {
  const red = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 5, severity: "red" });
  const held = classify(inc("loop_no_reply", "HYPERTENSIVE", 0, "red", "care_loop", { followUpOf: red.id }), [red]);
  assert.equal(held.notify, false);
  const forced = classify(inc("loop_no_reply", "HYPERTENSIVE", 0, "red", "care_loop", { followUpOf: red.id, forceNotify: true }), [red]);
  assert.equal(forced.notify, true);
  assert.equal(forced.detail.notify, "forced");
});

// ---------- the corrected Priya story, run through the real rules ----------

test("Priya's story: 142/90 opens the case, 148/94 raises it, repeats and follow-ups are held back, dizziness is suggested", () => {
  const stored: Signal[] = [];
  const feed = (code: string, concern: Concern, hoursAgo: number, severity: Severity, source: SignalSource, extra = {}) => {
    const d = classify(inc(code, concern, hoursAgo, severity, source, extra), stored);
    const s = sig({ code, concern, hoursAgo, severity, source, relation: d.relation, relatedTo: d.relatedTo, linkStatus: d.linkStatus, relationDetail: d.detail, notified: d.notify });
    stored.push(s);
    return { d, s };
  };
  const amber = feed("bp_raised", "HYPERTENSIVE", 26, "amber", "checkin");
  assert.equal(amber.d.relation, "NEW");
  const red = feed("bp_raised", "HYPERTENSIVE", 13, "red", "checkin");
  assert.equal(red.d.relation, "RELATED", "13 hours is outside the 12-hour repeat window");
  assert.equal(red.d.notify, true, "amber to red re-notifies");
  const vision = feed("headache_vision", "HYPERTENSIVE", 12.6, "red", "symptom_checker");
  assert.equal(vision.d.notify, false, "already red in this concern: held back");
  const dizzy = feed("dizzy", "HAEMORRHAGE", 12.2, "amber", "symptom_checker");
  assert.equal(dizzy.d.relation, "POSSIBLY_RELATED");
  const loop = feed("loop_no_reply", "HYPERTENSIVE", 8, "red", "care_loop", { followUpOf: red.s.id });
  assert.equal(loop.d.relation, "FOLLOW_UP");
  assert.equal(loop.d.notify, false);
  const again = feed("bp_raised", "HYPERTENSIVE", 2, "red", "checkin");
  assert.equal(again.d.relation, "DUPLICATE");
  assert.equal(again.d.detail.count, 2, "Repeat x2");
  assert.equal(again.d.notify, false);
  const baby = classify({ ...inc("b_jaundice", "NEWBORN", 5), subject: "baby" }, stored);
  assert.equal(baby.relation, "NEW", "a baby alert opens a separate concern");
  assert.equal(stored.filter((s) => s.notified).length, 3, "7 alerts, but the care team was only told about the 3 that mattered");
});

// ---------- laying a list out: nothing is ever dropped ----------

test("grouping puts one group per concern and subject, worst first, and loses no signal", () => {
  const list = [
    sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 20, severity: "amber" }),
    sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 10, severity: "red" }),
    sig({ code: "dizzy", concern: "HAEMORRHAGE", hoursAgo: 9, severity: "amber" }),
    sig({ code: "b_jaundice", concern: "NEWBORN", subject: "baby", hoursAgo: 5, severity: "amber" }),
  ];
  const g = groupSignals(list);
  assert.equal(g.length, 3);
  assert.equal(g[0].concern, "HYPERTENSIVE");
  assert.equal(g[0].peak, "red");
  assert.equal(g.reduce((a, x) => a + x.signals.length, 0), list.length);
});

test("an unlinked signal stands on its own", () => {
  const a = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 5 });
  const b = sig({ code: "headache", concern: "HYPERTENSIVE", hoursAgo: 4, linkStatus: "unlinked" });
  assert.equal(groupSignals([a, b]).length, 2);
});

test("repeats collapse under the first report with their count, but a more severe repeat stays visible", () => {
  const a = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 9, severity: "amber" });
  const b = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 6, severity: "amber", relation: "DUPLICATE", relatedTo: a.id });
  const c = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 3, severity: "red", relation: "DUPLICATE", relatedTo: b.id });
  const rows = collapseRepeats([a, b, c]);
  assert.equal(rows.length, 2, "the amber repeat folds into the first; the red one stays");
  assert.equal(rows[0].repeats.length, 1);
  assert.equal(rows[1].signal.id, c.id);
});

// ---------- turning saved rows into signals ----------

const lookup = (label: string) => {
  const t: Record<string, { id: string; who: "mother" | "baby"; level: "RED" | "AMBER" | "GREEN" }> = {
    "Heavy bleeding (soaking a pad within an hour)": { id: "heavy_bleeding", who: "mother", level: "RED" },
    "Dizzy or faint when standing": { id: "dizzy", who: "mother", level: "AMBER" },
    "Mild afterpains / cramps": { id: "afterpains", who: "mother", level: "GREEN" },
    "Yellowish skin or eyes": { id: "b_jaundice", who: "baby", level: "AMBER" },
    "Fever": { id: "fever", who: "mother", level: "AMBER" },
  };
  return t[label];
};

test("symptom log: one signal per symptom, green ones skipped, baby symptoms are a baby concern", () => {
  const out = deriveFromSymptomLog("m1", { id: "l1", level: "RED", labels: ["Heavy bleeding (soaking a pad within an hour)", "Mild afterpains / cramps", "Yellowish skin or eyes"], created_at: ago(1) }, lookup);
  assert.deepEqual(out.map((s) => [s.code, s.concern, s.severity, s.subject]), [["heavy_bleeding", "HAEMORRHAGE", "red", "mother"], ["b_jaundice", "NEWBORN", "amber", "baby"]]);
  assert.ok(out.every((s) => s.originTable === "symptom_logs" && s.originId === "l1" && s.source === "symptom_checker"));
});

test("symptom log: a combination that lifts the overall result lifts the worst symptoms to it", () => {
  const out = deriveFromSymptomLog("m1", { id: "l2", level: "RED", labels: ["Dizzy or faint when standing", "Fever"], created_at: ago(1) }, lookup);
  assert.equal(out.length, 2);
  assert.ok(out.every((s) => s.severity === "red"), "both were amber, the overall result is red");
});

test("symptom log: typed red-flag wording becomes a signal, an all-green log becomes none, an unknown label is not lost", () => {
  assert.deepEqual(deriveFromSymptomLog("m1", { id: "l3", level: "RED", labels: ["Thoughts of self-harm"], created_at: ago(0) }, lookup).map((s) => [s.code, s.concern]), [["self_harm", "SELF_HARM"]]);
  assert.deepEqual(deriveFromSymptomLog("m1", { id: "l4", level: "GREEN", labels: ["Mild afterpains / cramps"], created_at: ago(0) }, lookup), []);
  assert.equal(deriveFromSymptomLog("m1", { id: "l5", level: "AMBER", labels: ["something not in the table"], created_at: ago(0) }, lookup)[0].code, "symptom_unspecified");
});

test("check-in: raised BP with a headache is one red BP signal carrying the reading, plus the headache", () => {
  const out = deriveFromCheckin("m1", { id: "c1", level: "RED", reasons: ["Headache", "Raised blood pressure 148/94", "Raised blood pressure with a headache"], bp_sys: 148, bp_dia: 94, created_at: ago(0) });
  const bp = out.find((s) => s.code === "bp_raised")!;
  assert.equal(bp.severity, "red", "the amber and red BP reasons merge into one signal, the worse wins");
  assert.deepEqual(bp.value, { sys: 148, dia: 94 });
  assert.ok(out.some((s) => s.code === "headache" && s.severity === "amber"));
  assert.equal(out.length, 2);
});

test("check-in: very high BP, the BP trend, danger signs and a green check-in", () => {
  assert.equal(deriveFromCheckin("m1", { id: "c2", level: "RED", reasons: ["Blood pressure 170/112"], bp_sys: 170, bp_dia: 112, created_at: ago(0) })[0].code, "high_bp");
  const trend = deriveFromCheckin("m1", { id: "c3", level: "AMBER", reasons: ["Two raised blood pressure readings in a row", "Raised blood pressure 142/90"], bp_sys: 142, bp_dia: 90, created_at: ago(0) });
  assert.deepEqual(trend.map((s) => [s.source, s.code]).sort(), [["bp_trend", "bp_rising"], ["checkin", "bp_raised"]]);
  const danger = deriveFromCheckin("m1", { id: "c4", level: "RED", reasons: ["Heavy bleeding or large clots", "Chest pain or trouble breathing", "Fever"], bp_sys: null, bp_dia: null, created_at: ago(0) });
  assert.deepEqual(danger.map((s) => s.code).sort(), ["breathless", "fever", "heavy_bleeding"]);
  assert.deepEqual(deriveFromCheckin("m1", { id: "c5", level: "GREEN", reasons: [], bp_sys: 118, bp_dia: 76, created_at: ago(0) }), []);
});

test("check-in reasons match the exact words in lib/triage.ts (guards against the two drifting apart)", () => {
  const triage = readFileSync(new URL("../lib/triage.ts", import.meta.url), "utf8");
  for (const reason of Object.keys(CHECKIN_REASONS)) assert.ok(triage.includes(`"${reason}"`), `triage.ts no longer says "${reason}"`);
  for (const reason of ["Raised blood pressure with a headache", "Two raised blood pressure readings in a row"]) assert.ok(triage.includes(reason) || readFileSync(new URL("../lib/risk.ts", import.meta.url), "utf8").includes(reason), reason);
  assert.ok(triage.includes("`Blood pressure ${bp.sys}/${bp.dia}`") && triage.includes("`Raised blood pressure ${bp.sys}/${bp.dia}`"));
  assert.ok(readFileSync(new URL("../lib/risk.ts", import.meta.url), "utf8").includes("Your blood pressure has been rising over the last few days"));
});

test("EPDS: a possible or probable score is a mood signal with the total; question 10 is a separate safety signal", () => {
  assert.deepEqual(deriveFromEpds("m1", { id: "e1", total: 9, band: "low", self_harm: false, created_at: ago(0) }), []);
  const possible = deriveFromEpds("m1", { id: "e2", total: 11, band: "possible", self_harm: false, created_at: ago(0) });
  assert.deepEqual(possible.map((s) => [s.code, s.concern, s.value]), [["epds_possible", "MOOD", { total: 11, band: "possible" }]]);
  const q10 = deriveFromEpds("m1", { id: "e3", total: 14, band: "probable", self_harm: true, created_at: ago(0) });
  assert.deepEqual(q10.map((s) => [s.code, s.concern, s.severity]).sort(), [["epds_probable", "MOOD", "amber"], ["epds_q10", "SELF_HARM", "red"]]);
});

test("partner screening only makes a signal at four or more concerns", () => {
  assert.equal(derivePartnerScreen("m1", { id: "p1", yes: 3, total: 6, created_at: ago(0) }).length, 0);
  assert.equal(derivePartnerScreen("m1", { id: "p2", yes: 4, total: 6, created_at: ago(0) })[0].concern, "MOOD");
});

test("emergency route: self-harm and psychosis are safety signals; a medical red flag maps to its concern", () => {
  assert.equal(deriveFromEmergency("m1", "selfharm", "Thoughts of self-harm", "f1", ago(0), lookup)[0].concern, "SELF_HARM");
  assert.equal(deriveFromEmergency("m1", "psychosis", "x", "f2", ago(0), lookup)[0].code, "psychosis_signs");
  assert.equal(deriveFromEmergency("m1", "medical", "Heavy bleeding", "f3", ago(0), lookup)[0].concern, "HAEMORRHAGE");
  assert.equal(deriveFromEmergency("m1", "medical", "Danger sign in the baby", "f4", ago(0), lookup)[0].subject, "baby");
  assert.equal(deriveFromEmergency("m1", "medical", "Danger sign", "f5", ago(0), lookup)[0].code, "red_flag", "an unknown reason is still recorded");
});

test("care-loop follow-ups: no reply keeps the level of the alert it follows; worse and cannot-reach are red", () => {
  assert.deepEqual(loopSignal("no_answer", "AMBER"), { code: "loop_no_reply", severity: "amber" });
  assert.deepEqual(loopSignal("no_answer", "RED"), { code: "loop_no_reply", severity: "red" });
  assert.equal(loopSignal("worse", "AMBER").severity, "red");
  assert.equal(loopSignal("cant_reach", "AMBER").code, "loop_cant_reach");
});

test("which concern a symptom belongs to, and which concerns a reason is about", () => {
  assert.equal(concernOfSymptom("dizzy", "mother"), "HAEMORRHAGE");
  assert.equal(concernOfSymptom("breathless", "mother"), "CLOT_RISK");
  assert.equal(concernOfSymptom("anything", "baby"), "NEWBORN");
  assert.equal(concernOfSymptom("severe_pain", "mother"), "GENERAL", "not placed by a clinician: General, never guessed as another concern");
  assert.deepEqual(concernsOfReason("Heavy bleeding (soaking a pad within an hour), Fever", lookup).sort(), ["HAEMORRHAGE", "INFECTION"]);
  assert.deepEqual(concernsOfReason("Danger sign", lookup), []);
});

// ---------- consent: the one gate ----------

test("consent: while she shares, a professional sees everything", () => {
  const list = [sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 2, severity: "amber", value: { sys: 142, dia: 90 } }), sig({ code: "epds_possible", concern: "MOOD", hoursAgo: 3, severity: "amber", value: { total: 11 } })];
  assert.equal(visibleSignals(list, true).length, 2);
});

test("consent: when she stops sharing, only red and safety alerts stay visible, and their details are removed", () => {
  const list = [
    sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 2, severity: "amber", value: { sys: 142, dia: 90 } }),
    sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 1, severity: "red", value: { sys: 150, dia: 95 } }),
    sig({ code: "epds_q10", concern: "SELF_HARM", hoursAgo: 4, severity: "amber", value: { total: 14 } }),
  ];
  const seen = visibleSignals(list, false);
  assert.equal(seen.length, 2, "the amber BP reading is hidden");
  assert.ok(seen.every((s) => s.value === null), "no readings or scores without consent");
  assert.ok(seen.some((s) => s.concern === "SELF_HARM"), "a safety alert is never hidden, whatever its severity");
});

test("confirming a possibly-related alert moves it into the group of the alert it was confirmed against", () => {
  const bp = sig({ code: "bp_raised", concern: "HYPERTENSIVE", hoursAgo: 3, severity: "red" });
  const dizzy = sig({ code: "dizzy", concern: "HAEMORRHAGE", hoursAgo: 2, relation: "POSSIBLY_RELATED", relatedTo: bp.id, linkStatus: "suggested" });
  assert.equal(groupSignals([bp, dizzy]).length, 2, "suggested only: still its own group");
  const confirmed = { ...dizzy, linkStatus: "confirmed" as const };
  const g = groupSignals([bp, confirmed]);
  assert.equal(g.length, 1);
  assert.equal(g[0].signals.length, 2);
  const unlinked = { ...dizzy, linkStatus: "unlinked" as const };
  assert.equal(groupSignals([bp, unlinked]).length, 2, "unlinking gives it its own group");
});
