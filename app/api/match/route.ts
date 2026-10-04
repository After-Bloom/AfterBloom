import { NextResponse } from "next/server";
import { embed, MatchUnavailable, providerConfigured } from "@/lib/match/cloudflare";
import { rank, vectorsReady } from "@/lib/match/vectors";
import { MATCH } from "@/lib/match/config";

// Hosted symptom matching. Privacy: only the typed words arrive here (no name, no id), nothing is stored or logged.
// The browser has already run the red-flag check on the device; this route only helps find the best symptom.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hits = new Map<string, { n: number; t: number }>();
function limited(ip: string) {
  const now = Date.now(), h = hits.get(ip);
  if (!h || now - h.t > 60000) { hits.set(ip, { n: 1, t: now }); return false; }
  h.n++;
  return h.n > 20; // 20 requests a minute per address
}
const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return no(429, "rate_limited");
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MATCH.maxChars) : "";
  const who = body?.who === "baby" ? "baby" : "mother";
  if (!text) return no(400, "empty");
  if (!providerConfigured() || !vectorsReady()) return no(503, "not_ready");
  try {
    const [q] = await embed([text]);
    return NextResponse.json({ matches: rank(q, who) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return no(e instanceof MatchUnavailable ? 502 : 500, "provider");
  }
}
