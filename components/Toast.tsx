"use client";
import { useEffect, useState } from "react";

// A small floating toast, for things worth a moment's notice without interrupting: a consent change seen live on the
// case page, a reveal that was just logged, a receipt after saving a privacy choice. showToast() can be called from
// anywhere (it does not need a hook); <Toaster/> is mounted once, in the Shell, and renders whatever is showing.

type ToastMsg = { id: number; text: string };
let listeners: ((t: ToastMsg) => void)[] = [];
let counter = 0;

export function showToast(text: string) {
  const t: ToastMsg = { id: ++counter, text };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const onMsg = (t: ToastMsg) => {
      setItems((p) => [...p, t]);
      setTimeout(() => setItems((p) => p.filter((x) => x.id !== t.id)), 4000);
    };
    listeners.push(onMsg);
    return () => { listeners = listeners.filter((l) => l !== onMsg); };
  }, []);
  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} role="status" className="pointer-events-auto max-w-[92vw] rounded-full bg-ink px-4 py-2.5 text-center text-sm font-semibold text-surface shadow-lift animate-fadeUp">
          {t.text}
        </div>
      ))}
    </div>
  );
}
