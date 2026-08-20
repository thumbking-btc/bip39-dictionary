"use strict";

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync, readdirSync, statSync } = require("node:fs");
const { resolve } = require("node:path");
const { gunzipSync } = require("node:zlib");

const ROOT = resolve(__dirname, "..");
const OUTPUT = resolve(ROOT, "build", "site");
const PUBLIC_URL = "https://thumbking-btc.github.io/bip39-dictionary/";
const EXPECTED_FULL_V22_SHA256 =
  "aeffe9a5a88151e8f65c0461b4a3279b7972d3cab443d235aaf23d91cf6c0020";
const EXPECTED_PWA_SOURCE_SHA256 =
  "5bc7b9aa5cfe9d43dccc66d7d9dcd60f4f29cb9f5bd59954f5ca462e227c3d4d";
const PRIVATE_ACCOUNT_PATTERN = new RegExp(["qozm", "515"].join(""), "i");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readText(name) {
  return readFileSync(resolve(OUTPUT, name), "utf8");
}

assert.equal(
  sha256(readFileSync(resolve(ROOT, "full", "BIP39_Dictionary_Full_v2.2.html"))),
  EXPECTED_FULL_V22_SHA256,
  "Full v2.2 source changed",
);
assert.equal(
  sha256(readFileSync(resolve(ROOT, "build", "pwa", "dictionary.html"))),
  EXPECTED_PWA_SOURCE_SHA256,
  "verified PWA source changed",
);

const index = readText("index.html");
const manifest = JSON.parse(readText("manifest.webmanifest"));
const registration = readText("pwa-register.js");
const worker = readText("sw.js");
const css = readText("pwa.css");
const installPage = readText("install.html");

