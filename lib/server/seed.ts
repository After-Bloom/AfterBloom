import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_HOSPITAL, DEMO_MOTHERS, DEMO_POSTS, DEMO_PROS, DEMO_STAFF } from "../mock";
import { encrypt } from "./crypto";
import { assignCircle, assignPro } from "./onboard";
import { loadContext, ownerOf } from "./routingCore";
import { recordAll, recordSignal, symptomLookup } from "./signals";
import { deriveFromEpds, deriveFromSymptomLog, derivePartnerScreen } from "../signals/derive";

const DAY = 86400000;
// every write is checked: a seed that silently half-works is worse than one that stops with a clear message
async function must<T extends { error: any }>(label: string, p: PromiseLike<T>): Promise<T> {
  const r = await p;
  if (r.error) throw new Error(`${label}: ${r.error.message}`);
  return r;
}
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

async function user(admin: SupabaseClient, email: string, name: string, role: string, pw: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true, app_metadata: { role }, user_metadata: { name } });
  if (data?.user) return data.user.id;
  if (!error) throw new Error("no user");
  // already exists: find it
  for (let page = 1; page < 20; page++) {
    const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const hit = (list?.users as any[] | undefined)?.find((u) => u.email === email);
    if (hit) { await admin.auth.admin.updateUserById(hit.id, { password: pw, app_metadata: { role }, user_metadata: { name } }); return hit.id; }
    if (!list?.users.length || list.users.length < 200) break;
  }
  throw new Error(`could not create or find ${email}: ${error.message}`);
}

/** Delete every demo account. Cascades remove their data. */
export async function wipeDemo(admin: SupabaseClient) {
  const { data: demos } = await admin.from("profiles").select("id").eq("is_demo", true);
  for (const d of demos ?? []) await admin.auth.admin.deleteUser(d.id);
  return demos?.length ?? 0;
}

/** Split a total across 10 EPDS answers (each 0 to 3) so the stored answers match the stored total. */
function answersFor(total: number, selfHarm: boolean) {
  const a = Array(10).fill(0);
  let left = total - (selfHarm ? 1 : 0);
  if (selfHarm) a[9] = 1;
  for (let i = 0; left > 0; i = (i + 1) % 9) { if (a[i] < 3) { a[i]++; left--; } }
  return a;
}

