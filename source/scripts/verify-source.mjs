import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const publicDirectory = resolve(projectDirectory, "build", "pwa");

const EXPECTED_SOURCE_SHA256 =
  "aeffe9a5a88151e8f65c0461b4a3279b7972d3cab443d235aaf23d91cf6c0020";
const EXPECTED_DERIVED_SHA256 =
  "5bc7b9aa5cfe9d43dccc66d7d9dcd60f4f29cb9f5bd59954f5ca462e227c3d4d";
const EXPECTED_SOCIAL_SOURCE_SHA256 =
  "ea4202fed5177961e1e92a28718794bd583f6ef008cd79b5f545b09a5ef2e39a";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function assertImage(path, width, height) {
  const metadata = await sharp(path).metadata();
  assert.equal(metadata.format, "png", `${path} must be PNG`);
  assert.equal(metadata.width, width, `${path} width`);
  assert.equal(metadata.height, height, `${path} height`);
}

const dictionaryPath = resolve(publicDirectory, "dictionary.html");
const fullSourcePath = resolve(
  projectDirectory,
  "full",
  "BIP39_Dictionary_Full_v2.2.html",
);
const manifestPath = resolve(publicDirectory, "manifest.webmanifest");
const serviceWorkerPath = resolve(publicDirectory, "sw.js");
const registrationPath = resolve(publicDirectory, "pwa-register.js");
const cssPath = resolve(publicDirectory, "pwa.css");
const installPagePath = resolve(publicDirectory, "install.html");
const socialSourcePath = resolve(
  projectDirectory,
  "assets",
  "social-card-source.png",
);

const [
  fullSource,
  dictionaryBuffer,
  manifestText,
  serviceWorker,
  registration,
  css,
  installPage,
  socialSource,
] = await Promise.all([
  readFile(fullSourcePath),
  readFile(dictionaryPath),
  readFile(manifestPath, "utf8"),
  readFile(serviceWorkerPath, "utf8"),
  readFile(registrationPath, "utf8"),
  readFile(cssPath, "utf8"),
  readFile(installPagePath, "utf8"),
  readFile(socialSourcePath),
]);

assert.equal(sha256(fullSource), EXPECTED_SOURCE_SHA256);
assert.equal(sha256(dictionaryBuffer), EXPECTED_DERIVED_SHA256);
assert.equal(sha256(socialSource), EXPECTED_SOCIAL_SOURCE_SHA256);

