import { describe, expect, it } from "vitest";
import {
    buildForecastUrl,
    buildGeocodingUrl,
    firstGeocodeHit,
    formatUpdatedTime,
    parseWeatherCurrent,
    weatherIcon,
    windDirName,
} from "../src/lib/weather";

describe("weatherIcon", () => {
    it("maps WMO codes to emoji", () => {
        expect(weatherIcon(0)).toBe("☀️");
        expect(weatherIcon(1)).toBe("🌤️");
        expect(weatherIcon(2)).toBe("⛅");
        expect(weatherIcon(3)).toBe("☁️");
        expect(weatherIcon(45)).toBe("🌫️");
        expect(weatherIcon(48)).toBe("🌫️");
        expect(weatherIcon(51)).toBe("🌧️");
        expect(weatherIcon(61)).toBe("🌧️");
        expect(weatherIcon(66)).toBe("🌧️");
        expect(weatherIcon(67)).toBe("🌧️");
        expect(weatherIcon(71)).toBe("❄️");
        expect(weatherIcon(77)).toBe("❄️");
        expect(weatherIcon(80)).toBe("🌦️");
        expect(weatherIcon(82)).toBe("🌦️");
        expect(weatherIcon(85)).toBe("🌨️");
        expect(weatherIcon(86)).toBe("🌨️");
        expect(weatherIcon(95)).toBe("⛈️");
        expect(weatherIcon(99)).toBe("⛈️");
    });

    it("falls back for unknown/undefined codes", () => {
        expect(weatherIcon(17)).toBe("🌡️");
        expect(weatherIcon(undefined)).toBe("🌡️");
        expect(weatherIcon(null)).toBe("🌡️");
    });
});

describe("windDirName", () => {
    it("maps degrees to Russian compass directions", () => {
        expect(windDirName(0)).toBe("С");
        expect(windDirName(90)).toBe("В");
        expect(windDirName(180)).toBe("Ю");
        expect(windDirName(270)).toBe("З");
    });

    it("handles invalid input", () => {
        expect(windDirName(undefined)).toBe("—");
        expect(windDirName(null)).toBe("—");
        expect(windDirName(NaN)).toBe("—");
    });
});

describe("buildGeocodingUrl", () => {
    it("encodes the city name and requests the Russian label", () => {
        const url = buildGeocodingUrl("Санкт-Петербург");
        expect(url).toContain("name=%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3");
        expect(url).toContain("count=1");
        expect(url).toContain("language=ru");
        expect(url).toContain("format=json");
    });
});

describe("buildForecastUrl", () => {
    it("includes coordinates and the full current field set", () => {
        const url = buildForecastUrl(59.93, 30.36);
        expect(url).toContain("latitude=59.93");
        expect(url).toContain("longitude=30.36");
        expect(url).toContain("temperature_2m");
        expect(url).toContain("weather_code");
        expect(url).toContain("wind_direction_10m");
        expect(url).toContain("cloud_cover");
    });
});

describe("parseWeatherCurrent", () => {
    it("normalizes a full current payload", () => {
        const d = parseWeatherCurrent(
            {
                temperature_2m: 21.5,
                weather_code: 2,
                apparent_temperature: 20.1,
                relative_humidity_2m: 55,
                precipitation: 0.0,
                wind_speed_10m: 4.2,
                wind_direction_10m: 135,
                cloud_cover: 40,
            },
            "Москва",
            "12:00:00",
        );
        expect(d).toEqual({
            city: "Москва",
            temp: 21.5,
            code: 2,
            feelsLike: 20.1,
            humidity: 55,
            precipitation: 0,
            windSpeed: 4.2,
            windDirection: 135,
            cloudCover: 40,
            updated: "12:00:00",
        });
    });

    it("omits missing optional fields", () => {
        const d = parseWeatherCurrent({ temperature_2m: 5 }, "Москва", "t");
        expect(d).toEqual({
            city: "Москва",
            temp: 5,
            code: -1,
            updated: "t",
        });
        expect(d?.feelsLike).toBeUndefined();
    });

    it("rejects payloads without a numeric temperature", () => {
        expect(parseWeatherCurrent(null, "Москва", "t")).toBeNull();
        expect(parseWeatherCurrent({ weather_code: 1 }, "Москва", "t")).toBeNull();
        expect(parseWeatherCurrent("x", "Москва", "t")).toBeNull();
    });
});

describe("firstGeocodeHit", () => {
    it("extracts the first hit's coordinates", () => {
        const hit = firstGeocodeHit({
            results: [{ name: "Москва", latitude: 55.75, longitude: 37.62 }],
        });
        expect(hit).toEqual({ latitude: 55.75, longitude: 37.62 });
    });

    it("returns null for empty/absent results", () => {
        expect(firstGeocodeHit({ results: [] })).toBeNull();
        expect(firstGeocodeHit({})).toBeNull();
        expect(firstGeocodeHit(null)).toBeNull();
        expect(firstGeocodeHit({ results: [{ name: "x" }] })).toBeNull();
    });
});

describe("formatUpdatedTime", () => {
    it("formats a local time label", () => {
        const s = formatUpdatedTime(new Date(2026, 8, 13, 9, 5, 3));
        expect(s).toBe("09:05:03");
    });
});