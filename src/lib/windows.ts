/**
 * Window stack geometry: pure math for placing windows on the desktop.
 * Windows appear centered, each new one nudged down-right by a fixed offset
 * so stacked windows stay distinguishable.
 */

export interface WindowStackOptions {
    /** Current window being created */
    width: number;
    height: number;
    /** Desktop viewport */
    viewportWidth: number;
    viewportHeight: number;
    /** How many windows are already open (drives the cascade) */
    stackIndex: number;
    /** Explicit top-left position — when present, it wins over the cascade */
    x?: number;
    y?: number;
}

export interface WindowPosition {
    x: number;
    y: number;
}

/** Down-right nudge per open window (wraps every 6 windows) */
export const WINDOW_STACK_OFFSET = 28;
export const WINDOW_STACK_WRAP = 6;

/**
 * Compute the top-left corner for a new window.
 * Explicit x/y always win; otherwise the window is centered and cascaded by
 * `stackIndex` windows already open. Coordinates are clamped so the titlebar
 * stays in view (a window can never be pushed fully off-screen).
 * @throws nothing — always returns finite, clamped coordinates.
 */
export function computeWindowStackPosition(
    o: WindowStackOptions,
): WindowPosition {
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