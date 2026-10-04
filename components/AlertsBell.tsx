"use client";
import { useEffect, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { Bell, BellRing, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { enablePush, pushSupported } from "@/lib/push";
import { useTr } from "@/lib/i18n";
import { fmtTime } from "./ui";
import { rise } from "@/lib/motion";

// Alerts arrive live (realtime). Wording on a shared phone stays neutral: the sender never puts health details in an alert.
export function AlertsBell() {
  const { s, auth } = useApp();
  const act = useActions();
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const [push, setPush] = useState<"idle" | "granted" | "denied" | "unsupported" | "error">("idle");
  const unread = s.alerts.filter((a) => !a.read).length;

  useEffect(() => { if (pushSupported() && Notification.permission === "granted") setPush("granted"); }, []);
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [open]);

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={unread ? tr("{n} unread alerts", { n: unread }) : tr("Alerts")} className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line text-plum-800 transition hover:bg-plum-100 active:scale-90">
        {unread ? <BellRing className="h-5 w-5" aria-hidden /> : <Bell className="h-5 w-5" aria-hidden />}
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white dark:text-[#1C1117]">{unread > 9 ? "9+" : unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
            <m.div variants={rise} initial="hidden" animate="show" exit="exit" role="dialog" aria-label={tr("Alerts")} className="absolute right-0 top-12 z-50 w-[min(92vw,22rem)] rounded-card border border-line bg-surface p-3 shadow-lift">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="font-serif text-xl">{tr("Alerts")}</h2>
                {unread > 0 && <button onClick={() => act.markAllRead()} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-primary"><Check className="h-4 w-4" aria-hidden />{tr("Mark all read")}</button>}
              </div>
              <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                {s.alerts.length === 0 && <li className="rounded-control bg-surface-2 p-3 text-sm text-ink-muted">{tr("Nothing new. We will tell you here, and on this phone if you turn notifications on.")}</li>}
                {s.alerts.map((a) => (
                  <li key={a.id}>
                    <button onClick={() => act.markAlertRead(a.id)} className={`w-full rounded-control p-3 text-left text-sm ${a.read ? "bg-surface-2/60 text-ink-muted" : "border border-primary/30 bg-plum-100 font-semibold text-ink"}`}>
                      <span className="block">{tr(a.title)}{a.body ? `: ${tr(a.body)}` : ""}</span>
                      <span className="mt-0.5 block text-xs font-normal text-ink-muted">{fmtTime(a.at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {pushSupported() && push !== "granted" && auth.userId && (
                <button onClick={async () => setPush(await enablePush(auth.userId!))} className="btn-soft mt-3 w-full !py-2.5">{push === "denied" ? tr("Notifications are blocked in this browser") : tr("Turn on notifications on this phone")}</button>
              )}
              {push === "granted" && <p className="mt-3 px-1 text-xs text-ink-muted">{tr("Notifications are on for this phone.")}</p>}
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
