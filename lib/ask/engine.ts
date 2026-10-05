import { TOPICS, Topic, topicById } from "./knowledge";

// Thresholds. Hosted scores are cosine similarity from the multilingual model; device scores come from word overlap.
export const ASK = {
  cloud: { answer: 0.8, maybe: 0.72, margin: 0.025 },
  device: { answer: 0.7, maybe: 0.38, margin: 0.1 },
  maxMaybe: 3,
  maxChars: 300,
};

export type Ranked = { id: string; score: number };
export type AskOutcome = { answer?: Topic; maybe: Topic[]; source: "device" | "cloud" | "none" };

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]+/gu, " ").replace(/\s+/g, " ").trim();
const STOP = new Set(["a", "an", "the", "is", "are", "am", "i", "my", "me", "do", "does", "can", "to", "of", "in", "on", "and", "or", "for", "it", "how", "what", "when", "why", "should", "will", "after", "with", "so", "hai", "hain", "ho", "mein", "me", "ka", "ki", "ke", "ko", "se", "kya", "kaise", "kab", "kitna", "kitne", "main", "mera", "meri", "है", "हैं", "में", "का", "की", "के", "को", "से", "क्या", "कैसे", "कब", "मैं", "मेरा", "मेरी", "hoon", "kar", "karein", "baad"]);
const words = (s: string) => norm(s).split(" ").filter((w) => w && !STOP.has(w));

// two words match if equal, or one is the start of the other (feeds/feeding, bleed/bleeding), or they differ by a typo
function same(a: string, b: string) {
  if (a === b) return true;
  const n = Math.min(a.length, b.length);
  if (n >= 4 && (a.startsWith(b.slice(0, Math.max(4, n - 2))) || b.startsWith(a.slice(0, Math.max(4, n - 2))))) return true;
  if (a.length === b.length && n >= 6) { let d = 0; for (let i = 0; i < n && d < 2; i++) if (a[i] !== b[i]) d++; return d < 2; } // one wrong letter in a long word
  return false;
}

function phraseScore(q: string[], p: string[]) {
  if (!q.length || !p.length) return 0;
  let hit = 0;
  for (const w of q) if (p.some((x) => same(w, x))) hit++;
  const coverage = hit / q.length;                  // how much of what she typed the phrase explains
  const dice = (2 * hit) / (q.length + p.length);   // and how close the phrase is in size
  return 0.65 * coverage + 0.35 * dice;
}

const PREPARED = TOPICS.map((t) => ({ id: t.id, phrases: [t.title, ...t.asks].map(words) }));

/** On-device ranking by word overlap. Works offline and sends nothing anywhere. */
export function rankOnDevice(text: string): Ranked[] {
  const q = words(text);
  return PREPARED.map((t) => ({ id: t.id, score: Math.max(...t.phrases.map((p) => phraseScore(q, p))) }))
    .filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
}

function pick(ranked: Ranked[], t: { answer: number; maybe: number; margin: number }) {
  const [first, second] = ranked;
  const answer = first && first.score >= t.answer && first.score - (second?.score ?? 0) >= t.margin ? topicById(first.id) : undefined;
  const maybe = answer ? [] : ranked.filter((r) => r.score >= t.maybe).slice(0, ASK.maxMaybe).map((r) => topicById(r.id)!).filter(Boolean);
  return { answer, maybe };
}

/** Prefer hosted matching when she allowed it and it is sure; otherwise fall back to the device result. Never guesses: no match means no answer. */
export function decideAsk(text: string, cloud: Ranked[] | null): AskOutcome {
  if (cloud?.length) {
    const c = pick(cloud, ASK.cloud);
    if (c.answer || c.maybe.length) return { ...c, source: "cloud" };
  }
  const d = pick(rankOnDevice(text), ASK.device);
  return d.answer || d.maybe.length ? { ...d, source: "device" } : { maybe: [], source: "none" };
}
