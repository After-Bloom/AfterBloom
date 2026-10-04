"use client";
import { useState } from "react";
import { Lock } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";

export function LockScreen() {
  const { s, setLocked, openCrisis } = useApp();
  const tr = useTr();
  const [v, setV] = useState("");
  const [bad, setBad] = useState(false);
  const submit = (x: string) => { if (x === s.pin) setLocked(false); else if (x.length >= 4) { setBad(true); setV(""); } };
  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-5 bg-plum-800 p-6 text-white">
      <Lock className="h-10 w-10" />
      <h2 className="!text-white text-xl">{tr("Enter your PIN")}</h2>
      <input autoFocus inputMode="numeric" type="password" maxLength={4} value={v} onChange={(e) => { setBad(false); setV(e.target.value); submit(e.target.value); }}
        className="w-40 rounded-xl bg-white/10 border border-white/30 p-3 text-center text-3xl tracking-[.5em] outline-none" aria-label="PIN" />
      {bad && <p className="text-red-200">{tr("Wrong PIN")}</p>}
      <button onClick={() => openCrisis({ kind: "selfharm", reason: "" })} className="mt-6 rounded-xl bg-red-600 px-5 py-3 font-bold">{tr("Need help now? (no PIN needed)")}</button>
    </div>
  );
}
