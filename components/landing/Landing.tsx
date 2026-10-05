"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import { animate, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, ChevronDown, Flower2, Moon, Phone, Sun } from "lucide-react";
import { useApp } from "@/lib/store";
import { HOME_BY_ROLE } from "@/lib/demo";
import { FEATURES } from "@/lib/features";
import { useTr } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { ease, rise, spring, stagger, tap } from "@/lib/motion";
import { LangToggle } from "../LangToggle";
import { Illustration } from "./Illustration";
import { Bloom } from "./Bloom";
import { Family } from "./Family";
import { STORY, StopButtons, StopCard, StopOverlay, TINT } from "./JourneyParts";

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
  const { auth } = useApp();
  const signedIn = auth.status === "user";
  const homeHref = (auth.role && HOME_BY_ROLE[auth.role]) || "/home";
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
  // after the first screen she settles into a smaller size and stays put while the five stops of the journey play out around her
  const scale = useTransform(p, [0, 0.12], [1, wide ? 1 : 0.8]);
  const mask = useTransform(p, [0.06, 0.14], [0, 1]);

  // which stop of the journey is in view (-1 = the first screen). The flower opens at the last one.
  const [active, setActive] = useState(-1);
  const flower = useMotionValue(0.14);
  useEffect(() => { animate(flower, active === 4 ? 1 : 0.14, spring.soft); }, [active, flower]);
  const tint = active >= 0 ? TINT[active] : undefined;

  // handoff: a soft bloom circle grows from the pressed button, then the app opens
  const [leave, setLeave] = useState<{ x: number; y: number } | null>(null);
  const go = (dest: string) => (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    setLeave({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
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
            {!signedIn && <Link href="/login" className="hidden h-11 items-center rounded-full border border-line px-4 text-sm font-bold text-plum-800 transition hover:bg-plum-100 sm:flex">{tr("Sign in")}</Link>}
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
                <m.div style={{ opacity: mask }} className="absolute inset-x-0 top-0 h-[372px] bg-gradient-to-b from-background from-82% to-transparent md:hidden" />
                <m.div style={{ scale, transformOrigin: wide ? "100% 50%" : "50% 0%" }} className="relative aspect-[400/460] w-[min(68vw,280px)] md:w-[min(34vw,430px)]">
                  <Illustration p={p} idle={playing} tint={tint} flower={flower} sleepy={active === 1} label={tr("A mother holding her baby, wrapped in a dupatta")} />
                  <StopOverlay i={active} still={false} />
                </m.div>
              </div>
            </div>
          )}

          <m.section onViewportEnter={() => setActive(-1)} viewport={{ amount: 0.5 }} className="relative z-0 flex min-h-[100dvh] flex-col px-5 pb-12 pt-24 md:flex-row md:items-center md:gap-10 md:px-12 md:pt-16 lg:px-20">
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
                <m.a whileTap={tap} href={signedIn ? homeHref : "/signup"} onClick={go(signedIn ? homeHref : "/signup")} className="btn-primary !px-7 !py-3.5 text-base">{signedIn ? tr("Open my home") : tr("Start your check-in")}<ArrowRight className="h-5 w-5" aria-hidden /></m.a>
                <a href="#journey" className="btn-ghost">{tr("Why we exist")}<ChevronDown className="h-4 w-4" aria-hidden /></a>
              </div>
            </div>
          </m.section>

          {/* the journey: five boxes, one for each stop, beside the same illustration. The picture changes quietly as each one comes into view. */}
          <section id="journey" aria-label={tr("The first six months")} className="relative z-0 px-5 md:px-12 lg:px-20">
            <ol>
              {STORY.map((_, i) => (
                <li key={i} className={reduce ? "flex justify-center py-6" : "flex min-h-[100dvh] items-start pb-8 pt-[388px] md:items-center md:pt-16"}>
                  <m.div onViewportEnter={() => setActive(i)} viewport={{ amount: 0.5 }} variants={rise} initial="hidden" whileInView="show" className="w-full max-w-md rounded-card border border-line bg-surface/95 p-5 shadow-soft md:p-7">
                    {reduce && (
                      <div className="relative mx-auto mb-4 aspect-[400/460] w-[min(62vw,230px)]">
                        <Illustration still idle={false} tint={TINT[i]} flower={i === 4 ? 1 : 0.14} sleepy={i === 1} label={tr("A mother holding her baby, wrapped in a dupatta")} />
                        <StopOverlay i={i} still />
                      </div>
                    )}
                    <StopCard i={i} tr={tr} />
                    {i === 4 && <StopButtons signedIn={signedIn} homeHref={homeHref} go={go} tr={tr} />}
                  </m.div>
                </li>
              ))}
            </ol>
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
              <m.a whileTap={tap} href={signedIn ? homeHref : "/signup"} onClick={go(signedIn ? homeHref : "/signup")} className="btn-primary !px-8 !py-4 text-base">{signedIn ? tr("Open my home") : tr("Start your check-in")}<ArrowRight className="h-5 w-5" aria-hidden /></m.a>
              {!signedIn && <m.a whileTap={tap} href="/login" onClick={go("/login")} className="btn-ghost !px-8 !py-4 text-base">{tr("I'm a professional")}</m.a>}
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
