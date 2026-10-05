import { NextResponse } from "next/server";
import { adminClient, currentUser, userClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/server/crypto";

// Right of access (DPDP): everything stored about the signed-in person, as one JSON file.
// Uses the person's own client, so Row Level Security guarantees it only ever contains their own rows.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const sb = userClient();
  const mine = (t: string, col: string) => sb.from(t).select("*").eq(col, user.id);
  const [profile, mother, pros, checkins, symptoms, epds, flags, family, bookings, vaccines, growth, milestones, benefits, shifts, screens, audit, alerts, consent, reports, careLoops, babyLogs, visits] = await Promise.all([
    mine("profiles", "id"), mine("mothers", "id"), mine("pros", "id"), mine("checkins", "mother_id"), mine("symptom_logs", "mother_id"), mine("epds_results", "mother_id"), mine("flags", "mother_id"),
    mine("family_members", "mother_id"), mine("bookings", "mother_id"), mine("baby_vaccines", "mother_id"), mine("baby_growth", "mother_id"), mine("baby_milestones", "mother_id"), mine("benefit_steps", "mother_id"),
    mine("night_shifts", "mother_id"), mine("partner_screens", "mother_id"), mine("audit_log", "mother_id"), mine("alerts", "user_id"), mine("consent_log", "user_id"), mine("weekly_reports", "mother_id"),
    mine("care_loops", "mother_id"), mine("baby_logs", "mother_id"), mine("asha_visits", "mother_id"),
  ]);
  const { data: posts } = await adminClient().from("post_authors").select("post_id, posts(alias, text, topic, created_at, circle_id)").eq("author_id", user.id);
  const epdsReadable = (epds.data ?? []).map((r: any) => {
    let answers: number[] | null = null;
    try { answers = r.answers_enc ? JSON.parse(decrypt(r.answers_enc)) : null; } catch { /* unreadable */ }
    const { answers_enc, ...rest } = r;
    return { ...rest, answers };
  });
  const body = {
    exportedAt: new Date().toISOString(), account: { email: user.email, role: user.role },
    profile: profile.data, mother: mother.data, professional: pros.data, checkins: checkins.data, symptomLogs: symptoms.data, screening: epdsReadable, flags: flags.data,
    family: family.data, bookings: bookings.data, vaccines: vaccines.data, growth: growth.data, milestones: milestones.data, benefitSteps: benefits.data,
    nightShifts: shifts.data, partnerScreens: screens.data, whoViewedMyRecord: audit.data, alerts: alerts.data, consentHistory: consent.data, weeklyReports: reports.data, careLoopFollowUps: careLoops.data, babyFeedingLog: babyLogs.data, homeVisits: visits.data,
    myCirclePosts: (posts ?? []).map((p: any) => p.posts),
  };
  return new NextResponse(JSON.stringify(body, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="afterbloom-my-data.json"', "Cache-Control": "no-store" } });
}
