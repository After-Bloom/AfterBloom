import type { Level } from "./symptoms";

// Her recovery profile and the blood-pressure watch. Plain rules and plain numbers so a clinician can read and change them.
// Postpartum pre-eclampsia can start up to 6 weeks after birth, most often in the first week, and also in women who had normal BP in pregnancy.
// Every number here is pending sign-off by a doctor (see README, "Items to Confirm").
export type Risk = { set?: boolean; htn?: boolean; pph?: boolean; gdm?: boolean; anaemia?: boolean; csection?: boolean; multiples?: boolean; preterm?: boolean };
export type RiskKey = Exclude<keyof Risk, "set">;

export const RISK_ITEMS: { k: RiskKey; label: string; hint: string }[] = [
  { k: "htn", label: "High blood pressure or pre-eclampsia in this pregnancy", hint: "Or fits (eclampsia), or a doctor told you your BP was high." },
  { k: "pph", label: "Heavy bleeding after delivery", hint: "You needed extra medicine, a transfusion, or were told you lost a lot of blood." },
  { k: "gdm", label: "Diabetes in pregnancy", hint: "Sugar was high during this pregnancy." },
  { k: "anaemia", label: "Anaemia (low haemoglobin)", hint: "You were told your haemoglobin was low or took iron injections." },
  { k: "csection", label: "C-section", hint: "" },
  { k: "multiples", label: "Twins or more", hint: "" },
  { k: "preterm", label: "Baby born early (before 37 weeks)", hint: "" },
];

export const riskKeys = (r: Risk) => RISK_ITEMS.filter((x) => r[x.k]).map((x) => x.k);
export const riskCount = (r: Risk) => riskKeys(r).length;
/** high: blood pressure or heavy bleeding history. watch: any other factor. standard: none told to us. */
export const riskTier = (r: Risk): "high" | "watch" | "standard" => (r.htn || r.pph ? "high" : riskCount(r) > 0 ? "watch" : "standard");

type Reading = { date: string; bp?: { sys: number; dia: number } };
const DAY = 86400000;
const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

export type BpPlan = { advised: boolean; due: boolean; headline: string; why: string };

/** When to measure BP. Days are counted from birth (day 0). Used for the reminder card and for the daily check-in. */
export function bpPlan(r: Risk, ageDays: number, checkins: Reading[], now = Date.now()): BpPlan {
  const tier = riskTier(r);
  const readings = checkins.filter((c) => c.bp).sort((a, b) => b.date.localeCompare(a.date));
  const today = readings.some((c) => sameDay(c.date, new Date(now).toISOString()));
  const daysSinceLast = readings[0] ? Math.floor((now - new Date(readings[0].date).getTime()) / DAY) : Infinity;
  const inPeak = ageDays >= 2 && ageDays <= 6;

  if (ageDays > 42) return { advised: false, due: false, headline: "", why: "" };
  if (tier === "high") {
    const every = ageDays <= 14 ? 1 : 2;
    return { advised: true, due: !today && daysSinceLast >= every, headline: every === 1 ? "Check your blood pressure every day" : "Check your blood pressure every other day",
      why: "You had high blood pressure or heavy bleeding, so a quick daily check is the best early warning for the dangerous problems that can start after birth." };
  }
  if (inPeak) return { advised: true, due: !today && readings.every((c) => (now - new Date(c.date).getTime()) / DAY > 3), headline: "Check your blood pressure once in these days",
    why: "Days 3 to 6 are when blood pressure problems most often start, even if yours was normal in pregnancy. Free at your ANM, ASHA or PHC if you have no machine." };
  if (tier === "watch") return { advised: ageDays <= 14, due: ageDays <= 14 && !today && daysSinceLast >= 3, headline: "Check your blood pressure now and then", why: "Because of what you told us about your pregnancy, a reading every few days in the first two weeks is wise." };
  return { advised: false, due: false, headline: "", why: "" };
}

export type BpAlert = { level: Level; why: string };

/** Looks at the last few readings together. A single reading is judged by triageCheckin; this catches a pattern. */
export function bpTrend(checkins: Reading[], now = Date.now()): BpAlert | null {
  const last = checkins.filter((c) => c.bp && now - new Date(c.date).getTime() <= 4 * DAY).sort((a, b) => a.date.localeCompare(b.date)).slice(-3);
  if (last.length < 2) return null;
  const a = last[0].bp!, z = last[last.length - 1].bp!;
  const raised = (b: { sys: number; dia: number }) => b.sys >= 140 || b.dia >= 90;
  const prev = last[last.length - 2].bp!;
  if (raised(z) && raised(prev)) return { level: "AMBER", why: "Two raised blood pressure readings in a row" };
  if (z.sys - a.sys >= 20 && z.sys >= 130) return { level: "AMBER", why: "Your blood pressure has been rising over the last few days" };
  return null;
}

export const BP_HOWTO = [
  "Sit quietly for 5 minutes, back supported, feet flat, and do not talk.",
  "No tea, coffee or smoking for 30 minutes before.",
  "Rest your bare upper arm on a table, cuff at the level of your heart.",
  "Take two readings a minute apart and enter the second one.",
  "Use the same arm and about the same time each day.",
];
