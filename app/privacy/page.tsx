"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { PageHead, Toggle, fmtTime } from "@/components/ui";
import { useTr } from "@/lib/i18n";

export default function Privacy() {
  const { s, set, setLocked, reset } = useApp();
  const tr = useTr();
  const [pin, setPin] = useState("");

  return (
    <div className="grid max-w-6xl items-start gap-5 lg:grid-cols-2 [&>*:first-child]:col-span-full">
      <PageHead title="Privacy and safety" sub="Built for homes where a phone is shared." />

      <div className="card space-y-3">
        <h3 className="font-bold">{tr("PIN lock")}</h3>
        {s.pin ? (
          <div className="flex items-center justify-between"><span>{tr("PIN lock is on.")}</span><div className="flex gap-2"><button className="btn-soft" onClick={() => setLocked(true)}>{tr("Lock now")}</button><button className="btn-ghost" onClick={() => set((p) => ({ ...p, pin: null }))}>{tr("Turn off")}</button></div></div>
        ) : (
          <div className="flex gap-2"><input className="input" inputMode="numeric" maxLength={4} placeholder={tr("Choose a 4-digit PIN")} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} /><button className="btn-primary" disabled={pin.length !== 4} onClick={() => { set((p) => ({ ...p, pin })); setPin(""); }}>{tr("Set")}</button></div>
        )}
        <p className="text-sm text-plum-900/60">{tr("The crisis button always works, even when locked. The")} <b>{tr("Quick exit")}</b> {tr("button at the top leaves AfterBloom instantly and locks the app.")}</p>
      </div>

      <div className="card divide-y divide-plum-100">
        <h3 className="font-bold pb-2">{tr("Consent controls")}</h3>
        <Toggle on={s.neutralNotif} onChange={(v) => set((p) => ({ ...p, neutralNotif: v }))} label="Neutral notifications" hint={s.neutralNotif ? 'Shown as: "You have a new message"' : 'Shown with details, e.g. "Time for your mind check"'} />
        <Toggle on={s.consent.shareWithPro} onChange={(v) => set((p) => ({ ...p, consent: { ...p.consent, shareWithPro: v } }))} label="Share check-in trends with my professional" />
        <Toggle on={s.consent.emergencyAlert} onChange={(v) => set((p) => ({ ...p, consent: { ...p.consent, emergencyAlert: v } }))} label="Alert my emergency contact on a RED result" hint={s.consent.emergencyContact} />
        <Toggle on={s.consent.familyNote} onChange={(v) => set((p) => ({ ...p, consent: { ...p.consent, familyNote: v } }))} label={'Weekly "how to help" note to family'} />
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">{tr("Who looked at my record")}</h3>
        {s.audit.slice(0, 8).map((a, i) => <div key={i} className="border-b border-plum-100 py-1.5 text-sm last:border-0"><span className="text-plum-900/60">{fmtTime(a.at)}</span> · {tr(a.who)}: {tr(a.what)}</div>)}
        <p className="text-xs text-plum-900/60 mt-2">{tr("Every professional view is logged and kept for at least a year.")}</p>
      </div>

      <div className="card text-sm space-y-1">
        <b>{tr("Our promises")}</b>
        <p>{tr("No advertising, ever. Your baby's data is never used for any commercial purpose. You are the consenting parent for your baby's data (DPDP Act).")}</p>
      </div>

      <button className="btn-ghost w-full" onClick={() => { if (confirm(tr("Reset all demo data?"))) reset(); }}>{tr("Reset demo data")}</button>
    </div>
  );
}
