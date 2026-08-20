import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const input = resolve(
  projectDirectory,
  "assets",
  "dictionary-app-icon-source.png",
);
const output = resolve(
  projectDirectory,
  "assets",
  "dictionary-app-icon-bitcoin-v2.png",
);

const width = 1254;
const height = 1254;
const centerX = 654;
const centerY = 566;

function svg(content) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <filter id="soft-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="3.2" flood-color="#041a30" flood-opacity="0.55"/>
        </filter>
        <radialGradient id="bitcoin-orange" cx="36%" cy="28%" r="76%">
          <stop offset="0" stop-color="#ffb64a"/>
          <stop offset="0.62" stop-color="#f7931a"/>
          <stop offset="1" stop-color="#c86400"/>
        </radialGradient>
      </defs>
      ${content}
    </svg>
  `);
}

const medallion = `
  <circle cx="${centerX}" cy="${centerY}" r="65" fill="#082e56"/>
  <circle cx="${centerX}" cy="${centerY}" r="59" fill="url(#bitcoin-orange)"
    stroke="#f6d68e" stroke-width="7" filter="url(#soft-shadow)"/>
  <text x="${centerX}" y="${centerY + 32}" text-anchor="middle"
    font-family="Segoe UI Symbol, DejaVu Sans, sans-serif" font-size="90" font-weight="700"
    fill="#fff8e6">₿</text>
`;

await sharp(input)
  .composite([{ input: svg(medallion), left: 0, top: 0 }])
  .png({ compressionLevel: 9, adaptiveFiltering: false })
  .toFile(output);

console.log(output);
