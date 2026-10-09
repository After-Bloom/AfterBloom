import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/server/crypto";
import { notify, prosOf } from "@/lib/server/notify";
import { limited } from "@/lib/server/limit";
import { hasSelfHarmLanguage } from "@/lib/safety";
import { TOPICS } from "@/lib/ask/knowledge";

// "Ask a human": a question she CHOSE to send to her care team, because Ask Bloom had no reviewed answer.
// The only place in Ask Bloom where her words are saved, and only after she taps "Send to my care team".
// Stored encrypted (same key as EPDS answers). The push notification never contains the question.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
const open = (b64: string | null) => { if (!b64) return null; try { return decrypt(b64); } catch { return null; } };

/** Her own questions and replies, newest first. */
export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "mother") return no(401, "not signed in");
  const { data } = await adminClient().from("ask_questions").select("id, question_enc, reply_enc, status, created_at, replied_at")
    .eq("mother_id", user.id).order("created_at", { ascending: false }).limit(20);
  const items = (data ?? []).map((q) => ({ id: q.id, question: open(q.question_enc), reply: open(q.reply_enc), status: q.status, createdAt: q.created_at, repliedAt: q.replied_at }));
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

/** Send a question to her professional. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "mother") return no(401, "not signed in");
  if (limited(`askhuman:${user.id}`, 5, 3600000)) return no(429, "You have sent several questions this hour. Your care team will reply soon.");
  const b = await req.json().catch(() => null);
  const text = String(b?.text ?? "").trim().slice(0, 300);
  if (text.length < 3) return no(400, "empty");
  if (hasSelfHarmLanguage(text)) return NextResponse.json({ crisis: true }, { status: 409 }); // never park a crisis in a queue
  const lang = b?.lang === "hi" ? "hi" : "en";
  const near = TOPICS.some((t) => t.id === b?.nearTopic) ? String(b.nearTopic) : null;

  const admin = adminClient();
  const [pro] = await prosOf(admin, user.id); // makes sure she has a professional
  const { data, error } = await admin.from("ask_questions").insert({ mother_id: user.id, pro_id: pro ?? null, question_enc: encrypt(text), lang, near_topic: near }).select("id, created_at").single();
  if (error || !data) return no(500, "could not send");
  if (pro) await notify(admin, pro, { mother_id: user.id, kind: "callback", title: "New question in Ask Bloom", body: `${user.name || "A patient"} asked a question. Please reply within 24 hours.`, url: "/pro" });
  await admin.rpc("bump_ask_stat", { p_topic: near ?? "-", p_outcome: "human" });
  return NextResponse.json({ id: data.id, createdAt: data.created_at });
}
