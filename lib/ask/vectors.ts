import "server-only";
import vectorsJson from "@/data/ask-vectors.json";
import { normalize } from "../match/vectors";
import type { Ranked } from "./engine";

// Precomputed embeddings of every way of asking each answer (int8, unit vector x 127, base64). Rebuild with /api/dev/build-ask-vectors.
type File = { model: string; dim: number; built: string; items: { id: string; text: string; v: string }[] };
const file = vectorsJson as File;
let cache: { id: string; v: Int8Array }[] | null = null;
const loaded = () => (cache ??= file.items.map((i) => ({ id: i.id, v: new Int8Array(Buffer.from(i.v, "base64")) })));

export const askVectorsReady = () => file.dim > 0 && file.items.length > 0;

/** Best cosine per answer across its phrasings, best first. */
export function rankAsk(query: number[]): Ranked[] {
  const q = normalize(query);
  const best = new Map<string, number>();
  for (const { id, v } of loaded()) {
    let dot = 0;
    for (let i = 0; i < v.length; i++) dot += q[i] * v[i];
    const cos = dot / 127;
    if (cos > (best.get(id) ?? -1)) best.set(id, cos);
  }
  return [...best].map(([id, score]) => ({ id, score: Math.round(score * 1000) / 1000 })).sort((a, b) => b.score - a.score).slice(0, 5);
}
