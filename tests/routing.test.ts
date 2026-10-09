// Run with: node --test tests/routing.test.ts   (Node 22.6+, no extra dependencies)
// Continuity of care: who handles an alert. Continuity decides WHO, never how urgent.
import test from "node:test";
import assert from "node:assert/strict";
import { assign, specialtiesFor } from "../lib/routing/assign.ts";
import type { ProLoad } from "../lib/types/cases.ts";

const pro = (id: string, name: string, specialty: ProLoad["specialty"], o: Partial<ProLoad> = {}): ProLoad => ({ id, name, specialty, onDuty: true, isOnCall: false, maxOpen: 5, openLoad: 0, ...o });
const rao = pro("rao", "Dr Rao", "psychologist", { openLoad: 5 });                 // at capacity (5 of 5)
const sen = pro("sen", "Dr Sen", "psychologist", { isOnCall: true, openLoad: 1 });
const mehta = pro("mehta", "Dr Mehta", "gynaecologist", { openLoad: 2 });
const shah = pro("shah", "Dr Shah", "gynaecologist", { openLoad: 4 });
const team = [rao, sen, mehta, shah];

test("mood and safety go to a psychologist; the medical concerns to a gynaecologist; a baby concern to a paediatrician first", () => {
  assert.deepEqual(specialtiesFor("MOOD"), ["psychologist"]);
  assert.deepEqual(specialtiesFor("SELF_HARM"), ["psychologist"]);
  for (const c of ["HYPERTENSIVE", "HAEMORRHAGE", "INFECTION", "CLOT_RISK"] as const) assert.deepEqual(specialtiesFor(c), ["gynaecologist"]);
  assert.deepEqual(specialtiesFor("NEWBORN"), ["paediatrician", "gynaecologist"]);
});

test("a returning patient goes to her own doctor even though that doctor is at capacity", () => {
  const r = assign({ concern: "MOOD", preferred: [{ specialty: "psychologist", proId: "rao" }], history: [{ proId: "rao", sessions: 2 }], pros: team });
  assert.equal(r.proId, "rao");
  assert.equal(r.kind, "returning");
  assert.equal(r.sessions, 2);
});

test("a returning patient is found from her sessions alone when no preference is saved yet", () => {
  const r = assign({ concern: "HYPERTENSIVE", preferred: [], history: [{ proId: "shah", sessions: 1 }], pros: team });
  assert.equal(r.proId, "shah");
  assert.equal(r.kind, "returning");
});

test("the doctor she chose beats the one she saw most; the one she saw most beats a stranger", () => {
  const two = [{ proId: "mehta", sessions: 1 }, { proId: "shah", sessions: 3 }];
  assert.equal(assign({ concern: "INFECTION", preferred: [{ specialty: "gynaecologist", proId: "mehta" }], history: two, pros: team }).proId, "mehta");
  assert.equal(assign({ concern: "INFECTION", preferred: [], history: two, pros: team }).proId, "shah");
});

test("a doctor she chose but has not seen yet is 'preferred', not 'returning'", () => {
  const r = assign({ concern: "MOOD", preferred: [{ specialty: "psychologist", proId: "sen" }], history: [], pros: team });
  assert.deepEqual([r.proId, r.kind, r.sessions], ["sen", "preferred", 0]);
});

test("a new patient goes to the least busy colleague below their limit", () => {
  const r = assign({ concern: "INFECTION", preferred: [], history: [], pros: team });
  assert.equal(r.proId, "mehta", "Mehta has 2 open, Shah has 4");
  assert.equal(r.kind, "new");
});

test("a new mood case skips a full Dr Rao and goes to Dr Sen", () => {
  const r = assign({ concern: "MOOD", preferred: [], history: [], pros: team });
  assert.equal(r.proId, "sen");
  assert.equal(r.kind, "new");
});

test("when everyone is at capacity the on-call backup takes it", () => {
  const full = [rao, { ...sen, openLoad: 5 }, { ...mehta, openLoad: 5 }];
  const r = assign({ concern: "MOOD", preferred: [], history: [], pros: full });
  assert.equal(r.proId, "sen");
  assert.equal(r.kind, "on_call");
});

test("on-call backup prefers the same specialty, then anyone on call", () => {
  const gyn = pro("g", "Dr G", "gynaecologist", { isOnCall: true, openLoad: 9 });
  const psy = pro("p", "Dr P", "psychologist", { isOnCall: true, openLoad: 9 });
  assert.equal(assign({ concern: "HYPERTENSIVE", preferred: [], history: [], pros: [gyn, psy, pro("x", "Dr X", "gynaecologist", { openLoad: 9 })] }).proId, "g");
  assert.equal(assign({ concern: "HYPERTENSIVE", preferred: [], history: [], pros: [psy, pro("x", "Dr X", "gynaecologist", { openLoad: 9 })] }).proId, "p");
});

test("a doctor who is off duty is skipped, and a returning patient falls back to the least busy colleague", () => {
  const off = [{ ...rao, onDuty: false }, sen];
  const r = assign({ concern: "MOOD", preferred: [{ specialty: "psychologist", proId: "rao" }], history: [{ proId: "rao", sessions: 2 }], pros: off });
  assert.equal(r.proId, "sen");
  assert.equal(r.kind, "new");
  assert.equal(r.note, "preferred_off_duty");
});

test("nobody suitable gives 'none' so the caller keeps the old behaviour (tell everyone matched)", () => {
  assert.equal(assign({ concern: "HYPERTENSIVE", preferred: [], history: [], pros: [rao, sen] }).kind, "none");
  assert.equal(assign({ concern: "MOOD", preferred: [], history: [], pros: [] }).proId, null);
});

test("ties are broken by name so the same input always gives the same doctor", () => {
  const a = pro("a", "Dr A", "gynaecologist", { openLoad: 1 }), b = pro("b", "Dr B", "gynaecologist", { openLoad: 1 });
  assert.equal(assign({ concern: "INFECTION", preferred: [], history: [], pros: [b, a] }).proId, "a");
});

test("continuity never looks at urgency: the same patient and doctors give the same owner whatever else changes", () => {
  const base = { preferred: [{ specialty: "psychologist" as const, proId: "rao" }], history: [{ proId: "rao", sessions: 2 }] };
  const quiet = assign({ concern: "MOOD", ...base, pros: [{ ...rao, openLoad: 0 }, sen] });
  const busy = assign({ concern: "MOOD", ...base, pros: [{ ...rao, openLoad: 9 }, { ...sen, openLoad: 0 }] });
  assert.equal(quiet.proId, busy.proId, "her doctor stays her doctor at any load; priority is decided elsewhere");
});
