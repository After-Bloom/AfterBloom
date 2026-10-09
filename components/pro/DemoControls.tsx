"use client";
import { useEffect, useState } from "react";
import { Clock, Loader2, Play, RotateCcw, Wand2 } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { STORM, STORM_INTERVAL_MS } from "@/lib/demo/storm";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The demo controls: Replay storm, Run checks now (and pretend time has passed), Reset demo. Shown only to an admin or a demo professional,
 * and only while the demo accounts are on. The storm goes through the real recording code, one alert every 1.5 seconds.
 */
export function DemoControls({ onChange, onReplayStart }: { onChange?: () => void; onReplayStart?: () => void }) {
  const tr = useTr();
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState<"" | "storm" | "checks" | "ahead" | "reset">("");
  const [msg, setMsg] = useState("");

  useEffect(() => { fetch("/api/demo/status", { cache: "no-store" }).then((r) => r.json()).then((j) => setAllowed(!!j.allowed)).catch(() => {}); }, []);
  if (!allowed) return null;

  const post = (url: string, body: unknown = {}) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const storm = async () => {
    setBusy("storm"); setMsg(""); onReplayStart?.();
    try {
      for (let i = 0; i < STORM.length; i++) {
        const res = await post("/api/demo/storm", { step: i });
        if (!res.ok) { setMsg(tr("The replay stopped. Is the demo set up? Open /api/dev/seed once.")); break; }
        const j = await res.json();
        onChange?.();
        setMsg(tr("Replaying: {a} of {b}. {x} alerts, {y} cases.", { a: i + 1, b: STORM.length, x: j.alerts, y: j.cases }));
        if (i < STORM.length - 1) await sleep(STORM_INTERVAL_MS);
      }
    } catch { setMsg(tr("The replay stopped. Please try again.")); }
    setBusy(""); onChange?.();
  };
  const checks = async (plus: number) => {
    setBusy(plus ? "ahead" : "checks"); setMsg("");
    try {
      const res = await post("/api/cases/check", { plusMinutes: plus });
      const j = await res.json().catch(() => ({}));
      setMsg(res.ok ? tr("Checked {n} cases. Escalated {m}.", { n: j.checked ?? 0, m: j.escalated ?? 0 }) : tr("Could not run the checks."));
    } catch { setMsg(tr("Could not run the checks.")); }
    setBusy(""); onChange?.();
  };
  const reset = async () => {
    if (!confirm(tr("Reset the demo? This puts the demo mothers' alerts, cases, actions and requests back to the start. Audit records are kept."))) return;
    setBusy("reset"); setMsg("");
    try { const res = await post("/api/demo/reset"); setMsg(res.ok ? tr("The demo is back at the start.") : tr("Could not reset. Is the demo set up?")); }
    catch { setMsg(tr("Could not reset.")); }
    setBusy(""); onChange?.();
  };

  const btn = "btn-soft !py-2 text-sm";
  return (
    <section className="card space-y-2 !border-dashed !p-4" aria-label={tr("Demo controls")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-warn/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warn"><Wand2 className="h-3 w-3" aria-hidden />{tr("Demo controls")}</span>
        <button className={btn} disabled={!!busy} onClick={storm}>{busy === "storm" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}{tr("Replay storm")}</button>
        <button className={btn} disabled={!!busy} onClick={() => checks(0)}>{busy === "checks" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Clock className="h-4 w-4" aria-hidden />}{tr("Run checks now")}</button>
        <button className={btn} disabled={!!busy} onClick={() => checks(20)}>{busy === "ahead" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Clock className="h-4 w-4" aria-hidden />}{tr("Pretend 20 minutes passed")}</button>
        <button className={btn} disabled={!!busy} onClick={reset}>{busy === "reset" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RotateCcw className="h-4 w-4" aria-hidden />}{tr("Reset demo")}</button>
      </div>
      {msg && <p role="status" aria-live="polite" className="text-sm font-semibold text-plum-800">{msg}</p>}
    </section>
  );
}
