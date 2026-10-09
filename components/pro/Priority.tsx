"use client";
import { CircleCheck, Clock, OctagonAlert, TriangleAlert } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { useNow } from "@/lib/useNow";
import { priorityLabel } from "@/lib/labels";
import type { Priority } from "@/lib/workflow/priority";

// Priority is always an icon, a word and a colour (never colour alone): Immediate, Urgent, Soon, Monitor.
const LOOK: Record<Priority, { icon: typeof OctagonAlert; cls: string; bar: string }> = {
  P1: { icon: OctagonAlert, cls: "bg-danger text-white dark:text-[#1C1117]", bar: "bg-danger" },
  P2: { icon: TriangleAlert, cls: "bg-warn text-white dark:text-[#1C1117]", bar: "bg-warn" },
  P3: { icon: Clock, cls: "bg-primary/15 text-primary", bar: "bg-primary" },
  P4: { icon: CircleCheck, cls: "bg-ok/15 text-ok", bar: "bg-ok" },
};
export const priorityBar = (p: Priority | null | undefined) => LOOK[p ?? "P4"].bar;

export function PriorityChip({ priority }: { priority: Priority | null | undefined }) {
  const { s } = useApp();
  const p = priority ?? "P4";
  const x = LOOK[p];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${x.cls}`}><x.icon className="h-4 w-4" aria-hidden />{priorityLabel(p, s.lang)}</span>;
}

/** "due in 0:42", ticking every second, red once it is overdue. Longer waits read "due in 1 d 20 h". */
export function DueCountdown({ dueBy, priority }: { dueBy: string | null; priority: Priority | null | undefined }) {
  const tr = useTr();
  const now = useNow(1000);
  if (!dueBy || priority === "P4") return <span className="text-xs font-semibold text-ink-muted">{tr("Next routine check")}</span>;
  const left = new Date(dueBy).getTime() - now;
  const over = left <= 0;
  const total = Math.abs(left);
  const d = Math.floor(total / 86400000), h = Math.floor((total % 86400000) / 3600000), m = Math.floor((total % 3600000) / 60000), sec = Math.floor((total % 60000) / 1000);
  const text = d > 0 ? `${d} d ${h} h` : `${h}:${String(m).padStart(2, "0")}${h === 0 ? `:${String(sec).padStart(2, "0")}` : ""}`;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-bold tabular-nums ${over ? "text-danger" : left < 3600000 ? "text-warn" : "text-ink-muted"}`} aria-live="off">
      <Clock className="h-4 w-4" aria-hidden />{over ? tr("overdue by {t}", { t: text }) : tr("due in {t}", { t: text })}
    </span>
  );
}
