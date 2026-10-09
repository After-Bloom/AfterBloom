import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A1: when she is not sharing right now, when did that start? The most recent consent_log row that turned sharing off
 * (switching "share with professional" off, or pausing all sharing). Reuses consent_log, no new table. Falls back to
 * null (the screen then just says "Hidden by her choice" with no time) if nothing was logged, e.g. a demo seed where
 * sharing started off by default.
 */
export async function hiddenByConsentSince(admin: SupabaseClient, motherId: string): Promise<string | null> {
  const { data } = await admin.from("consent_log").select("key, value, at").eq("user_id", motherId).in("key", ["shareWithPro", "sharingPaused"]).order("at", { ascending: false }).limit(10);
  const hit = (data ?? []).find((r: any) => (r.key === "shareWithPro" && r.value === false) || (r.key === "sharingPaused" && r.value === true));
  return hit?.at ?? null;
}
