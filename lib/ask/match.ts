// Ask Bloom matching, rules only. No AI model, no network: the same code runs on the phone and in tests.
// It only CHOOSES which prewritten answer to show. If it is not sure, it shows "Did you mean...?" or says it has no answer.
import { TOPICS } from "./knowledge.ts";
import type { Topic } from "./knowledge.ts";
import { tokens, same, subject } from "./text.ts";
import { KEYWORDS, NOT } from "./keywords.ts";

/** Thresholds, tuned on data/ask-eval.json (held-out questions). Change only after re-running the eval. */
export const RULES = {
  answer: 0.66,   // show one answer automatically at or above this score...
  margin: 0.08,   // ...and only if it beats the runner-up by this much
  maybe: 0.4,     // offer under "Did you mean...?" at or above this score
  maxMaybe: 3,
  maxChars: 300,
  unknown: 0.5,   // weight of a word no answer uses, as a share of the rarest word's weight
  bag: 0.9,       // topic-word score is worth slightly less than matching one whole phrase
  context: 0.6,   // fixed weight for time and place words: they never decide a topic on their own
  demote: 0.1,    // for look-alike pairs, the side about the wrong person loses this much
};

/** Time and place words: useful as context, never the deciding word ("crying for HOURS" is about crying). */
const CONTEXT = new Set(["#hour", "#day", "#week", "#month", "#home", "#delivery", "#baby"]);

export type Ranked = { id: string; score: number };
export type Outcome = { answer?: Topic; maybe: Topic[]; ranked: Ranked[]; clarify?: "who" };

/** Pairs that look alike in words but are about different people. If both are in play and the question
 *  mentions both her and the baby, we ask "About you or your baby?" instead of guessing. */
export const WHO_PAIRS: [string, string][] = [["blues_vs_ppd", "b_cry"], ["sleep", "b_sleep"], ["diet", "b_only_milk"], ["afterpains", "b_feeds"]];

type Prepared = { id: string; phrases: string[][]; bag: string[]; not: string[] };
const PREP: Prepared[] = TOPICS.map((t) => {
  const phrases = [t.title, t.hi_title, ...t.asks].map(tokens).filter((p) => p.length);
  const keys = (KEYWORDS[t.id] ?? []).flatMap(tokens);
  return { id: t.id, phrases, bag: [...new Set([...phrases.flat(), ...keys])], not: (NOT[t.id] ?? []).flatMap(tokens) };
});

// Rare words count more than common ones: "jaundice" tells us more than "baby". (IDF = inverse document frequency.)
const N = PREP.length;
const DF = new Map<string, number>();
for (const t of PREP) for (const w of t.bag) DF.set(w, (DF.get(w) ?? 0) + 1);
const MAX_IDF = Math.log(1 + N);
const idfCache = new Map<string, number>();
export function idf(w: string) {
  const hit = idfCache.get(w);
  if (hit !== undefined) return hit;
  let d = DF.get(w);
  if (d === undefined) for (const [v, dv] of DF) if (same(w, v)) { d = Math.max(d ?? 0, dv); }
  const r = CONTEXT.has(w) ? RULES.context : d ? Math.log(1 + N / d) : RULES.unknown * MAX_IDF; // a word no answer uses counts against the match ("joke", "cricket")
  idfCache.set(w, r);
  return r;
}

/** How well one library phrase explains her question, 0 to 1. */
function phraseScore(q: string[], qw: number[], p: string[]) {
  let hitQ = 0, totQ = 0, hitP = 0, totP = 0;
  q.forEach((w, i) => { totQ += qw[i]; if (p.some((x) => same(w, x))) hitQ += qw[i]; });
  for (const x of p) { const w = idf(x); totP += w; if (q.some((y) => same(y, x))) hitP += w; }
  if (!totQ || !totP) return 0;
  const coverage = hitQ / totQ;                     // how much of what she typed the phrase explains
  const fit = (hitQ + hitP) / (totQ + totP);        // and how close the phrase is to her question overall
  return 0.65 * coverage + 0.35 * fit;
}

