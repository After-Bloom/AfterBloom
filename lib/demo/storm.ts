import type { Concern, Severity, SignalSource, Subject } from "../types/cases.ts";

// The "alert storm" a judge can replay: one alert every 1.5 seconds for Priya, each one recorded through the real recordSignal() and the real
// linking and case rules. The alert count climbs while the case count stays at three. Nothing here is pre-grouped: the labels come from the rules.

export type StormStep = {
  code: string; concern: Concern; severity: Severity; source: SignalSource; subject?: Subject;
  value?: Record<string, unknown> | null;
  /** this alert exists because of the red blood pressure alert recorded earlier in the storm */
  followUpOfRed?: boolean;
};

export const STORM_INTERVAL_MS = 1500;
export const STORM: StormStep[] = [
  { code: "bp_raised", concern: "HYPERTENSIVE", severity: "amber", source: "checkin", value: { sys: 142, dia: 90 } },
  { code: "headache", concern: "HYPERTENSIVE", severity: "amber", source: "symptom_checker" },
  { code: "bp_raised", concern: "HYPERTENSIVE", severity: "red", source: "checkin", value: { sys: 148, dia: 94 } },
  { code: "headache_vision", concern: "HYPERTENSIVE", severity: "red", source: "symptom_checker" },
  { code: "headache", concern: "HYPERTENSIVE", severity: "amber", source: "checkin" },
  { code: "dizzy", concern: "HAEMORRHAGE", severity: "amber", source: "symptom_checker" },
  { code: "bp_raised", concern: "HYPERTENSIVE", severity: "red", source: "checkin", value: { sys: 150, dia: 95 } },
  { code: "vision_flash", concern: "HYPERTENSIVE", severity: "red", source: "symptom_checker" },
  { code: "bp_rising", concern: "HYPERTENSIVE", severity: "amber", source: "bp_trend" },
  { code: "loop_no_reply", concern: "HYPERTENSIVE", severity: "red", source: "care_loop", followUpOfRed: true },
  { code: "epds_possible", concern: "MOOD", severity: "amber", source: "epds", value: { total: 11, band: "possible" } },
  { code: "partner_concerns", concern: "MOOD", severity: "amber", source: "partner_screen" },
  { code: "b_jaundice", concern: "NEWBORN", severity: "amber", source: "symptom_checker", subject: "baby" },
  { code: "bp_raised", concern: "HYPERTENSIVE", severity: "red", source: "checkin", value: { sys: 154, dia: 98 } },
  { code: "callback_overdue", concern: "HYPERTENSIVE", severity: "red", source: "callback", followUpOfRed: true },
];
