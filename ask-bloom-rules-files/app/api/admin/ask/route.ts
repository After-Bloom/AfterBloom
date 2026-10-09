import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";

// Admin view of Ask Bloom: anonymous counts for the last 30 days, and shared unanswered questions to turn into new answers.
// POST {id, status} marks a gap as planned, done or ignored.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const admin = adminClient();
  const [{ data: stats }, { data: gaps }] = await Promise.all([
    admin.from("ask_stats").select("topic, outcome, n").gte("day", since),
    admin.from("ask_gaps").select("id, question, lang, near_topic, day, status").gte("day", since).neq("status", "ignored").order("day", { ascending: false }).limit(200),
  ]);
  const total = (stats ?? []).reduce((a, r) => a + r.n, 0);
  const sum = (o: string) => (stats ?? []).filter((r) => r.outcome === o).reduce((a, r) => a + r.n, 0);
  const byTopic = new Map<string, number>();
  (stats ?? []).filter((r) => r.topic !== "-").forEach((r) => byTopic.set(r.topic, (byTopic.get(r.topic) ?? 0) + r.n));
  return NextResponse.json({
    total, answered: sum("answer") + sum("picked") + sum("multi"), noAnswer: sum("none"), toHuman: sum("human"),
    topTopics: [...byTopic].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([topic, n]) => ({ topic, n })),
    gaps: gaps ?? [],
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const b = await req.json().catch(() => null);
  if (!Number.isInteger(b?.id) || !["new", "planned", "done", "ignored"].includes(b?.status)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await adminClient().from("ask_gaps").update({ status: b.status }).eq("id", b.id);
  return NextResponse.json({ ok: true });
}
