/**
 * Tray weather + the details window. Two providers are tried in order
 * (Open-Meteo, then met.no/Yr - the former is unreachable from Russia); the
 * last working one is remembered in chrome.storage.local. Pure provider logic
 * lives in src/lib/weather.ts.
 */

/* ============================================================
 WEATHER (no API key; Open-Meteo primary + met.no/Yr fallback,
 helpers live in lib/weather — see fetchForecastParsed below)
 ============================================================ */

/** @typedef {import("../types").WinData} WinData */
import { bringToFront, createWindow, restoreWindow } from "./windows";
import { buildForecastUrl, buildGeocodingUrl, buildYrForecastUrl, firstGeocodeHit, formatUpdatedTime, parseWeatherCurrent, parseYrCurrent, WEATHER_PROVIDERS, weatherIcon, windDirName } from "../lib/weather";
import { DEFAULT_SETTINGS } from "../lib/settings";
import { state } from "../state";
import { syncStoredGet } from "./storage";
import { $weather } from "./dom";

function hideWeather() {
    $weather.classList.remove("visible");
    $weather.replaceChildren();
}

function renderWeather(temp, code) {
    const icon = document.createElement("span");
    icon.className = "weather-icon";
    icon.textContent = weatherIcon(code);
    const tempEl = document.createElement("span");
    tempEl.className = "weather-temp";
    tempEl.textContent = `${Math.round(temp)}°`;
    $weather.replaceChildren(icon, tempEl);
    $weather.classList.add("visible");
}

function weatherCityName() {
    return (
        (state.settings && state.settings.weatherCity) ||
        DEFAULT_SETTINGS.weatherCity
    );
}

/** Render the weather emoji as a transparent 32×32 PNG (for the window icon) */
function weatherEmojiDataUrl(code) {
    try {
        const c = document.createElement("canvas");
        c.width = 32;
        c.height = 32;
        const ctx = c.getContext("2d");
        ctx.font = "24px 'Segoe UI Emoji', 'Noto Color Emoji', serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(weatherIcon(code), 16, 18);
        return c.toDataURL();
    } catch {
        return "icons/search.svg";
    }
}

function saveWeatherCache(city, data) {
    const payload = { city, ts: Date.now(), ...data };
    return chrome.storage.local.set({ weather: payload }).catch(() => {});
}

/** Hard cap for one provider attempt. `api.open-meteo.com` is blackholed
    from Russia (the TCP connect just hangs), so without this the fallback
    would never get its turn. */
const WEATHER_FETCH_TIMEOUT_MS = 4000;
const WEATHER_PROVIDER_KEY = "weatherProvider";

/** fetch() → JSON with a per-attempt abort timeout. */
async function fetchJsonWithTimeout(url, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const resp = await fetch(url, {
            mode: "cors",
            signal: ctrl.signal,
        });
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return await resp.json();
    } finally {
        clearTimeout(timer);
    }
}

/** Provider order with the last one that actually worked moved to the
    front, so a blocked provider is only waited out once per session. */
async function weatherProviderOrder() {
    let lastGood = null;
    try {
        const stored = await chrome.storage.local.get(
            WEATHER_PROVIDER_KEY,
        );
        lastGood = stored ? stored[WEATHER_PROVIDER_KEY] : null;
    } catch {
        // keep the default order
    }
    if (!lastGood || WEATHER_PROVIDERS.indexOf(lastGood) < 0) {
        return WEATHER_PROVIDERS.slice();
    }
    return [lastGood, ...WEATHER_PROVIDERS.filter((p) => p !== lastGood)];
}

function rememberWeatherProvider(provider) {
    chrome.storage.local
        .set({ [WEATHER_PROVIDER_KEY]: provider })
        .catch(() => {});
}

/** Walk the provider chain until one yields usable data (null if none do). */
async function fetchForecastParsed(latitude, longitude, city) {
    const order = await weatherProviderOrder();
    const label = formatUpdatedTime(new Date());
    for (const provider of order) {
        try {
            const parsed =
                provider === "yr"
                    ? parseYrCurrent(
                          await fetchJsonWithTimeout(
                              buildYrForecastUrl(latitude, longitude),
                              WEATHER_FETCH_TIMEOUT_MS,
                          ),
                          city,
                          label,
                      )
                    : parseWeatherCurrent(
                          (await fetchJsonWithTimeout(
                              buildForecastUrl(latitude, longitude),
                              WEATHER_FETCH_TIMEOUT_MS,
                          )).current,
                          city,
                          label,
                      );
            if (parsed) {
                rememberWeatherProvider(provider);
                return parsed;
            }
        } catch {
            // This provider is unreachable/blocked — try the next one.
        }
    }
    return null;
}

async function refreshWeather(city) {
    const currentCity =
        city ||
        (state.settings && state.settings.weatherCity) ||
        DEFAULT_SETTINGS.weatherCity;
    try {
        // Resolve city → coordinates
        const geoResp = await fetch(buildGeocodingUrl(currentCity), {
            mode: "cors",
        });
        const geo = await geoResp.json();
        const hit = firstGeocodeHit(geo);
        if (!hit) {
            hideWeather();
            return;
        }
        // Current weather (full set of fields for the details window),
        // falling back to the next provider when this one is unreachable.
        const parsed = await fetchForecastParsed(
            hit.latitude,
            hit.longitude,
            currentCity,
        );
        // Nothing worked — keep whatever the tray already shows (the cached
        // value) rather than clearing it on a transient network failure.
        if (!parsed) return;
        state.weatherData = parsed;
        renderWeather(parsed.temp, parsed.code);
        saveWeatherCache(currentCity, state.weatherData);
        renderOpenWeatherWindow();
    } catch {
        // Offline or blocked — keep showing cached value if any, else nothing
    }
}

