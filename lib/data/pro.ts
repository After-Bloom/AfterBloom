"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase/client";
import { useApp, daysSince, Checkin, EpdsResult, Flag, SymptomLog } from "../store";
import { mapCheckin, mapFlag } from "./load";
import type { Risk } from "../risk";

export type PatientRow = {
  id: string; name: string; babyName: string; day: number; birth: string; delivery: string; phone: string | null; shares: boolean;
  flags: Flag[]; epds: EpdsResult[]; checkins: Checkin[]; symptoms: SymptomLog[];
  risk: Risk; loop: { level: "RED" | "AMBER"; status: string } | null; // an unanswered follow-up after a RED/AMBER result
};
export type ProBooking = { id: string; motherId: string; startsAt: string; room: string };
export type ProAudit = { at: string; action: string; motherId: string | null };

/** Everything a professional sees. Row Level Security already limits it to their matched patients and what each shares. */
export function useProData() {
  const { auth } = useApp();
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [bookings, setBookings] = useState<ProBooking[]>([]);
  const [audit, setAudit] = useState<ProAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uid = auth.userId;

  const load = useCallback(async () => {
    if (!uid) return;
    const sb = supabase();
    const since = new Date(Date.now() - 21 * 86400000).toISOString();
    const sinceDay = since.slice(0, 10);
    const pp = await sb.from("pro_patients").select("mother_id, mothers(baby_name, birth_date, delivery, phone, consent_share_pro, profiles!mothers_id_fkey(full_name))").eq("pro_id", uid);
    if (pp.error) { setError(true); setLoading(false); return; }
    const ids = (pp.data ?? []).map((r: any) => r.mother_id);
    const none = Promise.resolve({ data: [] as any[], error: null });
    const [fl, ep, ci, sl, bk, au, lp, rk] = await Promise.all([
      ids.length ? sb.from("flags").select("*").in("mother_id", ids).order("created_at", { ascending: false }).limit(300) : none,
      ids.length ? sb.from("epds_results").select("mother_id, total, band, self_harm, created_at").in("mother_id", ids).order("created_at") : none,
      ids.length ? sb.from("checkins").select("*").in("mother_id", ids).gte("day", sinceDay).order("day") : none,
      ids.length ? sb.from("symptom_logs").select("mother_id, level, labels, created_at").in("mother_id", ids).neq("level", "GREEN").gte("created_at", since).order("created_at", { ascending: false }) : none,
      sb.from("bookings").select("id, mother_id, starts_at, room").eq("pro_id", uid).neq("status", "cancelled").gte("starts_at", new Date(Date.now() - 3600000).toISOString()).order("starts_at"),
      sb.from("audit_log").select("at, action, mother_id").eq("actor_id", uid).order("at", { ascending: false }).limit(60),
      ids.length ? sb.from("care_loops").select("mother_id, level, status").in("mother_id", ids).in("status", ["open", "no_answer", "cant_reach", "worse"]).order("created_at", { ascending: false }) : none,
      ids.length ? sb.from("mothers").select("id, risk").in("id", ids) : none, // separate, so the dashboard still loads if the risk column has not been added yet
    ]);
    const by = <T,>(list: any[] | null, id: string, f: (r: any) => T) => (list ?? []).filter((r) => r.mother_id === id).map(f);
    setRows((pp.data ?? []).map((r: any): PatientRow => {
      const mo = r.mothers;
      return {
        id: r.mother_id, name: mo?.profiles?.full_name ?? "", babyName: mo?.baby_name ?? "", day: daysSince(mo?.birth_date ?? new Date().toISOString()), birth: mo?.birth_date ?? "", delivery: mo?.delivery ?? "",
        phone: mo?.phone ?? null, shares: !!mo?.consent_share_pro,
        flags: by(fl.data, r.mother_id, mapFlag),
        epds: by(ep.data, r.mother_id, (e) => ({ date: e.created_at, total: e.total, band: e.band, selfHarm: e.self_harm })),
        checkins: by(ci.data, r.mother_id, mapCheckin),
        symptoms: by(sl.data, r.mother_id, (l) => ({ date: l.created_at, text: "", level: l.level, labels: l.labels })),
        risk: (rk.data ?? []).find((x: any) => x.id === r.mother_id)?.risk ?? {}, loop: (lp.data ?? []).find((l: any) => l.mother_id === r.mother_id) ?? null,
      };
    }));
    setBookings((bk.data ?? []).map((b: any) => ({ id: b.id, motherId: b.mother_id, startsAt: b.starts_at, room: b.room })));
    setAudit((au.data ?? []).map((a: any) => ({ at: a.at, action: a.action, motherId: a.mother_id })));
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    if (auth.status !== "user" || auth.role !== "pro") return;
    load();
    const sb = supabase();
    const again = () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(load, 400); };
    // a fresh name every time: React runs effects twice in development, and a reused name hands back the already-subscribed channel
    const ch = sb.channel(`pro:${uid}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "flags" }, again)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "checkins" }, again)
      .subscribe();
    return () => { sb.removeChannel(ch); if (timer.current) clearTimeout(timer.current); };
  }, [auth.status, auth.role, uid, load]);

  /** Opening a record is always logged. The mother can see this in her privacy page. */
  const logView = useCallback(async (motherId: string, action: string) => { await supabase().rpc("log_view", { p_mother: motherId, p_action: action }); }, []);

  const resolveFlag = useCallback(async (flag: Flag, motherId: string) => {
    setRows((rs) => rs.map((r) => (r.id === motherId ? { ...r, flags: r.flags.map((f) => (f.id === flag.id ? { ...f, resolved: true } : f)) } : r)));
    await supabase().from("flags").update({ resolved: true, resolved_by: uid, resolved_at: new Date().toISOString() }).eq("id", flag.id);
    await logView(motherId, `Completed callback: ${flag.text}`);
  }, [uid, logView]);

  return { rows, bookings, audit, loading, error, resolveFlag, logView, reload: load };
}
