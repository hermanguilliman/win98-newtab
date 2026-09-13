/**
 * Window management: pure math + state machine for the desktop's windows.
 *
 * The `WindowManager` owns identity (ids), stacking order (zIndex), focus
 * (activeWindowId), and the lifecycle (open/close, minimize/restore, maximize,
 * cascade/tile layouts). It is DOM-free: geometry lives on `ManagedWindow`
 * descriptors, and the app applies them to real elements (`el`) itself.
 * `app.js` attaches DOM/app-specific fields (el, title, icon, navStack, …) to
 * the very same objects, so a single record can never drift from the UI.
 */

export interface Bounds {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** A window as the manager sees it — pure data, no DOM. */
export interface ManagedWindow {
    id: number;
    /** Layout position / size (CSS px, layout space — not scaled) */
    x: number;
    y: number;
    w: number;
    h: number;
    /** Dialogs cannot be minimized */
    dialog: boolean;
    minimized: boolean;
    maximized: boolean;
    /** Pre-maximize bounds, for restoring */
    prevBounds: Bounds | null;
    /** Stacking order — strictly increasing per focus/open */
    zIndex: number;
}

export interface OpenWindowOptions {
    width?: number;
    height?: number;
    dialog?: boolean;
    /** Explicit position — wins over the centered cascade */
    x?: number;
    y?: number;
    /** Desktop viewport (used for centering + clamping) */
    viewportWidth: number;
    viewportHeight: number;
}

/** Down-right nudge per open window (wraps every 6 windows) */
export const WINDOW_STACK_OFFSET = 28;
export const WINDOW_STACK_WRAP = 6;
/** Taskbar height — tile layout keeps below it */
export const TASKBAR_HEIGHT = 28;
/** Cascade layout offsets (Win98 «Каскад окон» behavior) */
export const CASCADE_START = 28;
export const CASCADE_STEP = 24;
export const CASCADE_MAX_W = 420;
export const CASCADE_MAX_H = 320;

/**
 * Compute the top-left corner for a new window.
 * Explicit x/y always win; otherwise the window is centered and cascaded by
 * `stackIndex` windows already open. Coordinates are clamped so the titlebar
 * stays in view (a window can never be pushed fully off-screen).
 * @throws nothing — always returns finite, clamped coordinates.
 */
export function computeWindowStackPosition(
    o: {
        width: number;
        height: number;
        viewportWidth: number;
        viewportHeight: number;
        stackIndex: number;
        x?: number;
        y?: number;
    },
): { x: number; y: number } {
    const vw = Math.max(0, o.viewportWidth);
    const vh = Math.max(0, o.viewportHeight);
    const w = Math.max(0, o.width);
    const h = Math.max(0, o.height);
    const freeX = Math.max(0, vw - w);
    const freeY = Math.max(0, vh - h);
    const nudge = (o.stackIndex % WINDOW_STACK_WRAP) * WINDOW_STACK_OFFSET;

    return {
        x:
            o.x ??
            clamp(Math.round(vw / 2 - w / 2 + nudge), 0, freeX),
        y:
            o.y ??
            clamp(Math.round(vh / 2 - h / 2 + nudge), 0, freeY),
    };
}

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

/**
 * The window state machine. Holds every open window in creation order
 * (index = original stacking baseline), assigns ids/z-order, tracks the active
 * window, and answers "what should be focused next" when one is minimized or
 * closed. Pure — no DOM, no chrome.*, fully unit-tested.
 */
export class WindowManager {
    /** All open windows, in creation order. The object identity is the same
        object the app extends with `el`/`title`/etc. */
    windows: ManagedWindow[] = [];
    /** Id of the window currently in front, or null */
    activeWindowId: number | null = null;

    private idCounter = 0;
    private zCounter = 100;

