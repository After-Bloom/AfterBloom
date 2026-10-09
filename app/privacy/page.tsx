"use client";
import { useEffect, useState } from "react";
import { Download, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { useApp, type State } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { hashPin } from "@/lib/pin";
import { enablePush, pushSupported } from "@/lib/push";
import { supabase } from "@/lib/supabase/client";
import { PageHead, Toggle } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { showToast } from "@/components/Toast";
import { formatTime } from "@/lib/time";
import { isIndefinitePause } from "@/lib/consent";

type ActivityRow = { happened_at: string; sentence: string };

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
  const [pauseBusy, setPauseBusy] = useState(false);
  const mother = auth.role === "mother";

  // "What my care team did": who looked, who called, who was told, who she asked, and her own consent changes
  // (previously its own page; it lives here now, next to the switches that drive it).
  const [activity, setActivity] = useState<ActivityRow[] | null>(null);
  const [activityProblem, setActivityProblem] = useState(false);
  useEffect(() => {
    if (!mother) return;
    let live = true;
    const load = () => supabase().rpc("my_care_activity", { p_limit: 40 }).then(({ data, error }) => { if (!live) return; if (error) setActivityProblem(true); else { setActivityProblem(false); setActivity((data ?? []) as ActivityRow[]); } });
    load();
    const t = setInterval(load, 20000);
    return () => { live = false; clearInterval(t); };
  }, [mother]);

  // B6: every consent change gets a receipt, right away, so she knows it was saved and can point to exactly which choice.
  const receipt = (id?: string) => { if (id) showToast(`${tr("Saved")} · ${tr("Receipt")} #${id.slice(0, 8)}`); };
  const saveConsent = async (patch: Partial<State["consent"]>) => receipt(await act.setConsent(patch));
  const paused = !!s.consent.sharingPausedUntil && new Date(s.consent.sharingPausedUntil).getTime() > Date.now();
  const pause = async (hours: number | "forever") => { setPauseBusy(true); const id = await act.pauseSharing(hours); setPauseBusy(false); receipt(id); };
  const resume = async () => { setPauseBusy(true); const id = await act.resumeSharing(); setPauseBusy(false); receipt(id); };

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
          <Toggle on={s.consent.shareWithPro} onChange={(v) => saveConsent({ shareWithPro: v })} label="Share check-in trends with my professional" hint="Urgent flags always reach your professional, so help is never delayed." />
          <Toggle on={s.consent.emergencyAlert} onChange={(v) => saveConsent({ emergencyAlert: v })} label="Alert my family on a RED result" hint="Only family you invited, with a short neutral message that never says what is wrong." />
          <Toggle on={s.consent.familyNote} onChange={(v) => saveConsent({ familyNote: v })} label={'Weekly "how to help" note to family'} hint="A plain-language note on how to help, every Sunday. No scores or clinical detail." />
          <Toggle on={s.consent.sms} onChange={(v) => saveConsent({ sms: v })} label="Text-message reminders" hint="A daily text to the phone number below if you have not checked in. It never says what the reminder is about. Needs your phone number." />
          <Toggle on={!!s.consent.cloudMatch} onChange={(v) => saveConsent({ cloudMatch: v })} label="Smarter symptom matching" hint="Sends the words you type (never your name) to our matching service so more ways of describing a symptom are understood. Nothing is stored. Emergency checks always run on your phone first." />
        </section>
      )}

      {mother && (
        <section className="card space-y-3" aria-labelledby="pause-h">
          <h2 id="pause-h" className="font-serif text-xl">{tr("Pause all sharing")}</h2>
          <p className="text-sm text-ink-muted">{tr("Stop new details reaching your professional for a while, without changing your switches above. Urgent and safety alerts are never paused.")}</p>
          {paused ? (
            <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-warn/10 p-3 text-sm font-semibold text-warn">
              <span className="flex items-center gap-2"><PauseCircle className="h-5 w-5 shrink-0" aria-hidden />{isIndefinitePause(s.consent.sharingPausedUntil) ? tr("Sharing is paused until you resume.") : tr("Sharing is paused until {t}.", { t: formatTime(s.consent.sharingPausedUntil!, s.lang) })}</span>
              <button className="btn-soft !py-1.5" disabled={pauseBusy} onClick={resume}><PlayCircle className="h-4 w-4" aria-hidden />{tr("Resume now")}</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button className="btn-soft" disabled={pauseBusy} onClick={() => pause(24)}><PauseCircle className="h-4 w-4" aria-hidden />{tr("Pause for 24 hours")}</button>
              <button className="btn-ghost" disabled={pauseBusy} onClick={() => pause("forever")}>{tr("Pause until I resume")}</button>
            </div>
          )}
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
        <section className="card" aria-labelledby="activity-h">
          <h2 id="activity-h" className="mb-1 font-serif text-xl">{tr("What my care team did")}</h2>
          <p className="mb-3 text-sm text-ink-muted">{tr("Who looked at your record, who called you, and who was told. In plain words, nothing more.")}</p>
          {activityProblem && <p role="status" className="text-sm text-ink-muted">{tr("This list needs the latest database update. It will appear once it has been added.")}</p>}
          {!activity && !activityProblem && <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-9 animate-pulse rounded bg-surface-2" />)}</div>}
          {activity && activity.length === 0 && <p className="text-sm text-ink-muted">{tr("Nothing yet. When someone on your care team looks at your record, calls you, or tells a family member, it appears here.")}</p>}
          {activity && activity.length > 0 && (
            <ol className="divide-y divide-line">
              {activity.slice(0, 12).map((a, i) => <li key={i} className="py-1.5 text-sm"><span className="text-ink-muted">{formatTime(a.happened_at, s.lang)}</span> · {tr(a.sentence)}</li>)}
            </ol>
          )}
          <p className="mt-2 text-xs text-ink-muted">{tr("No scores. No case names. Your care team never shares more than this with anyone but you. Every professional view is logged and kept for at least a year.")}</p>
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
