"use client";
import { useState } from "react";
import { AlertOctagon, Check, ChevronDown, ClipboardList, HeartHandshake, Loader2, Lock, Phone, ShieldCheck, ShieldX, UserCheck, Users, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { outcomeLabel, reasonText, priorityLabel, WITHIN_LABEL } from "@/lib/labels";
import { formatTime } from "@/lib/time";
import { FAMILY_TEMPLATES, MONITOR_REASONS, MONITOR_REASON_LABEL, OUTCOMES_FOR, OUTCOME_LABEL, type PlaybookEntry, type TemplateId } from "@/lib/workflow/playbook";
import type { AskCheck, Check as SendCheck, ConsentSnapshot } from "@/lib/workflow/family";
import type { Outcome, Priority } from "@/lib/workflow/priority";
import { DueCountdown, PriorityChip } from "@/components/pro/Priority";
import type { Case } from "@/lib/types/cases";

export type CaseData = {
  me: string; case: Case; ownerName: string;
  patient: { id: string; name: string; shares: boolean; phone: string | null; day: number; delivery: string };
  priority: { value: Priority; reasons: { key: string; [k: string]: unknown }[]; dueBy: string | null; since: string | null; acknowledgedAt: string | null; escalationLevel: number };
  recommended: PlaybookEntry;
  ladder: { next: { level: 2 | 3; minutes: number } | null; onCall: string[] };
  family: { id: string; name: string; relation: string; alerts: boolean; joined: boolean; request: { status: string; usedAt: string | null } | null; canSend: SendCheck; canAsk: AskCheck }[];
  emergencyConsent: boolean; safetyCase: boolean;
  actions: { id: string; type: string; outcome: string | null; at: string; by: string; detail: Record<string, unknown>; note: string | null }[];
  audit: { id: string; at: string; who: string; what: string; consent: ConsentSnapshot | null }[];
  signals: import("@/lib/types/cases").Signal[]; checkins: { date: string; sleepHours: number; mood: number; bp?: { sys: number; dia: number } }[];
  events: import("@/lib/types/cases").CaseEvent[]; lastViewedAt: string | null;
};

export type DialogType = "call" | "book_session" | "refer" | "monitor" | "resolve";
type Post = (body: Record<string, unknown>) => Promise<string | null>;   // resolves to an error word, or null when it worked

const first = (n: string) => (n || "She").split(" ")[0];

// ---------- the form behind "Call & log outcome" and the other actions ----------
export function ActionDialog({ type, phone, onClose, post }: { type: DialogType; phone: string | null; onClose: () => void; post: Post }) {
  const { s } = useApp();
  const tr = useTr();
  const lang = s.lang;
  const choices = type === "monitor" ? [...MONITOR_REASONS] : (OUTCOMES_FOR[type] as Outcome[]);
  const [pick, setPick] = useState<string>(type === "call" ? "" : choices[0] ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const titles: Record<DialogType, string> = { call: "Call & log outcome", book_session: "Record a booked session", refer: "Record a referral", monitor: "Keep an eye on it", resolve: "Resolve this case" };

  const save = async () => {
    setBusy(true); setErr("");
    const e = await post(type === "monitor" ? { action: "act", type, reason: pick, note } : { action: "act", type, outcome: pick || undefined, note });
    setBusy(false);
    if (e) return setErr(tr("Could not save. Please try again."));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={tr(titles[type])} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-sheet bg-surface p-5 shadow-sheet sm:rounded-card" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3"><h2 className="font-serif text-2xl">{tr(titles[type])}</h2><button onClick={onClose} aria-label={tr("Close")} className="flex h-11 w-11 items-center justify-center"><X className="h-5 w-5" aria-hidden /></button></div>

        {type === "call" && (phone
          ? <a href={`tel:${phone}`} className="btn-primary mb-4 w-full"><Phone className="h-4 w-4" aria-hidden />{tr("Call {p}", { p: phone })}</a>
          : <p className="mb-4 rounded-control bg-surface-2 p-3 text-sm text-ink-muted">{tr("No phone number on file")}</p>)}

        {type === "resolve"
          ? <p className="mb-4 text-sm text-ink-muted">{tr("Only you can resolve a case. If a new alert about the same concern arrives within 7 days, it reopens by itself.")}</p>
          : (
            <fieldset className="mb-4 space-y-2">
              <legend className="mb-1 text-sm font-bold text-plum-800">{type === "call" ? tr("How did it go?") : type === "monitor" ? tr("Why are you keeping an eye on it?") : tr("Confirm")}</legend>
              {choices.map((c) => (
                <label key={c} className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-control border p-3 ${pick === c ? "border-primary bg-primary/5" : "border-line"}`}>
                  <input type="radio" name="choice" className="h-4 w-4 accent-[rgb(var(--primary-fill))]" checked={pick === c} onChange={() => setPick(c)} />
                  <span className="text-sm font-semibold">{type === "monitor" ? MONITOR_REASON_LABEL[c as keyof typeof MONITOR_REASON_LABEL][lang] : OUTCOME_LABEL[c as Outcome][lang]}</span>
                </label>
              ))}
            </fieldset>
          )}

        {type !== "resolve" && (
          <label className="mb-4 block text-sm font-bold text-plum-800">{tr("Note (optional)")}
            <textarea className="input mt-1 min-h-[72px]" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
            <span className="mt-1 flex items-center gap-1 text-xs font-normal text-ink-muted"><Lock className="h-3.5 w-3.5" aria-hidden />{tr("Saved encrypted. It is never shown to her family.")}</span>
          </label>
        )}

        {err && <p role="alert" className="mb-3 text-sm font-semibold text-danger">{err}</p>}
        <button className="btn-primary w-full" disabled={busy || (type !== "resolve" && !pick)} onClick={save}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{type === "resolve" ? tr("Mark as resolved") : tr("Save")}</button>
      </div>
    </div>
  );
}

// ---------- the one next action ----------
export function NextActionCard({ d, onOpen, post }: { d: CaseData; onOpen: (t: DialogType) => void; post: Post }) {
  const { s } = useApp();
  const tr = useTr();
  const lang = s.lang;
  const [busy, setBusy] = useState("");
  const c = d.case;
  const p = d.priority.value;
  const resolved = c.status === "resolved";
  const quick = async (action: "acknowledge" | "takeover") => { setBusy(action); await post({ action }); setBusy(""); };
  const mine = c.ownerProId === d.me;

  return (
    <section className="card space-y-3" aria-labelledby="next-h">
      <div className="flex flex-wrap items-center gap-2"><h2 id="next-h" className="text-xs font-bold uppercase tracking-wide text-ink-muted">{tr("Next action")}</h2><PriorityChip priority={p} /></div>
      {resolved ? <p className="text-sm text-ink-muted">{tr("This case is resolved.")}</p> : (
        <>
          <button className="btn-primary w-full !py-3.5 text-base" onClick={() => onOpen(d.recommended.kind === "book_session" ? "book_session" : d.recommended.kind === "monitor" ? "monitor" : "call")}>
            {d.recommended.kind === "call" && <Phone className="h-5 w-5" aria-hidden />}{d.recommended.button[lang]}
          </button>
          <p className="text-sm text-ink-muted">{d.recommended.guidance[lang]}</p>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
            <span className="text-xs font-semibold text-ink-muted">{WITHIN_LABEL[p][lang]}</span>
            <DueCountdown dueBy={c.dueBy} priority={p} />
          </div>
          {!d.priority.acknowledgedAt && p === "P1" && (
            <div className="flex flex-wrap gap-2">
              <button className="btn-soft !py-2" disabled={!!busy} onClick={() => quick("acknowledge")}>{busy === "acknowledge" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}{tr("Acknowledge")}</button>
              {!mine && <button className="btn-ghost !py-2" disabled={!!busy} onClick={() => quick("takeover")}>{busy === "takeover" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserCheck className="h-4 w-4" aria-hidden />}{tr("Take over")}</button>}
            </div>
          )}
          {d.priority.acknowledgedAt && <p className="flex items-center gap-1.5 text-xs font-semibold text-ok"><Check className="h-4 w-4" aria-hidden />{tr("Picked up at {t}", { t: formatTime(d.priority.acknowledgedAt, lang) })}</p>}
        </>
      )}
    </section>
  );
}

export function WhyPriority({ d }: { d: CaseData }) {
  const { s } = useApp();
  const tr = useTr();
  return (
    <section className="card space-y-2" aria-labelledby="why-h">
      <h2 id="why-h" className="text-xs font-bold uppercase tracking-wide text-ink-muted">{tr("Why this priority")}</h2>
      <ul className="space-y-1.5 text-sm">{d.priority.reasons.map((r, i) => <li key={i} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted" aria-hidden /><span>{reasonText(r as { key: string }, d.case.concern, s.lang)}</span></li>)}</ul>
      {d.priority.reasons.length === 0 && <p className="text-sm text-ink-muted">{tr("Nothing is open.")}</p>}
      <p className="text-xs text-ink-muted">{tr("It only goes down after someone records an action.")}</p>
    </section>
  );
}

export function EscalationCard({ d }: { d: CaseData }) {
  const { s } = useApp();
  const tr = useTr();
  const lang = s.lang;
  const lvl = Math.max(1, d.case.escalationLevel);
  const backup = d.ladder.onCall[0];
  const steps = [
    { n: 1, label: tr("Assigned doctor: {n}", { n: d.ownerName || d.case.ownerReason?.proName || tr("not assigned") }) },
    { n: 2, label: tr("On-call backup: {n}", { n: backup ?? tr("not set") }) + " · 15 " + tr("min") },
    { n: 3, label: tr("Admin desk") + " · 30 " + tr("min") },
  ];
  const watching = d.priority.value === "P1" && !d.priority.acknowledgedAt && d.case.status !== "resolved";
  return (
    <section className="card space-y-2" aria-labelledby="esc-h">
      <h2 id="esc-h" className="text-xs font-bold uppercase tracking-wide text-ink-muted">{tr("Escalation")}</h2>
      <ol className="space-y-1.5 text-sm">
        {steps.map((st) => (
          <li key={st.n} className={`flex items-center gap-2 rounded-control px-2 py-1.5 ${watching && lvl === st.n ? "bg-danger/10 font-bold text-danger" : lvl > st.n ? "text-ink-muted line-through" : ""}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${lvl >= st.n && watching ? "bg-danger text-white dark:text-[#1C1117]" : "bg-surface-2 text-ink-muted"}`}>{st.n}</span>{st.label}
          </li>
        ))}
      </ol>
      <p className="text-xs text-ink-muted">
        {!watching ? (d.priority.acknowledgedAt ? tr("Someone has picked it up, so it will not climb.") : tr("Only an Immediate case nobody has picked up climbs the ladder."))
          : d.ladder.next ? tr("Nobody has picked it up. The next step is in {n} min.", { n: d.ladder.next.minutes }) : tr("Nobody has picked it up. It has reached the admin desk.")}
      </p>
      {lang === "hi" ? null : null}
    </section>
  );
}

// ---------- family, under her consent ----------
const REASON: Record<string, (m: string, n: string) => string> = {
  alerts_off: (m, n) => `${m} has not allowed alerts for ${n}`,
  no_emergency_consent: (m) => `${m} has not agreed to alerts for family`,
  declined: (m) => `${m} chose Not now. That is final for this case.`,
  waiting: (m) => `Waiting for ${m}'s answer`,
  used: (m) => `${m}'s "Allow once" has already been used`,
};

export function FamilyPanel({ d, post }: { d: CaseData; post: Post }) {
  const { s } = useApp();
  const tr = useTr();
  const lang = s.lang;
  const mom = first(d.patient.name);
  const [busy, setBusy] = useState("");
  const [tpl, setTpl] = useState<TemplateId>("please_call");
  const [msg, setMsg] = useState("");
  const run = async (key: string, body: Record<string, unknown>, ok: string) => {
    setBusy(key); setMsg("");
    const e = await post(body);
    setBusy("");
    setMsg(e ? tr("Not sent: {r}", { r: e.replace(/_/g, " ") }) : ok);
  };
  const REQ: Record<string, string> = { pending: tr("Waiting for her answer"), allow_once: tr("Allowed once"), always: tr("Always allowed"), declined: tr("She chose Not now") };

  return (
    <section className="card space-y-3" aria-labelledby="fam-h">
      <div><h2 id="fam-h" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted"><HeartHandshake className="h-4 w-4" aria-hidden />{tr("Family")}</h2><p className="text-xs text-ink-muted">{tr("Checked against {m}'s consent, right now.", { m: mom })}</p></div>
      {d.family.length === 0 && <p className="text-sm text-ink-muted">{tr("No family members are linked.")}</p>}
      {d.family.length > 0 && (
        <label className="block text-xs font-bold text-plum-800">{tr("Message")}
          <select className="input mt-1 !py-1.5 text-sm" value={tpl} onChange={(e) => setTpl(e.target.value as TemplateId)}>
            {(Object.keys(FAMILY_TEMPLATES) as TemplateId[]).map((k) => <option key={k} value={k}>{FAMILY_TEMPLATES[k][lang](mom)}</option>)}
          </select>
        </label>
      )}
      <ul className="space-y-3">
        {d.family.map((f) => {
          const can = f.canSend.ok && f.joined;
          const why = f.canSend.ok === false ? (REASON[f.canSend.reason]?.(mom, f.name) ?? "") : !f.joined ? `${f.name} has not joined the app yet` : "";
          return (
            <li key={f.id} className="space-y-2 rounded-control border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0"><p className="font-bold">{tr(f.name)}</p><p className="text-xs text-ink-muted">{tr(f.relation)}</p></div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${f.alerts ? "bg-ok/15 text-ok" : "bg-surface-2 text-ink-muted"}`}>{f.alerts ? tr("alerts ON") : tr("alerts OFF")}</span>
              </div>
              <button className="btn-primary w-full !py-2 text-sm" disabled={!can || !!busy} onClick={() => run(`send-${f.id}`, { action: "family", memberId: f.id, template: tpl }, tr("Message sent to {n}.", { n: f.name }))}>
                {busy === `send-${f.id}` && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{tr("Send message")}
              </button>
              {!can && <p className="flex items-start gap-1.5 text-xs text-ink-muted"><ShieldX className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{tr(why)}</p>}
              {f.request && <p className="text-xs font-semibold text-primary">{REQ[f.request.status]}</p>}
              {f.canAsk.ok && <button className="btn-ghost w-full !py-2 text-sm" disabled={!!busy} onClick={() => run(`ask-${f.id}`, { action: "ask", memberId: f.id }, tr("{m} has been asked. Her answer is final.", { m: mom }))}>{busy === `ask-${f.id}` && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{tr("Ask {m}", { m: mom })}</button>}
              {f.canAsk.ok === false && f.canAsk.reason === "safety_case" && <p className="text-xs text-ink-muted">{tr("Not asked during a safety case. Follow the crisis protocol: 112 and Tele-MANAS 14416.")}</p>}
            </li>
          );
        })}
      </ul>
      {msg && <p role="status" className="text-sm font-semibold text-ok">{msg}</p>}
      <p className="flex items-start gap-1.5 text-xs text-ink-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{tr("Messages use fixed neutral wording. Nothing about her health is ever sent.")}</p>
    </section>
  );
}

export function MoreActions({ d, onOpen, onFamily }: { d: CaseData; onOpen: (t: DialogType) => void; onFamily: () => void }) {
  const tr = useTr();
  if (d.case.status === "resolved") return null;
  const item = "flex w-full min-h-[44px] items-center gap-2 rounded-control px-3 py-2 text-left text-sm font-semibold hover:bg-plum-100";
  return (
    <details className="card !p-3">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold text-plum-800">{tr("More actions")}<ChevronDown className="h-4 w-4" aria-hidden /></summary>
      <div className="mt-2 space-y-1">
        <button className={item} onClick={() => onOpen("book_session")}>{tr("Book a session")}</button>
        <button className={item} onClick={() => onOpen("refer")}>{tr("Refer")}</button>
        <button className={item} onClick={onFamily}><Users className="h-4 w-4" aria-hidden />{tr("Notify family")}</button>
        <button className={item} onClick={() => onOpen("monitor")}>{tr("Monitor with a reason")}</button>
        <button className={item} onClick={() => onOpen("resolve")}>{tr("Resolve")}</button>
      </div>
    </details>
  );
}

// ---------- the audit trail, in plain words ----------
export function AuditTrail({ d }: { d: CaseData }) {
  const { s } = useApp();
  const tr = useTr();
  const [res, setRes] = useState<null | { ok: boolean; checked: number; brokenAt: string | null } | "notready" | "error">(null);
  const [busy, setBusy] = useState(false);
  const verify = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/audit/verify?mother=${d.patient.id}`, { cache: "no-store" });
      if (r.status === 503) setRes("notready"); else if (!r.ok) setRes("error"); else setRes(await r.json());
    } catch { setRes("error"); }
    setBusy(false);
  };
  return (
    <section className="card space-y-3" aria-labelledby="aud-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="aud-h" className="flex items-center gap-2 font-serif text-2xl"><ClipboardList className="h-5 w-5 text-primary" aria-hidden />{tr("Audit trail")}</h2>
        <button className="btn-soft !py-2" onClick={verify} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}{tr("Verify")}</button>
      </div>
      {res === "notready" && <p role="status" className="rounded-control bg-warn/10 p-2 text-sm font-semibold text-warn">{tr("The sealed audit trail needs the latest database update (migration 009).")}</p>}
      {res === "error" && <p role="alert" className="rounded-control bg-danger/10 p-2 text-sm font-semibold text-danger">{tr("Could not verify. Please try again.")}</p>}
      {res && typeof res === "object" && (res.ok
        ? <p role="status" className="flex items-center gap-2 rounded-control bg-ok/10 p-2 text-sm font-bold text-ok"><Check className="h-4 w-4" aria-hidden />{tr("All records unchanged")} ✓ <span className="font-normal">({tr("{n} checked", { n: res.checked })})</span></p>
        : <p role="alert" className="flex items-center gap-2 rounded-control bg-danger/10 p-2 text-sm font-bold text-danger"><AlertOctagon className="h-4 w-4" aria-hidden />{tr("A record no longer matches. The first one is from {t}.", { t: res.brokenAt ? formatTime(res.brokenAt, s.lang) : "?" })}</p>)}
      <p className="text-xs text-ink-muted">{tr("Every record is sealed with the one before it. Nobody can edit or delete one without the chain showing it.")}</p>
      <ul className="divide-y divide-line">
        {d.audit.length === 0 && <li className="py-2 text-sm text-ink-muted">{tr("Nothing yet.")}</li>}
        {d.audit.map((a) => (
          <li key={a.id} className="space-y-1 py-2.5">
            <p className="text-sm"><span className="text-ink-muted">{formatTime(a.at, s.lang)}</span> · <b>{a.who || tr("System")}</b>: {tr(a.what)}</p>
            {a.consent && (
              <p className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-ink-muted">{tr("Her consent then")}:</span>
                {a.consent.family.map((f) => <span key={f.name} className={`rounded-full px-2 py-0.5 font-bold ${f.alerts ? "bg-ok/15 text-ok" : "bg-surface-2 text-ink-muted"}`}>{f.name}: {f.alerts ? tr("alerts ON") : tr("OFF")}</span>)}
                <span className={`rounded-full px-2 py-0.5 font-bold ${a.consent.shares ? "bg-ok/15 text-ok" : "bg-surface-2 text-ink-muted"}`}>{a.consent.shares ? tr("sharing ON") : tr("sharing OFF")}</span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
