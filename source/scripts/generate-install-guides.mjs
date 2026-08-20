import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(here, "../templates");
const outputDirectory = path.resolve(publicDirectory, "install");

const C = {
  paper: "#f3f6f9",
  card: "#ffffff",
  ink: "#111827",
  muted: "#526273",
  line: "#c8d3df",
  blue: "#0f4c81",
  blueSoft: "#eaf3fa",
  orange: "#f7931a",
  orangeSoft: "#fff1df",
  red: "#dc342b",
  green: "#18a66a",
  white: "#ffffff",
};

const font = "'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',sans-serif";

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function text(x, y, value, size = 24, options = {}) {
  const {
    fill = C.ink,
    weight = 650,
    anchor = "start",
    spacing = "-0.5",
  } = options;
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${font}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="${spacing}">${escapeXml(value)}</text>`;
}

function lines(x, y, values, size = 24, gap = 38, options = {}) {
  return values
    .map((value, index) => text(x, y + index * gap, value, size, options))
    .join("\n");
}

function rect(x, y, width, height, options = {}) {
  const {
    fill = "none",
    stroke = "none",
    strokeWidth = 0,
    rx = 0,
  } = options;
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function line(x1, y1, x2, y2, options = {}) {
  const { stroke = C.line, strokeWidth = 2 } = options;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function highlight(x, y, width, height, rx = 14) {
  return rect(x, y, width, height, {
    fill: C.orangeSoft,
    stroke: C.red,
    strokeWidth: 7,
    rx,
  });
}

function appIcon(x, y, size = 72) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  return `
    ${rect(x, y, size, size, { fill: C.blue, rx: Math.round(size * 0.22) })}
    ${rect(x + size * 0.14, y + size * 0.13, size * 0.72, size * 0.74, { fill: C.white, rx: Math.round(size * 0.1) })}
    ${text(x + size * 0.29, y + size * 0.65, "A", Math.round(size * 0.28), { fill: C.blue, weight: 900, anchor: "middle" })}
    <circle cx="${cx}" cy="${cy}" r="${Math.round(size * 0.2)}" fill="${C.orange}"/>
    <text x="${cx}" y="${cy + size * 0.075}" fill="#fff" font-family="Arial,sans-serif" font-size="${Math.round(size * 0.28)}" font-weight="800" text-anchor="middle">₿</text>
    ${text(x + size * 0.72, y + size * 0.65, "Z", Math.round(size * 0.28), { fill: C.blue, weight: 900, anchor: "middle" })}
  `;
}

function guideHeader(platform, browser, titleValue) {
  return `
    ${appIcon(54, 48, 104)}
    ${text(188, 91, `${platform} · ${browser}`, 30, { fill: C.blue, weight: 850 })}
    ${text(188, 154, titleValue, 55, { weight: 900, spacing: "-2" })}
    ${text(56, 218, "BIP39 사전을 홈 화면에 추가하는 순서입니다.", 25, { fill: C.muted, weight: 550 })}
  `;
}

function stepBadge(number, x, y) {
  return `
    <circle cx="${x}" cy="${y}" r="28" fill="${C.orange}"/>
    ${text(x, y + 10, String(number), 29, { fill: C.white, weight: 900, anchor: "middle", spacing: "0" })}
  `;
}

function stepCard({ y, height, number, titleValue, body, note = [], preview }) {
  const previewX = 73;
  const previewY = y + 20;
  const previewWidth = 586;
  const previewHeight = height - 40;
  const copyX = 710;
  return `
    ${rect(51, y, 978, height, { fill: C.card, stroke: C.line, strokeWidth: 3, rx: 26 })}
    ${rect(previewX, previewY, previewWidth, previewHeight, { fill: C.blueSoft, stroke: C.ink, strokeWidth: 4, rx: 22 })}
    <g transform="translate(${previewX} ${previewY})">${preview(previewWidth, previewHeight)}</g>
    ${stepBadge(number, copyX + 27, y + 53)}
    ${text(copyX + 67, y + 63, titleValue, 29, { weight: 900, spacing: "-1" })}
    ${lines(copyX, y + 119, body, 24, 41, { weight: 700 })}
    ${note.length ? lines(copyX, y + height - 50 - (note.length - 1) * 31, note, 19, 31, { fill: C.muted, weight: 550 }) : ""}
  `;
}

function footer(message, detail) {
  return `
    ${rect(51, 1742, 978, 126, { fill: C.blue, rx: 24 })}
    ${text(540, 1793, message, 25, { fill: "#ffd39c", weight: 850, anchor: "middle" })}
    ${text(540, 1836, detail, 20, { fill: "#d9e8f4", weight: 550, anchor: "middle" })}
  `;
}

function iphonePreview1(w, h) {
  return `
    ${rect(18, 16, w - 36, h - 32, { fill: C.white, rx: 18 })}
    ${appIcon(38, 31, 46)}
    ${text(100, 66, "BIP39 단어 학습 사전", 23, { weight: 850 })}
    ${rect(37, 88, w - 74, 42, { fill: C.blue, rx: 7 })}
    ${rect(37, 143, 218, 45, { fill: "#e1e8ef", rx: 7 })}
    ${rect(269, 143, 280, 45, { fill: "#e1e8ef", rx: 7 })}
    ${rect(18, h - 52, w - 36, 36, { fill: "#e4e9ee", rx: 18 })}
    ${text(282, h - 27, "thumbking-btc.github.io/…", 16, { fill: C.muted, weight: 600, anchor: "middle" })}
    ${highlight(w - 88, h - 62, 62, 55, 16)}
    ${text(w - 57, h - 25, "•••", 24, { weight: 900, anchor: "middle", spacing: "2" })}
  `;
}

function iphonePreview2(w, h) {
  return `
    ${rect(18, 15, w - 36, h - 30, { fill: C.white, rx: 22 })}
    ${rect(w / 2 - 42, 26, 84, 6, { fill: C.line, rx: 3 })}
    ${text(44, 67, "Safari 메뉴", 23, { weight: 850 })}
    ${line(38, 81, w - 38, 81)}
    ${highlight(36, 90, w - 72, 60, 13)}
    <path d="M68 131v-33m-12 12 12-12 12 12" fill="none" stroke="#1677d2" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    ${rect(51, 107, 34, 31, { stroke: "#1677d2", strokeWidth: 4, rx: 7 })}
    ${text(106, 130, "공유", 25, { weight: 850 })}
    ${text(54, 183, "북마크에 추가", 21, { fill: C.muted, weight: 550 })}
  `;
}

function iphonePreview3(w, h) {
  return `
    ${rect(18, 15, w - 36, h - 30, { fill: "#3f464d", rx: 22 })}
    ${appIcon(40, 35, 48)}
    ${text(105, 61, "BIP39 단어 학습 사전", 20, { fill: C.white, weight: 750 })}
    ${text(105, 88, "thumbking-btc.github.io/…", 15, { fill: "#c8cbd0", weight: 500 })}
    ${rect(38, 111, w - 76, 2, { fill: "#626971" })}
    ${rect(45, 120, 80, 76, { fill: "#68b6ff", rx: 20 })}
    ${rect(145, 120, 80, 76, { fill: "#42c766", rx: 20 })}
    ${rect(245, 120, 80, 76, { fill: "#68b6ff", rx: 20 })}
    ${text(85, 217, "AirDrop", 15, { fill: C.white, weight: 500, anchor: "middle" })}
    ${text(185, 217, "메시지", 15, { fill: C.white, weight: 500, anchor: "middle" })}
    ${text(285, 217, "Mail", 15, { fill: C.white, weight: 500, anchor: "middle" })}
    ${highlight(w - 147, 120, 102, 101, 19)}
    <path d="M${w - 119} 158l18 18 18-18" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    ${text(w - 96, 211, "더 보기", 15, { weight: 750, anchor: "middle" })}
  `;
}

function iphonePreview4(w, h) {
  return `
    ${rect(18, 15, w - 36, h - 30, { fill: "#3f464d", rx: 22 })}
    ${text(47, 52, "공유 메뉴", 22, { fill: C.white, weight: 800 })}
    ${text(w - 48, 52, "간략히 보기", 17, { fill: "#d9dde1", weight: 550, anchor: "end" })}
    ${line(38, 67, w - 38, 67, { stroke: "#626971" })}
    ${text(54, 104, "즐겨찾기에 추가", 20, { fill: C.white, weight: 600 })}
    ${text(54, 143, "빠른 메모에 추가", 20, { fill: C.white, weight: 600 })}
    ${highlight(38, 155, w - 76, 58, 13)}
    ${rect(53, 170, 28, 28, { stroke: C.ink, strokeWidth: 3, rx: 6 })}
    ${text(67, 192, "+", 27, { weight: 700, anchor: "middle" })}
    ${text(99, 193, "홈 화면에 추가", 22, { weight: 850 })}
  `;
}

function iphonePreview5(w, h) {
  return `
    ${rect(18, 15, w - 36, h - 30, { fill: C.white, rx: 22 })}
    ${text(44, 59, "홈 화면에 추가", 23, { weight: 850 })}
    ${highlight(w - 112, 25, 77, 47, 13)}
    ${text(w - 73, 58, "추가", 22, { fill: "#1677d2", weight: 850, anchor: "middle" })}
    ${line(38, 82, w - 38, 82)}
    ${appIcon(48, 99, 68)}
    ${text(135, 127, "BIP39 사전", 23, { weight: 800 })}
    ${text(135, 157, "thumbking-btc.github.io/…", 16, { fill: C.muted, weight: 550 })}
    ${text(48, 201, "웹 앱으로 열기", 20, { weight: 650 })}
    ${rect(w - 116, 177, 72, 38, { fill: C.green, rx: 19 })}
    <circle cx="${w - 66}" cy="196" r="15" fill="${C.white}"/>
  `;
}

function androidPreview1(w, h) {
  return `
    ${rect(18, 18, w - 36, 58, { fill: C.white, stroke: C.line, strokeWidth: 2, rx: 29 })}
    ${text(44, 57, "thumbking-btc.github.io/…", 19, { fill: C.muted, weight: 600 })}
    ${highlight(w - 88, 8, 62, 78, 18)}
    ${text(w - 57, 61, "⋮", 39, { weight: 850, anchor: "middle" })}
    ${rect(18, 97, w - 36, h - 115, { fill: C.white, rx: 18 })}
    ${appIcon(42, 121, 56)}
    ${text(116, 157, "BIP39 단어 학습 사전", 24, { weight: 850 })}
    ${rect(42, 184, w - 84, 55, { fill: C.blue, rx: 8 })}
    ${rect(42, 257, 218, 71, { fill: "#e1e8ef", rx: 8 })}
    ${rect(276, 257, 268, 71, { fill: "#e1e8ef", rx: 8 })}
  `;
}

function androidPreview2(w, h) {
  return `
    ${rect(104, 14, w - 122, h - 28, { fill: C.white, stroke: C.line, strokeWidth: 2, rx: 22 })}
    ${text(136, 61, "새 탭", 22, { weight: 650 })}
    ${text(136, 111, "새 시크릿 탭", 22, { weight: 650 })}
    ${line(128, 138, w - 38, 138)}
    ${text(136, 181, "방문 기록", 22, { weight: 650 })}
    ${text(136, 231, "다운로드", 22, { weight: 650 })}
    ${text(136, 281, "공유…", 22, { weight: 650 })}
    ${highlight(120, h - 93, w - 154, 67, 13)}
    ${text(144, h - 50, "설치 및 바로가기 만들기", 21, { weight: 850 })}
    <path d="M${w - 74} ${h - 65}l12 12-12 12" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  `;
}

function androidPreview3(w, h) {
  return `
    ${rect(50, 57, w - 100, h - 114, { fill: C.white, stroke: C.line, strokeWidth: 2, rx: 28 })}
    ${text(82, 104, "앱 설치", 27, { weight: 850 })}
    ${line(76, 128, w - 76, 128)}
    ${appIcon(82, 157, 72)}
    ${text(177, 187, "BIP39 사전", 23, { weight: 800 })}
    ${text(177, 220, "thumbking-btc.github.io/…", 17, { fill: C.muted, weight: 550 })}
    ${text(w - 223, h - 104, "취소", 21, { fill: C.muted, weight: 750, anchor: "middle" })}
    ${highlight(w - 176, h - 143, 106, 60, 15)}
    ${text(w - 123, h - 103, "설치", 22, { fill: C.blue, weight: 850, anchor: "middle" })}
  `;
}

function documentSvg({ titleValue, description, body }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(titleValue)}</title>
  <desc id="desc">${escapeXml(description)}</desc>
  <rect width="1080" height="1920" fill="${C.paper}"/>
  ${body}
</svg>`.replace(/[ \t]+$/gm, "");
}

