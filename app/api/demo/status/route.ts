import { NextResponse } from "next/server";
import { demoCaller } from "@/lib/server/demo";

// Tells the screens whether to show the demo controls (Replay storm, Run checks now, Reset demo).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ allowed: !!(await demoCaller()) }, { headers: { "Cache-Control": "no-store" } });
}
