import type { Concern, Severity, SignalInput, SignalSource, Subject } from "../types/cases.ts";

// Turns the rows the app already saves (symptom logs, check-ins, EPDS results, care loops, flags) into signals.
// Pure functions, so they are tested without a database. Typed text never reaches this file: only labels, levels and numbers.

type L = "RED" | "AMBER" | "GREEN";
export type SymptomRef = { id: string; who: "mother" | "baby"; level: L };
export type SymptomLookup = (label: string) => SymptomRef | undefined;

const sev = (l: L): Severity => (l === "RED" ? "red" : l === "AMBER" ? "amber" : "info");
const RANK: Record<Severity, number> = { info: 0, amber: 1, red: 2 };

// ---------- which concern does a symptom belong to? ----------
const OF: Record<Concern, string[]> = {
  HYPERTENSIVE: ["fits", "headache_vision", "headache_severe", "high_bp", "bp_raised", "headache", "spinal_headache", "swelling_face_hands", "vision_flash", "upper_belly_pain"],
  HAEMORRHAGE: ["heavy_bleeding", "clots", "fresh_bleeding", "passing_tissue", "dizzy", "fainting", "pale_weak"],
  INFECTION: ["fever", "fever_chills", "foul_discharge", "breast_red", "breast_lump", "breast_pus", "urine_burn", "urine_blood", "wound_infection", "wound_open", "lochia_smell", "severe_belly_pain"],
  CLOT_RISK: ["chest_pain", "breathless", "calf_swelling", "cough_blood", "palpitations"],
  MOOD: ["low_mood", "anxiety", "no_sleep", "cant_eat", "panic", "no_bond", "numb_empty", "irritable", "no_interest", "sleep_too_much"],
  SELF_HARM: ["self_harm", "psychosis_signs"],
  NEWBORN: [],
  ENGAGEMENT: [],
  GENERAL: [],
};
const CONCERN_OF = new Map<string, Concern>(Object.entries(OF).flatMap(([c, ids]) => ids.map((id) => [id, c as Concern] as const)));

/** Mother's symptoms use the table above; every baby symptom is a Baby concern; anything else a clinician has not placed is General. */
export function concernOfSymptom(id: string, who: "mother" | "baby"): Concern {
  if (who === "baby") return "NEWBORN";
  return CONCERN_OF.get(id) ?? "GENERAL";
}

// ---------- the words the emergency check uses (lib/triage.ts) mapped to symptom codes ----------
const REASON_CODES: Record<string, SymptomRef> = {
  "Thoughts of self-harm": { id: "self_harm", who: "mother", level: "RED" },
  "Possible postpartum psychosis warning signs": { id: "psychosis_signs", who: "mother", level: "RED" },
  "Heavy bleeding": { id: "heavy_bleeding", who: "mother", level: "RED" },
  "Fits or fainting": { id: "fits", who: "mother", level: "RED" },
  "Severe headache with blurred vision": { id: "headache_vision", who: "mother", level: "RED" },
  "Very severe headache": { id: "headache_severe", who: "mother", level: "RED" },
  "Chest pain or breathlessness": { id: "chest_pain", who: "mother", level: "RED" },
  "Painful swollen calf": { id: "calf_swelling", who: "mother", level: "RED" },
  "Fever with chills or foul-smelling discharge": { id: "fever_chills", who: "mother", level: "RED" },
  "Danger sign in the baby": { id: "b_danger", who: "baby", level: "RED" },
  "Spreading redness or pus at the cord": { id: "b_cord", who: "baby", level: "RED" },
  "Yellow palms or soles in the baby": { id: "b_jaundice_palms", who: "baby", level: "RED" },
};
export const refOfReason = (label: string) => REASON_CODES[label.trim()];

/** Label -> symptom: first the symptom table (passed in), then the emergency-check wording. */
const resolve = (label: string, lookup: SymptomLookup) => lookup(label) ?? refOfReason(label);

