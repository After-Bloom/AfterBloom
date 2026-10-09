"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldQuestion } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

type Req = { id: string; name: string };

/**
 * "A request from your care team": they asked whether to let a family member know to check on her. She answers Allow once, Always allow or
 * Not now. The answer is final (the database refuses a second answer), and the family member is never told why.
 * Quietly absent if the consent-requests table has not been added yet.
 */
export function ConsentRequests() {
  const { auth } = useApp();
  const tr = useTr();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase().from("consent_requests").select("id, family_members(name)").eq("status", "pending").order("created_at");
    if (!error) setReqs((data ?? []).map((r: any) => ({ id: r.id, name: r.family_members?.name ?? "" })));
  }, []);
  useEffect(() => {
    if (auth.role !== "mother") return;
    void load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [auth.role, load]);

  const answer = async (id: string, a: "allow_once" | "always" | "declined") => {
    setBusy(id + a); setErr("");
    const { error } = await supabase().rpc("answer_consent_request", { p_id: id, p_answer: a });
    setBusy("");
    if (error) { setErr(tr("That request was already answered.")); return void load(); }
    setDone(a === "declined" ? tr("Saved: Not now. They will not ask again about this.") : a === "always" ? tr("Saved: always allowed. You can change this any time in Family circle.") : tr("Saved: allowed once."));
    void load();
  };

  if (reqs.length === 0 && !done) return null;
  return (
    <section aria-label={tr("A request from your care team")} className="space-y-3">
      {reqs.map((r) => (
        <div key={r.id} className="card space-y-3 !border-primary/40">
          <p className="flex items-center gap-2 font-serif text-xl text-plum-900"><ShieldQuestion className="h-6 w-6 text-primary" aria-hidden />{tr("A request from your care team")}</p>
          <p className="text-base">{tr("Your care team would like to let {n} know to check on you today. They will not be told why.", { n: r.name })}</p>
          <div className="grid gap-2">
            <button className="btn-primary" disabled={!!busy} onClick={() => answer(r.id, "allow_once")}>{busy === r.id + "allow_once" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{tr("Allow once")}</button>
            <button className="btn-ghost" disabled={!!busy} onClick={() => answer(r.id, "always")}>{busy === r.id + "always" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{tr("Always allow")}</button>
            <button className="btn-ghost" disabled={!!busy} onClick={() => answer(r.id, "declined")}>{busy === r.id + "declined" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{tr("Not now")}</button>
          </div>
          <p className="text-xs text-ink-muted">{tr("You can change this any time in Family circle. Your answer is final for this situation.")}</p>
        </div>
      ))}
      {err && <p role="alert" className="text-sm font-semibold text-danger">{err}</p>}
      {done && reqs.length === 0 && <p role="status" className="rounded-control bg-ok/10 p-3 text-sm font-semibold text-ok">{done}</p>}
    </section>
  );
}
