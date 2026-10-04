"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as m from "motion/react-m";
import { Flower2, LogOut, Phone, Home, Stethoscope, CalendarCheck, MessageCircleHeart, LayoutGrid, Menu, X, Moon, Sun } from "lucide-react";
import { StoreProvider, useApp, Role, daysSince } from "@/lib/store";
import { navFor, HOME_BY_ROLE } from "@/lib/features";
import { useTr } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { spring, tap } from "@/lib/motion";
import { MotionProvider } from "./MotionProvider";
import { CrisisScreen } from "./Crisis";
import { LockScreen } from "./LockScreen";
import { LangToggle } from "./LangToggle";

const HOME: Record<Role, string> = HOME_BY_ROLE;
const NAV_KEY = "ab.nav";
// exact match or a real sub-route, so "/check" is not active on "/checkin"
const on = (path: string, href: string) => path === href || path.startsWith(href + "/");

function Inner({ children }: { children: React.ReactNode }) {
  const { s, set, ready, crisis, openCrisis, locked, setLocked } = useApp();
  const path = usePathname();
  const router = useRouter();
  const tr = useTr();
  const { dark, toggle: toggleTheme } = useTheme();
  const [exiting, setExiting] = useState(false);
  const [nav, setNav] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAV_KEY);
      setNav(saved ? saved === "1" : window.innerWidth >= 1024);
    } catch { setNav(window.innerWidth >= 1024); }
  }, []);
  useEffect(() => { if (typeof window !== "undefined" && window.innerWidth < 1024) setNav(false); }, [path]);
  useEffect(() => {
    if (!nav) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && window.innerWidth < 1024) setNav(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);
  const toggle = () => setNav((v) => { try { localStorage.setItem(NAV_KEY, v ? "0" : "1"); } catch {} return !v; });

  // The crisis route is standalone: no shell, no data fetching, no motion.
  if (path === "/crisis") return <CrisisScreen standalone />;
  // The landing page brings its own header and animation; the app chrome starts after it.
  if (path === "/") return <>{children}{crisis && <CrisisScreen />}{locked && !exiting && <LockScreen />}</>;

  const switchRole = (r: Role) => { set((p) => ({ ...p, role: r })); router.push(HOME[r]); };
  const quickExit = () => { setExiting(true); if (s.pin) setLocked(true); window.location.replace("https://www.google.com/search?q=weather"); };
  const items = navFor(s.role);
  const bottom = s.role === "mother"
    ? [{ href: "/home", label: tr("Home"), icon: Home }, { href: "/check", label: tr("Symptoms"), icon: Stethoscope }, { href: "/checkin", label: tr("Check-in"), icon: CalendarCheck }, { href: "/circles", label: tr("Circles"), icon: MessageCircleHeart }, { href: "/more", label: tr("More"), icon: LayoutGrid }]
    : [{ href: HOME[s.role], label: tr("Home"), icon: Home }, { href: "/more", label: tr("More"), icon: LayoutGrid }];
  const RoleSelect = (
    <select aria-label={tr("View as")} value={s.role} onChange={(e) => switchRole(e.target.value as Role)} className="min-h-[44px] rounded-full border border-line bg-surface px-3 text-sm font-semibold text-plum-800">
      <option value="mother">{tr("View: Mother")}</option><option value="family">{tr("View: Family")}</option><option value="pro">{tr("View: Professional")}</option>
    </select>
  );
  const ThemeBtn = (cls: string) => (
    <button onClick={toggleTheme} aria-label={dark ? tr("Switch to light mode") : tr("Switch to dark mode")} aria-pressed={dark} className={`flex h-11 w-11 items-center justify-center rounded-full border border-line text-plum-800 transition hover:bg-plum-100 active:scale-90 ${cls}`}>
      {dark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  );

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-full focus:bg-primary-fill focus:px-4 focus:py-2 focus:text-primary-on">{tr("Skip to content")}</a>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-5">
          <button onClick={toggle} aria-label={nav ? tr("Close menu") : tr("Open menu")} aria-expanded={nav} aria-controls="side-nav" className="relative hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-plum-800 transition hover:bg-plum-100 active:scale-90 sm:flex">
            <Menu className={`absolute h-6 w-6 transition-all duration-300 ${nav ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
            <X className={`absolute h-6 w-6 transition-all duration-300 ${nav ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
          </button>
          <Link href={HOME[s.role]} className="flex min-w-0 items-center gap-1.5 font-serif text-xl font-bold text-plum-800 sm:text-2xl"><Flower2 className="h-6 w-6 shrink-0 text-primary sm:h-7 sm:w-7" aria-hidden /><span className="truncate">AfterBloom</span></Link>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="hidden md:block">{RoleSelect}</div>
            {ThemeBtn("hidden sm:flex")}
            <LangToggle />
            <button onClick={quickExit} aria-label={tr("Quick exit")} title={tr("Quick exit")} className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold text-plum-800 transition hover:bg-plum-100 active:scale-90"><LogOut className="h-5 w-5" aria-hidden /><span className="hidden lg:inline">{tr("Quick exit")}</span></button>
            <button onClick={() => openCrisis({ kind: "selfharm", reason: "" })} aria-label={tr("Need help now")} className="flex h-11 items-center gap-1.5 rounded-full bg-red-600 px-3.5 text-sm font-bold text-white shadow-md shadow-red-600/25 transition hover:bg-red-700 active:scale-95"><Phone className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">{tr("Need help now")}</span><span className="sm:hidden">SOS</span></button>
          </div>
        </div>
      </header>

      <div onClick={toggle} aria-hidden className={`fixed inset-0 top-16 z-20 bg-plum-900/30 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${nav ? "opacity-100" : "pointer-events-none opacity-0"}`} />

      <aside id="side-nav" aria-label={tr("Menu")} {...(nav ? {} : { inert: "" as any })} className={`fixed bottom-0 left-0 top-16 z-30 flex w-72 flex-col overflow-y-auto border-r border-line bg-surface shadow-xl shadow-primary/5 transition-transform duration-300 ease-out ${nav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="m-4 flex items-center gap-3 rounded-card bg-gradient-to-br from-plum-100 to-plum-200 p-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fill text-lg font-bold text-primary-on">{s.role === "pro" ? "A" : s.role === "family" ? tr("Rohan")[0] : tr(s.mother.name)[0]}</span>
          <div className="min-w-0"><div className="truncate font-bold text-plum-800">{s.role === "pro" ? tr("Dr. Ananya Rao") : s.role === "family" ? tr("Rohan") : tr(s.mother.name)}</div><div className="text-xs text-ink-muted">{s.role === "mother" ? tr("Day {n} postpartum", { n: daysSince(s.mother.birth) }) : s.role === "family" ? tr("Family circle") : tr("Sample professional")}</div></div>
        </div>
        <nav className="flex-1 space-y-1 px-3 pb-4">
          <NavLink href={HOME[s.role]} icon={Home} label={tr("Home")} active={path === HOME[s.role]} i={0} open={nav} />
          {items.filter((f) => f.href !== HOME[s.role]).map((f, i) => <NavLink key={f.href} href={f.href} icon={f.icon} label={tr(f.title)} active={on(path, f.href)} i={i + 1} open={nav} />)}
        </nav>
        <div className="space-y-3 border-t border-line p-4 text-xs text-ink-muted">
          <div className="flex items-center gap-2 md:hidden">{RoleSelect}{ThemeBtn("sm:hidden")}</div>
          <p>{tr("Free help 24×7:")} {tr("Tele-MANAS")} <a className="font-bold underline" href="tel:14416">14416</a></p>
        </div>
      </aside>

      <main id="main" tabIndex={-1} className={`min-h-[calc(100dvh-4rem)] transition-[padding] duration-300 ease-out ${nav ? "lg:pl-72" : ""}`}>
        <div key={path} className="animate-fadeUp px-4 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-10 md:py-8 lg:pb-12">
          {ready ? children : <p className="text-ink-muted">{tr("Loading…")}</p>}
        </div>
      </main>

      <nav aria-label={tr("Main")} className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {bottom.map((b) => {
          const active = on(path, b.href);
          return (
            <Link key={b.href} href={b.href} aria-current={active ? "page" : undefined} className={`relative flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold leading-tight transition ${active ? "text-primary" : "text-ink-muted"}`}>
              {active && <m.span layoutId="bottom-nav-pill" transition={spring.snappy} className="absolute inset-x-3 top-1.5 -z-0 h-8 rounded-full bg-plum-100" />}
              <m.span whileTap={tap} className="relative z-10"><b.icon className="h-5 w-5" aria-hidden /></m.span>
              <span className="relative z-10 max-w-full truncate">{b.label}</span>
            </Link>
          );
        })}
      </nav>

      {crisis && <CrisisScreen />}
      {locked && !exiting && <LockScreen />}
    </>
  );
}

function NavLink({ href, icon: Icon, label, active, i, open }: { href: string; icon: any; label: string; active: boolean; i: number; open: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} style={{ transitionDelay: open ? `${i * 30}ms` : "0ms" }} className={`flex min-h-[44px] items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold transition-all duration-300 ${open ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"} ${active ? "bg-primary-fill text-primary-on shadow-md shadow-primary/25" : "text-plum-900 hover:bg-plum-100 hover:pl-5"}`}>
      <Icon className="h-5 w-5 shrink-0" aria-hidden /><span className="min-w-0">{label}</span>
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return <MotionProvider><StoreProvider><Inner>{children}</Inner></StoreProvider></MotionProvider>;
}
