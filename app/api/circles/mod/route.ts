import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { notify } from "@/lib/server/notify";

// Moderator actions on the flagged-message queue. A human always decides; nothing is automatic.
//   hide      - take the post out of the circle
//   reach_out - send the writer a gentle, neutral message with support options (the moderator never sees a name, only the queue)
//   dismiss   - the message was fine
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !["moderator", "admin"].includes(user.role)) return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const { action, queueId } = (await req.json().catch(() => ({}))) as { action?: string; queueId?: string };
  if (!queueId || !["hide", "reach_out", "dismiss"].includes(action ?? "")) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const admin = adminClient();
  const { data: item } = await admin.from("mod_queue").select("id, post_id").eq("id", queueId).maybeSingle();
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (action === "hide") await admin.from("posts").update({ hidden: true }).eq("id", item.post_id);
  if (action === "reach_out") {
    const { data: a } = await admin.from("post_authors").select("author_id").eq("post_id", item.post_id).maybeSingle();
    if (a) await notify(admin, a.author_id, { kind: "support", title: "A Bloom Buddy is thinking of you", body: "You are not alone. Free help is always on: Tele-MANAS 14416.", url: "/crisis" });
  }
  await admin.from("mod_queue").update({ done: true, handled_by: user.id }).eq("id", queueId);
  return NextResponse.json({ ok: true });
}
