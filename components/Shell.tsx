"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Flower2, LogOut, Phone, Home, Stethoscope, CalendarCheck, MessageCircleHeart, LayoutGrid, Menu, X } from "lucide-react";
import { StoreProvider, useApp, Role, daysSince } from "@/lib/store";
import { navFor } from "@/lib/features";
import { useTr } from "@/lib/i18n";
import { CrisisScreen } from "./Crisis";
import { LockScreen } from "./LockScreen";

const HOME: Record<Role, string> = { mother: "/", family: "/family-view", pro: "/pro" };
const NAV_KEY = "ab.nav";

function Inner({ children }: { children: React.ReactNode }) {
  const { s, set, ready, crisis, openCrisis, locked, setLocked } = useApp();
  const path = usePathname();
  const router = useRouter();
  const tr = useTr();
  const [exiting, setExiting] = useState(false);
  const [nav, setNav] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAV_KEY);
      setNav(saved ? saved === "1" : window.innerWidth >= 1024);
    } catch { setNav(window.innerWidth >= 1024); }
  }, []);
  useEffect(() => { if (typeof window !== "undefined" && window.innerWidth < 1024) setNav(false); }, [path]);
  const toggle = () => setNav((v) => { try { localStorage.setItem(NAV_KEY, v ? "0" : "1"); } catch {} return !v; });

  if (path === "/crisis") return <CrisisScreen standalone />;

  const switchRole = (r: Role) => { set((p) => ({ ...p, role: r })); router.push(HOME[r]); };
  const quickExit = () => { setExiting(true); if (s.pin) setLocked(true); window.location.replace("https://www.google.com/search?q=weather"); };
  const items = navFor(s.role);
  const bottom = s.role === "mother"
    ? [{ href: "/", label: tr("Home"), icon: Home }, { href: "/check", label: tr("Symptoms"), icon: Stethoscope }, { href: "/checkin", label: tr("Check-in"), icon: CalendarCheck }, { href: "/circles", label: tr("Circles"), icon: MessageCircleHeart }, { href: "/more", label: tr("More"), icon: LayoutGrid }]
    : [{ href: HOME[s.role], label: tr("Home"), icon: Home }, { href: "/more", label: tr("More"), icon: LayoutGrid }];
  const RoleSelect = (
    <select aria-label={tr("View as")} value={s.role} onChange={(e) => switchRole(e.target.value as Role)} className="rounded-full border border-plum-200 bg-white px-3 py-2 text-sm font-semibold text-plum-800 outline-none focus:ring-4 focus:ring-plum-200/70">
      <option value="mother">{tr("View: Mother")}</option><option value="family">{tr("View: Family")}</option><option value="pro">{tr("View: Professional")}</option>
    </select>
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-plum-100 bg-white/85 backdrop-blur-md">
        <div className="flex h-16 items-center gap-3 px-3 sm:px-5">
          <button onClick={toggle} aria-label={nav ? tr("Close menu") : tr("Open menu")} aria-expanded={nav} className="relative flex h-11 w-11 items-center justify-center rounded-full text-plum-800 transition hover:bg-plum-100 active:scale-90">
            <Menu className={`absolute h-6 w-6 transition-all duration-300 ${nav ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
            <X className={`absolute h-6 w-6 transition-all duration-300 ${nav ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
          </button>
          <Link href={HOME[s.role]} className="flex items-center gap-2 font-serif text-2xl font-bold text-plum-800"><Flower2 className="h-7 w-7 text-plum-600" />AfterBloom</Link>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block">{RoleSelect}</div>
            <button onClick={() => set((p) => ({ ...p, lang: p.lang === "en" ? "hi" : "en" }))} className="rounded-full border border-plum-200 px-3.5 py-2 text-sm font-bold text-plum-800 transition hover:bg-plum-100">{s.lang === "en" ? "हिं" : "EN"}</button>
            <button onClick={quickExit} title={tr("Quick exit")} className="hidden items-center gap-1.5 rounded-full border border-plum-200 px-3.5 py-2 text-sm font-semibold text-plum-800 transition hover:bg-plum-100 md:flex"><LogOut className="h-4 w-4" />{tr("Quick exit")}</button>
            <button onClick={() => openCrisis({ kind: "selfharm", reason: "" })} className="flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-red-600/25 transition hover:bg-red-700 active:scale-95"><Phone className="h-4 w-4" /><span className="hidden sm:inline">{tr("Need help now")}</span><span className="sm:hidden">SOS</span></button>
          </div>
        </div>
      </header>

      {/* dim backdrop on small screens */}
      <div onClick={toggle} className={`fixed inset-0 top-16 z-20 bg-plum-900/30 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${nav ? "opacity-100" : "pointer-events-none opacity-0"}`} />

      {/* sidebar: pinned to the far left edge, slides in and out */}
      <aside aria-hidden={!nav} className={`fixed bottom-0 left-0 top-16 z-30 flex w-72 flex-col overflow-y-auto border-r border-plum-100 bg-white shadow-xl shadow-plum-700/5 transition-transform duration-300 ease-out ${nav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="m-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-plum-100 to-plum-200 p-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-plum-700 text-lg font-bold text-white">{s.role === "pro" ? tr("Dr. Ananya Rao").replace("डॉ. ","")[0] : s.role === "family" ? tr("Rohan")[0] : tr(s.mother.name)[0]}</span>
          <div className="min-w-0"><div className="truncate font-bold text-plum-800">{s.role === "pro" ? tr("Dr. Ananya Rao") : s.role === "family" ? tr("Rohan") : tr(s.mother.name)}</div><div className="text-xs text-plum-800/70">{s.role === "mother" ? tr("Day {n} postpartum", { n: daysSince(s.mother.birth) }) : s.role === "family" ? tr("Family circle") : tr("Sample professional")}</div></div>
        </div>
        <nav className="flex-1 space-y-1 px-3 pb-4">
          <NavLink href={HOME[s.role]} icon={Home} label={tr("Home")} active={path === HOME[s.role]} i={0} open={nav} />
          {items.filter((f) => f.href !== HOME[s.role]).map((f, i) => <NavLink key={f.href} href={f.href} icon={f.icon} label={tr(f.title)} active={path.startsWith(f.href)} i={i + 1} open={nav} />)}
        </nav>
        <div className="space-y-2 border-t border-plum-100 p-4 text-xs text-plum-900/60">
          <div className="sm:hidden">{RoleSelect}</div>
          <button onClick={quickExit} className="flex items-center gap-2 font-semibold text-plum-800 md:hidden"><LogOut className="h-4 w-4" />{tr("Quick exit")}</button>
          <p>{tr("Free help 24×7:")} {tr("Tele-MANAS")} <a className="font-bold underline" href="tel:14416">14416</a></p>
        </div>
      </aside>

      <main className={`min-h-[calc(100vh-4rem)] transition-[padding] duration-300 ease-out ${nav ? "lg:pl-72" : ""}`}>
        <div key={path} className="animate-fadeUp px-4 py-6 pb-28 md:px-10 md:py-8 lg:pb-12">
          {ready ? children : <p className="text-plum-700">{tr("Loading…")}</p>}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-plum-100 bg-white/95 backdrop-blur lg:hidden">
        {bottom.map((b) => {
          const active = b.href === "/" ? path === "/" : path.startsWith(b.href);
          return <Link key={b.href} href={b.href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition ${active ? "text-plum-700" : "text-gray-500"}`}><b.icon className={`h-5 w-5 transition ${active ? "scale-110" : ""}`} />{b.label}</Link>;
        })}
      </nav>

      {crisis && <CrisisScreen />}
      {locked && !exiting && <LockScreen />}
    </>
  );
}

function NavLink({ href, icon: Icon, label, active, i, open }: { href: string; icon: any; label: string; active: boolean; i: number; open: boolean }) {
  return (
    <Link href={href} style={{ transitionDelay: open ? `${i * 30}ms` : "0ms" }} className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold transition-all duration-300 ${open ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"} ${active ? "bg-plum-700 text-white shadow-md shadow-plum-700/25" : "text-plum-900 hover:bg-plum-100 hover:pl-5"}`}>
      <Icon className="h-5 w-5 shrink-0" />{label}
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return <StoreProvider><Inner>{children}</Inner></StoreProvider>;
}
