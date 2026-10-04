"use client";
import { Phone, X, ShieldAlert } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";

// Never gated: no login, no network call, no loading state. Rendered from local state only.
export function CrisisScreen({ standalone = false }: { standalone?: boolean }) {
  const { crisis, closeCrisis, s } = useApp();
  const tr = useTr();
  const kind = crisis?.kind ?? "medical";
  const psychosis = kind === "psychosis";
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-red-700 text-white" role="alertdialog" aria-modal="true">
      <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center gap-5 p-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-10 w-10 shrink-0" />
          <h1 className="!text-white text-2xl font-bold leading-tight">
            {psychosis ? tr("This is an emergency. Call emergency services now.") : kind === "selfharm" ? tr("You are not alone. Help is available right now.") : tr("This needs care right now. Go to the nearest hospital.")}
          </h1>
        </div>
        {crisis?.reason && !standalone && <p className="text-white/90">{tr("We noticed: {r}", { r: tr(crisis.reason) })}</p>}

        <a href="tel:112" className="flex items-center justify-center gap-3 rounded-2xl bg-white py-5 text-xl font-bold text-red-700 shadow-lg"><Phone /> {tr("Call 112 (emergency)")}</a>
        {!psychosis && (
          <>
            <a href="tel:14416" className="flex items-center justify-center gap-3 rounded-2xl bg-white/15 border border-white/40 py-4 text-lg font-bold"><Phone /> {tr("Call Tele-MANAS (free, 24x7)")}: 14416</a>
            <a href="tel:18008914416" className="text-center underline text-white/90">{tr("or")} 1-800-891-4416</a>
          </>
        )}
        {psychosis && <p className="text-white/90">{tr("Stay with her. Do not leave her alone with the baby. Tell the doctors about the signs you saw.")}</p>}

        {!psychosis && kind === "medical" && (
          <a href="https://www.google.com/maps/search/hospital+near+me" target="_blank" className="rounded-2xl bg-white/15 border border-white/40 py-3 text-center font-semibold">{tr("Find nearest hospital")}</a>
        )}
        {s.consent.emergencyAlert && !standalone && !psychosis && <p className="text-sm text-white/90">{tr("Your emergency contact ({c}) has been alerted, as you agreed.", { c: tr(s.consent.emergencyContact) })}</p>}
        {!psychosis && kind === "selfharm" && <p className="text-sm text-white/90">{tr("Your care team has been flagged for an immediate callback. You can also talk to someone free right now on 14416.")}</p>}

        <button onClick={closeCrisis} className="mt-2 flex items-center justify-center gap-2 text-white/80 underline"><X className="h-4 w-4" /> {tr("I am safe, close this screen")}</button>
      </div>
    </div>
  );
}
