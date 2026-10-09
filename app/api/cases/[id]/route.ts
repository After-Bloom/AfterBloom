import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { canProSeeMother, filterForPro } from "@/lib/server/access";
import { limited } from "@/lib/server/limit";
import { mapSignal } from "@/lib/server/signals";
import { notify } from "@/lib/server/notify";
import { decrypt, encrypt } from "@/lib/server/crypto";
import { mapCase } from "@/lib/cases/attach";
import { visibleCases } from "@/lib/signals/access";
import { mapCheckin } from "@/lib/data/load";
import { WorkflowError, askMother, consentOf, explain, gather, recordAction, requestOf, sendFamilyMessage } from "@/lib/workflow/engine";
import { canAsk, canSend, type FamilyMember } from "@/lib/workflow/family";
import { MONITOR_REASONS, withOverrides, type ActionType, type TemplateId } from "@/lib/workflow/playbook";
import { nextStepIn } from "@/lib/workflow/escalation";
import type { Outcome, Priority } from "@/lib/workflow/priority";
import type { CaseEvent } from "@/lib/types/cases";

// One case for a professional: the case and its priority (with the reasons), the next recommended action, its alerts (filtered by what she shares),
// her recent check-ins (only if she shares them), what has been done, who in her family may be told, and the audit trail.
// GET only reads. POST does one thing: view, act, acknowledge, takeover, family, ask. Only a professional matched with her can do any of it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

async function load(id: string) {
  const user = await currentUser();
  if (!user || user.role !== "pro") return { error: no(403, "not allowed") } as const;
  const admin = adminClient();
  const { data: row, error } = await admin.from("cases").select("*").eq("id", id).maybeSingle();
  if (error) return { error: no(503, "cases-not-ready") } as const; // the 008 migration has not been run yet
  if (!row) return { error: no(404, "not found") } as const;
  const c = mapCase(row);
  const gate = await canProSeeMother(admin, user.id, c.motherId);
  if (!gate.matched || visibleCases([c], gate.shares).length === 0) return { error: no(404, "not found") } as const; // a case she is not sharing looks like it does not exist
  return { user, admin, c, gate } as const;
}

