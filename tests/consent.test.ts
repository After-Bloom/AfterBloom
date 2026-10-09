// Run with: node --test tests/consent.test.ts   (Node 22.6+, no extra dependencies)
// B8 (pause all sharing) and A3 (mood/EPDS/partner-screen values stay blurred until shown).
import test from "node:test";
import assert from "node:assert/strict";
import { effectiveShares, isIndefinitePause, PAUSE_INDEFINITE } from "../lib/consent.ts";
import { blurSensitive, isSensitive } from "../lib/signals/blur.ts";
import type { Concern, Signal } from "../lib/types/cases.ts";

const NOW = new Date("2026-10-10T12:00:00Z").getTime();

test("a pause hides sharing until it passes, same as switching it off", () => {
  assert.equal(effectiveShares(true, null, NOW), true);
  assert.equal(effectiveShares(true, new Date(NOW + 3600000).toISOString(), NOW), false);     // still paused
  assert.equal(effectiveShares(true, new Date(NOW - 3600000).toISOString(), NOW), true);      // pause has passed
  assert.equal(effectiveShares(false, null, NOW), false);                                     // her switch still wins when not paused
});

test("an indefinite pause (the far-future sentinel) is recognised as never-ending", () => {
  assert.equal(isIndefinitePause(PAUSE_INDEFINITE), true);
  assert.equal(isIndefinitePause(new Date(NOW + 86400000).toISOString()), false);
  assert.equal(isIndefinitePause(null), false);
});

const sig = (concern: Concern, value: Record<string, number> | null): Signal => ({
  id: "s1", motherId: "priya", subject: "mother", source: "epds", code: "epds_probable", concern, severity: "amber", value,
  observedAt: new Date(NOW).toISOString(), originTable: "epds_results", originId: "o1", relation: "NEW", relationDetail: { kind: "NEW" },
  relatedTo: null, linkStatus: "auto", notified: true, caseId: null,
});

test("a mood/EPDS value is blurred, a self-harm value never is", () => {
  const mood = blurSensitive([sig("MOOD", { total: 14 })])[0];
  assert.equal(isSensitive(mood), true);
  assert.equal(mood.value, null);
  assert.equal(mood.blurred, true);

  const selfHarm = blurSensitive([sig("SELF_HARM", { total: 22 })])[0];
  assert.equal(isSensitive(selfHarm), false);
  assert.deepEqual(selfHarm.value, { total: 22 });
  assert.equal(selfHarm.blurred, undefined);
});

test("a signal with no value is left alone (nothing to blur)", () => {
  const out = blurSensitive([sig("MOOD", null)])[0];
  assert.equal(out.value, null);
  assert.equal(out.blurred, undefined);
});
