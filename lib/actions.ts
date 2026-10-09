"use client";
import { useMemo, useRef } from "react";
import { supabase } from "./supabase/client";
import { dayStr, useApp, Checkin, State } from "./store";
import { mapFlag } from "./data/load";
import type { CrisisKind } from "./triage";
import type { Level } from "./symptoms";
import type { Risk } from "./risk";
import type { LogKind } from "./babylog";

/** The saved row an alert came from (a symptom log or a check-in). The server reads it back to work out the alert's signals. */
export type Origin = { table: "symptom_logs" | "checkins"; id: string };
const syncSignals = (o: Origin | null) => { if (o) void fetch("/api/signals/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o), keepalive: true }).catch(() => {}); };

/**
 * Everything the app saves goes through here: update the screen at once, then write to the database.
 * Row Level Security decides what is actually allowed, so a bug here cannot expose anyone's records.
 */
export function useActions() {
  const { s, set, auth, refresh } = useApp();
  const live = useRef(s);
  live.current = s;
  const uid = auth.userId;
  const isMother = auth.role === "mother";

  return useMemo(() => {
    const sb = supabase();
    const fail = (what: string, e: any) => { console.error(what, e?.message ?? e); throw new Error(what); };

    return {
      async saveCheckin(rec: Checkin, reasons: string[] = []): Promise<Origin | null> {
        set((p) => ({ ...p, checkins: [...p.checkins.filter((c) => dayStr(c.date) !== dayStr(rec.date)), rec] }));
        if (!uid || !isMother) return null;
        const { data, error } = await sb.from("checkins").upsert({
          mother_id: uid, day: dayStr(rec.date), mood: rec.mood, appetite: rec.appetite, sleep_hours: rec.sleepHours, level: rec.level,
          bp_sys: rec.bp?.sys ?? null, bp_dia: rec.bp?.dia ?? null, reasons,
        }, { onConflict: "mother_id,day" }).select("id").single();
        if (error) fail("Could not save your check-in", error);
        const origin: Origin | null = data?.id ? { table: "checkins", id: data.id } : null;
        if (rec.level !== "GREEN") {
          void fetch("/api/loop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", level: rec.level, reason: reasons.join(", ") }), keepalive: true }).catch(() => {}); // the care loop: follow up later
          syncSignals(origin); // every alert is also saved as a signal, so related alerts can be grouped
        }
        return origin;
      },

      async logSymptom(level: Level, labels: string[]): Promise<Origin | null> {
        set((p) => ({ ...p, symptomLogs: [{ date: new Date().toISOString(), text: "", level, labels }, ...p.symptomLogs] }));
        if (!uid || !isMother) return null;
        const { data } = await sb.from("symptom_logs").insert({ mother_id: uid, level, labels }).select("id").single(); // only labels and the level are stored, never what she typed
        const origin: Origin | null = data?.id ? { table: "symptom_logs", id: data.id } : null;
        if (level !== "GREEN") {
          void fetch("/api/loop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", level, reason: labels.join(", ") }), keepalive: true }).catch(() => {}); // the care loop: follow up later
          syncSignals(origin);
        }
        return origin;
      },

      /**
       * After a RED result: flag, alert her professional, alert family if she agreed. The crisis screen never waits for this.
       * `saved` is the symptom log or check-in this came from, so the server can group it with her other alerts before deciding who to tell.
       */
      async reportEmergency(kind: CrisisKind, reason: string, saved?: Promise<Origin | null>) {
        if (!uid || !isMother) return;
        try {
          // wait a moment for the saved row, but never hold up an emergency for it
          const origin = saved ? await Promise.race([saved.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 3000))]) : null;
          const res = await fetch("/api/alerts/emergency", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, reason, origin }), keepalive: true });
          if (!res.ok) return;
          const { flag } = await res.json();
          if (flag) set((p) => ({ ...p, flags: [mapFlag(flag), ...p.flags.filter((f) => f.id !== flag.id)] }));
        } catch { /* offline: the crisis screen already showed the numbers */ }
      },

      async submitEpds(answers: number[]) {
        const res = await fetch("/api/epds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
        if (!res.ok) fail("Could not save your answers", await res.text());
        const r = await res.json();
        const total = answers.reduce((a, b) => a + b, 0);
        set((p) => ({
          ...p, epds: [{ date: r.createdAt, total, band: r.band, selfHarm: r.selfHarm }, ...p.epds],
          flags: r.flag ? [mapFlag(r.flag), ...p.flags] : p.flags,
        }));
        return r as { band: "low" | "possible" | "probable"; selfHarm: boolean };
      },

      /** Saves a consent choice and returns the new consent_log row's id, so the screen can show a receipt ("Saved · Receipt #..."). */
      async setConsent(patch: Partial<State["consent"]>): Promise<string | undefined> {
        set((p) => ({ ...p, consent: { ...p.consent, ...patch } }));
        if (!uid || !isMother) return;
        const col: Record<string, string> = { emergencyAlert: "consent_emergency_alert", shareWithPro: "consent_share_pro", familyNote: "consent_family_note", cloudMatch: "consent_cloud_match", emergencyContact: "emergency_contact_name", emergencyPhone: "emergency_contact_phone", sms: "consent_sms" };
        const row: Record<string, any> = {};
        for (const [k, v] of Object.entries(patch)) if (col[k]) row[col[k]] = v;
        const { error } = await sb.from("mothers").update(row).eq("id", uid);
        if (error) fail("Could not save that choice", error);
        const log = Object.entries(patch).filter(([k, v]) => typeof v === "boolean" && col[k]).map(([k, v]) => ({ user_id: uid, key: k, value: v as boolean }));
        if (!log.length) return;
        const { data } = await sb.from("consent_log").insert(log).select("id");
        return data?.at(-1)?.id as string | undefined;
      },
      /** B8: pause all sharing with her care team for a while (or until she resumes). Red and safety alerts are never paused. */
      async pauseSharing(hours: number | "forever"): Promise<string | undefined> {
        const until = hours === "forever" ? "3000-01-01T00:00:00.000Z" : new Date(Date.now() + hours * 3600000).toISOString();
        set((p) => ({ ...p, consent: { ...p.consent, sharingPausedUntil: until } }));
        if (!uid || !isMother) return;
        const { error } = await sb.from("mothers").update({ sharing_paused_until: until }).eq("id", uid);
        if (error) fail("Could not pause sharing", error);
        const { data } = await sb.from("consent_log").insert({ user_id: uid, key: "sharingPaused", value: true }).select("id").single();
        return data?.id as string | undefined;
      },
      async resumeSharing(): Promise<string | undefined> {
        set((p) => ({ ...p, consent: { ...p.consent, sharingPausedUntil: null } }));
        if (!uid || !isMother) return;
        const { error } = await sb.from("mothers").update({ sharing_paused_until: null }).eq("id", uid);
        if (error) fail("Could not resume sharing", error);
        const { data } = await sb.from("consent_log").insert({ user_id: uid, key: "sharingPaused", value: false }).select("id").single();
        return data?.id as string | undefined;
      },
      async setNeutral(v: boolean) {
        set((p) => ({ ...p, neutralNotif: v }));
        if (uid && isMother) await sb.from("mothers").update({ neutral_notifications: v }).eq("id", uid);
      },

      async inviteFamily(name: string, relation: string) {
        if (!uid) fail("Please sign in", null);
        const { data, error } = await sb.from("family_members").insert({ mother_id: uid, name, relation }).select("*").single();
        if (error || !data) return fail("Could not create the invite", error);
        const m = { id: data.id, name: data.name, relation: data.relation, code: data.invite_code, status: data.status, sees: { alerts: data.sees_alerts, trends: data.sees_trends, weekly: data.sees_weekly } } as State["family"][number];
        set((p) => ({ ...p, family: [...p.family, m] }));
        return m;
      },
      async updateFamily(id: string, sees: Partial<State["family"][number]["sees"]>) {
        set((p) => ({ ...p, family: p.family.map((f) => (f.id === id ? { ...f, sees: { ...f.sees, ...sees } } : f)) }));
        const row: Record<string, boolean> = {};
        if (sees.alerts !== undefined) row.sees_alerts = sees.alerts;
        if (sees.trends !== undefined) row.sees_trends = sees.trends;
        if (sees.weekly !== undefined) row.sees_weekly = sees.weekly;
        await sb.from("family_members").update(row).eq("id", id);
      },
      async removeFamily(id: string) {
        set((p) => ({ ...p, family: p.family.filter((f) => f.id !== id) }));
        await sb.from("family_members").update({ status: "removed", user_id: null }).eq("id", id);
      },

      async toggleVaccine(vid: string) {
        const done = live.current.vaccinesDone.includes(vid);
        set((p) => ({ ...p, vaccinesDone: done ? p.vaccinesDone.filter((x) => x !== vid) : [...p.vaccinesDone, vid] }));
        if (!uid) return;
        if (done) await sb.from("baby_vaccines").delete().eq("mother_id", uid).eq("vaccine_id", vid);
        else await sb.from("baby_vaccines").upsert({ mother_id: uid, vaccine_id: vid }, { onConflict: "mother_id,vaccine_id" });
      },
      async toggleMilestone(mid: string) {
        const done = live.current.milestonesDone.includes(mid);
        set((p) => ({ ...p, milestonesDone: done ? p.milestonesDone.filter((x) => x !== mid) : [...p.milestonesDone, mid] }));
        if (!uid) return;
        if (done) await sb.from("baby_milestones").delete().eq("mother_id", uid).eq("milestone_id", mid);
        else await sb.from("baby_milestones").upsert({ mother_id: uid, milestone_id: mid }, { onConflict: "mother_id,milestone_id" });
      },
      async toggleBenefit(step: string) {
        const done = live.current.benefits.includes(step);
        set((p) => ({ ...p, benefits: done ? p.benefits.filter((x) => x !== step) : [...p.benefits, step] }));
        if (!uid) return;
        if (done) await sb.from("benefit_steps").delete().eq("mother_id", uid).eq("step", step);
        else await sb.from("benefit_steps").upsert({ mother_id: uid, step }, { onConflict: "mother_id,step" });
      },
      async setPhone(phone: string) {
        set((p) => ({ ...p, mother: { ...p.mother, phone } }));
        if (uid) await sb.from("mothers").update({ phone: phone.trim() || null }).eq("id", uid);
      },
      async setBabySex(sex: "boy" | "girl") {
        set((p) => ({ ...p, mother: { ...p.mother, babySex: sex } }));
        if (uid) await sb.from("mothers").update({ baby_sex: sex }).eq("id", uid);
      },
      async setBabyName(name: string) {
        set((p) => ({ ...p, mother: { ...p.mother, babyName: name } }));
        if (uid) await sb.from("mothers").update({ baby_name: name }).eq("id", uid);
      },
      /** Her recovery profile (what made this pregnancy or birth higher risk). It changes how often we suggest a blood pressure check. */
      async setRisk(risk: Risk) {
        set((p) => ({ ...p, risk }));
        if (!uid || !isMother) return;
        const { error } = await sb.from("mothers").update({ risk }).eq("id", uid);
        if (error) fail("Could not save your profile", error);
      },
      async setBirthWeight(kg: number | null) {
        set((p) => ({ ...p, mother: { ...p.mother, birthWeightKg: kg } }));
        if (uid && isMother) await sb.from("mothers").update({ birth_weight_kg: kg }).eq("id", uid);
      },
      async addBabyLog(kind: LogKind) {
        const row = { id: crypto.randomUUID(), kind, at: new Date().toISOString() };
        set((p) => ({ ...p, babyLogs: [row, ...p.babyLogs] }));
        if (uid && isMother) await sb.from("baby_logs").insert({ id: row.id, mother_id: uid, kind, at: row.at });
      },
      async undoBabyLog(id: string) {
        set((p) => ({ ...p, babyLogs: p.babyLogs.filter((l) => l.id !== id) }));
        if (uid && isMother) await sb.from("baby_logs").delete().eq("id", id).eq("mother_id", uid);
      },
      async addGrowth(kg: number, cm?: number) {
        set((p) => ({ ...p, weights: [...p.weights, { date: new Date().toISOString(), kg, cm }] }));
        if (uid) await sb.from("baby_growth").insert({ mother_id: uid, weight_kg: kg || null, length_cm: cm ?? null });
      },

      /** Take a night feed (assignee = her name), or give it back (assignee = ""). */
      async claimShift(day: string, slot: "10pm" | "1am" | "4am", assignee: string) {
        const key = `${day}|${slot}`;
        set((p) => {
          const shifts = { ...p.shifts };
          if (assignee) shifts[key] = assignee; else delete shifts[key];
          return { ...p, shifts };
        });
        if (!uid || !isMother) return;
        if (!assignee) await sb.from("night_shifts").delete().eq("mother_id", uid).eq("day", day).eq("slot", slot);
        else await sb.from("night_shifts").upsert({ mother_id: uid, day, slot, assignee, assignee_user: null }, { onConflict: "mother_id,day,slot" });
      },

      async bookSession(proId: string, atISO: string) {
        const { data, error } = await sb.rpc("book_session", { p_pro: proId, p_at: atISO });
        if (error) return fail(error.message || "Could not book", error);
        await refresh();
        return data;
      },
      async cancelBooking(id: string) {
        set((p) => ({ ...p, bookings: p.bookings.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)) }));
        await sb.from("bookings").update({ status: "cancelled" }).eq("id", id);
      },

      async markAlertRead(id: string) {
        set((p) => ({ ...p, alerts: p.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)) }));
        await sb.from("alerts").update({ read: true }).eq("id", id);
      },
      async markAllRead() {
        set((p) => ({ ...p, alerts: p.alerts.map((a) => ({ ...a, read: true })) }));
        if (uid) await sb.from("alerts").update({ read: true }).eq("user_id", uid).eq("read", false);
      },

      async setLang(lang: "en" | "hi") {
        set((p) => ({ ...p, lang }));
        if (uid) await sb.from("profiles").update({ lang }).eq("id", uid);
      },
      async signOut() { await sb.auth.signOut(); },
    };
  }, [uid, isMother, set, refresh]);
}
