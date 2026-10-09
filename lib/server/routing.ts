import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prosOf } from "./notify";
import { loadContext, ownerOf } from "./routingCore";
import type { Concern } from "../types/cases";

export { loadContext, ownerOf, loadPros } from "./routingCore";
export type { Ctx } from "./routingCore";

/**
 * Who to tell about an alert. Safety alerts (and anything we cannot place) go to everyone matched with her, as before.
 * Other concerns go to the professional who owns that concern for her: the doctor she already knows, else the least busy colleague.
 * The owner is matched with her so they can see her record (what she shares is still decided by her consent).
 */
export async function notifyTargets(admin: SupabaseClient, motherId: string, concerns: Concern[], opts: { everyone?: boolean } = {}): Promise<string[]> {
  const everyone = await prosOf(admin, motherId);
  if (opts.everyone || !concerns.length || concerns.includes("SELF_HARM")) return everyone;
  try {
    const ctx = await loadContext(admin, [motherId]);
    const owners = new Set<string>();
    for (const c of concerns) {
      const r = ownerOf(ctx, motherId, c);
      if (!r.proId) return everyone; // nobody of that specialty: keep the old behaviour so the alert is never lost
      owners.add(r.proId);
    }
    for (const id of owners) if (!everyone.includes(id)) await admin.from("pro_patients").upsert({ pro_id: id, mother_id: motherId });
    return [...owners];
  } catch { return everyone; }
}
