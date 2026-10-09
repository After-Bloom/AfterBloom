import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { notify, sendFamilyNote } from "@/lib/server/notify";
import { escalateOverdue } from "@/lib/server/loops";
import { sendText, smsConfigured, toE164 } from "@/lib/server/channels";

// Runs once a day (Vercel Cron; it sends "Authorization: Bearer $CRON_SECRET"). Idempotent: running it twice does not double-send.
//  1. gentle check-in reminder to mothers who have not checked in today (neutral wording)
//  2. family nudge when a mother has missed two days, only if she agreed to alerts
//  3. overdue callback alerts for professionals
//  4. Sundays: the weekly "how to help" note to family (if she switched it on) and a weekly snapshot for her record
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const day = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "not allowed" }, { status: 401 });
  const admin = adminClient();
  const now = new Date();
  const today = day(now), yesterday = day(new Date(now.getTime() - 86400000)), twoAgo = day(new Date(now.getTime() - 2 * 86400000));
  const since = new Date(now.getTime() - 3 * 86400000).toISOString();
  const out = { reminders: 0, familyNudges: 0, overdue: 0, weeklyNotes: 0, snapshots: 0, loops: 0, texts: 0, questions: 0 };

  const { data: mothers } = await admin.from("mothers").select("id, birth_date, consent_emergency_alert, consent_family_note, consent_sms, phone, profiles(full_name)");
  const early = (mothers ?? []).filter((m: any) => (now.getTime() - new Date(m.birth_date).getTime()) / 86400000 <= 42);
  const ids = early.map((m: any) => m.id);
  const { data: recent } = ids.length ? await admin.from("checkins").select("mother_id, day").in("mother_id", ids).gte("day", twoAgo) : { data: [] as any[] };
  const days = new Map<string, Set<string>>();
  (recent ?? []).forEach((r: any) => days.set(r.mother_id, (days.get(r.mother_id) ?? new Set()).add(r.day)));
  const { data: sentRecently } = ids.length ? await admin.from("alerts").select("user_id, mother_id, title").gte("created_at", since).in("mother_id", ids) : { data: [] as any[] };
  const already = (userId: string, motherId: string, title: string) => (sentRecently ?? []).some((a: any) => a.user_id === userId && a.mother_id === motherId && a.title === title);

  for (const m of early as any[]) {
    const done = days.get(m.id) ?? new Set<string>();
    const first = String(m.profiles?.full_name ?? "She").split(" ")[0];
    if (!done.has(today) && !already(m.id, m.id, "AfterBloom")) {
      await notify(admin, m.id, { mother_id: m.id, kind: "info", title: "AfterBloom", body: "You have a new message.", url: "/checkin" }); // neutral wording for a shared phone
      out.reminders++;
      // text-message reminder for mothers who asked for one (neutral wording, one a day, only if a gateway is configured)
      const to = m.consent_sms && smsConfigured() ? toE164(m.phone) : null;
      if (to && await sendText(to, `AfterBloom: you have a new message. Open ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/checkin`)) out.texts++;
    }
    if (m.consent_emergency_alert && !done.has(today) && !done.has(yesterday)) {
      const { data: fam } = await admin.from("family_members").select("user_id").eq("mother_id", m.id).eq("status", "active").eq("sees_alerts", true).not("user_id", "is", null);
      for (const f of fam ?? []) {
        if (already(f.user_id as string, m.id, "AfterBloom")) continue;
        await notify(admin, f.user_id as string, { mother_id: m.id, kind: "missed_checkin", title: "AfterBloom", body: `${first} has not checked in for two days. A gentle call or a cup of tea together may help.`, url: "/family-view" });
        out.familyNudges++;
      }
    }
  }

  // overdue callbacks go to the professional (and are still open on their dashboard)
  const { data: late } = await admin.from("flags").select("id, mother_id, kind, due_at").eq("resolved", false).eq("kind", "epds").lt("due_at", now.toISOString());
  for (const f of late ?? []) {
    const { data: pros } = await admin.from("pro_patients").select("pro_id").eq("mother_id", f.mother_id);
    for (const p of pros ?? []) {
      if (already(p.pro_id as string, f.mother_id, "Callback overdue")) continue;
      await notify(admin, p.pro_id as string, { mother_id: f.mother_id, kind: "callback", title: "Callback overdue", body: "A callback is past its 48 hour window.", url: "/pro" });
      out.overdue++;
    }
  }

  // Ask Bloom questions waiting more than 24 hours: remind her professional (once a day at most)
  const { data: waiting } = await admin.from("ask_questions").select("pro_id, mother_id").eq("status", "open").lt("created_at", new Date(now.getTime() - 86400000).toISOString());
  for (const q of waiting ?? []) {
    if (!q.pro_id || already(q.pro_id as string, q.mother_id, "Question waiting over 24 hours")) continue;
    await notify(admin, q.pro_id as string, { mother_id: q.mother_id, kind: "callback", title: "Question waiting over 24 hours", body: "A patient's Ask Bloom question has no reply yet.", url: "/pro" });
    out.questions++;
  }

  out.loops = await escalateOverdue(admin); // follow-ups after RED/AMBER results that she never answered

  if (now.getUTCDay() === 0) {
    const weekStart = day(new Date(now.getTime() - 6 * 86400000));
    for (const m of early as any[]) {
      if (m.consent_family_note) { const r = await sendFamilyNote(admin, m.id, String(m.profiles?.full_name ?? "She").split(" ")[0]); out.weeklyNotes += r.sent; }
      const { data: wk } = await admin.from("checkins").select("mood, appetite, sleep_hours, level").eq("mother_id", m.id).gte("day", weekStart);
      const n = wk?.length ?? 0;
      const avg = (k: string) => (n ? Math.round(((wk as any[]).reduce((a, c) => a + Number(c[k]), 0) / n) * 10) / 10 : null);
      await admin.from("weekly_reports").upsert({ mother_id: m.id, week_start: weekStart, payload: { checkins: n, mood: avg("mood"), appetite: avg("appetite"), sleepHours: avg("sleep_hours"), amberOrRed: (wk ?? []).filter((c: any) => c.level !== "GREEN").length } }, { onConflict: "mother_id,week_start" });
      out.snapshots++;
    }
  }
  return NextResponse.json({ ok: true, ...out });
}
