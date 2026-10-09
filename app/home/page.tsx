"use client";
import Link from "next/link";
import { CalendarCheck, Brain, Syringe, FileText, ChevronRight, Phone, Stethoscope, Video, HeartHandshake, MessageCircleHeart, ArrowRight, Check, Sun, Moon, Sunset, LayoutGrid } from "lucide-react";
import { useApp, daysSince, dayStr } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { loc } from "@/lib/locale";
import { EPDS_SCHEDULE } from "@/lib/epds";
import { VACCINES } from "@/lib/vaccines";
import { stageText, weekData } from "@/lib/report";
import { Sparkle } from "@/components/fx";
import { BloomProgress } from "@/components/BloomProgress";
import { CareLoopCard } from "@/components/CareLoopCard";
import { CareTeamStatus } from "@/components/CareTeamStatus";
import { ConsentRequests } from "@/components/ConsentRequests";
import { PausedChip } from "@/components/PausedChip";
import { BpWatch } from "@/components/BpWatch";
import { RecoveryProfile } from "@/components/RecoveryProfile";

const QUICK = [
  { icon: Stethoscope, label: "Is this normal?", hint: "Check a symptom", href: "/check" },
  { icon: Video, label: "Talk to someone", hint: "Book a session", href: "/care" },
  { icon: MessageCircleHeart, label: "Bloom Circles", hint: "Mothers like you", href: "/circles" },
  { icon: HeartHandshake, label: "Family", hint: "Invite your people", href: "/family" },
];

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-plum-300";

