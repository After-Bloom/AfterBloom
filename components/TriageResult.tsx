"use client";
import Link from "next/link";
import * as m from "motion/react-m";
import { Phone, Stethoscope } from "lucide-react";
import { Level, Symptom } from "@/lib/symptoms";
import { rise } from "@/lib/motion";
import { LEVEL_STYLE } from "./ui";
import { useTr } from "@/lib/i18n";

// All wording here is prewritten. The software only picks which block to show.
export function TriageResult({ level, symptoms, reasons }: { level: Level; symptoms?: Symptom[]; reasons?: string[] }) {
  const tr = useTr();
  const l = LEVEL_STYLE[level];
  const tips = (symptoms ?? []).filter((s) => s.tip);
  const basis = [...(symptoms?.map((s) => tr(s.label)) ?? []), ...(reasons?.map((r) => tr(r)) ?? [])].join("; ");
  return (
    <m.section variants={rise} initial="hidden" animate="show" role="status" aria-live="polite" className={`rounded-card border-2 p-5 ${l.bg} ${l.border}`}>
      <div className={`flex items-start gap-3 ${l.text}`}>
        <l.icon className="mt-0.5 h-7 w-7 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest">{tr(level)}</p>
          <h2 className="!text-current font-serif text-2xl font-semibold leading-tight">{tr(l.label)}</h2>
        </div>
      </div>
      {basis ? <p className="mt-3 text-sm text-ink-muted">{tr("Based on:")} {basis}</p> : null}

      {level === "RED" && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <a href="tel:112" className="btn flex-1 bg-danger text-white dark:text-[#1C1117]"><Phone className="h-4 w-4" aria-hidden />{tr("Call 112")}</a>
          <a href="tel:14416" className="btn flex-1 border border-danger/50 bg-surface text-danger">{tr("Tele-MANAS")} 14416</a>
        </div>
      )}
      {level === "AMBER" && (
        <div className="mt-4 space-y-3 text-sm">
          <p className="text-base text-ink">{tr("Please see your doctor or ANM within a day. Do not wait for it to pass.")}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/care" className="btn-primary flex-1"><Stethoscope className="h-4 w-4" aria-hidden />{tr("Book a session now")}</Link>
            <a href="tel:14416" className="btn-ghost flex-1">{tr("Free help: Tele-MANAS")} 14416</a>
          </div>
        </div>
      )}
      {level === "GREEN" && (
        <div className="mt-4 space-y-2 text-base text-ink">
          {tips.length ? tips.map((x) => <p key={x.id}><b>{tr(x.label)}:</b> {tr(x.tip!)}</p>) : <p>{tr("This sounds like normal recovery. Rest, drink water, eat regularly.")}</p>}
          <p className="rounded-control bg-surface/70 p-3 text-sm font-medium">{tr("Watch for: heavy bleeding, fever, severe headache with blurred vision, chest pain, or feeling very low. If any appear, check again straight away.")}</p>
        </div>
      )}
    </m.section>
  );
}
