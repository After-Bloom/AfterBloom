import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { limited } from "@/lib/server/limit";
import { syncOrigin } from "@/lib/server/signals";

// The browser has just saved a symptom log or a check-in. The server reads that row back and records its signals.
// It trusts nothing the browser says about severity: it works the signals out from the saved row. Safe to call twice.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "mother") return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (limited(`signals:${user.id}`, 40)) return NextResponse.json({ error: "slow down" }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  if ((b.table !== "symptom_logs" && b.table !== "checkins") || typeof b.id !== "string") return NextResponse.json({ error: "invalid" }, { status: 400 });
  const recorded = await syncOrigin(adminClient(), user.id, b.table, b.id);
  return NextResponse.json({ ok: true, recorded: recorded.filter((r) => r.signal).length });
}
