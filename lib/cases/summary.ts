import type { Case, Concern, Severity, Signal } from "../types/cases.ts";
import { SEVERITY_RANK } from "../signals/config.ts";
import { formatClock } from "../time.ts";

// What a doctor needs to see at the top of a case: who triggered it, what changed, and a one-sentence summary.
// Everything here is built from templates and the saved alerts. No AI writes any of it, and the times are real (Asia/Kolkata).

type Lang = "en" | "hi";
const ms = (iso: string) => new Date(iso).getTime();
const HOUR = 3600000;
const bpOf = (s: Signal) => { const v = s.value as { sys?: number; dia?: number } | null; return v?.sys && v?.dia ? { sys: v.sys, dia: v.dia } : null; };
const sevWord = (s: Severity, lang: Lang) => (lang === "hi" ? { red: "लाल", amber: "अंबर", info: "सूचना" }[s] : { red: "red", amber: "amber", info: "info" }[s]);
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const byTime = (a: Signal, b: Signal) => ms(a.observedAt) - ms(b.observedAt);

/** The alert that opened the case, and every alert that raised its severity after that, with their times. */
export function triggeredBy(signals: Signal[]): Signal[] {
  const out: Signal[] = [];
  let peak = -1;
  for (const s of [...signals].sort(byTime)) {
    if (SEVERITY_RANK[s.severity] > peak) { out.push(s); peak = SEVERITY_RANK[s.severity]; }
  }
  return out;
}

export type Chip = { kind: "bp" | "severity" | "sleep" | "mood"; text: string };
export type CheckinPoint = { date: string; sleepHours: number; bp?: { sys: number; dia: number } };

/** BP readings in order, each rise in severity with its time, sleep and mood-screen changes. */
export function whatChanged(signals: Signal[], checkins: CheckinPoint[], lang: Lang = "en"): Chip[] {
  const chips: Chip[] = [];
  const sorted = [...signals].sort(byTime);

  const readings: string[] = [];
  for (const s of sorted) { const b = bpOf(s); if (b) { const t = `${b.sys}/${b.dia}`; if (readings.at(-1) !== t) readings.push(t); } }
  if (readings.length >= 2) chips.push({ kind: "bp", text: `${lang === "hi" ? "बीपी" : "BP"} ${readings.slice(-4).join(" → ")}` });

  let peak: Severity | null = null;
  for (const s of sorted) {
    if (peak && SEVERITY_RANK[s.severity] > SEVERITY_RANK[peak]) chips.push({ kind: "severity", text: lang === "hi" ? `${sevWord(peak, lang)} से ${sevWord(s.severity, lang)}, ${formatClock(s.observedAt, lang)} पर` : `${cap(sevWord(peak, lang))} → ${cap(sevWord(s.severity, lang))} at ${formatClock(s.observedAt, lang)}` });
    if (peak === null || SEVERITY_RANK[s.severity] > SEVERITY_RANK[peak]) peak = s.severity;
  }

  const sleeps = [...checkins].sort((a, b) => ms(a.date) - ms(b.date)).slice(-7).filter((c) => Number.isFinite(c.sleepHours));
  if (sleeps.length >= 2 && Math.abs(sleeps.at(-1)!.sleepHours - sleeps[0].sleepHours) >= 0.5) chips.push({ kind: "sleep", text: `${lang === "hi" ? "नींद" : "Sleep"} ${sleeps[0].sleepHours} ${lang === "hi" ? "घंटे" : "h"} → ${sleeps.at(-1)!.sleepHours} ${lang === "hi" ? "घंटे" : "h"}` });

  const scores: number[] = [];
  for (const s of sorted) { const t = (s.value as { total?: number } | null)?.total; if (typeof t === "number" && s.code.startsWith("epds") && scores.at(-1) !== t) scores.push(t); }
  if (scores.length >= 2) chips.push({ kind: "mood", text: `${lang === "hi" ? "मूड स्क्रीनिंग" : "Mood screen"} ${scores.join(" → ")}` });
  return chips;
}

/** Alerts that arrived after this professional last opened the case. The first time they open it nothing is called new. */
export function newSince(signals: Signal[], lastSeenAt: string | null): Set<string> {
  if (!lastSeenAt) return new Set();
  return new Set(signals.filter((s) => ms(s.observedAt) > ms(lastSeenAt)).map((s) => s.id));
}

export const BP_POINTS = 14;
/** One systolic point per check-in over the last 14 days, for the small BP chart. */
export function bpSeries(checkins: CheckinPoint[]): { date: string; sys: number; dia: number }[] {
  return [...checkins].filter((c) => c.bp).sort((a, b) => ms(a.date) - ms(b.date)).slice(-BP_POINTS).map((c) => ({ date: c.date, sys: c.bp!.sys, dia: c.bp!.dia }));
}

