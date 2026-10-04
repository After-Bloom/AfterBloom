"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { DEMO, DemoKey, HOME_BY_ROLE } from "@/lib/demo";
import { AuthShell } from "@/components/AuthShell";
import { useTr } from "@/lib/i18n";

function Form() {
  const tr = useTr();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const demoOn = process.env.NEXT_PUBLIC_ENABLE_DEMO !== "false";

  const go = (home: string) => window.location.assign(next && next.startsWith("/") && !next.startsWith("//") ? next : home);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("login"); setError("");
    const { data, error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) { setBusy(null); return setError(tr("That email and password do not match. Please try again.")); }
    go(HOME_BY_ROLE[(data.user.app_metadata as any)?.role ?? "mother"] ?? "/home");
  };

  const demo = async (who: DemoKey) => {
    setBusy(who); setError("");
    const res = await fetch("/api/auth/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ who }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(null); return setError(j.error ?? tr("Could not open the demo.")); }
    go(j.home);
  };

  return (
    <>
      <form onSubmit={signIn} className="card space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-bold text-plum-800">{tr("Email")}</label>
          <input id="email" type="email" autoComplete="email" inputMode="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-bold text-plum-800">{tr("Password")}</label>
          <input id="password" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p role="alert" className="rounded-control bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>}
        <button type="submit" disabled={!!busy || !email || !password} className="btn-primary w-full !py-3.5 text-base">{busy === "login" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}{tr("Sign in")}</button>
        <p className="text-center text-sm text-ink-muted">{tr("New here?")} <Link href="/signup" className="font-bold text-primary underline underline-offset-4">{tr("Create an account")}</Link></p>
      </form>

      <p className="mt-4 text-center text-sm text-ink-muted">{tr("You do not need an account to check a symptom or to get help.")} <Link href="/check" className="font-bold text-primary underline underline-offset-4">{tr("Symptom checker")}</Link></p>

      {demoOn && (
        <section className="card mt-6 space-y-3" aria-labelledby="demo-h">
          <h2 id="demo-h" className="font-serif text-2xl">{tr("Try the demo")}</h2>
          <p className="text-sm text-ink-muted">{tr("One tap into a ready-made account. Professionals here are sample profiles, not real clinicians.")}</p>
          <div className="grid gap-2">
            {(Object.keys(DEMO) as DemoKey[]).map((k) => (
              <button key={k} onClick={() => demo(k)} disabled={!!busy} className="flex min-h-[56px] items-center gap-3 rounded-control border border-line bg-surface-2 px-4 py-2 text-left transition hover:bg-plum-100 disabled:opacity-60">
                <span className="min-w-0 flex-1"><span className="block font-bold text-plum-800">{DEMO[k].name}</span><span className="block text-xs text-ink-muted">{tr(DEMO[k].blurb)}</span></span>
                {busy === k ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowRight className="h-4 w-4 text-primary" aria-hidden />}
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default function Login() {
  return <AuthShell title="Welcome back" sub="Sign in to pick up where you left off."><Suspense><Form /></Suspense></AuthShell>;
}
