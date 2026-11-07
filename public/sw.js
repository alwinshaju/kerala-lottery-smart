const C = "klhub-v2";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Network-first with cache fallback: pages, assets AND /api/results, so the last results open offline.
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  if (u.pathname.startsWith("/api/") && !u.pathname.startsWith("/api/results")) return;
  const key = u.pathname.startsWith("/api/results") ? new Request(u.origin + "/api/results") : r; // ignore ?v= in cache key
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(C).then((c) => c.put(key, cp)); } return res; })
    .catch(() => caches.match(key)));
});

self.addEventListener("push", (e) => {
  let d = { title: "Kerala Lottery Result", body: "A new result is out.", url: "/" };
  try { d = { ...d, ...e.data.json() }; } catch {}
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: "/icon.svg", badge: "/icon.svg", data: { url: d.url }, tag: "result" }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow(e.notification.data?.url || "/"))));
});
