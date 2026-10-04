"use client";
import { useMemo } from "react";
import * as m from "motion/react-m";
import { useTr } from "@/lib/i18n";
import { dayStr } from "@/lib/store";
import { loc } from "@/lib/locale";
import { tap } from "@/lib/motion";

export const NIGHT_SLOTS = [{ id: "10pm", label: "10 PM - 1 AM" }, { id: "1am", label: "1 AM - 4 AM" }, { id: "4am", label: "4 AM - 7 AM" }] as const;
export type SlotId = (typeof NIGHT_SLOTS)[number]["id"];

/** Shared night-feed plan so feeds are split and she can sleep a longer stretch. Anyone in the family circle can take or give back a slot. */
export function NightPlanner({ shifts, me, onToggle, owner }: { shifts: Record<string, string>; me: string; owner: string; onToggle: (day: string, slot: SlotId, assignee: string) => void }) {
  const tr = useTr();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 86400000)), []);
  const first = (n: string) => n.split(" ")[0];
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">{tr("Tap a slot to take that night feed. Tap again to give it back. Slots nobody takes are covered by {name}.", { name: first(owner) })}</p>
      <div className="overflow-x-auto" role="region" aria-label={tr("Night-feed planner")} tabIndex={0}>
        <table className="w-full min-w-[520px] text-xs">
          <thead>
            <tr><th className="p-1" />{days.map((d) => <th key={d.toISOString()} scope="col" className="p-1 text-center font-semibold"><div>{d.toLocaleDateString(loc.v, { weekday: "short" })}</div><div className="font-normal text-ink-muted">{d.getDate()}</div></th>)}</tr>
          </thead>
          <tbody>
            {NIGHT_SLOTS.map((sl) => (
              <tr key={sl.id}>
                <th scope="row" className="whitespace-nowrap p-1 pr-2 text-left font-medium text-ink-muted">{tr(sl.label)}</th>
                {days.map((d) => {
                  const day = dayStr(d), who = shifts[`${day}|${sl.id}`], mine = who === me;
                  return (
                    <td key={day} className="p-0.5">
                      <m.button whileTap={tap} onClick={() => onToggle(day, sl.id, mine ? "" : who ? who : me)} disabled={!!who && !mine}
                        aria-label={`${d.toLocaleDateString(loc.v, { weekday: "long" })} ${tr(sl.label)}: ${who ? first(who) : tr("free")}`}
                        className={`h-11 w-full rounded-lg border text-[11px] ${who ? (mine ? "border-primary bg-plum-100 font-bold text-plum-800" : "border-line bg-surface-2 font-semibold text-ink-muted") : "border-dashed border-line bg-surface text-ink-muted hover:bg-plum-100"}`}>
                        {who ? first(who) : "+"}
                      </m.button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
