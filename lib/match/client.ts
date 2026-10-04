"use client";
import { MATCH } from "./config";
import { decide, Outcome, Ranked } from "./engine";

/**
 * Called after the on-device red-flag check. If she has agreed to smarter matching, her words (never her name)
 * go to our matching service. Any failure silently falls back to on-device matching.
 */
export async function findSymptoms(text: string, who: "mother" | "baby", cloudOk: boolean): Promise<Outcome & { cloudFailed?: boolean }> {
  if (!cloudOk) return decide(text, who, null);
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), MATCH.timeoutMs);
    const res = await fetch("/api/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: text.slice(0, MATCH.maxChars), who }), signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(String(res.status));
    const { matches } = (await res.json()) as { matches: Ranked[] };
    return decide(text, who, matches);
  } catch {
    return { ...decide(text, who, null), cloudFailed: true };
  }
}
