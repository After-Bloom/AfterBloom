import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";

// The weekly "how to help" note for family. It may contain ONLY practical prompts: the one number it can use is how many
// nights she slept under 5 hours. No symptoms, scores or health details ever leave this route.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "family") return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const admin = adminClient();
  const { data: fm } = await admin.from("family_members").select("mother_id, sees_weekly").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!fm?.sees_weekly) return NextResponse.json({ enabled: false });
  const { data: mo } = await admin.from("mothers").select("consent_family_note").eq("id", fm.mother_id).maybeSingle();
  if (!mo?.consent_family_note) return NextResponse.json({ enabled: false });
  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const { data: rows } = await admin.from("checkins").select("sleep_hours").eq("mother_id", fm.mother_id).gte("day", since);
  return NextResponse.json({ enabled: true, lowSleepNights: (rows ?? []).filter((r) => Number(r.sleep_hours) < 5).length });
}
