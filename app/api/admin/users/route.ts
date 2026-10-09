import { NextResponse } from "next/server";
import crypto from "crypto";
import { adminClient, currentUser } from "@/lib/supabase/server";

// Admin creates and removes professional, moderator, ASHA and admin accounts (these cannot self-register).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAFF = ["pro", "moderator", "asha", "admin"];
const TITLES = ["Clinical psychologist", "Counsellor", "Psychiatrist", "Gynaecologist", "Lactation consultant", "Paediatrician"];
// which kind of alert each profession handles (continuity of care routes by this)
const SPECIALTY: Record<string, string> = { "Clinical psychologist": "psychologist", Counsellor: "psychologist", Psychiatrist: "psychologist", Gynaecologist: "gynaecologist", "Lactation consultant": "lactation", Paediatrician: "paediatrician" };

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const b = await req.json().catch(() => null);
  const role = String(b?.role ?? ""), email = String(b?.email ?? "").trim().toLowerCase(), name = String(b?.name ?? "").trim();
  if (!STAFF.includes(role) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name) return NextResponse.json({ error: "Please check the name, email and role." }, { status: 400 });
  if (role === "pro" && (!b?.reg_no || !String(b.reg_no).trim())) return NextResponse.json({ error: "A registration number (RCI or medical council) is required for professionals." }, { status: 400 });
  const admin = adminClient();
  const password = crypto.randomBytes(9).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role }, user_metadata: { name } });
  if (error || !data.user) return NextResponse.json({ error: /already|registered/i.test(error?.message ?? "") ? "That email already has an account." : "Could not create the account." }, { status: 409 });
  const id = data.user.id;
  const { error: pe } = await admin.from("profiles").insert({ id, role, full_name: name, lang: "en", city: b?.city ?? null, hospital_id: "00000000-0000-0000-0000-0000000000a1" });
  if (pe) { await admin.auth.admin.deleteUser(id); return NextResponse.json({ error: "Could not set up the profile." }, { status: 500 }); }
  if (role === "pro") {
    const title = TITLES.includes(b.title) ? b.title : "Counsellor";
    const row = {
      id, title, qualification: String(b.qualification ?? "").slice(0, 200), reg_no: String(b.reg_no).trim().slice(0, 80),
      langs: Array.isArray(b.langs) ? b.langs.slice(0, 8) : ["English"], fee: Math.max(0, Math.min(10000, Number(b.fee) || 0)), bio: String(b.bio ?? "").slice(0, 300), is_sample: false, accepting: true,
    };
    const { error: ie } = await admin.from("pros").insert({ ...row, specialty: SPECIALTY[title] });
    if (ie) await admin.from("pros").insert(row); // the specialty column is added by migration 010; until then create the professional as before
  }
  // The temporary password is shown once. The person should change it after signing in.
  return NextResponse.json({ ok: true, id, tempPassword: password });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id || id === user.id) return NextResponse.json({ error: "cannot remove this account" }, { status: 400 });
  const { error } = await adminClient().auth.admin.deleteUser(id);
  return error ? NextResponse.json({ error: "could not remove" }, { status: 500 }) : NextResponse.json({ ok: true });
}
