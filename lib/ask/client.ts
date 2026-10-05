"use client";
import { ASK, AskOutcome, Ranked, decideAsk } from "./engine";

/**
 * Called after the on-device emergency check. If she allowed smarter matching, her words (never her name) go to our matching
 * service to find the best prewritten answer. Any failure silently falls back to on-device matching.
 */
export async function findAnswer(text: string, cloudOk: boolean): Promise<AskOutcome> {
  const t = text.slice(0, ASK.maxChars);
  if (!cloudOk) return decideAsk(t, null);
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4500);
    const res = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t }), signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(String(res.status));
    const { matches } = (await res.json()) as { matches: Ranked[] };
    return decideAsk(t, matches);
  } catch {
    return decideAsk(t, null);
  }
}
