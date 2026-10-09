// The consent rules for telling family, in one place so the screen, the send route and the tests agree.
// Her choice always wins: nothing here can override a "no". Messages come only from fixed neutral templates (lib/workflow/playbook.ts).

export type FamilyMember = { id: string; name: string; relation: string; alerts: boolean };
export type RequestState = { status: "pending" | "allow_once" | "always" | "declined"; usedAt: string | null } | null;
export type Check = { ok: true; via: "alerts_on" | "allow_once" } | { ok: false; reason: "no_emergency_consent" | "alerts_off" | "declined" | "waiting" | "used" };

/**
 * May a message be sent to this person right now? Read fresh from the database at the moment of sending, never from what the screen showed:
 * if she switched them off a second ago, this refuses.
 *  - her alerts consent must be on, and so must this person's switch
 *  - or she answered "Allow once" to a request and it has not been used yet
 */
export function canSend(emergencyConsent: boolean, member: FamilyMember, request: RequestState): Check {
  if (member.alerts && emergencyConsent) return { ok: true, via: "alerts_on" };
  if (request?.status === "allow_once") return request.usedAt ? { ok: false, reason: "used" } : { ok: true, via: "allow_once" };
  if (request?.status === "always" && emergencyConsent) return { ok: true, via: "alerts_on" };
  if (request?.status === "declined") return { ok: false, reason: "declined" };
  if (request?.status === "pending") return { ok: false, reason: "waiting" };
  return { ok: false, reason: member.alerts ? "no_emergency_consent" : "alerts_off" };
}

export type AskCheck = { ok: true } | { ok: false; reason: "safety_case" | "already_asked" | "alerts_on" };

/**
 * May the care team ask her about this person? Once per family member per case, never during a safety case (a mother in crisis is not
 * asked to make a consent decision; the crisis protocol applies), and only when the person is currently switched off.
 */
export function canAsk(member: FamilyMember, safetyCase: boolean, existing: RequestState): AskCheck {
  if (safetyCase) return { ok: false, reason: "safety_case" };
  if (existing) return { ok: false, reason: "already_asked" };
  if (member.alerts) return { ok: false, reason: "alerts_on" };
  return { ok: true };
}

/** What her consent looked like at the moment of an action. Stored with the audit record, shown as chips ("Rohan: alerts ON | Kamla: OFF"). */
export type ConsentSnapshot = { shares: boolean; emergencyAlerts: boolean; family: { name: string; alerts: boolean }[] };
export const snapshotOf = (shares: boolean, emergencyAlerts: boolean, members: FamilyMember[]): ConsentSnapshot => ({ shares, emergencyAlerts, family: members.map((m) => ({ name: m.name, alerts: m.alerts })) });
