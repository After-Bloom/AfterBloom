"use client";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { caseTitle, concernLabel, routingReason, statusLabel } from "@/lib/labels";
import { formatTime } from "@/lib/time";
import { SEV, SeverityBadge } from "@/components/pro/AlertRow";
import type { Case, Signal } from "@/lib/types/cases";

const TONE = { ok: "bg-ok/15 text-ok", info: "bg-primary/10 text-primary", warn: "bg-warn/15 text-warn" } as const;

/** One case as a card: what it is, how bad, how many alerts, who has it. Opens the case page. */
export function CaseCard({ c, signals, me, patient }: { c: Case; signals: Signal[]; me: string; patient?: string }) {
  const { s } = useApp();
  const tr = useTr();
  const lang = s.lang;
  const mine = signals.filter((x) => x.caseId === c.id);
  const toConfirm = mine.filter((x) => x.linkStatus === "suggested").length;
  const held = mine.filter((x) => !x.notified).length;
  const r = c.ownerReason ? routingReason(c.ownerReason, lang) : null;
  const owner = c.ownerReason?.proName;
  return (
    <Link href={`/pro/cases/${c.id}`} className={`card relative block overflow-hidden !p-0 ${SEV[c.severityPeak].border}`}>
      <span className={`absolute inset-y-0 left-0 w-1.5 ${c.severityPeak === "red" ? "bg-danger" : c.severityPeak === "amber" ? "bg-warn" : "bg-line"}`} aria-hidden />
      <div className="space-y-2 p-4 pl-6">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={c.severityPeak} />
          <span className="rounded-full bg-plum-100 px-2.5 py-0.5 text-xs font-bold text-plum-800">{concernLabel(c.concern, lang)}</span>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-bold text-ink-muted">{statusLabel(c.status, lang)}</span>
          {c.reopenedCount > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-bold text-warn"><RotateCcw className="h-3 w-3" aria-hidden />{tr("Reopened")}</span>}
          <ArrowRight className="ml-auto h-5 w-5 text-ink-muted" aria-hidden />
        </div>
        <h3 className="font-serif text-xl leading-snug">{caseTitle(c.concern, lang)}</h3>
        {patient && <p className="text-sm text-ink-muted">{tr(patient)}</p>}
        <p className="text-sm text-ink-muted">
          {tr("{n} alerts", { n: mine.length })}{toConfirm > 0 && <> · <b className="text-primary">{tr("{n} to confirm", { n: toConfirm })}</b></>}{held > 0 && <> · {tr("{n} held back", { n: held })}</>} · {tr("latest")} {formatTime(c.lastSignalAt, lang)}
        </p>
        {r && <p className="flex flex-wrap items-center gap-2 text-xs"><span className={`rounded-full px-2.5 py-0.5 font-bold ${TONE[r.tone]}`}>{r.chip}: {c.ownerProId === me ? tr("you") : owner || tr("not assigned")}</span><span className="text-ink-muted">{r.reason}</span></p>}
      </div>
    </Link>
  );
}