const iphoneSvg = documentSvg({
  titleValue: "iPhone Safari에서 BIP39 사전을 홈 화면에 추가하는 방법",
  description: "Safari 더 보기, 공유, 메뉴 펼치기, 홈 화면에 추가, 추가 버튼을 순서대로 안내합니다.",
  body: `
    ${guideHeader("iPhone", "Safari", "홈 화면에 추가하기")}
    ${stepCard({ y: 258, height: 272, number: 1, titleValue: "Safari에서 열기", body: ["Safari로 연 뒤 아래쪽", "… 버튼을 누릅니다."], note: ["공유 아이콘이 바로 보이면", "그것을 눌러도 됩니다."], preview: iphonePreview1 })}
    ${stepCard({ y: 544, height: 272, number: 2, titleValue: "공유 선택", body: ["빠른 메뉴에서", "공유를 누릅니다."], note: ["공유 창이 열립니다."], preview: iphonePreview2 })}
    ${stepCard({ y: 830, height: 272, number: 3, titleValue: "메뉴 펼치기", body: ["공유 창에서", "더 보기를 누릅니다."], note: ["‘간략히 보기’라면", "이미 펼쳐진 상태입니다."], preview: iphonePreview3 })}
    ${stepCard({ y: 1116, height: 272, number: 4, titleValue: "홈 화면에 추가", body: ["펼친 목록에서", "홈 화면에 추가를", "누릅니다."], preview: iphonePreview4 })}
    ${stepCard({ y: 1402, height: 272, number: 5, titleValue: "추가 완료", body: ["웹 앱으로 열기를 확인하고", "오른쪽 위 추가를", "누릅니다."], preview: iphonePreview5 })}
    ${footer("iPhone의 Safari에서 진행하세요.", "Discord 등 앱 안에서 열었다면 먼저 Safari로 열어 주세요.")}
  `,
});

