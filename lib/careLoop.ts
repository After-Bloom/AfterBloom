// The care loop: after a RED or AMBER result, ask later whether she got care. Plain rules, so a clinician can change the timings.
export type LoopLevel = "RED" | "AMBER";
export type LoopStatus = "open" | "got_care" | "better" | "cant_reach" | "worse" | "no_answer";
export type LoopAnswer = "got_care" | "better" | "going" | "cant_reach" | "worse";
export type CareLoop = { id: string; level: LoopLevel; reason: string; status: LoopStatus; check_at: string; created_at: string };

export const LOOP = {
  /** hours until the app asks her: a RED result means go now, an AMBER one means within a day */
  askAfterHours: { RED: 3, AMBER: 18 } as Record<LoopLevel, number>,
  /** if she is not asked again, and does not answer, her people are told this long after the question was due */
  graceHours: 2,
  /** "I am on my way" pushes the question back by this much, once */
  goingHours: 3,
  /** a new loop is not opened while one is already open from this recent */
  dedupeHours: 24,
};

export const hoursFromNow = (h: number, from = Date.now()) => new Date(from + h * 3600000).toISOString();
export const isDue = (l: Pick<CareLoop, "status" | "check_at">, now = Date.now()) => l.status === "open" && new Date(l.check_at).getTime() <= now;
export const isOverdue = (l: Pick<CareLoop, "status" | "check_at">, now = Date.now()) => l.status === "open" && new Date(l.check_at).getTime() + LOOP.graceHours * 3600000 <= now;
