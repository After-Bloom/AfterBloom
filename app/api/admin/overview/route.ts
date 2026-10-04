import { NextResponse } from "next/server";
import { adminClient, currentUser, userClient } from "@/lib/supabase/server";

// Admin overview: people (no health data), anonymised hospital totals, and the clinical settings with their sign-off.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const admin = adminClient();
  const [{ data: profiles }, { data: authList }, stats, { data: cfg }] = await Promise.all([
    admin.from("profiles").select("id, role, full_name, city, is_demo, created_at").order("created_at", { ascending: false }).limit(300),
    admin.auth.admin.listUsers({ page: 1, perPage: 300 }),
    userClient().rpc("hospital_stats"),
    admin.from("clinical_config").select("key, value, version, signed_off_by, signed_off_at, updated_at"),
  ]);
  const emails = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  return NextResponse.json({
    people: (profiles ?? []).map((p) => ({ ...p, email: emails.get(p.id) ?? "" })),
    hospitals: stats.data ?? [],
    config: cfg ?? [],
  });
}
