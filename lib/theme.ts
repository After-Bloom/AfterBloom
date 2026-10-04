"use client";
import { useCallback, useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";
const KEY = "ab.theme";

export const themeScript = `try{var t=localStorage.getItem("${KEY}");var d=t==="dark"||((!t||t==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}`;

function apply(t: Theme) {
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  return dark;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");
  const [dark, setDark] = useState(false);
  useEffect(() => {
    let t: Theme = "system";
    try { t = (localStorage.getItem(KEY) as Theme) || "system"; } catch {}
    setTheme(t); setDark(apply(t));
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => { if (t === "system") setDark(apply("system")); };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const choose = useCallback((t: Theme) => {
    try { localStorage.setItem(KEY, t); } catch {}
    setTheme(t); setDark(apply(t));
  }, []);
  const toggle = useCallback(() => choose(dark ? "light" : "dark"), [dark, choose]);
  return { theme, dark, choose, toggle };
}
