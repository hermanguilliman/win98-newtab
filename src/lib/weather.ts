/**
 * Weather (no API key): URL construction, WMO code mapping and response
 * normalization for every supported forecast provider. Pure logic — no DOM,
 * no chrome.*, no fetch here; app.js owns the actual network calls, the
 * provider fallback chain and the UI.
 *
 * Why more than one provider: `api.open-meteo.com` is unreachable from Russia
 * (the TCP connection is blackholed, it never times out on its own), while
 * `api.met.no` (Yr) answers there — and vice versa. app.js walks
 * `WEATHER_PROVIDERS` in order with a per-attempt timeout and remembers the
 * last provider that worked, so nobody pays the timeout twice.
 */

/** Forecast provider ids, in default try-order (first = Open-Meteo). */
export type WeatherProviderId = "open-meteo" | "yr";

export const WEATHER_PROVIDERS: readonly WeatherProviderId[] = [
    "open-meteo",
    "yr",
];

/** Normalize a coordinate so a provider gets a stable decimal representation. */
function coord(value: number): string {
    return Number(value.toFixed(4)).toString();
}


/** Normalized current-weather record as the app renders it. */
export interface WeatherData {
    city: string;
    temp: number;
    code: number;
    feelsLike?: number;
    humidity?: number;
    precipitation?: number;
    windSpeed?: number;
    windDirection?: number;
    cloudCover?: number;
    updated: string;
}

/** Map WMO weather code → emoji icon (Open-Meteo `weather_code`). */
export function weatherIcon(code: number | undefined | null): string {
    if (code == null) return "🌡️";
    if (code === 0) return "☀️";
    if (code === 1) return "🌤️";
    if (code === 2) return "⛅";
    if (code === 3) return "☁️";
    if (code === 45 || code === 48) return "🌫️";
    if (code >= 51 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 77) return "❄️";
    if (code >= 80 && code <= 82) return "🌦️";
    if (code === 85 || code === 86) return "🌨️";
    if (code >= 95) return "⛈️";
    return "🌡️";
}

const WIND_DIRS = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"] as const;

/** Map wind bearing (deg) → Russian compass direction. */
export function windDirName(deg: number | undefined | null): string {
    if (deg == null || !Number.isFinite(deg)) return "—";
    return WIND_DIRS[Math.round(((deg % 360) / 45)) % 8];
}

/** Open-Meteo geocoding search URL (Russian label). */
export function buildGeocodingUrl(city: string): string {
    return (
        "https://geocoding-api.open-meteo.com/v1/search" +
        `?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`
    );
}

/** Open-Meteo current-weather forecast URL for the given coordinates. */
export function buildForecastUrl(latitude: number, longitude: number): string {
    return (
        "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${latitude}&longitude=${longitude}` +
        "&current=temperature_2m,weather_code,apparent_temperature," +
        "relative_humidity_2m,precipitation,wind_speed_10m," +
        "wind_direction_10m,cloud_cover"
    );
}

/**
 * Normalize the raw `current` object from a forecast response plus the
 * resolved city name into a WeatherData record. Returns null when the
 * payload has no usable current block.
 */
export function parseWeatherCurrent(
    current: unknown,
    city: string,
    updated: string,
): WeatherData | null {
    if (!current || typeof current !== "object") return null;
    const c = current as Record<string, unknown>;
    if (typeof c.temperature_2m !== "number") return null;
    return {
        city,
        temp: c.temperature_2m,
        code: typeof c.weather_code === "number" ? c.weather_code : -1,
        feelsLike: numOrUndef(c.apparent_temperature),
        humidity: numOrUndef(c.relative_humidity_2m),
        precipitation: numOrUndef(c.precipitation),
        windSpeed: numOrUndef(c.wind_speed_10m),
        windDirection: numOrUndef(c.wind_direction_10m),
        cloudCover: numOrUndef(c.cloud_cover),
        updated,
    };
}

/** Yr/met.no compact forecast URL for the given coordinates (fallback provider). */
export function buildYrForecastUrl(latitude: number, longitude: number): string {
    return (
        "https://api.met.no/weatherapi/locationforecast/2.0/compact" +
        `?lat=${coord(latitude)}&lon=${coord(longitude)}`
    );
}

/**
 * Derive a WMO weather code from plain conditions — met.no's "instant" block
 * has cloud cover and precipitation but no weather code of its own, so map it
 * into the same WMO space `weatherIcon()` understands.
 */
