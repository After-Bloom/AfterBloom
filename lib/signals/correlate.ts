import type { Concern, LinkDecision, RelationDetail, Severity, Signal, SignalInput, Subject } from "../types/cases.ts";
import { CONCERN_WINDOW_HOURS, CORROBORATE_HOURS, POSSIBLE_HOURS, POSSIBLE_PAIRS, REPEAT_HOURS, SEVERITY_RANK } from "./config.ts";

// The linking rules. Plain rules, no AI: a clinician can read them, edit them in config.ts and defend every decision.
// One pure function so the same rules run in the app, in the seed and in the tests.

const HOUR = 3600000;
const ms = (iso: string) => new Date(iso).getTime();
const ageHours = (earlier: string, later: string) => (ms(later) - ms(earlier)) / HOUR;

export type Incoming = Pick<SignalInput, "motherId" | "subject" | "source" | "code" | "concern" | "severity" | "followUpOf" | "forceNotify"> & { observedAt: string };

/** The worst severity this concern has reached within its window. Severity only ever goes up on its own: nothing here lowers it. */
export function peakSeverity(history: Signal[], concern: Concern, subject: Subject, at: string): Severity | null {
  const window = CONCERN_WINDOW_HOURS[concern];
  let peak: Severity | null = null;
  for (const h of history) {
    if (h.concern !== concern || h.subject !== subject || ms(h.observedAt) > ms(at) || ageHours(h.observedAt, at) > window) continue;
    if (peak === null || SEVERITY_RANK[h.severity] > SEVERITY_RANK[peak]) peak = h.severity;
  }
  return peak;
}

const pairedWith = (a: string, b: string) => POSSIBLE_PAIRS.some((p) => (p.a.includes(a) && p.b.includes(b)) || (p.a.includes(b) && p.b.includes(a)));

/**
 * Decide how a new alert relates to the mother's earlier ones, and whether the care team must be told now.
 * Relations are checked in this order: follow-up, repeat, also reported, same concern, possibly related, new.
 *
 * Safety rules (they decide `notify`, whatever the relation is):
 *  - a new concern always notifies
 *  - a rise in severity within a concern always notifies
 *  - any self-harm signal always notifies
 * Everything else is a repeat of something the care team already knows, so it is held back (it still appears in the list).
 */
export function classify(inc: Incoming, history: Signal[]): LinkDecision {
  const earlier = history
    .filter((h) => h.motherId === inc.motherId && ms(h.observedAt) <= ms(inc.observedAt))
    .sort((a, b) => ms(b.observedAt) - ms(a.observedAt));
  const age = (h: Signal) => ageHours(h.observedAt, inc.observedAt);

  const window = CONCERN_WINDOW_HOURS[inc.concern];
  const sameConcern = earlier.filter((h) => h.concern === inc.concern && h.subject === inc.subject && age(h) <= window);
  const peak = peakSeverity(earlier, inc.concern, inc.subject, inc.observedAt);

  // ----- who must be told -----
  let notify: RelationDetail["notify"] = "held_back";
  if (inc.concern === "SELF_HARM") notify = "self_harm";
  else if (sameConcern.length === 0) notify = "new_concern";
  else if (peak !== null && SEVERITY_RANK[inc.severity] > SEVERITY_RANK[peak]) notify = "severity_rise";
  else if (inc.forceNotify) notify = "forced";
  const tell = notify !== "held_back";

  const of = (h: Signal): Pick<RelationDetail, "ofCode" | "ofSource" | "ofAt"> => ({ ofCode: h.code, ofSource: h.source, ofAt: h.observedAt });
  const done = (relation: LinkDecision["relation"], related: Signal | null, extra: Partial<RelationDetail> = {}): LinkDecision => ({
    relation,
    detail: { kind: relation, ...(related ? of(related) : {}), ...extra, notify },
    relatedTo: related?.id ?? null,
    linkStatus: relation === "POSSIBLY_RELATED" ? "suggested" : "auto",
    notify: tell,
  });

  // 1. follow-up: it exists because of an earlier alert (care-loop no reply, overdue callback)
  if (inc.followUpOf) {
    const parent = history.find((h) => h.id === inc.followUpOf);
    if (parent) return done("FOLLOW_UP", parent);
  }

  // 2. repeat: same code from the same source within 12 hours
  const repeats = earlier.filter((h) => h.code === inc.code && h.source === inc.source && h.subject === inc.subject && age(h) <= REPEAT_HOURS);
  if (repeats.length) return done("DUPLICATE", repeats[0], { count: repeats.length + 1 });

  // 3. also reported: same code from a different source within 12 hours
  const also = earlier.find((h) => h.code === inc.code && h.source !== inc.source && h.subject === inc.subject && age(h) <= CORROBORATE_HOURS);
  if (also) return done("CORROBORATES", also);

  // 4. same concern: inside that concern's window
  if (sameConcern.length) return done("RELATED", sameConcern[0], { concern: inc.concern, windowHours: window });

  // 5. possibly related: a small table of pairs from two different concerns. Never linked automatically; a clinician confirms.
  const maybe = earlier.find((h) => h.concern !== inc.concern && age(h) <= POSSIBLE_HOURS && pairedWith(inc.code, h.code));
  if (maybe) return done("POSSIBLY_RELATED", maybe, { otherConcern: maybe.concern });

  // 6. new
  return done("NEW", null);
}

