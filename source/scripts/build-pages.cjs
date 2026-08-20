"use strict";

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { resolve } = require("node:path");

const ROOT = resolve(__dirname, "..");
const SOURCE = resolve(ROOT, "build", "pwa");
const OUTPUT = resolve(ROOT, "build", "site");
const ICON_OUTPUT = resolve(OUTPUT, "icons");
const INSTALL_OUTPUT = resolve(OUTPUT, "install");

const SOURCE_DICTIONARY_SHA256 =
  "5bc7b9aa5cfe9d43dccc66d7d9dcd60f4f29cb9f5bd59954f5ca462e227c3d4d";
const FULL_V22_SHA256 =
  "aeffe9a5a88151e8f65c0461b4a3279b7972d3cab443d235aaf23d91cf6c0020";
const PUBLIC_URL = "https://thumbking-btc.github.io/bip39-dictionary/";
const PRIVATE_ACCOUNT_PATTERN = new RegExp(["qozm", "515"].join(""), "i");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function replaceExactlyOnce(source, target, replacement, label) {
  const first = source.indexOf(target);
  const last = source.lastIndexOf(target);
  assert.notEqual(first, -1, `${label}: replacement target missing`);
  assert.equal(first, last, `${label}: replacement target must occur once`);
  return source.slice(0, first) + replacement + source.slice(first + target.length);
}

rmSync(OUTPUT, { recursive: true, force: true });
mkdirSync(ICON_OUTPUT, { recursive: true });
mkdirSync(INSTALL_OUTPUT, { recursive: true });

const fullV22 = readFileSync(
  resolve(ROOT, "full", "BIP39_Dictionary_Full_v2.2.html"),
);
assert.equal(sha256(fullV22), FULL_V22_SHA256, "Full v2.2 source changed");

const sourceDictionaryBuffer = readFileSync(resolve(SOURCE, "dictionary.html"));
assert.equal(
  sha256(sourceDictionaryBuffer),
  SOURCE_DICTIONARY_SHA256,
  "verified PWA dictionary source changed",
);

let index = sourceDictionaryBuffer.toString("utf8");
for (const [from, to, label] of [
  ['href="/manifest.webmanifest"', 'href="./manifest.webmanifest"', "manifest"],
  [
    'href="/icons/icon-192.png"',
    'href="./icons/icon-192.png?v=bitcoin2"',
    "icon",
  ],
  [
    'href="/icons/apple-touch-icon.png"',
    'href="./icons/apple-touch-icon.png?v=bitcoin2"',
    "apple icon",
  ],
  ['href="/pwa.css"', 'href="./pwa.css"', "PWA stylesheet"],
  ['src="/pwa-register.js"', 'src="./pwa-register.js"', "PWA registration"],
]) {
  index = replaceExactlyOnce(index, from, to, label);
}

const socialMetadata = `  <!-- BIP39_GITHUB_PAGES_META_V1 -->
  <link rel="canonical" href="${PUBLIC_URL}">
  <meta name="referrer" content="no-referrer">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ko_KR">
  <meta property="og:title" content="BIP39 단어 학습 사전">
  <meta property="og:description" content="BIP39 2,048개 단어를 한국어로 공부하는 설치형 오프라인 영한사전">
  <meta property="og:url" content="${PUBLIC_URL}">
  <meta property="og:image" content="${PUBLIC_URL}og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="BIP39 단어 학습 사전">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="BIP39 단어 학습 사전">
  <meta name="twitter:description" content="BIP39 2,048개 단어를 한국어로 공부하는 설치형 오프라인 영한사전">
  <meta name="twitter:image" content="${PUBLIC_URL}og.png">
`;
index = replaceExactlyOnce(index, "</head>", `${socialMetadata}</head>`, "social metadata");
assert.doesNotMatch(index, PRIVATE_ACCOUNT_PATTERN, "private account name leaked into index");
const indexBuffer = Buffer.from(index, "utf8");
const indexHash = sha256(indexBuffer);
writeFileSync(resolve(OUTPUT, "index.html"), indexBuffer);

