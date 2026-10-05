"use client";
import { useState } from "react";
import { ClipboardList, Loader2, Pencil } from "lucide-react";
import { useApp } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { RISK_ITEMS, Risk, RiskKey, riskKeys, riskTier } from "@/lib/risk";
import { useTr } from "@/lib/i18n";

// A few yes/no questions about the pregnancy and birth. The answers only change how often we suggest a blood pressure check and what her doctor's summary shows.
// Shown on the home screen until she answers (or says "none of these"), then as a small summary she can edit.
export function RecoveryProfile({ alwaysOpen = false }: { alwaysOpen?: boolean }) {
  const { s, auth } = useApp();
  const act = useActions();
  const tr = useTr();
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<Risk>(s.risk);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  if (auth.role !== "mother") return null;

  const answered = !!s.risk.set;
  const open = edit || !answered;
  if (!open && !alwaysOpen) return null;

  const save = async (r: Risk) => {
    setBusy(true); setErr(false);
    try { await act.setRisk({ ...r, set: true }); setEdit(false); } catch { setErr(true); } finally { setBusy(false); }
  };
  const toggle = (k: RiskKey) => setDraft((d) => ({ ...d, [k]: !d[k] }));

  if (!open) {
    const keys = riskKeys(s.risk);
    const tier = riskTier(s.risk);
    return (
      <section className="card flex flex-wrap items-center gap-3 !p-4" aria-label={tr("Your recovery profile")}>
        <ClipboardList className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <p className="min-w-0 flex-1 text-sm">
          <b className="text-plum-800">{tr("Your recovery profile")}:</b>{" "}
          {keys.length ? keys.map((k) => tr(RISK_ITEMS.find((x) => x.k === k)!.label)).join(" · ") : tr("No extra risks that you told us about.")}
          {tier === "high" && <span className="ml-1 font-semibold text-warn">{tr("We will remind you to check your blood pressure.")}</span>}
        </p>
        <button className="btn-ghost !py-2" onClick={() => { setDraft(s.risk); setEdit(true); }}><Pencil className="h-4 w-4" aria-hidden />{tr("Edit")}</button>
      </section>
    );
  }

  return (
    <section className="card space-y-3" aria-labelledby="risk-h">
      <h2 id="risk-h" className="flex items-center gap-2 font-serif text-xl"><ClipboardList className="h-5 w-5 text-primary" aria-hidden />{tr("Help us watch for the right things")}</h2>
      <p className="text-sm text-ink-muted">{tr("Tick anything that was true for you. This only changes how often we remind you to check your blood pressure, and it appears on your doctor's summary. You can change it any time.")}</p>
      <div className="space-y-1">
        {RISK_ITEMS.map((x) => (
          <label key={x.k} className="flex min-h-[48px] items-start gap-3 rounded-control px-1 py-1.5">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--primary-fill))]" checked={!!draft[x.k]} onChange={() => toggle(x.k)} />
            <span><span className="font-semibold text-plum-800">{tr(x.label)}</span>{x.hint && <span className="block text-sm text-ink-muted">{tr(x.hint)}</span>}</span>
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button className="btn-primary flex-1" disabled={busy} onClick={() => save(draft)}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{tr("Save")}</button>
        {!answered && <button className="btn-ghost flex-1" disabled={busy} onClick={() => save({})}>{tr("None of these")}</button>}
        {answered && <button className="btn-ghost flex-1" disabled={busy} onClick={() => setEdit(false)}>{tr("Cancel")}</button>}
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-warn">{tr("Could not save. Please try again.")}</p>}
    </section>
  );
}
