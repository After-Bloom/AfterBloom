import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { notify } from "@/lib/server/notify";
import { notifyTargets } from "@/lib/server/routing";
import { recordAll, shouldNotify } from "@/lib/server/signals";
import { derivePartnerScreen } from "@/lib/signals/derive";
import { PARTNER_QS } from "@/lib/epds";
import { limited } from "@/lib/server/limit";

// A family member reports changes they noticed (mothers often under-report). Four or more concerns routes a callback to her
// professional. The family member is never shown a score, and the mother is not told who answered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "family") return NextResponse.json({ error: "not allowed" }, { status: 403 });
  if (limited(`partner:${user.id}`, 4, 3600000)) return NextResponse.json({ error: "slow down" }, { status: 429 });
  const { answers } = (await req.json().catch(() => ({}))) as { answers?: boolean[] };
  if (!Array.isArray(answers) || answers.length !== PARTNER_QS.length) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const admin = adminClient();
  const { data: fm } = await admin.from("family_members").select("mother_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!fm) return NextResponse.json({ error: "no link" }, { status: 400 });
  const yes = answers.filter(Boolean).length;
  const { data: screen } = await admin.from("partner_screens").insert({ mother_id: fm.mother_id, by_user: user.id, yes_count: yes, answers: answers.map((a) => (a ? 1 : 0)) }).select("id, created_at").single();
  // four or more concerns is also saved as a signal, so it groups with her mood screening
  const recorded = screen ? await recordAll(admin, derivePartnerScreen(fm.mother_id, { id: screen.id, yes, total: PARTNER_QS.length, created_at: screen.created_at })) : [];
  let told = false;
  if (yes >= 4) {
    const { data: mom } = await admin.from("profiles").select("full_name").eq("id", fm.mother_id).maybeSingle();
    await admin.from("flags").insert({ mother_id: fm.mother_id, kind: "epds", text: `Family screening: ${yes} of ${PARTNER_QS.length} concerns noticed`, due_at: new Date(Date.now() + 48 * 3600000).toISOString() });
    const pros = shouldNotify(recorded) ? await notifyTargets(admin, fm.mother_id, ["MOOD"]) : []; // the callback flag is always created; only a repeat ping is held back
    await Promise.all(pros.map((p) => notify(admin, p, { mother_id: fm.mother_id, kind: "callback", title: "Callback within 24 to 48 hours", body: `${mom?.full_name ?? "A patient"}: family noticed ${yes} of ${PARTNER_QS.length} changes`, url: "/pro" })));
    told = true; // her care team knows, either from this message or from the earlier one this repeats
  }
  return NextResponse.json({ ok: true, careTeamTold: told });
}
