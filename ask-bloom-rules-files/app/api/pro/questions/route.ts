import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/server/crypto";
import { notify } from "@/lib/server/notify";
import { limited } from "@/lib/server/limit";

// The professional's Ask Bloom questions: GET lists questions from matched patients, POST {id, reply} answers one.
// Reading or answering is written to audit_log, so the mother sees it in "Who looked at my record".
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
const open = (b64: string | null) => { if (!b64) return null; try { return decrypt(b64); } catch { return null; } };

async function myPatients(proId: string) {
  const { data } = await adminClient().from("pro_patients").select("mother_id").eq("pro_id", proId);
  return (data ?? []).map((r) => r.mother_id as string);
}

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "pro") return no(403, "not allowed");
  const ids = await myPatients(user.id);
  if (!ids.length) return NextResponse.json({ items: [] });
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const admin = adminClient();
  const { data } = await admin.from("ask_questions").select("id, mother_id, question_enc, reply_enc, status, near_topic, created_at, replied_at, mothers(profiles!mothers_id_fkey(full_name))")
    .in("mother_id", ids).or(`status.eq.open,created_at.gte.${since}`).order("created_at", { ascending: true }).limit(100);
  const items = (data ?? []).map((q: any) => ({
    id: q.id, motherId: q.mother_id, name: q.mothers?.profiles?.full_name ?? "", question: open(q.question_enc), reply: open(q.reply_enc),
    status: q.status, nearTopic: q.near_topic, createdAt: q.created_at, repliedAt: q.replied_at,
  }));
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "pro") return no(403, "not allowed");
  if (limited(`proreply:${user.id}`, 60)) return no(429, "slow down");
  const b = await req.json().catch(() => null);
  const reply = String(b?.reply ?? "").trim().slice(0, 1000);
  if (typeof b?.id !== "string" || reply.length < 2) return no(400, "reply");
  const admin = adminClient();
  const { data: q } = await admin.from("ask_questions").select("id, mother_id, status").eq("id", b.id).maybeSingle();
  if (!q || !(await myPatients(user.id)).includes(q.mother_id)) return no(404, "not found");
  const now = new Date().toISOString();
  const { error } = await admin.from("ask_questions").update({ reply_enc: encrypt(reply), status: "answered", replied_by: user.id, replied_at: now }).eq("id", q.id);
  if (error) return no(500, "could not save");
  await admin.from("audit_log").insert({ actor_id: user.id, actor_name: user.name, mother_id: q.mother_id, action: "Answered your question in Ask Bloom" });
  await notify(admin, q.mother_id, { mother_id: q.mother_id, kind: "info", title: "AfterBloom", body: "You have a new message.", url: "/ask" }); // neutral: safe on a shared phone
  return NextResponse.json({ ok: true, repliedAt: now });
}
