import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { demoCaller } from "@/lib/server/demo";
import { stormStep } from "@/lib/server/demoStory";

// DEMO ONLY. The browser asks for one step every 1.5 seconds; each step records one alert for Priya through the real recordSignal(),
// so the cases and priorities you see are produced by the real rules, not drawn. Step 0 clears her alerts first. "Reset demo" puts the story back.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!(await demoCaller())) return NextResponse.json({ error: "not allowed" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const step = Number.isInteger(b.step) ? b.step : 0;
  const r = await stormStep(adminClient(), step);
  return r.ok ? NextResponse.json(r, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ error: r.reason }, { status: 400 });
}
