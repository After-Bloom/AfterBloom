import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { canProSeeMother } from "@/lib/server/access";
import { limited } from "@/lib/server/limit";
import { mapSignal, ownerFn } from "@/lib/server/signals";
import { confirmLink, unlinkSignal } from "@/lib/cases/attach";

// A clinician decides about one link. Confirm: a possibly-related alert really belongs with the other one.
// Unlink: this alert does not belong with the others and stands on its own. Both are written to the audit log in plain words.
// Whole-case merge and split are deliberately not offered: deciding one alert at a time is just as useful and far safer.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "pro") return no(403, "not allowed");
  if (limited(`link:${user.id}`, 60)) return no(429, "slow down");
  const b = await req.json().catch(() => ({}));
  if (typeof b.signalId !== "string" || (b.action !== "confirm" && b.action !== "unlink")) return no(400, "invalid");

  const admin = adminClient();
  const { data: row } = await admin.from("signals").select("*").eq("id", b.signalId).maybeSingle();
  if (!row) return no(404, "not found");
  const sig = mapSignal(row);
  const gate = await canProSeeMother(admin, user.id, sig.motherId);
  if (!gate.matched) return no(403, "not your patient");

  if (b.action === "confirm" && !(sig.relation === "POSSIBLY_RELATED" && sig.linkStatus === "suggested")) return no(409, "nothing to confirm");
  // only an alert from ANOTHER concern waiting inside a case can be separated: a same-concern alert always belongs to that concern's one case
  if (b.action === "unlink" && sig.linkStatus === "unlinked") return NextResponse.json({ ok: true, signal: sig });
  if (b.action === "unlink" && !(sig.relation === "POSSIBLY_RELATED" && (sig.linkStatus === "suggested" || sig.linkStatus === "confirmed"))) return no(409, "cannot separate");

  try {
    if (b.action === "confirm") await confirmLink(admin, sig, { role: "pro", id: user.id });
    else await unlinkSignal(admin, sig, { role: "pro", id: user.id }, ownerFn(admin)); // it leaves the case and gets its own
  } catch { return no(500, "could not save"); }
  const { data: updated } = await admin.from("signals").select("*").eq("id", sig.id).single();

  // the audit line says what was decided, in words, and names no clinical detail
  const { data: me } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const action = b.action === "confirm" ? "Confirmed that two of her alerts belong together" : "Separated one alert from her other alerts";
  await admin.from("audit_log").insert({ actor_id: user.id, actor_name: me?.full_name ?? "", mother_id: sig.motherId, action });
  return NextResponse.json({ ok: true, signal: updated ? mapSignal(updated) : sig });
}
