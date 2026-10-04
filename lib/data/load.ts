import type { SupabaseClient } from "@supabase/supabase-js";
import type { Alert, Audit, Booking, Checkin, EpdsResult, FamilyMember, Flag, State, SymptomLog } from "../store";
import type { Level } from "../symptoms";

// Turn database rows into the shapes the screens already use. Day strings are plain dates ("2026-10-04").
const noon = (day: string) => `${day}T12:00:00`;

export const mapCheckin = (r: any): Checkin => ({
  date: noon(r.day), mood: r.mood, appetite: r.appetite, sleepHours: Number(r.sleep_hours), level: r.level as Level,
  bp: r.bp_sys && r.bp_dia ? { sys: r.bp_sys, dia: r.bp_dia } : undefined,
});
export const mapFlag = (r: any): Flag => ({ id: r.id, date: r.created_at, kind: r.kind, text: r.text, resolved: r.resolved, dueAt: r.due_at });
export const mapAlert = (r: any): Alert => ({ id: r.id, at: r.created_at, text: r.body ? `${r.title}: ${r.body}` : r.title, title: r.title, body: r.body, kind: r.kind, read: r.read });

export async function loadAccount(sb: SupabaseClient, uid: string) {
  const [{ data: profile }, { data: alerts }] = await Promise.all([
    sb.from("profiles").select("role, full_name, lang").eq("id", uid).maybeSingle(),
    sb.from("alerts").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(40),
  ]);
  return { profile, alerts: (alerts ?? []).map(mapAlert) };
}

/** Everything a mother sees about herself and her baby. RLS guarantees she only receives her own rows. */
export async function loadMother(sb: SupabaseClient, uid: string): Promise<Partial<State>> {
  const since = new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10);
  const [m, ci, sl, ep, fl, fam, bk, vac, gr, ms, ben, sh, ps, au] = await Promise.all([
    sb.from("mothers").select("*").eq("id", uid).maybeSingle(),
    sb.from("checkins").select("*").eq("mother_id", uid).gte("day", since).order("day"),
    sb.from("symptom_logs").select("*").eq("mother_id", uid).order("created_at", { ascending: false }).limit(60),
    sb.from("epds_results").select("id, total, band, self_harm, created_at").eq("mother_id", uid).order("created_at", { ascending: false }).limit(20),
    sb.from("flags").select("*").eq("mother_id", uid).order("created_at", { ascending: false }).limit(40),
    sb.from("family_members").select("*").eq("mother_id", uid).neq("status", "removed").order("created_at"),
    sb.from("bookings").select("id, starts_at, room, status, pro_id, pros(title, profiles(full_name))").eq("mother_id", uid).order("starts_at"),
    sb.from("baby_vaccines").select("vaccine_id").eq("mother_id", uid),
    sb.from("baby_growth").select("*").eq("mother_id", uid).order("on_date"),
    sb.from("baby_milestones").select("milestone_id").eq("mother_id", uid),
    sb.from("benefit_steps").select("step").eq("mother_id", uid),
    sb.from("night_shifts").select("*").eq("mother_id", uid).gte("day", new Date(Date.now() - 86400000).toISOString().slice(0, 10)),
    sb.from("partner_screens").select("created_at, yes_count").eq("mother_id", uid).order("created_at", { ascending: false }).limit(10),
    sb.from("audit_log").select("at, actor_name, action").eq("mother_id", uid).order("at", { ascending: false }).limit(50),
  ]);
  const mo: any = m.data;
  if (!mo) return {};
  const shifts: Record<string, string> = {};
  (sh.data ?? []).forEach((r: any) => { shifts[`${r.day}|${r.slot}`] = r.assignee; });
  return {
    mother: { name: "", babyName: mo.baby_name, birth: mo.birth_date + "T12:00:00", delivery: mo.delivery, city: mo.city ?? "", babySex: mo.baby_sex ?? null, phone: mo.phone ?? "" },
    consent: {
      emergencyAlert: mo.consent_emergency_alert, shareWithPro: mo.consent_share_pro, familyNote: mo.consent_family_note,
      emergencyContact: mo.emergency_contact_name ?? "", emergencyPhone: mo.emergency_contact_phone ?? "", cloudMatch: mo.consent_cloud_match,
    },
    neutralNotif: mo.neutral_notifications, circleId: mo.circle_id,
    checkins: (ci.data ?? []).map(mapCheckin),
    symptomLogs: (sl.data ?? []).map((r: any): SymptomLog => ({ date: r.created_at, text: "", level: r.level, labels: r.labels })),
    epds: (ep.data ?? []).map((r: any): EpdsResult => ({ date: r.created_at, total: r.total, band: r.band, selfHarm: r.self_harm })),
    flags: (fl.data ?? []).map(mapFlag),
    family: (fam.data ?? []).map((r: any): FamilyMember => ({ id: r.id, name: r.name, relation: r.relation, code: r.invite_code, status: r.status, sees: { alerts: r.sees_alerts, trends: r.sees_trends, weekly: r.sees_weekly } })),
    bookings: (bk.data ?? []).map((r: any): Booking => ({ id: r.id, proId: r.pro_id, proName: r.pros?.profiles?.full_name ?? "", proTitle: r.pros?.title ?? "", when: r.starts_at, room: r.room, status: r.status })),
    vaccinesDone: (vac.data ?? []).map((r: any) => r.vaccine_id),
    weights: (gr.data ?? []).map((r: any) => ({ date: r.on_date + "T12:00:00", kg: r.weight_kg ? Number(r.weight_kg) : 0, cm: r.length_cm ? Number(r.length_cm) : undefined })),
    milestonesDone: (ms.data ?? []).map((r: any) => r.milestone_id),
    benefits: (ben.data ?? []).map((r: any) => r.step),
    shifts,
    partnerScreens: (ps.data ?? []).map((r: any) => ({ date: r.created_at, yes: r.yes_count })),
    audit: (au.data ?? []).map((r: any): Audit => ({ at: r.at, who: r.actor_name, what: r.action })),
  };
}
