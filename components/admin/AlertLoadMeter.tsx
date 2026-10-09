"use client";
import { useCallback, useEffect, useState } from "react";
import { AlertOctagon, BellOff, Check, ClipboardList, Gauge, Loader2, ShieldCheck, Timer } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { DemoControls } from "@/components/pro/DemoControls";

type Meter = { atDesk: number; alerts: number; cases: number; sent: number; heldBack: number; medianMinutes: number | null; inTime: number; withAction: number; demo: boolean };

/** The alert-load meter, counted from the real tables: how many alerts became how many cases, how many pings were held back, how fast, how many in time. */
export function AlertLoadMeter() {
  const tr = useTr();
  const [m, setM] = useState<Meter | null>(null);
  const [problem, setProblem] = useState(false);
  const load = useCallback(async () => {
    try { const r = await fetch("/api/admin/meter", { cache: "no-store" }); if (!r.ok) return setProblem(true); setM(await r.json()); setProblem(false); } catch { setProblem(true); }
  }, []);
  useEffect(() => { void load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  const mins = m?.medianMinutes;
  const time = mins == null ? "—" : mins < 90 ? tr("{n} min", { n: mins }) : tr("{n} h", { n: Math.round(mins / 6) / 10 });
  const tiles = m ? [
    { icon: Gauge, big: `${m.alerts} → ${m.cases}`, label: tr("Alerts received into cases"), note: tr("{n} fewer things to look at", { n: Math.max(0, m.alerts - m.cases) }) },
    { icon: BellOff, big: `${m.sent} · ${m.heldBack}`, label: tr("Notifications sent · held back"), note: tr("Repeats are saved, not sent again") },
    { icon: Timer, big: time, label: tr("Median time to first action"), note: m.withAction ? tr("across {n} cases", { n: m.withAction }) : tr("no actions yet") },
    { icon: Check, big: m.withAction ? `${m.inTime} / ${m.withAction}` : "—", label: tr("Cases handled in time"), note: tr("within their priority's time window") },
  ] : [];

  return (
    <section className="space-y-3" aria-labelledby="meter-h">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="meter-h" className="font-serif text-2xl">{tr("Alert load")}</h2>
        {m?.demo && <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warn">{tr("Demo data")}</span>}
      </div>
      {problem && <p role="status" className="card text-sm text-ink-muted">{tr("The meter needs the latest database updates (migrations 007 to 009).")}</p>}
      {!m && !problem && <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="card h-24 animate-pulse bg-surface-2" />)}</div>}
      {m && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="card !p-4"><t.icon className="mb-1 h-5 w-5 text-primary" aria-hidden /><div className="font-serif text-3xl leading-none text-plum-800">{t.big}</div><div className="mt-1 text-xs font-bold text-plum-800">{t.label}</div><div className="text-xs text-ink-muted">{t.note}</div></div>
          ))}
        </div>
      )}
      {m && m.atDesk > 0 && <p role="alert" className="flex items-center gap-2 rounded-control bg-danger/10 p-3 text-sm font-bold text-danger"><AlertOctagon className="h-5 w-5" aria-hidden />{tr("{n} urgent case(s) nobody has picked up for 30 minutes. Please call the doctor on duty.", { n: m.atDesk })}</p>}
      <DemoControls onChange={() => void load()} />
    </section>
  );
}

/** Walks the whole audit trail's hash chain. Each record is sealed with the one before it, so a changed or removed record is found and named. */
export function VerifyAudit() {
  const tr = useTr();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<null | { ok: boolean; checked: number; brokenAt: string | null } | "notready" | "error">(null);
  const run = async () => {
    setBusy(true);
    try { const r = await fetch("/api/audit/verify", { cache: "no-store" }); setRes(r.status === 503 ? "notready" : r.ok ? await r.json() : "error"); } catch { setRes("error"); }
    setBusy(false);
  };
  return (
    <section className="card space-y-3" aria-labelledby="aud-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 id="aud-h" className="flex items-center gap-2 font-serif text-xl"><ClipboardList className="h-5 w-5 text-primary" aria-hidden />{tr("Tamper-evident audit trail")}</h2>
          <p className="text-sm text-ink-muted">{tr("Every record is sealed with the one before it. Nobody can edit or delete one without the chain showing it.")}</p></div>
        <button className="btn-soft" onClick={run} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}{tr("Verify chain")}</button>
      </div>
      {res === "notready" && <p role="status" className="rounded-control bg-warn/10 p-2 text-sm font-semibold text-warn">{tr("The sealed audit trail needs the latest database update (migration 009).")}</p>}
      {res === "error" && <p role="alert" className="rounded-control bg-danger/10 p-2 text-sm font-semibold text-danger">{tr("Could not verify. Please try again.")}</p>}
      {res && typeof res === "object" && (res.ok
        ? <p role="status" className="flex items-center gap-2 rounded-control bg-ok/10 p-3 text-sm font-bold text-ok"><Check className="h-5 w-5" aria-hidden />{tr("All records unchanged")} ✓ <span className="font-normal">({tr("{n} checked", { n: res.checked })})</span></p>
        : <p role="alert" className="flex items-center gap-2 rounded-control bg-danger/10 p-3 text-sm font-bold text-danger"><AlertOctagon className="h-5 w-5" aria-hidden />{tr("A record no longer matches. The first one is from {t}.", { t: res.brokenAt ? new Date(res.brokenAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "?" })}</p>)}
    </section>
  );
}
