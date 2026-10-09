import type { Priority } from "./priority.ts";

// The escalation ladder for a case nobody has picked up. It is worked out from the clock whenever the queue loads (and from a
// "Run checks now" button), so it needs no scheduler: running it twice never repeats a step.
//   level 1  the assigned doctor (from the moment the case becomes Immediate)
//   level 2  the on-call backup, if nobody has acknowledged it after 15 minutes
//   level 3  the admin desk, if nobody has acknowledged it after 30 minutes
export const LADDER = { onCallAfterMinutes: 15, adminAfterMinutes: 30 };

export type LadderInput = { priority: Priority | null; status: string; acknowledgedAt: string | null; prioritySince: string | null };

/** Which level the case should be at right now. 1 = no escalation needed (yet, or at all). */
export function ladderLevel(c: LadderInput, now: number): 1 | 2 | 3 {
  if (c.priority !== "P1" || c.status === "resolved" || c.acknowledgedAt || !c.prioritySince) return 1;
  const minutes = (now - new Date(c.prioritySince).getTime()) / 60000;
  return minutes >= LADDER.adminAfterMinutes ? 3 : minutes >= LADDER.onCallAfterMinutes ? 2 : 1;
}

/** Minutes until the next step, for the "backup Dr Sen at 15 min" line. Null when there is no next step. */
export function nextStepIn(c: LadderInput, now: number): { level: 2 | 3; minutes: number } | null {
  if (c.priority !== "P1" || c.status === "resolved" || c.acknowledgedAt || !c.prioritySince) return null;
  const minutes = (now - new Date(c.prioritySince).getTime()) / 60000;
  if (minutes < LADDER.onCallAfterMinutes) return { level: 2, minutes: Math.ceil(LADDER.onCallAfterMinutes - minutes) };
  if (minutes < LADDER.adminAfterMinutes) return { level: 3, minutes: Math.ceil(LADDER.adminAfterMinutes - minutes) };
  return null;
}
