import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { limited } from "@/lib/server/limit";
import { hasSelfHarmLanguage } from "@/lib/safety";
import { scrub } from "@/lib/ask/scrub";
import { TOPICS } from "@/lib/ask/knowledge";

// "Help improve Ask Bloom": an unanswered question she CHOSE to share. Saved with no user id and only the day,
// after removing numbers, emails and links. The admin page lists these so a clinician can write new answers.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (limited(`askgap:${user.id}`, 10, 3600000)) return NextResponse.json({ ok: true }); // quietly ignore floods
  const b = await req.json().catch(() => null);
  const question = scrub(String(b?.text ?? ""));
  if (question.length < 3 || hasSelfHarmLanguage(question)) return NextResponse.json({ ok: true }); // crisis words are never stored here
  const near = TOPICS.some((t) => t.id === b?.nearTopic) ? String(b.nearTopic) : null;
  await adminClient().from("ask_gaps").insert({ question, lang: b?.lang === "hi" ? "hi" : "en", near_topic: near }); // no user id on purpose
  return NextResponse.json({ ok: true });
}
