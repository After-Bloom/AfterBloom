"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import { useInView, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, ChevronDown, Flower2, Moon, Phone, Sun } from "lucide-react";
import { useApp } from "@/lib/store";
import { FEATURES } from "@/lib/features";
import { useTr } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { ease, rise, spring, stagger, tap } from "@/lib/motion";
import { LangToggle } from "../LangToggle";
import { CountUp } from "../fx";
import { Illustration } from "./Illustration";
import { Bloom } from "./Bloom";
import { Family } from "./Family";

const CARDS = ["symptoms", "checkin", "care", "circles", "family"] as const;

function useMediaQuery(q: string) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = matchMedia(q);
    const on = () => setV(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return v;
}

const view = { once: true, margin: "-60px" } as const;

export function Landing() {
  const { set } = useApp();
  const tr = useTr();
  const router = useRouter();
  // read the preference only after mount so server and first client render match
  const pref = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const reduce = mounted && !!pref;
  const { dark, toggle: toggleTheme } = useTheme();
  const wide = useMediaQuery("(min-width: 768px)");

  // idle loops run only while the story is on screen and the tab is visible
  const story = useRef<HTMLDivElement>(null);
  const storyInView = useInView(story, { margin: "120px" });
  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const on = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  const playing = storyInView && tabVisible && !reduce;

  const { scrollYProgress: page } = useScroll();
  const bar = useSpring(page, { stiffness: 140, damping: 30, mass: 0.4 });
  const { scrollYProgress: p } = useScroll({ target: story, offset: ["start start", "end end"] });
  const scale = useTransform(p, [0, 0.4], [1, wide ? 0.62 : 0.46]);
  const x = useTransform(p, [0, 0.4], [0, wide ? 0 : -58]);
  const bloomOpacity = useTransform(p, [0.3, 0.42], [0, 1]);
  const bloomP = useTransform(p, [0.34, 0.9], [0, 1]);
  const mask = useTransform(p, [0.3, 0.45], [0, 1]);

  // handoff: a soft bloom circle grows from the pressed button, then the app opens
  const [leave, setLeave] = useState<{ x: number; y: number } | null>(null);
  const go = (dest: string, role: "mother" | "pro") => (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    setLeave({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    set((s) => ({ ...s, role }));
    setTimeout(() => router.push(dest), reduce ? 160 : 640);
  };

  const lines = [tr("After the baby comes home, everyone checks on the baby."), tr("AfterBloom checks on the mother.")];

  return (
    <div data-playing={playing} className="relative overflow-x-clip bg-background text-ink">
      {/* readable without JS animations: undo the hidden initial states */}
      <noscript><style dangerouslySetInnerHTML={{ __html: `[style*="opacity: 0"],[style*="opacity:0"]{opacity:1!important;transform:none!important}[data-js-only],#petals{display:none!important}` }} /></noscript>

      <m.div style={{ scaleX: bar }} className="fixed inset-x-0 top-0 z-[70] h-1 origin-left bg-primary-fill" aria-hidden />

      <header className="fixed inset-x-0 top-0 z-[60] border-b border-line/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-1.5 font-serif text-xl font-bold text-plum-800 sm:text-2xl"><Flower2 className="h-6 w-6 shrink-0 text-primary sm:h-7 sm:w-7" aria-hidden />AfterBloom</Link>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button onClick={toggleTheme} aria-label={dark ? tr("Switch to light mode") : tr("Switch to dark mode")} aria-pressed={dark} className="hidden h-11 w-11 items-center justify-center rounded-full border border-line text-plum-800 transition hover:bg-plum-100 sm:flex">{dark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}</button>
            <LangToggle />
            {/* always visible, plain link: works with no JS and never waits on the app */}
            <a href="/crisis" className="flex h-11 items-center gap-1.5 rounded-full bg-red-600 px-3.5 text-sm font-bold text-white shadow-md shadow-red-600/25 transition hover:bg-red-700 active:scale-95"><Phone className="h-4 w-4" aria-hidden /><span className="sm:hidden">{tr("Help now")}</span><span className="hidden sm:inline">{tr("Need help now?")}</span></a>
          </div>
        </div>
      </header>

      <main>
        <div ref={story} className="relative">
          {/* the illustration lives in a sticky layer so it can shrink and move as she scrolls */}
          {!reduce && (
            <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
              <div className="sticky top-16 flex h-[calc(100dvh-4rem)] items-start justify-center pt-8 md:items-center md:justify-end md:pr-[8vw] md:pt-0">
                <m.div style={{ opacity: mask }} className="absolute inset-x-0 top-0 h-[290px] bg-gradient-to-b from-background from-78% to-transparent md:hidden" />
                <m.div style={{ scale, x, transformOrigin: wide ? "100% 50%" : "50% 0%" }} className="relative aspect-[400/460] w-[min(68vw,280px)] md:w-[min(34vw,430px)]">
                  <Illustration p={p} idle={playing} label={tr("A mother holding her baby, wrapped in a dupatta")} />
                </m.div>
                <m.div data-js-only style={{ opacity: bloomOpacity }} className="absolute left-1/2 top-8 ml-2 w-[96px] md:left-auto md:right-[calc(8vw+300px)] md:top-1/2 md:ml-0 md:w-[190px] md:-translate-y-1/2">
                  <Bloom progress={bloomP} />
                </m.div>
              </div>
            </div>
          )}

          <section className="relative z-0 flex min-h-[100dvh] flex-col px-5 pb-12 pt-24 md:flex-row md:items-center md:gap-10 md:px-12 md:pt-16 lg:px-20">
            <div className="h-[310px] shrink-0 md:order-2 md:h-[520px] md:w-1/2">
              {reduce && <div className="mx-auto aspect-[400/460] h-full max-h-full"><Illustration still idle={false} label={tr("A mother holding her baby, wrapped in a dupatta")} /></div>}
            </div>
            {/* above the fold: CSS fades only, so the text is visible as soon as the HTML paints */}
            <div className="max-w-xl md:order-1 md:w-1/2">
              <p className="mb-3 animate-fadeUp text-sm font-bold uppercase tracking-widest text-primary">{tr("Postpartum care for Indian mothers")}</p>
              <h1 className="text-[2rem] font-semibold leading-[1.15] sm:text-4xl md:text-5xl">
                <span className="block animate-fadeUp [animation-delay:120ms]">{lines[0]}</span>
                <span className="mt-1 block animate-fadeUp text-primary [animation-delay:260ms]">{lines[1]}</span>
              </h1>
              <p className="mt-4 max-w-md animate-fadeUp text-lg text-ink-muted [animation-delay:400ms]">{tr("A care companion for mothers, their families and their babies.")}</p>
              <div className="mt-6 flex animate-fadeUp flex-wrap items-center gap-3 [animation-delay:520ms]">
                <m.a whileTap={tap} href="/home" onClick={go("/home", "mother")} className="btn-primary !px-7 !py-3.5 text-base">{tr("Start your check-in")}<ArrowRight className="h-5 w-5" aria-hidden /></m.a>
                <a href="#why" className="btn-ghost">{tr("Why we exist")}<ChevronDown className="h-4 w-4" aria-hidden /></a>
              </div>
            </div>
          </section>

          <section id="why" className="relative z-0 px-5 pb-24 pt-[40vh] md:px-12 md:pt-24 lg:px-20" aria-labelledby="why-h">
            <div className="max-w-lg space-y-[30vh] md:space-y-[40vh]">
              <m.div variants={rise} initial="hidden" whileInView="show" viewport={view}>
                <h2 id="why-h" className="text-3xl md:text-4xl">{tr("The quiet after the hospital")}</h2>
                <p className="mt-4 text-lg text-ink-muted">{tr("The delivery is watched over with great care. Then you go home, and the weeks that follow have very little support for your own body and mind.")}</p>
              </m.div>
              <Stat n={22} sub={tr("of Indian mothers screen positive for postpartum depression, about 1 in 5.")} src="Upadhyay et al., Bulletin of the WHO, 2017" reduce={reduce} />
              <div>
                <Stat n={33} sub={tr("of maternal deaths happen after delivery and discharge, about one in three. Many warning signs show up at home first.")} src="NHM, Optimizing Postnatal Care" prefix="≈" reduce={reduce} />
                <m.p variants={rise} initial="hidden" whileInView="show" viewport={view} className="mt-10 font-serif text-2xl text-plum-800">{tr("You are not alone, and none of this is your fault.")}</m.p>
              </div>
            </div>
          </section>
        </div>

        <section className="px-5 py-20 md:px-12 lg:px-20" aria-labelledby="does-h">
          <h2 id="does-h" className="mx-auto max-w-3xl text-center text-3xl md:text-4xl">{tr("What AfterBloom does")}</h2>
          <m.ul variants={stagger()} initial="hidden" whileInView="show" viewport={view} className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {CARDS.map((k, i) => {
              const f = FEATURES.find((x) => x.key === k)!;
              return (
                <m.li key={k} variants={rise} whileHover={{ y: -4, transition: spring.snappy }} whileTap={{ scale: 0.98, transition: spring.snappy }} className={i < 3 ? "lg:col-span-2" : "lg:col-span-3"}>
                  <Link href={f.href} className="card flex h-full flex-col gap-3 !p-6">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-plum-100 text-primary"><f.icon className="h-6 w-6" aria-hidden /></span>
                    <span className="font-serif text-xl font-semibold text-plum-800">{tr(f.title)}</span>
                    <span className="text-ink-muted">{tr(f.desc)}</span>
                  </Link>
                </m.li>
              );
            })}
          </m.ul>
        </section>

        <section className="bg-surface-2 px-5 py-20 md:px-12 lg:px-20" aria-labelledby="fam-h">
          <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
            <div>
              <h2 id="fam-h" className="text-3xl md:text-4xl">{tr("For the whole family")}</h2>
              <p className="mt-4 text-lg text-ink-muted">{tr("Her partner, her mother and her mother-in-law get simple, practical ways to help. She chooses who joins and what each person sees.")}</p>
            </div>
            <div>
              <Family />
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 pt-24 text-center md:px-12" aria-labelledby="final-h">
          <m.div variants={stagger()} initial="hidden" whileInView="show" viewport={view} className="mx-auto flex max-w-xl flex-col items-center">
            <m.div variants={rise} className="w-32 md:w-40"><Bloom label={tr("A flower in full bloom")} /></m.div>
            <m.h2 variants={rise} id="final-h" className="mt-4 text-3xl md:text-4xl">{tr("Every new mother deserves someone checking on her.")}</m.h2>
            <m.p variants={rise} className="mt-3 text-ink-muted">{tr("Free for mothers, always. Crisis help never needs a login.")}</m.p>
            <m.div variants={rise} className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
              <m.a whileTap={tap} href="/home" onClick={go("/home", "mother")} className="btn-primary !px-8 !py-4 text-base">{tr("Start your check-in")}<ArrowRight className="h-5 w-5" aria-hidden /></m.a>
              <m.a whileTap={tap} href="/pro" onClick={go("/pro", "pro")} className="btn-ghost !px-8 !py-4 text-base">{tr("I'm a professional")}</m.a>
            </m.div>
          </m.div>
        </section>
      </main>

      <footer className="border-t border-line px-5 py-8 text-center text-sm text-ink-muted">
        <p>{tr("Free help 24×7:")} {tr("Tele-MANAS")} <a className="font-bold underline" href="tel:14416">14416</a> · <a className="font-bold underline" href="tel:112">112</a></p>
        <p className="mx-auto mt-2 max-w-xl">{tr("AfterBloom offers screening support and care navigation, not a diagnosis. In an emergency call 112.")}</p>
      </footer>

      {leave && (reduce
        ? <m.div className="fixed inset-0 z-[120] bg-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} />
        : (
          <>
            <m.div className="fixed z-[120] h-[100px] w-[100px] rounded-full bg-plum-100" style={{ left: leave.x - 50, top: leave.y - 50 }} initial={{ scale: 0 }} animate={{ scale: 42 }} transition={{ duration: 0.62, ease }} />
            <m.div className="fixed inset-0 z-[121] flex items-center justify-center text-primary" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...spring.soft, delay: 0.12 }}><Flower2 className="h-20 w-20" aria-hidden /></m.div>
          </>
        ))}
    </div>
  );
}

function Stat({ n, sub, src, reduce, prefix = "" }: { n: number; sub: string; src: string; reduce: boolean; prefix?: string }) {
  return (
    <m.div variants={rise} initial="hidden" whileInView="show" viewport={view}>
      <div className="font-serif text-6xl font-semibold text-primary md:text-7xl">{reduce ? `${prefix}${n}%` : <CountUp to={n} suffix="%" prefix={prefix} />}</div>
      <p className="mt-2 text-lg">{sub}</p>
      <p className="mt-1 text-xs text-ink-muted">{src}</p>
    </m.div>
  );
}
