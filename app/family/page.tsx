"use client";
import { useState } from "react";
import { Check, Copy, Loader2, MessageCircle, Trash2, UserPlus } from "lucide-react";
import { useApp } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { PageHead, Toggle, fmtTime } from "@/components/ui";
import { NightPlanner } from "@/components/NightPlanner";
import { useTr } from "@/lib/i18n";

const RELATIONS = ["Husband / partner", "My mother", "Mother-in-law", "Other"];

export default function FamilyCircle() {
  const { s } = useApp();
  const act = useActions();
  const tr = useTr();
  const [name, setName] = useState("");
  const [rel, setRel] = useState(RELATIONS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const link = (code: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/signup?role=family&code=${code}`;
  const wa = (f: { name: string; code: string }) => `https://wa.me/?text=${encodeURIComponent(`${tr("{name} has invited you to AfterBloom, to support her after the baby. Join here:", { name: s.mother.name.split(" ")[0] })} ${link(f.code)}\n${tr("Invite code")}: ${f.code}`)}`;

  const add = async () => {
    if (!name.trim() || busy) return;
    setBusy(true); setErr("");
    try { await act.inviteFamily(name.trim(), rel); setName(""); } catch { setErr(tr("Could not create the invite. Please try again.")); }
    setBusy(false);
  };

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-5 lg:grid-cols-2 [&>*:first-child]:col-span-full">
      <PageHead title="Family circle" sub="Support from family is the strongest protection for a new mother. You choose who joins and what each person sees." />

      <section className="card space-y-3" aria-labelledby="inv-h">
        <h2 id="inv-h" className="font-serif text-xl">{tr("Invite someone")}</h2>
        <label htmlFor="inv-name" className="sr-only">{tr("Name")}</label>
        <input id="inv-name" className="input" placeholder={tr("Name")} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr("Relation")}>{RELATIONS.map((r) => <button key={r} role="radio" aria-checked={rel === r} onClick={() => setRel(r)} className={`chip ${rel === r ? "chip-on" : ""}`}>{tr(r)}</button>)}</div>
        <button className="btn-primary w-full" onClick={add} disabled={!name.trim() || busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}{tr("Create invite")}</button>
        {err && <p role="alert" className="text-sm font-semibold text-danger">{err}</p>}
        <p className="text-xs text-ink-muted">{tr("They get a code and a link. They sign up as a family member and see only what you switch on below.")}</p>
      </section>

      {s.family.length === 0 && <div className="card text-ink-muted">{tr("No one has been invited yet.")}</div>}
      {s.family.map((f) => (
        <section key={f.id} className="card" aria-label={f.name}>
          <div className="flex items-start justify-between gap-2">
            <div><div className="font-bold">{tr(f.name)}</div><div className="text-sm text-ink-muted">{tr(f.relation)} · {f.status === "active" ? <span className="font-semibold text-ok">{tr("Joined")}</span> : <span className="font-semibold text-warn">{tr("Invite sent")}</span>}</div></div>
            <button className="flex min-h-[44px] items-center gap-1 text-sm font-semibold text-danger" onClick={() => act.removeFamily(f.id)}><Trash2 className="h-4 w-4" aria-hidden />{tr("Remove")}</button>
          </div>
          {f.status === "invited" && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-control bg-surface-2 p-3 text-sm">
              <span>{tr("Invite code")}: <b className="font-mono text-base tracking-wider">{f.code}</b></span>
              <button className="btn-soft !py-1.5" onClick={async () => { await navigator.clipboard?.writeText(link(f.code)); setCopied(f.id); setTimeout(() => setCopied(null), 2000); }}>{copied === f.id ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}{copied === f.id ? tr("Copied") : tr("Copy link")}</button>
              <a className="btn-soft !py-1.5" href={wa(f)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" aria-hidden />WhatsApp</a>
            </div>
          )}
          <div className="mt-2 divide-y divide-line">
            <Toggle on={f.sees.alerts} onChange={(v) => act.updateFamily(f.id, { alerts: v })} label="Safety alerts" hint="A short neutral message on an emergency or a missed check-in" />
            <Toggle on={f.sees.trends} onChange={(v) => act.updateFamily(f.id, { trends: v })} label="Mood and sleep trends" />
            <Toggle on={f.sees.weekly} onChange={(v) => act.updateFamily(f.id, { weekly: v })} label={'Weekly "how to help" note'} hint="No scores or health details" />
          </div>
        </section>
      ))}

      <section className="card">
        <Toggle on={s.consent.emergencyAlert} onChange={(v) => act.setConsent({ emergencyAlert: v })} label="Alert my family on a RED result" hint="Only the family you invited who have safety alerts switched on. The message never says what is wrong." />
      </section>

      <section className="card space-y-2" aria-labelledby="night-h"><h2 id="night-h" className="font-serif text-xl">{tr("Night-feed planner")}</h2>
        <NightPlanner shifts={s.shifts} me={s.mother.name.split(" ")[0]} owner={s.mother.name} onToggle={(d, sl, who) => act.claimShift(d, sl, who)} />
      </section>

      {s.alerts.filter((a) => a.kind === "support").length > 0 && (
        <section className="card"><h2 className="mb-2 font-serif text-xl">{tr("Messages for you")}</h2>{s.alerts.filter((a) => a.kind === "support").map((a) => <div key={a.id} className="border-b border-line py-1.5 text-sm last:border-0"><span className="text-ink-muted">{fmtTime(a.at)}</span> · {a.title}</div>)}</section>
      )}
    </div>
  );
}
