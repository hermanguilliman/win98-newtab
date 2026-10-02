/**
 * Settings domain: the Settings shape, its defaults, the whitelist of valid
 * choices (ICON_SIZES / FOLDER_STYLES / UI_FONTS), and the defensive
 * mergeSettings() that guards chrome.storage contents on every load.
 */
import { clampInt } from "./format";
import { CUSTOM_THEME_KEYS, THEME_OPTIONS } from "./theme";

export type ClickMode = "single" | "double";
export type FolderIconStyle = "classic" | "glossy" | "outlined";
export type FolderViewMode = "icons" | "list";
export type ThemeId = "classic" | "olive" | "ocean" | "lavender" | "custom";

/** Allowed icon sizes */
export const ICON_SIZES: number[] = [24, 32, 48];

export interface WallpaperSettings {
    type: "color" | "image";
    color: string;
    imageData: string | null;
    imageStyle: "stretch" | "tile" | "center";
    scale: number;
    uiType: "color" | "file" | "url";
}

export interface Settings {
    clickMode: ClickMode;
    iconSize: number;
    labelSize: number;
    iconGap: number;
    desktopPadX: number;
    desktopPadY: number;
    folderIconStyle: FolderIconStyle;
    weatherCity: string;
    showClockDate: boolean;
    showClockWeekday: boolean;
    iconLabelShadow: boolean;
    folderViewMode: FolderViewMode;
    uiFont: string;
    taskbarAutoHide: boolean;
    taskbarSmallIcons: boolean;
    showClock: boolean;
    wallpaper: WallpaperSettings;
    theme: ThemeId;
    customColors: Record<string, string>;
}

/** Folder icon appearance styles (selectable in Настройки → Вид) */
export const FOLDER_STYLES: { id: FolderIconStyle; label: string }[] = [
    { id: "classic", label: "Классические" },
    { id: "glossy", label: "Объёмные" },
    { id: "outlined", label: "С контуром" },
];

/** UI font choices (Настройки → Вид). `value` is the full CSS family stack. */
export const UI_FONTS: { label: string; value: string }[] = [
    { label: "Tahoma", value: "Tahoma, 'MS Sans Serif', 'Segoe UI', sans-serif" },
    { label: "MS Sans Serif", value: "'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif" },
    { label: "Segoe UI", value: "'Segoe UI', Tahoma, sans-serif" },
    { label: "Courier New", value: "'Courier New', monospace" },
    { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
];

export const DEFAULT_SETTINGS: Settings = {
    clickMode: "double",
    iconSize: 32,
    labelSize: 11,
    iconGap: 4,
    desktopPadX: 8,
    desktopPadY: 8,
    folderIconStyle: "classic",
    weatherCity: "Москва",
    showClockDate: true,
    showClockWeekday: true,
    iconLabelShadow: true,
    folderViewMode: "icons",
    uiFont: "Tahoma, 'MS Sans Serif', 'Segoe UI', sans-serif",
    taskbarAutoHide: false,
    taskbarSmallIcons: false,
    showClock: true,
    theme: "classic",
    customColors: {},
    wallpaper: {
        type: "color",
        color: "#008080",
        imageData: null,
        imageStyle: "tile",
        scale: 100,
        uiType: "color",
    },
};

const HEX6_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Merge whatever came out of chrome.storage into a fresh copy of the
 * defaults. Whitelist-only: unknown keys, invalid values and malformed
 * shapes are dropped, so stored settings can never corrupt the app.
 * @param partial raw stored settings (may be anything from old builds / hand edits)
 */
export function mergeSettings(
    partial: Partial<Settings> | null | undefined,
): Settings {
    const base = structuredClone(DEFAULT_SETTINGS);
    if (!partial) return base;

    if (partial.clickMode === "single" || partial.clickMode === "double") {
        base.clickMode = partial.clickMode;
    }
    if (typeof partial.iconSize === "number" && ICON_SIZES.includes(partial.iconSize)) {
        base.iconSize = partial.iconSize;
    }
    const labelSize = clampInt(partial.labelSize, 9, 18);
    if (labelSize !== null) base.labelSize = labelSize;
    const iconGap = clampInt(partial.iconGap, 0, 32);
    if (iconGap !== null) base.iconGap = iconGap;
    const desktopPadX = clampInt(partial.desktopPadX, 0, 64);
    if (desktopPadX !== null) base.desktopPadX = desktopPadX;
    const desktopPadY = clampInt(partial.desktopPadY, 0, 64);
    if (desktopPadY !== null) base.desktopPadY = desktopPadY;

    const folderStyle = partial.folderIconStyle;
    if (folderStyle && FOLDER_STYLES.some((s) => s.id === folderStyle)) {
        base.folderIconStyle = folderStyle;
    }
    if (typeof partial.weatherCity === "string" && partial.weatherCity.trim()) {
        base.weatherCity = partial.weatherCity.trim();
    }
    if (typeof partial.showClockDate === "boolean") {
        base.showClockDate = partial.showClockDate;
    }
    if (typeof partial.showClockWeekday === "boolean") {
        base.showClockWeekday = partial.showClockWeekday;
    }
    if (typeof partial.iconLabelShadow === "boolean") {
        base.iconLabelShadow = partial.iconLabelShadow;
    }
    if (partial.folderViewMode === "icons" || partial.folderViewMode === "list") {
        base.folderViewMode = partial.folderViewMode;
    }
    const uiFont = partial.uiFont;
    if (uiFont && UI_FONTS.some((f) => f.value === uiFont)) {
        base.uiFont = uiFont;
    }
    if (typeof partial.taskbarAutoHide === "boolean") {
        base.taskbarAutoHide = partial.taskbarAutoHide;
    }
    if (typeof partial.taskbarSmallIcons === "boolean") {
        base.taskbarSmallIcons = partial.taskbarSmallIcons;
    }
    if (typeof partial.showClock === "boolean") {
        base.showClock = partial.showClock;
    }
    const theme = partial.theme;
    if (theme && THEME_OPTIONS.some((t) => t.id === theme)) {
        base.theme = theme;
    }
    if (
        partial.customColors &&
        typeof partial.customColors === "object" &&
        !Array.isArray(partial.customColors)
    ) {
        const colors: Record<string, string> = {};
        CUSTOM_THEME_KEYS.forEach((k) => {
            const v = (partial.customColors as Record<string, unknown>)[k.css];
            if (typeof v === "string" && HEX6_RE.test(v)) {
                colors[k.css] = v;
            }
        });
        base.customColors = colors;
    }
    if (
        partial.wallpaper &&
        typeof partial.wallpaper === "object" &&
        !Array.isArray(partial.wallpaper)
    ) {
        const wp: Partial<WallpaperSettings> = partial.wallpaper;
        if (wp.type === "color" || wp.type === "image") {
            base.wallpaper.type = wp.type;
        }
        if (typeof wp.color === "string") base.wallpaper.color = wp.color;
        if (typeof wp.imageData === "string") base.wallpaper.imageData = wp.imageData;
        if (wp.imageStyle === "stretch" || wp.imageStyle === "tile" || wp.imageStyle === "center") {
            base.wallpaper.imageStyle = wp.imageStyle;
        }
        if (typeof wp.scale === "number") {
            const scale = clampInt(Math.round(wp.scale), 10, 500);
            if (scale !== null) {
                base.wallpaper.scale = scale;
            }
        }
        if (wp.uiType === "color" || wp.uiType === "file" || wp.uiType === "url") {
            base.wallpaper.uiType = wp.uiType;
        }
    }
    return base;
}