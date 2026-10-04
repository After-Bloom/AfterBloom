import { SYMPTOMS, Level } from "./symptoms";
import { EPDS_CONFIG } from "./epds";

// Clinician-editable settings (stored in the database, edited on the admin page with a sign-off record).
// Built-in values are the draft defaults. Overrides are applied in memory when someone signs in.
export const DEFAULT_LEVELS: Record<string, Level> = Object.fromEntries(SYMPTOMS.map((s) => [s.id, s.level]));
export const DEFAULT_EPDS = { possible: EPDS_CONFIG.possible, probable: EPDS_CONFIG.probable };

export function applyClinicalConfig(rows: { key: string; value: any }[] | null) {
  if (!rows) return;
  for (const r of rows) {
    if (r.key === "epds" && Number.isFinite(r.value?.possible) && Number.isFinite(r.value?.probable) && r.value.possible < r.value.probable) {
      EPDS_CONFIG.possible = r.value.possible;
      EPDS_CONFIG.probable = r.value.probable;
    }
    if (r.key === "triage_overrides") {
      const o = (r.value ?? {}) as Record<string, Level>;
      for (const s of SYMPTOMS) s.level = (["RED", "AMBER", "GREEN"].includes(o[s.id]) ? o[s.id] : DEFAULT_LEVELS[s.id]) as Level;
    }
  }
}
