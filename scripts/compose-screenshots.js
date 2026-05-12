/**
 * Composes raw screenshots from screenshots/raw/ into Marketplace-ready
 * 1920×960 listing images on a purple gradient background. Output goes to
 * screenshots/listing/.
 *
 * Run with: npm run compose-screenshots
 */

import sharp from "sharp";
import { readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const rawDir = join(root, "screenshots", "raw");
const outDir = join(root, "screenshots", "listing");

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const W = 1920, H = 960;

// Gradient color schemes cycled across listing images for visual variety.
const gradients = [
  { from: "#5E2A77", to: "#C28FE5" }, // deep purple → light lavender
  { from: "#2D1B5F", to: "#7B5FB6" }, // indigo → medium violet
  { from: "#3F1F5A", to: "#9B59B6" }, // dark plum → brand purple
];

// Title text overlaid above each screenshot. Key is the basename of the source
// file in screenshots/raw/ (without extension).
const captions = {
  "all-tiles":      "Display Temperature, Humidity, Pressure, wind speed, and more!",
  "configuration":  "Choose what to display, Imperial or Metric units, and refresh rate",
};

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  }[c]));
}

function makeBgSvg({ from, to }, title) {
  const titleEl = title
    ? `<text x="${W / 2}" y="125"
            text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif"
            font-weight="700" font-size="56"
            fill="#FFFFFF">${escapeXml(title)}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  ${titleEl}
</svg>`;
}

/** Render the screenshot at a fitted size and a subtle drop-shadow underlay. */
async function prepWithShadow(path, maxW, maxH) {
  const meta = await sharp(path).metadata();
  const scale = Math.min(maxW / meta.width, maxH / meta.height);
  const w = Math.round(meta.width * scale);
  const h = Math.round(meta.height * scale);
  const buf = await sharp(path).resize(w, h).png().toBuffer();

  // Build a soft shadow: a slightly-larger blurred dark rectangle. We can't
  // easily blur the actual screenshot shape with sharp, so we just emit a
  // shape-matching shadow rect.
  const shadowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w + 60}" height="${h + 60}">
    <filter id="b"><feGaussianBlur stdDeviation="14"/></filter>
    <rect x="30" y="36" width="${w}" height="${h}" rx="6" ry="6" fill="rgba(0,0,0,0.45)" filter="url(#b)"/>
  </svg>`;
  const shadow = await sharp(Buffer.from(shadowSvg)).png().toBuffer();

  return { buf, w, h, shadow, shadowW: w + 60, shadowH: h + 60 };
}

async function composeSingle(srcPath, outPath, scheme, title) {
  const bg = sharp(Buffer.from(makeBgSvg(scheme, title))).png();
  // Smaller than before to leave room for the title at top of canvas.
  const { buf, w, h, shadow, shadowW, shadowH } = await prepWithShadow(srcPath, 1300, 620);

  // Vertically center within the area below the title band (y=200 to y=900).
  const areaTop = 200, areaBot = 900;
  const x = Math.round((W - w) / 2);
  const y = areaTop + Math.round(((areaBot - areaTop) - h) / 2);
  const sx = Math.round((W - shadowW) / 2);
  const sy = y - 24;

  await bg.composite([
    { input: shadow, left: sx, top: sy },
    { input: buf, left: x, top: y },
  ]).toFile(outPath);

  console.log(`Created ${basename(outPath)} (screenshot ${w}×${h}${title ? `, titled` : ""})`);
}

async function composeSideBySide(leftPath, rightPath, outPath, scheme) {
  const bg = sharp(Buffer.from(makeBgSvg(scheme))).png();
  // Two screenshots each constrained to ~half-width with side+vertical padding.
  const halfMaxW = 820;
  const maxH = 760;
  const L = await prepWithShadow(leftPath, halfMaxW, maxH);
  const R = await prepWithShadow(rightPath, halfMaxW, maxH);

  // Center each in its half of the canvas.
  const Lx = Math.round((W / 2 - L.w) / 2);
  const Rx = Math.round(W / 2 + (W / 2 - R.w) / 2);
  const Ly = Math.round((H - L.h) / 2);
  const Ry = Math.round((H - R.h) / 2);
  const Lsx = Lx - 30, Lsy = Ly - 24;
  const Rsx = Rx - 30, Rsy = Ry - 24;

  await bg.composite([
    { input: L.shadow, left: Lsx, top: Lsy },
    { input: L.buf, left: Lx, top: Ly },
    { input: R.shadow, left: Rsx, top: Rsy },
    { input: R.buf, left: Rx, top: Ry },
  ]).toFile(outPath);

  console.log(`Created ${basename(outPath)} (side-by-side)`);
}

// Process each raw image individually.
const sources = readdirSync(rawDir)
  .filter((f) => /\.(png|jpg|jpeg)$/i.test(f))
  .sort();

if (sources.length === 0) {
  console.error("No source screenshots found in screenshots/raw/. Drop some in there first.");
  process.exit(1);
}

for (let i = 0; i < sources.length; i++) {
  const src = sources[i];
  const baseName = basename(src, extname(src));
  await composeSingle(
    join(rawDir, src),
    join(outDir, `${baseName}.png`),
    gradients[i % gradients.length],
    captions[baseName],
  );
}

// If we have exactly two source images, also produce a combined "hero" image so
// you meet Marketplace's 3-image minimum from just two raw screenshots.
if (sources.length === 2) {
  await composeSideBySide(
    join(rawDir, sources[0]),
    join(rawDir, sources[1]),
    join(outDir, "overview.png"),
    gradients[2],
  );
}

console.log(`\nDone. Output: screenshots/listing/`);
