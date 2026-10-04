/* AfterBloom service worker.
   - Keeps the crisis screen and the offline page available with no connection.
   - Caches static assets after the first visit.
   - Shows push notifications. The sender keeps the wording neutral, so what appears on a shared phone's lock screen never reveals health details. */
const V = "ab-v3";
const SHELL = ["/crisis", "/offline", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return; // never cache or intercept the API

  // static files: cache first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/icon.svg") {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put(req, copy)); } return res; })));
    return;
  }

  // pages: network first. /crisis is always kept fresh in the cache so it works offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => {
        if (url.pathname === "/crisis" && res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put(req, copy)); }
        return res;
      }).catch(async () => (await caches.match(req)) || (url.pathname === "/crisis" ? await caches.match("/crisis") : null) || (await caches.match("/offline")))
    );
  }
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = {}; }
  e.waitUntil(self.registration.showNotification(d.title || "AfterBloom", {
    body: d.body || "", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url: d.url || "/" }, tag: "afterbloom", renotify: true,
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
