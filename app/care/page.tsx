"use client";
import { useEffect, useMemo, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { CalendarClock, Check, Heart, Loader2, Phone, RefreshCw, ShieldCheck, Users, Video, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { supabase } from "@/lib/supabase/client";
import { canJoin, roomUrl, upcomingSlots } from "@/lib/slots";
import { PageHead, Disclaimer, fmtTime } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { loc } from "@/lib/locale";
import { rise, stagger, tap } from "@/lib/motion";

type Pro = { id: string; title: string; qualification: string; reg_no: string; langs: string[]; fee: number; bio: string; is_sample: boolean; name: string; specialty: string | null };
/** A professional she already knows (from my_doctors): sessions she has had, and whether she or her last session made them her preferred one. */
type Doc = { pro_id: string; name: string; title: string; specialty: string | null; sessions: number; last_seen: string | null; preferred: boolean; accepting: boolean };

export default function Care() {
  const { s } = useApp();
  const act = useActions();
  const tr = useTr();
  const [pros, setPros] = useState<Pro[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [pick, setPick] = useState<Pro | null>(null);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [booked, setBooked] = useState<Pro | null>(null);   // the professional she has just booked, to offer "make them my preferred doctor"
  const [asked, setAsked] = useState(false);
  const [change, setChange] = useState(false);
  const [saving, setSaving] = useState("");

  useEffect(() => {
    const cols = "id, title, qualification, reg_no, langs, fee, bio, is_sample, accepting, profiles(full_name)";
    (async () => {
      let r: any = await supabase().from("pros").select(cols + ", specialty").eq("accepting", true);
      if (r.error) r = await supabase().from("pros").select(cols).eq("accepting", true); // the specialty column arrives with migration 010
      if (r.error) return setLoadErr(true);
      setPros((r.data ?? []).map((p: any) => ({ id: p.id, title: p.title, qualification: p.qualification, reg_no: p.reg_no, langs: p.langs, fee: p.fee, bio: p.bio, is_sample: p.is_sample, name: p.profiles?.full_name ?? "", specialty: p.specialty ?? null })));
    })();
  }, []);

  // the professionals she has already seen. Quietly empty if migration 010 has not been run, and the page works as before.
  const loadDocs = () => supabase().rpc("my_doctors").then(({ data, error }) => setDocs(error || !Array.isArray(data) ? [] : (data as Doc[]).filter((d) => d.accepting)));
  useEffect(() => { void loadDocs(); }, []); // eslint-disable-line

  // times other mothers already took with this professional are hidden
  useEffect(() => {
    if (!pick) return;
    setTaken(new Set());
    supabase().rpc("pro_booked_slots", { p_pro: pick.id }).then(({ data }) => { if (Array.isArray(data)) setTaken(new Set(data.map((x: string) => new Date(x).toISOString()))); });
  }, [pick]);

  const slots = useMemo(() => upcomingSlots().filter((x) => !taken.has(x.iso)), [taken]);
  const fmtSlot = (iso: string) => new Date(iso).toLocaleString(loc.v, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  const book = async (iso: string) => {
    if (!pick) return;
    setBusy(true); setErr("");
    try { await act.bookSession(pick.id, iso); setDone(iso); setBooked(pick); setAsked(false); setPick(null); void loadDocs(); }
    catch (e: any) { setErr(/duplicate|unique|already/i.test(e?.message ?? "") ? tr("Someone just booked that time. Please pick another.") : tr("Could not book. Please try again.")); }
    setBusy(false);
  };

  const makePreferred = async (proId: string) => {
    setSaving(proId);
    const { error } = await supabase().rpc("set_preferred_pro", { p_pro: proId });
    setSaving("");
    if (error) return setErr(tr("Could not save that choice. Please try again."));
    await loadDocs();
    setAsked(true);
  };
  const choosing = () => document.getElementById("others")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  const proOf = (id: string) => pros?.find((p) => p.id === id) ?? null;
  const first = (name: string) => name.replace(/^(Dr\.?|Ms\.?|Mr\.?)\s+/i, "").split(" ")[0];
  // she booked someone other than the doctor she prefers for that specialty: ask once whether this should change
  const currentPref = booked?.specialty ? docs.find((d) => d.preferred && d.specialty === booked.specialty && d.pro_id !== booked.id) : undefined;
  const seenIds = new Set(docs.map((d) => d.pro_id));
  const others = (pros ?? []).filter((p) => !seenIds.has(p.id));

  // the cards, one per professional
  const renderPro = (p: Pro) => (
        <m.article variants={rise} key={p.id} className="card flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2"><h3 className="font-serif text-xl">{tr(p.name)}</h3>{p.is_sample && <span className="shrink-0 rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warn">{tr("Sample profile")}</span>}</div>
          <p className="text-sm font-bold text-primary">{tr(p.title)}</p>
          <p className="text-sm text-ink-muted">{p.qualification}</p>
          <p className="flex items-start gap-1 text-xs text-ink-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{p.reg_no}</p>
          <p className="text-sm">{tr(p.bio)}</p>
          <p className="text-xs text-ink-muted">{p.langs.join(", ")}</p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <span className="font-bold">₹{p.fee}<span className="text-xs font-normal text-ink-muted"> / {tr("session")}</span></span>
            <m.button whileTap={tap} className="btn-primary !py-2" onClick={() => { setPick(p); setErr(""); }}>{tr("Book")}</m.button>
          </div>
          <a href="tel:14416" className="text-center text-xs font-semibold text-ok underline underline-offset-4">{tr("Prefer free help now? Tele-MANAS 14416")}</a>
        </m.article>
  );
  // two groups, named for what a mother is looking for rather than for the profession
  const isMind = (p: Pro) => (p.specialty ? p.specialty === "psychologist" : /psycholog|counsel|psychiat/i.test(p.title));
  const groups = [
    { id: "mind", title: "For your heart and mind", sub: "Talk through low mood, worry, sleep and the big feelings of new motherhood.", list: others.filter(isMind) },
    { id: "body", title: "For your body and your baby", sub: "Recovery, blood pressure, bleeding, feeding and newborn care.", list: others.filter((p) => !isMind(p)) },
  ];

  const mine = [...s.bookings].filter((b) => b.status !== "cancelled").sort((a, b) => a.when.localeCompare(b.when));
  const upcoming = mine.filter((b) => new Date(b.when).getTime() > Date.now() - 60 * 60000);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHead title="Talk to a professional" sub="Video sessions with a professional matched to you. Cost should never block help." tag="Sample profiles" />

      <a href="tel:14416" className="card flex items-center gap-4 !border-ok/40 bg-ok/10">
        <Phone className="h-8 w-8 shrink-0 text-ok" aria-hidden />
        <div><div className="text-lg font-bold">{tr("Free: Tele-MANAS 14416")}</div><div className="text-sm text-ink-muted">{tr("Government mental health helpline. 24×7, 20 languages, no cost, no booking.")}</div></div>
      </a>

      <AnimatePresence>
        {done && (
          <m.div variants={rise} initial="hidden" animate="show" exit="exit" role="status" className="card flex items-start gap-3 !border-ok/40 bg-ok/10">
            <Check className="mt-0.5 h-6 w-6 shrink-0 text-ok" aria-hidden />
            <div className="flex-1">
              <p className="font-bold">{tr("Booked")}: {fmtSlot(done)}</p><p className="text-sm text-ink-muted">{tr("The Join button below turns on 10 minutes before your session.")}</p>
              {currentPref && booked && !asked && (
                <div className="mt-3 rounded-control border border-line bg-surface p-3">
                  <p className="text-sm font-semibold">{tr("Would you like {a} to be your preferred doctor from now on?", { a: booked.name })}</p>
                  <p className="mt-1 text-xs text-ink-muted">{tr("Right now your preferred doctor is {a}. Your care team contacts your preferred doctor first.", { a: currentPref.name })}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="btn-primary !py-2" disabled={!!saving} onClick={() => makePreferred(booked.id)}>{saving === booked.id && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{tr("Yes, make {a} my preferred doctor", { a: first(booked.name) })}</button>
                    <button className="btn-ghost !py-2" onClick={() => setAsked(true)}>{tr("No, keep {a}", { a: first(currentPref.name) })}</button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setDone(null)} aria-label={tr("Close")} className="flex h-11 w-11 items-center justify-center"><X className="h-5 w-5" aria-hidden /></button>
          </m.div>
        )}
      </AnimatePresence>

      {docs.length > 0 && (
        <section aria-labelledby="docs-h" className="space-y-3">
          <div>
            <h2 id="docs-h" className="flex items-center gap-2 font-serif text-2xl"><Heart className="h-5 w-5 text-primary" aria-hidden />{tr("Your doctors")}</h2>
            <p className="text-sm text-ink-muted">{tr("You have seen these professionals before. You can continue with the same one or choose someone else. It is always your choice.")}</p>
          </div>
          <m.div variants={stagger()} initial="hidden" animate="show" className="grid gap-3 md:grid-cols-2">
            {docs.map((d) => {
              const p = proOf(d.pro_id);
              return (
                <m.article variants={rise} key={d.pro_id} className={`card flex flex-col gap-2 ${d.preferred ? "!border-ok/50 bg-ok/5" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><h3 className="font-serif text-xl">{tr(d.name)}</h3><p className="text-sm font-bold text-primary">{tr(d.title)}</p></div>
                    {d.preferred && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ok/15 px-2.5 py-1 text-xs font-bold text-ok"><Check className="h-3.5 w-3.5" aria-hidden />{tr("Recommended")}</span>}
                  </div>
                  <p className="text-sm text-ink-muted">
                    {d.sessions > 0 ? (d.sessions === 1 ? tr("1 session with you") : tr("{n} sessions with you", { n: d.sessions })) : tr("The doctor you chose")}
                    {d.last_seen ? ` · ${tr("last seen")} ${fmtTime(d.last_seen)}` : ""}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <m.button whileTap={tap} className="btn-primary !py-2" disabled={!p} onClick={() => p && (setPick(p), setErr(""))}>
                      {d.preferred ? tr("Continue with {a}", { a: first(d.name) }) : tr("Book again")}
                    </m.button>
                    {d.preferred && <button className="btn-ghost !py-2" onClick={choosing}><Users className="h-4 w-4" aria-hidden />{tr("Choose someone else")}</button>}
                    {!d.preferred && d.specialty && docs.some((x) => x.preferred && x.specialty === d.specialty) && (
                      <button className="btn-ghost !py-2" disabled={!!saving} onClick={() => makePreferred(d.pro_id)}>{saving === d.pro_id && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{tr("Make preferred")}</button>
                    )}
                  </div>
                </m.article>
              );
            })}
          </m.div>
          {err && !pick && <p role="alert" className="text-sm font-semibold text-danger">{err}</p>}
          <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline underline-offset-4" onClick={() => setChange(true)}><RefreshCw className="h-4 w-4" aria-hidden />{tr("Change my preferred doctor")}</button>
        </section>
      )}

      {upcoming.length > 0 && (
        <section aria-labelledby="mine-h" className="space-y-2">
          <h2 id="mine-h" className="font-serif text-2xl">{tr("Your sessions")}</h2>
          {upcoming.map((b) => {
            const live = canJoin(b.when);
            return (
              <div key={b.id} className="card flex flex-wrap items-center gap-3 !p-4">
                <CalendarClock className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1"><div className="font-bold">{b.proName}</div><div className="text-sm text-ink-muted">{fmtTime(b.when)}</div></div>
                <a href={live ? roomUrl(b.room) : undefined} target="_blank" rel="noreferrer" aria-disabled={!live} className={`btn-primary ${live ? "" : "pointer-events-none opacity-50"}`}><Video className="h-4 w-4" aria-hidden />{tr("Join video call")}</a>
                <button className="btn-ghost" onClick={() => act.cancelBooking(b.id)}>{tr("Cancel")}</button>
              </div>
            );
          })}
          <p className="text-xs text-ink-muted">{tr("The call opens in its own tab on a private room. No one else has the link. Allow the camera and microphone when your browser asks.")}</p>
        </section>
      )}

      <section id="others" aria-labelledby="who-h" className="scroll-mt-4 space-y-3">
        <h2 id="who-h" className="font-serif text-2xl">{docs.length ? tr("Choose someone else") : tr("Find the right person for you")}</h2>
        {loadErr && <p role="alert" className="card text-warn">{tr("Could not load professionals. Please try again.")}</p>}
        {!pros && !loadErr && <div className="grid gap-4 md:grid-cols-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="card h-48 animate-pulse bg-surface-2" />)}</div>}
        {pros && (
          <div className="space-y-8">
            {groups.filter((g) => g.list.length > 0).map((g) => (
              <div key={g.id} className="space-y-3" aria-labelledby={`g-${g.id}`}>
                <div><h3 id={`g-${g.id}`} className="font-serif text-xl text-plum-800">{tr(g.title)}</h3><p className="text-sm text-ink-muted">{tr(g.sub)}</p></div>
                <m.div variants={stagger()} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {g.list.map((p) => renderPro(p))}
                </m.div>
              </div>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {pick && (
          <m.div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPick(null)}>
            <m.div role="dialog" aria-modal="true" aria-label={tr("Pick a time")} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="w-full max-w-md rounded-t-sheet bg-surface p-5 shadow-sheet sm:rounded-card" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="font-serif text-2xl">{tr("Pick a time")}</h2><p className="text-sm text-ink-muted">{tr(pick.name)} · ₹{pick.fee}</p></div><button onClick={() => setPick(null)} aria-label={tr("Close")} className="flex h-11 w-11 items-center justify-center"><X className="h-5 w-5" aria-hidden /></button></div>
              <div className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto">
                {slots.slice(0, 12).map((x) => <button key={x.iso} disabled={busy} onClick={() => book(x.iso)} className="chip justify-center !text-center">{fmtSlot(x.iso)}</button>)}
                {slots.length === 0 && <p className="col-span-2 text-sm text-ink-muted">{tr("No times left in the next few days. Please try again tomorrow.")}</p>}
              </div>
              {err && <p role="alert" className="mt-3 text-sm font-semibold text-danger">{err}</p>}
              {busy && <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{tr("Booking…")}</p>}
              <a href="tel:14416" className="mt-4 block text-center text-sm font-semibold text-ok underline underline-offset-4">{tr("Free option: Tele-MANAS 14416")}</a>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {change && (
          <m.div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setChange(false)}>
            <m.div role="dialog" aria-modal="true" aria-label={tr("Change my preferred doctor")} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="w-full max-w-md rounded-t-sheet bg-surface p-5 shadow-sheet sm:rounded-card" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="font-serif text-2xl">{tr("Change my preferred doctor")}</h2><p className="text-sm text-ink-muted">{tr("Your preferred doctor is the one your care team contacts first. You can change this any time, and the change is recorded.")}</p></div><button onClick={() => setChange(false)} aria-label={tr("Close")} className="flex h-11 w-11 items-center justify-center"><X className="h-5 w-5" aria-hidden /></button></div>
              <div className="max-h-[55vh] space-y-2 overflow-y-auto">
                {(pros ?? []).filter((p) => p.specialty).map((p) => {
                  const on = docs.some((d) => d.pro_id === p.id && d.preferred);
                  return (
                    <div key={p.id} className="flex items-center gap-3 rounded-control border border-line p-3">
                      <div className="min-w-0 flex-1"><div className="font-bold">{tr(p.name)}</div><div className="text-xs text-ink-muted">{tr(p.title)}</div></div>
                      {on ? <span className="inline-flex items-center gap-1 text-xs font-bold text-ok"><Check className="h-4 w-4" aria-hidden />{tr("Preferred")}</span>
                        : <button className="btn-ghost !py-2" disabled={!!saving} onClick={async () => { await makePreferred(p.id); setChange(false); }}>{saving === p.id && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{tr("Make preferred")}</button>}
                    </div>
                  );
                })}
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
      <Disclaimer />
    </div>
  );
}
