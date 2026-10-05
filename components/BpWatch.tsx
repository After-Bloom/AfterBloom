"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, HeartPulse } from "lucide-react";
import { useApp, daysSince } from "@/lib/store";
import { BP_HOWTO, bpPlan, bpTrend } from "@/lib/risk";
import { useTr } from "@/lib/i18n";

// "Time to check your blood pressure." Only appears when her plan says a reading is due. The pattern alert appears whenever the last readings are rising.
export function BpWatch({ inCheckin = false }: { inCheckin?: boolean }) {
  const { s, auth } = useApp();
  const tr = useTr();
  const [how, setHow] = useState(false);
  if (auth.role !== "mother") return null;

  const age = daysSince(s.mother.birth);
  const plan = bpPlan(s.risk, age, s.checkins);
  const trend = bpTrend(s.checkins);
  if (!plan.due && !trend) return null;

  return (
    <section aria-label={tr("Blood pressure watch")} className={`space-y-2 rounded-3xl border-2 p-5 ${trend ? "border-warn/50 bg-warn/10" : "border-plum-200 bg-plum-50"}`}>
      <p className="flex items-center gap-2 font-bold text-plum-800"><HeartPulse className="h-5 w-5 text-primary" aria-hidden />{trend ? tr(trend.why) : tr(plan.headline)}</p>
      {trend && <p className="text-sm text-ink">{tr("Please check again after resting, and call your doctor or ANM today if it stays high. Go to hospital now if you also have a headache, blurred vision or pain under the ribs.")}</p>}
      {!trend && plan.why && <p className="text-sm text-ink-muted">{tr(plan.why)}</p>}
      <button className="flex min-h-[44px] items-center gap-1 text-sm font-bold text-primary" onClick={() => setHow(!how)} aria-expanded={how}>{tr("How to measure it right")}<ChevronDown className={`h-4 w-4 transition ${how ? "rotate-180" : ""}`} aria-hidden /></button>
      {how && <ol className="ml-5 list-decimal space-y-1 text-sm">{BP_HOWTO.map((x) => <li key={x}>{tr(x)}</li>)}</ol>}
      {!inCheckin && plan.due && <Link href="/checkin" className="btn-primary !py-2.5">{tr("Add today's reading")}</Link>}
    </section>
  );
}
