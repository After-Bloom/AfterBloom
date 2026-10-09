import type { Signal } from "../types/cases.ts";

/**
 * What a matched professional may see of a mother's signals.
 * Red alerts and anything about her safety are ALWAYS visible (that is the point of the crisis protocol), but the details behind
 * them (her BP numbers, her screening score) only while she shares her health records. Everything else needs her to be sharing.
 * This is the one place that decides it; the pages and routes never filter on their own.
 */
export function visibleSignals(signals: Signal[], shares: boolean): Signal[] {
  if (shares) return signals;
  return signals.filter((s) => s.severity === "red" || s.concern === "SELF_HARM").map((s) => ({ ...s, value: null }));
}
