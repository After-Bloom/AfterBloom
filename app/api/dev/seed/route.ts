import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { seedDemo, wipeDemo } from "@/lib/server/seed";

// DEV / SETUP ONLY. Creates the demo accounts and their history.
//   curl http://localhost:3000/api/dev/seed            (add or refresh demo data)
//   curl "http://localhost:3000/api/dev/seed?wipe=1"    (delete all demo accounts first)
// Protected: needs the CRON_SECRET header outside development.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const okDev = process.env.NODE_ENV !== "production";
  const okSecret = req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (!okDev && !okSecret) return NextResponse.json({ error: "not allowed" }, { status: 404 });
  const pw = process.env.DEMO_PASSWORD;
  if (!pw || pw.length < 8) return NextResponse.json({ error: "Set DEMO_PASSWORD (8+ characters) in .env.local" }, { status: 400 });
  const admin = adminClient();
  const wiped = new URL(req.url).searchParams.get("wipe") ? await wipeDemo(admin) : 0;
  try {
    const r = await seedDemo(admin, pw);
    return NextResponse.json({ ...r, wiped, password: undefined });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
