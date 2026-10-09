import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notify } from "./notify";
import { notifyTargets } from "./routing";
import { recordLoopSignal } from "./signals";
import { LOOP, LoopAnswer, LoopLevel, hoursFromNow } from "../careLoop";

/** Family are told only if she agreed in advance, and the wording never says what is wrong (safe on a shared lock screen). */
async function tellFamily(admin: SupabaseClient, motherId: string, body: string) {
  const { data: m } = await admin.from("mothers").select("consent_emergency_alert").eq("id", motherId).maybeSingle();
  if (!m?.consent_emergency_alert) return 0;
  const { data: fam } = await admin.from("family_members").select("user_id").eq("mother_id", motherId).eq("status", "active").eq("sees_alerts", true).not("user_id", "is", null);
  await Promise.all((fam ?? []).map((f) => notify(admin, f.user_id as string, { mother_id: motherId, kind: "emergency", title: "AfterBloom", body, url: "/family-view" })));
  return fam?.length ?? 0;
}

const firstName = async (admin: SupabaseClient, id: string) => {
  const { data } = await admin.from("profiles").select("full_name").eq("id", id).maybeSingle();
  return String(data?.full_name ?? "She").split(" ")[0];
};

/** Open a loop after a RED/AMBER result. Returns null if she already has a recent open one. */
export async function startLoop(admin: SupabaseClient, motherId: string, level: LoopLevel, reason: string) {
  const since = new Date(Date.now() - LOOP.dedupeHours * 3600000).toISOString();
  const { data: dupe } = await admin.from("care_loops").select("id, level").eq("mother_id", motherId).eq("status", "open").gte("created_at", since).limit(1);
  if (dupe?.length) {
    // a RED result brings an open AMBER follow-up forward instead of opening a second one
    if (level === "RED" && dupe[0].level === "AMBER") await admin.from("care_loops").update({ level: "RED", reason, check_at: hoursFromNow(LOOP.askAfterHours.RED) }).eq("id", dupe[0].id);
    return null;
  }
  const { data } = await admin.from("care_loops").insert({ mother_id: motherId, level, reason: reason.slice(0, 300), check_at: hoursFromNow(LOOP.askAfterHours[level]) }).select("*").single();
  return data;
}

/** Record her answer. "going" waits a little longer, once. Anything that means she is stuck or worse tells her people. */
export async function answerLoop(admin: SupabaseClient, motherId: string, loopId: string, answer: LoopAnswer) {
  const { data: loop } = await admin.from("care_loops").select("*").eq("id", loopId).eq("mother_id", motherId).maybeSingle();
  if (!loop || loop.status !== "open") return null;
  const now = new Date().toISOString();

  if (answer === "going") {
    const { data } = await admin.from("care_loops").update({ check_at: hoursFromNow(LOOP.goingHours) }).eq("id", loopId).select("*").single();
    return data;
  }
  const { data } = await admin.from("care_loops").update({ status: answer, answered_at: now }).eq("id", loopId).select("*").single();

  if (answer === "cant_reach" || answer === "worse") {
    const first = await firstName(admin, motherId);
    // saved as a follow-up of the alert that started this loop; a mother who says she is worse or stuck always reaches a human
    const rec = await recordLoopSignal(admin, loop, answer);
    const pros = await notifyTargets(admin, motherId, rec.signal?.relatedTo ? [rec.concern] : []);
    const why = answer === "worse" ? "says she feels worse" : "cannot get to care";
    await Promise.all(pros.map((p) => notify(admin, p, { mother_id: motherId, kind: "emergency", title: "URGENT: follow-up", body: `${first} ${why} after a ${loop.level} result (${loop.reason || "danger sign"}).`, url: "/pro" })));
    await tellFamily(admin, motherId, answer === "worse" ? `${first} needs you now. Please call her or go to her.` : `${first} may need help getting to a doctor. Please call her.`);
    await admin.from("care_loops").update({ escalated_at: now }).eq("id", loopId);
  }
  return data;
}

/** Loops nobody answered. Tell her professional, and family if she agreed. Safe to run as often as you like. */
export async function escalateOverdue(admin: SupabaseClient) {
  const cutoff = hoursFromNow(-LOOP.graceHours);
  const { data: late } = await admin.from("care_loops").select("*").eq("status", "open").lt("check_at", cutoff);
  let escalated = 0;
  for (const l of late ?? []) {
    // claim it first so two overlapping runs cannot both send
    const { data: claimed } = await admin.from("care_loops").update({ status: "no_answer", escalated_at: new Date().toISOString() }).eq("id", l.id).eq("status", "open").select("id");
    if (!claimed?.length) continue;
    const first = await firstName(admin, l.mother_id);
    const rec = await recordLoopSignal(admin, l, "no_answer"); // a follow-up of the alert that started the loop; never held back
    const pros = await notifyTargets(admin, l.mother_id, rec.signal?.relatedTo ? [rec.concern] : []);
    await Promise.all(pros.map((p) => notify(admin, p, { mother_id: l.mother_id, kind: l.level === "RED" ? "emergency" : "callback", title: l.level === "RED" ? "URGENT: no reply after emergency alert" : "No reply to follow-up", body: `${first} has not answered the follow-up after a ${l.level} result (${l.reason || "danger sign"}). Please call her.`, url: "/pro" })));
    await tellFamily(admin, l.mother_id, `${first} has not replied to AfterBloom. Please call her or go to her.`);
    escalated++;
  }
  return escalated;
}
