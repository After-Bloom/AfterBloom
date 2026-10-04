import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assignPro } from "./onboard";

let configured = false;
function setup() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", pub, priv);
  configured = true;
  return true;
}

type Note = { mother_id?: string | null; kind: string; title: string; body?: string; url?: string };

/** One alert row (appears in the app instantly via realtime) plus a web push to every device the person enabled. */
export async function notify(admin: SupabaseClient, userId: string, n: Note) {
  await admin.from("alerts").insert({ user_id: userId, mother_id: n.mother_id ?? null, kind: n.kind, title: n.title, body: n.body ?? "" });
  if (!setup()) return;
  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  await Promise.all((subs ?? []).map(async (sub) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title: n.title, body: n.body ?? "", url: n.url ?? "/" }), { TTL: 3600, urgency: n.kind === "emergency" ? "high" : "normal" });
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from("push_subscriptions").delete().eq("id", sub.id);
    }
  }));
}

/** The professionals responsible for a mother. Makes sure she has one, so an urgent flag always reaches a human. */
export async function prosOf(admin: SupabaseClient, motherId: string) {
  await assignPro(admin, motherId);
  const { data } = await admin.from("pro_patients").select("pro_id").eq("mother_id", motherId);
  return (data ?? []).map((r) => r.pro_id as string);
}

/**
 * Family alerts only go out if she agreed in advance, and they never say what is wrong:
 * the wording is neutral so it is safe to show on a shared phone's lock screen.
 */
export async function alertFamily(admin: SupabaseClient, motherId: string, firstName: string) {
  const { data: m } = await admin.from("mothers").select("consent_emergency_alert").eq("id", motherId).maybeSingle();
  if (!m?.consent_emergency_alert) return 0;
  const { data: fam } = await admin.from("family_members").select("user_id").eq("mother_id", motherId).eq("status", "active").eq("sees_alerts", true).not("user_id", "is", null);
  await Promise.all((fam ?? []).map((f) => notify(admin, f.user_id as string, { mother_id: motherId, kind: "emergency", title: "AfterBloom", body: `${firstName} needs you now. Please call her or go to her.`, url: "/family-view" })));
  return fam?.length ?? 0;
}

/** The weekly "how to help" note: practical prompts only. The one fact it may use is how many nights she slept under 5 hours. */
export async function sendFamilyNote(admin: SupabaseClient, motherId: string, first: string) {
  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const { data: rows } = await admin.from("checkins").select("sleep_hours").eq("mother_id", motherId).gte("day", since);
  const low = (rows ?? []).filter((r) => Number(r.sleep_hours) < 5).length;
  const { data: fam } = await admin.from("family_members").select("user_id").eq("mother_id", motherId).eq("status", "active").eq("sees_weekly", true).not("user_id", "is", null);
  const body = (low >= 2 ? `${first} slept under 5 hours on ${low} nights this week. Can someone take a night feed? ` : "") + "Ask what would help most today, then do it. Cook a meal, fill her water bottle, and listen without fixing.";
  await Promise.all((fam ?? []).map((f) => notify(admin, f.user_id as string, { mother_id: motherId, kind: "info", title: "How to help this week", body, url: "/family-view" })));
  return { sent: fam?.length ?? 0 };
}
