"use client";
import Link from "next/link";
import { Phone } from "lucide-react";
import { Level, Symptom } from "@/lib/symptoms";
import { LEVEL_STYLE } from "./ui";
import { useTr } from "@/lib/i18n";

export function TriageResult({ level, symptoms, reasons }: { level: Level; symptoms?: Symptom[]; reasons?: string[] }) {
  const tr = useTr();
  const l = LEVEL_STYLE[level];
  const tips = (symptoms ?? []).filter((s) => s.tip);
  const basis = [...(symptoms?.map((s) => tr(s.label)) ?? []), ...(reasons?.map((r) => tr(r)) ?? [])].join("; ");
  return (
    <div className={`rounded-3xl border-2 p-5 ${l.bg} ${l.border} ${l.text}`}>
      <div className="flex items-center gap-2 text-xl font-bold font-serif"><span className={`h-3.5 w-3.5 rounded-full ${l.dot}`} />{tr(level)}: {tr(l.label)}</div>
      {basis ? <p className="mt-2 text-sm">{tr("Based on:")} {basis}</p> : null}
      {level === "RED" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="tel:112" className="btn bg-red-600 text-white"><Phone className="h-4 w-4" />{tr("Call 112")}</a>
          <a href="tel:14416" className="btn bg-white border border-red-300 text-red-800">{tr("Tele-MANAS")} 14416</a>
        </div>
      )}
      {level === "AMBER" && (
        <div className="mt-3 space-y-2 text-sm">
          <p>{tr("Please see your doctor or ANM within a day. Do not wait for it to pass.")}</p>
          <Link href="/care" className="btn-primary inline-flex">{tr("Book a session now")}</Link>
        </div>
      )}
      {level === "GREEN" && (
        <div className="mt-3 space-y-2 text-sm">
          {tips.length ? tips.map((x) => <p key={x.id}><b>{tr(x.label)}:</b> {tr(x.tip!)}</p>) : <p>{tr("This sounds like normal recovery. Rest, drink water, eat regularly.")}</p>}
          <p className="font-medium">{tr("Watch for: heavy bleeding, fever, severe headache with blurred vision, chest pain, or feeling very low. If any appear, check again straight away.")}</p>
        </div>
      )}
    </div>
  );
}
