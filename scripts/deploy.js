/**
 * Copies the built plugin to the Stream Deck plugins directory.
 * Run with: npm run deploy
 */

import { cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pluginId = "com.rtheil.weatherflow.sdPlugin";
const src = join(root, pluginId);

const appData = process.env.APPDATA;
if (!appData) {
  console.error("APPDATA environment variable not found.");
  process.exit(1);
}

const dest = join(appData, "Elgato", "StreamDeck", "Plugins", pluginId);

if (!existsSync(src)) {
  console.error(`Source folder not found: ${src}`);
  process.exit(1);
}

console.log(`Deploying to:\n  ${dest}\n`);

cpSync(src, dest, {
  recursive: true,
  filter: (source) => !source.includes("\\logs\\") && !source.includes("/logs/"),
});

// Restart just the plugin process (requires @elgato/cli to be installed).
try {
  execSync("streamdeck restart com.rtheil.weatherflow", { stdio: "inherit" });
  console.log("Plugin restarted.");
} catch {
  console.log("Done. Restart Stream Deck to pick up the changes.");
  console.log("  Tip: run  npm install -g @elgato/cli  to enable automatic plugin restarts.");
}
