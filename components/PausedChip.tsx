"use client";
import Link from "next/link";
import { useState } from "react";
import { PauseCircle } from "lucide-react";
import { useApp } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { useTr } from "@/lib/i18n";
import { isIndefinitePause } from "@/lib/consent";
import { formatTime } from "@/lib/time";
import { showToast } from "@/components/Toast";

/** B8: a small reminder on her home screen that sharing is paused, so she never forgets she turned it off. */
export function PausedChip() {
  const { s } = useApp();
  const act = useActions();
  const tr = useTr();
  const [busy, setBusy] = useState(false);
  const until = s.consent.sharingPausedUntil;
  const paused = !!until && new Date(until).getTime() > Date.now();
  if (!paused) return null;

  const resume = async () => {
    setBusy(true);
    const id = await act.resumeSharing();
    setBusy(false);
    if (id) showToast(`${tr("Saved")} · ${tr("Receipt")} #${id.slice(0, 8)}`);
  };

  return (
    <section role="status" aria-label={tr("Sharing paused")} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-warn/40 bg-warn/10 p-4 text-sm font-semibold text-warn">
      <span className="flex items-center gap-2"><PauseCircle className="h-5 w-5 shrink-0" aria-hidden />{isIndefinitePause(until) ? tr("Sharing is paused until you resume.") : tr("Sharing is paused until {t}.", { t: formatTime(until!, s.lang) })}</span>
      <div className="flex items-center gap-2">
        <button className="btn-soft !py-1.5" disabled={busy} onClick={resume}>{tr("Resume now")}</button>
        <Link href="/privacy" className="text-xs font-semibold underline underline-offset-4">{tr("Details")}</Link>
      </div>
    </section>
  );
}
