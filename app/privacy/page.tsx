"use client";
import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { hashPin } from "@/lib/pin";
import { enablePush, pushSupported } from "@/lib/push";
import { PageHead, Toggle, fmtTime } from "@/components/ui";
import { useTr } from "@/lib/i18n";

export default function Privacy() {
  const { s, set, setLocked, auth } = useApp();
  const act = useActions();
  const tr = useTr();
  const [pin, setPin] = useState("");
  const [contact, setContact] = useState({ name: s.consent.emergencyContact, phone: s.consent.emergencyPhone });
  const [saved, setSaved] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const mother = auth.role === "mother";

  const exportData = async () => {
    setBusy(true); setMsg("");
    const res = await fetch("/api/account/export");
    setBusy(false);
    if (!res.ok) return setMsg(tr("Could not prepare your data. Please try again."));
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a"); a.href = url; a.download = "afterbloom-my-data.json"; a.click(); URL.revokeObjectURL(url);
  };
  const deleteAccount = async () => {
    setBusy(true); setMsg("");
    const res = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: confirmText }) });
    if (!res.ok) { setBusy(false); return setMsg(tr("Could not delete the account. Please try again.")); }
    await act.signOut();
    window.location.assign("/");
  };

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-5 lg:grid-cols-2 [&>*:first-child]:col-span-full">
      <PageHead title="Privacy and safety" sub="Built for homes where a phone is shared." />

      <section className="card space-y-3" aria-labelledby="pin-h">
        <h2 id="pin-h" className="font-serif text-xl">{tr("PIN lock")}</h2>
        {s.pinHash ? (
          <div className="flex flex-wrap items-center justify-between gap-2"><span>{tr("PIN lock is on.")}</span><div className="flex gap-2"><button className="btn-soft" onClick={() => setLocked(true)}>{tr("Lock now")}</button><button className="btn-ghost" onClick={() => set((p) => ({ ...p, pinHash: null }))}>{tr("Turn off")}</button></div></div>
        ) : (
          <div className="flex gap-2"><input className="input" aria-label={tr("Choose a 4-digit PIN")} inputMode="numeric" maxLength={4} placeholder={tr("Choose a 4-digit PIN")} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} /><button className="btn-primary" disabled={pin.length !== 4} onClick={async () => { const h = await hashPin(pin, "ab"); set((p) => ({ ...p, pinHash: h })); setPin(""); }}>{tr("Set")}</button></div>
        )}
        <p className="text-sm text-ink-muted">{tr("The PIN stays on this phone only. The crisis button always works, even when locked. The")} <b>{tr("Quick exit")}</b> {tr("button at the top leaves AfterBloom instantly and locks the app.")}</p>
      </section>

      {mother && (
        <section className="card divide-y divide-line" aria-labelledby="consent-h">
          <h2 id="consent-h" className="pb-2 font-serif text-xl">{tr("Consent controls")}</h2>
          <Toggle on={s.neutralNotif} onChange={(v) => act.setNeutral(v)} label="Neutral notifications" hint={s.neutralNotif ? 'Shown as: "You have a new message"' : 'Shown with details, e.g. "Time for your mind check"'} />
          <Toggle on={s.consent.shareWithPro} onChange={(v) => act.setConsent({ shareWithPro: v })} label="Share check-in trends with my professional" hint="Urgent flags always reach your professional, so help is never delayed." />
          <Toggle on={s.consent.emergencyAlert} onChange={(v) => act.setConsent({ emergencyAlert: v })} label="Alert my family on a RED result" hint="Only family you invited, with a short neutral message that never says what is wrong." />
          <Toggle on={s.consent.familyNote} onChange={(v) => act.setConsent({ familyNote: v })} label={'Weekly "how to help" note to family'} />
          <Toggle on={s.consent.sms} onChange={(v) => act.setConsent({ sms: v })} label="Text-message reminders" hint="A daily text to the phone number below if you have not checked in. It never says what the reminder is about. Needs your phone number." />
          <Toggle on={!!s.consent.cloudMatch} onChange={(v) => act.setConsent({ cloudMatch: v })} label="Smarter symptom matching" hint="Sends the words you type (never your name) to our matching service so more ways of describing a symptom are understood. Nothing is stored. Emergency checks always run on your phone first." />
        </section>
      )}

      {mother && (
        <section className="card space-y-3" aria-labelledby="ph-h">
          <h2 id="ph-h" className="font-serif text-xl">{tr("My phone number")}</h2>
          <p className="text-sm text-ink-muted">{tr("So your care team can call you if a result needs a conversation. Only your matched professional can see it.")}</p>
          <input className="input" aria-label={tr("My phone number")} inputMode="tel" autoComplete="tel" defaultValue={s.mother.phone} onBlur={(e) => act.setPhone(e.target.value)} placeholder="+91" />
        </section>
      )}

      {mother && (
        <section className="card space-y-3" aria-labelledby="ec-h">
          <h2 id="ec-h" className="font-serif text-xl">{tr("Emergency contact")}</h2>
          <p className="text-sm text-ink-muted">{tr("Shown to you on the emergency screen. Alerts go to the family members you invited, and only if you switched alerts on above.")}</p>
          <label className="block text-sm font-bold text-plum-800">{tr("Name and relation")}<input className="input mt-1" value={contact.name} onChange={(e) => { setSaved(false); setContact({ ...contact, name: e.target.value }); }} placeholder="Rohan (husband)" /></label>
          <label className="block text-sm font-bold text-plum-800">{tr("Phone number")}<input className="input mt-1" inputMode="tel" autoComplete="tel" value={contact.phone} onChange={(e) => { setSaved(false); setContact({ ...contact, phone: e.target.value }); }} placeholder="+91" /></label>
          <button className="btn-primary" onClick={async () => { await act.setConsent({ emergencyContact: contact.name, emergencyPhone: contact.phone }); setSaved(true); }}>{saved ? tr("Saved") : tr("Save")}</button>
        </section>
      )}

      {pushSupported() && auth.userId && (
        <section className="card space-y-2" aria-labelledby="push-h">
          <h2 id="push-h" className="font-serif text-xl">{tr("Notifications on this phone")}</h2>
          <p className="text-sm text-ink-muted">{tr("So an alert reaches you even when the app is closed. Wording stays neutral on the lock screen.")}</p>
          <button className="btn-soft" onClick={async () => setMsg((await enablePush(auth.userId!)) === "granted" ? tr("Notifications are on for this phone.") : tr("Could not turn on notifications."))}>{tr("Turn on notifications")}</button>
        </section>
      )}

      {mother && (
        <section className="card" aria-labelledby="audit-h">
          <h2 id="audit-h" className="mb-2 font-serif text-xl">{tr("Who looked at my record")}</h2>
          {s.audit.length === 0 && <p className="text-sm text-ink-muted">{tr("No one has opened your record yet.")}</p>}
          {s.audit.slice(0, 8).map((a, i) => <div key={i} className="border-b border-line py-1.5 text-sm last:border-0"><span className="text-ink-muted">{fmtTime(a.at)}</span> · {tr(a.who)}: {tr(a.what)}</div>)}
          <p className="mt-2 text-xs text-ink-muted">{tr("Every professional view is logged and kept for at least a year.")}</p>
        </section>
      )}

      <section className="card space-y-1 text-sm">
        <b>{tr("Our promises")}</b>
        <p>{tr("No advertising, ever. Your baby's data is never used for any commercial purpose. You are the consenting parent for your baby's data (DPDP Act).")}</p>
      </section>

      {auth.status === "user" && (
        <section className="card space-y-3" aria-labelledby="rights-h">
          <h2 id="rights-h" className="font-serif text-xl">{tr("Your data, your choice")}</h2>
          <button className="btn-soft" onClick={exportData} disabled={busy}><Download className="h-4 w-4" aria-hidden />{tr("Download everything I have stored")}</button>
          <div className="rounded-control border border-danger/40 p-3">
            <p className="text-sm text-ink-muted">{tr("Deleting your account permanently removes your records. This cannot be undone. Type DELETE to confirm.")}</p>
            <div className="mt-2 flex gap-2"><input className="input" aria-label={tr("Type DELETE to confirm")} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" /><button className="btn bg-danger text-white dark:text-[#1C1117]" disabled={confirmText !== "DELETE" || busy} onClick={deleteAccount}><Trash2 className="h-4 w-4" aria-hidden />{tr("Delete")}</button></div>
          </div>
          {msg && <p role="status" className="text-sm font-semibold text-primary">{msg}</p>}
        </section>
      )}
    </div>
  );
}
