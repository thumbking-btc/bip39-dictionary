import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assets = resolve(sourceRoot, "assets");
const templates = resolve(sourceRoot, "templates");
const icons = resolve(templates, "icons");
const appIcon = resolve(assets, "dictionary-app-icon-bitcoin-v2.png");
const socialCard = resolve(assets, "social-card-source.png");

await mkdir(icons, { recursive: true });
await Promise.all([
  sharp(appIcon).resize(192, 192).png({ compressionLevel: 9 }).toFile(resolve(icons, "icon-192.png")),
  sharp(appIcon).resize(512, 512).png({ compressionLevel: 9 }).toFile(resolve(icons, "icon-512.png")),
  sharp(appIcon).resize(512, 512).png({ compressionLevel: 9 }).toFile(resolve(icons, "icon-maskable-512.png")),
  sharp(appIcon).resize(180, 180).png({ compressionLevel: 9 }).toFile(resolve(icons, "apple-touch-icon.png")),
  sharp(socialCard)
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(resolve(templates, "og.png")),
]);

console.log(JSON.stringify({ icons, socialCard: resolve(templates, "og.png") }, null, 2));
