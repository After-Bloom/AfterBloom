import type { Signal } from "../types/cases.ts";

// A3: mood, EPDS and partner-screening numbers are sensitive even when she is sharing, so they are never sent to the
// professional's screen in the clear. The real value only leaves the server through POST /api/reveal, which checks her
// consent again and logs the view. Self-harm signals (EPDS question 10, psychosis signs) are a different concern,
// SELF_HARM, and are never blurred: the safety rule that they always stay visible must not be weakened by this.

/** True for a signal whose value carries a mood/EPDS/partner-screen detail that should stay blurred until shown. */
export const isSensitive = (s: Pick<Signal, "concern">) => s.concern === "MOOD";

/** Replace sensitive values with a placeholder. The row, its relation and its time all still show; only the number is held back. */
export function blurSensitive(signals: Signal[]): Signal[] {
  return signals.map((s) => (isSensitive(s) && s.value ? { ...s, value: null, blurred: true } : s));
}

/**
 * The "Why this priority" reasons are worked out straight from the real EPDS score, a separate path from the signals above,
 * so the same score can otherwise leak through there even while its signal stays blurred. The rule still shows ("Mood screen:
 * probable"), just not the number.
 */
export function blurReasons<T extends { key: string; total?: number }>(reasons: T[]): T[] {
  return reasons.map((r) => (r.key === "epds_high" || r.key === "epds_mid" ? { ...r, total: undefined } : r));
}
