"use client";
import Link from "next/link";
import { useState } from "react";
import { CalendarCheck, Brain, Syringe, FileText, ChevronRight, Phone, Stethoscope, Video, HeartHandshake, MessageCircleHeart, ArrowRight } from "lucide-react";
import { useApp, daysSince, dayStr } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { FeatureGrid } from "@/components/FeatureGrid";
import { TrendChart } from "@/components/Charts";
import { Reveal, CountUp, Bar, BlobFrame, BloomArt, Wave, Sparkle } from "@/components/fx";
import { EPDS_SCHEDULE } from "@/lib/epds";
import { VACCINES } from "@/lib/vaccines";
import { stageText, weekData, face } from "@/lib/report";

const wrap = "mx-auto w-full max-w-6xl px-5 md:px-10";
const Ghost = ({ children }: { children: string }) => (
  <div className="pointer-events-none select-none text-center font-serif text-6xl font-bold text-plum-200/60 md:text-8xl" aria-hidden>{children}</div>
);

const SERVICES = [
  { icon: Stethoscope, title: "Is this normal?", text: "Describe a symptom in English, Hindi or Hinglish and get a clear red, amber or green answer.", href: "/check" },
  { icon: Brain, title: "Mind check", text: "A 2-minute wellness check at set times. Worrying results go to a person, never just a screen.", href: "/screening" },
  { icon: Video, title: "Talk to someone", text: "Video sessions with registered psychologists and psychiatrists. Free Tele-MANAS always beside them.", href: "/care" },
  { icon: HeartHandshake, title: "Family and circles", text: "Bring your family in, and meet mothers at your stage in a small, safe circle.", href: "/family" },
];