const androidSvg = documentSvg({
  titleValue: "Android Chrome에서 BIP39 사전을 설치하는 방법",
  description: "Chrome 더 보기, 설치 및 바로가기 만들기, 설치 버튼을 순서대로 안내합니다.",
  body: `
    ${guideHeader("Android", "Chrome", "홈 화면에 설치하기")}
    ${stepCard({ y: 292, height: 430, number: 1, titleValue: "Chrome에서 열기", body: ["링크를 Chrome에서 열고", "오른쪽 위 ⋮ 버튼을", "누릅니다."], note: ["앱 안 브라우저라면 먼저", "Chrome으로 열어 주세요."], preview: androidPreview1 })}
    ${stepCard({ y: 744, height: 430, number: 2, titleValue: "설치 메뉴 선택", body: ["메뉴를 아래로 내려", "설치 및 바로가기", "만들기를 누릅니다."], note: ["기기에 따라 ‘앱 설치’나", "‘홈 화면에 추가’로 보입니다."], preview: androidPreview2 })}
    ${stepCard({ y: 1196, height: 430, number: 3, titleValue: "설치 완료", body: ["확인 창에서", "설치를 누릅니다."], note: ["홈 화면의 사전 아이콘으로", "바로 열 수 있습니다."], preview: androidPreview3 })}
    ${footer("Android의 Chrome에서 진행하세요.", "이미 설치했다면 설치 메뉴가 표시되지 않을 수 있습니다.")}
  `,
});

