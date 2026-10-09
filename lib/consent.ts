// Whether she is sharing right now, in one place, so a pause behaves everywhere exactly like switching sharing off for a while.
// No framework import here (used from the server and from client-side screens alike).

/**
 * Her switch, plus any active pause. A pause only lasts until sharingPausedUntil; once that time passes she is back to her
 * switch, with nothing further to do. This never touches red or self-harm visibility: those bypass consent entirely,
 * in visibleSignals()/visibleCases(), exactly as they did before pausing existed.
 */
export function effectiveShares(consentSharePro: boolean, sharingPausedUntil: string | null, now = Date.now()): boolean {
  if (sharingPausedUntil && new Date(sharingPausedUntil).getTime() > now) return false;
  return consentSharePro;
}

/** A pause set by "pause until I resume" (not a fixed number of hours) is stored as this far-future timestamp. */
export const PAUSE_INDEFINITE = "3000-01-01T00:00:00.000Z";
export const isIndefinitePause = (until: string | null) => !!until && new Date(until).getTime() > new Date("2999-01-01").getTime();
