import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { demoCaller } from "@/lib/server/demo";
import { resetDemo } from "@/lib/server/demoStory";

// DEMO ONLY. Wipes and reseeds the demo mothers' alerts, cases, actions and requests in one call, so the next judge sees the story from the start.
// Audit records are never deleted: they are append-only.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  if (!(await demoCaller())) return NextResponse.json({ error: "not allowed" }, { status: 404 });
  const r = await resetDemo(adminClient());
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.reason }, { status: 400 });
}
