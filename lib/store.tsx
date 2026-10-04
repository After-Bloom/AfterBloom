"use client";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { CrisisKind } from "./triage";
import type { Level } from "./symptoms";
import type { EpdsBand } from "./epds";
import { loc } from "./locale";
import { supabase } from "./supabase/client";
import { loadAccount, loadMother, mapAlert } from "./data/load";
import { applyClinicalConfig } from "./clinical";

export type Role = "mother" | "family" | "pro" | "moderator" | "asha" | "admin";
export type Lang = "en" | "hi";
export type Checkin = { date: string; mood: number; appetite: number; sleepHours: number; level: Level; bp?: { sys: number; dia: number } };
export type SymptomLog = { date: string; text: string; level: Level; labels: string[] };
export type EpdsResult = { date: string; total: number; band: EpdsBand; selfHarm: boolean };
export type Flag = { id: string; date: string; kind: "q10" | "red" | "epds" | "selfharm"; text: string; resolved: boolean; dueAt: string };
export type FamilyMember = { id: string; name: string; relation: string; code: string; status: "invited" | "active" | "removed"; sees: { alerts: boolean; trends: boolean; weekly: boolean } };
export type Booking = { id: string; proId: string; proName: string; proTitle: string; when: string; room: string; status: "booked" | "done" | "cancelled" };
export type Alert = { id: string; at: string; text: string; title: string; body: string; kind: string; read: boolean };
export type Audit = { at: string; who: string; what: string };

export type State = {
  lang: Lang;
  mother: { name: string; babyName: string; birth: string; delivery: string; city: string; babySex: "boy" | "girl" | null; phone: string };
  checkins: Checkin[]; symptomLogs: SymptomLog[]; epds: EpdsResult[]; flags: Flag[];
  family: FamilyMember[]; shifts: Record<string, string>; partnerScreens: { date: string; yes: number }[];
  consent: { emergencyAlert: boolean; shareWithPro: boolean; familyNote: boolean; emergencyContact: string; emergencyPhone: string; cloudMatch: boolean | null };
  bookings: Booking[]; vaccinesDone: string[]; milestonesDone: string[]; weights: { date: string; kg: number; cm?: number }[]; benefits: string[];
  alerts: Alert[]; audit: Audit[];
  pinHash: string | null; neutralNotif: boolean; circleId: string | null;
};

export type Auth = { status: "loading" | "guest" | "user"; userId?: string; role?: Role; name?: string };

export const emptyState = (): State => ({
  lang: "en",
  mother: { name: "", babyName: "", birth: new Date().toISOString(), delivery: "Normal", city: "", babySex: null, phone: "" },
  checkins: [], symptomLogs: [], epds: [], flags: [], family: [], shifts: {}, partnerScreens: [],
  consent: { emergencyAlert: false, shareWithPro: true, familyNote: false, emergencyContact: "", emergencyPhone: "", cloudMatch: null },
  bookings: [], vaccinesDone: [], milestonesDone: [], weights: [], benefits: [], alerts: [], audit: [],
  pinHash: null, neutralNotif: true, circleId: null,
});

const DAY = 86400000;
/** Local calendar date as YYYY-MM-DD. A plain date string is returned untouched so it never shifts across time zones. */
export const dayStr = (d: Date | string) => {
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
export const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / DAY);