export async function seedDemo(admin: SupabaseClient, password: string) {
  const log: string[] = [];
  await must("hospitals upsert", admin.from("hospitals").upsert({ id: DEMO_HOSPITAL, name: "Sample Maternity Hospital", city: "Delhi", partner: true }));

  // ---- professionals ----
  const proIds: Record<string, string> = {};
  for (const p of DEMO_PROS) {
    const id = await user(admin, p.email, p.name, "pro", password);
    proIds[p.key] = id;
    await must("profiles upsert", admin.from("profiles").upsert({ id, role: "pro", full_name: p.name, lang: "en", city: "Delhi", hospital_id: DEMO_HOSPITAL, is_demo: true }));
    const base = { id, title: p.title, qualification: p.qualification, reg_no: p.reg_no, langs: p.langs, fee: p.fee, bio: p.bio, is_sample: true, accepting: true };
    const routing = { specialty: p.specialty, on_duty: p.onDuty !== false, max_open_cases: p.maxOpen ?? 5, is_on_call: !!p.onCall };
    const withRouting = await admin.from("pros").upsert({ ...base, ...routing });
    if (withRouting.error) await must("pros upsert", admin.from("pros").upsert(base)); // migration 010 not run yet: seed without the routing columns
  }
  log.push(`${DEMO_PROS.length} sample professionals`);

  // ---- staff ----
  const staff: Record<string, string> = {};
  for (const [k, v] of Object.entries(DEMO_STAFF)) {
    const id = await user(admin, v.email, v.name, v.role, password);
    staff[k] = id;
    await must("profiles upsert", admin.from("profiles").upsert({ id, role: v.role, full_name: v.name, lang: "en", city: "Delhi", hospital_id: DEMO_HOSPITAL, is_demo: true }));
  }

  // ---- mothers ----
  const mothers: Record<string, string> = {};
  for (const m of DEMO_MOTHERS) {
    const id = await user(admin, m.email, m.name, "mother", password);
    mothers[m.key] = id;
    const birth = isoDay(daysAgo(m.day));
    await must("profiles upsert", admin.from("profiles").upsert({ id, role: "mother", full_name: m.name, lang: "en", city: m.city, hospital_id: DEMO_HOSPITAL, is_demo: true }));
    await must("mothers upsert", admin.from("mothers").upsert({
      id, baby_name: m.baby, birth_date: birth, delivery: m.delivery, city: m.city, hospital_id: DEMO_HOSPITAL,
      emergency_contact_name: m.family ? "Rohan (husband)" : null, emergency_contact_phone: m.family ? "+91 98000 00000" : null,
      consent_share_pro: true, consent_emergency_alert: !!m.emergencyAlert, consent_family_note: false, phone: `+91 98${String(10000 + DEMO_MOTHERS.indexOf(m) * 1111).padStart(5, "0")}00`, baby_sex: DEMO_MOTHERS.indexOf(m) % 2 ? "boy" : "girl",
    }));
    await admin.from("pro_patients").delete().eq("mother_id", id);
    if (!m.routed) await must("pro_patients upsert", admin.from("pro_patients").upsert({ pro_id: proIds.drrao, mother_id: id })); // the others are matched by the routing rules below
    if (m.risk) await admin.from("mothers").update({ risk: m.risk }).eq("id", id);
    await must("asha_assignments upsert", admin.from("asha_assignments").upsert({ asha_id: staff.asha, mother_id: id }));

    // clear then write history so re-seeding is clean
    await Promise.all(["signals", "checkins", "epds_results", "flags", "baby_vaccines", "baby_growth", "symptom_logs", "partner_screens"].map((t) => admin.from(t).delete().eq("mother_id", id)));
    const n = m.mood.length;
    await must("checkins insert", admin.from("checkins").insert(m.mood.map((mood, i) => ({
      mother_id: id, day: isoDay(daysAgo(n - i)), mood, appetite: m.appetite?.[i] ?? Math.min(5, Math.max(1, mood + (i % 3 === 0 ? -1 : 0))), sleep_hours: m.sleep[i], level: "GREEN",
      bp_sys: m.bpSeries ? m.bpSeries[i].sys : m.bp && i === n - 1 ? m.bp.sys : null, bp_dia: m.bpSeries ? m.bpSeries[i].dia : m.bp && i === n - 1 ? m.bp.dia : null,
    }))));
    for (const e of m.epds) {
      const band = e.score >= 13 ? "probable" : e.score >= 10 ? "possible" : "low";
      const { data: er } = await must("epds_results insert", admin.from("epds_results").insert({ mother_id: id, total: e.score, band, self_harm: false, answers_enc: encrypt(JSON.stringify(answersFor(e.score, false))), created_at: daysAgo(e.daysAgo).toISOString() }).select("id, created_at").single());
      if (er) await recordAll(admin, deriveFromEpds(id, { id: er.id, total: e.score, band, self_harm: false, created_at: er.created_at })); // every screening is also a signal, in the order it happened
    }
    if (m.flagAgoH) {
      const created = new Date(Date.now() - m.flagAgoH * 3600000);
      await must("flags insert", admin.from("flags").insert({ mother_id: id, kind: "epds", text: `EPDS ${m.epds[m.epds.length - 1].score}: probable depression`, created_at: created.toISOString(), due_at: new Date(created.getTime() + 48 * 3600000).toISOString() }));
    }
    await must("baby_vaccines insert", admin.from("baby_vaccines").insert({ mother_id: id, vaccine_id: "birth" }));
    await must("baby_growth insert", admin.from("baby_growth").insert({ mother_id: id, on_date: birth, weight_kg: 3.1, length_cm: 50 }));
  }
  log.push(`${DEMO_MOTHERS.length} sample mothers with history`);

  // ---- continuity of care ----
  // Mothers without a doctor yet are matched by the routing rules: on duty, below their limit, least busy, else the on-call backup.
  // Dr Rao is at capacity (Anita's open callback), so Kavya, a new mother with a mood concern, goes to Dr Sen.
  const ctx = await loadContext(admin, []);
  for (const m of DEMO_MOTHERS.filter((x) => x.routed)) {
    const owner = ownerOf(ctx, mothers[m.key], m.key === "anjali" ? "INFECTION" : "MOOD");
    if (owner.proId) await admin.from("pro_patients").upsert({ pro_id: owner.proId, mother_id: mothers[m.key] });
    await assignPro(admin, mothers[m.key]); // everyone also has a psychologist, so a mood screening always reaches a human
  }
  // Priya is a returning patient: two sessions with Dr Rao and one with Dr Mehta, so "Your doctors" has someone to offer
  const priya = mothers.priya;
  await admin.from("pro_patients").upsert({ pro_id: proIds.mehta, mother_id: priya });
  await admin.from("bookings").delete().eq("mother_id", priya).eq("status", "done");
  await admin.from("bookings").insert([
    { mother_id: priya, pro_id: proIds.drrao, starts_at: new Date(Date.now() - 11 * DAY).toISOString(), status: "done" },
    { mother_id: priya, pro_id: proIds.drrao, starts_at: new Date(Date.now() - 5 * DAY).toISOString(), status: "done" },
    { mother_id: priya, pro_id: proIds.mehta, starts_at: new Date(Date.now() - 7 * DAY).toISOString(), status: "done" },
  ]);
  await admin.from("care_preferences").delete().eq("mother_id", priya);
  await admin.from("care_preferences").insert([{ mother_id: priya, specialty: "psychologist", pro_id: proIds.drrao, set_by: "booking" }, { mother_id: priya, specialty: "gynaecologist", pro_id: proIds.mehta, set_by: "booking" }]);
  log.push("continuity of care: Priya has seen Dr Rao (2 sessions) and Dr Mehta (1); Kavya and Anjali were matched by the routing rules");

  // ---- the related-alerts story, run through the real linking rules ----
  // Every time is relative to now, so it looks the same whenever a judge opens it. Nothing is hand-labelled: each alert is recorded by
  // recordSignal(), so the "repeat", "follow-up", "also reported" and "possibly related" labels on screen come from the real rules.
  const ago = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
  const rec = (h: number, source: "checkin" | "symptom_checker", code: string, concern: "HYPERTENSIVE", severity: "amber" | "red", value: Record<string, number> | null = null) =>
    recordSignal(admin, { motherId: priya, subject: "mother", source, code, concern, severity, value, observedAt: ago(h), originTable: "checkins", originId: crypto.randomUUID() });
  const saveLog = async (mother: string, h: number, level: "RED" | "AMBER", labels: string[]) => {
    const { data } = await admin.from("symptom_logs").insert({ mother_id: mother, level, labels, created_at: ago(h) }).select("id, level, labels, created_at").single();
    if (data) await recordAll(admin, deriveFromSymptomLog(mother, data as any, symptomLookup));
  };

  // partner screening by Rohan (30 hours ago): joins her mood concern
  const { data: ps } = await admin.from("partner_screens").insert({ mother_id: priya, by_user: staff.rohan, yes_count: 4, answers: [1, 1, 1, 1, 0, 0], created_at: ago(30) }).select("id, created_at").single();
  if (ps) await recordAll(admin, derivePartnerScreen(priya, { id: ps.id, yes: 4, total: 6, created_at: ps.created_at }));

  await rec(26, "checkin", "bp_raised", "HYPERTENSIVE", "amber", { sys: 142, dia: 90 });                 // morning reading, no headache: opens the blood pressure concern
  const red = await rec(13, "checkin", "bp_raised", "HYPERTENSIVE", "red", { sys: 148, dia: 94 });        // evening, now with a headache: amber to red, so it tells the care team again
  await rec(13, "checkin", "headache", "HYPERTENSIVE", "amber");
  await saveLog(priya, 12.6, "RED", ["Severe headache with blurred vision", "Headache"]);                 // reported again in the symptom checker: also reported, held back
  await saveLog(priya, 12.2, "AMBER", ["Dizzy or faint when standing"]);                                  // dizziness (bleeding) with raised BP: possibly related, a clinician confirms
  await recordSignal(admin, { motherId: priya, subject: "mother", source: "care_loop", code: "loop_no_reply", concern: "HYPERTENSIVE", severity: "red", observedAt: ago(8), originTable: "care_loops", originId: crypto.randomUUID(), followUpOf: red.signal?.id ?? null, forceNotify: true }); // no reply to "did you get care?"
  await rec(2, "checkin", "bp_raised", "HYPERTENSIVE", "red", { sys: 152, dia: 96 });                       // raised again: a repeat
  await recordSignal(admin, { motherId: priya, subject: "mother", source: "callback", code: "callback_overdue", concern: "HYPERTENSIVE", severity: "red", observedAt: ago(1), originTable: "flags", originId: crypto.randomUUID(), followUpOf: red.signal?.id ?? null, forceNotify: true });
  await saveLog(priya, 5, "AMBER", ["Yellowish skin or eyes"]);                                            // the baby: a separate concern

  // Anjali (day 5): fever with a painful red breast, one infection concern with two signs
  await saveLog(mothers.anjali, 3, "AMBER", ["Fever", "Painful red breast"]);
  log.push("Priya: her alerts from the last two days were run through the real linking rules (repeat, follow-up, also reported, possibly related, a separate baby concern)");

  // ---- Priya's family: Rohan ----
  await admin.from("family_members").delete().eq("mother_id", mothers.priya);
  await must("profiles upsert", admin.from("profiles").upsert({ id: staff.rohan, role: "family", full_name: DEMO_STAFF.rohan.name, lang: "en", city: "Delhi", hospital_id: DEMO_HOSPITAL, is_demo: true }));
  await must("family_members insert", admin.from("family_members").insert({ mother_id: mothers.priya, user_id: staff.rohan, name: "Rohan", relation: "Husband", status: "active", sees_alerts: true, sees_trends: false, sees_weekly: true }));

  // ---- one circle for everyone, mentored by the moderator ----
  const birthMonth = isoDay(daysAgo(9));
  const circleId = await assignCircle(admin, mothers.priya, birthMonth, "Delhi", "en", "Priya");
  await must("circles update", admin.from("circles").update({ mentor_id: staff.moderator, name: "Bloom Circle · Delhi" }).eq("id", circleId));
  for (const m of DEMO_MOTHERS.filter((x) => x.key !== "priya")) {
    await must("circle_members upsert", admin.from("circle_members").upsert({ circle_id: circleId, user_id: mothers[m.key], alias: m.name.split(" ")[0] }));
    await must("mothers update", admin.from("mothers").update({ circle_id: circleId }).eq("id", mothers[m.key]));
  }
  await must("circle_members upsert", admin.from("circle_members").upsert({ circle_id: circleId, user_id: staff.moderator, alias: "Bloom Buddy Kavita" }));
  await admin.from("posts").delete().eq("circle_id", circleId);
  for (const p of DEMO_POSTS) {
    const { data: post } = await must("posts insert", admin.from("posts").insert({ circle_id: circleId, alias: p.alias, anon: !!p.anon, topic: p.topic, text: p.text, created_at: new Date(Date.now() - p.hoursAgo * 3600000).toISOString() }).select("id").single());
    const author = p.mod ? staff.moderator : p.alias === "Meera" ? mothers.meera : mothers.sunita;
    if (post) await must("post_authors insert", admin.from("post_authors").insert({ post_id: post.id, author_id: author }));
  }
  await admin.from("circle_events").delete().eq("circle_id", circleId);
  await must("circle_events insert", admin.from("circle_events").insert({ circle_id: circleId, host_id: proIds.shah, title: "Ask the gynaecologist: recovery after delivery", starts_at: new Date(Date.now() + 5 * DAY + 18 * 3600000).toISOString(), created_by: staff.moderator }));
  await must("circle_events insert", admin.from("circle_events").insert({ circle_id: circleId, host_id: proIds.nair, title: "Feeding and latching: live Q&A", starts_at: new Date(Date.now() + 12 * DAY + 18 * 3600000).toISOString(), created_by: staff.moderator }));
  // ASHA visits already done for Anita (day 31): 3, 7, 14, 21, 28
  await admin.from("asha_visits").delete().eq("asha_id", staff.asha);
  await admin.from("asha_visits").insert([3, 7, 14, 21, 28].map((d) => ({ asha_id: staff.asha, mother_id: mothers.anita, day: d, done_on: isoDay(daysAgo(31 - d)) })));
  await admin.from("asha_visits").insert([3, 7].map((d) => ({ asha_id: staff.asha, mother_id: mothers.priya, day: d === 3 ? 3 : 7, done_on: isoDay(daysAgo(9 - d)) })).filter((v) => v.day <= 9));
  log.push("1 circle with an opening conversation and 2 expert sessions");
  return { ok: true, log, mothers: Object.keys(mothers), password };
}
