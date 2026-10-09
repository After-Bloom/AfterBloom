// Shared shapes for the alert-grouping work (signals now; cases, actions and the queue follow in the next challenges).
// Everything that touches signals imports its types from here, so the database, the server and the screens agree.

/** What the alert is about. These are the code names; the screens show the words from lib/labels.ts. */
export type Concern = "HYPERTENSIVE" | "HAEMORRHAGE" | "INFECTION" | "CLOT_RISK" | "MOOD" | "SELF_HARM" | "NEWBORN" | "ENGAGEMENT" | "GENERAL";
export type Subject = "mother" | "baby";
export type Severity = "info" | "amber" | "red";
export type SignalSource = "symptom_checker" | "checkin" | "bp_trend" | "epds" | "care_loop" | "callback" | "circle_post" | "partner_screen";

/** How a new alert relates to the mother's earlier ones. Checked in this order. */
export type Relation = "FOLLOW_UP" | "DUPLICATE" | "CORROBORATES" | "RELATED" | "POSSIBLY_RELATED" | "NEW";

/** Auto = the system linked it. Suggested = a possible link waiting for a clinician. Confirmed / Unlinked = a clinician decided. */
export type LinkStatus = "auto" | "suggested" | "confirmed" | "unlinked";

/** The facts behind a relation. The screen turns these into a sentence ("Repeat x2", "Follow-up of 7:10 pm alert") in her language. */
export type RelationDetail = {
  kind: Relation;
  /** the earlier alert this one relates to */
  ofCode?: string;
  ofSource?: SignalSource;
  ofAt?: string;
  /** DUPLICATE: how many times this has now been reported */
  count?: number;
  /** RELATED: the concern and the window it was matched within, in hours */
  concern?: Concern;
  windowHours?: number;
  /** POSSIBLY_RELATED: the earlier alert's concern */
  otherConcern?: Concern;
  /** why this one did or did not notify the care team */
  notify?: "new_concern" | "severity_rise" | "self_harm" | "held_back" | "forced";
};

export type Signal = {
  id: string;
  motherId: string;
  subject: Subject;
  source: SignalSource;
  code: string;
  concern: Concern;
  severity: Severity;
  value: Record<string, unknown> | null;
  observedAt: string;
  originTable: string;
  originId: string;
  relation: Relation;
  relationDetail: RelationDetail;
  relatedTo: string | null;
  linkStatus: LinkStatus;
  notified: boolean;
  caseId: string | null;
  /** A3: its value is a mood/EPDS/partner-screen detail held back until a professional taps Show (see lib/signals/blur.ts). */
  blurred?: boolean;
};

/** What a producer hands to recordSignal(). Everything else is worked out by the linking rules. */
export type SignalInput = {
  motherId: string;
  subject: Subject;
  source: SignalSource;
  code: string;
  concern: Concern;
  severity: Severity;
  value?: Record<string, unknown> | null;
  observedAt?: string;
  originTable: string;
  originId: string;
  /** set when this alert exists because of an earlier one (care-loop no reply, overdue callback) */
  followUpOf?: string | null;
  /** the care team must be told even if the rules would hold this back (a mother who stopped answering) */
  forceNotify?: boolean;
};

export type LinkDecision = {
  relation: Relation;
  detail: RelationDetail;
  relatedTo: string | null;
  linkStatus: LinkStatus;
  /** true = tell the care team now; false = hold back, it repeats something they already know */
  notify: boolean;
};

// ---------- continuity of care ----------
export type Specialty = "psychologist" | "gynaecologist" | "paediatrician" | "lactation";

/** One professional and how busy they are. openLoad counts open Immediate and Urgent items. */
export type ProLoad = { id: string; name: string; specialty: Specialty | null; onDuty: boolean; isOnCall: boolean; maxOpen: number; openLoad: number };

export type RoutingKind = "returning" | "preferred" | "new" | "on_call" | "taken_over" | "none";
export type RoutingResult = {
  proId: string | null;
  proName: string;
  kind: RoutingKind;
  /** how many sessions she has had with that professional (returning patients) */
  sessions: number;
  /** facts for the card's reason line; the words come from lib/labels.ts */
  note?: "preferred_off_duty";
  /** when a professional took the case over (kind "taken_over") */
  at?: string;
};

// ---------- cases ----------
export type CaseStatus = "open" | "monitoring" | "resolved";
export type CaseEventType = "opened" | "reopened" | "severity_raised" | "link_confirmed" | "link_unlinked" | "resolved" | "action" | "priority_changed" | "escalated" | "taken_over" | "family_asked";

/** One case per mother, subject and concern: every related alert attaches to it. */
export type Case = {
  id: string;
  motherId: string;
  subject: Subject;
  concern: Concern;
  title: string;
  status: CaseStatus;
  severityPeak: Severity;
  severityCurrent: Severity;
  priority: string | null;
  dueBy: string | null;
  ownerProId: string | null;
  ownerReason: RoutingResult | null;
  acknowledgedAt: string | null;
  triggerSignalId: string | null;
  openedAt: string;
  lastSignalAt: string;
  resolvedAt: string | null;
  reopenedCount: number;
  /** when it reached its current priority (the due time counts from here), the escalation step it is on, and the last time anyone acted */
  prioritySince: string | null;
  escalationLevel: number;
  lastActionAt: string | null;
  /** why it has this priority: the rules that fired, as facts (see lib/workflow/priority.ts) */
  priorityReasons: { key: string; [k: string]: unknown }[];
};

export type CaseEvent = { id: number; caseId: string; at: string; type: CaseEventType; actorRole: string | null; actorId: string | null; detail: Record<string, unknown> };

/** What the professional's "related alerts" screen receives for one patient (consent already applied by the server). */
export type PatientSignals = {
  id: string; name: string; day: number; shares: boolean;
  signals: Signal[];
  /** the cases those alerts belong to (empty until migration 008 has been run) */
  cases: Case[];
  /** who owns each concern she has (continuity of care) */
  owners: Partial<Record<Concern, RoutingResult>>;
};
