import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { alertFamily, notify } from "@/lib/server/notify";
import { limited } from "@/lib/server/limit";
import { notifyTargets } from "@/lib/server/routing";
import { recordAll, shouldNotify, symptomLookup, syncOrigin, type Recorded } from "@/lib/server/signals";
import { concernsOfReason, deriveFromEmergency } from "@/lib/signals/derive";
import type { Concern } from "@/lib/types/cases";

// Called after a RED result. Best effort and never blocks the crisis screen (which has already opened on the phone).
// Creates the urgent flag, alerts her professional, and alerts family ONLY if she agreed in advance.
//
// Related alerts: the alert is first saved as signals and compared with her earlier ones. A repeat of something her care team already
// knows is held back from pinging them again (it still shows in their list and the callback flag is still created). A new concern, a rise
// in severity and anything about her safety always alerts. Which professional is told follows continuity of care.
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

  // ---- group it with her other alerts ----
  const o = b.origin;
  const origin = o && (o.table === "symptom_logs" || o.table === "checkins") && typeof o.id === "string" ? (o as { table: "symptom_logs" | "checkins"; id: string }) : null;
  let recorded: Recorded[] = [];
  if (origin) recorded = await syncOrigin(admin, user.id, origin.table, origin.id); // the page saved a log or check-in: its signals are the ones to use
  if (!recorded.length && flag) {
    const k = b.kind === "selfharm" ? "selfharm" : psychosis ? "psychosis" : "medical";
    recorded = await recordAll(admin, deriveFromEmergency(user.id, k, reason, flag.id, new Date().toISOString(), symptomLookup)); // e.g. Ask Bloom, which saves no log
  }
  const safety = kind === "selfharm" || psychosis;
  const tell = safety || shouldNotify(recorded); // if nothing could be recorded, shouldNotify() says yes: the safe default is to tell
  const concerns = [...new Set([...recorded.map((r) => r.signal?.concern), ...concernsOfReason(reason, symptomLookup)].filter((c): c is Concern => !!c))];

  const first = (user.name || "She").split(" ")[0];
  const pros = tell ? await notifyTargets(admin, user.id, concerns, { everyone: safety }) : [];
  await Promise.all(pros.map((p) => notify(admin, p, { mother_id: user.id, kind: "emergency", title: "URGENT: immediate callback", body: `${user.name || "A patient"}: ${reason}`, url: "/pro" })));
  const family = await alertFamily(admin, user.id, first);
  return NextResponse.json({ flag, notified: { professionals: pros.length, family, heldBack: !tell } });
}
