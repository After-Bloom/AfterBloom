"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { HeartPulse, Loader2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { CareLoop, LoopAnswer, isDue } from "@/lib/careLoop";

// "Did you get the care you needed?" Shown after a RED or AMBER result, once the follow-up time has come.
// Her answer closes the loop; if she does not answer, her professional (and family, if she agreed) is told by the server.
export function CareLoopCard() {
  const { auth, openCrisis } = useApp();
  const tr = useTr();
  const [loop, setLoop] = useState<CareLoop | null>(null);
  const [busy, setBusy] = useState(false);
  const [thanks, setThanks] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/loop", { cache: "no-store" });
      if (res.ok) setLoop((await res.json()).loop ?? null);
    } catch { /* offline: try again later */ }
  }, []);

  useEffect(() => {
    if (auth.role !== "mother") return;
    void load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [auth.role, load]);

  if (auth.role !== "mother") return null;
  if (thanks) return <section role="status" className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">{tr(thanks)}</section>;
  if (!loop || !isDue(loop)) return null;

  const answer = async (a: LoopAnswer) => {
    setBusy(true);
    try {
      const res = await fetch("/api/loop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "answer", id: loop.id, answer: a }) });
      if (!res.ok) throw new Error();
      const { loop: next } = await res.json();
      if (a === "worse") return openCrisis({ kind: "medical", reason: loop.reason || "Feeling worse" });
      if (a === "going") { setLoop(next); return setThanks("Thank you. We will ask again in a few hours."); }
      setLoop(null);
      setThanks(a === "cant_reach" ? "Thank you for telling us. Your care team has been told so they can help." : a === "better" ? "I am glad you feel better. Please do tell us if it comes back." : "Thank you. We are glad you got care.");
    } catch { /* keep the card so she can try again */ } finally { setBusy(false); }
  };

  const btn = "min-h-[48px] rounded-control border border-line bg-surface px-4 py-3 text-left font-semibold text-plum-800 transition hover:bg-plum-100 disabled:opacity-60";
  return (
    <section aria-labelledby="loop-h" className={`rounded-3xl border-2 p-5 ${loop.level === "RED" ? "border-danger/50 bg-danger/10" : "border-warn/50 bg-warn/10"}`}>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted"><HeartPulse className="h-4 w-4" aria-hidden />{tr("Checking on you")}</p>
      <h2 id="loop-h" className="mt-1 font-serif text-2xl">{tr("Did you get the care you needed?")}</h2>
      {loop.reason && <p className="mt-1 text-sm text-ink-muted">{tr("Earlier you told us about: {r}", { r: tr(loop.reason) })}</p>}
      <div className="mt-4 flex flex-col gap-2" role="group" aria-label={tr("Did you get the care you needed?")}>
        <button className={btn} disabled={busy} onClick={() => answer("got_care")}>{tr("Yes, I saw a doctor or nurse")}</button>
        <button className={btn} disabled={busy} onClick={() => answer("going")}>{tr("Not yet, I am on my way")}</button>
        <button className={btn} disabled={busy} onClick={() => answer("cant_reach")}>{tr("I cannot get there. I need help")}</button>
        <button className={btn} disabled={busy} onClick={() => answer("better")}>{tr("I feel better now")}</button>
        <button className={`${btn} !border-danger/50 !text-danger`} disabled={busy} onClick={() => answer("worse")}>{tr("I feel worse")}</button>
      </div>
      {busy && <Loader2 className="mt-3 h-4 w-4 animate-spin text-ink-muted" aria-hidden />}
      <Link href="/care" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-4">{tr("Book a session now")}</Link>
    </section>
  );
}
