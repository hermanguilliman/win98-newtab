/**
 * Appearance themes: option list, per-theme CSS-variable palettes, custom
 * picker keys, and the palette resolver used by applyTheme().
 */
import type { ThemeId } from "./settings";

export interface ThemeOption {
    id: ThemeId;
    label: string;
    desc: string;
}

export interface ThemeColorKey {
    /** CSS variable name (also used as the storage key in settings.customColors). */
    css: string;
    label: string;
    /** Value the picker falls back to before the user touches anything. */
    def: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
    {
        id: "classic",
        label: "Классическая",
        desc: "Стандартные серые цвета Windows 98",
    },
    {
        id: "olive",
        label: "Оливковая",
        desc: "Тёплые зелёно-оливковые тона",
    },
    {
        id: "ocean",
        label: "Океан",
        desc: "Спокойные сине-морские тона в духе Windows Plus!",
    },
    {
        id: "midnight",
        label: "Полночь",
        desc: "Тёмная сине-стальная тема со спокойными акцентами",
    },
    { id: "custom", label: "Пользовательская", desc: "Свои цвета" },
];

/**
 * CSS variables overridden per theme. Keys in quotes so the object also
 * serves as a "custom picker" definition list.
 */
export const THEME_COLORS: Record<string, Record<string, string>> = {
    olive: {
        "--win98-silver": "#b5b5a1",
        "--win98-btn-face": "#b5b5a1",
        "--win98-hover": "#d5d5c1",
        "--win98-inset-bg": "#d0d0b8",
        "--win98-input-bg": "#fffff0",
        "--win98-navy": "#404000",
        "--win98-highlight": "#808000",
        "--win98-shadow": "#505040",
        "--win98-dark-gray": "#606050",
        "--win98-radio-edge2": "#a0a090",
        "--win98-wp-preview": "#408040",
        "--win98-title-active": "linear-gradient(90deg, #404000, #808040)",
        "--win98-title-inactive": "linear-gradient(90deg, #808040, #a0a080)",
    },
    ocean: {
        "--win98-silver": "#b8ccc8",
        "--win98-btn-face": "#b8ccc8",
        "--win98-hover": "#d8e8e4",
        "--win98-inset-bg": "#cfe0dc",
        "--win98-input-bg": "#ffffff",
        "--win98-content-bg": "#ffffff",
        "--win98-navy": "#006080",
        "--win98-highlight": "#0088a0",
        "--win98-black": "#002030",
        "--win98-shadow": "#50706a",
        "--win98-dark-gray": "#40605a",
        "--win98-radio-check": "#002030",
        "--win98-radio-edge1": "#002030",
        "--win98-radio-edge2": "#7aa09a",
        "--win98-radio-shadow": "#e8f4f0",
        "--win98-wp-preview": "#0088a0",
        "--win98-title-active": "linear-gradient(90deg, #005060, #0090a8)",
        "--win98-title-inactive": "linear-gradient(90deg, #609088, #80a8a0)",
    },
    midnight: {
        "--win98-silver": "#2a2e38",
        "--win98-btn-face": "#33384a",
        "--win98-hover": "#41485c",
        "--win98-inset-bg": "#232733",
        "--win98-input-bg": "#e8ebf2",
        "--win98-content-bg": "#2a2e38",
        "--win98-navy": "#3a5a7a",
        "--win98-highlight": "#7ea6d6",
        "--win98-black": "#dde3ee",
        "--win98-shadow": "#1a1e28",
        "--win98-dark-gray": "#9aa3b5",
        "--win98-radio-check": "#dde3ee",
        "--win98-radio-edge1": "#dde3ee",
        "--win98-radio-edge2": "#9aa3b5",
        "--win98-radio-shadow": "#1a1e28",
        "--win98-wp-preview": "#2a2e38",
        "--win98-title-active": "linear-gradient(90deg, #3a4055, #5a6a8a)",
        "--win98-title-inactive": "linear-gradient(90deg, #2a2e38, #3a4055)",
    },
};

/**
 * Color pickers exposed in the «Пользовательская» theme. `def` is the value
 * the picker falls back to before the user touches anything.
 */
export const CUSTOM_THEME_KEYS: ThemeColorKey[] = [
    { css: "--win98-silver", label: "Цвет окон", def: "#c0c0c0" },
    { css: "--win98-content-bg", label: "Фон содержимого окон", def: "#ffffff" },
    { css: "--win98-btn-face", label: "Цвет кнопок", def: "#c0c0c0" },
    { css: "--win98-navy", label: "Цвет выделения", def: "#000080" },
    { css: "--win98-black", label: "Цвет текста", def: "#000000" },
    { css: "--win98-highlight", label: "Цвет подсветки", def: "#0000aa" },
    { css: "--win98-shadow", label: "Цвет теней", def: "#606060" },
];

/** Lighten/darken a #rrggbb color by `percent` (positive = lighter, negative = darker). */
export function shadeColor(color: string, percent: number): string {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);
    R = Math.min(255, Math.max(0, R + Math.round((R * percent) / 100)));
    G = Math.min(255, Math.max(0, G + Math.round((G * percent) / 100)));
    B = Math.min(255, Math.max(0, B + Math.round((B * percent) / 100)));
    return `#${R.toString(16).padStart(2, "0")}${G.toString(16).padStart(2, "0")}${B.toString(16).padStart(2, "0")}`;
}

/**
 * Every CSS variable name that applyTheme may override (its reset set).
 * Derived from the palette objects + custom keys, so newly added theme keys
 * are picked up automatically.
 */
export function themeResetKeys(): string[] {
    const keys = new Set<string>();
    Object.values(THEME_COLORS).forEach((palette) =>
        Object.keys(palette).forEach((k) => keys.add(k)),
    );
    CUSTOM_THEME_KEYS.forEach((k) => keys.add(k.css));
    return [...keys];
}

/**
 * Resolved palette for a theme id, or null for "classic" (CSS :root defaults
 * win). "custom" derives the title-bar gradients from the picked navy/shadow
 * so the whole chrome stays coherent when only the highlight changes.
 */
export function themeColorsFor(
    themeId: ThemeId | string,
    customColors: Record<string, string>,
): Record<string, string> | null {
    if (themeId === "custom") {
        const sel = customColors["--win98-navy"] || "#000080";
        const inactive = customColors["--win98-shadow"] || "#808080";
        return {
            ...customColors,
            "--win98-title-active": `linear-gradient(90deg, ${sel}, ${shadeColor(sel, 35)})`,
            "--win98-title-inactive": `linear-gradient(90deg, ${inactive}, ${shadeColor(inactive, 35)})`,
        };
    }
    if (THEME_COLORS[themeId]) return THEME_COLORS[themeId];
    return null;
}