"use client";
import { createContext, useContext } from "react";
import { useApp } from "@/lib/store";
import { useProData } from "@/lib/data/pro";
import { useProSignals } from "@/lib/data/proSignals";

// One load of the professional's data shared by the dashboard, patients, alerts, sessions and audit pages,
// so moving between them is instant and does not fetch everything again.
type Ctx = ReturnType<typeof useProData> & { sig: ReturnType<typeof useProSignals> };
const C = createContext<Ctx | null>(null);

export function ProProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useApp();
  const pd = useProData();
  const sig = useProSignals(auth.status === "user" && auth.role === "pro");
  return <C.Provider value={{ ...pd, sig }}>{children}</C.Provider>;
}

export function usePro(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error("usePro must be used inside ProProvider");
  return c;
}
