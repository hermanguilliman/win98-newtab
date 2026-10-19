/**
 * Named constants shared by the UI modules (formerly locals in app.js).
 */

/** Click-mode debounce: how long one click waits to see if a double follows. */
export const CLICK_DEBOUNCE_MS = 350;

/** Debounce for a burst of chrome.bookmarks change events before re-rendering. */
export const BOOKMARK_REFRESH_DEBOUNCE_MS = 250;

/** Maximum number of rows the search window renders. */
export const SEARCH_RESULT_LIMIT = 200;

/** Floors for interactive window resizing (px). */
export const MIN_WINDOW_W = 200;
export const MIN_WINDOW_H = 120;

/** Tray clock refresh interval (ms). */
export const CLOCK_INTERVAL_MS = 10000;

/** Debounce for the search input. */
export const SEARCH_DEBOUNCE_MS = 150;
