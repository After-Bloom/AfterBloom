"use client";
import { useEffect, useState } from "react";
import { HeartHandshake } from "lucide-react";
import { PageHead } from "@/components/ui";
import { ConsentRequests } from "@/components/ConsentRequests";
import { CareTeamStatus } from "@/components/CareTeamStatus";
import { useTr } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";
import { formatTime } from "@/lib/time";

type Row = { happened_at: string; sentence: string };

/**
 * "What my care team did": a plain list for the mother of who looked at her record, who called, and who was told.
 * Sentences only: no scores, no case names, no clinical detail. The database function builds them, so she cannot be shown more than this.
 */
export default function CareTeam() {
  const tr = useTr();
  const { s } = useApp();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [problem, setProblem] = useState(false);

  useEffect(() => {
    let live = true;
    const load = () => supabase().rpc("my_care_activity", { p_limit: 60 }).then(({ data, error }) => { if (!live) return; if (error) setProblem(true); else { setProblem(false); setRows((data ?? []) as Row[]); } });
    load();
    const t = setInterval(load, 20000);
    return () => { live = false; clearInterval(t); };
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHead title="What my care team did" sub="Who looked at your record, who called you, and who was told. In plain words, nothing more." tag="Transparency" />
      <ConsentRequests />
      <CareTeamStatus />
      {problem && <p role="status" className="card text-ink-muted">{tr("This list needs the latest database update. It will appear once it has been added.")}</p>}
      {!rows && !problem && <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="card h-14 animate-pulse bg-surface-2" />)}</div>}
      {rows && rows.length === 0 && <div className="card text-ink-muted">{tr("Nothing yet. When someone on your care team looks at your record, calls you, or tells a family member, it appears here.")}</div>}
      {rows && rows.length > 0 && (
        <ol className="card divide-y divide-line !p-0">
          {rows.map((r, i) => (
            <li key={i} className="flex items-start gap-3 p-4">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <div><p className="font-semibold">{tr(r.sentence)}</p><p className="text-xs text-ink-muted">{formatTime(r.happened_at, s.lang)}</p></div>
            </li>
          ))}
        </ol>
      )}
      <p className="flex items-start gap-2 text-xs text-ink-muted"><HeartHandshake className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{tr("No scores. No case names. Your care team never shares more than this with anyone but you.")}</p>
    </div>
  );
}
