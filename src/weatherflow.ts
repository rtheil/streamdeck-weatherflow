const BASE_URL = "https://swd.weatherflow.com/swd/rest";

export interface StationObservation {
  timestamp: number;
  air_temperature: number;
  feels_like: number;
  relative_humidity: number;
  dew_point: number;
  wet_bulb_temperature: number;
  wind_avg: number;
  wind_gust: number;
  wind_lull: number;
  wind_direction: number;
  station_pressure: number;
  sea_level_pressure: number;
  pressure_trend: string;
  solar_radiation: number;
  uv: number;
  brightness: number;
  precip_accum_last_1hr: number;
  precip_accum_local_day: number;
  precip_type: number;
  lightning_strike_count: number;
  lightning_strike_count_last_1hr: number;
  lightning_strike_count_last_3hr: number;
  lightning_strike_last_distance: number;
  lightning_strike_last_epoch: number;
}

export interface StationsResponse {
  stations: Array<{
    station_id: number;
    name: string;
  }>;
}

// Cache: one entry per station. Prevents multiple simultaneous buttons from
// hammering the API on startup and avoids 429 rate-limit errors.
const MIN_FETCH_INTERVAL_MS = 60_000; // never fetch the same station more than once per minute

interface CacheEntry {
  obs: StationObservation;
  fetchedAt: number;
  inflight: Promise<StationObservation> | null;
}

const obsCache = new Map<string, CacheEntry>();

export async function getObservations(
  token: string,
  stationId: string
): Promise<StationObservation> {
  const key = stationId;
  const now = Date.now();
  const cached = obsCache.get(key);

  // Return cached value if it is still fresh.
  if (cached && now - cached.fetchedAt < MIN_FETCH_INTERVAL_MS) {
    return cached.obs;
  }

  // Coalesce concurrent requests for the same station into one in-flight fetch.
  if (cached?.inflight) {
    return cached.inflight;
  }

  const inflight: Promise<StationObservation> = (async () => {
    try {
      const url = `${BASE_URL}/observations/station/${stationId}?token=${encodeURIComponent(token)}`;
      const response = await fetch(url);

      if (!response.ok) {
        // On 429 serve stale cache rather than surfacing an error, if available.
        if (response.status === 429 && cached) {
          return cached.obs;
        }
        throw new Error(`WeatherFlow API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as { obs: StationObservation[] };

      if (!data.obs || data.obs.length === 0) {
        throw new Error("No observations available from station");
      }

      const obs = data.obs[0];
      obsCache.set(key, { obs, fetchedAt: Date.now(), inflight: null });
      return obs;
    } catch (err) {
      // Clear the inflight pointer on failure so future calls retry instead of
      // re-awaiting this rejected promise forever. Preserve any prior cached
      // obs as stale fallback data.
      const prev = obsCache.get(key);
      if (prev) prev.inflight = null;
      throw err;
    }
  })();

  // Store the in-flight promise so concurrent callers await the same request.
  obsCache.set(key, { obs: cached?.obs ?? ({} as StationObservation), fetchedAt: cached?.fetchedAt ?? 0, inflight });

  return inflight;
}

export async function getStations(token: string): Promise<StationsResponse> {
  const url = `${BASE_URL}/stations?token=${encodeURIComponent(token)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`WeatherFlow API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<StationsResponse>;
}

// --- Unit conversion helpers ---

export const cToF = (c: number): number => (c * 9) / 5 + 32;
export const msToMph = (ms: number): number => ms * 2.23694;
export const msToKph = (ms: number): number => ms * 3.6;
export const hpaToInHg = (hpa: number): number => hpa * 0.02953;
export const mmToIn = (mm: number): number => mm * 0.03937;
export const kmToMiles = (km: number): number => km * 0.62137;

export function degreesToCompass(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export function pressureTrendLabel(trend: string): string {
  if (trend === "rising") return "rising";
  if (trend === "falling") return "falling";
  return "steady";
}

export function uvLevel(uv: number): string {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Mod";
  if (uv <= 7) return "High";
  if (uv <= 10) return "V.High";
  return "Extreme";
}
