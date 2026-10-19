/**
 * Shared DOM lookups and tiny DOM helpers used across the UI modules.
 * The elements are static in newtab.html, so they are resolved once here.
 */

/**
 * Resolve an event target to an Element. TS types `EventTarget` without
 * `closest`; all listeners in this file attach to element targets, so the
 * runtime result is identical to the original direct call.
 * @param {Event} e
 * @returns {Element | null}
 */
export function eventTargetElement(e) {
    return e.target instanceof Element ? e.target : null;
}

/* ---------- DOM Refs ---------- */
export const $desktop = document.getElementById("desktop");
export const $desktopIcons = document.getElementById("desktop-icons");
export const $windowsContainer = document.getElementById("windows-container");
export const $taskbarWindows = document.getElementById("taskbar-windows");
export const $startBtn = document.getElementById("start-btn");
export const $startMenu = document.getElementById("start-menu");
export const $clock = document.getElementById("clock");
export const $weather = document.getElementById("weather");
export const $menuAllBookmarks = document.getElementById("menu-all-bookmarks");
export const $launcherNotepad = document.getElementById("launcher-notepad");
/** @type {HTMLElement & { _hideTimer?: number }} */
export const $taskbar = document.getElementById("taskbar");
