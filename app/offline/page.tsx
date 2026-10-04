import { Flower2, Phone } from "lucide-react";

// Shown when there is no connection. Plain server-rendered markup so it works with no script. Help numbers first.
export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5 py-10">
      <div className="flex items-center gap-2 font-serif text-2xl font-bold text-plum-800"><Flower2 className="h-7 w-7 text-primary" aria-hidden />AfterBloom</div>
      <h1 className="text-4xl">You are offline</h1>
      <p className="text-lg text-ink-muted">We cannot reach the internet right now. Your phone can still call for help:</p>
      <a href="tel:112" className="flex min-h-[64px] items-center justify-center gap-3 rounded-2xl bg-danger px-5 text-lg font-bold text-white dark:text-[#1C1117]"><Phone className="h-6 w-6" aria-hidden />Call 112 (emergency)</a>
      <a href="tel:14416" className="flex min-h-[64px] items-center justify-center gap-3 rounded-2xl border-2 border-line bg-surface px-5 text-lg font-bold"><Phone className="h-6 w-6" aria-hidden />Tele-MANAS 14416 (free, 24×7)</a>
      <p className="text-sm text-ink-muted">If a symptom feels serious, do not wait for the internet. Go to the nearest hospital.</p>
      <a href="/crisis" className="text-center font-semibold text-primary underline underline-offset-4">Open the help screen</a>
    </main>
  );
}
