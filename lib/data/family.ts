"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { useApp } from "../store";
import type { SlotId } from "@/components/NightPlanner";

export type FamilyLink = { motherId: string; motherName: string; babyName: string; birth: string; myName: string; relation: string; sees: { alerts: boolean; trends: boolean; weekly: boolean }; noteOn: boolean };

/** What a family member can see about the mother they support. RLS limits this to what she switched on. */
export function useFamilyView() {
  const { auth } = useApp();
  const [link, setLink] = useState<FamilyLink | null>(null);
  const [shifts, setShifts] = useState<Record<string, string>>({});
  const [vaccines, setVaccines] = useState<string[]>([]);
  const [lowSleepNights, setLow] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadShifts = useCallback(async (motherId: string) => {
    const { data } = await supabase().from("night_shifts").select("day, slot, assignee").eq("mother_id", motherId).gte("day", new Date(Date.now() - 86400000).toISOString().slice(0, 10));
    const m: Record<string, string> = {};
    (data ?? []).forEach((r: any) => { m[`${r.day}|${r.slot}`] = r.assignee; });
    setShifts(m);
  }, []);

  useEffect(() => {
    if (auth.status !== "user" || auth.role !== "family" || !auth.userId) return;
    const sb = supabase();
    let alive = true;
    let chan: ReturnType<typeof sb.channel> | null = null;
    (async () => {
      const { data: fm, error: e1 } = await sb.from("family_members").select("name, relation, mother_id, sees_alerts, sees_trends, sees_weekly").eq("user_id", auth.userId!).eq("status", "active").limit(1).maybeSingle();
      if (!alive) return;
      if (e1) { setError(true); setLoading(false); return; }
      if (!fm) { setLink(null); setLoading(false); return; }
      const [mo, pr, vac] = await Promise.all([
        sb.from("mothers").select("baby_name, birth_date, consent_family_note").eq("id", fm.mother_id).maybeSingle(),
        sb.from("profiles").select("full_name").eq("id", fm.mother_id).maybeSingle(),
        sb.from("baby_vaccines").select("vaccine_id").eq("mother_id", fm.mother_id),
      ]);
      if (!alive) return;
      setLink({
        motherId: fm.mother_id, motherName: pr.data?.full_name ?? "", babyName: mo.data?.baby_name ?? "", birth: (mo.data?.birth_date ?? new Date().toISOString().slice(0, 10)) + "T12:00:00",
        myName: fm.name, relation: fm.relation, sees: { alerts: fm.sees_alerts, trends: fm.sees_trends, weekly: fm.sees_weekly }, noteOn: !!mo.data?.consent_family_note && fm.sees_weekly,
      });
      setVaccines((vac.data ?? []).map((r: any) => r.vaccine_id));
      await loadShifts(fm.mother_id);
      // the weekly note only counts nights of short sleep, nothing else about her health
      const res = await fetch("/api/family/note");
      if (res.ok) { const j = await res.json(); if (alive) setLow(j.enabled ? j.lowSleepNights : null); }
      setLoading(false);
      chan = sb.channel(`shifts:${fm.mother_id}`).on("postgres_changes", { event: "*", schema: "public", table: "night_shifts", filter: `mother_id=eq.${fm.mother_id}` }, () => loadShifts(fm.mother_id)).subscribe();
    })();
    return () => { alive = false; if (chan) sb.removeChannel(chan); };
  }, [auth.status, auth.role, auth.userId, loadShifts]);

  const toggleShift = useCallback(async (day: string, slot: SlotId, assignee: string) => {
    if (!link || !auth.userId) return;
    const key = `${day}|${slot}`;
    setShifts((p) => { const n = { ...p }; if (assignee) n[key] = assignee; else delete n[key]; return n; });
    const sb = supabase();
    if (!assignee) await sb.from("night_shifts").delete().eq("mother_id", link.motherId).eq("day", day).eq("slot", slot);
    else await sb.from("night_shifts").upsert({ mother_id: link.motherId, day, slot, assignee, assignee_user: auth.userId }, { onConflict: "mother_id,day,slot" });
  }, [link, auth.userId]);

  return { link, shifts, vaccines, lowSleepNights, loading, error, toggleShift };
}
