import type { State } from "./store";
import { daysSince, dayStr } from "./store";
import { VACCINES } from "./vaccines";

// Weekly report text is assembled from fixed, prewritten templates - no AI.
const STAGE: Record<number, string> = {
  1: "Week 1: rest is your job right now. Heavy tiredness and tears are common.",
  2: "Week 2: the baby blues often peak and then ease. If sadness stays, tell your care team.",
  3: "Week 3: many mothers feel overwhelmed now. Ask for one concrete thing from your family today.",
  4: "Week 4: feeding settles into a pattern. A short walk and sunlight can lift your mood.",
  5: "Week 5: you may be feeling stronger. Keep your six-week check-up booked.",
  6: "Week 6: time for your postnatal check-up. Take your one-page summary with you.",
};
export const stageText = (birth: string) => STAGE[Math.min(6, Math.max(1, Math.ceil((daysSince(birth) + 1) / 7)))] ?? "You are doing a wonderful job. Keep checking in on yourself.";

export function weekData(s: State) {
  const week = s.checkins.filter((c) => daysSince(c.date) < 7);
  const days = new Set(week.map((c) => dayStr(c.date))).size;
  const avg = (f: (c: any) => number) => (week.length ? week.reduce((a, c) => a + f(c), 0) / week.length : 0);
  const lowSleepNights = week.filter((c) => c.sleepHours < 5).length;
  const age = daysSince(s.mother.birth);
  const nextVax = VACCINES.find((v) => v.days >= age);
  const dueIn = nextVax ? nextVax.days - age : null;
  return {
    week, days, mood: avg((c) => c.mood), appetite: avg((c) => c.appetite), sleep: avg((c) => c.sleepHours), lowSleepNights,
    symptoms: s.symptomLogs.filter((l) => daysSince(l.date) < 7), nextVax, dueIn,
    booking: s.bookings.filter((b) => new Date(b.when) > new Date()).sort((a, b) => a.when.localeCompare(b.when))[0],
    watching: s.flags.some((f) => !f.resolved) || s.epds.some((e) => e.band === "probable" && daysSince(e.date) < 14),
  };
}

export const face = (n: number) => (n >= 4.5 ? "😄" : n >= 3.5 ? "🙂" : n >= 2.5 ? "😐" : n >= 1.5 ? "😕" : "😢");

export function familyNote(s: State, tr: (en: string, v?: Record<string, string | number>) => string) {
  const w = weekData(s);
  const lines: string[] = [];
  if (w.lowSleepNights >= 2) lines.push(tr("She slept under 5 hours on {n} nights this week. Can someone take a night feed?", { n: w.lowSleepNights }));
  lines.push(tr("Ask her what would help most today, then do it without being asked twice."));
  lines.push(tr("Cook a meal or fill her water bottle - small things lift a very big load."));
  lines.push(tr("Listen without fixing. 'That sounds hard' is a good sentence."));
  return lines;
}

/** The first six weeks, one row per week since birth: how often she checked in, her averages, and anything that was not green. */
export function recoveryWeeks(s: State) {
  const birth = new Date(s.mother.birth).getTime();
  const age = daysSince(s.mother.birth);
  const weeks = Math.min(6, Math.floor(age / 7) + 1);
  const DAY = 86400000;
  return Array.from({ length: weeks }, (_, w) => {
    const from = birth + w * 7 * DAY, to = from + 7 * DAY;
    const inWeek = (d: string) => { const t = new Date(d).getTime(); return t >= from && t < to; };
    const cis = s.checkins.filter((c) => inWeek(c.date));
    const avg = (f: (c: any) => number) => (cis.length ? cis.reduce((a, c) => a + f(c), 0) / cis.length : null);
    const bps = cis.filter((c) => c.bp).map((c) => c.bp!);
    return {
      week: w + 1, days: new Set(cis.map((c) => dayStr(c.date))).size, mood: avg((c) => c.mood), sleep: avg((c) => c.sleepHours),
      amber: s.symptomLogs.filter((l) => inWeek(l.date) && l.level === "AMBER").length + cis.filter((c) => c.level === "AMBER").length,
      red: s.symptomLogs.filter((l) => inWeek(l.date) && l.level === "RED").length + cis.filter((c) => c.level === "RED").length,
      maxBp: bps.length ? bps.reduce((m, b) => (b.sys > m.sys ? b : m)) : null,
      current: w === weeks - 1,
    };
  });
}