const manifest = JSON.parse(
  readFileSync(resolve(SOURCE, "manifest.webmanifest"), "utf8"),
);
manifest.id = "./";
manifest.start_url = "./";
manifest.scope = "./";
manifest.icons = manifest.icons.map((icon) => ({
  ...icon,
  src: `./${icon.src.replace(/^\//, "")}?v=bitcoin2`,
}));
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
writeFileSync(resolve(OUTPUT, "manifest.webmanifest"), manifestText, "utf8");

let registration = readFileSync(resolve(SOURCE, "pwa-register.js"), "utf8");
registration = replaceExactlyOnce(
  registration,
  '.register("/sw.js", { scope: "/", updateViaCache: "none" })',
  '.register("./sw.js", { scope: "./", updateViaCache: "none" })',
  "service worker registration",
);
assert.doesNotMatch(registration, PRIVATE_ACCOUNT_PATTERN);
writeFileSync(resolve(OUTPUT, "pwa-register.js"), registration, "utf8");

const iconFiles = [
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png",
];
const installFiles = ["iphone-guide-v1.png", "android-guide-v1.png"];
const cacheFingerprint = sha256(
  Buffer.concat([
    indexBuffer,
    Buffer.from(manifestText, "utf8"),
    Buffer.from(registration, "utf8"),
    readFileSync(resolve(SOURCE, "pwa.css")),
    readFileSync(resolve(SOURCE, "install.html")),
    ...installFiles.map((file) => readFileSync(resolve(SOURCE, "install", file))),
    ...iconFiles.map((file) => readFileSync(resolve(SOURCE, "icons", file))),
  ]),
);
const cacheVersion = `v2.2-${cacheFingerprint.slice(0, 12)}`;
const serviceWorker = `"use strict";

const CACHE_PREFIX = "thumbking-btc-bip39-dictionary-pwa-";
const CACHE_NAME = \`\${CACHE_PREFIX}${cacheVersion}\`;
const SCOPE_URL = new URL(self.registration.scope);
const scopedUrl = (path) => new URL(path, SCOPE_URL).href;
const APP_SHELL_URL = scopedUrl("./");
const WORKER_PATH = new URL(self.location.href).pathname;
const PRECACHE_URLS = Object.freeze([
  APP_SHELL_URL,
  scopedUrl("manifest.webmanifest"),
  scopedUrl("pwa.css"),
  scopedUrl("pwa-register.js"),
  scopedUrl("install.html"),
  scopedUrl("install/iphone-guide-v1.png"),
  scopedUrl("install/android-guide-v1.png"),
  scopedUrl("icons/icon-192.png?v=bitcoin2"),
  scopedUrl("icons/icon-512.png?v=bitcoin2"),
  scopedUrl("icons/icon-maskable-512.png?v=bitcoin2"),
  scopedUrl("icons/apple-touch-icon.png?v=bitcoin2"),
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
    if (PRECACHE_PATHS.has(requestUrl.pathname)) {
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
`;
writeFileSync(resolve(OUTPUT, "sw.js"), serviceWorker, "utf8");

for (const file of ["pwa.css", "og.png", "install.html"]) {
  copyFileSync(resolve(SOURCE, file), resolve(OUTPUT, file));
}
for (const file of iconFiles) {
  copyFileSync(resolve(SOURCE, "icons", file), resolve(ICON_OUTPUT, file));
}
for (const file of installFiles) {
  copyFileSync(resolve(SOURCE, "install", file), resolve(INSTALL_OUTPUT, file));
}

writeFileSync(resolve(OUTPUT, ".nojekyll"), "", "utf8");

console.log(
  JSON.stringify(
    {
      output: OUTPUT,
      publicUrl: PUBLIC_URL,
      sourceDictionarySha256: SOURCE_DICTIONARY_SHA256,
      indexSha256: indexHash,
      cacheName: `thumbking-btc-bip39-dictionary-pwa-${cacheVersion}`,
    },
    null,
    2,
  ),
);
