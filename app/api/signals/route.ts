import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { canProSeeMother, filterForPro } from "@/lib/server/access";
import { loadContext, ownerOf } from "@/lib/server/routing";
import { mapSignal, ownerFn } from "@/lib/server/signals";
import { backfillCases, mapCase } from "@/lib/cases/attach";
import { runChecks } from "@/lib/workflow/engine";
import { notify } from "@/lib/server/notify";
import { visibleCases } from "@/lib/signals/access";
import { blurReasons, blurSensitive } from "@/lib/signals/blur";
import type { PatientSignals } from "@/lib/types/cases";

// The professional's view of related alerts: for each of their patients, her signals from the last 14 days (filtered by what she shares)
// and, for each concern she has, who owns it (continuity of care). Read-only; the page polls this every few seconds.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let lastChecks = 0;   // the clock runs whenever the queue loads, but not more often than every 15 seconds
const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "pro") return no(403, "not allowed");
  const admin = adminClient();

  const { data: links, error } = await admin.from("pro_patients").select("mother_id, mothers(birth_date, consent_share_pro, profiles!mothers_id_fkey(full_name))").eq("pro_id", user.id);
  if (error) return no(500, "could not load");
  const ids = (links ?? []).map((l: any) => l.mother_id as string);
  if (!ids.length) return NextResponse.json({ me: user.id, patients: [] as PatientSignals[] }, { headers: { "Cache-Control": "no-store" } });

  // alerts saved before cases existed get their case now (oldest first, safe to repeat). If migration 008 has not been run this quietly does nothing.
  // Priorities and the escalation ladder are worked out from the clock right here too, so no scheduler is needed. Safe to run twice.
  const dueForChecks = Date.now() - lastChecks > 15000;
  if (dueForChecks) lastChecks = Date.now();
  await Promise.all([
    backfillCases(admin, ids, ownerFn(admin)).catch(() => 0),
    dueForChecks ? runChecks(admin, { notify: (id, n) => notify(admin, id, n) }).catch(() => null) : null,
  ]);

  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  // the three independent reads happen together
  const [sigRes, caseRes, ctx] = await Promise.all([
    admin.from("signals").select("*").in("mother_id", ids).gte("observed_at", since).order("observed_at").limit(1500),
    admin.from("cases").select("*").in("mother_id", ids).order("last_signal_at", { ascending: false }).limit(500),
    loadContext(admin, ids),
  ]);
  if (sigRes.error) return no(503, "signals-not-ready"); // the 007 migration has not been run yet
  const rows = sigRes.data;
  const caseRows = (caseRes.data ?? []).filter((c: any) => c.status !== "resolved" || (c.resolved_at ?? "") >= since); // open ones, and ones resolved in the last 30 days

  // each patient is checked at the same time instead of one after another
  const built = await Promise.all((links as any[]).map(async (l) => {
    const gate = await canProSeeMother(admin, user.id, l.mother_id);
    if (!gate.matched) return null;
    const mine = (rows ?? []).filter((r: any) => r.mother_id === l.mother_id).map(mapSignal);
    const signals = blurSensitive(filterForPro(mine, gate.shares));
    const cases = visibleCases((caseRows ?? []).filter((c: any) => c.mother_id === l.mother_id).map(mapCase), gate.shares).map((c) => ({ ...c, priorityReasons: blurReasons(c.priorityReasons) }));
    const owners: PatientSignals["owners"] = {};
    for (const c of new Set(signals.map((s) => s.concern))) owners[c] = ownerOf(ctx, l.mother_id, c);
    const birth = l.mothers?.birth_date as string | undefined;
    return {
      id: l.mother_id, name: l.mothers?.profiles?.full_name ?? "", shares: gate.shares, signals, cases, owners,
      day: birth ? Math.max(0, Math.floor((Date.now() - new Date(birth).getTime()) / 86400000)) : 0,
    } as PatientSignals;
  }));
  const patients = built.filter((p): p is PatientSignals => !!p);
  return NextResponse.json({ me: user.id, patients }, { headers: { "Cache-Control": "no-store" } });
}
