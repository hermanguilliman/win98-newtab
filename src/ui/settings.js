/**
 * App-level settings: load/save (sync-first, see src/ui/storage.js), theme
 * colors, desktop layout CSS variables, wallpaper and taskbar options.
 * The Settings shape + whitelist merge live in src/lib/settings.ts.
 */

/* ============================================================
 SETTINGS (storage + wallpaper + click mode)
 mergeSettings lives in src/lib/settings.ts (imported above).
 ============================================================ */

/** @typedef {import("../types").Settings} Settings */
import { $clock, $taskbar } from "./dom";
import { state } from "../state";
import { syncStoredGet, syncStoredSet } from "./storage";
import { updateClock } from "./clock";
import { DEFAULT_SETTINGS, mergeSettings } from "../lib/settings";
import { themeColorsFor, themeResetKeys } from "../lib/theme";
import { clampInt } from "../lib/format";

export async function loadSettings() {
    try {
        const stored = await syncStoredGet("settings");
        state.settings = mergeSettings(stored);
    } catch (err) {
        state.settings = mergeSettings(null);
    }
    applyWallpaper(state.settings.wallpaper);
    applyDesktopStyle();
    applyTaskbarSettings();
    updateClock();
}

/**
 * Apply the appearance theme (built-in palette or custom colors) as CSS
 * variables on documentElement. Called from applyDesktopStyle() so live
 * preview in the settings window updates the whole desktop in one go.
 * @param {Settings} [src]
 */
export function applyTheme(src) {
    const s = src || state.settings || DEFAULT_SETTINGS;
    const el = document.documentElement;
    const themeId = s.theme || DEFAULT_SETTINGS.theme;

    // Reset any theme-applied variables first (classic = CSS defaults).
    themeResetKeys().forEach((name) => el.style.removeProperty(name));

    const colors = themeColorsFor(themeId, s.customColors || {});
    if (!colors) return; // classic — defaults from win98.css :root
    Object.entries(colors).forEach(([name, value]) => {
        if (value) el.style.setProperty(name, value);
    });
}

/** Apply all desktop layout CSS variables (icon size, label size, spacing, padding) */
export function applyDesktopStyle(src) {
    applyTheme(src);
    const s = src || state.settings || DEFAULT_SETTINGS;
    const el = document.documentElement;
    el.style.setProperty(
        "--win98-icon-size",
        (s.iconSize || DEFAULT_SETTINGS.iconSize) + "px",
    );
    el.style.setProperty(
        "--win98-label-size",
        (s.labelSize ?? DEFAULT_SETTINGS.labelSize) + "px",
    );
    el.style.setProperty(
        "--win98-icon-gap",
        (s.iconGap ?? DEFAULT_SETTINGS.iconGap) + "px",
    );
    el.style.setProperty(
        "--win98-desktop-pad-x",
        (s.desktopPadX ?? DEFAULT_SETTINGS.desktopPadX) + "px",
    );
    el.style.setProperty(
        "--win98-desktop-pad-y",
        (s.desktopPadY ?? DEFAULT_SETTINGS.desktopPadY) + "px",
    );
    // Icon label appearance: transparent like original Win98 with drop
    // shadows ("Use drop shadows for icon labels on the desktop" checkbox).
    // No opaque background — the wallpaper/desktop color shows through.
    el.style.setProperty(
        "--win98-label-shadow",
        s.iconLabelShadow ? "1px 1px 1px rgba(0,0,0,0.7)" : "none",
    );
    el.style.setProperty(
        "--win98-font",
        s.uiFont || DEFAULT_SETTINGS.uiFont,
    );
}

export function saveSettings() {
    return syncStoredSet("settings", state.settings);
}

/** Apply taskbar-related settings (auto-hide, small icons, clock visibility) */
export function applyTaskbarSettings() {
    const s = state.settings || DEFAULT_SETTINGS;
    $taskbar.classList.toggle("taskbar-small", !!s.taskbarSmallIcons);
    $clock.style.display = s.showClock !== false ? "" : "none";
    if (s.taskbarAutoHide) {
        $taskbar.classList.add("taskbar-autohide");
    } else {
        $taskbar.classList.remove("taskbar-autohide");
        $taskbar.classList.remove("taskbar-force-show");
    }
}

/** Natural pixel size of a wallpaper image (data URL), cached per URL */
export function resolveImageSize(dataUrl) {
    if (!state.wallpaperSizeCache) state.wallpaperSizeCache = new Map();
    let pending = state.wallpaperSizeCache.get(dataUrl);
    if (!pending) {
        pending = new Promise((resolve) => {
            const img = new Image();
            img.onload = () =>
                resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => resolve(null);
            img.src = dataUrl;
        });
        state.wallpaperSizeCache.set(dataUrl, pending);
    }
    return pending;
}

/** Apply wallpaper to the desktop background */
export function applyWallpaper(wp) {
    wp =
        wp ||
        (state.settings && state.settings.wallpaper) ||
        DEFAULT_SETTINGS.wallpaper;
    const desk = document.getElementById("desktop");
    desk.style.backgroundPosition = "0 0";

    if (wp.type !== "color" && wp.imageData) {
        desk.style.backgroundImage = `url(${wp.imageData})`;
        desk.style.backgroundColor = wp.color || "#008080";
        const sty = wp.imageStyle || "tile";
        const scale = clampInt(Math.round(wp.scale || 100), 10, 500) / 100;

        const applyTileOrCenter = (size) => {
            if (size && scale !== 1) {
                const w = Math.max(1, Math.round(size.w * scale));
                const h = Math.max(1, Math.round(size.h * scale));
                desk.style.backgroundSize = `${w}px ${h}px`;
            } else {
                desk.style.backgroundSize = "auto";
            }
            desk.style.backgroundRepeat =
                sty === "tile" ? "repeat" : "no-repeat";
            desk.style.backgroundPosition =
                sty === "center" ? "center center" : "0 0";
        };

        if (sty === "stretch") {
            desk.style.backgroundSize = "100% 100%";
            desk.style.backgroundRepeat = "no-repeat";
        } else if (scale !== 1) {
            // Need the natural size to scale; resolve asynchronously
            desk.style.backgroundSize = "auto";
            resolveImageSize(wp.imageData).then(applyTileOrCenter);
        } else {
            applyTileOrCenter(null);
        }
    } else {
        desk.style.backgroundImage = "none";
        desk.style.backgroundColor = wp.color || "#008080";
        desk.style.backgroundSize = "auto";
        desk.style.backgroundRepeat = "repeat";
    }
}

