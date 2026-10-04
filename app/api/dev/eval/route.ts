import { NextResponse } from "next/server";
import cases from "@/data/match-eval.json";
import holdout from "@/data/match-holdout.json";
import holdout2 from "@/data/match-holdout2.json";
import { decide } from "@/lib/match/engine";
import { embed } from "@/lib/match/cloudflare";
import { rank } from "@/lib/match/vectors";
import { redFlagCheck } from "@/lib/triage";

// DEV ONLY. Scores the matcher against data/match-eval.json.
//   curl "http://localhost:3000/api/dev/eval?mode=local"    (on-device matching only)
//   curl "http://localhost:3000/api/dev/eval?mode=hosted"   (device + hosted embeddings)
// Targets from the spec: 100% emergency phrases raised, at least 85% correct symptom matching on 200+ phrases.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Case = [string, "m" | "b", string, string?];

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "dev only" }, { status: 404 });
  const mode = new URL(req.url).searchParams.get("mode") === "hosted" ? "hosted" : "local";
  const q = new URL(req.url).searchParams.get("set");
  const set = q === "holdout" || q === "holdout2" ? q : "tuning";
  const list = ((set === "holdout" ? holdout : set === "holdout2" ? holdout2 : cases) as unknown as { cases: Case[] }).cases;
  let strict = 0, top3 = 0, wrongAuto = 0, noneOk = 0, noneTotal = 0, rfTotal = 0, rfOk = 0, matchTotal = 0;
  const fails: { text: string; expected: string; got: string }[] = [];
  const rfMissed: string[] = [];
  const noneTop: number[] = [], posBest: number[] = [];

  for (const [text, w, exp, flag] of list) {
    const who = w === "b" ? "baby" : "mother";
    const expected = exp ? exp.split(",") : [];
    let cloud = null;
    if (mode === "hosted") { const [q] = await embed([text]); cloud = rank(q, who); }
    const out = decide(text, who, cloud);
    const autoIds = out.auto.map((s) => s.id);
    const maybeIds = out.maybe.slice(0, 3).map((c) => c.symptom.id);
    const raised = !!redFlagCheck(text) || !!out.safety || out.auto.some((s) => s.level === "RED") || out.maybe.some((c) => c.symptom.level === "RED");

    if (flag === "rf") { rfTotal++; if (raised) rfOk++; else rfMissed.push(text); }
    if (cloud) { const top = cloud.filter((r) => r.id !== "self_harm")[0]?.score ?? 0; if (!expected.length) noneTop.push(top); else { const ex = Math.max(...expected.map((e) => cloud!.find((r) => r.id === e)?.score ?? 0)); posBest.push(ex); } }
    if (!expected.length) {
      noneTotal++;
      if (!autoIds.length && !maybeIds.length) noneOk++; else fails.push({ text, expected: "(nothing)", got: [...autoIds, ...maybeIds].join(",") });
      continue;
    }
    matchTotal++;
    const hit = expected.some((e) => autoIds.includes(e));
    const hit3 = hit || expected.some((e) => maybeIds.includes(e)) || (flag === "rf" && !!redFlagCheck(text));
    if (hit) strict++;
    if (hit3) top3++;
    if (autoIds.length && !hit) wrongAuto++;
    if (!hit3) fails.push({ text, expected: exp, got: [...autoIds, ...maybeIds.map((m) => `?${m}`)].join(",") || "(no match)" });
  }
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  return NextResponse.json({
    mode, set, phrases: list.length,
    correctMatchingPct: pct(top3, matchTotal), autoCorrectPct: pct(strict, matchTotal), wrongAutoPct: pct(wrongAuto, matchTotal),
    nonSymptomRejectedPct: pct(noneOk, noneTotal), emergencyPhrasesRaisedPct: pct(rfOk, rfTotal), emergencyMissed: rfMissed,
    targets: { correctMatchingPct: ">= 85", emergencyPhrasesRaisedPct: "100" },
    failures: fails.slice(0, 60), failureCount: fails.length,
    scores: mode === "hosted" ? { nonSymptomTop: noneTop.sort((a, b) => b - a), expectedScoreSorted: posBest.sort((a, b) => a - b).filter((_, i) => i % 6 === 0) } : undefined,
  });
}
