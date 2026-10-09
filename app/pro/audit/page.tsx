"use client";
import { useState } from "react";
import { Check, AlertOctagon, Loader2, ShieldCheck } from "lucide-react";
import { PageHead, fmtTime } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { usePro } from "@/components/pro/ProProvider";

export default function Audit() {
  const tr = useTr();
  const pd = usePro();
  const [who, setWho] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<null | { ok: boolean; checked: number } | "notready" | "error">(null);
  const verify = async () => {
    if (!who) return;
    setBusy(true);
    try { const r = await fetch(`/api/audit/verify?mother=${who}`, { cache: "no-store" }); setRes(r.status === 503 ? "notready" : r.ok ? await r.json() : "error"); } catch { setRes("error"); }
    setBusy(false);
  };
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHead title="Audit log" sub="Every time you opened a record or completed a callback. Mothers can see this too." tag="Sample profile" />

      <section className="card space-y-3" aria-labelledby="ver-h">
        <h2 id="ver-h" className="flex items-center gap-2 font-serif text-xl"><ShieldCheck className="h-5 w-5 text-primary" aria-hidden />{tr("Check that nothing was changed")}</h2>
        <p className="text-sm text-ink-muted">{tr("Every record is sealed with the one before it. Pick a patient and verify her trail.")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input !w-auto min-w-[200px]" value={who} onChange={(e) => { setWho(e.target.value); setRes(null); }} aria-label={tr("Patient")}>
            <option value="">{tr("Choose a patient")}</option>
            {pd.rows.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button className="btn-soft" disabled={!who || busy} onClick={verify}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}{tr("Verify")}</button>
        </div>
        {res === "notready" && <p role="status" className="rounded-control bg-warn/10 p-2 text-sm font-semibold text-warn">{tr("The sealed audit trail needs the latest database update (migration 009).")}</p>}
        {res === "error" && <p role="alert" className="rounded-control bg-danger/10 p-2 text-sm font-semibold text-danger">{tr("Could not verify. Please try again.")}</p>}
        {res && typeof res === "object" && (res.ok
          ? <p role="status" className="flex items-center gap-2 rounded-control bg-ok/10 p-2 text-sm font-bold text-ok"><Check className="h-4 w-4" aria-hidden />{tr("All records unchanged")} ✓ <span className="font-normal">({tr("{n} checked", { n: res.checked })})</span></p>
          : <p role="alert" className="flex items-center gap-2 rounded-control bg-danger/10 p-2 text-sm font-bold text-danger"><AlertOctagon className="h-4 w-4" aria-hidden />{tr("A record no longer matches this patient's chain.")}</p>)}
      </section>

      <div className="card">
        {pd.loading && <div className="h-16 animate-pulse rounded bg-surface-2" aria-busy="true" />}
        {!pd.loading && pd.audit.length === 0 && <p className="text-sm text-ink-muted">{tr("Nothing yet.")}</p>}
        {pd.audit.map((a, i) => <div key={i} className="border-b border-line py-2 text-sm last:border-0"><span className="text-ink-muted">{fmtTime(a.at)}</span> · {tr(a.action)}</div>)}
      </div>
    </div>
  );
}
