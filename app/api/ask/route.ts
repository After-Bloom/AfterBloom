import { NextResponse } from "next/server";
import { embed, MatchUnavailable, providerConfigured } from "@/lib/match/cloudflare";
import { askVectorsReady, rankAsk } from "@/lib/ask/vectors";
import { ASK } from "@/lib/ask/engine";
import { limited, ipOf } from "@/lib/server/limit";

// Ask Bloom hosted matching: finds WHICH prewritten answer fits. It returns ids and scores only, never any generated text.
// Privacy: only the typed words arrive here (no name, no id), nothing is stored or logged. The emergency check has already run on the device.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  if (limited(`ask:${ipOf(req)}`, 20)) return no(429, "rate_limited");
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, ASK.maxChars) : "";
  if (!text) return no(400, "empty");
  if (!providerConfigured() || !askVectorsReady()) return no(503, "not_ready");
  try {
    const [q] = await embed([text]);
    return NextResponse.json({ matches: rankAsk(q) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return no(e instanceof MatchUnavailable ? 502 : 500, "provider");
  }
}
