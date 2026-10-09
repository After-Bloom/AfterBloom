"use client";
import { PageHead, fmtTime } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { usePro } from "@/components/pro/ProProvider";

export default function Audit() {
  const tr = useTr();
  const pd = usePro();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHead title="Audit log" sub="Every time you opened a record or completed a callback. Mothers can see this too." tag="Sample profile" />
      <div className="card">
        {pd.loading && <div className="h-16 animate-pulse rounded bg-surface-2" aria-busy="true" />}
        {!pd.loading && pd.audit.length === 0 && <p className="text-sm text-ink-muted">{tr("Nothing yet.")}</p>}
        {pd.audit.map((a, i) => <div key={i} className="border-b border-line py-2 text-sm last:border-0"><span className="text-ink-muted">{fmtTime(a.at)}</span> · {tr(a.action)}</div>)}
      </div>
    </div>
  );
}