type Base = { motherId: string; originTable: string; originId: string; observedAt: string };
const make = (b: Base, source: SignalSource, code: string, concern: Concern, severity: Severity, subject: Subject = "mother", value: SignalInput["value"] = null): SignalInput =>
  ({ motherId: b.motherId, subject, source, code, concern, severity, value, observedAt: b.observedAt, originTable: b.originTable, originId: b.originId });

/** One signal per code. If two entries share a code the more severe one wins. */
function merge(list: SignalInput[]): SignalInput[] {
  const by = new Map<string, SignalInput>();
  for (const s of list) {
    const k = `${s.source}:${s.code}`;
    const cur = by.get(k);
    if (!cur || RANK[s.severity] > RANK[cur.severity]) by.set(k, { ...s, value: s.value ?? cur?.value ?? null });
  }
  return [...by.values()];
}

// ---------- symptom checker ----------
export type SymptomLogRow = { id: string; level: L; labels: string[]; created_at: string };

export function deriveFromSymptomLog(mother: string, row: SymptomLogRow, lookup: SymptomLookup): SignalInput[] {
  if (row.level === "GREEN") return [];
  const b: Base = { motherId: mother, originTable: "symptom_logs", originId: row.id, observedAt: row.created_at };
  const found = row.labels.map((l) => resolve(l, lookup)).filter((r): r is SymptomRef => !!r && r.level !== "GREEN");
  if (!found.length) return [make(b, "symptom_checker", "symptom_unspecified", "GENERAL", sev(row.level))];
  // the overall result can be higher than any single symptom (a combination or a follow-up answer): lift the worst symptoms to it
  const worst = Math.max(...found.map((r) => RANK[sev(r.level)]));
  const lift = RANK[sev(row.level)] > worst;
  return merge(found.map((r) => {
    const own = sev(r.level);
    const severity = lift && RANK[own] === worst ? sev(row.level) : own;
    return make(b, "symptom_checker", r.id, concernOfSymptom(r.id, r.who), severity, r.who === "baby" ? "baby" : "mother");
  }));
}

// ---------- daily check-in ----------
export type CheckinRow = { id: string; level: L; reasons: string[]; bp_sys: number | null; bp_dia: number | null; created_at: string };

// the exact words triageCheckin() writes (lib/triage.ts); tests/signals.test.ts fails if they ever drift apart
export const CHECKIN_REASONS: Record<string, { code: string; level: L }> = {
  "Heavy bleeding or large clots": { code: "heavy_bleeding", level: "RED" },
  "Chest pain or trouble breathing": { code: "breathless", level: "RED" },
  "Headache with vision changes": { code: "headache_vision", level: "RED" },
  "Fever": { code: "fever", level: "AMBER" },
  "Headache": { code: "headache", level: "AMBER" },
  "Wound redness or discharge": { code: "wound_infection", level: "AMBER" },
};

export function deriveFromCheckin(mother: string, row: CheckinRow): SignalInput[] {
  if (row.level === "GREEN") return [];
  const b: Base = { motherId: mother, originTable: "checkins", originId: row.id, observedAt: row.created_at };
  const bp = row.bp_sys && row.bp_dia ? { sys: row.bp_sys, dia: row.bp_dia } : null;
  const out: SignalInput[] = [];
  for (const r of row.reasons) {
    const hit = CHECKIN_REASONS[r];
    if (hit) { out.push(make(b, "checkin", hit.code, concernOfSymptom(hit.code, "mother"), sev(hit.level))); continue; }
    if (/^Blood pressure \d/.test(r)) out.push(make(b, "checkin", "high_bp", "HYPERTENSIVE", "red", "mother", bp));
    else if (r === "Raised blood pressure with a headache") out.push(make(b, "checkin", "bp_raised", "HYPERTENSIVE", "red", "mother", bp));
    else if (/^Raised blood pressure \d/.test(r)) out.push(make(b, "checkin", "bp_raised", "HYPERTENSIVE", "amber", "mother", bp));
    else if (r === "Two raised blood pressure readings in a row" || r === "Your blood pressure has been rising over the last few days") out.push(make(b, "bp_trend", "bp_rising", "HYPERTENSIVE", "amber", "mother", bp));
  }
  return merge(out).length ? merge(out) : [make(b, "checkin", "symptom_unspecified", "GENERAL", sev(row.level))];
}

