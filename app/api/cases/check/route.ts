import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { demoCaller } from "@/lib/server/demo";
import { notify } from "@/lib/server/notify";
import { runChecks } from "@/lib/workflow/engine";

// "Run checks now": works out every open case's priority and moves unacknowledged Immediate cases up the escalation ladder
// (assigned doctor, then the on-call backup at 15 minutes, then the admin desk at 30). Needs no scheduler and is safe to run twice.
// `plusMinutes` pretends time has passed so a judge can see the ladder without waiting. That is demo-only.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || (user.role !== "pro" && user.role !== "admin")) return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const plus = Math.max(0, Math.min(240, Number(b.plusMinutes) || 0));
  if (plus > 0 && !(await demoCaller())) return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const r = await runChecks(adminClient(), { notify: (id, n) => notify(adminClient(), id, n), now: Date.now() + plus * 60000 });
  return NextResponse.json({ ok: true, ...r }, { headers: { "Cache-Control": "no-store" } });
}
