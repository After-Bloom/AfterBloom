"use client";
import Link from "next/link";
import { Flower2, Phone } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { LangToggle } from "./LangToggle";

// Sign-in and sign-up share this frame. The crisis link is always one tap away and needs no account.
export function AuthShell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  const tr = useTr();
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-line bg-surface/90">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
          <Link href="/" className="flex items-center gap-1.5 font-serif text-xl font-bold text-plum-800 sm:text-2xl"><Flower2 className="h-6 w-6 text-primary" aria-hidden />AfterBloom</Link>
          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
            <a href="/crisis" className="flex h-11 items-center gap-1.5 rounded-full bg-red-600 px-3.5 text-sm font-bold text-white"><Phone className="h-4 w-4" aria-hidden /><span className="sm:hidden">{tr("Help now")}</span><span className="hidden sm:inline">{tr("Need help now?")}</span></a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <div className="mx-auto max-w-md">
          <h1 className="text-4xl md:text-5xl">{tr(title)}</h1>
          {sub && <p className="mt-2 text-lg text-ink-muted">{tr(sub)}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mx-auto mt-10 max-w-md text-center text-xs text-ink-muted">{tr("AfterBloom offers screening support and care navigation, not a diagnosis. In an emergency call 112.")}</p>
      </main>
    </div>
  );
}
