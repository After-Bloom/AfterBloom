"use client";
import { useCallback, useEffect, useState } from "react";
import * as m from "motion/react-m";
import { CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { PageHead, Disclaimer, fmtDate } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { rise, stagger } from "@/lib/motion";

// HBNC home visits under the Home-Based Newborn Care programme. Depression screening is not a standard part of these visits.
const HBNC = [3, 7, 14, 21, 28, 42] as const;
type Row = { mother_id: string; full_name: string; baby_name: string; day: number; open_flags: number; last_epds: string | null; last_checkin: string | null; risk: number; done: number[] };

export default function Asha() {
  const tr = useTr();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabase();
    const ov = await sb.rpc("asha_overview");
    if (ov.error) { setErr(true); return; }
    const list = (ov.data ?? []) as any[];
    const visits = await sb.from("asha_visits").select("mother_id, day");
    const done = new Map<string, number[]>();
    (visits.data ?? []).forEach((v: any) => done.set(v.mother_id, [...(done.get(v.mother_id) ?? []), v.day]));
    setRows(list.map((r) => ({ ...r, done: done.get(r.mother_id) ?? [] })));
  }, []);
  useEffect(() => { load(); }, [load]);

  const markDone = async (r: Row, day: number, mood: boolean) => {
    setBusy(r.mother_id + day);
    const { data: u } = await supabase().auth.getUser();
    await supabase().from("asha_visits").upsert({ asha_id: u.user!.id, mother_id: r.mother_id, day, mood_screen_done: mood }, { onConflict: "asha_id,mother_id,day" });
    setBusy(null);
    load();
  };

  const next = (r: Row) => HBNC.find((d) => !r.done.includes(d) && d <= r.day + 7);
  const riskLabel = (n: number) => (n >= 3 ? "High" : n >= 1 ? "Watch" : "Steady");
  const riskCls = (n: number) => (n >= 3 ? "bg-danger/15 text-danger" : n >= 1 ? "bg-warn/15 text-warn" : "bg-ok/15 text-ok");

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHead title="ASHA worker dashboard" sub="Mothers in your area, sorted by risk, so you visit the ones who need you most." tag="Stretch" />
      {err && <p role="alert" className="card text-warn">{tr("Could not load. Please check your connection and try again.")}</p>}
      {!rows && !err && <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="card h-28 animate-pulse bg-surface-2" />)}</div>}
      {rows && rows.length === 0 && <div className="card text-ink-muted">{tr("No mothers are assigned to you yet.")}</div>}
      <m.ul variants={stagger()} initial="hidden" animate="show" className="space-y-3">
        {rows?.map((r) => {
          const nd = next(r);
          return (
            <m.li variants={rise} key={r.mother_id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h2 className="font-serif text-xl">{tr(r.full_name)}</h2><p className="text-sm text-ink-muted">{tr("Day {n} postpartum", { n: r.day })} · {r.baby_name}</p></div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${riskCls(r.risk)}`}>{tr(riskLabel(r.risk))}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                {r.open_flags > 0 && <span className="rounded-full bg-danger/15 px-2 py-0.5 text-danger">{tr("Open flag with her care team")}</span>}
                {r.last_epds && r.last_epds !== "low" && <span className="rounded-full bg-warn/15 px-2 py-0.5 text-warn">{tr("Mood check: care team in touch")}</span>}
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-muted">{r.last_checkin ? `${tr("Last check-in")}: ${fmtDate(r.last_checkin)}` : tr("No check-ins yet")}</span>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-bold text-plum-800">{tr("HBNC visits")}</h3>
                <ol className="flex flex-wrap gap-1.5" aria-label={tr("HBNC visit schedule")}>
                  {HBNC.map((d) => { const dn = r.done.includes(d); return <li key={d} className={`flex h-9 min-w-[3.5rem] items-center justify-center gap-1 rounded-full border px-2 text-xs font-bold ${dn ? "border-ok bg-ok/15 text-ok" : d === nd ? "border-primary bg-plum-100 text-plum-800" : "border-line text-ink-muted"}`}>{dn && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}{tr("Day {n}", { n: d })}</li>; })}
                </ol>
              </div>
              {nd !== undefined && (
                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary !py-2" disabled={!!busy} onClick={() => markDone(r, nd, false)}>{busy === r.mother_id + nd ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ClipboardCheck className="h-4 w-4" aria-hidden />}{tr("Mark day {n} visit done", { n: nd })}</button>
                  <button className="btn-soft !py-2" disabled={!!busy} onClick={() => markDone(r, nd, true)}>{tr("Done, with a mood check")}</button>
                </div>
              )}
            </m.li>
          );
        })}
      </m.ul>
      <p className="rounded-card bg-plum-100 p-4 text-sm">{tr("Depression screening is not currently part of HBNC home visits (days 3, 7, 14, 21, 28, 42). This dashboard shows you who may need a longer conversation. You see a risk summary only, never the details of her records.")}</p>
      <Disclaimer />
    </div>
  );
}