type Crisis = { kind: CrisisKind; reason: string } | null;
type Ctx = {
  s: State; ready: boolean; auth: Auth; set: (f: (s: State) => State) => void; refresh: () => Promise<void>;
  crisis: Crisis; openCrisis: (c: NonNullable<Crisis>) => void; closeCrisis: () => void;
  locked: boolean; setLocked: (b: boolean) => void;
};
const C = createContext<Ctx>(null as any);
export const useApp = () => useContext(C);
const DEVICE = "ab.device"; // things that belong to this phone, not the account: language, PIN hash, a guest's matching choice

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(() => emptyState());
  const [ready, setReady] = useState(false);
  const [auth, setAuth] = useState<Auth>({ status: "loading" });
  const [crisis, setCrisis] = useState<Crisis>(null);
  const [locked, setLocked] = useState(false);
  const uidRef = useRef<string | null>(null);
  loc.v = s.lang === "hi" ? "hi-IN" : "en-IN";
  useEffect(() => { document.documentElement.lang = s.lang; }, [s.lang]);

  // device settings
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DEVICE) ?? "{}");
      setS((p) => ({ ...p, lang: d.lang === "hi" ? "hi" : "en", pinHash: d.pinHash ?? null, consent: { ...p.consent, cloudMatch: d.cloudMatch ?? null } }));
      if (d.pinHash) setLocked(true);
    } catch {}
  }, []);
  const persistDevice = useCallback((st: State) => {
    try { localStorage.setItem(DEVICE, JSON.stringify({ lang: st.lang, pinHash: st.pinHash, cloudMatch: st.consent.cloudMatch })); } catch {}
  }, []);
  useEffect(() => { if (ready) persistDevice(s); }, [s.lang, s.pinHash, s.consent.cloudMatch, ready]); // eslint-disable-line

  const hydrate = useCallback(async (uid: string, fallbackRole?: Role) => {
    const sb = supabase();
    const { profile, alerts } = await loadAccount(sb, uid);
    sb.from("clinical_config").select("key, value").then(({ data }) => applyClinicalConfig(data)); // clinician-set cut-offs and triage levels
    const role = (profile?.role ?? fallbackRole ?? "mother") as Role;
    const name = profile?.full_name ?? "";
    setAuth({ status: "user", userId: uid, role, name });
    let mother: Partial<State> = {};
    if (role === "mother") mother = await loadMother(sb, uid);
    setS((p) => ({
      ...p, ...mother, alerts,
      lang: p.lang,
      consent: { ...p.consent, ...(mother.consent ?? {}), cloudMatch: mother.consent ? mother.consent.cloudMatch : p.consent.cloudMatch },
      mother: { ...p.mother, ...(mother.mother ?? {}), name },
    }));
  }, []);

  const refresh = useCallback(async () => { if (uidRef.current) await hydrate(uidRef.current); }, [hydrate]);

  useEffect(() => {
    const sb = supabase();
    let alive = true;
    sb.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user;
      if (u) { uidRef.current = u.id; await hydrate(u.id, (u.app_metadata as any)?.role); }
      else setAuth({ status: "guest" });
      if (alive) setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      const u = session?.user;
      if (event === "SIGNED_OUT" || !u) { uidRef.current = null; setAuth({ status: "guest" }); setS((p) => ({ ...emptyState(), lang: p.lang, pinHash: p.pinHash })); return; }
      if (event === "SIGNED_IN" && uidRef.current !== u.id) { uidRef.current = u.id; hydrate(u.id, (u.app_metadata as any)?.role); }
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [hydrate]);

  // live alerts for any signed-in person (emergency alerts for family, callbacks for professionals, support messages)
  useEffect(() => {
    if (auth.status !== "user" || !auth.userId) return;
    const sb = supabase();
    const ch = sb.channel(`alerts:${auth.userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts", filter: `user_id=eq.${auth.userId}` },
        (p) => setS((st) => ({ ...st, alerts: [mapAlert(p.new), ...st.alerts].slice(0, 40) })))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [auth.status, auth.userId]);

  const set = useCallback((f: (s: State) => State) => setS(f), []);
  const openCrisis = useCallback((c: NonNullable<Crisis>) => setCrisis(c), []);

  return (
    <C.Provider value={{ s, ready, auth, set, refresh, crisis, openCrisis, closeCrisis: () => setCrisis(null), locked, setLocked }}>
      {children}
    </C.Provider>
  );
}

export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10));
