"use client";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";

export function LangToggle() {
  const { s, set } = useApp();
  const tr = useTr();
  const isHi = s.lang === "hi";
  return (
    <div role="group" aria-label={tr("Language")} className="flex h-11 overflow-hidden rounded-full border border-line text-sm font-bold">
      <button onClick={() => set((p) => ({ ...p, lang: "en" }))} aria-pressed={!isHi} className={`px-3 transition ${!isHi ? "bg-primary-fill text-primary-on" : "text-plum-800 hover:bg-plum-100"}`}>EN</button>
      <button onClick={() => set((p) => ({ ...p, lang: "hi" }))} aria-pressed={isHi} lang="hi" style={{ fontFamily: "system-ui, sans-serif" }} className={`px-3 transition ${isHi ? "bg-primary-fill text-primary-on" : "text-plum-800 hover:bg-plum-100"}`}>हिं</button>
    </div>
  );
}
