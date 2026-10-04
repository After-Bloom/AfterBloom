"use client";
import { useCallback, useEffect, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { CalendarPlus, EyeOff, HeartHandshake, Loader2, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { PageHead, Tabs, fmtTime } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { rise, stagger } from "@/lib/motion";

type Item = { id: string; reason: string; created_at: string; done: boolean; circle: string; post: { text: string; alias: string; topic: string; hidden: boolean } | null };
type Circle = { id: string; name: string };
type Host = { id: string; name: string; title: string };

export default function Moderate() {
  const tr = useTr();
  const [tab, setTab] = useState("queue");
  const [items, setItems] = useState<Item[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [ev, setEv] = useState({ circle: "", host: "", title: "", when: "" });
  const [okMsg, setOkMsg] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    const [q, c, h] = await Promise.all([
      sb.from("mod_queue").select("id, reason, created_at, done, circles(name), posts(text, alias, topic, hidden)").order("created_at", { ascending: false }).limit(60),
      sb.from("circles").select("id, name").order("name"),
      sb.from("pros").select("id, title, profiles(full_name)").in("title", ["Clinical psychologist", "Gynaecologist", "Lactation consultant", "Paediatrician", "Counsellor"]),
    ]);
    setItems((q.data ?? []).map((r: any) => ({ id: r.id, reason: r.reason, created_at: r.created_at, done: r.done, circle: r.circles?.name ?? "", post: r.posts ?? null })));
    setCircles((c.data ?? []) as Circle[]);
    setHosts((h.data ?? []).map((p: any) => ({ id: p.id, title: p.title, name: p.profiles?.full_name ?? "" })));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const sb = supabase();
    const ch = sb.channel("modq").on("postgres_changes", { event: "*", schema: "public", table: "mod_queue" }, () => load()).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [load]);

  const act = async (id: string, action: "hide" | "reach_out" | "dismiss") => {
    setBusy(id + action); setErr("");
    const res = await fetch("/api/circles/mod", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, queueId: id }) });
    setBusy(null);
    if (!res.ok) return setErr(tr("That did not work. Please try again."));
    load();
  };

  const schedule = async () => {
    setBusy("event"); setErr(""); setOkMsg("");
    const { error } = await supabase().from("circle_events").insert({ circle_id: ev.circle, host_id: ev.host, title: ev.title.trim(), starts_at: new Date(ev.when).toISOString() });
    setBusy(null);
    if (error) return setErr(tr("Could not schedule that session."));
    setOkMsg(tr("Session scheduled. Circle members will see it.")); setEv({ circle: "", host: "", title: "", when: "" });
  };

  const open = items.filter((i) => !i.done), done = items.filter((i) => i.done);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHead title="Circle moderation" sub="Messages flagged for self-harm language. The software never replies on its own; a person decides." tag="Moderator" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "queue", label: tr("Queue ({n})", { n: open.length }) }, { id: "done", label: "Handled" }, { id: "events", label: "Expert sessions" }]} />
      {err && <p role="alert" className="rounded-control bg-danger/10 p-3 text-sm font-semibold text-danger">{err}</p>}

      {tab === "queue" && (
        <div className="space-y-3">
          {loading && <div className="card h-28 animate-pulse bg-surface-2" aria-busy="true" />}
          {!loading && open.length === 0 && <div className="card flex items-center gap-3 text-ink-muted"><ShieldCheck className="h-6 w-6 text-ok" aria-hidden />{tr("The queue is empty. Nothing needs a human look right now.")}</div>}
          <m.ul variants={stagger()} initial="hidden" animate="show" className="space-y-3">
            <AnimatePresence initial={false}>
              {open.map((i) => (
                <m.li key={i.id} variants={rise} exit={{ opacity: 0, x: 40 }} layout className="card !border-danger/50">
                  <div className="text-xs font-bold text-danger">{tr(i.reason)} · {i.circle} · {fmtTime(i.created_at)}</div>
                  {i.post && <blockquote className="my-2 border-l-4 border-line pl-3"><p className="whitespace-pre-wrap break-words">{i.post.text}</p><footer className="mt-1 text-xs text-ink-muted">{tr(i.post.alias)} · {tr(i.post.topic)}{i.post.hidden ? ` · ${tr("hidden")}` : ""}</footer></blockquote>}
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-primary !py-2" disabled={!!busy} onClick={() => act(i.id, "reach_out")}>{busy === i.id + "reach_out" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <HeartHandshake className="h-4 w-4" aria-hidden />}{tr("Reach out to her")}</button>
                    <button className="btn-ghost !py-2" disabled={!!busy} onClick={() => act(i.id, "hide")}><EyeOff className="h-4 w-4" aria-hidden />{tr("Hide post")}</button>
                    <button className="btn-soft !py-2" disabled={!!busy} onClick={() => act(i.id, "dismiss")}><X className="h-4 w-4" aria-hidden />{tr("Dismiss")}</button>
                  </div>
                  <p className="mt-2 text-xs text-ink-muted">{tr("\"Reach out\" sends her a gentle message with free help numbers. You never see her name.")}</p>
                </m.li>
              ))}
            </AnimatePresence>
          </m.ul>
        </div>
      )}

      {tab === "done" && (
        <div className="space-y-2">
          {done.length === 0 && <div className="card text-ink-muted">{tr("Nothing handled yet.")}</div>}
          {done.map((i) => <div key={i.id} className="card !p-4 text-sm"><div className="text-xs text-ink-muted">{fmtTime(i.created_at)} · {i.circle}</div><p className="line-clamp-2">{i.post?.text}</p></div>)}
        </div>
      )}

      {tab === "events" && (
        <section className="card space-y-3" aria-labelledby="ev-h">
          <h2 id="ev-h" className="flex items-center gap-2 font-serif text-xl"><CalendarPlus className="h-5 w-5 text-primary" aria-hidden />{tr("Schedule an expert Q&A")}</h2>
          <p className="text-sm text-ink-muted">{tr("A monthly live session in a circle with a psychologist, lactation consultant or gynaecologist.")}</p>
          <label className="block text-sm font-bold text-plum-800">{tr("Circle")}<select className="input mt-1" value={ev.circle} onChange={(e) => setEv({ ...ev, circle: e.target.value })}><option value="">{tr("Choose…")}</option>{circles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="block text-sm font-bold text-plum-800">{tr("Expert")}<select className="input mt-1" value={ev.host} onChange={(e) => setEv({ ...ev, host: e.target.value })}><option value="">{tr("Choose…")}</option>{hosts.map((h) => <option key={h.id} value={h.id}>{h.name} · {tr(h.title)}</option>)}</select></label>
          <label className="block text-sm font-bold text-plum-800">{tr("Title")}<input className="input mt-1" value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} /></label>
          <label className="block text-sm font-bold text-plum-800">{tr("Date and time")}<input className="input mt-1" type="datetime-local" value={ev.when} onChange={(e) => setEv({ ...ev, when: e.target.value })} /></label>
          <button className="btn-primary" disabled={!ev.circle || !ev.host || !ev.title.trim() || !ev.when || busy === "event"} onClick={schedule}>{tr("Schedule")}</button>
          {okMsg && <p role="status" className="text-sm font-semibold text-ok">{okMsg}</p>}
        </section>
      )}
    </div>
  );
}
