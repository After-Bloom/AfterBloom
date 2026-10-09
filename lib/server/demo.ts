import "server-only";
import { adminClient, currentUser } from "./../supabase/server";

/**
 * The demo controls (Replay storm, Reset demo, "pretend 20 minutes passed") change shared data, so they are for the demo only:
 * switched off with ENABLE_DEMO=false, and only for an admin or a professional whose profile is a demo account.
 */
export async function demoCaller() {
  if (process.env.ENABLE_DEMO === "false") return null;
  const user = await currentUser();
  if (!user) return null;
  if (user.role === "admin") return user;
  if (user.role === "pro") {
    const { data } = await adminClient().from("profiles").select("is_demo").eq("id", user.id).maybeSingle();
    return data?.is_demo ? user : null;
  }
  return null;
}
