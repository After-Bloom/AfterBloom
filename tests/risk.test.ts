// Run with: node --test tests/risk.test.ts   (Node 22.6+, no extra dependencies)
import test from "node:test";
import assert from "node:assert/strict";
import { bpPlan, bpTrend, riskTier } from "../lib/risk.ts";
import { babyNotes, weightNotes, usual } from "../lib/babylog.ts";

const DAY = 86400000;
const NOW = new Date("2026-10-10T12:00:00").getTime();
const at = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const bp = (daysAgo: number, sys: number, dia: number) => ({ date: at(daysAgo), bp: { sys, dia } });

test("risk tier: BP or heavy bleeding history is high, any other factor is watch, none is standard", () => {
  assert.equal(riskTier({ htn: true }), "high");
  assert.equal(riskTier({ pph: true, csection: true }), "high");
  assert.equal(riskTier({ csection: true }), "watch");
  assert.equal(riskTier({ set: true }), "standard");
});

test("high-risk mother is asked every day for 2 weeks, then every other day, and not after 6 weeks", () => {
  assert.equal(bpPlan({ htn: true }, 5, [], NOW).due, true);
  assert.equal(bpPlan({ htn: true }, 5, [bp(0, 120, 80)], NOW).due, false, "already done today");
  assert.equal(bpPlan({ htn: true }, 5, [bp(1, 120, 80)], NOW).due, true);
  assert.equal(bpPlan({ htn: true }, 20, [bp(1, 120, 80)], NOW).due, false, "every other day after day 14");
  assert.equal(bpPlan({ htn: true }, 20, [bp(2, 120, 80)], NOW).due, true);
  assert.equal(bpPlan({ htn: true }, 43, [], NOW).advised, false);
});

test("everyone is asked once in days 2 to 6, and a standard mother is left alone after that", () => {
  assert.equal(bpPlan({}, 4, [], NOW).due, true);
  assert.equal(bpPlan({}, 4, [bp(1, 118, 76)], NOW).due, false);
  assert.equal(bpPlan({}, 12, [], NOW).advised, false);
});

test("trend: two raised readings in a row, or a steady rise, is an amber alert", () => {
  assert.equal(bpTrend([bp(1, 142, 88), bp(0, 146, 92)], NOW)?.level, "AMBER");
  assert.equal(bpTrend([bp(3, 112, 74), bp(2, 124, 78), bp(0, 134, 82)], NOW)?.level, "AMBER");
  assert.equal(bpTrend([bp(1, 118, 76), bp(0, 122, 78)], NOW), null, "normal readings");
  assert.equal(bpTrend([bp(0, 150, 95)], NOW), null, "one reading is judged by the daily check-in, not the trend");
  assert.equal(bpTrend([bp(9, 140, 90), bp(8, 142, 92)], NOW), null, "old readings are ignored");
});

test("newborn: fewer wet nappies than usual yesterday raises a note; a normal day does not", () => {
  const day = (daysAgo: number, wet: number, feed: number) => [...Array(wet).fill(0).map(() => ({ id: "w", kind: "wet" as const, at: new Date(NOW - daysAgo * DAY + 3600000).toISOString() })), ...Array(feed).fill(0).map(() => ({ id: "f", kind: "feed" as const, at: new Date(NOW - daysAgo * DAY + 7200000).toISOString() }))];
  assert.equal(usual(7).wet, 6);
  assert.ok(babyNotes(day(1, 2, 9), 7, NOW).some((n) => /wet nappies/.test(n.text)));
  assert.ok(!babyNotes(day(1, 6, 9), 7, NOW).some((n) => /wet nappies/.test(n.text)));
  assert.ok(babyNotes(day(1, 6, 4), 7, NOW).some((n) => /fewer feeds/.test(n.text)));
});

test("weight: more than 10% below birth weight is a warning; not back to birth weight at 2 weeks is a warning", () => {
  assert.equal(weightNotes(3.0, [{ date: at(1), kg: 2.6 }], 5)[0].tone, "warn");
  assert.equal(weightNotes(3.0, [{ date: at(1), kg: 2.8 }], 5)[0].tone, "info");
  assert.equal(weightNotes(3.0, [{ date: at(1), kg: 2.9 }], 16)[0].tone, "warn");
  assert.equal(weightNotes(3.0, [{ date: at(1), kg: 3.2 }], 16).length, 0);
  assert.equal(weightNotes(null, [{ date: at(1), kg: 3.2 }], 16).length, 0);
});
