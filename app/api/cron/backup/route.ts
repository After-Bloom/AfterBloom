import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";

// Free Supabase projects have no automatic backups. The weekly GitHub Action downloads this export and ENCRYPTS it before storing it.
// Screening answers stay encrypted inside the export (they are encrypted with ENCRYPTION_KEY, which is never in the export).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TABLES = ["hospitals", "circles", "profiles", "mothers", "pros", "pro_patients", "asha_assignments", "family_members", "checkins", "symptom_logs", "epds_results", "flags", "alerts", "bookings", "audit_log",
  "baby_vaccines", "baby_growth", "baby_milestones", "benefit_steps", "night_shifts", "partner_screens", "circle_members", "posts", "post_authors", "mod_queue", "circle_events", "asha_visits", "weekly_reports", "clinical_config", "consent_log"];

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "not allowed" }, { status: 401 });
  const admin = adminClient();
  const dump: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from(t).select("*").range(from, from + 999);
      if (error) return NextResponse.json({ error: `${t}: ${error.message}` }, { status: 500 });
      rows.push(...(data ?? []));
      if ((data?.length ?? 0) < 1000) break;
    }
    dump[t] = rows;
  }
  return new NextResponse(JSON.stringify({ takenAt: new Date().toISOString(), tables: dump }), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
