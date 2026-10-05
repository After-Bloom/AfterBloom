import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { escalateOverdue } from "@/lib/server/loops";

// Tells her professional (and family, if she agreed) about follow-ups she never answered. Also runs inside /api/cron/daily.
// For faster follow-up than once a day, call this every 15 to 30 minutes from any scheduler with "Authorization: Bearer $CRON_SECRET".
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "not allowed" }, { status: 401 });
  return NextResponse.json({ ok: true, escalated: await escalateOverdue(adminClient()) });
}
