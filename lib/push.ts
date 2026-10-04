"use client";
import { supabase } from "./supabase/client";

// Web push: lets an emergency alert reach a family member's phone even when the app is closed.
export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export async function registerWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try { return await navigator.serviceWorker.register("/sw.js"); } catch { return null; }
}

export async function enablePush(userId: string): Promise<"granted" | "denied" | "unsupported" | "error"> {
  if (!pushSupported() || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  try {
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerWorker());
    if (!reg) return "error";
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) }));
    const j = sub.toJSON();
    const { error } = await supabase().from("push_subscriptions").upsert({ user_id: userId, endpoint: sub.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth }, { onConflict: "endpoint" });
    return error ? "error" : "granted";
  } catch { return "error"; }
}
