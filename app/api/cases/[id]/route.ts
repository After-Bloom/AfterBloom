import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { canProSeeMother, filterForPro } from "@/lib/server/access";
import { limited } from "@/lib/server/limit";
import { mapSignal } from "@/lib/server/signals";
import { mapCase, resolveCase } from "@/lib/cases/attach";
import { visibleCases } from "@/lib/signals/access";
import { mapCheckin } from "@/lib/data/load";
import type { CaseEvent } from "@/lib/types/cases";

// One case for a professional: the case, its alerts (filtered by what she shares), her recent check-ins (only if she shares), what happened to it,
// and when this professional last looked. GET only reads. POST {action:"view"} records that they looked; POST {action:"resolve"} closes it.
// Only a professional matched with her can do either, and only a professional can resolve a case.
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

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const r = await load(params.id);
  if ("error" in r) return r.error;
  const { user, admin, c, gate } = r;

  const [{ data: sigs }, { data: evs }, { data: seen }, { data: mother }, { data: owner }] = await Promise.all([
    admin.from("signals").select("*").eq("case_id", c.id).order("observed_at").limit(500),
    admin.from("case_events").select("*").eq("case_id", c.id).order("at").limit(300),
    admin.from("case_views").select("last_seen_at").eq("case_id", c.id).eq("pro_id", user.id).maybeSingle(),
    admin.from("mothers").select("birth_date, phone, delivery, risk, profiles!mothers_id_fkey(full_name)").eq("id", c.motherId).maybeSingle(),
    c.ownerProId ? admin.from("profiles").select("full_name").eq("id", c.ownerProId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const signals = filterForPro((sigs ?? []).map(mapSignal), gate.shares);

  // her last two weeks of check-ins, for the BP chart and the sleep change. Only while she shares them.
  let checkins: { date: string; sleepHours: number; mood: number; bp?: { sys: number; dia: number } }[] = [];
  if (gate.shares) {
    const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    const { data } = await admin.from("checkins").select("*").eq("mother_id", c.motherId).gte("day", since).order("day");
    checkins = (data ?? []).map(mapCheckin).map((x) => ({ date: x.date, sleepHours: x.sleepHours, mood: x.mood, bp: x.bp }));
  }

  const events: CaseEvent[] = (evs ?? []).map((e: any) => ({ id: e.id, caseId: e.case_id, at: e.at, type: e.type, actorRole: e.actor_role, actorId: e.actor_id, detail: e.detail ?? {} }));
  const birth = (mother as any)?.birth_date as string | undefined;
  return NextResponse.json({
    me: user.id,
    case: c,
    ownerName: (owner as any)?.full_name ?? "",
    patient: {
      id: c.motherId, name: (mother as any)?.profiles?.full_name ?? "", shares: gate.shares, phone: gate.shares || c.severityPeak === "red" ? (mother as any)?.phone ?? null : null,
      day: birth ? Math.max(0, Math.floor((Date.now() - new Date(birth).getTime()) / 86400000)) : 0, delivery: gate.shares ? (mother as any)?.delivery ?? "" : "",
    },
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

  if (b.action === "view") {
    await admin.from("case_views").upsert({ case_id: c.id, pro_id: user.id, last_seen_at: new Date().toISOString() });
    await admin.from("audit_log").insert({ actor_id: user.id, actor_name: me?.full_name ?? "", mother_id: c.motherId, action: "Opened a case about her recovery" });
    return NextResponse.json({ ok: true });
  }
  if (b.action === "resolve") {
    if (c.status === "resolved") return NextResponse.json({ ok: true, case: c });
    const done = await resolveCase(admin, c.id, { role: "pro", id: user.id });
    if (!done) return no(409, "already closed");
    await admin.from("audit_log").insert({ actor_id: user.id, actor_name: me?.full_name ?? "", mother_id: c.motherId, action: "Marked a case as resolved" });
    return NextResponse.json({ ok: true, case: done });
  }
  return no(400, "invalid");
}
