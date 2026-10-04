import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";

// Pinged by the scheduled keep-alive so the free Supabase project never pauses for inactivity.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { error, count } = await adminClient().from("hospitals").select("id", { count: "exact", head: true });
  return NextResponse.json({ ok: !error, db: error ? "down" : "up", hospitals: count ?? 0, at: new Date().toISOString() }, { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
