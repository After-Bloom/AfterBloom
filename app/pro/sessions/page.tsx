"use client";
import { CalendarClock, Video } from "lucide-react";
import { PageHead, fmtTime } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { canJoin, roomUrl } from "@/lib/slots";
import { usePro } from "@/components/pro/ProProvider";

export default function Sessions() {
  const tr = useTr();
  const pd = usePro();
  const name = (id: string) => pd.rows.find((r) => r.id === id)?.name ?? "";
  if (pd.loading) return <div className="mx-auto max-w-3xl space-y-3" aria-busy="true">{[0, 1].map((i) => <div key={i} className="card h-20 animate-pulse bg-surface-2" />)}</div>;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHead title="Sessions" sub="Your booked video sessions. Joining opens 10 minutes before the start." tag="Sample profile" />
      {pd.bookings.length === 0 && <div className="card text-ink-muted">{tr("No sessions booked.")}</div>}
      {pd.bookings.map((b) => (
        <div key={b.id} className="card flex flex-wrap items-center gap-3 !p-4">
          <CalendarClock className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1"><div className="font-bold">{tr(name(b.motherId) || "Patient")}</div><div className="text-sm text-ink-muted">{fmtTime(b.startsAt)}</div></div>
          <a href={canJoin(b.startsAt) ? roomUrl(b.room) : undefined} target="_blank" rel="noreferrer" aria-disabled={!canJoin(b.startsAt)} className={`btn-primary ${canJoin(b.startsAt) ? "" : "pointer-events-none opacity-50"}`}><Video className="h-4 w-4" aria-hidden />{tr("Join video call")}</a>
        </div>
      ))}
    </div>
  );
}
