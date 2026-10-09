"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PatientSignals } from "../types/cases";

/**
 * The professional's alerts and cases, from the server (which applies each mother's consent first). Polled every 5 seconds: the signals tables
 * have no live feed, because they can only be read through the server's consent check.
 */
export function useProSignals(enabled: boolean) {
  const [data, setData] = useState<PatientSignals[] | null>(null);
  const [me, setMe] = useState("");
  const [problem, setProblem] = useState<"" | "not-ready" | "error">("");

  const busy = useRef(false);   // never start a new request while the last one is still running
  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await fetch("/api/signals", { cache: "no-store" });
      if (res.status === 503) return setProblem("not-ready");
      if (!res.ok) return setProblem("error");
      const j = await res.json();
      setMe(j.me ?? ""); setData(j.patients ?? []); setProblem("");
    } catch { setProblem("error"); }
    finally { busy.current = false; }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load();
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 6000);
    return () => clearInterval(t);
  }, [enabled, load]);

  return { data, me, problem, reload: load };
}
