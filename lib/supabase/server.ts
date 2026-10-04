import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Next.js caches server-side fetch calls by default, which would replay old Supabase responses (even a deleted user).
// Every server-side Supabase call must go straight to the network.
const noStore: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });

/** The signed-in person's own client (their cookies, their permissions). Use for anything done on their behalf. */
export function userClient() {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { fetch: noStore },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* called from a server component */ } },
    },
  });
}

/** Full-access client that bypasses Row Level Security. Server routes only, and only after checking who is asking. */
export function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: noStore } });
}

/** Verified current user (asks the auth server, so it cannot be spoofed with a stale cookie). */
export async function currentUser() {
  const sb = userClient();
  const { data } = await sb.auth.getUser();
  const u = data.user;
  if (!u) return null;
  return { id: u.id, email: u.email ?? "", role: ((u.app_metadata as any)?.role ?? "mother") as Role, name: (u.user_metadata as any)?.name ?? "" };
}
export type Role = "mother" | "family" | "pro" | "moderator" | "asha" | "admin";
