"use client";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";

const SLOTS = ["10 PM - 12 AM", "12 AM - 2 AM", "2 AM - 4 AM", "4 AM - 6 AM"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function NightFeeds({ me }: { me: string }) {
  const { s, set } = useApp();
  const tr = useTr();
  const helpers = s.family.map((f) => tr(f.name));
  const take = (key: string) => set((p) => {
    const cur = p.shifts[key];
    const shifts = { ...p.shifts };
    if (cur === me) delete shifts[key]; else shifts[key] = me;
    return { ...p, shifts };
  });
  return (
    <div className="space-y-3">
      <p className="text-sm text-plum-900/70">{tr("Tap a slot to take that night feed (tap again to give it back). Empty slots are covered by {name}.", { name: tr(s.mother.name) })}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-xs">
          <thead><tr><th className="p-1" />{DAYS.map((d) => <th key={d} className="p-1 font-semibold">{tr(d)}</th>)}</tr></thead>
          <tbody>
            {SLOTS.map((sl) => (
              <tr key={sl}>
                <td className="whitespace-nowrap p-1 pr-2 text-plum-900/70">{tr(sl)}</td>
                {DAYS.map((d) => {
                  const k = `${d}|${sl}`; const who = s.shifts[k];
                  return <td key={k} className="p-0.5"><button onClick={() => take(k)} className={`h-10 w-full rounded-lg border text-[11px] ${who ? "border-plum-600 bg-plum-100 font-semibold text-plum-800" : "border-plum-100 bg-white text-gray-400"}`}>{who ? tr(who) : "·"}</button></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-plum-900/60">{tr("Family:")} {helpers.join(", ") || tr("none yet")}</p>
    </div>
  );
}
