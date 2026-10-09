"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Trash2, UserPlus } from "lucide-react";
import { PageHead, Tabs, fmtDate } from "@/components/ui";
import { SYMPTOMS, Level } from "@/lib/symptoms";
import { DEFAULT_EPDS, DEFAULT_LEVELS } from "@/lib/clinical";
import { useTr } from "@/lib/i18n";
import { AlertLoadMeter, VerifyAudit } from "@/components/admin/AlertLoadMeter";

type Person = { id: string; role: string; full_name: string; city: string | null; is_demo: boolean; created_at: string; email: string };
type Hospital = { hospital: string; mothers: number; with_open_flags: number; probable_screens: number; checkins_last_7d: number };
type Load = { id: string; name: string; specialty: string | null; onDuty: boolean; isOnCall: boolean; maxOpen: number; openLoad: number };
type Cfg = { key: string; value: any; version: number; signed_off_by: string | null; signed_off_at: string | null };
const ROLES = ["pro", "moderator", "asha", "admin"] as const;
const TITLES = ["Clinical psychologist", "Counsellor", "Psychiatrist", "Gynaecologist", "Lactation consultant", "Paediatrician"];
const LEVELS: Level[] = ["RED", "AMBER", "GREEN"];

export default function Admin() {
  const tr = useTr();
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState<{ people: Person[]; hospitals: Hospital[]; config: Cfg[]; loads?: Load[] } | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/overview");
    if (!res.ok) return setErr(tr("Could not load. Please try again."));
    setData(await res.json());
  }, [tr]);
  useEffect(() => { load(); }, []); // eslint-disable-line

  // ---- people ----
  const [np, setNp] = useState({ role: "pro", name: "", email: "", title: TITLES[0], reg_no: "", qualification: "", fee: "500", bio: "" });
  const [temp, setTemp] = useState<string | null>(null);
  const create = async () => {
    setBusy(true); setErr(""); setTemp(null);
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...np, fee: +np.fee, langs: ["English", "Hindi"] }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? tr("Could not create the account."));
    setTemp(j.tempPassword); setNp({ ...np, name: "", email: "", reg_no: "", qualification: "", bio: "" }); load();
  };
  const remove = async (p: Person) => {
    if (!confirm(tr("Remove {n}? This deletes their account.", { n: p.full_name }))) return;
    const res = await fetch(`/api/admin/users?id=${p.id}`, { method: "DELETE" });
    if (res.ok) load(); else setErr(tr("Could not remove that account."));
  };

  // ---- clinical settings ----
  const cfg = (k: string) => data?.config.find((c) => c.key === k);
  const [epds, setEpds] = useState<{ possible: string; probable: string } | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Level> | null>(null);
  const [signed, setSigned] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!data) return;
    setEpds({ possible: String(cfg("epds")?.value?.possible ?? DEFAULT_EPDS.possible), probable: String(cfg("epds")?.value?.probable ?? DEFAULT_EPDS.probable) });
    setOverrides({ ...(cfg("triage_overrides")?.value ?? {}) });
  }, [data]); // eslint-disable-line
  const save = async (key: "epds" | "triage_overrides") => {
    setBusy(true); setErr(""); setMsg("");
    const value = key === "epds" ? { possible: +epds!.possible, probable: +epds!.probable } : overrides;
    const res = await fetch("/api/admin/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value, signedOffBy: signed }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? tr("Could not save."));
    setMsg(tr("Saved and signed off. New settings reach people the next time they sign in.")); load();
  };
  const shown = useMemo(() => SYMPTOMS.filter((s) => !q || s.label.toLowerCase().includes(q.toLowerCase()) || s.id.includes(q.toLowerCase())).slice(0, 80), [q]);
  const totals = (data?.hospitals ?? []).reduce((a, h) => ({ m: a.m + h.mothers, f: a.f + h.with_open_flags, p: a.p + h.probable_screens, c: a.c + h.checkins_last_7d }), { m: 0, f: 0, p: 0, c: 0 });
  const counts = (data?.people ?? []).reduce<Record<string, number>>((a, p) => ({ ...a, [p.role]: (a[p.role] ?? 0) + 1 }), {});

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHead title="Admin" sub="People, clinical settings and the partner-hospital report. No one's health records are visible here." tag="Admin" />
      <Tabs value={tab} onChange={(t) => { setTab(t); setErr(""); setMsg(""); }} tabs={[{ id: "overview", label: "Partner report" }, { id: "people", label: "People" }, { id: "clinical", label: "Clinical settings" }]} />
      {err && <p role="alert" className="rounded-control bg-danger/10 p-3 text-sm font-semibold text-danger">{err}</p>}
      {msg && <p role="status" className="flex items-center gap-2 rounded-control bg-ok/10 p-3 text-sm font-semibold text-ok"><CheckCircle2 className="h-4 w-4" aria-hidden />{msg}</p>}
      {!data && !err && <div className="card h-40 animate-pulse bg-surface-2" aria-busy="true" />}

      {data && tab === "overview" && (
        <section className="space-y-4">
          <AlertLoadMeter />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["Mothers", totals.m], ["With an open flag", totals.f], ["Probable screens", totals.p], ["Check-ins, last 7 days", totals.c]].map(([l, n]) => <div key={l as string} className="card !p-4"><div className="font-serif text-3xl text-plum-800">{n as number}</div><div className="text-xs font-semibold text-ink-muted">{tr(l as string)}</div></div>)}</div>
          <div className="card overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="text-left text-ink-muted"><th className="py-2">{tr("Hospital")}</th><th>{tr("Mothers")}</th><th>{tr("Open flags")}</th><th>{tr("Probable screens")}</th><th>{tr("Check-ins, 7 days")}</th></tr></thead>
            <tbody>{data.hospitals.map((h) => <tr key={h.hospital} className="border-t border-line"><td className="py-2 font-semibold">{h.hospital}</td><td>{h.mothers}</td><td>{h.with_open_flags}</td><td>{h.probable_screens}</td><td>{h.checkins_last_7d}</td></tr>)}</tbody></table>
            <p className="mt-3 text-xs text-ink-muted">{tr("Anonymised totals only: no names, no records. For a hospital partner's follow-up report.")}</p></div>
          <VerifyAudit />
          {(data.loads?.length ?? 0) > 0 && (
            <div className="card space-y-3" aria-labelledby="load-h">
              <div><h2 id="load-h" className="font-serif text-xl">{tr("Professional load")}</h2>
                <p className="text-sm text-ink-muted">{tr("Returning mothers go to the doctor they already know, even above the limit. New mothers go to the least busy professional who is on duty and below their limit, and the on-call professional takes over when everyone is full.")}</p></div>
              <ul className="space-y-2">{[...data.loads].sort((a, b) => (a.specialty ?? "").localeCompare(b.specialty ?? "") || a.name.localeCompare(b.name)).map((l) => {
                const pct = Math.min(100, Math.round((l.openLoad / Math.max(1, l.maxOpen)) * 100)), full = l.openLoad >= l.maxOpen;
                return (
                  <li key={l.id} className="rounded-control border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="min-w-0 flex-1">{l.name}</b>
                      <span className="text-xs text-ink-muted">{l.specialty ? tr(l.specialty.charAt(0).toUpperCase() + l.specialty.slice(1)) : tr("Not set")}</span>
                      {l.isOnCall && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{tr("On call")}</span>}
                      {!l.onDuty && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-ink-muted">{tr("Off duty")}</span>}
                      <span className={`text-sm font-bold ${full ? "text-danger" : "text-ok"}`}>{l.openLoad} {tr("of")} {l.maxOpen} {full ? `· ${tr("at capacity")}` : ""}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={l.maxOpen} aria-valuenow={l.openLoad} aria-label={tr("Open load against the limit")}><div className={`h-full rounded-full ${full ? "bg-danger" : "bg-ok"}`} style={{ width: `${pct}%` }} /></div>
                  </li>
                );
              })}</ul>
              <p className="text-xs text-ink-muted">{tr("Load counts open urgent items for the mothers matched with each professional. It will count open cases once cases are added.")}</p>
            </div>
          )}
        </section>
      )}

      {data && tab === "people" && (
        <section className="space-y-5">
          <div className="card space-y-3" aria-labelledby="np-h">
            <h2 id="np-h" className="flex items-center gap-2 font-serif text-xl"><UserPlus className="h-5 w-5 text-primary" aria-hidden />{tr("Add a team member")}</h2>
            <p className="text-sm text-ink-muted">{tr("Professionals, moderators and ASHA workers cannot sign themselves up. A professional needs a registration number, which is shown on their profile.")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold text-plum-800">{tr("Role")}<select className="input mt-1" value={np.role} onChange={(e) => setNp({ ...np, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
              <label className="text-sm font-bold text-plum-800">{tr("Name")}<input className="input mt-1" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} /></label>
              <label className="text-sm font-bold text-plum-800 sm:col-span-2">{tr("Email")}<input className="input mt-1" type="email" value={np.email} onChange={(e) => setNp({ ...np, email: e.target.value })} /></label>
              {np.role === "pro" && (<>
                <label className="text-sm font-bold text-plum-800">{tr("Profession")}<select className="input mt-1" value={np.title} onChange={(e) => setNp({ ...np, title: e.target.value })}>{TITLES.map((t) => <option key={t}>{t}</option>)}</select></label>
                <label className="text-sm font-bold text-plum-800">{tr("Registration number (RCI or medical council)")}<input className="input mt-1" value={np.reg_no} onChange={(e) => setNp({ ...np, reg_no: e.target.value })} /></label>
                <label className="text-sm font-bold text-plum-800">{tr("Qualification")}<input className="input mt-1" value={np.qualification} onChange={(e) => setNp({ ...np, qualification: e.target.value })} /></label>
                <label className="text-sm font-bold text-plum-800">{tr("Fee per session (₹)")}<input className="input mt-1" inputMode="numeric" value={np.fee} onChange={(e) => setNp({ ...np, fee: e.target.value })} /></label>
              </>)}
            </div>
            <button className="btn-primary" disabled={busy || !np.name.trim() || !np.email.trim()} onClick={create}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{tr("Create account")}</button>
            {temp && <p role="status" className="rounded-control bg-plum-100 p-3 text-sm">{tr("Temporary password, shown once:")} <b className="select-all font-mono">{temp}</b></p>}
          </div>
          <div className="card overflow-x-auto"><h2 className="mb-2 font-serif text-xl">{tr("People")} ({Object.entries(counts).map(([r, n]) => `${r} ${n}`).join(" · ")})</h2>
            <table className="w-full min-w-[560px] text-sm"><thead><tr className="text-left text-ink-muted"><th className="py-2">{tr("Name")}</th><th>{tr("Role")}</th><th>{tr("Email")}</th><th>{tr("Joined")}</th><th /></tr></thead>
              <tbody>{data.people.map((p) => <tr key={p.id} className="border-t border-line"><td className="py-2 font-semibold">{p.full_name}{p.is_demo && <span className="ml-2 rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-bold uppercase text-warn">demo</span>}</td><td>{p.role}</td><td className="break-all">{p.email}</td><td>{fmtDate(p.created_at)}</td><td>{p.role !== "mother" && p.role !== "family" && <button onClick={() => remove(p)} aria-label={tr("Remove {n}", { n: p.full_name })} className="flex h-11 w-11 items-center justify-center text-danger"><Trash2 className="h-4 w-4" aria-hidden /></button>}</td></tr>)}</tbody></table></div>
        </section>
      )}

      {data && tab === "clinical" && epds && overrides && (
        <section className="space-y-5">
          <p className="rounded-card bg-warn/10 p-4 text-sm">{tr("These settings decide when a mother is told to go to hospital or is called by her care team. Change them only on a clinician's written sign-off, which is recorded below.")}</p>
          <label className="card block space-y-1 text-sm font-bold text-plum-800">{tr("Name of the clinician who signed this off")}<input className="input mt-1" value={signed} onChange={(e) => setSigned(e.target.value)} placeholder="Dr. …" /></label>

          <div className="card space-y-3" aria-labelledby="epds-h">
            <h2 id="epds-h" className="font-serif text-xl">{tr("EPDS cut-off scores")}</h2>
            <p className="text-sm text-ink-muted">{tr("Indian studies use cut-offs between 9 and 13. Version {v}; last signed off by {who}.", { v: cfg("epds")?.version ?? 1, who: cfg("epds")?.signed_off_by ?? tr("nobody yet (draft defaults)") })}</p>
            <div className="flex flex-wrap gap-3">
              <label className="text-sm font-bold text-plum-800">{tr("Possible from")}<input className="input mt-1 !w-28" inputMode="numeric" value={epds.possible} onChange={(e) => setEpds({ ...epds, possible: e.target.value })} /></label>
              <label className="text-sm font-bold text-plum-800">{tr("Probable from")}<input className="input mt-1 !w-28" inputMode="numeric" value={epds.probable} onChange={(e) => setEpds({ ...epds, probable: e.target.value })} /></label>
            </div>
            <p className="text-xs text-ink-muted">{tr("Question 10 scored 1 or more always opens the crisis screen, whatever the total.")}</p>
            <button className="btn-primary" disabled={busy || signed.trim().length < 3} onClick={() => save("epds")}>{tr("Save and sign off")}</button>
          </div>

          <div className="card space-y-3" aria-labelledby="tri-h">
            <h2 id="tri-h" className="font-serif text-xl">{tr("Triage levels")}</h2>
            <p className="text-sm text-ink-muted">{tr("RED = go to hospital now. AMBER = see a doctor within 24 hours. GREEN = normal recovery. Version {v}; last signed off by {who}.", { v: cfg("triage_overrides")?.version ?? 1, who: cfg("triage_overrides")?.signed_off_by ?? tr("nobody yet (draft defaults)") })}</p>
            <input className="input" aria-label={tr("Search symptoms")} placeholder={tr("Search symptoms")} value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="max-h-96 divide-y divide-line overflow-y-auto rounded-control border border-line">
              {shown.map((s) => {
                const cur = overrides[s.id] ?? DEFAULT_LEVELS[s.id];
                return (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1"><div className="truncate font-semibold">{s.label}</div><div className="text-xs text-ink-muted">{s.who} · {tr("draft default")}: {DEFAULT_LEVELS[s.id]}</div></div>
                    <select aria-label={`${s.label} level`} className={`input !w-28 !py-1.5 ${cur !== DEFAULT_LEVELS[s.id] ? "!border-warn" : ""}`} value={cur} onChange={(e) => { const o = { ...overrides }; if (e.target.value === DEFAULT_LEVELS[s.id]) delete o[s.id]; else o[s.id] = e.target.value as Level; setOverrides(o); }}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-ink-muted">{Object.keys(overrides).length} {tr("changes from the draft defaults")}</p>
            <button className="btn-primary" disabled={busy || signed.trim().length < 3} onClick={() => save("triage_overrides")}>{tr("Save and sign off")}</button>
          </div>
        </section>
      )}
    </div>
  );
}
