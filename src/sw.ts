/// <reference lib="WebWorker" />
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope;

// Build-time precache manifest injected by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();
void self.skipWaiting();

// Never cache API/WS traffic to avoid stale auth or stale live game state.
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws/"),
  new NetworkOnly(),
);

// Keep navigations resilient while still preferring fresh HTML.
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "draught-pages-v1",
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  }),
);

registerRoute(
  ({ request }) =>
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "worker",
  new StaleWhileRevalidate({
    cacheName: "draught-static-v1",
  }),
);

registerRoute(
  ({ request }) =>
    request.destination === "font" || request.destination === "manifest",
  new CacheFirst({
    cacheName: "draught-assets-v1",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 24,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  }),
);

registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "draught-images-v1",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 120,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  }),
);

self.addEventListener("push", (event) => {
  let payload: {
    title?: string;
    body?: string;
    icon?: string;
    data?: Record<string, unknown>;
  } = {};

  try {
    payload = event.data ? (event.data.json() as typeof payload) : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Draught";
  const body = payload.body || "";
  const icon = payload.icon || "/Game-Logo.png";
  const data = payload.data || {};

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      data,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const clickData = event.notification.data as { url?: string } | undefined;
  const targetPath = clickData?.url || "/home";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const c of wins) {
        if ("focus" in c) {
          void c.focus();
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetPath);
      return undefined;
    }),
  );
});
