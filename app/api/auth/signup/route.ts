import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { assignCircle, assignPro } from "@/lib/server/onboard";
import { ipOf, limited } from "@/lib/server/limit";

// Sign-up goes through the server so no confirmation email is needed (the free email tier only sends a few an hour).
// Only mothers and family members can register themselves. Professionals, moderators, ASHA workers and admins are created by an admin.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  if (limited(`signup:${ipOf(req)}`, 6)) return bad("Too many attempts. Please wait a minute.", 429);
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request");
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const name = String(b.name ?? "").trim().slice(0, 80);
  const role = b.role === "family" ? "family" : "mother";
  const lang = b.lang === "hi" ? "hi" : "en";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad("Please enter a valid email address.");
  if (password.length < 8) return bad("Password must be at least 8 characters.");
  if (!name) return bad("Please tell us your name.");

  const admin = adminClient();
  let invite: { id: string; mother_id: string } | null = null;
  if (role === "family") {
    const code = String(b.inviteCode ?? "").trim().toUpperCase();
    if (!code) return bad("Please enter the invite code she gave you.");
    const { data } = await admin.from("family_members").select("id, mother_id").eq("invite_code", code).eq("status", "invited").maybeSingle();
    if (!data) return bad("That invite code is not valid or has already been used.");
    invite = data;
  }

  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role }, user_metadata: { name } });
  if (error || !created.user) {
    const dupe = /already|registered|exists/i.test(error?.message ?? "");
    return bad(dupe ? "That email already has an account. Try signing in." : "Could not create the account. Please try again.", dupe ? 409 : 500);
  }
  const id = created.user.id;
  const city = String(b.city ?? "").trim().slice(0, 60) || null;

  const fail = async (msg: string) => { await admin.auth.admin.deleteUser(id); return bad(msg, 500); };
  const { error: pe } = await admin.from("profiles").insert({ id, role, full_name: name, lang, city, hospital_id: "00000000-0000-0000-0000-0000000000a1" });
  if (pe) return fail("Could not set up your profile.");

  if (role === "mother") {
    const birth = /^\d{4}-\d{2}-\d{2}$/.test(String(b.birthDate)) ? String(b.birthDate) : new Date().toISOString().slice(0, 10);
    const { error: me } = await admin.from("mothers").insert({
      id, baby_name: String(b.babyName ?? "").trim().slice(0, 60), birth_date: birth, delivery: ["Normal", "C-section"].includes(b.delivery) ? b.delivery : "Normal",
      city, hospital_id: "00000000-0000-0000-0000-0000000000a1", phone: String(b.phone ?? "").trim().slice(0, 20) || null,
    });
    if (me) return fail("Could not set up your profile.");
    await assignPro(admin, id);
    await assignCircle(admin, id, birth, city, lang, name.split(" ")[0]);
  } else if (invite) {
    await admin.from("family_members").update({ user_id: id, status: "active", name }).eq("id", invite.id);
  }
  return NextResponse.json({ ok: true, role });
}