/** Read the stored settings + weather cache in parallel (used at startup so
 *  the tray renders the cached value without waiting on anything else) */
async function readCityAndCache() {
    let city =
        (state.settings && state.settings.weatherCity) ||
        DEFAULT_SETTINGS.weatherCity;
    let cache = {};
    try {
        const [settings, stored] = await Promise.all([
            syncStoredGet("settings"),
            chrome.storage.local.get("weather"),
        ]);
        if (settings && settings.weatherCity) {
            city = settings.weatherCity;
        }
        cache = stored || {};
    } catch {
        // keep defaults on failure
    }
    return { city, cache };
}

export async function updateWeather() {
    const { city, cache } = await readCityAndCache();
    // Always show the last saved value immediately (if it matches the
    // current city) so the tray never flicks/clears on load — then refresh
    // in the background so the stale value is replaced as soon as the
    // network responds. If there is no cache for this city yet, fall back
    // to the remote value with nothing shown in the meantime.
    if (cache && typeof cache.temp === "number" && cache.city === city) {
        state.weatherData = cache;
        renderWeather(cache.temp, cache.code);
    } else {
        state.weatherData = null;
        hideWeather();
    }
    refreshWeather(city);
}

/** Re-render the open weather details window (no-op if it is closed) */
function renderOpenWeatherWindow() {
    const win = state.windows.find((w) => w.winType === "weather");
    if (win) renderWeatherWindow(win);
}

/** Fill the weather details window content from state.weatherData */
/** @param {WinData} winData */
function renderWeatherWindow(winData) {
    const el = winData.el;
    const ce = el.querySelector(".win98-window-content");
    const d = state.weatherData;
    ce.replaceChildren();

    const wrap = document.createElement("div");
    wrap.className = "weather-details";

    // Hero panel
    const hero = document.createElement("div");
    hero.className = "weather-hero";
    const icon = document.createElement("span");
    icon.className = "weather-hero-icon";
    icon.textContent = d ? weatherIcon(d.code) : "🌡️";
    const heroInfo = document.createElement("div");
    heroInfo.className = "weather-hero-info";
    const heroTemp = document.createElement("div");
    heroTemp.className = "weather-hero-temp";
    heroTemp.textContent = d ? `${Math.round(d.temp)}°` : "—";
    const heroCity = document.createElement("div");
    heroCity.className = "weather-hero-city";
    heroCity.textContent = d && d.city ? d.city : weatherCityName();
    heroInfo.append(heroTemp, heroCity);
    hero.append(icon, heroInfo);
    wrap.appendChild(hero);

    // Details group box
    const box = document.createElement("div");
    box.className = "win98-groupbox";
    const legend = document.createElement("span");
    legend.className = "win98-groupbox-legend";
    legend.textContent = "Подробнее";
    box.appendChild(legend);

    const rows = [
        [
            "Ощущается как",
            d && d.feelsLike != null ? `${Math.round(d.feelsLike)}°` : "—",
        ],
        [
            "Влажность",
            d && d.humidity != null ? `${Math.round(d.humidity)}%` : "—",
        ],
        [
            "Осадки",
            d && d.precipitation != null
                ? `${d.precipitation} мм`
                : "—",
        ],
        [
            "Ветер",
            d && d.windSpeed != null
                ? `${Math.round(d.windSpeed)} км/ч${
                      d.windDirection != null
                          ? ", " + windDirName(d.windDirection)
                          : ""
                  }`
                : "—",
        ],
        [
            "Облачность",
            d && d.cloudCover != null ? `${d.cloudCover}%` : "—",
        ],
    ];
    rows.forEach(([label, value]) => {
        const row = document.createElement("div");
        row.className = "weather-stat-row";
        const l = document.createElement("span");
        l.className = "weather-stat-label";
        l.textContent = label;
        const v = document.createElement("span");
        v.className = "weather-stat-value";
        v.textContent = value;
        row.append(l, v);
        box.appendChild(row);
    });
    wrap.appendChild(box);
    ce.appendChild(wrap);

    // Status bar
    const sb = el.querySelector(".win98-statusbar-field");
    if (sb) {
        sb.textContent = d && d.updated
            ? `Обновлено: ${d.updated}`
            : "Загрузка данных...";
    }
}

/** Open the single-instance weather details window */
export function openWeatherWindow() {
    const existing = state.windows.find((w) => w.winType === "weather");
    if (existing) {
        if (existing.minimized) restoreWindow(existing.id);
        else bringToFront(existing.id);
        return;
    }
    createWindow({
        winType: "weather",
        title: "Погода",
        icon: state.weatherData
            ? weatherEmojiDataUrl(state.weatherData.code)
            : "icons/search.svg",
        width: 360,
        height: 290,
        content: "",
        statusbar: true,
        statusText: "Загрузка данных...",
        onCreated: (el, winData) => {
            /** @type {HTMLElement} */
            (el.querySelector(".win98-window-content")).style.background =
                "var(--win98-silver)";
            renderWeatherWindow(winData);
        },
    });
    if (!state.weatherData) refreshWeather();
}

// Tray weather: hint + double-click opens the details window
$weather.title = "Двойное нажатие — подробная информация о погоде";
$weather.addEventListener("dblclick", () => openWeatherWindow());
