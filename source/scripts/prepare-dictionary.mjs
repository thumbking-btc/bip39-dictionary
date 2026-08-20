import { createHash } from "node:crypto";
import { cp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const protectedSource = resolve(
  projectDirectory,
  "full",
  "BIP39_Dictionary_Full_v2.2.html",
);
const templateDirectory = resolve(projectDirectory, "templates");
const publicDirectory = resolve(projectDirectory, "build", "pwa");
const dictionaryOutput = resolve(publicDirectory, "dictionary.html");

const EXPECTED_SOURCE_SHA256 =
  "aeffe9a5a88151e8f65c0461b4a3279b7972d3cab443d235aaf23d91cf6c0020";
const HEAD_MARKER = "<!-- BIP39_PWA_HEAD_V1 -->";
const BODY_MARKER = "<!-- BIP39_PWA_STATUS_V1 -->";
const GUIDE_MARKER = "<!-- BIP39_PWA_INSTALL_ENTRY_V2 -->";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function replaceExactlyOnce(source, target, replacement, label) {
  const first = source.indexOf(target);
  const last = source.lastIndexOf(target);
  if (first < 0 || first !== last) {
    throw new Error(`${label} 삽입 지점이 정확히 하나가 아닙니다.`);
  }
  return source.slice(0, first) + replacement + source.slice(first + target.length);
}

const sourceBuffer = await readFile(protectedSource);
const sourceHash = sha256(sourceBuffer);
if (sourceHash !== EXPECTED_SOURCE_SHA256) {
  throw new Error(
    `보호 원본 SHA-256 불일치: expected=${EXPECTED_SOURCE_SHA256} actual=${sourceHash}`,
  );
}

const source = sourceBuffer.toString("utf8");
if (
  source.includes(HEAD_MARKER) ||
  source.includes(BODY_MARKER) ||
  source.includes(GUIDE_MARKER)
) {
  throw new Error("보호 원본에 PWA 파생 마커가 이미 들어 있습니다.");
}

const headInjection = `  ${HEAD_MARKER}
  <meta name="theme-color" content="#0f4c81">
  <meta name="application-name" content="BIP39 사전">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="BIP39 사전">
  <meta name="pwa-source-sha256" content="${EXPECTED_SOURCE_SHA256}">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="stylesheet" href="/pwa.css">
`;

const bodyInjection = `  ${BODY_MARKER}
  <aside id="pwa-status-panel" data-offline-ready="false" data-expanded="false" aria-label="앱 설치 및 오프라인 상태">
    <button id="pwa-status-toggle" type="button" aria-expanded="false" aria-controls="pwa-status-details">
      <span id="pwa-status-label">오프라인 사용 준비 중</span>
    </button>
    <div id="pwa-status-details" hidden>
      <p id="pwa-connection-status"></p>
      <p id="pwa-offline-status" role="status" aria-live="polite">오프라인 파일을 준비하고 있습니다.</p>
      <p class="pwa-network-note">처음 설치하거나 새 버전을 받을 때만 인터넷 연결이 필요합니다.</p>
      <p class="pwa-speech-note">발음 듣기는 기기·브라우저의 음성 서비스에 따라 인터넷 연결을 사용할 수 있습니다.</p>
      <p class="pwa-install-hint">설치 버튼이 보이지 않으면 브라우저 메뉴의 앱 설치 또는 홈 화면에 추가를 사용하세요.</p>
      <div class="pwa-actions">
        <button id="pwa-install-button" class="pwa-action pwa-action-primary" type="button" hidden>설치 방법</button>
        <button id="pwa-update-button" class="pwa-action pwa-action-primary" type="button" hidden>새 버전 적용</button>
      </div>
    </div>
  </aside>
  <div id="pwa-install-dialog" hidden aria-hidden="true">
    <section class="pwa-install-card" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title" aria-describedby="pwa-install-description pwa-install-manual-hint">
      <div class="pwa-install-mark" aria-hidden="true"><span>A</span><b>₿</b><span>Z</span></div>
      <p class="pwa-install-eyebrow">완전 오프라인 사전</p>
      <h2 id="pwa-install-title">BIP39 사전을 앱으로 설치할까요?</h2>
      <p id="pwa-install-description">홈 화면에서 바로 열고, 한 번 준비한 뒤에는 인터넷 연결 없이 사용할 수 있습니다.</p>
      <p id="pwa-install-manual-hint">설치 방법은 브라우저와 기기에 따라 조금 다릅니다.</p>
      <div class="pwa-install-actions">
        <button id="pwa-install-confirm" class="pwa-action pwa-action-primary" type="button">앱으로 설치</button>
        <a id="pwa-install-guide" class="pwa-action pwa-action-primary" href="./install.html" hidden>설치 방법 보기</a>
        <button id="pwa-install-later" class="pwa-action" type="button">나중에</button>
      </div>
    </section>
  </div>
  <script src="/pwa-register.js" defer></script>
`;

let derived = replaceExactlyOnce(
  source,
  "</head>",
  `${headInjection}</head>`,
  "head",
);
derived = replaceExactlyOnce(
  derived,
  "이 HTML 파일에는 검색 내용이나 학습 기록을 자동으로 전송하는 코드와 추적 코드가 없습니다.",
  "이 앱에는 검색 내용이나 학습 기록을 자동으로 전송하는 코드와 추적 코드가 없습니다.",
  "PWA 보안 안내",
);
derived = replaceExactlyOnce(
  derived,
  '<button class="guide-action" type="button" data-guide-action="first">첫 단어 보기</button>',
  `<button class="guide-action" type="button" data-guide-action="first">첫 단어 보기</button>
            ${GUIDE_MARKER}
            <a id="pwa-guide-install-entry" class="guide-action pwa-guide-install-entry" href="./install.html">설치 방법</a>`,
  "사전 안내의 설치 진입점",
);
derived = replaceExactlyOnce(
  derived,
  "</body>",
  `${bodyInjection}</body>`,
  "body",
);

await rm(publicDirectory, { recursive: true, force: true });
await cp(templateDirectory, publicDirectory, { recursive: true });
await writeFile(dictionaryOutput, derived, "utf8");

console.log(
  JSON.stringify(
    {
      source: protectedSource,
      sourceSha256: sourceHash,
      dictionary: dictionaryOutput,
      dictionarySha256: sha256(Buffer.from(derived, "utf8")),
    },
    null,
    2,
  ),
);
