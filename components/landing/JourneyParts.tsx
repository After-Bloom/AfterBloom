"use client";
import { useId } from "react";
import * as m from "motion/react-m";
import { ArrowRight, HeartHandshake, Home, Stethoscope, Users } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { tap } from "@/lib/motion";

// The journey, told on the hero illustration itself: five stops, five boxes of words, and a few quiet touches that appear around the mother and baby.
export const STORY = [
  { tag: "Day 1", title: "Welcome home", text: "The baby is home. Everyone is checking on the baby." },
  { tag: "Week 2", title: "The sleepless nights", text: "...but who is checking on her?", soft: "About 1 in 5 new mothers in India feel very low after birth. It is common, and it is never their fault." },
  { tag: "Week 6", title: "Someone checks in", text: "AfterBloom does. Gently, every day." },
  { tag: "Month 3", title: "She is not alone", text: "Family and other mothers, walking with her." },
  { tag: "Month 6", title: "Bloom", text: "Every new mother deserves someone checking on her." },
] as const;

/** the colour of the soft circle behind her at each stop (theme tokens, so dark mode follows) */
export const TINT = ["rgb(var(--plum-100))", "rgb(var(--plum-200))", "rgb(var(--surface-2))", "rgb(var(--surface-2))", "rgb(var(--accent) / .2)"];

const show = (on: boolean, y = 6): React.CSSProperties => ({ opacity: on ? 1 : 0, transform: `translateY(${on ? 0 : y}px)`, transition: "opacity .7s ease, transform .7s ease" });
const pos = (l: number, t: number): React.CSSProperties => ({ left: `${l}%`, top: `${t}%` });

function Star({ l, t, s = 1, d = 0, still }: { l: number; t: number; s?: number; d?: number; still: boolean }) {
  return (
    <svg viewBox="-8 -8 16 16" className={`${still ? "" : "idle jn-twinkle"} absolute -translate-x-1/2 -translate-y-1/2`} style={{ ...pos(l, t), width: `${3.2 * s}%`, animationDelay: `${d}s` }} aria-hidden>
      <path d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2Z" fill="#F2C36B" />
    </svg>
  );
}

/** What appears around her at each stop. Positions are percentages of the picture, so it scales with it. */
export function StopOverlay({ i, still }: { i: number; still: boolean }) {
  const tr = useTr();
  const mid = "mn" + useId().replace(/:/g, "");
  const chip = "absolute flex h-[11%] w-[11%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-primary shadow-soft";
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {/* 1: a quiet moon and stars */}
      <div className="absolute inset-0" style={show(i === 0 || i === 1, 0)}>
        <svg viewBox="-30 -30 60 60" className="absolute w-[15%]" style={pos(3, 3)}><defs><mask id={mid}><rect x="-30" y="-30" width="60" height="60" fill="white" /><circle cx="10" cy="-5" r="18" fill="black" /></mask></defs><circle r="22" fill="#E8B960" mask={`url(#${mid})`} /></svg>
        <Star l={30} t={7} s={1.3} d={0.4} still={still} /><Star l={64} t={4} s={1.1} d={1.3} still={still} /><Star l={84} t={13} s={1.3} d={2.1} still={still} /><Star l={9} t={32} s={1} d={0.9} still={still} />
      </div>
      {/* 2: one lamp still on, and sleepy z's */}
      <div className="absolute inset-0" style={show(i === 1)}>
        <div className={`${still ? "" : "idle jn-glow"} absolute h-[26%] w-[20%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#FFE9B0_0%,transparent_70%)]`} style={pos(12, 56)} />
        <svg viewBox="0 0 40 70" className="absolute w-[9%]" style={pos(7.5, 52)}><path d="M5 26 L12 4 H28 L35 26Z" fill="#FBD28C" /><rect x="18" y="26" width="5" height="26" rx="2" fill="#E0A63B" /><rect x="6" y="52" width="29" height="5" rx="2.5" fill="#B38C68" /></svg>
        <p className={`${still ? "" : "idle jn-zzz"} absolute font-serif text-[clamp(14px,2.6vw,26px)] font-bold leading-none text-primary`} style={pos(63, 27)}>z z z</p>
      </div>
      {/* 3: the check-in, as it looks in the app */}
      <div className="absolute inset-0" style={show(i === 2, 10)}>
        <div className="absolute w-[66%] rounded-2xl border border-line bg-surface p-[2.2%] shadow-soft" style={pos(3, 2)}>
          <div className="flex items-center gap-[3%]"><span className="flex aspect-square w-[16%] shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"><Stethoscope className="h-[60%] w-[60%]" /></span><p className="hidden min-w-0 text-[12px] font-semibold leading-snug text-plum-800 md:block">{tr("How are you feeling today?")}</p></div>
          <div className="mt-[3%] flex gap-[2%]">{[0, 1, 2, 3, 4].map((k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${k < 4 ? "bg-primary-fill/70" : "bg-line"}`} />)}</div>
        </div>
      </div>
      {/* 4: family and other mothers around her */}
      <div className="absolute inset-0" style={show(i === 3, 0)}>
        <svg viewBox="0 0 400 460" className="absolute inset-0 h-full w-full" fill="none" stroke="#B04A56" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" opacity=".55"><path d="M60 140 C100 160 150 180 188 200" /><path d="M342 140 C310 160 270 180 228 200" /><path d="M350 316 C320 312 286 300 252 290" /></svg>
        <span className={chip} style={pos(14, 30)}><Users className="h-[48%] w-[48%]" /></span>
        <span className={chip} style={pos(86, 30)}><HeartHandshake className="h-[48%] w-[48%]" /></span>
        <span className={chip} style={pos(88, 68)}><Home className="h-[48%] w-[48%]" /></span>
      </div>
    </div>
  );
}

/** One box of words. */
export function StopCard({ i, tr }: { i: number; tr: ReturnType<typeof useTr> }) {
  const s = STORY[i];
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">{tr(s.tag)}</p>
        <span className="flex gap-1" aria-hidden>{STORY.map((_, k) => <span key={k} className={`h-1.5 w-1.5 rounded-full ${k <= i ? "bg-primary-fill" : "bg-line"}`} />)}</span>
      </div>
      <h2 className="mt-1.5 text-[1.7rem] leading-tight md:text-3xl">{tr(s.title)}</h2>
      <p className="mt-2 text-lg leading-snug text-ink">{tr(s.text)}</p>
      {"soft" in s && <p className="mt-3 text-sm text-ink-muted">{tr(s.soft)}</p>}
    </>
  );
}

export function StopButtons({ signedIn, homeHref, go, tr }: { signedIn: boolean; homeHref: string; go: (d: string) => (e: React.MouseEvent<HTMLElement>) => void; tr: ReturnType<typeof useTr> }) {
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <m.a whileTap={tap} href={signedIn ? homeHref : "/signup"} onClick={go(signedIn ? homeHref : "/signup")} className="btn-primary !px-6 !py-3 text-base">{signedIn ? tr("Open my home") : tr("Start your check-in")}<ArrowRight className="h-5 w-5" aria-hidden /></m.a>
      {!signedIn && <m.a whileTap={tap} href="/login" onClick={go("/login")} className="btn-ghost">{tr("I'm a professional")}</m.a>}
    </div>
  );
}
