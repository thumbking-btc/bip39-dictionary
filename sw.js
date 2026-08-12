"use strict";

const CACHE_PREFIX = "thumbking-btc-bip39-dictionary-pwa-";
const CACHE_NAME = `${CACHE_PREFIX}v2.1-70c8e7172036`;
const SCOPE_URL = new URL(self.registration.scope);
const scopedUrl = (path) => new URL(path, SCOPE_URL).href;
const APP_SHELL_URL = scopedUrl("./");
const WORKER_PATH = new URL(self.location.href).pathname;
const PRECACHE_URLS = Object.freeze([
  APP_SHELL_URL,
  scopedUrl("manifest.webmanifest"),
  scopedUrl("pwa.css"),
  scopedUrl("pwa-register.js"),
  scopedUrl("icons/icon-192.png"),
  scopedUrl("icons/icon-512.png"),
  scopedUrl("icons/icon-maskable-512.png"),
  scopedUrl("icons/apple-touch-icon.png"),
]);
const PRECACHE_PATHS = new Set(
  PRECACHE_URLS.map((url) => new URL(url).pathname),
);

async function cacheIsReady() {
  const cache = await caches.open(CACHE_NAME);
  const matches = await Promise.all(
    PRECACHE_URLS.map((url) => cache.match(url, { ignoreSearch: true })),
  );
  return matches.every(Boolean);
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of clients) client.postMessage(message);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
      await notifyClients({
        type: "CACHE_STATUS",
        ready: await cacheIsReady(),
        version: CACHE_NAME,
      });
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
    return;
  }

  if (event.data?.type === "GET_CACHE_STATUS") {
    event.waitUntil(
      (async () => {
        const message = {
          type: "CACHE_STATUS",
          ready: await cacheIsReady(),
          version: CACHE_NAME,
        };
        if (event.source && "postMessage" in event.source) {
          event.source.postMessage(message);
        }
      })(),
    );
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: false });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const requestUrl = new URL(request.url);
    if (
      response.ok &&
      response.type === "basic" &&
      requestUrl.pathname !== WORKER_PATH
    ) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (request.mode === "navigate") {
      const fallback = await cache.match(APP_SHELL_URL);
      if (fallback) return fallback;
    }
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    if (requestUrl.pathname === new URL(APP_SHELL_URL).pathname) {
      event.respondWith(cacheFirst(request));
      return;
    }
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return cache.match(APP_SHELL_URL);
      }),
    );
    return;
  }

  if (PRECACHE_PATHS.has(requestUrl.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
