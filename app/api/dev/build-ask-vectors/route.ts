import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { embed, EMBED_MODEL } from "@/lib/match/cloudflare";
import { quantize } from "@/lib/match/vectors";
import { TOPICS } from "@/lib/ask/knowledge";

// DEV ONLY. Rebuilds data/ask-vectors.json from the answer library. Run again whenever lib/ask/knowledge.ts changes:
//   curl http://localhost:3000/api/dev/build-ask-vectors
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "dev only" }, { status: 404 });
  const phrases = TOPICS.flatMap((t) => [t.title, ...t.asks].map((text) => ({ id: t.id, text })));
  const items: { id: string; text: string; v: string }[] = [];
  let dim = 0;
  for (let i = 0; i < phrases.length; i += 24) {
    const batch = phrases.slice(i, i + 24);
    const vecs = await embed(batch.map((p) => p.text));
    dim = vecs[0].length;
    batch.forEach((p, k) => items.push({ id: p.id, text: p.text, v: quantize(vecs[k]) }));
  }
  await fs.writeFile(path.join(process.cwd(), "data", "ask-vectors.json"), JSON.stringify({ model: EMBED_MODEL, dim, built: new Date().toISOString(), items }));
  return NextResponse.json({ ok: true, phrases: items.length, dim });
}
