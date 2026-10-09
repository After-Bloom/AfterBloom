import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordAll, recordSignal, symptomLookup } from "./signals";
import { recomputeCase } from "../workflow/engine";
import { deriveFromEpds, deriveFromSymptomLog, derivePartnerScreen } from "../signals/derive";
import { STORM } from "../demo/storm";

// The demo's alert story, in one place so "Reset demo" can put it back exactly as the seed made it.
// Every time is relative to now, so it looks the same whenever a judge opens it. Nothing is hand-labelled: each alert is recorded by
// recordSignal(), so the "repeat", "follow-up", "also reported" and "possibly related" labels, the cases and the priority all come from the real rules.

const HOUR = 3600000;
const ago = (h: number) => new Date(Date.now() - h * HOUR).toISOString();

export async function seedStory(admin: SupabaseClient, ids: { priya: string; anjali: string; rohan: string | null }) {
  const { priya, anjali, rohan } = ids;
  const rec = (h: number, source: "checkin" | "symptom_checker", code: string, severity: "amber" | "red", value: Record<string, number> | null = null) =>
    recordSignal(admin, { motherId: priya, subject: "mother", source, code, concern: "HYPERTENSIVE", severity, value, observedAt: ago(h), originTable: "checkins", originId: crypto.randomUUID() });
  const saveLog = async (mother: string, h: number, level: "RED" | "AMBER", labels: string[]) => {
    const { data } = await admin.from("symptom_logs").insert({ mother_id: mother, level, labels, created_at: ago(h) }).select("id, level, labels, created_at").single();
    if (data) await recordAll(admin, deriveFromSymptomLog(mother, data as any, symptomLookup));
  };

  // Rohan's partner screening (30 hours ago) joins her mood concern
  if (rohan) {
    const { data: ps } = await admin.from("partner_screens").insert({ mother_id: priya, by_user: rohan, yes_count: 4, answers: [1, 1, 1, 1, 0, 0], created_at: ago(30) }).select("id, created_at").single();
    if (ps) await recordAll(admin, derivePartnerScreen(priya, { id: ps.id, yes: 4, total: 6, created_at: ps.created_at }));
  }

  await rec(26, "checkin", "bp_raised", "amber", { sys: 142, dia: 90 });                  // morning reading, no headache: opens the blood pressure case
  const red = await rec(13, "checkin", "bp_raised", "red", { sys: 148, dia: 94 });         // evening, now with a headache: amber to red, so it tells the care team again
  await rec(13, "checkin", "headache", "amber");
  await saveLog(priya, 12.6, "RED", ["Severe headache with blurred vision", "Headache"]);  // reported again in the symptom checker: also reported, held back
  await saveLog(priya, 12.2, "AMBER", ["Dizzy or faint when standing"]);                   // dizziness (bleeding) with raised BP: possibly related, a clinician confirms
  await recordSignal(admin, { motherId: priya, subject: "mother", source: "care_loop", code: "loop_no_reply", concern: "HYPERTENSIVE", severity: "red", observedAt: ago(8), originTable: "care_loops", originId: crypto.randomUUID(), followUpOf: red.signal?.id ?? null, forceNotify: true, value: { askedAt: ago(10) } }); // no reply to "did you get care?"
  await rec(2, "checkin", "bp_raised", "red", { sys: 152, dia: 96 });                      // raised again: a repeat
  await recordSignal(admin, { motherId: priya, subject: "mother", source: "callback", code: "callback_overdue", concern: "HYPERTENSIVE", severity: "red", observedAt: ago(1), originTable: "flags", originId: crypto.randomUUID(), followUpOf: red.signal?.id ?? null, forceNotify: true });
  await saveLog(priya, 5, "AMBER", ["Yellowish skin or eyes"]);                             // the baby: a separate case

  // Anjali (day 5): fever with a painful red breast, one infection case with two signs
  await saveLog(anjali, 3, "AMBER", ["Fever", "Painful red breast"]);

  // The blood pressure case "became Immediate" a few minutes ago, so a judge sees a live countdown and the escalation ladder is still ahead of it.
  const { data: bp } = await admin.from("cases").select("id").eq("mother_id", priya).eq("concern", "HYPERTENSIVE").neq("status", "resolved").limit(1);
  if (bp?.[0]) await recomputeCase(admin, bp[0].id, { anchor: ago(5 / 60) });
}

