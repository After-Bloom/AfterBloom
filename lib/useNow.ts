"use client";
import { useEffect, useState } from "react";

/** Current time in ms, refreshed every `every` ms (for countdowns). */
export function useNow(every = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [every]);
  return now;
}
