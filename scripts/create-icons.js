/**
 * Generates the plugin's icon set.
 * Run with: npm run create-icons
 *
 * Design: black background, rounded-corner purple-bordered square with "T°"
 * lettering inside, also in purple.
 */

import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const imgDir = join(root, "com.ricky.weatherflow.sdPlugin", "imgs");

if (!existsSync(imgDir)) mkdirSync(imgDir, { recursive: true });

const PURPLE = "#9B59B6"; // visible against black; close-ish to Tempest brand purple
const BG = "#000000";

function makeSvg(size, { branded = true } = {}) {
  if (!branded) {
    // Plain black tile — used for action-state (the live button background)
    // so the overlaid title text (temperature, etc.) reads cleanly.
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
</svg>`;
  }

  const padding = Math.round(size * 0.12);
  const frameSize = size - padding * 2;
  const radius = Math.round(frameSize * 0.18);
  const stroke = Math.max(2, Math.round(size * 0.045));
  const fontSize = Math.round(frameSize * 0.62);
  // Nudge baseline slightly above true center — looks more balanced with the
  // degree symbol sitting up high.
  const textY = size * 0.5 + fontSize * 0.05;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <rect x="${padding}" y="${padding}" width="${frameSize}" height="${frameSize}"
        rx="${radius}" ry="${radius}"
        fill="none" stroke="${PURPLE}" stroke-width="${stroke}"/>
  <text x="50%" y="${textY}"
        text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-weight="700" font-size="${fontSize}"
        fill="${PURPLE}">T°</text>
</svg>`;
}

async function renderPng(size, outPath, opts) {
  const svg = makeSvg(size, opts);
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`Created ${outPath.split(/[\\/]/).pop()} (${size}px)`);
}

const iconSpecs = [
  { base: "plugin-icon",   sizes: [72, 144], branded: true },
  { base: "action-icon",   sizes: [72, 144], branded: true },
  { base: "action-state",  sizes: [72, 144], branded: false },
  { base: "category-icon", sizes: [28, 56],  branded: true },
];

for (const { base, sizes, branded } of iconSpecs) {
  const [s1x, s2x] = sizes;
  const opts = { branded };
  await renderPng(s1x, join(imgDir, `${base}@1x.png`), opts);
  await renderPng(s2x, join(imgDir, `${base}@2x.png`), opts);
  // Validator looks for the literal extensionless reference too.
  await renderPng(s2x, join(imgDir, `${base}.png`), opts);
}

// Marketplace listing tile (288×288).
await renderPng(288, join(imgDir, "marketplace-tile.png"), { branded: true });

console.log("\nDone! Edit PURPLE/BG constants or the SVG in this script to tweak.");
console.log("Output: com.ricky.weatherflow.sdPlugin/imgs/");
