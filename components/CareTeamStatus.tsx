"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HeartHandshake } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

/**
 * The only thing a mother learns about the care team's cases: that someone is looking into it. No case, no concern, no priority, no scores.
 * (The database answers a single yes or no; it cannot return anything else.) Quietly absent if the cases migration has not been run.
 */
export function CareTeamStatus() {
  const { auth } = useApp();
  const tr = useTr();
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (auth.role !== "mother") return;
    let live = true;
    const ask = () => supabase().rpc("my_care_status").then(({ data, error }) => { if (live) setOn(!error && data === true); });
    ask();
    const t = setInterval(ask, 30000);
    return () => { live = false; clearInterval(t); };
  }, [auth.role]);

  if (!on) return null;
  return (
    <section role="status" aria-label={tr("Your care team")} className="flex items-start gap-3 rounded-3xl border border-ok/40 bg-ok/10 p-5">
      <HeartHandshake className="mt-0.5 h-6 w-6 shrink-0 text-ok" aria-hidden />
      <div><p className="font-serif text-xl text-plum-900">{tr("Your care team is looking into this.")}</p><p className="text-sm text-ink-muted">{tr("They will contact you.")}</p><Link href="/care-team" className="mt-1 inline-block text-sm font-semibold text-primary underline underline-offset-4">{tr("See what they have done")}</Link></div>
    </section>
  );
}
