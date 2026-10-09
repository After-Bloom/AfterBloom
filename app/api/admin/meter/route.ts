import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { WINDOW_MINUTES, type Priority } from "@/lib/workflow/priority";

// The alert-load meter for the admin: how many alerts became how many cases, how many notifications were sent and how many held back,
// how long the first action took, and how many cases were handled in time. Counted from the real tables, not typed in.
// Labelled "Demo data" while the demo accounts are on.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const admin = adminClient();
  const [{ data: sigs, error: se }, { data: cases }, { data: acts }, { data: evs }] = await Promise.all([
    admin.from("signals").select("notified").limit(20000),
    admin.from("cases").select("id, opened_at, priority, status, escalation_level, acknowledged_at").limit(5000),
    admin.from("case_actions").select("case_id, created_at").order("created_at").limit(20000),
    admin.from("case_events").select("case_id, detail, at").eq("type", "priority_changed").order("at").limit(20000),
  ]);
  if (se) return NextResponse.json({ error: "signals-not-ready" }, { status: 503 });

  const alerts = sigs?.length ?? 0, sent = (sigs ?? []).filter((s: any) => s.notified).length;
  const firstAction = new Map<string, number>();
  for (const a of acts ?? []) if (!firstAction.has(a.case_id)) firstAction.set(a.case_id, new Date(a.created_at).getTime());
  const firstPriority = new Map<string, Priority>();
  for (const e of evs ?? []) if (!firstPriority.has(e.case_id) && e.detail?.to) firstPriority.set(e.case_id, e.detail.to as Priority);

  const minutes: number[] = []; let inTime = 0, withAction = 0;
  for (const c of cases ?? []) {
    const t = firstAction.get(c.id);
    if (t === undefined) continue;
    withAction++;
    const took = (t - new Date(c.opened_at).getTime()) / 60000;
    minutes.push(Math.max(0, took));
    const window = WINDOW_MINUTES[firstPriority.get(c.id) ?? ((c.priority as Priority) ?? "P3")];
    if (window === null || took <= window) inTime++;
  }
  return NextResponse.json({
    alerts, cases: cases?.length ?? 0, sent, heldBack: alerts - sent,
    medianMinutes: median(minutes) === null ? null : Math.round(median(minutes)!), inTime, withAction,
    atDesk: (cases ?? []).filter((c: any) => c.status !== "resolved" && c.escalation_level >= 3 && !c.acknowledged_at).length,   // Immediate cases nobody has picked up for 30 minutes
    demo: process.env.ENABLE_DEMO !== "false",
  }, { headers: { "Cache-Control": "no-store" } });
}
