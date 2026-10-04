"use client";
import { PageHead, Soon } from "@/components/ui";
import { useApp, daysSince } from "@/lib/store";
import { useTr } from "@/lib/i18n";

const VISITS = [3, 7, 14, 21, 28, 42];
const AREA = [
  { name: "Anita Sharma (sample)", day: 31, risk: "High", why: "EPDS 15, mood falling" },
  { name: "Sunita Devi (sample)", day: 40, risk: "Medium", why: "EPDS 11 twice, BP logged" },
  { name: "Meera Iyer (sample)", day: 18, risk: "Low", why: "EPDS 6, checking in daily" },
];

export default function Asha() {
  const { s } = useApp();
  const tr = useTr();
  const live = { name: `${s.mother.name} Verma`, day: daysSince(s.mother.birth), risk: s.flags.some((f) => !f.resolved) ? "High" : "Low", why: s.flags.some((f) => !f.resolved) ? "Open urgent flag" : "Recovering well" };
  const rows = [live, ...AREA].sort((a, b) => ["High", "Medium", "Low"].indexOf(a.risk) - ["High", "Medium", "Low"].indexOf(b.risk));
  const color: Record<string, string> = { High: "bg-red-100 text-red-800", Medium: "bg-amber-100 text-amber-900", Low: "bg-emerald-100 text-emerald-800" };
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHead title="ASHA worker dashboard" sub="Mothers in your area, sorted by risk, so you visit the ones who need you most." tag="Stretch" />
      <div className="space-y-3">
        {rows.map((r) => {
          const next = VISITS.find((d) => d >= r.day);
          return (
            <div key={r.name} className="card flex items-center justify-between gap-3">
              <div><b>{tr(r.name)}</b><div className="text-sm text-plum-900/60">{tr("Day {n}", { n: r.day })} · {tr(r.why)}</div><div className="text-xs mt-1">{next ? tr("Next HBNC visit: day {a} (in {b} days)", { a: next, b: next - r.day }) : tr("HBNC visits complete")}</div></div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${color[r.risk]}`}>{tr(r.risk)}</span>
            </div>
          );
        })}
      </div>
      <Soon>Real ASHA onboarding and district pilots with NHM. Depression screening is not currently part of HBNC home visits (days 3, 7, 14, 21, 28, 42).</Soon>
    </div>
  );
}