export function weatherCodeFromConditions(
    cloudCover: number | undefined,
    precipitation: number | undefined,
    tempC: number | undefined,
): number {
    const precip = precipitation ?? 0;
    if (precip > 0) {
        const freezing = tempC != null && tempC <= 0;
        if (freezing) return precip >= 1 ? 86 : 71;
        if (precip >= 2) return 82;
        if (precip >= 0.5) return 61;
        return 51;
    }
    if (cloudCover == null || !Number.isFinite(cloudCover)) return -1;
    if (cloudCover < 10) return 0;
    if (cloudCover < 40) return 1;
    if (cloudCover < 85) return 2;
    return 3;
}

/**
 * Feels-like temperature in °C: NWS wind chill when cold and windy, Rothfusz
 * heat index when hot, otherwise the air temperature itself.
 */
export function apparentTemperature(
    tempC: number,
    humidity: number,
    windKmh: number,
): number {
    if (tempC <= 10 && windKmh >= 4.8) {
        const v = Math.pow(windKmh, 0.16);
        return 13.12 + 0.6215 * tempC - 11.37 * v + 0.3965 * tempC * v;
    }
    if (tempC >= 26.7) {
        const rh = Math.min(100, Math.max(0, humidity));
        const hi =
            -8.784695 +
            1.61139411 * tempC +
            2.338549 * rh -
            0.14611605 * tempC * rh -
            0.012308094 * tempC * tempC -
            0.016424828 * rh * rh +
            0.002211732 * tempC * tempC * rh +
            0.00072546 * tempC * rh * rh -
            0.000003582 * tempC * tempC * rh * rh;
        return hi;
    }
    return tempC;
}

/**
 * Normalize a met.no / Yr `locationforecast/2.0/compact` payload into
 * WeatherData. Returns null when there is no usable instant data.
 *
 * Wind is converted m/s → km/h (the app renders `км/ч`), cloud cover is
 * rounded to a whole percent and the "updated" label prefers the model time
 * from `properties.meta.updated_at` over the passed-in fallback.
 */
export function parseYrCurrent(
    payload: unknown,
    city: string,
    updated: string,
): WeatherData | null {
    if (!payload || typeof payload !== "object") return null;
    const root = payload as {
        properties?: {
            meta?: { updated_at?: unknown };
            timeseries?: unknown;
        };
    };
    const props = root.properties;
    if (!props || !Array.isArray(props.timeseries) || props.timeseries.length === 0) {
        return null;
    }
    const head = props.timeseries[0] as {
        data?: { instant?: { details?: Record<string, unknown> } };
    };
    const details = head && head.data && head.data.instant
        ? head.data.instant.details
        : undefined;
    if (!details || typeof details.air_temperature !== "number") return null;

    const temp = details.air_temperature;
    const cloudCover = numOrUndef(details.cloud_area_fraction);
    const precipitation = numOrUndef(details.precipitation_amount);
    const humidity = numOrUndef(details.relative_humidity);
    const windMs = numOrUndef(details.wind_speed);
    const updatedAt = props.meta ? props.meta.updated_at : undefined;

    return {
        city,
        temp,
        code: weatherCodeFromConditions(cloudCover, precipitation, temp),
        feelsLike:
            humidity != null && windMs != null
                ? apparentTemperature(temp, humidity, windMs * 3.6)
                : undefined,
        humidity,
        precipitation,
        windSpeed: windMs != null ? windMs * 3.6 : undefined,
        windDirection: numOrUndef(details.wind_from_direction),
        cloudCover: cloudCover != null ? Math.round(cloudCover) : undefined,
        updated: labelFromIso(updatedAt) ?? updated,
    };
}

function labelFromIso(iso: unknown): string | undefined {
    if (typeof iso !== "string") return undefined;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? undefined : formatUpdatedTime(d);
}

/** Extract the first geocoding hit (lat/lon) from an Open-Meteo search response. */
export function firstGeocodeHit(
    geo: unknown,
): { latitude: number; longitude: number } | null {
    if (!geo || typeof geo !== "object") return null;
    const g = geo as { results?: unknown };
    const hit = Array.isArray(g.results) ? g.results[0] : undefined;
    if (!hit || typeof hit !== "object") return null;
    const h = hit as Record<string, unknown>;
    if (
        typeof h.latitude !== "number" ||
        typeof h.longitude !== "number"
    ) {
        return null;
    }
    return { latitude: h.latitude, longitude: h.longitude };
}

/** `hh:mm:ss`-style local time label for the "updated" field. */
export function formatUpdatedTime(date: Date): string {
    return date.toLocaleTimeString("ru-RU");
}

function numOrUndef(v: unknown): number | undefined {
    return typeof v === "number" ? v : undefined;
}