export default function Home() {
  const { s } = useApp();
  const tr = useTr();
  const age = daysSince(s.mother.birth);
  const weeks = Math.floor(age / 7);
  const today = dayStr(new Date());
  const checkedToday = s.checkins.some((c) => dayStr(c.date) === today);
  const nextEpds = EPDS_SCHEDULE.find((e) => e.day >= age);
  const lastEpds = s.epds[0];
  const vax = VACCINES.find((v) => v.days >= age && !s.vaccinesDone.includes(v.id));
  const w = weekData(s);

  const hour = new Date().getHours();
  const [Greet, greeting] = hour < 12 ? [Sun, "Good morning"] : hour < 17 ? [Sunset, "Good afternoon"] : [Moon, "Good evening"];

  // last 7 days, oldest first, so today is the rightmost dot
  const checkedDays = new Set(s.checkins.map((c) => dayStr(c.date)));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    return { key: dayStr(d), letter: d.toLocaleDateString(loc.v, { weekday: "narrow" }), full: d.toLocaleDateString(loc.v, { weekday: "long" }), done: checkedDays.has(dayStr(d)), isToday: i === 6 };
  });

  const tasks = [
    { done: checkedToday, icon: CalendarCheck, text: checkedToday ? "Today's check-in done" : "Do today's 30-second check-in", href: "/checkin", v: undefined },
    { done: !!lastEpds && daysSince(lastEpds.date) < 14, icon: Brain, text: nextEpds ? "Mind check: {l}" : "Mind check", href: "/screening", v: { l: tr(nextEpds?.label ?? "") } },
    { done: false, icon: Syringe, text: vax ? "Baby: {a} vaccines ({n})" : "Baby care", href: "/baby", v: { a: tr(vax?.age ?? ""), n: vax?.vaccines.length ?? 0 } },
    { done: false, icon: FileText, text: "See your week", href: "/report", v: undefined },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Greeting */}
      <header className="pb-5 pt-1 md:pb-7">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-plum-800">
          <Greet className="h-4 w-4" aria-hidden />{tr(greeting)}, {tr(s.mother.name)}
        </p>
        <h1 className="mt-1 text-4xl leading-[1.1] md:text-5xl">{tr("Be gentle with yourself today.")}</h1>
        <p className="mt-2 text-base text-ink/75">
          {tr("Day {n} after your {d}.", { n: age, d: tr(s.mother.delivery.toLowerCase()) })} {tr("{b} is {w} weeks old.", { b: s.mother.babyName, w: weeks })}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr] lg:gap-6">
        <div className="space-y-5">
          <PausedChip />
          <ConsentRequests />
          <CareTeamStatus />
          <CareLoopCard />
          <BpWatch />
          <RecoveryProfile />

          {/* The one primary action */}
          <section aria-labelledby="checkin-h" className="relative overflow-hidden rounded-[2rem] bg-plum-100 p-6 md:p-8">
            <Sparkle className="absolute right-5 top-5 text-plum-400" size={26} />
            <h2 id="checkin-h" className="max-w-[16ch] text-3xl md:text-4xl">{checkedToday ? tr("You've checked in today. Thank you.") : tr("How are you feeling today?")}</h2>
            <p className="mt-2 max-w-md text-base text-ink/75">
              {checkedToday ? tr("Rest if you can. Come back tomorrow, or any time something feels different.") : tr("A 30-second check on your mood, sleep and body. No right or wrong answers.")}
            </p>
            <Link href="/checkin" className={`mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-plum-800 px-7 py-3 text-base font-bold text-white shadow-md shadow-plum-800/20 transition duration-200 hover:bg-plum-900 active:scale-[.98] ${focusRing}`}>
              {checkedToday ? tr("See your trend") : tr("Start my check-in")}<ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </section>

          {/* Stage note */}
          <section aria-label={tr("This week for you")} className="rounded-3xl border border-plum-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-plum-800/70">{tr("This week for you")}</p>
            <p className="mt-1.5 font-serif text-xl leading-snug text-plum-900">{tr(stageText(s.mother.birth))}</p>
          </section>

          {/* Today list */}
          <section aria-labelledby="today-h" className="overflow-hidden rounded-3xl border border-plum-100 bg-white shadow-[0_10px_30px_-14px_rgba(200,93,104,.25)]">
            <h2 id="today-h" className="p-5 pb-3 text-2xl">{tr("Today for you")}</h2>
            <ul className="divide-y divide-plum-100">
              {tasks.map((x) => (
                <li key={x.text}>
                  <Link href={x.href} className={`group flex min-h-14 items-center gap-3 px-5 py-3.5 transition hover:bg-plum-50 ${focusRing} focus-visible:ring-inset`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${x.done ? "bg-emerald-100 text-emerald-800" : "bg-plum-100 text-plum-800"}`}>
                      {x.done ? <Check className="h-5 w-5" aria-hidden /> : <x.icon className="h-5 w-5" aria-hidden />}
                    </span>
                    <span className={`font-semibold ${x.done ? "text-ink/70" : "text-ink"}`}>{tr(x.text, x.v)}{x.done && <span className="sr-only"> ({tr("done")})</span>}</span>
                    <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-plum-800/50 transition group-hover:translate-x-1" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-5">
          {/* Gentle week: presence, not scores */}
          <section aria-labelledby="week-h" className="rounded-3xl border border-plum-100 bg-white p-5 shadow-[0_10px_30px_-14px_rgba(200,93,104,.25)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="week-h" className="text-2xl">{tr("Your week")}</h2>
                <span className="text-sm font-semibold text-ink/70">{tr("Checked in {n} of 7 days", { n: w.days })}</span>
              </div>
              <BloomProgress value={w.days / 7} className="w-16 shrink-0" label={tr("Your bloom: {n} of 7 days", { n: w.days })} />
            </div>
            <ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label={tr("Check-ins this week")}>
              {week.map((d) => (
                <li key={d.key} className="flex flex-col items-center gap-1.5" aria-label={`${d.full}: ${d.done ? tr("checked in") : tr("not checked in")}`}>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${d.done ? "bg-plum-800 text-white" : "border-2 border-plum-200 bg-plum-50"} ${d.isToday ? "ring-2 ring-plum-300 ring-offset-2" : ""}`}>
                    {d.done && <Check className="h-4 w-4" aria-hidden />}
                  </span>
                  <span aria-hidden className={`text-xs ${d.isToday ? "font-bold text-plum-800" : "text-ink/70"}`}>{d.letter}</span>
                </li>
              ))}
            </ol>
            <Link href="/report" className={`mt-4 inline-flex min-h-11 items-center gap-1 rounded-full text-sm font-bold text-plum-800 underline-offset-4 hover:underline ${focusRing}`}>{tr("See your week")}<ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </section>

          {/* Quick access */}
          <section aria-labelledby="support-h">
            <h2 id="support-h" className="mb-3 text-2xl">{tr("Support, when you want it")}</h2>
            <ul className="grid grid-cols-2 gap-3">
              {QUICK.map((q) => (
                <li key={q.href}>
                  <Link href={q.href} className={`flex h-full min-h-[104px] flex-col gap-2 rounded-3xl border border-plum-100 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-plum-50 active:scale-[.98] ${focusRing}`}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-plum-100 text-plum-800"><q.icon className="h-5 w-5" aria-hidden /></span>
                    <span className="font-bold leading-tight text-plum-900">{tr(q.label)}</span>
                    <span className="-mt-1 text-xs text-ink/70">{tr(q.hint)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/more" className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-bold text-plum-800 underline-offset-4 hover:underline ${focusRing}`}><LayoutGrid className="h-4 w-4" aria-hidden />{tr("Everything in AfterBloom")}</Link>
          </section>
        </div>
      </div>

      {/* Helpline: always visible, never gated */}
      <aside aria-label={tr("Free help")} className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
        <Phone className="h-6 w-6 shrink-0 text-emerald-800" aria-hidden />
        <p className="min-w-0 flex-1 text-emerald-950">
          <b>{tr("Free help is always here:")}</b> {tr("Tele-MANAS")} <a className="inline-block min-h-6 font-bold underline" href="tel:14416">14416</a> ({tr("24×7, 20 languages")}) · {tr("Emergency")} <a className="inline-block min-h-6 font-bold underline" href="tel:112">112</a>
        </p>
      </aside>
    </div>
  );
}