assert.match(index, /<meta name="bip39-entry-count" content="2048">/);
assert.match(
  index,
  /<meta name="dictionary-content-hash" content="d72b6deaf89de11c22dc621a229ad99350b41bf0d4f7ae64691237fd83a1b761">/,
);
assert.match(
  index,
  /<meta name="pwa-source-sha256" content="aeffe9a5a88151e8f65c0461b4a3279b7972d3cab443d235aaf23d91cf6c0020">/,
);
assert.match(index, /<meta name="bip39-release-version" content="2\.2">/);
assert.match(index, /BIP39 Dictionary Full v2\.2/);
assert.match(index, /<script id="full-v211-application">/);
assert.match(index, /window\.__BIP39_FULL_V211/);
assert.match(index, /<style id="full-v212-layout-patch">[\s\S]*?#search-security-message,[\s\S]*?\.toolbar[\s\S]*?flex:\s*0\s+0\s+auto/);
assert.match(index, /id="support-lightning-address"[^>]*>thumbking@oksu\.su<\/code>/);
assert.match(index, /id="support-copy-button"[^>]*aria-describedby="support-copy-status"/);
assert.match(index, /id="support-copy-status"[^>]*role="status"[^>]*aria-live="polite"/);
assert.match(index, /navigator\.clipboard\.writeText\(address\)/);
assert.match(index, /document\.execCommand\("copy"\) === true/);
assert.match(index, /if \(!copied\) copied = copySupportAddressWithExecCommand\(address\)/);
assert.match(index, /if \(copied\) \{[\s\S]*?"라이트닝 주소를 복사했습니다\."[\s\S]*?\} else \{[\s\S]*?selectVisibleSupportAddress\(\)[\s\S]*?"manual"/);
assert.match(index, /<h3 class="grammar-group-title">기본 표지<\/h3>/);
assert.match(index, /<h3 class="grammar-group-title">위치·결합 표지<\/h3>/);
assert.match(index, /<link rel="manifest" href="\.\/manifest\.webmanifest">/);
assert.match(index, /<script src="\.\/pwa-register\.js" defer><\/script>/);
assert.match(index, new RegExp(`<link rel="canonical" href="${PUBLIC_URL}">`));
assert.match(index, new RegExp(`<meta property="og:url" content="${PUBLIC_URL}">`));
assert.match(index, /id="pwa-status-panel"/);
assert.match(index, /id="pwa-install-dialog"/);
assert.match(index, /id="pwa-install-confirm"/);
assert.match(index, /id="pwa-install-guide"/);
assert.match(index, /id="pwa-guide-install-entry"[^>]*href="\.\/install\.html"/);
assert.match(index, /BIP39 사전을 앱으로 설치할까요\?/);
assert.match(index, /function playTTS\(word, locale\)/);
assert.match(index, /window\.speechSynthesis\.getVoices\(\)/);
assert.doesNotMatch(index, /href="\/(?:manifest\.webmanifest|icons\/|pwa\.css)/);
assert.doesNotMatch(index, /src="\/pwa-register\.js"/);

const listIndex = index.match(
  /<script id="dictionary-list-index" type="application\/json">([^<]+)<\/script>/,
);
assert.ok(listIndex, "dictionary-list-index missing");
assert.equal(JSON.parse(listIndex[1]).length, 2048);

const dictionaryPayload = index.match(
  /<script id="dictionary-payload" type="application\/octet-stream">([^<]+)<\/script>/,
);
assert.ok(dictionaryPayload, "dictionary-payload missing");
assert.equal(
  sha256(Buffer.from(dictionaryPayload[1], "utf8")),
  "603c4d26e35203a10e9e459b7fe8d129f63855741f46afb2a68f37ae1a8b5cf9",
  "dictionary payload bytes changed",
);
const dictionaryEntries = JSON.parse(
  gunzipSync(Buffer.from(dictionaryPayload[1], "base64")).toString("utf8"),
);
assert.equal(dictionaryEntries.length, 2048);
assert.equal(
  dictionaryEntries.reduce(
    (total, entry) =>
      total + (entry.h.match(/class=["']meaning-block["']/g) ?? []).length,
    0,
  ),
  12709,
);

assert.equal(manifest.id, "./");
assert.equal(manifest.start_url, "./");
assert.equal(manifest.scope, "./");
assert.equal(manifest.display, "standalone");
assert.ok(
  manifest.icons.every(
    (icon) => icon.src.startsWith("./icons/") && icon.src.endsWith("?v=bitcoin2"),
  ),
);

assert.match(
  registration,
  /serviceWorker\s*\.register\("\.\/sw\.js", \{ scope: "\.\/", updateViaCache: "none" \}\)/,
);
assert.match(registration, /bip39_pwa_install_invite_until_v2/);
assert.match(registration, /showInstallInvite\("native", \{ automatic: true \}\)/);
assert.match(registration, /scheduleManualInstallInvite\(\)/);
assert.match(registration, /isInAppBrowser\(\)/);
assert.match(registration, /오프라인 준비됨/);
assert.match(registration, /오프라인 사용 중/);
assert.match(worker, /const SCOPE_URL = new URL\(self\.registration\.scope\)/);
assert.match(worker, /const APP_SHELL_URL = scopedUrl\("\.\/"\)/);
assert.match(worker, /thumbking-btc-bip39-dictionary-pwa-/);
const expectedCacheFingerprint = sha256(
  Buffer.concat([
    Buffer.from(index, "utf8"),
    Buffer.from(JSON.stringify(manifest, null, 2) + "\n", "utf8"),
    Buffer.from(registration, "utf8"),
    Buffer.from(css, "utf8"),
    Buffer.from(installPage, "utf8"),
    readFileSync(resolve(OUTPUT, "install", "iphone-guide-v1.png")),
    readFileSync(resolve(OUTPUT, "install", "android-guide-v1.png")),
    readFileSync(resolve(OUTPUT, "icons", "icon-192.png")),
    readFileSync(resolve(OUTPUT, "icons", "icon-512.png")),
    readFileSync(resolve(OUTPUT, "icons", "icon-maskable-512.png")),
    readFileSync(resolve(OUTPUT, "icons", "apple-touch-icon.png")),
  ]),
).slice(0, 12);
const expectedCacheLine =
  'const CACHE_NAME = `${CACHE_PREFIX}v2.2-' + expectedCacheFingerprint + '`;';
assert.equal(worker.includes(expectedCacheLine), true, "cache fingerprint mismatch");
assert.match(worker, /requestUrl\.origin !== self\.location\.origin/);
assert.match(worker, /cache\.match\(APP_SHELL_URL\)/);
assert.doesNotMatch(worker, /"\/(?:dictionary|manifest\.webmanifest|pwa\.css|icons\/)/);
assert.doesNotMatch(worker, /https?:\/\//);
assert.match(css, /#pwa-status-panel,\s*#pwa-install-dialog\s*\{[\s\S]*?--pwa-primary:\s*#0f4c81/);
assert.match(css, /\.pwa-action-primary\s*\{[\s\S]*?background:\s*var\(--pwa-primary,\s*#0f4c81\)/);
assert.match(installPage, /BIP39 단어 학습 사전/);
assert.match(installPage, /id="iphone"/);
assert.match(installPage, /id="android"/);
assert.doesNotMatch(installPage, /P2P 계산기|bitcoin-p2p/i);

const textBundle = [index, installPage, JSON.stringify(manifest), registration, worker].join("\n");
assert.doesNotMatch(textBundle, PRIVATE_ACCOUNT_PATTERN, "private account name leaked");

for (const file of [
  ".nojekyll",
  "index.html",
  "manifest.webmanifest",
  "og.png",
  "pwa-register.js",
  "pwa.css",
  "sw.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "install.html",
  "install/iphone-guide-v1.png",
  "install/android-guide-v1.png",
]) {
  assert.ok(statSync(resolve(OUTPUT, file)).isFile(), `${file} missing`);
}

const topLevel = readdirSync(OUTPUT).filter((name) => name !== ".git").sort();
assert.deepEqual(topLevel, [
  ".nojekyll",
  "icons",
  "index.html",
  "install",
  "install.html",
  "manifest.webmanifest",
  "og.png",
  "pwa-register.js",
  "pwa.css",
  "sw.js",
]);

console.log(
  JSON.stringify(
    {
      passed: true,
      publicUrl: PUBLIC_URL,
      entries: 2048,
      indexBytes: Buffer.byteLength(index),
      indexSha256: sha256(Buffer.from(index, "utf8")),
      pwaSourceSha256: EXPECTED_PWA_SOURCE_SHA256,
      fullV22Sha256: EXPECTED_FULL_V22_SHA256,
      privateAccountNameOccurrences: 0,
    },
    null,
    2,
  ),
);