// ---------- reading a list of signals back ----------

export type Group = { key: string; concern: Concern; subject: Subject; signals: Signal[]; peak: Severity; lastAt: string };

/**
 * One group per concern (and subject) for the "Grouped" view, newest group first. A signal a clinician unlinked stands on its own.
 * Nothing is dropped: grouping only changes how the same signals are laid out.
 */
export function groupSignals(signals: Signal[]): Group[] {
  const map = new Map<string, Group>();
  const byId = new Map(signals.map((s) => [s.id, s]));
  const sorted = [...signals].sort((a, b) => ms(a.observedAt) - ms(b.observedAt));
  const keyOf = (s: Signal): string => {
    if (s.linkStatus === "unlinked") return `${s.concern}:${s.subject}:alone:${s.id}`;
    // a clinician-confirmed link sits with the alert it was confirmed against, even though it is a different concern
    const anchor = s.linkStatus === "confirmed" && s.relatedTo ? byId.get(s.relatedTo) : undefined;
    return anchor && anchor.linkStatus !== "unlinked" ? keyOf(anchor) : `${s.concern}:${s.subject}`;
  };
  for (const s of sorted) {
    const key = keyOf(s);
    const g = map.get(key) ?? { key, concern: s.concern, subject: s.subject, signals: [], peak: s.severity, lastAt: s.observedAt };
    g.signals.push(s);
    if (SEVERITY_RANK[s.severity] > SEVERITY_RANK[g.peak]) g.peak = s.severity;
    g.lastAt = s.observedAt;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => SEVERITY_RANK[b.peak] - SEVERITY_RANK[a.peak] || ms(b.lastAt) - ms(a.lastAt));
}

export type Row = { signal: Signal; /** repeats folded into this row, oldest first */ repeats: Signal[] };

/** Within a group, repeats collapse under the first report with a count, and expand on tap. Nothing is deleted. */
export function collapseRepeats(signals: Signal[]): Row[] {
  const rows: Row[] = [];
  const byId = new Map<string, Row>();
  for (const s of [...signals].sort((a, b) => ms(a.observedAt) - ms(b.observedAt))) {
    const parent = s.relation === "DUPLICATE" && s.linkStatus !== "unlinked" && s.relatedTo ? byId.get(s.relatedTo) : undefined;
    // a repeat that is more severe than what it repeats is never folded away: the rise stays visible
    const top = parent ? Math.max(SEVERITY_RANK[parent.signal.severity], ...parent.repeats.map((r) => SEVERITY_RANK[r.severity])) : 0;
    if (parent && SEVERITY_RANK[s.severity] <= top) { parent.repeats.push(s); byId.set(s.id, parent); continue; }
    const row: Row = { signal: s, repeats: [] };
    rows.push(row);
    byId.set(s.id, row);
  }
  return rows;
}
