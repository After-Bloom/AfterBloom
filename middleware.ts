import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Gatekeeper. Keeps the session fresh and sends people to the right place. It is a convenience layer only:
// the real protection is Row Level Security in the database and the checks inside each API route.
// Never gated: the landing page, the crisis screen, the symptom checker and sign-in/sign-up.
const OPEN = ["/", "/login", "/signup", "/crisis", "/check", "/ask", "/offline"];
const HOME: Record<string, string> = { mother: "/home", family: "/family-view", pro: "/pro", moderator: "/moderate", asha: "/asha", admin: "/admin" };
const AREAS: [string, string[]][] = [
  ["/home", ["mother"]], ["/checkin", ["mother"]], ["/screening", ["mother"]], ["/care", ["mother"]], ["/care-team", ["mother"]], ["/circles", ["mother"]],
  ["/baby", ["mother", "family"]], ["/family-view", ["family"]], ["/family", ["mother"]], ["/report", ["mother"]],
  ["/pro", ["pro"]], ["/asha", ["asha"]], ["/moderate", ["moderator", "admin"]], ["/admin", ["admin"]],
];
const under = (path: string, base: string) => path === base || path.startsWith(base + "/");

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  const role = ((user?.app_metadata as any)?.role as string) ?? "mother";
  const path = req.nextUrl.pathname;
  if (path.startsWith("/api")) return res;

  if (user && (path === "/login" || path === "/signup")) return NextResponse.redirect(new URL(HOME[role] ?? "/home", req.url));
  if (OPEN.some((p) => under(path, p) && (p !== "/" || path === "/"))) return res;

  if (!user) {
    const to = new URL("/login", req.url);
    to.searchParams.set("next", path);
    return NextResponse.redirect(to);
  }
  const area = AREAS.find(([base]) => under(path, base));
  if (area && !area[1].includes(role)) return NextResponse.redirect(new URL(HOME[role] ?? "/home", req.url));
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|sw.js|manifest.webmanifest|icons/|.*\\.(?:png|svg|jpg|jpeg|ico|webp|js|json|txt)$).*)"],
};
