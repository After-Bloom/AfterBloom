"use client";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { caseTitle, concernLabel, reasonText, routingReason, statusLabel } from "@/lib/labels";
import { recommended } from "@/lib/workflow/playbook";
import { DueCountdown, PriorityChip, priorityBar } from "@/components/pro/Priority";
import type { Priority } from "@/lib/workflow/priority";
import { formatTime } from "@/lib/time";

import type { Case, Signal } from "@/lib/types/cases";

const next0 = (c: Case) => c.status !== "resolved" && (c.priority === "P1" || c.priority === "P2");
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
  const priority = (c.priority as Priority | null) ?? "P4";
  const next = recommended(c.concern, priority);
  const why = c.priorityReasons.map((x) => reasonText(x as { key: string }, c.concern, lang).replace(/ \(.*\)$/, ""));
  return (
    <Link href={`/pro/cases/${c.id}${next0(c) ? "?act=1" : ""}`} className="card relative block overflow-hidden !p-0">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${priorityBar(priority)}`} aria-hidden />
      <div className="space-y-2 p-4 pl-6">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityChip priority={priority} />
          <DueCountdown dueBy={c.dueBy} priority={priority} />
          <span className="rounded-full bg-plum-100 px-2.5 py-0.5 text-xs font-bold text-plum-800">{concernLabel(c.concern, lang)}</span>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-bold text-ink-muted">{statusLabel(c.status, lang)}</span>
          {c.reopenedCount > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-bold text-warn"><RotateCcw className="h-3 w-3" aria-hidden />{tr("Reopened")}</span>}
        </div>
        <h3 className="font-serif text-xl leading-snug">{caseTitle(c.concern, lang)}</h3>
        {patient && <p className="text-sm text-ink-muted">{tr(patient)}</p>}
        <p className="text-sm text-ink-muted">
          {tr("{n} alerts", { n: mine.length })}{toConfirm > 0 && <> · <b className="text-primary">{tr("{n} to confirm", { n: toConfirm })}</b></>}{held > 0 && <> · {tr("{n} held back", { n: held })}</>} · {tr("latest")} {formatTime(c.lastSignalAt, lang)}
        </p>
        {why.length > 0 && <p className="text-xs text-ink-muted"><b>{tr("Why")}:</b> {why.join(" | ")}</p>}
        <p className="flex items-center justify-between gap-3 pt-1">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-fill px-5 py-2.5 text-sm font-bold text-primary-on">{next.button[lang]}<ArrowRight className="h-4 w-4" aria-hidden /></span>
          {c.ownerProId !== me && c.status !== "resolved" && <span className="text-xs text-ink-muted">{tr("Opens the case")}</span>}
        </p>
        {r && <p className="flex flex-wrap items-center gap-2 text-xs"><span className={`rounded-full px-2.5 py-0.5 font-bold ${TONE[r.tone]}`}>{r.chip}: {c.ownerProId === me ? tr("you") : owner || tr("not assigned")}</span><span className="text-ink-muted">{r.reason}</span></p>}
      </div>
    </Link>
  );
}
