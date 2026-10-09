import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assign } from "../routing/assign";
import type { Concern, ProLoad, RoutingResult, Specialty } from "../types/cases";

// Continuity of care, server side: gather who is on duty, how busy they are, and which professionals a mother already knows, then let
// the pure assign() function choose. If the 010 migration has not been run, or nobody fits, everything falls back to the old behaviour:
// tell every professional matched with her.

export type Ctx = {
  pros: ProLoad[];
  preferred: Map<string, { specialty: Specialty; proId: string }[]>;
  history: Map<string, { proId: string; sessions: number }[]>;
};

const URGENT_FLAGS = ["q10", "red", "selfharm"];

/** Open Immediate and Urgent items per professional. Until cases exist (next challenge) this is the open flags of the mothers matched with them. */
let proCache: { at: number; list: ProLoad[] } | null = null;   // opening several cases in a row (the seed, the storm) asks the same question each time

export async function loadPros(admin: SupabaseClient): Promise<ProLoad[]> {
  if (proCache && Date.now() - proCache.at < 8000) return proCache.list;
  const list = await loadProsFresh(admin);
  if (list.length) proCache = { at: Date.now(), list };
  return list;
}

async function loadProsFresh(admin: SupabaseClient): Promise<ProLoad[]> {
  const { data: pros, error } = await admin.from("pros").select("id, specialty, on_duty, is_on_call, max_open_cases, profiles(full_name)");
  if (error || !pros) return [];
  const [{ data: links }, { data: flags }] = await Promise.all([
    admin.from("pro_patients").select("pro_id, mother_id"),
    admin.from("flags").select("mother_id, kind").eq("resolved", false),
  ]);
  const perMother = new Map<string, number>();
  for (const f of flags ?? []) perMother.set(f.mother_id, (perMother.get(f.mother_id) ?? 0) + (URGENT_FLAGS.includes(f.kind) || f.kind === "epds" ? 1 : 0));
  const load = new Map<string, number>();
  for (const l of links ?? []) load.set(l.pro_id, (load.get(l.pro_id) ?? 0) + (perMother.get(l.mother_id) ?? 0));
  return pros.map((p: any) => ({
    id: p.id, name: p.profiles?.full_name ?? "", specialty: (p.specialty ?? null) as Specialty | null, onDuty: p.on_duty !== false,
    isOnCall: !!p.is_on_call, maxOpen: p.max_open_cases ?? 5, openLoad: load.get(p.id) ?? 0,
  }));
}

export async function loadContext(admin: SupabaseClient, motherIds: string[]): Promise<Ctx> {
  const ctx: Ctx = { pros: await loadPros(admin), preferred: new Map(), history: new Map() };
  if (!motherIds.length || !ctx.pros.length) return ctx;
  const [{ data: prefs }, { data: bookings }] = await Promise.all([
    admin.from("care_preferences").select("mother_id, specialty, pro_id").in("mother_id", motherIds),
    admin.from("bookings").select("mother_id, pro_id, status, starts_at").in("mother_id", motherIds).neq("status", "cancelled"),
  ]);
  for (const p of prefs ?? []) ctx.preferred.set(p.mother_id, [...(ctx.preferred.get(p.mother_id) ?? []), { specialty: p.specialty, proId: p.pro_id }]);
  const doneBefore = Date.now() - 3600000; // a booked session counts once its time passed more than an hour ago
  const counts = new Map<string, Map<string, number>>();
  for (const b of bookings ?? []) {
    if (!(b.status === "done" || (b.status === "booked" && new Date(b.starts_at).getTime() < doneBefore))) continue;
    const m = counts.get(b.mother_id) ?? new Map<string, number>();
    m.set(b.pro_id, (m.get(b.pro_id) ?? 0) + 1);
    counts.set(b.mother_id, m);
  }
  for (const [mother, m] of counts) ctx.history.set(mother, [...m].map(([proId, sessions]) => ({ proId, sessions })));
  return ctx;
}

export const ownerOf = (ctx: Ctx, motherId: string, concern: Concern): RoutingResult =>
  assign({ concern, preferred: ctx.preferred.get(motherId) ?? [], history: ctx.history.get(motherId) ?? [], pros: ctx.pros });
