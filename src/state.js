/**
 * Shared application state.
 *
 * `state` is ONE mutable singleton that every UI module mutates in place.
 * Window layout, z-order and lifecycle belong to the WindowManager
 * (src/lib/windows.ts): `state.windows` IS the manager array - never push
 * or splice it directly, go through `state.windowManager`.
 */
import { WindowManager } from "./lib/windows";

const windowManager = new WindowManager();

export const state = {
    windowManager,
    /** @type {import("./types").WinData[]} */
    windows: /** @type {import("./types").WinData[]} */ (windowManager.windows),
    startMenuOpen: false,
    dragState: null,
    resizeState: null,
    /** @type {import("./types").Settings | null} */
    settings: null,
    /** @type {import("./types").BookmarkNode | null} */
    treeRoot: null,
    bookmarksRefreshTimer: 0,
    /** @type {import("./types").SearchNode[]} */
    searchNodes: [],
    /** @type {Map<string, import("./types").BookmarkNode> | null} */
    nodeIndex: null,
    /** @type {import("./types").IconEl | null} */
    selectedDesktopEl: null,
    weatherData: null,
    clipUrl: null,
    /** @type {import("./types").CalendarEvent[]} */
    calendarEvents: [],
    /** Natural-size cache for wallpaper data URLs (see src/ui/settings.js) */
    wallpaperSizeCache: null,
    /** Bookmark/folder currently being dragged between folder windows
     *  (src/ui/desktop.js) */
    nodeDragState: null,
    /** Live-preview folder icon style while the settings window is open
     *  (cleared on OK / Отмена). */
    previewFolderStyle: null,
    /** Live-preview folder window view mode (icons / list). */
    previewFolderViewMode: null,
};

/**
 * Look up a bookmark/folder by id in the cached tree index (O(1)).
 * The first argument is accepted for compatibility with the original
 * two-argument call sites; the index is keyed only by id.
 * @param {import("./types").BookmarkNode | null} [_node]
 * @param {string} [id]
 */
export function findNodeById(_node, id) {
    return (state.nodeIndex && state.nodeIndex.get(/** @type {string} */ (id))) || null;
}
