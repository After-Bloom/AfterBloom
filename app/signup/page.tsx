"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { Segmented } from "@/components/ui";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";

function Form() {
  const tr = useTr();
  const { s } = useApp();
  const params = useSearchParams();
  const [role, setRole] = useState<"mother" | "family">(params.get("role") === "family" ? "family" : "mother");
  const [f, setF] = useState({ name: "", email: "", password: "", babyName: "", birthDate: new Date().toISOString().slice(0, 10), delivery: "Normal", city: "", phone: "", inviteCode: params.get("code") ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, role, lang: s.lang }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); return setError(j.error ?? tr("Could not create the account.")); }
    const { error: se } = await supabase().auth.signInWithPassword({ email: f.email.trim(), password: f.password });
    if (se) { setBusy(false); return setError(tr("Your account is ready. Please sign in.")); }
    window.location.assign(role === "family" ? "/family-view" : "/home");
  };

  const field = (id: keyof typeof f, label: string, type = "text", extra: Record<string, any> = {}) => (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-plum-800">{tr(label)}</label>
      <input id={id} type={type} className="input" value={f[id]} onChange={up(id)} {...extra} />
    </div>
  );

  return (
    <form onSubmit={submit} className="card space-y-4" noValidate>
      <Segmented<"mother" | "family"> label="I am signing up as" value={role} onChange={setRole} options={[{ id: "mother", label: "A new mother" }, { id: "family", label: "A family member" }]} />
      {field("name", "Your name", "text", { autoComplete: "name", required: true })}
      {field("email", "Email", "email", { autoComplete: "email", inputMode: "email", required: true })}
      {field("password", "Password (at least 8 characters)", "password", { autoComplete: "new-password", required: true, minLength: 8 })}
      {role === "mother" ? (
        <>
          {field("babyName", "Baby's name (you can add it later)")}
          {field("birthDate", "Baby's date of birth", "date", { max: new Date().toISOString().slice(0, 10), required: true })}
          <Segmented<"Normal" | "C-section"> label="How was the baby born?" value={f.delivery as "Normal" | "C-section"} onChange={(v) => setF((p) => ({ ...p, delivery: v }))} options={[{ id: "Normal", label: "Normal" }, { id: "C-section", label: "C-section" }]} />
          {field("city", "City (to find mothers near you)", "text", { autoComplete: "address-level2" })}
          <div>{field("phone", "Your phone number (so your care team can call you)", "tel", { autoComplete: "tel", inputMode: "tel" })}<p className="mt-1 text-xs text-ink-muted">{tr("Optional. Only your matched professional can see it.")}</p></div>
        </>
      ) : (
        <div>
          {field("inviteCode", "Invite code from the mother", "text", { autoCapitalize: "characters", required: true })}
          <p className="mt-1 text-xs text-ink-muted">{tr("She finds it under Family circle in her app.")}</p>
        </div>
      )}
      {error && <p role="alert" className="rounded-control bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full !py-3.5 text-base">{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{tr("Create my account")}</button>
      <p className="text-xs text-ink-muted">{tr("You choose what to share and with whom, and can change it any time. No advertising, ever.")}</p>
      <p className="text-center text-sm text-ink-muted">{tr("Already have an account?")} <Link href="/login" className="font-bold text-primary underline underline-offset-4">{tr("Sign in")}</Link></p>
    </form>
  );
}

export default function Signup() {
  return <AuthShell title="Create your account" sub="Free for mothers, always."><Suspense><Form /></Suspense></AuthShell>;
}
