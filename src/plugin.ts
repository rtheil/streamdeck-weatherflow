import streamDeck from "@elgato/streamdeck";
import { WeatherDisplay, setGlobalSettings, GlobalSettings } from "./actions/weather-display";

const weatherDisplay = new WeatherDisplay();
streamDeck.actions.registerAction(weatherDisplay);

// Cache global settings locally, then refresh buttons.
// Do NOT call getGlobalSettings() from inside updateDisplay — that re-fires this
// event and creates an infinite feedback loop.
streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>((ev) => {
  setGlobalSettings(ev.settings);
  void weatherDisplay.refreshAll();
});

// Fetch global settings once on startup to populate the local cache.
void streamDeck.settings.getGlobalSettings();

streamDeck.connect();
