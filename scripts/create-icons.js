/**
 * Generates the plugin's icon set.
 * Run with: npm run create-icons
 *
 * Three icon families:
 *   1. plugin-icon  — shown in the plugin browser / Marketplace listing.
 *                     Branded: black background, purple T° tile. PNG only (required).
 *   2. action-state — the live button background. Plain black so overlaid title
 *                     text (the actual weather value) is readable.
 *   3. action-icon, category-icon — shown in the action list inside the
 *                     Stream Deck app. Must be monochrome white on transparent
 *                     per Elgato guidelines. SVG (scales cleanly at small sizes).
 *
 * Plus a Marketplace listing banner at 1920×960.
 */

import sharp from "sharp";
import { mkdirSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const imgDir = join(root, "com.rtheil.weatherflow.sdPlugin", "imgs");

if (!existsSync(imgDir)) mkdirSync(imgDir, { recursive: true });

const PURPLE = "#9B59B6";
const BG = "#000000";

// ---------- Branded plugin icon (color, PNG, opaque background) ----------

function makeBrandedSvg(size) {
  const padding = Math.round(size * 0.12);
  const frameSize = size - padding * 2;
  const radius = Math.round(frameSize * 0.18);
  const stroke = Math.max(2, Math.round(size * 0.045));
  const fontSize = Math.round(frameSize * 0.62);
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

// ---------- Plain black tile for action-state ----------

function makePlainBlackSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
</svg>`;
}

// ---------- White monochrome icon for action list (SVG, transparent bg) ----------

function makeMonochromeSvg() {
  // Designed in a 100×100 viewBox so it scales cleanly to any rendered size.
  // Note: no background rect — the SVG canvas stays transparent.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect x="12" y="12" width="76" height="76" rx="14" ry="14"
        fill="none" stroke="#FFFFFF" stroke-width="6"/>
  <text x="50" y="50"
        text-anchor="middle" dominant-baseline="central"
        font-family="Arial, Helvetica, sans-serif"
        font-weight="700" font-size="46"
        fill="#FFFFFF">T°</text>
</svg>`;
}

// ---------- Marketplace banner ----------

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

// ---------- Render ----------

async function renderPng(svg, outPath, label) {
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`Created ${outPath.split(/[\\/]/).pop()} (${label})`);
}

function writeSvg(svg, outPath) {
  writeFileSync(outPath, svg);
  console.log(`Created ${outPath.split(/[\\/]/).pop()} (SVG)`);
}

function removeIfExists(path) {
  try { unlinkSync(path); } catch {}
}

// Plugin icon (color, PNG; required to be PNG by the manifest schema).
for (const [size, name] of [[72, "plugin-icon@1x.png"], [144, "plugin-icon@2x.png"], [144, "plugin-icon.png"]]) {
  await renderPng(makeBrandedSvg(size), join(imgDir, name), `${size}px`);
}

// Action-state (plain black, PNG).
for (const [size, name] of [[72, "action-state@1x.png"], [144, "action-state@2x.png"], [144, "action-state.png"]]) {
  await renderPng(makePlainBlackSvg(size), join(imgDir, name), `${size}px plain`);
}

// Action and category icons — SVG, monochrome white, transparent background.
// Per https://docs.elgato.com/guidelines/stream-deck/plugins#icons
writeSvg(makeMonochromeSvg(), join(imgDir, "action-icon.svg"));
writeSvg(makeMonochromeSvg(), join(imgDir, "category-icon.svg"));

// Clean up any stale PNG variants left over from earlier runs — having both
// PNG and SVG variants of the same icon makes Stream Deck's resolution
// ambiguous. SVG wins; remove the PNGs.
for (const base of ["action-icon", "category-icon"]) {
  for (const variant of [".png", "@1x.png", "@2x.png"]) {
    removeIfExists(join(imgDir, `${base}${variant}`));
  }
}

// Marketplace listing thumbnail (1920×960, 2:1).
await renderPng(makeBannerSvg(1920, 960), join(imgDir, "marketplace-thumbnail.png"), "1920×960");

console.log("\nDone. Output: com.rtheil.weatherflow.sdPlugin/imgs/");
