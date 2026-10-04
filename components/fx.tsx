"use client";
import { useEffect, useRef, useState } from "react";

export function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`transition-all duration-700 ease-out ${seen ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"} ${className}`}>{children}</div>;
}

export function CountUp({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!seen) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1400);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to]);
  return <span ref={ref}>{prefix}{v}{suffix}</span>;
}

export function Bar({ label, value, note, tone = "rose" }: { label: string; value: number; note?: string; tone?: "rose" | "peach" | "maroon" }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const bg = tone === "maroon" ? "bg-plum-800" : tone === "peach" ? "bg-plum-300" : "bg-plum-600";
  return (
    <div ref={ref}>
      <div className="mb-1 flex justify-between text-sm font-semibold"><span>{label}</span><span>{value}%</span></div>
      <div className="h-3.5 overflow-hidden rounded-full bg-plum-100"><div className={`h-full rounded-full ${bg} transition-[width] duration-[1400ms] ease-out`} style={{ width: seen ? `${value}%` : "0%" }} /></div>
      {note && <div className="mt-1 text-xs text-ink/55">{note}</div>}
    </div>
  );
}

export function Sparkle({ className = "", size = 22 }: { className?: string; size?: number }) {
  return (
    <svg className={`animate-twinkle ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0c.8 6.2 5.8 11.2 12 12-6.2.8-11.2 5.8-12 12-.8-6.2-5.8-11.2-12-12C6.2 11.2 11.2 6.2 12 0z" />
    </svg>
  );
}

// Curved section divider: `bg` is the colour of the section above, `fill` the colour of the section below
export function Wave({ bg, fill }: { bg: string; fill: string }) {
  return (
    <div className={`${bg} leading-[0]`} aria-hidden>
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className={`block h-12 w-full md:h-20 ${fill}`} fill="currentColor">
        <path d="M0 90h1440V30C1200 -20 900 -20 720 30 480 80 240 80 0 20z" />
      </svg>
    </div>
  );
}

// Soft illustration used inside the blob frames
export function BloomArt({ variant = 0 }: { variant?: 0 | 1 }) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  const [c1, c2] = variant ? ["#f6b8b0", "#e58a8f"] : ["#f9c9c0", "#dc7f84"];
  const id = `pg${variant}`;
  return (
    <svg viewBox="0 0 400 440" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id={id} cx="50%" cy="25%"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></radialGradient>
      </defs>
      <g style={{ transformOrigin: "200px 440px" }} className="animate-sway">
        <path d="M200 440 C200 360 195 300 200 240" stroke="#7a3b4a" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M200 360 C150 340 120 330 100 290 C150 290 185 320 200 360z" fill="#c98b8b" opacity=".75" />
        <path d="M200 330 C250 320 285 300 305 260 C250 262 215 290 200 330z" fill="#e0a3a0" opacity=".85" />
      </g>
      <g transform="translate(200 200)">
        <g className="animate-float">
          {petals.map((a) => <ellipse key={a} cx="0" cy="-62" rx="30" ry="62" fill={`url(#${id})`} opacity=".92" transform={`rotate(${a})`} />)}
          <circle r="30" fill="#fff1d6" />
          <circle r="18" fill="#f2c36b" />
        </g>
      </g>
      <g stroke="#7a3b4a" strokeWidth="2.5" fill="none" strokeLinecap="round" style={{ transformOrigin: "60px 430px" }} className="animate-sway">
        <path d="M60 430 C70 360 50 300 85 230" />
        <path d="M72 360 C95 350 100 335 108 320" />
        <path d="M62 320 C40 310 35 290 38 275" />
      </g>
      {[[85, 228], [108, 318], [38, 273], [78, 262]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="9" ry="14" fill="#a8765a" opacity=".85" transform={`rotate(${i * 25 - 20} ${x} ${y})`} />)}
    </svg>
  );
}

export function BlobFrame({ children, flip = false }: { children: React.ReactNode; flip?: boolean }) {
  return (
    <div className="relative mx-auto h-[400px] w-[320px] sm:h-[460px] sm:w-[380px]">
      <div className={`absolute inset-0 bg-gradient-to-br from-plum-200 to-plum-400 ${flip ? "rounded-[2rem_8rem_2rem_8rem]" : "rounded-[8rem_2rem_8rem_2rem]"}`} />
      <div className="absolute inset-x-4 bottom-0 top-8">{children}</div>
      <Sparkle className="absolute -left-4 top-6 text-plum-600" size={30} />
      <Sparkle className="absolute -right-2 top-0 text-plum-800 [animation-delay:1s]" size={18} />
      <div className={`absolute top-1/2 flex -translate-y-1/2 flex-col gap-3 ${flip ? "-left-9" : "-right-9"}`}>
        {["bg-plum-200", "bg-plum-600", "bg-plum-800"].map((c) => <span key={c} className={`h-6 w-6 rounded-full shadow ${c}`} />)}
      </div>
    </div>
  );
}
