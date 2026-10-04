import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { embed, EMBED_MODEL } from "@/lib/match/cloudflare";
import { quantize } from "@/lib/match/vectors";
import { symptomPhrases } from "@/lib/match/phrases";

// DEV ONLY. Rebuilds data/symptom-vectors.json from the symptom list. Run again whenever symptoms or keywords change:
//   curl http://localhost:3000/api/dev/build-vectors
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "dev only" }, { status: 404 });
  const phrases = symptomPhrases();
  const items: { id: string; text: string; v: string }[] = [];
  let dim = 0;
  for (let i = 0; i < phrases.length; i += 24) {
    const batch = phrases.slice(i, i + 24);
    const vecs = await embed(batch.map((p) => p.text));
    dim = vecs[0].length;
    batch.forEach((p, k) => items.push({ id: p.id, text: p.text, v: quantize(vecs[k]) }));
  }
  const out = { model: EMBED_MODEL, dim, built: new Date().toISOString(), items };
  await fs.writeFile(path.join(process.cwd(), "data", "symptom-vectors.json"), JSON.stringify(out));
  return NextResponse.json({ ok: true, phrases: items.length, dim });
}
