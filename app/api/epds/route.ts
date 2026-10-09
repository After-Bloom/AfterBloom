import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { encrypt } from "@/lib/server/crypto";
import { alertFamily, notify, prosOf } from "@/lib/server/notify";
import { notifyTargets } from "@/lib/server/routing";
import { recordEpds, shouldNotify } from "@/lib/server/signals";
import { EPDS, EPDS_CONFIG, scoreEpds } from "@/lib/epds";
import { limited } from "@/lib/server/limit";

// Screening is scored again here (never trust the browser), the answers are encrypted before storage,
// and elevated results are routed to a human: question 10 -> urgent flag, 13+ -> callback within 48 hours.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "mother") return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (limited(`epds:${user.id}`, 6, 3600000)) return NextResponse.json({ error: "slow down" }, { status: 429 });
  const b = await req.json().catch(() => null);
  const a = b?.answers;
  if (!Array.isArray(a) || a.length !== EPDS.length || a.some((x: any) => !Number.isInteger(x) || x < 0 || x > 3)) return NextResponse.json({ error: "invalid answers" }, { status: 400 });

  const admin = adminClient();
  const { data: cfg } = await admin.from("clinical_config").select("value").eq("key", "epds").maybeSingle();
  const r = scoreEpds(a, { possible: cfg?.value?.possible ?? EPDS_CONFIG.possible, probable: cfg?.value?.probable ?? EPDS_CONFIG.probable });

  const { data: row, error } = await admin.from("epds_results").insert({ mother_id: user.id, total: r.total, band: r.band, self_harm: r.selfHarm, answers_enc: encrypt(JSON.stringify(a)) }).select("id, created_at").single();
  if (error) return NextResponse.json({ error: "could not save" }, { status: 500 });

  // every result is also saved as a signal and compared with her earlier alerts (a repeat is held back, a rise or a safety signal never is)
  const recorded = await recordEpds(admin, user.id, { id: row.id, total: r.total, band: r.band, self_harm: r.selfHarm, created_at: row.created_at });
  const tell = r.selfHarm || shouldNotify(recorded);

  let flag: any = null;
  if (r.selfHarm) {
    const pros = await prosOf(admin, user.id); // safety: everyone matched with her, always
    ({ data: flag } = await admin.from("flags").insert({ mother_id: user.id, kind: "q10", text: "EPDS question 10 positive: thoughts of self-harm", due_at: new Date().toISOString() }).select("*").single());
    await Promise.all(pros.map((p) => notify(admin, p, { mother_id: user.id, kind: "emergency", title: "URGENT: immediate callback", body: `${user.name || "A patient"}: EPDS question 10 positive`, url: "/pro" })));
    await alertFamily(admin, user.id, (user.name || "She").split(" ")[0]);
  } else if (r.band === "probable") {
    const hours = 48;
    ({ data: flag } = await admin.from("flags").insert({ mother_id: user.id, kind: "epds", text: `EPDS ${r.total}: probable depression`, due_at: new Date(Date.now() + hours * 3600000).toISOString() }).select("*").single());
    const pros = tell ? await notifyTargets(admin, user.id, ["MOOD"]) : []; // the callback flag is always created; only a repeat ping is held back
    await Promise.all(pros.map((p) => notify(admin, p, { mother_id: user.id, kind: "callback", title: "Callback within 24 to 48 hours", body: `${user.name || "A patient"}: EPDS ${r.total}`, url: "/pro" })));
  }
  return NextResponse.json({ band: r.band, selfHarm: r.selfHarm, createdAt: row.created_at, flag });
}
