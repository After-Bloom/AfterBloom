import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { canProSeeMother } from "@/lib/server/access";
import { limited } from "@/lib/server/limit";
import { mapSignal } from "@/lib/server/signals";

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
  if (b.action === "unlink" && sig.linkStatus === "unlinked") return NextResponse.json({ ok: true, signal: sig });
  const status = b.action === "confirm" ? "confirmed" : "unlinked";

  const { data: updated, error } = await admin.from("signals").update({ link_status: status }).eq("id", sig.id).select("*").single();
  if (error || !updated) return no(500, "could not save");

  // the audit line says what was decided, in words, and names no clinical detail
  const { data: me } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const action = status === "confirmed" ? "Confirmed that two of her alerts belong together" : "Separated one alert from her other alerts";
  await admin.from("audit_log").insert({ actor_id: user.id, actor_name: me?.full_name ?? "", mother_id: sig.motherId, action });
  return NextResponse.json({ ok: true, signal: mapSignal(updated) });
}
