// Run with: node --test tests/epds.test.ts   (Node 22.6+, no extra dependencies)
import test from "node:test";
import assert from "node:assert/strict";
import { scoreEpds } from "../lib/epds.ts";

const ans = (total: number, q10 = 0) => { const a = Array(10).fill(0); a[9] = q10; let left = total - q10; for (let i = 0; left > 0; i = (i + 1) % 9) if (a[i] < 3) { a[i]++; left--; } return a; };

test("band boundaries: 9 low, 10 possible, 12 possible, 13 probable", () => {
  assert.equal(scoreEpds(ans(9)).band, "low");
  assert.equal(scoreEpds(ans(10)).band, "possible");
  assert.equal(scoreEpds(ans(12)).band, "possible");
  assert.equal(scoreEpds(ans(13)).band, "probable");
  assert.equal(scoreEpds(ans(30 - 3)).band, "probable");
});

test("question 10 scored 1 or more is always flagged, whatever the total", () => {
  assert.equal(scoreEpds(ans(1, 1)).selfHarm, true);
  assert.equal(scoreEpds(ans(0)).selfHarm, false);
  assert.equal(scoreEpds(ans(20, 3)).selfHarm, true);
});

test("cut-offs come from the clinician-set config", () => {
  assert.equal(scoreEpds(ans(11), { possible: 9, probable: 11 }).band, "probable");
  assert.equal(scoreEpds(ans(9), { possible: 9, probable: 11 }).band, "possible");
});
