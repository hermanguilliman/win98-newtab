/**
 * Weather (Open-Meteo, no API key): URL construction, WMO code mapping and
 * response normalization. Pure logic — no DOM, no chrome.*, no fetch here;
 * app.js owns the actual network calls and the UI.
 */

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