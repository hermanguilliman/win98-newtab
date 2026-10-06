import { describe, expect, it } from "vitest";
import {
    apparentTemperature,
    buildForecastUrl,
    buildGeocodingUrl,
    buildYrForecastUrl,
    firstGeocodeHit,
    formatUpdatedTime,
    parseWeatherCurrent,
    parseYrCurrent,
    weatherCodeFromConditions,
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

describe("buildYrForecastUrl", () => {
    it("points at met.no with rounded coordinates", () => {
        expect(buildYrForecastUrl(55.7558, 37.6173)).toBe(
            "https://api.met.no/weatherapi/locationforecast/2.0/compact" +
                "?lat=55.7558&lon=37.6173",
        );
    });
});

describe("weatherCodeFromConditions", () => {
    it("maps cloud cover to clear/partly/overcast codes", () => {
        expect(weatherCodeFromConditions(0, 0, 10)).toBe(0);
        expect(weatherCodeFromConditions(25, 0, 10)).toBe(1);
        expect(weatherCodeFromConditions(60, 0, 10)).toBe(2);
        expect(weatherCodeFromConditions(95, 0, 10)).toBe(3);
    });

    it("maps precipitation intensity to drizzle/rain/showers", () => {
        expect(weatherCodeFromConditions(80, 0.1, 5)).toBe(51);
        expect(weatherCodeFromConditions(80, 0.5, 5)).toBe(61);
        expect(weatherCodeFromConditions(80, 2.5, 5)).toBe(82);
    });

    it("maps freezing precipitation to snow codes", () => {
        expect(weatherCodeFromConditions(80, 0.4, -2)).toBe(71);
        expect(weatherCodeFromConditions(80, 3, -2)).toBe(86);
    });

    it("returns -1 when nothing is known", () => {
        expect(weatherCodeFromConditions(undefined, undefined, 5)).toBe(-1);
        expect(weatherCodeFromConditions(Number.NaN, 0, 5)).toBe(-1);
    });
});

describe("apparentTemperature", () => {
    it("stays at the air temperature in the comfortable range", () => {
        expect(apparentTemperature(18, 60, 0)).toBeCloseTo(18, 5);
        expect(apparentTemperature(5, 60, 3)).toBeCloseTo(5, 5);
    });

    it("applies wind chill when cold and windy", () => {
        // NWS metric wind chill, -10 °C at 10 km/h ≈ -15.3 °C
        expect(apparentTemperature(-10, 50, 10)).toBeCloseTo(-15.3, 0);
        // ...but not without wind
        expect(apparentTemperature(-10, 50, 0)).toBeCloseTo(-10, 5);
    });

    it("applies the heat index when hot", () => {
        // Rothfusz reference: 30 °C / 60 % ≈ 32.7 °C
        expect(apparentTemperature(30, 60, 0)).toBeCloseTo(32.7, 0);
    });
});

describe("parseYrCurrent", () => {
    const payload = (details: Record<string, unknown>, updatedAt?: string) => ({
        properties: {
            meta: updatedAt === undefined ? undefined : { updated_at: updatedAt },
            timeseries: [{ data: { instant: { details } } }],
        },
    });

    it("normalizes the instant block into WeatherData", () => {
        const d = parseYrCurrent(
            payload(
                {
                    air_temperature: 12.8,
                    cloud_area_fraction: 89.8,
                    precipitation_amount: 0.6,
                    relative_humidity: 71,
                    wind_speed: 4.2,
                    wind_from_direction: 230,
                },
                "2026-10-06T13:18:03Z",
            ),
            "Москва",
            "fallback",
        );
        expect(d).toEqual({
            city: "Москва",
            temp: 12.8,
            code: 61,
            feelsLike: expect.any(Number),
            humidity: 71,
            precipitation: 0.6,
            windSpeed: expect.closeTo(15.12, 2),
            windDirection: 230,
            cloudCover: 90,
            updated: formatUpdatedTime(new Date("2026-10-06T13:18:03Z")),
        });
    });

    it("falls back to the passed label when meta has no timestamp", () => {
        const d = parseYrCurrent(payload({ air_temperature: 7 }), "Москва", "t");
        expect(d?.updated).toBe("t");
        expect(d?.code).toBe(-1);
        expect(d?.feelsLike).toBeUndefined();
    });

    it("rejects payloads without instant data", () => {
        expect(parseYrCurrent(null, "Москва", "t")).toBeNull();
        expect(parseYrCurrent({}, "Москва", "t")).toBeNull();
        expect(
            parseYrCurrent({ properties: { timeseries: [] } }, "Москва", "t"),
        ).toBeNull();
        expect(
            parseYrCurrent(
                { properties: { timeseries: [{ data: {} }] } },
                "Москва",
                "t",
            ),
        ).toBeNull();
        expect(
            parseYrCurrent(
                payload({ air_temperature: "cold" }),
                "Москва",
                "t",
            ),
        ).toBeNull();
    });
});