/** Put the demo mothers' alerts, cases, actions and requests back exactly as the seed made them. Audit records are never deleted (they are append-only). */
export async function resetDemo(admin: SupabaseClient) {
  const { data: moms } = await admin.from("profiles").select("id, full_name").eq("is_demo", true).eq("role", "mother");
  const ids = (moms ?? []).map((m: any) => m.id as string);
  const priya = (moms ?? []).find((m: any) => m.full_name === "Priya Verma")?.id as string | undefined;
  const anjali = (moms ?? []).find((m: any) => String(m.full_name).startsWith("Anjali"))?.id as string | undefined;
  if (!ids.length || !priya || !anjali) return { ok: false as const, reason: "demo mothers are not set up yet" };
  const { data: rohan } = await admin.from("profiles").select("id").eq("is_demo", true).eq("full_name", "Rohan Verma").maybeSingle();

  await admin.from("consent_requests").delete().in("mother_id", ids);
  await admin.from("cases").delete().in("mother_id", ids);                       // takes its events and actions with it
  await admin.from("signals").delete().in("mother_id", ids);
  await admin.from("partner_screens").delete().in("mother_id", ids);
  await admin.from("symptom_logs").delete().in("mother_id", ids);

  // her consent as the demo is set up: Rohan's alerts ON, Kamla's OFF, sharing on
  await admin.from("mothers").update({ consent_share_pro: true, consent_emergency_alert: true }).eq("id", priya);
  await admin.from("family_members").update({ sees_alerts: true }).eq("mother_id", priya).eq("name", "Rohan");
  await admin.from("family_members").update({ sees_alerts: false }).eq("mother_id", priya).eq("name", "Kamla");

  // every mother's screenings become signals again, oldest first
  for (const id of ids) {
    const { data: ep } = await admin.from("epds_results").select("id, total, band, self_harm, created_at").eq("mother_id", id).order("created_at");
    for (const e of ep ?? []) await recordAll(admin, deriveFromEpds(id, e as any));
  }
  await seedStory(admin, { priya, anjali, rohan: (rohan as any)?.id ?? null });
  return { ok: true as const, mothers: ids.length };
}

// ---------- the live storm ----------
export const STORM_TOTAL = STORM.length;

/** Record one step of the storm for Priya, right now. Step 0 clears her alerts and cases first so the climb starts from nothing. */
export async function stormStep(admin: SupabaseClient, step: number) {
  const { data: p } = await admin.from("profiles").select("id").eq("is_demo", true).eq("full_name", "Priya Verma").maybeSingle();
  const priya = (p as any)?.id as string | undefined;
  if (!priya) return { ok: false as const, reason: "demo mothers are not set up yet" };
  if (step < 0 || step >= STORM.length) return { ok: false as const, reason: "no such step" };

  if (step === 0) {
    await admin.from("consent_requests").delete().eq("mother_id", priya);
    await admin.from("cases").delete().eq("mother_id", priya);
    await admin.from("signals").delete().eq("mother_id", priya);
  }
  const s = STORM[step];
  let followUpOf: string | null = null;
  if (s.followUpOfRed) {
    const { data } = await admin.from("signals").select("id").eq("mother_id", priya).eq("origin_table", "storm").eq("code", "bp_raised").eq("severity", "red").order("observed_at", { ascending: false }).limit(1);
    followUpOf = data?.[0]?.id ?? null;
  }
  const now = new Date().toISOString();
  await recordSignal(admin, {
    motherId: priya, subject: s.subject ?? "mother", source: s.source, code: s.code, concern: s.concern, severity: s.severity, value: s.value ?? null,
    observedAt: now, originTable: "storm", originId: crypto.randomUUID(), followUpOf, forceNotify: s.followUpOfRed,
  });
  const [{ count: alerts }, { count: cases }] = await Promise.all([
    admin.from("signals").select("id", { count: "exact", head: true }).eq("mother_id", priya),
    admin.from("cases").select("id", { count: "exact", head: true }).eq("mother_id", priya).neq("status", "resolved"),
  ]);
  return { ok: true as const, step, total: STORM.length, alerts: alerts ?? 0, cases: cases ?? 0 };
}
