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
const imgDir = join(root, "com.rtheil.weatherflow.sdPlugin", "imgs");

if (!existsSync(imgDir)) mkdirSync(imgDir, { recursive: true });

const PURPLE = "#9B59B6"; // visible against black; close-ish to Tempest brand purple
const BG = "#000000";

function makeBannerSvg(width = 1920, height = 960) {
  const pad = 120;
  const iconBox = height - pad * 2;
  const innerPad = Math.round(iconBox * 0.12);
  const innerSize = iconBox - innerPad * 2;
  const radius = Math.round(innerSize * 0.18);
  const stroke = Math.max(4, Math.round(iconBox * 0.045));
  const iconFont = Math.round(innerSize * 0.62);

  const textX = pad + iconBox + pad;
  const titleSize = 130;
  const tagSize = 56;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${BG}"/>
  <g transform="translate(${pad}, ${pad})">
    <rect x="${innerPad}" y="${innerPad}" width="${innerSize}" height="${innerSize}"
          rx="${radius}" ry="${radius}"
          fill="none" stroke="${PURPLE}" stroke-width="${stroke}"/>
    <text x="${iconBox / 2}" y="${iconBox / 2 + iconFont * 0.05}"
          text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-weight="700" font-size="${iconFont}"
          fill="${PURPLE}">T°</text>
  </g>
  <text x="${textX}" y="380" font-family="Arial, Helvetica, sans-serif"
        font-weight="700" font-size="${titleSize}" fill="${PURPLE}">WeatherFlow</text>
  <text x="${textX}" y="520" font-family="Arial, Helvetica, sans-serif"
        font-weight="700" font-size="${titleSize}" fill="${PURPLE}">Tempest</text>
  <text x="${textX}" y="620" font-family="Arial, Helvetica, sans-serif"
        font-weight="400" font-size="${tagSize}" fill="#cccccc">Live weather on your Stream Deck</text>
</svg>`;
}

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

// Marketplace listing thumbnail (1920×960, 2:1).
{
  const svg = makeBannerSvg(1920, 960);
  const outPath = join(imgDir, "marketplace-thumbnail.png");
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`Created marketplace-thumbnail.png (1920×960)`);
}

console.log("\nDone! Edit PURPLE/BG constants or the SVG in this script to tweak.");
console.log("Output: com.rtheil.weatherflow.sdPlugin/imgs/");
