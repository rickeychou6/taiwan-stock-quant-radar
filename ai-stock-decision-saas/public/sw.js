const CACHE_NAME = "stock-radar-shell-v1";
const APP_SHELL = ["/", "/recommendations", "/watchlist", "/icon.svg"];
self.addEventListener("install", (event) => { event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))); self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))); self.clients.claim(); });
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).pathname.startsWith("/api/")) return;
  event.respondWith(fetch(event.request).then((response) => { if (response.ok && response.type === "basic") { const copy = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)); } return response; }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))));
});
self.addEventListener("push", (event) => {
  let payload = { title: "台股雷達提醒", body: "有新的推薦或風險訊號", url: "/watchlist" };
  try { payload = { ...payload, ...event.data.json() }; } catch (_) {}
  event.waitUntil(self.registration.showNotification(payload.title, { body: payload.body, icon: "/icon.svg", badge: "/icon.svg", tag: payload.tag || "stock-radar-alert", data: { url: payload.url } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/watchlist";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => { const existing = clients.find((client) => new URL(client.url).pathname === url); return existing ? existing.focus() : self.clients.openWindow(url); }));
});
