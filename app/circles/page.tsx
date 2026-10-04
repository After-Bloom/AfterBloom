"use client";
import { useState } from "react";
import { Send, Users, HeartHandshake, CalendarClock } from "lucide-react";
import { useApp, uid } from "@/lib/store";
import { hasSelfHarmLanguage } from "@/lib/triage";
import { PageHead, Soon, fmtTime } from "@/components/ui";
import { useTr } from "@/lib/i18n";

const TOPICS = ["All", "Sleep", "Feeding", "C-section recovery", "Body changes", "In-law pressure", "Returning to work"];
// Posts that look like medical advice get an automatic note (software never replies on its own).
const MED_ADVICE = /\b\d+\s?(mg|ml|tablet|tab|drops)\b|paracetamol|crocin|antibiotic|\btake (this|a|some)\b|ghar ka (nuskha|ilaj)|home remedy|dawai|dawa le/i;

export default function Circles() {
  const { s, set, openCrisis } = useApp();
  const tr = useTr();
  const [topic, setTopic] = useState("All");
  const [postTopic, setPostTopic] = useState("Sleep");
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(false);

  if (!s.joinedCircle) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <PageHead title="Bloom Circles" sub="A small, safe group of mothers at the same stage as you." />
        <div className="card space-y-3">
          <div className="flex items-center gap-3"><Users className="h-8 w-8 text-plum-600" /><div><b>{tr("Your circle")}</b><div className="text-sm text-plum-900/70">{tr(s.mother.city)} · {tr("Hindi / English · babies born this month · about 18 mothers")}</div></div></div>
          <h3 className="font-bold pt-2">{tr("Community rules")}</h3>
          <ul className="list-disc ml-5 space-y-1 text-sm">
            <li><b>{tr("No medical advice from members.")}</b> {tr("Please check anything medical with your doctor or the symptom checker. Unsafe advice spreads fast.")}</li>
            <li>{tr("No judging, shaming or comparing (\"my baby already does this, does yours?\").")}</li>
            <li>{tr("You can post anonymously. Your family cannot see your circle posts.")}</li>
            <li>{tr("If someone writes about harming themselves, a human moderator is alerted and they are shown crisis help. The software never replies on its own.")}</li>
          </ul>
          <button className="btn-primary w-full" onClick={() => set((p) => ({ ...p, joinedCircle: true }))}>{tr("I agree, join my circle")}</button>
        </div>
      </div>
    );
  }

  const post = () => {
    const t = text.trim();
    if (!t) return;
    const id = uid();
    const harm = hasSelfHarmLanguage(t);
    const advice = !harm && MED_ADVICE.test(t);
    set((p) => ({
      ...p,
      posts: [...p.posts, { id, author: s.mother.name, anon, text: t, at: new Date().toISOString(), topic: postTopic, note: advice ? "Please check this with your doctor or use the symptom checker." : undefined }],
      mod: harm ? [{ id: uid(), postId: id, text: t, at: new Date().toISOString(), reason: "Self-harm / crisis language", done: false }, ...p.mod] : p.mod,
      flags: harm ? [{ id: uid(), date: new Date().toISOString(), kind: "selfharm", text: "Self-harm language in Bloom Circle", resolved: false, dueAt: new Date().toISOString() }, ...p.flags] : p.flags,
    }));
    setText("");
    if (harm) openCrisis({ kind: "selfharm", reason: "Something you wrote in your circle" });
  };

  const shown = s.posts.filter((x) => !x.hidden && (topic === "All" || x.topic === topic));
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHead title="Bloom Circle" sub={tr("{city} · Hindi / English · 18 mothers · guided by a Bloom Buddy", { city: tr(s.mother.city) })} tag="Live" />
      <div className="flex gap-2 overflow-x-auto pb-1">{TOPICS.map((t) => <button key={t} onClick={() => setTopic(t)} className={`chip whitespace-nowrap ${topic === t ? "chip-on" : ""}`}>{tr(t)}</button>)}</div>

      <div className="space-y-3">
        {shown.length === 0 && <div className="card text-plum-900/60">{tr("No posts here yet. Start the conversation.")}</div>}
        {shown.map((x) => {
          const mine = !x.anon && x.author === s.mother.name || (x.anon && x.author === s.mother.name);
          return (
            <div key={x.id} className={`card ${mine ? "border-plum-300 bg-plum-50" : ""}`}>
              <div className="flex justify-between text-sm"><b>{x.anon ? tr("Anonymous mother") : tr(x.author)}</b><span className="text-plum-900/50">{fmtTime(x.at)} · {tr(x.topic)}</span></div>
              <p className="mt-1.5">{tr(x.text)}</p>
              {x.note && <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-sm text-amber-900">{tr(x.note)}</p>}
            </div>
          );
        })}
      </div>

      <div className="card sticky bottom-20 md:bottom-4 space-y-2 shadow-lg">
        <textarea className="input" rows={2} placeholder={tr("Share with your circle…")} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-lg border border-plum-200 px-2 py-2 text-sm" value={postTopic} onChange={(e) => setPostTopic(e.target.value)}>{TOPICS.slice(1).map((t) => <option key={t} value={t}>{tr(t)}</option>)}</select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-plum-700" checked={anon} onChange={(e) => setAnon(e.target.checked)} />{tr("Post anonymously")}</label>
          <button className="btn-primary ml-auto" onClick={post}><Send className="h-4 w-4" />{tr("Post")}</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card"><HeartHandshake className="h-5 w-5 text-plum-600" /><b className="block mt-1">{tr("Bloom Buddies")}</b><p className="text-sm text-plum-900/70">{tr("Trained peer mentors who went through it themselves.")}</p><div className="mt-2"><Soon>Needs trained people or an NGO partner.</Soon></div></div>
        <div className="card"><CalendarClock className="h-5 w-5 text-plum-600" /><b className="block mt-1">{tr("Monthly expert Q&A")}</b><p className="text-sm text-plum-900/70">{tr("Live session with a psychologist, lactation consultant or gynaecologist.")}</p><div className="mt-2"><Soon>Production plan. Demo does not claim 24×7 moderation.</Soon></div></div>
      </div>
    </div>
  );
}
