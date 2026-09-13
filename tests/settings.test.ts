import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, mergeSettings } from "../src/lib/settings";
import type { Settings } from "../src/lib/settings";

describe("mergeSettings", () => {
    it("null/undefined → pristine defaults", () => {
        expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
        expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    });

    it("returns a deep clone — mutations never leak into defaults", () => {
        const s = mergeSettings({ weatherCity: "Казань" });
        s.wallpaper.color = "#000000";
        s.customColors["--win98-navy"] = "#123456";
        expect(DEFAULT_SETTINGS.wallpaper.color).toBe("#008080");
        expect(DEFAULT_SETTINGS.customColors["--win98-navy"]).toBeUndefined();
    });

    it("applies valid scalar settings", () => {
        const s = mergeSettings({
            clickMode: "single",
            iconSize: 48,
            labelSize: 15,
            iconGap: 12,
            desktopPadX: 30,
            desktopPadY: 40,
            folderIconStyle: "glossy",
            folderViewMode: "list",
            theme: "dracula",
            weatherCity: "  Санкт-Петербург  ",
            showClock: false,
            showClockDate: false,
            showClockWeekday: false,
            iconLabelShadow: false,
            taskbarAutoHide: true,
            taskbarSmallIcons: true,
        });
        expect(s.clickMode).toBe("single");
        expect(s.iconSize).toBe(48);
        expect(s.labelSize).toBe(15);
        expect(s.iconGap).toBe(12);
        expect(s.desktopPadX).toBe(30);
        expect(s.desktopPadY).toBe(40);
        expect(s.folderIconStyle).toBe("glossy");
        expect(s.folderViewMode).toBe("list");
        expect(s.theme).toBe("dracula");
        expect(s.weatherCity).toBe("Санкт-Петербург"); // trimmed
        expect(s.showClock).toBe(false);
        expect(s.showClockDate).toBe(false);
        expect(s.showClockWeekday).toBe(false);
        expect(s.iconLabelShadow).toBe(false);
        expect(s.taskbarAutoHide).toBe(true);
        expect(s.taskbarSmallIcons).toBe(true);
    });

    it("rejects unknown enum values", () => {
        const s = mergeSettings({
            clickMode: "triple",
            iconSize: 64,
            folderIconStyle: "holographic",
            folderViewMode: "grid",
            theme: "neon",
            uiFont: "Comic Sans",
        } as unknown as Partial<Settings>);
        expect(s.clickMode).toBe(DEFAULT_SETTINGS.clickMode);
        expect(s.iconSize).toBe(DEFAULT_SETTINGS.iconSize);
        expect(s.folderIconStyle).toBe(DEFAULT_SETTINGS.folderIconStyle);
        expect(s.folderViewMode).toBe(DEFAULT_SETTINGS.folderViewMode);
        expect(s.theme).toBe(DEFAULT_SETTINGS.theme);
        expect(s.uiFont).toBe(DEFAULT_SETTINGS.uiFont);
    });

    it("clamps numeric settings to their ranges", () => {
        expect(mergeSettings({ labelSize: 99 }).labelSize).toBe(18);
        expect(mergeSettings({ labelSize: 1 }).labelSize).toBe(9);
        expect(mergeSettings({ iconGap: -5 }).iconGap).toBe(0);
        expect(mergeSettings({ desktopPadX: 500 }).desktopPadX).toBe(64);
        expect(mergeSettings({ labelSize: "abc" as unknown as number }).labelSize).toBe(
            DEFAULT_SETTINGS.labelSize,
        );
    });

    it("accepts the valid uiFont values only", () => {
        expect(mergeSettings({ uiFont: "Tahoma, 'MS Sans Serif', 'Segoe UI', sans-serif" }).uiFont)
            .toBe("Tahoma, 'MS Sans Serif', 'Segoe UI', sans-serif");
        expect(mergeSettings({ uiFont: "'Segoe UI', Tahoma, sans-serif" }).uiFont)
            .toBe("'Segoe UI', Tahoma, sans-serif");
    });

    it("keeps only valid hex colors on known custom keys", () => {
        const s = mergeSettings({
            customColors: {
                "--win98-navy": "#00ff00",
                "--win98-black": "not-a-color",
                "--win98-hacker": "#ff0000", // unknown key → dropped
            },
        });
        expect(s.customColors).toEqual({ "--win98-navy": "#00ff00" });
    });

    it("handles malformed customColors shapes", () => {
        expect(
            mergeSettings({ customColors: "olive" as unknown as Settings["customColors"] })
                .customColors,
        ).toEqual({});
        expect(mergeSettings({ customColors: null as unknown as Settings["customColors"] }).customColors)
            .toEqual({});
    });

    it("merges nested wallpaper fields", () => {
        const s = mergeSettings({
            wallpaper: {
                type: "image",
                color: "#123456",
                imageData: "data:image/png;base64,AAAA",
                imageStyle: "center",
                scale: 250,
                uiType: "file",
            },
        });
        expect(s.wallpaper).toEqual({
            type: "image",
            color: "#123456",
            imageData: "data:image/png;base64,AAAA",
            imageStyle: "center",
            scale: 250,
            uiType: "file",
        });
    });

    it("clamps wallpaper scale and rejects bad imageStyle", () => {
        const s = mergeSettings({
            wallpaper: {
                imageStyle: "zoom",
                scale: 99999,
                uiType: "ftp",
            },
        } as unknown as Partial<Settings>);
        expect(s.wallpaper.imageStyle).toBe(DEFAULT_SETTINGS.wallpaper.imageStyle);
        expect(s.wallpaper.scale).toBe(500);
        expect(s.wallpaper.uiType).toBe(DEFAULT_SETTINGS.wallpaper.uiType);
    });

    it("drops unknown top-level keys entirely", () => {
        const s = mergeSettings({ theme: "olive", newerOfSomething: 42 } as unknown as Partial<Settings>);
        expect(s.theme).toBe("olive");
        expect((s as unknown as Record<string, unknown>)["newerOfSomething"]).toBeUndefined();
    });

    it("rejects malformed wallpaper shapes (string/array/null) without touching defaults", () => {
        expect(
            mergeSettings({ wallpaper: "teal" as unknown as Settings["wallpaper"] }).wallpaper,
        ).toEqual(DEFAULT_SETTINGS.wallpaper);
        expect(
            mergeSettings({ wallpaper: [] as unknown as Settings["wallpaper"] }).wallpaper,
        ).toEqual(DEFAULT_SETTINGS.wallpaper);
        expect(
            mergeSettings({ wallpaper: null as unknown as Settings["wallpaper"] }).wallpaper,
        ).toEqual(DEFAULT_SETTINGS.wallpaper);
    });

    it("wallpaper.scale guards type before rounding (no NaN leaks)", () => {
        expect(
            mergeSettings({
                wallpaper: { scale: "150" } as unknown as Settings["wallpaper"],
            }).wallpaper.scale,
        ).toBe(DEFAULT_SETTINGS.wallpaper.scale);
        expect(
            mergeSettings({
                wallpaper: { scale: NaN } as unknown as Settings["wallpaper"],
            }).wallpaper.scale,
        ).toBe(DEFAULT_SETTINGS.wallpaper.scale);
        expect(
            mergeSettings({
                wallpaper: { scale: 150 } as unknown as Settings["wallpaper"],
            }).wallpaper.scale,
        ).toBe(150);
    });
});