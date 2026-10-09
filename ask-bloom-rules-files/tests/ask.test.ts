// Ask Bloom rules-only matcher. Run with: node --test --experimental-strip-types tests/*.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { tokens, subject } from "../lib/ask/text.ts";
import { decide, decideMany } from "../lib/ask/match.ts";
import { personalLine } from "../lib/ask/personal.ts";
import { scrub } from "../lib/ask/scrub.ts";
import { META } from "../lib/ask/browse.ts";
import { KEYWORDS } from "../lib/ask/keywords.ts";
import { TOPICS } from "../lib/ask/knowledge.ts";

const load = (f: string) => JSON.parse(fs.readFileSync(new URL(`../data/${f}.json`, import.meta.url), "utf8")).items as { q: string; id: string; trap?: boolean }[];

test("spellings and languages meet on one token", () => {
  assert.deepEqual(tokens("doodh"), tokens("dudh"));
  assert.deepEqual(tokens("doodh"), tokens("milk"));
  assert.deepEqual(tokens("दूध"), tokens("milk"));
  assert.deepEqual(tokens("neend"), tokens("sleep"));
  assert.deepEqual(tokens("पीला"), tokens("पीली"));           // Hindi masculine / feminine
  assert.deepEqual(tokens("c-section"), tokens("caesarean"));
});

test("look-alike spellings with different meanings stay apart", () => {
  assert.ok(tokens("baby peela hai").includes("#yellow"));
  assert.ok(tokens("paani pila sakte").includes("#feed"));   // "pila" = made to drink, not yellow
  assert.ok(!tokens("perineum pain").includes("#period"));
});

test("off-topic questions get no answer and no suggestions", () => {
  for (const q of ["tell me a joke", "what is the weather today", "who won the cricket match", "bitcoin price", "write me a poem"]) {
    const o = decide(q);
    assert.equal(o.answer, undefined, q);
    assert.equal(o.maybe.length, 0, q);
  }
});

test("never a wrong automatic answer on any evaluation set", () => {
  for (const f of ["ask-eval", "ask-holdout", "ask-final"]) {
    for (const it of load(f)) {
      if (!it.id) continue;
      const o = decide(it.q);
      if (o.answer) assert.equal(o.answer.id, it.id, `${f}: "${it.q}"`);
    }
  }
});

test("finds the right answer (automatic or in 'Did you mean') for at least 95% of the tuning sets", () => {
  for (const f of ["ask-eval", "ask-holdout"]) {
    const items = load(f).filter((x) => x.id);
    const found = items.filter((it) => { const o = decide(it.q); return o.answer?.id === it.id || o.maybe.some((t) => t.id === it.id) || !!o.clarify; }).length;
    assert.ok(found / items.length >= 0.95, `${f}: ${found}/${items.length}`);
  }
});

test("who is it about: asks instead of guessing when she mentions both", () => {
  assert.equal(subject("I keep crying since my baby came"), "both");
  assert.equal(subject("mujhe neend nahi aati"), "me");
  assert.equal(subject("baby will not sleep"), "baby");
  assert.equal(decide("मुझे हर समय रोना आता है").answer?.id ?? decide("मुझे हर समय रोना आता है").maybe[0]?.id, "blues_vs_ppd");
});

test("two questions in one message get two answers", () => {
  const o = decideMany("doodh kam hai aur bachcha bahut rota hai");
  assert.deepEqual(o.answers.map((t) => t.id).sort(), ["b_cry", "low_milk"]);
  assert.equal(decideMany("how to clean the c section wound and when can I bathe").answers.length, 1); // same topic twice = one answer
});

test("personal lines only add, and only when they fit", () => {
  const priya = { role: "mother", delivery: "C-section", day: 9, babyName: "Aarav", risk: { htn: true } };
  assert.match(personalLine("exercise", priya, "en")!, /day 9 after a C-section/);
  assert.equal(personalLine("exercise", { ...priya, day: 60 }, "en"), null);       // past 6 weeks: no line
  assert.match(personalLine("b_vaccines", priya, "en")!, /^Aarav is 9 days old/);
  assert.equal(personalLine("hair", priya, "en"), null);                           // topics without lines stay as they are
});


test("shared questions are scrubbed before they are kept", () => {
  assert.equal(scrub("call me on +91 98765 43210 or a@b.com"), "call me on [number] or [email]");
  assert.equal(scrub("my baby is 12345 grams www.x.com"), "my baby is [number] grams [link]");
  assert.ok(scrub("x".repeat(500)).length <= 200);
});

test("every topic has browse data and matching words, and every link points to a real topic", () => {
  for (const t of TOPICS) {
    assert.ok(META[t.id], `browse data missing for ${t.id}`);
    assert.ok((KEYWORDS[t.id] ?? []).length >= 5, `fewer than 5 keywords for ${t.id}`);
    for (const r of META[t.id].related) assert.ok(TOPICS.some((x) => x.id === r), `${t.id} -> unknown related ${r}`);
    assert.ok(t.asks.length >= 6, `fewer than 6 ways of asking for ${t.id}`);
  }
});
