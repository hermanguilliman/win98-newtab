/**
 * Tray clock: renders the time (plus optional weekday / date parts, driven by
 * the settings) into the taskbar clock element.
 */
import { state } from "../state";
import { DEFAULT_SETTINGS } from "../lib/settings";
import { $clock } from "./dom";

export function updateClock(src) {
    const s = src || state.settings || DEFAULT_SETTINGS;
    const now = new Date();
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    const parts = [];
    if (s.showClockWeekday) {
        const wd = now.toLocaleDateString("ru-RU", { weekday: "short" });
        parts.push(wd.endsWith(".") ? wd : wd + ".");
    }
    if (s.showClockDate) {
        const d = now.getDate().toString().padStart(2, "0");
        const mo = (now.getMonth() + 1).toString().padStart(2, "0");
        parts.push(`${d}.${mo}.${now.getFullYear()}`);
    }
    parts.push(`${h}:${m}`);
    $clock.textContent = parts.join(" ");
}