export default function Home() {
  const { s } = useApp();
  const tr = useTr();
  const [active, setActive] = useState(1);
  const age = daysSince(s.mother.birth);
  const checkedToday = s.checkins.some((c) => dayStr(c.date) === dayStr(new Date()));
  const nextEpds = EPDS_SCHEDULE.find((e) => e.day >= age);
  const lastEpds = s.epds[0];
  const vax = VACCINES.find((v) => v.days >= age && !s.vaccinesDone.includes(v.id));
  const w = weekData(s);
  const tasks = [
    { v: undefined as any, done: checkedToday, icon: CalendarCheck, text: checkedToday ? "Today's check-in done" : "Do today's 30-second check-in", href: "/checkin" },
    { done: !!lastEpds && daysSince(lastEpds.date) < 14, icon: Brain, text: nextEpds ? "Mind check: {l}" : "Mind check", v: { l: tr(nextEpds?.label ?? "") }, href: "/screening" },
    { done: false, icon: Syringe, text: vax ? "Baby: {a} vaccines ({n})" : "Baby care", v: { a: tr(vax?.age ?? ""), n: vax?.vaccines.length ?? 0 }, href: "/baby" },
    { v: undefined as any, done: false, icon: FileText, text: "See your week", href: "/report" },
  ];

  return (
    <div className="-mx-4 -my-6 overflow-x-clip md:-mx-10 md:-my-8">
      {/* 1. HERO */}
      <section className="bg-plum-100">
        <div className={`${wrap} grid items-center gap-10 py-12 md:py-16 lg:grid-cols-2`}>
          <div>
            <Reveal><p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-sm font-bold text-plum-700"><Sparkle size={14} />{tr("Hello")}, {tr(s.mother.name)}</p></Reveal>
            <Reveal delay={100}><h1 className="font-serif text-5xl font-semibold leading-[1.05] md:text-7xl">{tr("After the baby comes home,")} <span className="text-plum-700">{tr("we check on you.")}</span></h1></Reveal>
            <Reveal delay={200}><p className="mt-5 max-w-lg text-lg text-ink/75">{tr("Day {n} after your {d}.", { n: age, d: tr(s.mother.delivery.toLowerCase()) })} {tr("{b} is {w} weeks old.", { b: s.mother.babyName, w: Math.floor(age / 7) })} {tr(stageText(s.mother.birth))}</p></Reveal>
            <Reveal delay={300}>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/checkin" className="btn-primary !px-7 !py-3.5">{checkedToday ? tr("See your trend") : tr("Do today's check-in")}<ArrowRight className="h-4 w-4" /></Link>
                <Link href="/check" className="btn-ghost !px-7 !py-3.5 bg-white/60">{tr("Is this normal?")}</Link>
              </div>
            </Reveal>
          </div>
          <Reveal delay={200}><BlobFrame><BloomArt /></BlobFrame></Reveal>
        </div>
      </section>
      <Wave bg="bg-plum-100" fill="text-white" />

      {/* 2. THE GAP */}
      <section className="bg-white pb-6 pt-4">
        <div className={`${wrap} grid items-center gap-12 lg:grid-cols-2`}>
          <Reveal><BlobFrame flip><BloomArt variant={1} /></BlobFrame></Reveal>
          <div className="relative">
            <Reveal><Ghost>{tr("The Gap")}</Ghost></Reveal>
            <Reveal delay={100}><h2 className="-mt-8 text-4xl md:-mt-12 md:text-5xl">{tr("Welcome to AfterBloom")}</h2></Reveal>
            <Reveal delay={150}><p className="mt-4 text-ink/75">{tr("Childbirth in India is now mostly safe inside the hospital, but the weeks after discharge are not. About a third of maternal deaths happen after the mother goes home, and depression often goes unseen. AfterBloom detects early and routes quickly into human care.")}</p></Reveal>
            <div className="mt-7 grid grid-cols-2 gap-4">
              {[{ n: 22, s: "%", l: "mothers screen positive for PPD", c: "bg-plum-700 text-white rounded-[2rem_2rem_2rem_0.5rem]" }, { n: 87, s: "", l: "maternal deaths per 100,000 births", c: "bg-plum-100 text-plum-800 rounded-[2rem]" }, { n: 33, s: "%", l: "of maternal deaths come after discharge", c: "bg-plum-100 text-plum-800 rounded-[2rem]" }, { n: 85, s: "%", l: "with common mental disorders untreated", c: "bg-plum-800 text-white rounded-[0.5rem_2rem_2rem_2rem]" }].map((x, i) => (
                <Reveal key={x.l} delay={i * 100}>
                  <div className={`${x.c} p-5 shadow-lg shadow-plum-700/10 transition duration-300 hover:-translate-y-1.5`}>
                    <div className="font-serif text-5xl font-bold"><CountUp to={x.n} suffix={x.s} /></div>
                    <div className="mt-1 text-sm opacity-90">{tr(x.l)}</div>
                  </div>
                </Reveal>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink/50">{tr("Sources: Upadhyay et al. 2017; SRS 2022-24; NHM; NMHS 2015-16.")}</p>
          </div>
        </div>
      </section>
      <Wave bg="bg-white" fill="text-plum-50" />

      {/* 3. SERVICES */}
      <section className="bg-plum-50 pb-10 pt-2">
        <div className={wrap}>
          <Reveal><Ghost>{tr("Our Care")}</Ghost></Reveal>
          <Reveal delay={100}><h2 className="-mt-8 text-center text-4xl md:-mt-12 md:text-5xl">{tr("We can help you heal")}</h2></Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((x, i) => {
              const on = active === i;
              return (
                <Reveal key={x.title} delay={i * 100}>
                  <Link href={x.href} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} className={`group flex h-full flex-col gap-3 p-6 text-center transition-all duration-500 ${on ? "-translate-y-2 rounded-[2.5rem_0.75rem_2.5rem_0.75rem] bg-plum-600 text-white shadow-2xl shadow-plum-700/30" : "rounded-[2rem] bg-white/60 text-plum-900"}`}>
                    <x.icon className={`mx-auto h-10 w-10 transition ${on ? "scale-110 text-white" : "text-plum-700"}`} />
                    <h3 className={`text-2xl ${on ? "!text-white" : ""}`}>{tr(x.title)}</h3>
                    <p className={`text-sm ${on ? "text-white/90" : "text-ink/65"}`}>{tr(x.text)}</p>
                    <span className="mt-auto inline-flex items-center justify-center gap-1 text-sm font-bold">{tr("Learn more")} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. EVIDENCE */}
      <section className="bg-white py-14">
        <div className={`${wrap} grid items-center gap-12 lg:grid-cols-2`}>
          <div>
            <Reveal><Ghost>{tr("Evidence")}</Ghost></Reveal>
            <Reveal delay={100}><h2 className="-mt-8 text-4xl md:-mt-12 md:text-5xl">{tr("Proving our expertise")}</h2></Reveal>
            <Reveal delay={150}><p className="mb-7 mt-4 text-ink/75">{tr("Built on a validated screening tool and on peer support that has been tested in India. The AI never writes advice; every message is prewritten and clinician-reviewed.")}</p></Reveal>
            <div className="space-y-5">
              <Reveal><Bar label={tr("EPDS sensitivity (Indian versions)")} value={94} tone="peach" note={tr("BMC Psychiatry, 2021")} /></Reveal>
              <Reveal delay={100}><Bar label={tr("EPDS specificity")} value={91} note={tr("BMC Psychiatry, 2021")} /></Reveal>
              <Reveal delay={200}><Bar label={tr("Remission with peer support (Goa trial)")} value={73} tone="maroon" note={tr("vs 60% in usual care. Fuhr et al., Lancet Psychiatry, 2019")} /></Reveal>
            </div>
            <Reveal delay={300}><Link href="/screening" className="btn-primary mt-8">{tr("Try the mind check")}<ArrowRight className="h-4 w-4" /></Link></Reveal>
          </div>
          <Reveal delay={150}>
            <div className="grid gap-4">
              {[{ icon: MessageCircleHeart, t: "Bloom Circles", d: "Small circles of 15 to 20 mothers at your stage, with crisis language routed to humans.", h: "/circles" }, { icon: Phone, t: "Crisis help is never gated", d: "No login, no loading screen, no paywall. Tele-MANAS 14416 and 112 are one tap away.", h: "/crisis" }].map((c) => (
                <Link key={c.t} href={c.h} className="card flex gap-4 !p-6">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-plum-100 text-plum-700"><c.icon className="h-7 w-7" /></span>
                  <div><h3 className="text-2xl">{tr(c.t)}</h3><p className="mt-1 text-sm text-ink/65">{tr(c.d)}</p></div>
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
      <Wave bg="bg-white" fill="text-plum-100" />

      {/* 5. DASHBOARD */}
      <section className="bg-plum-100 pb-14 pt-2">
        <div className={wrap}>
          <Reveal><Ghost>{tr("Dashboard")}</Ghost></Reveal>
          <Reveal delay={100}><h2 className="-mt-8 text-4xl md:-mt-12 md:text-5xl">{tr("Your day, {name}", { name: tr(s.mother.name) })}</h2></Reveal>
          <div className="mt-8 grid gap-6 lg:grid-cols-5">
            <Reveal className="lg:col-span-2">
              <div className="card !p-0 divide-y divide-plum-100">
                <h3 className="p-5 text-2xl">{tr("Today for you")}</h3>
                {tasks.map((x) => (
                  <Link key={x.text} href={x.href} className="group flex items-center gap-3 p-4 transition hover:bg-plum-50">
                    <x.icon className={`h-5 w-5 ${x.done ? "text-emerald-600" : "text-plum-700"}`} />
                    <span className={x.done ? "text-gray-400 line-through" : "font-semibold"}>{tr(x.text, x.v)}</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-plum-300 transition group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            </Reveal>
            <Reveal delay={120} className="lg:col-span-3">
              <div className="card h-full">
                <h3 className="mb-3 text-2xl">{tr("Your week at a glance")}</h3>
                <div className="mb-3 grid grid-cols-4 gap-3 text-center">
                  {[["Mood", w.week.length ? face(w.mood) : "-"], ["Appetite", w.week.length ? face(w.appetite) : "-"], ["Sleep", w.week.length ? face((w.sleep / 8) * 5) : "-"], ["Check-ins", `${w.days}/7`]].map(([k, v]) => (
                    <div key={k} className="rounded-2xl bg-plum-50 p-3"><div className="text-2xl font-bold">{v}</div><div className="text-xs text-ink/55">{tr(k as string)}</div></div>
                  ))}
                </div>
                <TrendChart data={s.checkins} height={200} />
              </div>
            </Reveal>
          </div>
          <Reveal delay={100}>
            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
              <Phone className="h-6 w-6 text-emerald-700" />
              <span><b>{tr("Free help is always here:")}</b> {tr("Tele-MANAS")} <a className="font-bold underline" href="tel:14416">14416</a> ({tr("24×7, 20 languages")}) · {tr("Emergency")} <a className="font-bold underline" href="tel:112">112</a></span>
            </div>
          </Reveal>
        </div>
      </section>
      <Wave bg="bg-plum-100" fill="text-white" />

      {/* 6. ALL FEATURES */}
      <section className="bg-white pb-28 pt-2 lg:pb-16">
        <div className={wrap}>
          <Reveal><Ghost>{tr("Explore")}</Ghost></Reveal>
          <Reveal delay={100}><h2 className="-mt-8 mb-8 text-center text-4xl md:-mt-12 md:text-5xl">{tr("Everything in AfterBloom")}</h2></Reveal>
          <Reveal delay={150}><FeatureGrid /></Reveal>
        </div>
      </section>
    </div>
  );
}
