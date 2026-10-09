import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { visibleSignals } from "../signals/access";
import type { Signal } from "../types/cases";

/**
 * THE one gate for a professional reading a mother's signals. Signals have no Row Level Security policy (a policy that silently returns
 * zero rows is the worst way to fail in front of a judge), so every read goes through this check: is she their patient, and does she
 * share her records? What comes back is already filtered by visibleSignals(): red and safety alerts always, the details only while she shares.
 */
export async function canProSeeMother(admin: SupabaseClient, proId: string, motherId: string): Promise<{ matched: boolean; shares: boolean }> {
  const [{ data: link }, { data: mother }] = await Promise.all([
    admin.from("pro_patients").select("pro_id").eq("pro_id", proId).eq("mother_id", motherId).maybeSingle(),
    admin.from("mothers").select("consent_share_pro").eq("id", motherId).maybeSingle(),
  ]);
  return { matched: !!link, shares: !!mother?.consent_share_pro };
}

export const filterForPro = (signals: Signal[], shares: boolean) => visibleSignals(signals, shares);
