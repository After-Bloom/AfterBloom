"use client";
import { useCallback, useEffect, useState } from "react";
import { Clock, Loader2, Send } from "lucide-react";
import { fmtTime } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { useNow } from "@/lib/useNow";
import { TOPICS } from "@/lib/ask/knowledge";

// Professional dashboard tab: questions patients CHOSE to send from Ask Bloom. Reply within 24 hours.
// Replies are written by a human. Every reply is logged in audit_log, and she gets a neutral "You have a new message".
type Q = { id: string; motherId: string; name: string; question: string | null; reply: string | null; status: string; nearTopic: string | null; createdAt: string; repliedAt: string | null };

export function useProQuestions() {
  const [items, setItems] = useState<Q[]>([]);
  const load = useCallback(async () => { const r = await fetch("/api/pro/questions", { cache: "no-store" }).catch(() => null); if (r?.ok) setItems((await r.json()).items); }, []);
  useEffect(() => { void load(); }, [load]);
  return { items, open: items.filter((q) => q.status === "open").length, reload: load };
}

export function ProQuestions({ items, reload }: { items: Q[]; reload: () => void }) {
  const tr = useTr();
  const now = useNow(60000);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const send = async (id: string) => {
    const reply = (draft[id] ?? "").trim();
    if (reply.length < 2) return;
    setBusy(id);
    const r = await fetch("/api/pro/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, reply }) }).catch(() => null);
    setBusy(null);
    if (!r?.ok) return alert(tr("Could not send the reply. Please try again."));
    setDraft((d) => ({ ...d, [id]: "" }));
    reload();
  };

  if (!items.length) return <div className="card text-ink-muted">{tr("No questions from your patients.")}</div>;
  return (
    <div className="space-y-3">
      {items.map((q) => {
        const hours = Math.floor((now - new Date(q.createdAt).getTime()) / 3600000);
        const late = q.status === "open" && hours >= 24;
        const near = TOPICS.find((t) => t.id === q.nearTopic);
        return (
          <div key={q.id} className={`card space-y-2 ${late ? "!border-warn/60" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b>{tr(q.name || "Patient")}</b>
              <span className={`flex items-center gap-1 text-xs font-semibold ${late ? "text-warn" : "text-ink-muted"}`}><Clock className="h-3.5 w-3.5" aria-hidden />{fmtTime(q.createdAt)}{q.status === "open" ? ` · ${tr("waiting {h} h", { h: hours })}` : ""}</span>
            </div>
            <p className="text-base">{q.question ?? tr("(could not be read)")}</p>
            {near && <p className="text-xs text-ink-muted">{tr("Closest library answer")}: {near.title}</p>}
            {q.reply ? (
              <p className="rounded-control bg-surface-2 p-3 text-sm"><b>{tr("Your reply")}:</b> {q.reply}</p>
            ) : (
              <div className="space-y-2">
                <textarea className="input min-h-[80px] w-full" maxLength={1000} value={draft[q.id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [q.id]: e.target.value }))} placeholder={tr("Write a short, plain reply. If she needs to be seen, say so clearly.")} />
                <button className="btn-primary !py-2" disabled={busy === q.id || (draft[q.id] ?? "").trim().length < 2} onClick={() => send(q.id)}>{busy === q.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}{tr("Send reply")}</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
