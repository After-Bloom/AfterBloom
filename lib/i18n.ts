import { useCallback } from "react";
import { useApp } from "./store";
import type { Lang } from "./store";
import { HI, NAMES, PATTERNS } from "./hi";

type Vars = Record<string, string | number>;

function lookup(en: string): string {
  if (HI[en] !== undefined) return HI[en];
  for (const [re, fn] of PATTERNS) {
    const m = en.match(re);
    if (m) return fn(m, lookup);
  }
  // joined lists like "Heavy bleeding, Fits or fainting"
  if (en.includes(", ")) {
    const parts = en.split(", ");
    if (parts.some((p) => HI[p] !== undefined)) return parts.map(lookup).join(", ");
  }
  return en;
}

// translate(lang, "English text {n}", { n: 3 }) - English is the key. Falls back to English if missing.
export function translate(lang: Lang, en: string, v?: Vars): string {
  let out = lang === "hi" ? lookup(en) : en;
  if (v) out = out.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
  if (lang === "hi") for (const [a, b] of NAMES) out = out.split(a).join(b);
  return out;
}

export function useTr() {
  const { s } = useApp();
  return useCallback((en: string, v?: Vars) => translate(s.lang, en, v), [s.lang]);
}