    /** Open a new window: allocate id, cascade the position, bring to front. */
    open(o: OpenWindowOptions): ManagedWindow {
        const w = o.width || 500;
        const h = o.height != null ? o.height : 400;
        const pos = computeWindowStackPosition({
            width: w,
            height: h,
            viewportWidth: o.viewportWidth,
            viewportHeight: o.viewportHeight,
            stackIndex: this.windows.length,
            x: o.x,
            y: o.y,
        });
        const win: ManagedWindow = {
            id: ++this.idCounter,
            x: pos.x,
            y: pos.y,
            w,
            h,
            dialog: !!o.dialog,
            minimized: false,
            maximized: false,
            prevBounds: null,
            zIndex: ++this.zCounter,
        };
        this.windows.push(win);
        this.activeWindowId = win.id;
        return win;
    }

    get(id: number): ManagedWindow | null {
        return this.windows.find((w) => w.id === id) || null;
    }

    /** Raise a window to the front (no-op when it is already active). */
    focus(id: number): void {
        if (this.activeWindowId === id) return;
        const win = this.get(id);
        if (!win) return;
        this.activeWindowId = id;
        win.zIndex = ++this.zCounter;
    }

    /** Minimize a window; when it was active, focus the last visible one. */
    minimize(id: number): void {
        const win = this.get(id);
        if (!win || win.minimized || win.dialog) return;
        win.minimized = true;
        if (this.activeWindowId === id) this.focusFallback();
    }

    /** Restore a minimized window and bring it to the front. */
    restore(id: number): void {
        const win = this.get(id);
        if (!win) return;
        win.minimized = false;
        this.focus(id);
    }

    /** Toggle maximize; keeps pre-maximize bounds to restore later. */
    toggleMaximize(id: number): void {
        const win = this.get(id);
        if (!win || win.dialog) return;
        if (win.maximized) {
            win.maximized = false;
            const b = win.prevBounds;
            if (b) {
                win.x = b.x;
                win.y = b.y;
                win.w = b.w;
                win.h = b.h;
            }
        } else {
            win.prevBounds = { x: win.x, y: win.y, w: win.w, h: win.h };
            win.maximized = true;
        }
    }

    /** Close a window; when it was active, focus the last visible one. */
    close(id: number): ManagedWindow | null {
        const idx = this.windows.findIndex((w) => w.id === id);
        if (idx === -1) return null;
        const [win] = this.windows.splice(idx, 1);
        if (this.activeWindowId === id) this.focusFallback();
        return win;
    }

    /** Win98 «Каскад окон»: arrange all visible windows cascading down-right. */
    cascade(viewportWidth: number, viewportHeight: number): void {
        this.windows
            .filter((w) => !w.minimized)
            .forEach((win, i) => {
                win.maximized = false;
                win.x = CASCADE_START + i * CASCADE_STEP;
                win.y = CASCADE_START + i * CASCADE_STEP;
                win.w = Math.min(CASCADE_MAX_W, viewportWidth - 60);
                win.h = Math.min(CASCADE_MAX_H, viewportHeight - 90);
                this.focus(win.id);
            });
    }

    /** Win98 «Стопкой»: tile all visible windows across the desktop. */
    tile(viewportWidth: number, viewportHeight: number): void {
        const wins = this.windows.filter((w) => !w.minimized);
        if (!wins.length) return;
        const cols = Math.ceil(Math.sqrt(wins.length));
        const rows = Math.ceil(wins.length / cols);
        const areaW = viewportWidth;
        const areaH = Math.max(1, viewportHeight - TASKBAR_HEIGHT);
        const wW = Math.floor(areaW / cols);
        const hH = Math.floor(areaH / rows);
        wins.forEach((win, i) => {
            win.maximized = false;
            win.x = (i % cols) * wW;
            win.y = Math.floor(i / cols) * hH;
            win.w = wW;
            win.h = hH;
            this.focus(win.id);
        });
    }

    /** Focus the last visible (non-minimized) window in creation order. */
    private focusFallback(): void {
        const visible = this.windows.filter((w) => !w.minimized);
        const next = visible[visible.length - 1];
        this.activeWindowId = next ? next.id : null;
        if (next) next.zIndex = ++this.zCounter;
    }
}