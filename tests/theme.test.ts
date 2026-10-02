import { describe, expect, it } from "vitest";
import {
    CUSTOM_THEME_KEYS,
    THEME_COLORS,
    THEME_OPTIONS,
    shadeColor,
    themeColorsFor,
    themeResetKeys,
} from "../src/lib/theme";

describe("shadeColor", () => {
    it("lightens and darkens #rrggbb", () => {
        // +35 on navy: B 128 + 45 = 173 → #0000ad
        expect(shadeColor("#000080", 35)).toBe("#0000ad");
        expect(shadeColor("#00ff00", 0)).toBe("#00ff00");
        expect(shadeColor("#ffffff", 100)).toBe("#ffffff");
        expect(shadeColor("#000000", -100)).toBe("#000000");
        expect(shadeColor("#000080", -45)).toBe("#000046");
    });
});

describe("themeColorsFor", () => {
    it("classic → null (CSS defaults win)", () => {
        expect(themeColorsFor("classic", {})).toBeNull();
    });

    it("built-in palettes are returned verbatim", () => {
        expect(themeColorsFor("olive", {})).toBe(THEME_COLORS.olive);
        expect(themeColorsFor("ocean", {})).toBe(THEME_COLORS.ocean);
        expect(themeColorsFor("lavender", {})).toBe(THEME_COLORS.lavender);
    });

    it("unknown ids → null", () => {
        expect(themeColorsFor("neon", {})).toBeNull();
    });

    it("custom derives title gradients from navy/shadow", () => {
        const colors = themeColorsFor("custom", {
            "--win98-navy": "#000080",
            "--win98-shadow": "#808080",
        });
        expect(colors).toEqual({
            "--win98-navy": "#000080",
            "--win98-shadow": "#808080",
            "--win98-title-active": "linear-gradient(90deg, #000080, #0000ad)",
            "--win98-title-inactive": "linear-gradient(90deg, #808080, #adadad)",
        });
    });

    it("custom without overrides uses fallbacks #000080 / #808080", () => {
        const colors = themeColorsFor("custom", {});
        expect(colors?.["--win98-title-active"]).toBe(
            "linear-gradient(90deg, #000080, #0000ad)",
        );
    });
});

describe("themeResetKeys", () => {
    it("contains every variable from all palettes plus custom keys", () => {
        const keys = themeResetKeys();
        Object.values(THEME_COLORS).forEach((palette) =>
            Object.keys(palette).forEach((k) => expect(keys).toContain(k)),
        );
        CUSTOM_THEME_KEYS.forEach((k) => expect(keys).toContain(k.css));
    });

    it("has no duplicates and covers the classic variables", () => {
        const keys = themeResetKeys();
        expect(new Set(keys).size).toBe(keys.length);
        expect(keys).toContain("--win98-silver");
        expect(keys).toContain("--win98-title-active");
        expect(keys).toContain("--win98-black");
    });
});

describe("theme catalog sanity", () => {
    it("THEME_OPTIONS covers all THEME_COLORS ids plus custom", () => {
        const ids = THEME_OPTIONS.map((t) => t.id);
        expect(ids).toContain("classic");
        expect(ids).toContain("custom");
        Object.keys(THEME_COLORS).forEach((id) => expect(ids).toContain(id));
    });

    it("classic has no palette object", () => {
        expect(THEME_COLORS["classic"]).toBeUndefined();
    });
});