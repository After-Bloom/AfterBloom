import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";

// Right to erasure (DPDP). Deleting the sign-in account cascades to the profile and every record linked to it.
// Circle posts stay (they carry only an alias) but are no longer linked to her.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { confirm } = await req.json().catch(() => ({}));
  if (confirm !== "DELETE") return NextResponse.json({ error: "confirmation missing" }, { status: 400 });
  const { error } = await adminClient().auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "could not delete" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