const noteOf = (enc: string | null) => { if (!enc) return null; try { return decrypt(enc); } catch { return null; } };

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const r = await load(params.id);
  if ("error" in r) return r.error;
  const { user, admin, c, gate } = r;
  const now = Date.now();

  const [g, { data: evs }, { data: seen }, { data: mother }, { data: owner }, cs, { data: cfg }, { data: auditRows }, { data: profs }, { data: onCall }] = await Promise.all([
    gather(admin, c.id),
    admin.from("case_events").select("*").eq("case_id", c.id).order("at").limit(400),
    admin.from("case_views").select("last_seen_at").eq("case_id", c.id).eq("pro_id", user.id).maybeSingle(),
    admin.from("mothers").select("birth_date, phone, delivery, profiles!mothers_id_fkey(full_name)").eq("id", c.motherId).maybeSingle(),
    c.ownerProId ? admin.from("profiles").select("full_name").eq("id", c.ownerProId).maybeSingle() : Promise.resolve({ data: null }),
    consentOf(admin, c.motherId),
    admin.from("clinical_config").select("value").eq("key", "playbook").maybeSingle(),
    admin.from("audit_log").select("id, at, actor_name, action, consent_snapshot, seq").eq("case_id", c.id).order("seq", { ascending: false }).limit(60),
    admin.from("profiles").select("id, full_name").in("role", ["pro", "admin"]),
    admin.from("pros").select("id").eq("is_on_call", true).eq("on_duty", true),
  ]);
  const signals = filterForPro((g?.signals ?? []), gate.shares);
  const pname = new Map((profs ?? []).map((p: any) => [p.id as string, p.full_name as string]));

  // her last two weeks of check-ins, for the BP chart and the sleep change. Only while she shares them.
  let checkins: { date: string; sleepHours: number; mood: number; bp?: { sys: number; dia: number } }[] = [];
  if (gate.shares) {
    const since = new Date(now - 14 * 86400000).toISOString().slice(0, 10);
    const { data } = await admin.from("checkins").select("*").eq("mother_id", c.motherId).gte("day", since).order("day");
    checkins = (data ?? []).map(mapCheckin).map((x) => ({ date: x.date, sleepHours: x.sleepHours, mood: x.mood, bp: x.bp }));
  }

  const events: CaseEvent[] = (evs ?? []).map((e: any) => ({ id: e.id, caseId: e.case_id, at: e.at, type: e.type, actorRole: e.actor_role, actorId: e.actor_id, detail: { ...(e.detail ?? {}), ...(e.actor_id && pname.get(e.actor_id) ? { actorName: pname.get(e.actor_id) } : {}) } }));
  const why = g ? explain(g, now) : null;
  const priority = ((c.priority as Priority | null) ?? why?.priority ?? "P4") as Priority;

  // the family panel: each person with her switch, and what may be done right now (worked out here, from her consent as it is this second)
  const safety = c.concern === "SELF_HARM" || (g?.signals ?? []).some((s) => s.concern === "SELF_HARM");
  const family = await Promise.all(cs.members.map(async (m) => {
    const req = await requestOf(admin, c.id, m.id);
    const fm = m as FamilyMember;
    const send = canSend(cs.emergency, fm, req), ask = canAsk(fm, safety, req);
    return { id: m.id, name: m.name, relation: m.relation, alerts: m.alerts, joined: !!m.userId, request: req ? { status: req.status, usedAt: req.usedAt } : null, canSend: send, canAsk: ask };
  }));

  const birth = (mother as any)?.birth_date as string | undefined;
  return NextResponse.json({
    me: user.id,
    case: c,
    ownerName: (owner as any)?.full_name ?? "",
    patient: {
      id: c.motherId, name: (mother as any)?.profiles?.full_name ?? "", shares: gate.shares, phone: gate.shares || c.severityPeak === "red" ? (mother as any)?.phone ?? null : null,
      day: birth ? Math.max(0, Math.floor((now - new Date(birth).getTime()) / 86400000)) : 0, delivery: gate.shares ? (mother as any)?.delivery ?? "" : "",
    },
    priority: { value: priority, reasons: why?.reasons ?? [], dueBy: c.dueBy, since: c.prioritySince, acknowledgedAt: c.acknowledgedAt, escalationLevel: c.escalationLevel },
    recommended: withOverrides(c.concern, priority, (cfg as any)?.value),
    ladder: { next: nextStepIn({ priority, status: c.status, acknowledgedAt: c.acknowledgedAt, prioritySince: c.prioritySince }, now), onCall: (onCall ?? []).map((x: any) => pname.get(x.id) ?? "").filter((n: string) => n && n !== ((owner as any)?.full_name ?? "")) },
    family, emergencyConsent: cs.emergency, safetyCase: safety,
    actions: (g?.actions ?? []).map((a) => ({ id: a.id, type: a.type, outcome: a.outcome, at: a.at, by: a.actorId ? pname.get(a.actorId) ?? "" : "", detail: a.detail, note: noteOf(a.noteEnc) })),
    audit: (auditRows ?? []).map((a: any) => ({ id: a.id, at: a.at, who: a.actor_name, what: a.action, consent: a.consent_snapshot ?? null })),
    signals, checkins, events, lastViewedAt: (seen as any)?.last_seen_at ?? null,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await load(params.id);
  if ("error" in r) return r.error;
  const { user, admin, c } = r;
  if (limited(`case:${user.id}`, 90)) return no(429, "slow down");
  const b = await req.json().catch(() => ({}));
  const { data: me } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const actor = { id: user.id, role: "pro", name: me?.full_name ?? "" };
  const seal = (s: string) => encrypt(s);
  const fail = (e: unknown) => (e instanceof WorkflowError ? no(409, e.code) : no(500, "could not save"));

  try {
    if (b.action === "view") {
      await admin.from("case_views").upsert({ case_id: c.id, pro_id: user.id, last_seen_at: new Date().toISOString() });
      await admin.from("audit_log").insert({ actor_id: user.id, actor_name: actor.name, mother_id: c.motherId, case_id: c.id, action: "Opened a case about her recovery" });
      return NextResponse.json({ ok: true });
    }
    if (b.action === "acknowledge") { await recordAction(admin, { caseId: c.id, actor, type: "acknowledge" }); return NextResponse.json({ ok: true }); }
    if (b.action === "takeover") { await recordAction(admin, { caseId: c.id, actor, type: "take_over" }); return NextResponse.json({ ok: true }); }
    if (b.action === "resolve") { await recordAction(admin, { caseId: c.id, actor, type: "resolve", outcome: "resolved_seen" }); return NextResponse.json({ ok: true }); }

    if (b.action === "act") {
      const type = String(b.type) as ActionType;
      if (!["call", "book_session", "refer", "monitor", "resolve"].includes(type)) return no(400, "invalid");
      const detail: Record<string, unknown> = {};
      if (type === "monitor") { if (!MONITOR_REASONS.includes(b.reason)) return no(400, "a reason is needed"); detail.reason = b.reason; }
      await recordAction(admin, { caseId: c.id, actor, type, outcome: (b.outcome ?? (type === "book_session" ? "session_booked" : type === "refer" ? "referred" : type === "monitor" ? "monitoring" : type === "resolve" ? "resolved_seen" : null)) as Outcome | null, detail, note: typeof b.note === "string" ? b.note : null, seal });
      return NextResponse.json({ ok: true });
    }
    if (b.action === "family") {
      await sendFamilyMessage(admin, { caseId: c.id, actor, memberId: String(b.memberId), template: String(b.template ?? "please_call") as TemplateId, notify: (id, n) => notify(admin, id, n) });
      return NextResponse.json({ ok: true });
    }
    if (b.action === "ask") {
      await askMother(admin, { caseId: c.id, actor, memberId: String(b.memberId), notify: (id, n) => notify(admin, id, n) });
      return NextResponse.json({ ok: true });
    }
  } catch (e) { return fail(e); }
  return no(400, "invalid");
}
