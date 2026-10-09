import { NextResponse } from "next/server";
import { currentUser, userClient } from "@/lib/supabase/server";

// "Verify": walk the audit trail's hash chain and say whether every record is unchanged. Each record stores a hash of the one before it,
// so an edited or removed record breaks the chain at that point and the first broken record is named. The database does the work as the
// signed-in person, so an administrator can verify everyone and a professional only their own patients.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || (user.role !== "admin" && user.role !== "pro")) return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const mother = new URL(req.url).searchParams.get("mother");
  if (user.role === "pro" && !mother) return NextResponse.json({ error: "choose a patient" }, { status: 400 });
  const { data, error } = await userClient().rpc("verify_audit_chain", { p_mother: mother || null });
  if (error) return NextResponse.json({ error: /does not exist|could not find/i.test(error.message) ? "audit-not-ready" : "could not verify" }, { status: /does not exist|could not find/i.test(error.message) ? 503 : 500 });
  const r = (Array.isArray(data) ? data[0] : data) as { checked: number; broken_id: string | null; broken_seq: number | null; broken_at: string | null } | null;
  return NextResponse.json({ ok: !r?.broken_id, checked: r?.checked ?? 0, brokenSeq: r?.broken_seq ?? null, brokenAt: r?.broken_at ?? null }, { headers: { "Cache-Control": "no-store" } });
}