/** Share of her question (by word weight) found anywhere in a topic's words. */
function coverage(q: string[], qw: number[], words: string[]) {
  let hit = 0, tot = 0;
  q.forEach((w, i) => { tot += qw[i]; if (words.some((x) => same(w, x))) hit += qw[i]; });
  return tot ? hit / tot : 0;
}

/** Rank every answer for one question. */
export function rank(text: string, only?: (t: Topic) => boolean): Ranked[] {
  const q = tokens(text.slice(0, RULES.maxChars));
  if (!q.length) return [];
  const qw = q.map(idf);
  return PREP.filter((t) => !only || only(TOPICS.find((x) => x.id === t.id)!))
    .map((t) => {
      const best = Math.max(0, ...t.phrases.map((p) => phraseScore(q, qw, p)));
      const bag = coverage(q, qw, t.bag);
      let s = Math.max(best, RULES.bag * bag);
      if (t.not.some((n) => q.some((w) => same(w, n)))) s *= 0.5; // a "not this topic" word halves the score
      return { id: t.id, score: Math.round(s * 1000) / 1000 };
    })
    .filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
}

const byId = (id: string) => TOPICS.find((t) => t.id === id)!;

/** Decide: one answer, a short "Did you mean...?" list, or nothing. It never guesses. */
export function decide(text: string, only?: (t: Topic) => boolean): Outcome {
  let ranked = rank(text, only);
  const who = subject(text);
  if (who === "me" || who === "baby") {
    // she said who it is about: the other side of a look-alike pair drops a little ("I keep crying" is not the baby crying)
    const wrongSide = (id: string) => WHO_PAIRS.some(([mum, baby]) => (who === "me" ? id === baby : id === mum));
    ranked = ranked.map((r) => (wrongSide(r.id) ? { ...r, score: Math.round((r.score - RULES.demote) * 1000) / 1000 } : r)).sort((a, b) => b.score - a.score);
  }
  const [first, second] = ranked;
  if (first && !only) {
    const close = ranked.filter((r) => r.score >= RULES.maybe).map((r) => r.id);
    const pair = WHO_PAIRS.find(([a, b]) => close.includes(a) && close.includes(b) && (first.id === a || first.id === b));
    if (pair && who === "both") return { maybe: [], ranked, clarify: "who" };
  }
  const sure = !!first && first.score >= RULES.answer && first.score - (second?.score ?? 0) >= RULES.margin;
  if (sure) return { answer: byId(first.id), maybe: [], ranked };
  return { maybe: ranked.filter((r) => r.score >= RULES.maybe).slice(0, RULES.maxMaybe).map((r) => byId(r.id)), ranked };
}

/** Joining words that often separate two questions in one message. */
const SPLIT = /\s*(?:\?|;|,|\band also\b|\balso\b|\band\b|\bplus\b|\baur\b|\bor phir\b|\bऔर\b|\bतथा\b|\bसाथ ही\b)\s*/i;

/** Two questions in one message ("I have cramps and my baby won't sleep") get up to two answers.
 *  A part that is not sure adds its "Did you mean...?" list. If the parts do not give at least two
 *  different topics, the whole message is treated as one question, as before. */
export function decideMany(text: string): Outcome & { answers: Topic[] } {
  const whole = decide(text);
  const parts = text.split(SPLIT).map((p) => p.trim()).filter((p) => tokens(p).some((w) => w !== "#baby" && w !== "#delivery"));
  if (parts.length >= 2) {
    const outs = parts.map((p) => decide(p));
    const answers = outs.filter((o) => o.answer).map((o) => o.answer!).filter((t, i, all) => all.findIndex((x) => x.id === t.id) === i).slice(0, 2);
    const extra = outs.find((o) => !o.answer && o.maybe.length)?.maybe.filter((t) => !answers.some((a) => a.id === t.id)) ?? [];
    if (answers.length >= 2 || (answers.length === 1 && extra.length))
      return { ranked: whole.ranked, answer: undefined, clarify: undefined, answers, maybe: extra.slice(0, RULES.maxMaybe) };
  }
  return { ...whole, answers: whole.answer ? [whole.answer] : [] };
}
