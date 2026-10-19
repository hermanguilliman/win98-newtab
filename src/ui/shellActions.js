/**
 * Late-bound shell callbacks.
 *
 * Feature modules (settings window, and later the calendar/weather windows)
 * need to trigger work that lives in the app shell - re-rendering the desktop,
 * refreshing open folder windows, refreshing the tray weather. Importing the
 * shell from those modules would create an import cycle, so the shell assigns
 * these slots once at startup instead (the same pattern as `panelActions` in
 * src/ui/windows.js). Every slot is `null` until then.
 *
 * @type {{
 *     updateWeather: ((...args: any[]) => any) | null,
 *     renderBookmarks: ((...args: any[]) => any) | null,
 *     refreshOpenFolderWindows: ((...args: any[]) => any) | null,
 * }}
 */
export const shellActions = {
    updateWeather: null,
    renderBookmarks: null,
    refreshOpenFolderWindows: null,
};
