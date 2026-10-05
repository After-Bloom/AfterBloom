import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { limited } from "@/lib/server/limit";
import { answerLoop, startLoop } from "@/lib/server/loops";
import type { LoopAnswer } from "@/lib/careLoop";

// The care loop for the signed-in mother: GET her open follow-up, POST {action:"start"} after a RED/AMBER result, POST {action:"answer"} to reply.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANSWERS: LoopAnswer[] = ["got_care", "better", "going", "cant_reach", "worse"];
const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "mother") return no(401, "not signed in");
  const { data } = await adminClient().from("care_loops").select("id, level, reason, status, check_at, created_at").eq("mother_id", user.id).eq("status", "open").order("created_at", { ascending: false }).limit(1);
  return NextResponse.json({ loop: data?.[0] ?? null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "mother") return no(401, "not signed in");
  if (limited(`loop:${user.id}`, 20)) return no(429, "slow down");
  const b = await req.json().catch(() => ({}));
  const admin = adminClient();

  if (b.action === "start") {
    if (b.level !== "RED" && b.level !== "AMBER") return no(400, "level");
    const reason = String(b.reason ?? "").slice(0, 300);
    const loop = await startLoop(admin, user.id, b.level, reason);
    return NextResponse.json({ loop });
  }
  if (b.action === "answer") {
    if (typeof b.id !== "string" || !ANSWERS.includes(b.answer)) return no(400, "answer");
    const loop = await answerLoop(admin, user.id, b.id, b.answer);
    return loop ? NextResponse.json({ loop }) : no(404, "not open");
  }
  return no(400, "action");
}
