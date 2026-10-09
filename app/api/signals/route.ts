import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { canProSeeMother, filterForPro } from "@/lib/server/access";
import { loadContext, ownerOf } from "@/lib/server/routing";
import { mapSignal } from "@/lib/server/signals";
import type { PatientSignals } from "@/lib/types/cases";

// The professional's view of related alerts: for each of their patients, her signals from the last 14 days (filtered by what she shares)
// and, for each concern she has, who owns it (continuity of care). Read-only; the page polls this every few seconds.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "pro") return no(403, "not allowed");
  const admin = adminClient();

  const { data: links, error } = await admin.from("pro_patients").select("mother_id, mothers(birth_date, consent_share_pro, profiles!mothers_id_fkey(full_name))").eq("pro_id", user.id);
  if (error) return no(500, "could not load");
  const ids = (links ?? []).map((l: any) => l.mother_id as string);
  if (!ids.length) return NextResponse.json({ me: user.id, patients: [] as PatientSignals[] }, { headers: { "Cache-Control": "no-store" } });

  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data: rows, error: se } = await admin.from("signals").select("*").in("mother_id", ids).gte("observed_at", since).order("observed_at").limit(1500);
  if (se) return no(503, "signals-not-ready"); // the 007 migration has not been run yet
  const ctx = await loadContext(admin, ids);

  const patients: PatientSignals[] = [];
  for (const l of links as any[]) {
    const gate = await canProSeeMother(admin, user.id, l.mother_id);
    if (!gate.matched) continue;
    const mine = (rows ?? []).filter((r: any) => r.mother_id === l.mother_id).map(mapSignal);
    const signals = filterForPro(mine, gate.shares);
    const owners: PatientSignals["owners"] = {};
    for (const c of new Set(signals.map((s) => s.concern))) owners[c] = ownerOf(ctx, l.mother_id, c);
    const birth = l.mothers?.birth_date as string | undefined;
    patients.push({
      id: l.mother_id, name: l.mothers?.profiles?.full_name ?? "", shares: gate.shares, signals, owners,
      day: birth ? Math.max(0, Math.floor((Date.now() - new Date(birth).getTime()) / 86400000)) : 0,
    });
  }
  return NextResponse.json({ me: user.id, patients }, { headers: { "Cache-Control": "no-store" } });
}
