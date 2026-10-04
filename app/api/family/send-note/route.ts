import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { sendFamilyNote } from "@/lib/server/notify";

// Sends the weekly "how to help" note to the family now. Only if she switched it on. Practical prompts only: no health details.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await currentUser();
  if (!user || user.role !== "mother") return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const admin = adminClient();
  const { data: mo } = await admin.from("mothers").select("consent_family_note").eq("id", user.id).maybeSingle();
  if (!mo?.consent_family_note) return NextResponse.json({ error: "switched off" }, { status: 400 });
  const { sent } = await sendFamilyNote(admin, user.id, (user.name || "She").split(" ")[0]);
  return NextResponse.json({ ok: true, sent });
}