const PHRASE: Record<Concern, { en: string; hi: string }> = {
  HYPERTENSIVE: { en: "raised blood pressure", hi: "बढ़े हुए ब्लड प्रेशर" },
  HAEMORRHAGE: { en: "heavy bleeding", hi: "भारी रक्तस्राव" },
  INFECTION: { en: "an infection", hi: "संक्रमण" },
  CLOT_RISK: { en: "a clot or breathing problem", hi: "खून के थक्के या साँस की समस्या" },
  MOOD: { en: "low mood", hi: "उदासी" },
  SELF_HARM: { en: "thoughts of self-harm", hi: "खुद को नुकसान के विचार" },
  NEWBORN: { en: "a problem with the baby", hi: "शिशु की समस्या" },
  ENGAGEMENT: { en: "missed check-ins", hi: "छूटे हुए चेक-इन" },
  GENERAL: { en: "a symptom that needs a look", hi: "ऐसा लक्षण जिसे देखना ज़रूरी है" },
};

function span(first: string, last: string, lang: Lang) {
  const h = Math.max(0, (ms(last) - ms(first)) / HOUR);
  if (h < 1) return lang === "hi" ? "एक घंटे से कम" : "under an hour";
  if (h < 48) return lang === "hi" ? `${Math.round(h)} घंटे` : `${Math.round(h)} hours`;
  return lang === "hi" ? `${Math.round(h / 24)} दिन` : `${Math.round(h / 24)} days`;
}

/**
 * One sentence, from templates, with the real numbers and times:
 * "7 alerts in 26 hours point to raised blood pressure. BP rose from 142/90 to 152/96, with headache and blurred vision. No reply to the follow-up question since 10:10 pm."
 * `title` gives the words for one alert (the screen passes the symptom's own wording).
 */
export function summarySentence(c: Pick<Case, "concern">, signals: Signal[], lang: Lang, title: (s: Signal) => string): string {
  if (!signals.length) return "";
  const sorted = [...signals].sort(byTime);
  const n = sorted.length;
  const hi = lang === "hi";
  const parts: string[] = [];
  parts.push(hi ? `${n} अलर्ट, ${span(sorted[0].observedAt, sorted.at(-1)!.observedAt, lang)} में, ${PHRASE[c.concern].hi} की ओर इशारा करते हैं।` : `${n} ${n === 1 ? "alert" : "alerts"} in ${span(sorted[0].observedAt, sorted.at(-1)!.observedAt, lang)} point to ${PHRASE[c.concern].en}.`);

  const bps = sorted.map(bpOf).filter((b): b is { sys: number; dia: number } => !!b);
  const symptoms: string[] = [];
  for (const s of sorted) {
    if (bpOf(s) || s.relation === "FOLLOW_UP" || s.code.startsWith("loop_") || s.code === "callback_overdue") continue;
    const t = title(s).toLowerCase();
    if (!symptoms.includes(t)) symptoms.push(t);
  }
  const bpText = bps.length >= 2 && (bps[0].sys !== bps.at(-1)!.sys || bps[0].dia !== bps.at(-1)!.dia)
    ? (hi ? `बीपी ${bps[0].sys}/${bps[0].dia} से ${bps.at(-1)!.sys}/${bps.at(-1)!.dia} हुआ` : `BP ${bps.at(-1)!.sys >= bps[0].sys ? "rose" : "changed"} from ${bps[0].sys}/${bps[0].dia} to ${bps.at(-1)!.sys}/${bps.at(-1)!.dia}`)
    : "";
  const list = symptoms.slice(0, 2).join(hi ? " और " : " and ");
  const withText = !symptoms.length ? "" : bpText ? (hi ? `साथ में ${list}` : `with ${list}`) : (hi ? `बताया गया: ${list}` : `Reported: ${list}`);
  const middle = [bpText, withText].filter(Boolean).join(", ");
  if (middle) parts.push(`${cap(middle)}.`);

  const noReply = [...sorted].reverse().find((s) => s.code === "loop_no_reply");
  const asked = (noReply?.value as { askedAt?: string } | null)?.askedAt;
  if (noReply) parts.push(hi ? `फ़ॉलो-अप सवाल का जवाब${asked ? ` ${formatClock(asked, lang)} से` : ""} नहीं आया।` : `No reply to the follow-up question${asked ? ` since ${formatClock(asked, lang)}` : ""}.`);
  else if (sorted.some((s) => s.code === "callback_overdue")) parts.push(hi ? "कॉलबैक में देरी है।" : "A callback is overdue.");
  return parts.join(" ");
}
