"use client";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { CrisisKind } from "./triage";
import type { Level } from "./symptoms";
import type { EpdsBand } from "./epds";
import { loc } from "./locale";
import { seed } from "./mock";

export type Role = "mother" | "family" | "pro";
export type Lang = "en" | "hi";
export type Checkin = { date: string; mood: number; appetite: number; sleepHours: number; level: Level; bp?: { sys: number; dia: number } };
export type SymptomLog = { date: string; text: string; level: Level; labels: string[] };
export type EpdsResult = { date: string; total: number; band: EpdsBand; selfHarm: boolean };
export type Flag = { id: string; date: string; kind: "q10" | "red" | "epds" | "selfharm"; text: string; resolved: boolean; dueAt: string };
export type FamilyMember = { id: string; name: string; relation: string; sees: { alerts: boolean; trends: boolean; weekly: boolean } };
export type Booking = { id: string; proId: string; when: string; kind: "video" };
export type Post = { id: string; author: string; anon: boolean; text: string; at: string; topic: string; note?: string; hidden?: boolean };
export type ModItem = { id: string; postId: string; text: string; at: string; reason: string; done: boolean };
export type Alert = { id: string; at: string; text: string };
export type Audit = { at: string; who: string; what: string };

export type State = {
  role: Role; lang: Lang;
  mother: { name: string; babyName: string; birth: string; delivery: string; city: string };
  checkins: Checkin[]; symptomLogs: SymptomLog[]; epds: EpdsResult[]; flags: Flag[];
  family: FamilyMember[]; shifts: Record<string, string>; partnerScreens: { date: string; yes: number }[];
  consent: { emergencyAlert: boolean; shareWithPro: boolean; familyNote: boolean; emergencyContact: string; cloudMatch?: boolean | null };
  bookings: Booking[]; vaccinesDone: string[]; milestonesDone: string[]; weights: { date: string; kg: number }[];
  posts: Post[]; mod: ModItem[]; alerts: Alert[]; audit: Audit[];
  pin: string | null; joinedCircle: boolean; neutralNotif: boolean;
};

const DAY = 86400000;
const iso = (d: Date) => d.toISOString();
export const dayStr = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
export const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / DAY);


type Crisis = { kind: CrisisKind; reason: string } | null;
type Ctx = {
  s: State; ready: boolean; set: (f: (s: State) => State) => void;
  crisis: Crisis; openCrisis: (c: NonNullable<Crisis>) => void; closeCrisis: () => void;
  locked: boolean; setLocked: (b: boolean) => void; reset: () => void;
  alertFamily: (text: string) => boolean; audit: (who: string, what: string) => void;
};
const C = createContext<Ctx>(null as any);
export const useApp = () => useContext(C);
const KEY = "afterbloom.v1";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(() => seed());
  const [ready, setReady] = useState(false);
  const [crisis, setCrisis] = useState<Crisis>(null);
  const [locked, setLocked] = useState(false);
  loc.v = s.lang === "hi" ? "hi-IN" : "en-IN";
  useEffect(() => { document.documentElement.lang = s.lang; }, [s.lang]);
  const bc = useRef<BroadcastChannel | null>(null);
  const fromRemote = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const st = JSON.parse(raw) as State;
        setS(st);
        if (st.pin) setLocked(true);
      }
    } catch {}
    setReady(true);
    try {
      bc.current = new BroadcastChannel("afterbloom");
      bc.current.onmessage = (e) => { fromRemote.current = true; setS(e.data); };
    } catch {}
    return () => bc.current?.close();
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
    if (fromRemote.current) fromRemote.current = false;
    else try { bc.current?.postMessage(s); } catch {}
  }, [s, ready]);

  const set = useCallback((f: (s: State) => State) => setS(f), []);
  const audit = useCallback((who: string, what: string) => setS((p) => ({ ...p, audit: [{ at: iso(new Date()), who, what }, ...p.audit].slice(0, 200) })), []);
  const alertFamily = useCallback((text: string) => {
    let sent = false;
    setS((p) => {
      if (!p.consent.emergencyAlert) return p;
      sent = true;
      return { ...p, alerts: [{ id: crypto.randomUUID(), at: iso(new Date()), text }, ...p.alerts] };
    });
    return sent;
  }, []);
  const openCrisis = useCallback((c: NonNullable<Crisis>) => setCrisis(c), []);
  const reset = () => { try { localStorage.removeItem(KEY); } catch {} setS(seed()); setLocked(false); };

  return (
    <C.Provider value={{ s, ready, set, crisis, openCrisis, closeCrisis: () => setCrisis(null), locked, setLocked, reset, alertFamily, audit }}>
      {children}
    </C.Provider>
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10);
