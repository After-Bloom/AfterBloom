"use client";
import * as m from "motion/react-m";
import { AlertOctagon, Clock, Phone } from "lucide-react";
import type { PatientRow } from "@/lib/data/pro";
import { EPDS_CONFIG } from "@/lib/epds";
import { bpTrend, riskTier } from "@/lib/risk";
import { useTr } from "@/lib/i18n";
import { useNow } from "@/lib/useNow";
import { spring } from "@/lib/motion";

// Small pieces shared by the professional pages (dashboard, patients, alerts).

export const URGENT = ["q10", "red", "selfharm"];

export const band = (n: number) => (n >= EPDS_CONFIG.probable ? "Probable" : n >= EPDS_CONFIG.possible ? "Possible" : "Low");
export const bandCls = (n: number) => (n >= EPDS_CONFIG.probable ? "bg-danger/15 text-danger" : n >= EPDS_CONFIG.possible ? "bg-warn/15 text-warn" : "bg-ok/15 text-ok");

export const raisedBp = (r: PatientRow) => { const l = r.checkins.filter((c) => c.bp).slice(-1)[0]; return !!bpTrend(r.checkins) || (!!l && Date.now() - new Date(l.date).getTime() < 3 * 86400000 && (l.bp!.sys >= 140 || l.bp!.dia >= 90)); };

/** 3 = needs a call now, 2 = a callback is waiting, 1 = worth a look, 0 = doing well. */
export const urgency = (r: PatientRow) => {
  const open = r.flags.filter((f) => !f.resolved);
  return open.some((f) => URGENT.includes(f.kind)) || r.loop?.status === "worse" || r.loop?.status === "cant_reach" || (r.loop?.status === "no_answer" && r.loop.level === "RED") ? 3 : open.length ? 2 : r.epds.some((e) => e.total >= EPDS_CONFIG.possible) ? 1 : 0;
};

export const TONE = {
  3: { bar: "bg-danger", ring: "border-danger/40", soft: "bg-danger/10", text: "text-danger", label: "Needs a call now" },
  2: { bar: "bg-warn", ring: "border-warn/40", soft: "bg-warn/10", text: "text-warn", label: "Callback waiting" },
  1: { bar: "bg-primary", ring: "border-line", soft: "bg-plum-100", text: "text-primary", label: "Keep an eye on" },
  0: { bar: "bg-ok", ring: "border-line", soft: "bg-ok/10", text: "text-ok", label: "Doing well" },
} as const;

/** The few plain reasons a patient is on your list. Short, no scores. */
export function reasonsOf(r: PatientRow): string[] {
  const counts = new Map<string, number>();
  for (const f of r.flags.filter((x) => !x.resolved)) counts.set(f.text, (counts.get(f.text) ?? 0) + 1);
  const out = [...counts].map(([text, n]) => (n > 1 ? `${text} ×${n}` : text));
  if (r.loop) out.push(r.loop.status === "worse" ? "Says she feels worse" : r.loop.status === "cant_reach" ? "Cannot get to care" : "Has not replied to the follow-up");
  if (r.shares && raisedBp(r)) out.push("Raised blood pressure");
  if (riskTier(r.risk) === "high") out.push("High-risk history");
  return out;
}

/** 24 to 48 hour callback window. Urgent flags need an immediate callback, so no countdown. */
export function CallbackTimer({ flaggedAt, dueAt, urgent }: { flaggedAt: number; dueAt: number; urgent?: boolean }) {
  const tr = useTr();
  const now = useNow(30000);
  if (urgent) return <div className="inline-flex items-center gap-2 rounded-full bg-danger/15 px-3 py-1 text-sm font-bold text-danger"><AlertOctagon className="h-4 w-4" aria-hidden />{tr("Call now")}</div>;
  const left = dueAt - now;
  const total = Math.max(1, dueAt - flaggedAt);
  const used = Math.min(1, Math.max(0, 1 - left / total));
  const over = left <= 0, soon = left < 6 * 3600000;
  const h = Math.floor(Math.abs(left) / 3600000), mm = Math.floor((Math.abs(left) % 3600000) / 60000);
  const tone = over ? "text-danger" : soon ? "text-warn" : "text-ok";
  return (
    <div>
      <div className={`flex items-center gap-2 text-sm font-bold ${tone}`}><Clock className="h-4 w-4" aria-hidden />{over ? tr("Overdue by {h}h {m}m", { h, m: mm }) : tr("Callback due in {h}h {m}m", { h, m: mm })}</div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(used * 100)} aria-label={tr("Callback window used")}>
        <m.div className={`h-full rounded-full ${over ? "bg-danger" : soon ? "bg-warn" : "bg-ok"}`} initial={false} animate={{ width: `${used * 100}%` }} transition={spring.gentle} />
      </div>
    </div>
  );
}

export function CallButton({ phone, small }: { phone: string | null | undefined; small?: boolean }) {
  const tr = useTr();
  return phone
    ? <a href={`tel:${phone}`} className={`btn-primary ${small ? "!py-2" : ""}`}><Phone className="h-4 w-4" aria-hidden />{tr("Call")}</a>
    : <span className="rounded-full bg-surface-2 px-3 py-2 text-xs font-semibold text-ink-muted">{tr("No phone number on file")}</span>;
}
