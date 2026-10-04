"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { useTr } from "@/lib/i18n";
import { rise } from "@/lib/motion";

const ROLE_LABEL: Record<string, string> = { mother: "Mother", family: "Family", pro: "Professional", moderator: "Moderator", asha: "ASHA worker", admin: "Admin" };

export function AccountMenu() {
  const { auth } = useApp();
  const act = useActions();
  const tr = useTr();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [open]);

  if (auth.status !== "user") {
    return <Link href="/login" className="flex h-11 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-bold text-plum-800 transition hover:bg-plum-100"><LogIn className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">{tr("Sign in")}</span></Link>;
  }
  const initial = (auth.name || "?").trim()[0]?.toUpperCase();
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={tr("Account")} className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-fill text-lg font-bold text-primary-on transition active:scale-90">{initial}</button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
            <m.div variants={rise} initial="hidden" animate="show" exit="exit" className="absolute right-0 top-12 z-50 w-64 rounded-card border border-line bg-surface p-3 shadow-lift">
              <div className="px-2 pb-2"><div className="truncate font-bold text-plum-800">{auth.name}</div><div className="text-xs text-ink-muted">{tr(ROLE_LABEL[auth.role ?? "mother"])}</div></div>
              <Link href="/privacy" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center gap-2 rounded-control px-2 text-sm font-semibold hover:bg-plum-100"><ShieldCheck className="h-4 w-4" aria-hidden />{tr("Privacy & data")}</Link>
              <button onClick={async () => { setOpen(false); await act.signOut(); window.location.assign("/"); }} className="flex min-h-[44px] w-full items-center gap-2 rounded-control px-2 text-left text-sm font-semibold hover:bg-plum-100"><LogOut className="h-4 w-4" aria-hidden />{tr("Sign out")}</button>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
