"use client";
import { useState } from "react";
import { Phone, ShieldCheck, Video, X } from "lucide-react";
import { useApp, uid } from "@/lib/store";
import { PROS, SLOTS } from "@/lib/pros";
import { PageHead, Disclaimer } from "@/components/ui";
import { useTr } from "@/lib/i18n";

export default function Care() {
  const { s, set, audit } = useApp();
  const tr = useTr();
  const [pick, setPick] = useState<string | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const pro = PROS.find((p) => p.id === pick);

  const book = (slot: string) => {
    set((p) => ({ ...p, bookings: [...p.bookings, { id: uid(), proId: pick!, when: slot, kind: "video" }] }));
    setPick(null);
  };

  return (
    <div className="max-w-6xl space-y-5">
      <PageHead title="Talk to a professional" sub="Video sessions inside the app. Cost should never block help." tag="Sample profiles" />

      <a href="tel:14416" className="card flex items-center gap-4 border-emerald-300 bg-emerald-50">
        <Phone className="h-8 w-8 text-emerald-700 shrink-0" />
        <div><div className="font-bold text-lg">{tr("Free: Tele-MANAS 14416")}</div><div className="text-sm">{tr("Government mental health helpline. 24×7, 20 languages, no cost, no booking.")}</div></div>
      </a>

      {s.bookings.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-2">{tr("Your sessions")}</h3>
          {s.bookings.map((b) => {
            const p = PROS.find((x) => x.id === b.proId)!;
            return <div key={b.id} className="flex items-center justify-between gap-3 border-b border-plum-100 py-2 last:border-0"><div><div className="font-medium">{tr(p.name)}</div><div className="text-sm text-plum-900/60">{tr(b.when)}</div></div><button className="btn-primary" onClick={() => { audit("System", `Video room opened with ${p.name}`); setRoom(`AfterBloom-${b.id}`); }}><Video className="h-4 w-4" />{tr("Join video")}</button></div>;
          })}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3 md:grid-cols-2">
        {PROS.map((p) => (
          <div key={p.id} className="card flex flex-col gap-2">
            <div className="flex items-start justify-between"><div><div className="font-bold text-lg font-serif">{tr(p.name)}</div><div className="text-sm text-plum-700 font-medium">{tr(p.role)}</div></div><span className="text-[10px] uppercase bg-amber-100 text-amber-900 rounded-full px-2 py-0.5 font-semibold">{tr("Sample")}</span></div>
            <div className="text-sm">{tr(p.qual)}</div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-800"><ShieldCheck className="h-4 w-4" />{tr(p.reg)}</div>
            <div className="text-sm text-plum-900/70">{tr(p.for)}</div>
            <div className="text-sm">{tr("Speaks:")} {p.langs.map((l) => tr(l)).join(", ")}</div>
            <div className="mt-auto flex items-center justify-between pt-2"><span className="font-semibold">₹{p.fee} {tr("/ session")}</span><button className="btn-primary" onClick={() => setPick(p.id)}>{tr("Book")}</button></div>
          </div>
        ))}
      </div>
      <p className="text-sm text-plum-900/70">{tr("Psychologists and counsellors provide talk therapy. A psychiatrist is for diagnosis and medication decisions. In this demo, professionals are clearly labelled sample profiles; real onboarding needs a hospital or clinical partner.")}</p>
      <Disclaimer />

      {pro && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setPick(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between"><h3 className="font-bold text-lg">{tr("Choose a time with {name}", { name: tr(pro.name) })}</h3><button onClick={() => setPick(null)} aria-label={tr("Close")}><X /></button></div>
            <div className="grid gap-2">{SLOTS.map((sl) => <button key={sl} className="btn-ghost justify-start" onClick={() => book(sl)}>{tr(sl)}</button>)}</div>
          </div>
        </div>
      )}

      {room && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between bg-plum-800 p-3 text-white"><span>{tr("Video session")}</span><button onClick={() => setRoom(null)} className="flex items-center gap-1"><X className="h-5 w-5" />{tr("Leave")}</button></div>
          <iframe className="flex-1 w-full" allow="camera; microphone; fullscreen; display-capture" src={`https://meet.jit.si/${room}#config.prejoinPageEnabled=false`} title={tr("Video session")} />
        </div>
      )}
    </div>
  );
}