const installHtml = `<!doctype html>
<html lang="ko-KR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#0f4c81">
  <meta name="robots" content="noindex">
  <title>홈 화면에 추가하기 | BIP39 단어 학습 사전</title>
  <style>
    :root{color-scheme:light;font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;background:#f3f6f9;color:#111827}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at top,rgba(15,76,129,.13),transparent 35%),#f3f6f9}
    a{color:inherit}.page{width:min(1120px,calc(100% - 28px));margin:auto;padding:22px 0 72px}.back{display:inline-flex;min-height:44px;align-items:center;color:#0f4c81;font-weight:800;text-underline-offset:4px}
    .hero{margin:22px 0 18px;padding:clamp(22px,5vw,42px);border:1px solid #b9cad9;border-radius:24px;background:#fff;box-shadow:0 16px 50px rgba(15,23,42,.09)}
    .eyebrow{margin:0 0 7px;color:#0f4c81;font-size:12px;font-weight:900;letter-spacing:.08em}.hero h1{margin:0;font-size:clamp(30px,7vw,54px);letter-spacing:-.04em}.hero p{max-width:720px;margin:14px 0 0;color:#526273;line-height:1.7}.notice{margin-top:16px;padding:13px 15px;border-left:4px solid #f7931a;background:#fff5e7;color:#394b5b;line-height:1.6}
    .jump{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}.jump a,.actions a{display:inline-flex;min-height:44px;align-items:center;justify-content:center;padding:0 16px;border:1px solid #0f4c81;border-radius:999px;background:#0f4c81;color:#fff;font-weight:850;text-decoration:none}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}.card{min-width:0;overflow:hidden;border:1px solid #b9cad9;border-radius:20px;background:#fff;box-shadow:0 12px 34px rgba(15,23,42,.08)}
    .card header{padding:20px;border-bottom:1px solid #dbe4ec}.card header span{color:#0f4c81;font-size:12px;font-weight:900;letter-spacing:.08em}.card h2{margin:4px 0 0;font-size:clamp(24px,4vw,34px)}.steps{display:grid;gap:9px;margin:0;padding:19px 20px 19px 48px;color:#526273;line-height:1.55}.steps li::marker{color:#f7931a;font-weight:900}.card img{display:block;width:100%;height:auto;border-top:1px solid #dbe4ec;background:#f3f6f9}.actions{display:grid;grid-template-columns:1fr;border-top:1px solid #dbe4ec}.actions a{min-height:50px;border:0;border-radius:0;background:#0f4c81}
    .desktop{margin-top:18px;padding:22px;border:1px solid #b9cad9;border-radius:18px;background:#fff}.desktop h2{margin:0 0 8px}.desktop p{margin:0;color:#526273;line-height:1.65}.footnote{margin-top:18px;padding:18px 20px;border-radius:16px;background:#0f2740;color:#d8e7f3;line-height:1.65}.footnote strong{color:#ffd29a}
    :focus-visible{outline:3px solid #f7931a;outline-offset:3px}@media(min-width:761px){.grid{align-items:stretch}.card{display:flex;flex-direction:column}.card>img{flex:0 0 auto;margin-top:auto}}@media(max-width:760px){.page{padding-top:12px}.grid{grid-template-columns:1fr}.hero{margin-top:10px;border-radius:18px}.hero h1{font-size:clamp(29px,9vw,40px)}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
  </style>
</head>
<body>
  <main class="page">
    <a class="back" href="./">← 사전으로 돌아가기</a>
    <header class="hero">
      <p class="eyebrow">BIP39 단어 학습 사전 · PWA</p>
      <h1>홈 화면에 추가하기</h1>
      <p>기기에 맞는 방법으로 사전을 홈 화면에 추가하면 일반 앱처럼 바로 열 수 있습니다. 오프라인 준비가 끝난 뒤에는 인터넷 연결 없이 핵심 사전 기능을 사용할 수 있습니다.</p>
      <p class="notice"><strong>자동 다운로드와는 다릅니다.</strong> 웹사이트가 임의로 앱을 설치할 수는 없으므로 마지막 설치 또는 추가 확인은 사용자가 직접 눌러야 합니다.</p>
      <nav class="jump" aria-label="기기별 설치 안내"><a href="#iphone">iPhone</a><a href="#android">Android</a><a href="#desktop">PC</a></nav>
    </header>
    <div class="grid">
      <article class="card" id="iphone">
        <header><span>iPhone · iPad</span><h2>Safari에서 추가</h2></header>
        <ol class="steps"><li>Discord·X 같은 앱 안에서 열었다면 먼저 Safari로 연 뒤 아래쪽 더 보기(…)를 누릅니다.</li><li>빠른 메뉴에서 공유를 누릅니다. 공유 아이콘이 바로 보이면 그것을 눌러도 됩니다.</li><li>공유 창에서 더 보기를 누릅니다. ‘간략히 보기’라고 표시된다면 이미 펼쳐진 상태입니다.</li><li>펼친 목록에서 홈 화면에 추가를 누릅니다.</li><li>웹 앱으로 열기를 확인하고 오른쪽 위 추가를 누릅니다.</li></ol>
        <img src="./install/iphone-guide-v1.png" width="1080" height="1920" alt="iPhone Safari에서 BIP39 사전을 홈 화면에 추가하는 다섯 단계 안내">
        <div class="actions"><a href="./install/iphone-guide-v1.png" download="bip39-dictionary-iphone-install-guide.png">iPhone 안내 이미지 저장</a></div>
      </article>
      <article class="card" id="android">
        <header><span>Android</span><h2>Chrome에서 설치</h2></header>
        <ol class="steps"><li>앱 안 브라우저에서 열었다면 먼저 Chrome으로 엽니다.</li><li>Chrome 오른쪽 위의 ⋮ 메뉴를 누릅니다.</li><li>앱 설치, 설치 및 바로가기 만들기 또는 홈 화면에 추가를 선택합니다.</li><li>확인 창에서 설치를 누릅니다.</li></ol>
        <img src="./install/android-guide-v1.png" width="1080" height="1920" alt="Android Chrome에서 BIP39 사전을 설치하는 세 단계 안내">
        <div class="actions"><a href="./install/android-guide-v1.png" download="bip39-dictionary-android-install-guide.png">Android 안내 이미지 저장</a></div>
      </article>
    </div>
    <section class="desktop" id="desktop"><h2>PC에서 설치</h2><p>Chrome·Edge처럼 PWA 설치를 지원하는 브라우저에서는 주소창의 설치 아이콘이나 브라우저 메뉴의 앱 설치 항목을 선택하세요. 설치 신호가 준비되면 사전 안의 <strong>앱 설치</strong> 버튼을 눌러 실제 브라우저 설치창을 열 수도 있습니다.</p></section>
    <aside class="footnote"><strong>설치 메뉴가 보이지 않나요?</strong><br>이미 설치되어 있거나, 현재 브라우저가 PWA 설치를 지원하지 않거나, 앱 안 브라우저에서 링크를 연 경우일 수 있습니다. iPhone은 Safari, Android는 Chrome으로 다시 열어 확인해 주세요.</aside>
  </main>
</body>
</html>
`;

await mkdir(outputDirectory, { recursive: true });
for (const [name, svg] of [
  ["iphone-guide-v1.png", iphoneSvg],
  ["android-guide-v1.png", androidSvg],
]) {
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toFile(path.join(outputDirectory, name));
}
await writeFile(path.join(publicDirectory, "install.html"), installHtml, "utf8");

console.log(
  JSON.stringify(
    {
      installPage: path.join(publicDirectory, "install.html"),
      iphoneGuide: path.join(outputDirectory, "iphone-guide-v1.png"),
      androidGuide: path.join(outputDirectory, "android-guide-v1.png"),
    },
    null,
    2,
  ),
);
