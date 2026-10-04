import { Symptom, bySymptomId } from "../symptoms";
import { extractNumeric, matchSymptoms, stripNegated } from "../triage";
import { MATCH } from "./config";
import { OFF_TOPIC_ID } from "./phrases";

export type Ranked = { id: string; score: number }; // hosted cosine scores, best first
export type Candidate = { symptom: Symptom; score: number; via: "device" | "cloud" };
export type Outcome = {
  /** confident matches: go straight on */
  auto: Symptom[];
  /** "Did you mean...?" options (RED matches found only by hosted matching always land here so she confirms) */
  maybe: Candidate[];
  source: "device" | "cloud";
  /** hosted matching sensed language about self-harm that the on-device check did not catch: show the crisis screen (gentle, resources only) */
  safety?: "selfharm";
};

/**
 * Merge the three signals. Order of trust: numbers she typed, then strong on-device phrase matches,
 * then hosted matches. Hosted matching can never create an emergency by itself: a RED symptom it finds is only offered.
 */
export function decide(text: string, who: "mother" | "baby", cloud: Ranked[] | null): Outcome {
  const cleaned = stripNegated(text);
  const numeric = extractNumeric(text, who);
  const local = matchSymptoms(cleaned, who);

  const autoMap = new Map<string, Symptom>();
  numeric.forEach((s) => autoMap.set(s.id, s));
  local.auto.forEach((m) => autoMap.set(m.symptom.id, m.symptom));

  const maybe = new Map<string, Candidate>();
  const offer = (c: Candidate) => { const cur = maybe.get(c.symptom.id); if (!cur || c.score > cur.score) maybe.set(c.symptom.id, c); };
  local.maybe.forEach((m) => offer({ symptom: m.symptom, score: m.score, via: "device" }));

  let safety: Outcome["safety"];
  if (cloud?.length) {
    const harm = cloud.find((r) => r.id === "self_harm");
    if (harm && harm.score >= MATCH.selfHarmAbove) safety = "selfharm";
    // if what she typed is closest to an everyday off-topic phrase, offer no symptom at all
    const offTopic = cloud.find((r) => r.id === OFF_TOPIC_ID);
    const real = cloud.filter((r) => r.id !== OFF_TOPIC_ID && r.id !== "self_harm" && bySymptomId(r.id)?.who === who);
    const top = offTopic && offTopic.score >= (real[0]?.score ?? 0) - MATCH.offTopicSlack ? [] : real;
    const [first, second] = top;
    if (first && first.score >= MATCH.autoAbove && first.score - (second?.score ?? 0) >= MATCH.margin) {
      const s = bySymptomId(first.id);
      if (s.level === "RED") offer({ symptom: s, score: first.score, via: "cloud" });
      else autoMap.set(s.id, s);
    }
    for (const r of top) {
      if (r.score < MATCH.maybeAbove || autoMap.has(r.id)) continue;
      offer({ symptom: bySymptomId(r.id), score: r.score, via: "cloud" });
    }
  }

  const auto = [...autoMap.values()];
  const options = [...maybe.values()].filter((c) => !autoMap.has(c.symptom.id)).sort((a, b) => b.score - a.score).slice(0, MATCH.maxMaybe);
  return { auto, maybe: auto.length ? [] : options, source: cloud?.length ? "cloud" : "device", safety };
}
