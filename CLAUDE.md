# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development

```bash
npm install
npm run create-icons   # generate placeholder PNGs (only needed once or after icon changes)
npm run build          # production build via Rollup → com.ricky.weatherflow.sdPlugin/bin/plugin.js
npm run watch          # dev mode — rebuilds on file changes with source maps
```

No test runner or linter is configured.

To sideload, copy `com.ricky.weatherflow.sdPlugin/` to the Stream Deck plugins directory and restart Stream Deck.

## Architecture

This is an Elgato Stream Deck plugin built on `@elgato/streamdeck` SDK v1. TypeScript source is bundled by Rollup into a single `bin/plugin.js` inside the `.sdPlugin` folder. The plugin runs as a Node.js process managed by Stream Deck.

### Global settings feedback-loop hazard

The plugin uses a **two-tier settings model**: global settings (API token, station ID) shared across all buttons, and per-button settings (metric, units, refresh interval). Global settings are cached in a module-level variable (`currentGlobalSettings` in `weather-display.ts`) and updated via `setGlobalSettings()` called from `plugin.ts`. **Never call `streamDeck.settings.getGlobalSettings()` from inside `updateDisplay`** — it fires `onDidReceiveGlobalSettings`, which calls `refreshAll()`, which calls `updateDisplay()` again, creating an infinite loop.

### API client caching

`weatherflow.ts` caches observations per station with a 60-second TTL and coalesces concurrent in-flight requests to the same station. This prevents multiple buttons from hammering the API on startup. On HTTP 429, stale cached data is returned instead of throwing.

### Property Inspector

`ui/weather-display.html` is vanilla HTML/JS that communicates with Stream Deck via raw WebSocket (no framework). It manages both global settings (token, station ID) and per-button settings (metric, units, refresh interval) with debounced saves.

## Key identifiers

- Plugin UUID: `com.ricky.weatherflow`
- Action UUID: `com.ricky.weatherflow.weatherdisplay`
- WeatherFlow REST base: `https://swd.weatherflow.com/swd/rest`
- All API values arrive in metric; the plugin converts to imperial when the user selects it.
