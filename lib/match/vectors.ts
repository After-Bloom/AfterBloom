import "server-only";
import vectorsJson from "@/data/symptom-vectors.json";
import { bySymptomId } from "../symptoms";
import type { Ranked } from "./engine";
import { OFF_TOPIC_ID } from "./phrases";

// Precomputed phrase embeddings, stored as int8 (unit vector x 127) in base64 to keep the file small.
type Item = { id: string; text: string; v: string };
type File = { model: string; dim: number; built: string; items: Item[] };
const file = vectorsJson as File;

let cache: { id: string; v: Int8Array }[] | null = null;
const loaded = () => (cache ??= file.items.map((i) => ({ id: i.id, v: new Int8Array(Buffer.from(i.v, "base64")) })));

export const vectorsReady = () => file.dim > 0 && file.items.length > 0;
export const vectorsInfo = () => ({ model: file.model, dim: file.dim, built: file.built, phrases: file.items.length });

export function normalize(v: number[]) {
  const n = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
  return v.map((x) => x / n);
}
export const quantize = (v: number[]) => Buffer.from(Int8Array.from(normalize(v).map((x) => Math.round(x * 127)))).toString("base64");

/** Best cosine per symptom across all of its phrases, best first. */
export function rank(query: number[], who?: "mother" | "baby"): Ranked[] {
  const q = normalize(query);
  const best = new Map<string, number>();
  for (const { id, v } of loaded()) {
    if (who && id !== OFF_TOPIC_ID && bySymptomId(id)?.who !== who) continue;
    let dot = 0;
    for (let i = 0; i < v.length; i++) dot += q[i] * v[i];
    const cos = dot / 127;
    if (cos > (best.get(id) ?? -1)) best.set(id, cos);
  }
  return [...best].map(([id, score]) => ({ id, score: Math.round(score * 1000) / 1000 })).sort((a, b) => b.score - a.score).slice(0, 9);
}
