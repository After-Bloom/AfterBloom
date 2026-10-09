import type { Concern, Severity } from "../types/cases.ts";

// The linking rules in one place. These numbers are DRAFTS for a clinician to confirm (like the triage tables and EPDS cut-offs).
export const REPEAT_HOURS = 12;          // same code from the same source within this long = a repeat
export const CORROBORATE_HOURS = 12;     // same code from a different source within this long = also reported
export const POSSIBLE_HOURS = 24;        // a cross-concern pair this close together is suggested as possibly related

/** How long an earlier alert of the same concern still counts as the same problem. Mood and safety are slower to change. */
export const CONCERN_WINDOW_HOURS: Record<Concern, number> = {
  HYPERTENSIVE: 72,
  HAEMORRHAGE: 48,
  INFECTION: 72,
  MOOD: 14 * 24,
  SELF_HARM: 7 * 24,
  CLOT_RISK: 72,
  NEWBORN: 72,
  ENGAGEMENT: 72,
  GENERAL: 72,
};

/** The longest window: how far back to look for earlier alerts. */
export const LOOKBACK_HOURS = Math.max(...Object.values(CONCERN_WINDOW_HOURS));

export const SEVERITY_RANK: Record<Severity, number> = { info: 0, amber: 1, red: 2 };

/**
 * Pairs from two DIFFERENT concerns that are often one problem seen two ways. Never linked automatically: a clinician confirms.
 *   dizziness (bleeding) with raised BP, breathlessness or chest pain (clot risk) with raised BP, fever (infection) with a fast heart rate.
 */
export const BP_CODES = ["bp_raised", "high_bp", "bp_rising"];
export const POSSIBLE_PAIRS: { a: string[]; b: string[] }[] = [
  { a: ["dizzy", "fainting"], b: BP_CODES },
  { a: ["breathless", "chest_pain"], b: BP_CODES },
  { a: ["fever", "fever_chills"], b: ["palpitations"] },
];
