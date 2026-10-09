import type { Concern, ProLoad, RoutingResult, Specialty } from "../types/cases.ts";

// Continuity of care: who should handle an alert. Continuity decides WHO, never how urgent: nothing here looks at severity,
// so a returning patient's case can never jump ahead of (or fall behind) anyone else's.
//
//   1. find the specialty for the concern
//   2. her preferred or previous professional of that specialty, if on duty, even above their soft limit
//   3. otherwise the on-duty professional of that specialty with the fewest open Immediate and Urgent items, below their limit
//   4. if nobody is below their limit, the on-call backup
//   5. an existing open case never moves by itself (only the escalation ladder or "Take over", both audited, in a later challenge)

/** Mood and safety go to a psychologist; the medical concerns to a gynaecologist; a baby concern to a paediatrician, then a gynaecologist. */
export function specialtiesFor(concern: Concern): Specialty[] {
  switch (concern) {
    case "MOOD": case "SELF_HARM": case "ENGAGEMENT": return ["psychologist"];
    case "NEWBORN": return ["paediatrician", "gynaecologist"];
    default: return ["gynaecologist"];
  }
}

export type VisitCount = { proId: string; sessions: number };
export type RoutingInput = {
  concern: Concern;
  /** her care_preferences rows: the professional she (or her last completed session) chose, per specialty */
  preferred: { specialty: Specialty; proId: string }[];
  /** completed sessions she has had, per professional */
  history: VisitCount[];
  pros: ProLoad[];
};

const none = (): RoutingResult => ({ proId: null, proName: "", kind: "none", sessions: 0 });

export function assign({ concern, preferred, history, pros }: RoutingInput): RoutingResult {
  const wanted = specialtiesFor(concern);
  const fits = (p: ProLoad) => p.specialty !== null && wanted.includes(p.specialty);
  // the first specialty in the list is the best fit; later ones are only used if nobody earlier can take it
  const rank = (p: ProLoad) => wanted.indexOf(p.specialty as Specialty);
  const sessionsWith = (id: string) => history.find((h) => h.proId === id)?.sessions ?? 0;
  const byName = (a: ProLoad, b: ProLoad) => a.name.localeCompare(b.name);

  const candidates = pros.filter(fits);
  const onDuty = candidates.filter((p) => p.onDuty);

  // 2. a professional she already knows: the one she chose, then the one she has seen most
  const chosen = preferred.filter((x) => wanted.includes(x.specialty)).map((x) => candidates.find((p) => p.id === x.proId)).filter((p): p is ProLoad => !!p);
  const seen = candidates.filter((p) => sessionsWith(p.id) > 0).sort((a, b) => rank(a) - rank(b) || sessionsWith(b.id) - sessionsWith(a.id) || byName(a, b));
  const known = [...chosen, ...seen.filter((p) => !chosen.includes(p))];
  const here = known.find((p) => p.onDuty);
  if (here) return { proId: here.id, proName: here.name, kind: sessionsWith(here.id) > 0 ? "returning" : "preferred", sessions: sessionsWith(here.id) };

  // 3. the least busy colleague below their limit (the best-fitting specialty first)
  const free = onDuty.filter((p) => p.openLoad < p.maxOpen).sort((a, b) => rank(a) - rank(b) || a.openLoad - b.openLoad || byName(a, b));
  const note: RoutingResult["note"] = known.length ? "preferred_off_duty" : undefined;
  if (free.length) return { proId: free[0].id, proName: free[0].name, kind: "new", sessions: 0, note };

  // 4. everyone of that specialty is full or off duty: the on-call backup (same specialty if there is one, otherwise anyone on call).
  //    If the team has nobody of that specialty at all, we say so ("none") and the caller keeps telling everyone matched.
  const onCall = (candidates.length ? pros : []).filter((p) => p.onDuty && p.isOnCall).sort((a, b) => Number(fits(b)) - Number(fits(a)) || a.openLoad - b.openLoad || byName(a, b));
  if (onCall.length) return { proId: onCall[0].id, proName: onCall[0].name, kind: "on_call", sessions: 0, note };

  return none();
}
