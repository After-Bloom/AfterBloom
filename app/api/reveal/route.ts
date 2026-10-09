import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { canProSeeMother } from "@/lib/server/access";
import { mapSignal } from "@/lib/server/signals";
import { limited } from "@/lib/server/limit";
import { isSensitive } from "@/lib/signals/blur";
import { signalTitle } from "@/lib/labels";

// A3: the one door back to a mood/EPDS/partner-screen value the case page blurred. Checks her consent again, right now
// (not what the screen showed a moment ago), and writes an insert-only audit_log row before handing the value back.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "pro") return no(403, "not allowed");
  if (limited(`reveal:${user.id}`, 60)) return no(429, "slow down");
  const body = await req.json().catch(() => ({}));
  const signalId = String(body.signalId ?? "");
  if (!signalId) return no(400, "missing signalId");

  const admin = adminClient();
  const { data: row } = await admin.from("signals").select("*").eq("id", signalId).maybeSingle();
  if (!row) return no(404, "not found");
  const sig = mapSignal(row);
  if (!isSensitive(sig)) return no(400, "not blurred");

  const gate = await canProSeeMother(admin, user.id, sig.motherId);
  if (!gate.matched || !gate.shares) return no(403, "not allowed"); // consent off, or paused: refused even if the screen was stale

  const { data: me } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const text = signalTitle(sig, "en");
  await admin.from("audit_log").insert({ actor_id: user.id, actor_name: me?.full_name ?? "", mother_id: sig.motherId, case_id: sig.caseId, action: `Revealed: ${text}` });

  return NextResponse.json({ value: sig.value, revealedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