const dictionary = dictionaryBuffer.toString("utf8");
assert.match(
  dictionary,
  new RegExp(`<meta name="pwa-source-sha256" content="${EXPECTED_SOURCE_SHA256}">`),
);
assert.match(dictionary, /<meta name="bip39-entry-count" content="2048">/);
assert.match(
  dictionary,
  /<meta name="dictionary-content-hash" content="d72b6deaf89de11c22dc621a229ad99350b41bf0d4f7ae64691237fd83a1b761">/,
);
assert.match(dictionary, /<meta name="bip39-release-version" content="2\.2">/);
assert.match(
  dictionary,
  /<style id="full-v212-layout-patch">[\s\S]*?#search-security-message,[\s\S]*?\.toolbar[\s\S]*?flex:\s*0\s+0\s+auto/,
);
assert.match(dictionary, /id="support-lightning-address"[^>]*>thumbking@oksu\.su<\/code>/);
assert.match(dictionary, /id="support-copy-button"[^>]*aria-describedby="support-copy-status"/);
assert.match(dictionary, /id="support-copy-status"[^>]*role="status"[^>]*aria-live="polite"/);
assert.match(dictionary, /navigator\.clipboard\.writeText\(address\)/);
assert.match(dictionary, /document\.execCommand\("copy"\) === true/);
assert.match(dictionary, /if \(!copied\) copied = copySupportAddressWithExecCommand\(address\)/);
assert.match(dictionary, /if \(copied\) \{[\s\S]*?"라이트닝 주소를 복사했습니다\."[\s\S]*?\} else \{[\s\S]*?selectVisibleSupportAddress\(\)[\s\S]*?"manual"/);
assert.match(dictionary, /<link rel="manifest" href="\/manifest\.webmanifest">/);
assert.match(dictionary, /<script src="\/pwa-register\.js" defer><\/script>/);
assert.match(dictionary, /id="pwa-status-panel"/);
assert.match(dictionary, /id="pwa-install-button"/);
assert.match(dictionary, /id="pwa-update-button"/);
assert.match(dictionary, /id="pwa-install-dialog"/);
assert.match(dictionary, /id="pwa-install-confirm"/);
assert.match(dictionary, /id="pwa-install-later"/);
assert.match(dictionary, /id="pwa-install-guide"[^>]*href="\.\/install\.html"/);
assert.match(dictionary, /id="pwa-guide-install-entry"[^>]*href="\.\/install\.html"[^>]*>설치 방법<\/a>/);
assert.match(dictionary, /BIP39 사전을 앱으로 설치할까요\?/);
assert.match(dictionary, /처음 설치하거나 새 버전을 받을 때만 인터넷 연결이 필요합니다\./);
assert.match(
  dictionary,
  /발음 듣기는 기기·브라우저의 음성 서비스에 따라 인터넷 연결을 사용할 수 있습니다\./,
);
assert.match(
  dictionary,
  /실제 복구문구는 입력하거나 붙여넣지 말고, 순서대로 검색하거나 북마크하지도 마십시오\./,
);
assert.match(dictionary, /이 앱에는 검색 내용이나 학습 기록을 자동으로 전송하는 코드와 추적 코드가 없습니다\./);
assert.doesNotMatch(dictionary, /이 HTML 파일에는 검색 내용이나 학습 기록을 자동으로 전송/);
assert.match(dictionary, /function playTTS\(word, locale\)/);
assert.match(dictionary, /window\.speechSynthesis\.getVoices\(\)/);
assert.match(dictionary, /utterance\.rate = 0\.85/);
assert.doesNotMatch(dictionary, /localService/);
assert.doesNotMatch(dictionary, /\n\+\s*<(?:meta|link|aside|script|p|button|div)/);

const listIndexMatch = dictionary.match(
  /<script id="dictionary-list-index" type="application\/json">([^<]+)<\/script>/,
);
assert.ok(listIndexMatch, "dictionary-list-index missing");
assert.equal(JSON.parse(listIndexMatch[1]).length, 2048);

const manifest = JSON.parse(manifestText);
assert.equal(manifest.id, "/");
assert.equal(manifest.scope, "/");
assert.equal(manifest.start_url, "/dictionary");
assert.equal(manifest.lang, "ko-KR");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.theme_color, "#0f4c81");
assert.equal(manifest.background_color, "#f8fafc");
assert.equal(manifest.prefer_related_applications, false);
assert.deepEqual(
  manifest.icons.map(({ src, sizes, purpose }) => ({ src, sizes, purpose })),
  [
    { src: "/icons/icon-192.png", sizes: "192x192", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", purpose: "any" },
    {
      src: "/icons/icon-maskable-512.png",
      sizes: "512x512",
      purpose: "maskable",
    },
  ],
);

assert.match(serviceWorker, /const CACHE_PREFIX = "bip39-dictionary-pwa-"/);
assert.match(serviceWorker, /const PRECACHE_URLS = Object\.freeze\(\[/);
assert.match(serviceWorker, /request\.method !== "GET"/);
assert.match(serviceWorker, /requestUrl\.origin !== self\.location\.origin/);
assert.match(serviceWorker, /request\.mode === "navigate"/);
assert.match(serviceWorker, /cache\.match\(APP_SHELL_URL\)/);
assert.match(serviceWorker, /event\.data\?\.type === "SKIP_WAITING"/);
assert.equal((serviceWorker.match(/self\.skipWaiting\(\)/g) || []).length, 1);
assert.doesNotMatch(serviceWorker, /https?:\/\//);

assert.match(registration, /beforeinstallprompt/);
assert.match(registration, /appinstalled/);
assert.match(registration, /bip39_pwa_install_invite_until_v2/);
assert.match(registration, /showInstallInvite\("native", \{ automatic: true \}\)/);
assert.match(registration, /requestInstall\(installConfirm\)/);
assert.match(registration, /scheduleManualInstallInvite\(\)/);
assert.match(registration, /isInAppBrowser\(\)/);
assert.match(registration, /deferredInstallPrompt \? "앱 설치" : "설치 방법"/);
assert.match(
  registration,
  /serviceWorker\s*\.register\("\/sw\.js", \{ scope: "\/", updateViaCache: "none" \}\)/,
);
assert.match(registration, /worker\.postMessage\(\{ type: "SKIP_WAITING" \}\)/);
assert.match(registration, /controllerchange/);
assert.doesNotMatch(registration, /https?:\/\//);
assert.match(css, /#pwa-status-panel\[data-expanded="true"\]/);
assert.match(css, /#pwa-install-dialog/);
assert.match(css, /\.pwa-install-card/);
assert.match(css, /\.pwa-guide-install-entry/);
assert.match(css, /#pwa-status-panel,\s*#pwa-install-dialog\s*\{[\s\S]*?--pwa-primary:\s*#0f4c81/);
assert.match(css, /\.pwa-action-primary\s*\{[\s\S]*?background:\s*var\(--pwa-primary,\s*#0f4c81\)/);
assert.match(installPage, /홈 화면에 추가하기/);
assert.match(installPage, /id="iphone"/);
assert.match(installPage, /id="android"/);
assert.match(installPage, /앱 안 브라우저/);
assert.match(installPage, /BIP39 단어 학습 사전/);
assert.doesNotMatch(installPage, /P2P 계산기|bitcoin-p2p/i);
const iphoneInstallCard = installPage.match(/<article class="card" id="iphone">[\s\S]*?<\/article>/)?.[0] ?? "";
assert.equal((iphoneInstallCard.match(/<li>/g) ?? []).length, 5);
assert.match(iphoneInstallCard, /공유 창에서 더 보기를 누릅니다/);
assert.match(iphoneInstallCard, /펼친 목록에서 홈 화면에 추가를 누릅니다/);
assert.match(iphoneInstallCard, /다섯 단계 안내/);
assert.doesNotMatch(iphoneInstallCard, /네 단계 안내/);
assert.match(installPage, /@media\(min-width:761px\)\{\.grid\{align-items:stretch\}\.card\{display:flex;flex-direction:column\}\.card>img\{flex:0 0 auto;margin-top:auto\}\}/);

await Promise.all([
  assertImage(resolve(publicDirectory, "icons", "icon-192.png"), 192, 192),
  assertImage(resolve(publicDirectory, "icons", "icon-512.png"), 512, 512),
  assertImage(
    resolve(publicDirectory, "icons", "icon-maskable-512.png"),
    512,
    512,
  ),
  assertImage(
    resolve(publicDirectory, "icons", "apple-touch-icon.png"),
    180,
    180,
  ),
  assertImage(resolve(publicDirectory, "og.png"), 1200, 630),
  assertImage(resolve(publicDirectory, "install", "iphone-guide-v1.png"), 1080, 1920),
  assertImage(resolve(publicDirectory, "install", "android-guide-v1.png"), 1080, 1920),
]);

await assert.rejects(
  access(resolve(publicDirectory, "bip39-dictionary-social-card.png")),
);

console.log(
  JSON.stringify(
    {
      dictionarySha256: EXPECTED_DERIVED_SHA256,
      sourceSha256: EXPECTED_SOURCE_SHA256,
      entries: 2048,
      manifest: "valid",
      serviceWorker: "valid",
      images: "valid",
    },
    null,
    2,
  ),
);
