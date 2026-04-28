// Renders scripts/og-image.tsx via satori, then sharp to PNG.
// Outputs og-image.svg + og-image.png at the repo root so GitHub Pages
// can serve them directly. Run via `npm run build:og`.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import satori from "satori";
import sharp from "sharp";

import { OgImage } from "./og-image.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FONTS = path.join(ROOT, "assets", "fonts");

async function loadFont(file: string): Promise<Buffer> {
  return readFile(path.join(FONTS, file));
}

async function main() {
  const [garamond, garamondItalic, jetbrainsMono] = await Promise.all([
    loadFont("EBGaramond-Regular.ttf"),
    loadFont("EBGaramond-Italic.ttf"),
    loadFont("JetBrainsMono-Regular.ttf"),
  ]);

  const svg = await satori(OgImage(), {
    width: 1200,
    height: 630,
    fonts: [
      { name: "EB Garamond", data: garamond, weight: 400, style: "normal" },
      { name: "EB Garamond", data: garamondItalic, weight: 400, style: "italic" },
      { name: "JetBrains Mono", data: jetbrainsMono, weight: 400, style: "normal" },
    ],
  });

  const svgPath = path.join(ROOT, "og-image.svg");
  await writeFile(svgPath, svg, "utf8");

  const pngPath = path.join(ROOT, "og-image.png");
  await sharp(Buffer.from(svg)).png().toFile(pngPath);

  console.log(`wrote ${path.relative(ROOT, svgPath)}`);
  console.log(`wrote ${path.relative(ROOT, pngPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
