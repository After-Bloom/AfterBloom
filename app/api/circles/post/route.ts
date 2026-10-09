import { NextResponse } from "next/server";
import { adminClient, currentUser, userClient } from "@/lib/supabase/server";
import { ADVICE_NOTE, TOPICS, hasSelfHarmLanguage, looksLikeMedicalAdvice } from "@/lib/safety";
import { notify } from "@/lib/server/notify";
import { limited } from "@/lib/server/limit";
import { recordSignal } from "@/lib/server/signals";
import { deriveCirclePost } from "@/lib/signals/derive";

// Posting to a Bloom Circle. Every message is checked on the server:
//  - self-harm or crisis language -> queued for a human moderator (the software never replies on its own); the writer sees the crisis screen
//  - looks like medical advice -> a fixed note is attached
// Who wrote a post is recorded separately and only moderators can see it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "mother") return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (limited(`post:${user.id}`, 12)) return NextResponse.json({ error: "You are posting very fast. Take a breath and try again in a minute." }, { status: 429 });
  const b = await req.json().catch(() => null);
  const text = String(b?.text ?? "").trim().slice(0, 1000);
  if (!text) return NextResponse.json({ error: "Write something first." }, { status: 400 });
  const topic = (TOPICS as readonly string[]).includes(b?.topic) ? b.topic : "General";
  const anon = !!b?.anon;

  const sb = userClient();
  const { data: mother } = await sb.from("mothers").select("circle_id").eq("id", user.id).maybeSingle();
  if (!mother?.circle_id) return NextResponse.json({ error: "Join a circle first." }, { status: 400 });

  const flagged = hasSelfHarmLanguage(text);
  const note = looksLikeMedicalAdvice(text) ? ADVICE_NOTE : null;
  const { data: post, error } = await sb.rpc("create_post", { p_circle: mother.circle_id, p_text: text, p_topic: topic, p_anon: anon, p_note: note });
  if (error || !post) return NextResponse.json({ error: "Could not post. Please try again." }, { status: 500 });

  if (flagged) {
    const admin = adminClient();
    await admin.from("mod_queue").insert({ post_id: post.id, circle_id: mother.circle_id, reason: "Self-harm or crisis language" });
    await recordSignal(admin, deriveCirclePost(user.id, post.id, new Date().toISOString())); // a safety signal on her record (only the code, never her words)
    const { data: staff } = await admin.from("profiles").select("id").in("role", ["moderator", "admin"]);
    await Promise.all((staff ?? []).map((s) => notify(admin, s.id, { kind: "support", title: "Circle moderation", body: "A message needs a human look.", url: "/moderate" })));
  }
  return NextResponse.json({ post, flagged, note });
}
