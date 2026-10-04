import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { alertFamily, notify, prosOf } from "@/lib/server/notify";
import { limited } from "@/lib/server/limit";

// Called after a RED result. Best effort and never blocks the crisis screen (which has already opened on the phone).
// Creates the urgent flag, alerts her professional, and alerts family ONLY if she agreed in advance.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "mother") return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (limited(`emergency:${user.id}`, 12)) return NextResponse.json({ error: "slow down" }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const kind = b.kind === "selfharm" ? "selfharm" : "red";
  const reason = String(b.reason ?? "Danger sign").slice(0, 300) || "Danger sign";
  const psychosis = b.kind === "psychosis";
  const admin = adminClient();

  // do not pile up duplicate flags if she taps twice
  const recent = new Date(Date.now() - 10 * 60000).toISOString();
  const { data: dupe } = await admin.from("flags").select("*").eq("mother_id", user.id).eq("resolved", false).eq("text", reason).gte("created_at", recent).limit(1);
  if (dupe?.length) return NextResponse.json({ flag: dupe[0], duplicate: true });

  const { data: flag } = await admin.from("flags").insert({
    mother_id: user.id, kind, text: psychosis ? `Possible postpartum psychosis warning signs: ${reason}` : reason, due_at: new Date(Date.now() + 3600000).toISOString(),
  }).select("*").single();

  const first = (user.name || "She").split(" ")[0];
  const pros = await prosOf(admin, user.id);
  await Promise.all(pros.map((p) => notify(admin, p, { mother_id: user.id, kind: "emergency", title: "URGENT: immediate callback", body: `${user.name || "A patient"}: ${reason}`, url: "/pro" })));
  const family = await alertFamily(admin, user.id, first);
  return NextResponse.json({ flag, notified: { professionals: pros.length, family } });
}
