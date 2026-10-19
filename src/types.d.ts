/**
 * Canonical shared types. Type-only: nothing here reaches the bundle.
 * src/app.js and src/ui/*.js refer to these via `import("./types").X` (or a
 * local @typedef alias) so the data shapes live in exactly one place.
 */
import type { BookmarkNode } from "./lib/bookmarks";
import type { ManagedWindow } from "./lib/windows";
import type { SearchNode } from "./lib/search";
import type { CalendarEvent } from "./lib/calendarEvents";
import type { Settings, WallpaperSettings } from "./lib/settings";

export type { BookmarkNode, SearchNode, CalendarEvent, Settings, WallpaperSettings };

/**
 * A single open window (folder windows, dialogs, apps, …).
 * The WindowManager owns the layout/lifecycle fields (ManagedWindow); the
 * app extends each record with DOM/app-only fields right after open():
 * title, icon, winType, bookmarkId, el. App-only fields are optional so a
 * plain ManagedWindow (as returned by WindowManager) is assignable - every
 * record in state.windows has them by the time app code reads it.
 */
export type WinData = ManagedWindow & {
    title?: string;
    icon?: string;
    winType?: string | null;
    bookmarkId?: string | null;
    el?: HTMLDivElement | null;
    currentNode?: BookmarkNode | null;
    navStack?: (BookmarkNode | null)[];
    searchFilter?: () => void;
    okButton?: HTMLButtonElement;
    _savedIndex?: number;
};

/** Desktop icon / folder item div. The bookmark node lives in the iconNodes
 * WeakMap (src/lib/iconNodes.ts) - never as an expando on the element. */
export type IconEl = HTMLDivElement;

/** Search window UI (div + its expando fields). */
export type SearchUI = HTMLDivElement & { filter: () => void; input: HTMLInputElement };
