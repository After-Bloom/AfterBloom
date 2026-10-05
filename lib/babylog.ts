// local calendar day, the same way the rest of the app writes dates (kept here so this file has no UI dependencies)
const dayStr = (d: Date | string) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };

// Newborn feeding and nappy watch. It only compares counts with the usual pattern and says "ask a doctor"; it never diagnoses.
export type LogKind = "feed" | "wet" | "stool";
export type BabyLog = { id: string; kind: LogKind; at: string };

export const KIND_LABEL: Record<LogKind, string> = { feed: "Feeds", wet: "Wet nappies", stool: "Stools" };

/** What is usual in a day for a baby this many days old (day 1 = the day after birth). */
export function usual(ageDays: number) {
  return { feeds: 8, wet: Math.min(6, Math.max(1, ageDays)) };
}

export const countOn = (logs: BabyLog[], kind: LogKind, day: string) => logs.filter((l) => l.kind === kind && dayStr(l.at) === day).length;

export type Note = { tone: "warn" | "info"; text: string };

/** Looks at yesterday (a finished day) and today so far. Wet nappies are the clearest sign the baby is getting enough milk. */
export function babyNotes(logs: BabyLog[], ageDays: number, now = Date.now()): Note[] {
  const out: Note[] = [];
  if (ageDays > 60 || !logs.length) return out;
  const y = dayStr(new Date(now - 86400000));
  const hasYesterday = logs.some((l) => dayStr(l.at) === y);
  if (hasYesterday && ageDays >= 2) {
    const u = usual(ageDays - 1);
    const wet = countOn(logs, "wet", y), feeds = countOn(logs, "feed", y);
    if (wet < u.wet) out.push({ tone: "warn", text: "Yesterday there were fewer wet nappies than usual for this age. Feed often today, and see a doctor today if it happens again or the baby is sleepy." });
    if (feeds > 0 && feeds < u.feeds - 2) out.push({ tone: "warn", text: "Yesterday there were fewer feeds than the 8 to 12 a newborn usually has. Wake the baby for feeds if more than 3 hours pass, and ask your doctor or ANM if the baby will not feed." });
  }
  const lastFeed = logs.filter((l) => l.kind === "feed").sort((a, b) => b.at.localeCompare(a.at))[0];
  if (lastFeed && ageDays <= 28 && now - new Date(lastFeed.at).getTime() > 5 * 3600000) out.push({ tone: "warn", text: "It has been more than 5 hours since the last logged feed. If the baby is not feeding, call your doctor now." });
  return out;
}

/** Weight against birth weight. Newborns lose a little weight in the first days and usually regain it by 2 weeks. */
export function weightNotes(birthKg: number | null | undefined, weights: { date: string; kg: number }[], ageDays: number): Note[] {
  const w = weights.filter((x) => x.kg > 0).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!birthKg || !w) return [];
  const loss = ((birthKg - w.kg) / birthKg) * 100;
  if (loss > 10) return [{ tone: "warn", text: `The last weight is ${loss.toFixed(0)}% below birth weight. More than 10% needs a doctor's check today.` }];
  if (ageDays >= 14 && w.kg < birthKg) return [{ tone: "warn", text: "Most babies are back to birth weight by 2 weeks. Ask your doctor or ANM to look at feeding." }];
  if (loss > 0 && ageDays < 14) return [{ tone: "info", text: `The last weight is ${loss.toFixed(0)}% below birth weight, which is common in the first days. Keep feeding often.` }];
  return [];
}
