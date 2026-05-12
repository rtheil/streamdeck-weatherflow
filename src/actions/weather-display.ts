import streamDeck, {
  action,
  DidReceiveSettingsEvent,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";

import {
  cToF,
  degreesToCompass,
  getObservations,
  hpaToInHg,
  kmToMiles,
  mmToIn,
  msToMph,
  pressureTrendLabel,
  StationObservation,
  uvLevel,
} from "../weatherflow";

export type WeatherMetric =
  | "temperature"
  | "feels_like"
  | "humidity"
  | "dew_point"
  | "wind"
  | "wind_gust"
  | "pressure"
  | "uv"
  | "solar"
  | "precipitation"
  | "lightning"
  | "thp";

export type UnitSystem = "imperial" | "metric";

export type Settings = {
  metric: WeatherMetric;
  units: UnitSystem;
  refreshInterval: number; // minutes
};

export type GlobalSettings = {
  token: string;
  stationId: string;
};

const DEFAULT_SETTINGS: Settings = {
  metric: "temperature",
  units: "imperial",
  refreshInterval: 5,
};

// Local copy of global settings. Updated by plugin.ts via setGlobalSettings()
// whenever Stream Deck sends a didReceiveGlobalSettings event.
// Never call streamDeck.settings.getGlobalSettings() from inside updateDisplay —
// that call re-fires the didReceiveGlobalSettings event and causes an infinite loop.
let currentGlobalSettings: GlobalSettings = { token: "", stationId: "" };

export function setGlobalSettings(gs: GlobalSettings): void {
  currentGlobalSettings = gs;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAction = any;

function formatMetric(
  obs: StationObservation,
  settings: Settings
): { value: string; label: string } {
  const imperial = settings.units === "imperial";

  switch (settings.metric) {
    case "temperature": {
      const temp = imperial ? cToF(obs.air_temperature) : obs.air_temperature;
      const unit = imperial ? "°F" : "°C";
      return { value: `${temp.toFixed(1)}${unit}`, label: "Temp" };
    }

    case "feels_like": {
      const temp = imperial ? cToF(obs.feels_like) : obs.feels_like;
      const unit = imperial ? "°F" : "°C";
      return { value: `${temp.toFixed(1)}${unit}`, label: "Feels Like" };
    }

    case "humidity":
      return { value: `${obs.relative_humidity.toFixed(0)}%`, label: "Humidity" };

    case "dew_point": {
      const temp = imperial ? cToF(obs.dew_point) : obs.dew_point;
      const unit = imperial ? "°F" : "°C";
      return { value: `${temp.toFixed(1)}${unit}`, label: "Dew Point" };
    }

    case "wind": {
      const speed = imperial ? msToMph(obs.wind_avg) : obs.wind_avg;
      const unit = imperial ? "mph" : "m/s";
      const dir = degreesToCompass(obs.wind_direction);
      return { value: `${speed.toFixed(1)} ${unit}`, label: `Wind ${dir}` };
    }

    case "wind_gust": {
      const speed = imperial ? msToMph(obs.wind_gust) : obs.wind_gust;
      const unit = imperial ? "mph" : "m/s";
      return { value: `${speed.toFixed(1)} ${unit}`, label: "Gust" };
    }

    case "pressure": {
      const pressure = imperial
        ? hpaToInHg(obs.sea_level_pressure)
        : obs.sea_level_pressure;
      const unit = imperial ? "inHg" : "hPa";
      const trend = pressureTrendLabel(obs.pressure_trend);
      return {
        value: `${pressure.toFixed(imperial ? 2 : 0)} ${unit}`,
        label: `Pressure\n${trend}`,
      };
    }

    case "uv":
      return {
        value: obs.uv.toFixed(1),
        label: `UV (${uvLevel(obs.uv)})`,
      };

    case "solar":
      return { value: `${obs.solar_radiation}`, label: "W/m² Solar" };

    case "precipitation": {
      const precip = imperial
        ? mmToIn(obs.precip_accum_local_day)
        : obs.precip_accum_local_day;
      const unit = imperial ? "in" : "mm";
      return { value: `${precip.toFixed(imperial ? 2 : 1)} ${unit}`, label: "Rain Today" };
    }

    case "lightning": {
      const dist = obs.lightning_strike_last_distance;
      const distFmt = imperial
        ? `${kmToMiles(dist).toFixed(0)} mi`
        : `${dist} km`;
      const count = obs.lightning_strike_count_last_1hr;
      return {
        value: `${count} ⚡`,
        label: count > 0 ? `Last: ${distFmt}` : "Last 1hr",
      };
    }

    case "thp": {
      const temp = imperial ? cToF(obs.air_temperature) : obs.air_temperature;
      const tempUnit = imperial ? "°F" : "°C";
      const pressure = imperial ? hpaToInHg(obs.sea_level_pressure) : obs.sea_level_pressure;
      const pressureUnit = imperial ? "inHg" : "hPa";
      return {
        value: `${temp.toFixed(1)}${tempUnit}\n\n${obs.relative_humidity.toFixed(0)}% RH\n\n${pressure.toFixed(imperial ? 2 : 0)} ${pressureUnit}`,
        label: "",
      };
    }

    default:
      return { value: "N/A", label: "Unknown" };
  }
}

@action({ UUID: "com.rtheil.weatherflow.weatherdisplay" })
export class WeatherDisplay extends SingletonAction<Settings> {
  private readonly activeActions = new Map<string, AnyAction>();
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();

  override async onWillAppear(ev: WillAppearEvent<Settings>): Promise<void> {
    this.activeActions.set(ev.action.id, ev.action);
    const settings = { ...DEFAULT_SETTINGS, ...ev.payload.settings };
    await this.scheduleRefresh(ev.action, settings);
  }

  override onWillDisappear(ev: WillDisappearEvent<Settings>): void {
    this.stopTimer(ev.action.id);
    this.activeActions.delete(ev.action.id);
  }

  override async onKeyDown(ev: KeyDownEvent<Settings>): Promise<void> {
    const settings = { ...DEFAULT_SETTINGS, ...ev.payload.settings };
    await this.updateDisplay(ev.action, settings);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<Settings>
  ): Promise<void> {
    const settings = { ...DEFAULT_SETTINGS, ...ev.payload.settings };
    await this.scheduleRefresh(ev.action, settings);
  }

  /** Called from plugin.ts after global settings (token/station) are updated. */
  async refreshAll(): Promise<void> {
    for (const [, act] of this.activeActions) {
      const settings = { ...DEFAULT_SETTINGS, ...(await act.getSettings()) } as Settings;
      await this.updateDisplay(act, settings);
    }
  }

  private stopTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearInterval(timer);
      this.timers.delete(id);
    }
  }

  private async scheduleRefresh(
    act: AnyAction,
    settings: Settings
  ): Promise<void> {
    this.stopTimer(act.id as string);

    await this.updateDisplay(act, settings);

    // Guard against a 0 or missing refreshInterval causing a tight loop.
    const intervalMinutes = settings.refreshInterval > 0 ? settings.refreshInterval : 5;
    const intervalMs = intervalMinutes * 60 * 1000;

    const timer = setInterval(async () => {
      const current = {
        ...DEFAULT_SETTINGS,
        ...(await act.getSettings()),
      } as Settings;
      await this.updateDisplay(act, current);
    }, intervalMs);

    this.timers.set(act.id as string, timer);
  }

  private async updateDisplay(act: AnyAction, settings: Settings): Promise<void> {
    // Use the locally-cached global settings. Do NOT call
    // streamDeck.settings.getGlobalSettings() here — that call fires
    // onDidReceiveGlobalSettings, which calls refreshAll(), which calls
    // updateDisplay() again → infinite feedback loop.
    const { token, stationId } = currentGlobalSettings;

    if (!token || !stationId) {
      await act.setTitle("Setup\nNeeded");
      return;
    }

    try {
      const obs = await getObservations(token, stationId);
      const { value, label } = formatMetric(obs, settings);
      await act.setTitle(label ? `${value}\n${label}` : value);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      streamDeck.logger.error(`WeatherFlow fetch failed: ${msg}`);
      await act.setTitle("API\nError");
    }
  }
}
