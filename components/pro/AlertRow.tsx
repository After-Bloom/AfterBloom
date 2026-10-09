"use client";
import { useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { BellOff, ChevronDown, Info, Link2, Link2Off, OctagonAlert, Sparkles, TriangleAlert } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { bySymptomId } from "@/lib/symptoms";
import { eventLabel, notifyLabel, relationLabel, severityLabel, signalTitle, sourceLabel, whyLinked } from "@/lib/labels";
import { formatTime } from "@/lib/time";
import { rise, spring } from "@/lib/motion";
import type { CaseEvent, Severity, Signal } from "@/lib/types/cases";

export const SEV: Record<Severity, { icon: typeof OctagonAlert; text: string; bg: string; border: string }> = {
  red: { icon: OctagonAlert, text: "text-danger", bg: "bg-danger/10", border: "border-danger/50" },
  amber: { icon: TriangleAlert, text: "text-warn", bg: "bg-warn/10", border: "border-warn/50" },
  info: { icon: Info, text: "text-ink-muted", bg: "bg-surface-2", border: "border-line" },
};

/** Severity is always an icon, a word and a colour (never colour alone). */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const { s } = useApp();
  const x = SEV[severity];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${x.bg} ${x.text} ${x.border}`}><x.icon className="h-3.5 w-3.5" aria-hidden />{severityLabel(severity, s.lang)}</span>;
}

/** The words for one alert: its own table label for symptoms, the fixed wording for everything else. */
export function useSignalTitle() {
  const { s } = useApp();
  return (sig: Pick<Signal, "code" | "value">) => { const sym = bySymptomId(sig.code); return signalTitle(sig, s.lang, sym ? { label: sym.label, hi: sym.hi } : undefined); };
}

type Props = {
  sig: Signal;
  /** repeats folded into this row (shown as "Repeat x3", expand on tap) */
  repeats?: Signal[];
  /** the alert this one follows or repeats, for the "why linked" sentence */
  parentTitle?: string;
  /** what happened to the case at this alert (opened it, raised it, reopened it) */
  events?: CaseEvent[];
  /** arrived since this professional last opened the case */
  isNew?: boolean;
  /** indent follow-ups under the alert they follow */
  indent?: boolean;
  busy?: boolean;
  onDecide?: (sig: Signal, action: "confirm" | "unlink") => void;
};

/** One alert as a row: severity, words, source and time, how it relates to earlier alerts and why, whether the care team was told. */
export function AlertRow({ sig, repeats = [], parentTitle, events = [], isNew, indent, busy, onDecide }: Props) {
  const { s } = useApp();
  const tr = useTr();
  const lang = s.lang;
  const title = useSignalTitle();
  const [open, setOpen] = useState(false);
  const x = SEV[sig.severity];
  const waiting = sig.linkStatus === "suggested";
  const confirmed = sig.relation === "POSSIBLY_RELATED" && sig.linkStatus === "confirmed";
  const tone = waiting ? "border-primary/50 bg-primary/5" : `${x.border} ${x.bg}`;

  return (
    <m.li layout="position" transition={spring.snappy} className={`rounded-control border p-3 ${tone} ${indent ? "ml-6 border-l-4" : ""} ${isNew ? "ring-2 ring-primary/60" : ""}`}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <SeverityBadge severity={sig.severity} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {title(sig)}
            {sig.subject === "baby" && <span className="ml-2 rounded-full bg-plum-100 px-2 py-0.5 text-xs font-bold text-plum-800">{tr("Baby")}</span>}
            {isNew && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary-fill px-2 py-0.5 text-xs font-bold text-primary-on"><Sparkles className="h-3 w-3" aria-hidden />{tr("New")}</span>}
          </p>
          <p className="text-xs text-ink-muted">{sourceLabel(sig.source, lang)} · {formatTime(sig.observedAt, lang)}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {events.map((e) => <span key={e.id} className="rounded-full bg-ink/90 px-2.5 py-0.5 text-xs font-bold text-surface">{eventLabel(e, lang)}</span>)}
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${sig.relation === "NEW" || sig.linkStatus === "unlinked" ? "bg-surface-2 text-ink-muted" : waiting ? "bg-primary/15 text-primary" : "bg-plum-100 text-plum-800"}`}>{relationLabel(sig, lang)}</span>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-ink-muted"><b>{tr("Why linked")}:</b> {whyLinked(sig, lang, parentTitle)}</p>
      <p className={`mt-0.5 flex items-center gap-1 text-xs ${sig.notified ? "text-ink-muted" : "font-semibold text-ok"}`}>{!sig.notified && <BellOff className="h-3.5 w-3.5" aria-hidden />}{notifyLabel(sig, lang)}</p>

      {onDecide && (waiting || confirmed) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {waiting && <button className="btn-primary !min-h-0 !py-1.5 text-sm" disabled={busy} onClick={() => onDecide(sig, "confirm")}><Link2 className="h-4 w-4" aria-hidden />{tr("Confirm link")}</button>}
          <button className="btn-ghost !min-h-0 !py-1.5 text-sm" disabled={busy} onClick={() => onDecide(sig, "unlink")}><Link2Off className="h-4 w-4" aria-hidden />{waiting ? tr("Unlink") : tr("Not related")}</button>
        </div>
      )}

      {repeats.length > 0 && (
        <div className="mt-2">
          <button aria-expanded={open} className="inline-flex items-center gap-1 text-xs font-bold text-primary" onClick={() => setOpen((o) => !o)}>
            <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />{tr("Repeat x{n}", { n: repeats.length + 1 })}{" · "}{open ? tr("hide repeats") : tr("show repeats")}
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <m.ul variants={rise} initial="hidden" animate="show" exit="exit" className="mt-1 space-y-1 border-l-2 border-line pl-3">
                {repeats.map((r) => <li key={r.id} className="text-xs text-ink-muted">{formatTime(r.observedAt, lang)} · {sourceLabel(r.source, lang)}{r.value && (r.value as { sys?: number }).sys ? ` · ${(r.value as { sys: number }).sys}/${(r.value as { dia: number }).dia}` : ""}</li>)}
              </m.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </m.li>
  );
}
