"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase/client";

export type Post = { id: string; alias: string; anon: boolean; topic: string; text: string; note: string | null; hidden: boolean; created_at: string };
export type CircleInfo = { id: string; name: string; mentor: string; members: number };
export type CircleEvent = { id: string; title: string; host: string; hostTitle: string; starts_at: string; room: string };

/** One circle: its info, its live feed (realtime), which posts are mine, and upcoming expert sessions. */
export function useCircle(circleId: string | null) {
  const [info, setInfo] = useState<CircleInfo | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<CircleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const seen = useRef(new Set<string>());

  const add = useCallback((p: Post) => {
    if (seen.current.has(p.id)) return;
    seen.current.add(p.id);
    setPosts((cur) => [...cur, p].sort((a, b) => a.created_at.localeCompare(b.created_at)));
  }, []);

  useEffect(() => {
    if (!circleId) { setLoading(false); return; }
    const sb = supabase();
    let alive = true;
    (async () => {
      const [c, p, mp] = await Promise.all([
        sb.from("circles").select("id, name, mentor:profiles!circles_mentor_fk(full_name), circle_members(count)").eq("id", circleId).maybeSingle(),
        sb.from("posts").select("*").eq("circle_id", circleId).order("created_at").limit(100),
        sb.from("post_authors").select("post_id"),
      ]);
      if (!alive) return;
      if (c.error || p.error) { setError(true); setLoading(false); return; }
      const cd: any = c.data;
      setInfo(cd ? { id: cd.id, name: cd.name, mentor: cd.mentor?.full_name ?? "", members: cd.circle_members?.[0]?.count ?? 0 } : null);
      seen.current = new Set((p.data ?? []).map((x: any) => x.id));
      setPosts((p.data ?? []) as Post[]);
      setMine(new Set((mp.data ?? []).map((x: any) => x.post_id)));
      setLoading(false);
      // expert sessions exist once migration 003 has been run; absent before that
      const ev = await sb.from("circle_events").select("id, title, starts_at, room, host:pros!circle_events_host_id_fkey(title, profiles(full_name))").eq("circle_id", circleId).gte("starts_at", new Date(Date.now() - 3600000).toISOString()).order("starts_at").limit(5);
      if (alive && !ev.error) setEvents((ev.data ?? []).map((e: any) => ({ id: e.id, title: e.title, host: e.host?.profiles?.full_name ?? "", hostTitle: e.host?.title ?? "", starts_at: e.starts_at, room: e.room })));
    })();

    const ch = sb.channel(`circle:${circleId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts", filter: `circle_id=eq.${circleId}` }, (e) => add(e.new as Post))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts", filter: `circle_id=eq.${circleId}` }, (e) => {
        const n = e.new as Post;
        if (n.hidden) setPosts((cur) => cur.filter((x) => x.id !== n.id));
      })
      .subscribe();
    return () => { alive = false; sb.removeChannel(ch); };
  }, [circleId, add]);

  return { info, posts, mine, events, loading, error, add: (p: Post) => { add(p); setMine((m) => new Set(m).add(p.id)); } };
}
