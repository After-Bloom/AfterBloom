import { NextResponse } from "next/server";
import { userClient } from "@/lib/supabase/server";
import { DEMO, DemoKey, HOME_BY_ROLE } from "@/lib/demo";
import { ipOf, limited } from "@/lib/server/limit";

// "Try the demo": signs in as a seeded demo account on the server, so the demo password never reaches the browser.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (process.env.ENABLE_DEMO === "false") return NextResponse.json({ error: "Demo accounts are switched off." }, { status: 404 });
  if (limited(`demo:${ipOf(req)}`, 20)) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  const { who } = (await req.json().catch(() => ({}))) as { who?: DemoKey };
  const acct = who && DEMO[who];
  if (!acct) return NextResponse.json({ error: "Unknown demo account" }, { status: 400 });
  const sb = userClient();
  const { error } = await sb.auth.signInWithPassword({ email: acct.email, password: process.env.DEMO_PASSWORD! });
  if (error) return NextResponse.json({ error: "Demo accounts are not set up yet. Run the seed step first." }, { status: 503 });
  return NextResponse.json({ ok: true, home: HOME_BY_ROLE[acct.role] });
}
