"use client";
import { useState } from "react";
import { BellRing, BellOff, Hospital, Loader2, MapPin, Phone, ShieldAlert } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";

// Never gated: no login, no network call, no loading state, no paywall. Rendered from local state only.
// Motion: a plain 200ms fade at most. Numbers: Tele-MANAS 14416 / 1-800-891-4416 and 112 only.
type Place = { name: string; km: number; lat: number; lon: number };
const km = (a: number, b: number, c: number, d: number) => { const r = Math.PI / 180, dl = (c - a) * r, dn = (d - b) * r; const x = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dn / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };

// Nearest hospitals from OpenStreetMap (free). Asks for location only when tapped, never delays the screen, and falls back to a maps search.
function NearestHospital() {
  const tr = useTr();
  const [state, setState] = useState<"idle" | "busy" | "done" | "fail">("idle");
  const [places, setPlaces] = useState<Place[]>([]);
  const find = () => {
    if (!navigator.geolocation) return setState("fail");
    setState("busy");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: la, longitude: lo } = pos.coords;
      try {
        const q = `[out:json][timeout:12];(node["amenity"="hospital"](around:8000,${la},${lo});way["amenity"="hospital"](around:8000,${la},${lo}););out center 12;`;
        const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
        const j = await res.json();
        const list: Place[] = (j.elements ?? []).map((e: any) => { const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon; return { name: e.tags?.name ?? tr("Hospital"), lat, lon, km: km(la, lo, lat, lon) }; }).filter((p: Place) => Number.isFinite(p.lat)).sort((a: Place, b: Place) => a.km - b.km).slice(0, 3);
        setPlaces(list); setState(list.length ? "done" : "fail");
      } catch { setState("fail"); }
    }, () => setState("fail"), { timeout: 8000, maximumAge: 60000 });
  };
  return (
    <div className="space-y-2">
      <button onClick={find} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 font-semibold">{state === "busy" ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Hospital className="h-5 w-5" aria-hidden />}{tr("Find nearest hospital")}</button>
      {state === "done" && places.map((p) => <a key={p.name + p.lat} href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center gap-2 rounded-2xl bg-white/10 px-4 text-sm"><MapPin className="h-4 w-4 shrink-0" aria-hidden /><span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span><span>{p.km.toFixed(1)} km</span></a>)}
      {state === "fail" && <a href="https://www.google.com/maps/search/hospital+near+me" target="_blank" rel="noreferrer" className="block text-center text-sm underline underline-offset-4">{tr("Could not find hospitals here. Search on the map")}</a>}
    </div>
  );
}

export function CrisisScreen({ standalone = false }: { standalone?: boolean }) {
  const { crisis, closeCrisis, s } = useApp();
  const tr = useTr();
  const kind = crisis?.kind ?? "medical";
  const psychosis = kind === "psychosis";
  const alerted = s.consent.emergencyAlert;
  const call = "flex min-h-[64px] items-center justify-center gap-3 rounded-2xl px-5 text-lg font-bold";

  return (
    <div className="animate-fadeIn fixed inset-0 z-[100] overflow-y-auto bg-[#B3201F] text-white" role="alertdialog" aria-modal="true" aria-labelledby="crisis-h">
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 px-5 py-8">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-1 h-9 w-9 shrink-0" aria-hidden />
          <h1 id="crisis-h" className="!text-white text-[1.7rem] font-bold leading-tight">
            {psychosis ? tr("This is an emergency. Call emergency services now.") : kind === "selfharm" ? tr("You are not alone. Help is available right now.") : tr("This needs care right now. Go to the nearest hospital.")}
          </h1>
        </div>
        {crisis?.reason && !standalone && <p className="text-white/90">{tr("We noticed: {r}", { r: tr(crisis.reason) })}</p>}

        <a href="tel:112" autoFocus className={`${call} bg-white text-[#B3201F] shadow-lg`}><Phone className="h-6 w-6" aria-hidden />{tr("Call 112 (emergency)")}</a>

        {!psychosis && (
          <div className="space-y-1.5">
            <a href="tel:14416" className={`${call} border-2 border-white/60 bg-white/10`}><Phone className="h-6 w-6" aria-hidden /><span>{tr("Tele-MANAS")} 14416<span className="block text-sm font-medium text-white/85">{tr("Free, 24×7, in 20 languages")}</span></span></a>
            <a href="tel:18008914416" className="block text-center text-sm underline underline-offset-4">{tr("or call")} 1-800-891-4416</a>
          </div>
        )}
        {psychosis && <p className="rounded-2xl bg-white/10 p-4 text-white/95">{tr("Stay with her. Do not leave her alone with the baby. Tell the doctors about the signs you saw.")}</p>}

        {!psychosis && kind === "medical" && <NearestHospital />}

        {/* emergency-contact status: shown only when she agreed in advance */}
        {!standalone && !psychosis && (
          <p className="flex items-start gap-2 rounded-2xl bg-white/10 p-3.5 text-sm" role="status">
            {alerted ? <BellRing className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> : <BellOff className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
            {alerted ? tr("Your family has been alerted, as you agreed.") : tr("No one has been alerted, because emergency-contact alerts are switched off in your privacy settings.")}
          </p>
        )}
        {!standalone && s.consent.emergencyPhone && (
          <a href={`tel:${s.consent.emergencyPhone}`} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 font-semibold"><Phone className="h-5 w-5" aria-hidden />{tr("Call")} {s.consent.emergencyContact || s.consent.emergencyPhone}</a>
        )}
        {!standalone && !psychosis && kind === "selfharm" && <p className="text-sm text-white/90">{tr("Your care team has been flagged for an immediate callback. You can also talk to someone free right now on 14416.")}</p>}

        {standalone
          ? <a href="/home" className="mt-1 min-h-[44px] text-center text-white/85 underline underline-offset-4">{tr("Back to AfterBloom")}</a>
          : <button onClick={closeCrisis} className="mt-1 min-h-[44px] text-white/85 underline underline-offset-4">{tr("I am safe, close this screen")}</button>}
      </div>
    </div>
  );
}