// ---------- EPDS ----------
export type EpdsRow = { id: string; total: number; band: "low" | "possible" | "probable"; self_harm: boolean; created_at: string };

export function deriveFromEpds(mother: string, row: EpdsRow): SignalInput[] {
  const b: Base = { motherId: mother, originTable: "epds_results", originId: row.id, observedAt: row.created_at };
  const out: SignalInput[] = [];
  if (row.self_harm) out.push(make(b, "epds", "epds_q10", "SELF_HARM", "red", "mother", { total: row.total }));
  if (row.band !== "low") out.push(make(b, "epds", row.band === "probable" ? "epds_probable" : "epds_possible", "MOOD", "amber", "mother", { total: row.total, band: row.band }));
  return out;
}

// ---------- care loop, overdue callback, circle post, partner screening ----------
export type LoopStatus = "no_answer" | "worse" | "cant_reach";

/** What a follow-up alert is called and how serious it is. Where it belongs (its concern) comes from the alert it follows. */
export function loopSignal(status: LoopStatus, level: "RED" | "AMBER"): { code: string; severity: Severity } {
  if (status === "worse") return { code: "loop_worse", severity: "red" };
  if (status === "cant_reach") return { code: "loop_cant_reach", severity: "red" };
  return { code: "loop_no_reply", severity: level === "RED" ? "red" : "amber" };
}

export function deriveCallbackOverdue(mother: string, flag: { id: string; due_at: string }, now: string): SignalInput {
  return make({ motherId: mother, originTable: "flags", originId: flag.id, observedAt: now }, "callback", "callback_overdue", "MOOD", "amber");
}

export function deriveCirclePost(mother: string, postId: string, now: string): SignalInput {
  return make({ motherId: mother, originTable: "posts", originId: postId, observedAt: now }, "circle_post", "selfharm_wording", "SELF_HARM", "red");
}

export const PARTNER_THRESHOLD = 4;
export function derivePartnerScreen(mother: string, row: { id: string; yes: number; total: number; created_at: string }): SignalInput[] {
  if (row.yes < PARTNER_THRESHOLD) return [];
  return [make({ motherId: mother, originTable: "partner_screens", originId: row.id, observedAt: row.created_at }, "partner_screen", "partner_concerns", "MOOD", "amber", "mother", { yes: row.yes, total: row.total })];
}

/** Ask Bloom raises a red flag without saving a symptom log, so the emergency route records its signal. */
export function deriveFromEmergency(mother: string, kind: "selfharm" | "psychosis" | "medical", reason: string, flagId: string, now: string, lookup: SymptomLookup): SignalInput[] {
  const b: Base = { motherId: mother, originTable: "flags", originId: flagId, observedAt: now };
  if (kind === "selfharm") return [make(b, "symptom_checker", "self_harm", "SELF_HARM", "red")];
  if (kind === "psychosis") return [make(b, "symptom_checker", "psychosis_signs", "SELF_HARM", "red")];
  const found = reason.split(", ").map((l) => resolve(l, lookup)).filter((r): r is SymptomRef => !!r);
  if (!found.length) return [make(b, "symptom_checker", "red_flag", "GENERAL", "red")];
  return merge(found.map((r) => make(b, "symptom_checker", r.id, concernOfSymptom(r.id, r.who), "red", r.who === "baby" ? "baby" : "mother")));
}

/** Which concerns an emergency reason is about (for sending it to the right professional). Empty if it cannot tell. */
export function concernsOfReason(reason: string, lookup: SymptomLookup): Concern[] {
  const out = new Set<Concern>();
  for (const part of reason.split(", ")) {
    const r = resolve(part, lookup);
    if (r && r.level !== "GREEN") out.add(concernOfSymptom(r.id, r.who));
  }
  return [...out];
}
