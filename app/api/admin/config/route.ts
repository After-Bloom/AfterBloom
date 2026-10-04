import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";

// Clinical settings (EPDS cut-offs, triage level overrides). Every change records who signed it off and when.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const { key, value, signedOffBy } = (await req.json().catch(() => ({}))) as { key?: string; value?: any; signedOffBy?: string };
  if (!["epds", "triage_overrides"].includes(key ?? "")) return NextResponse.json({ error: "unknown setting" }, { status: 400 });
  if (!signedOffBy || signedOffBy.trim().length < 3) return NextResponse.json({ error: "Enter the name of the clinician who signed this off." }, { status: 400 });
  if (key === "epds") {
    const p = Number(value?.possible), q = Number(value?.probable);
    if (!Number.isInteger(p) || !Number.isInteger(q) || p < 5 || q > 20 || p >= q) return NextResponse.json({ error: "Cut-offs must be whole numbers with possible below probable (Indian studies use 9 to 13)." }, { status: 400 });
  }
  if (key === "triage_overrides") {
    const o = value as Record<string, string>;
    if (!o || typeof o !== "object" || Object.values(o).some((v) => !["RED", "AMBER", "GREEN"].includes(v))) return NextResponse.json({ error: "Invalid levels." }, { status: 400 });
  }
  const admin = adminClient();
  const { data: cur } = await admin.from("clinical_config").select("version").eq("key", key).maybeSingle();
  const { error } = await admin.from("clinical_config").upsert({ key, value, version: (cur?.version ?? 0) + 1, signed_off_by: signedOffBy.trim().slice(0, 120), signed_off_at: new Date().toISOString(), updated_by: user.id, updated_at: new Date().toISOString() });
  return error ? NextResponse.json({ error: "could not save" }, { status: 500 }) : NextResponse.json({ ok: true });
}
