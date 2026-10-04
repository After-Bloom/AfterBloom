"use client";
import { useState } from "react";
import { Delete, Lock, Phone } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Shared-phone privacy. The crisis route stays one tap away and needs no PIN.
export function LockScreen() {
  const { s, setLocked, openCrisis } = useApp();
  const tr = useTr();
  const [v, setV] = useState("");
  const [bad, setBad] = useState(false);

  const press = (d: string) => {
    if (v.length >= 4) return;
    const next = v + d;
    setBad(false);
    setV(next);
    if (next.length === 4) {
      if (next === s.pin) setLocked(false);
      else setTimeout(() => { setBad(true); setV(""); }, 120);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-6 overflow-y-auto bg-[rgb(var(--plum-900))] p-6 text-white dark:bg-[rgb(var(--background))]" role="dialog" aria-modal="true" aria-label={tr("Enter your PIN")}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10"><Lock className="h-7 w-7" aria-hidden /></div>
      <h2 className="!text-white text-2xl">{tr("Enter your PIN")}</h2>

      <div className={`flex gap-4 ${bad ? "animate-shake" : ""}`} role="status" aria-live="polite" aria-label={`${v.length} / 4`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={`h-4 w-4 rounded-full border-2 border-white/70 transition ${i < v.length ? "bg-white" : ""}`} />)}
      </div>
      <p className={`h-5 text-sm text-red-200 ${bad ? "" : "invisible"}`}>{tr("Wrong PIN")}</p>

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k) => <Key key={k} onClick={() => press(k)}>{k}</Key>)}
        <span />
        <Key onClick={() => press("0")}>0</Key>
        <Key onClick={() => setV((x) => x.slice(0, -1))} label={tr("Delete")}><Delete className="h-6 w-6" aria-hidden /></Key>
      </div>

      <button onClick={() => openCrisis({ kind: "selfharm", reason: "" })} className="mt-2 flex min-h-[48px] items-center gap-2 rounded-full bg-red-600 px-6 py-3 font-bold text-white">
        <Phone className="h-5 w-5" aria-hidden />{tr("Need help now? (no PIN needed)")}
      </button>
    </div>
  );
}

function Key({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl font-semibold transition active:scale-90 active:bg-white/25 sm:h-[72px] sm:w-[72px]">{children}</button>
  );
}
