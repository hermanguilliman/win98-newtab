import { describe, expect, it } from "vitest";
import {
    WindowManager,
    computeWindowStackPosition,
    WINDOW_STACK_OFFSET,
    WINDOW_STACK_WRAP,
    CASCADE_START,
    CASCADE_STEP,
} from "../src/lib/windows";

describe("computeWindowStackPosition", () => {
    const at = (stackIndex: number, extra: Partial<Parameters<typeof computeWindowStackPosition>[0]> = {}) =>
        computeWindowStackPosition({
            width: 500,
            height: 400,
            viewportWidth: 1280,
            viewportHeight: 720,
            stackIndex,
            ...extra,
        });

    it("centers a window in the viewport", () => {
        expect(at(0)).toEqual({ x: 390, y: 160 });
    });

    it("cascades subsequent windows down-right by the offset", () => {
        expect(at(1).x - at(0).x).toBe(WINDOW_STACK_OFFSET);
        expect(at(1).y - at(0).y).toBe(WINDOW_STACK_OFFSET);
    });

    it("wraps the cascade back after 6 windows", () => {
        expect(at(WINDOW_STACK_WRAP)).toEqual(at(0));
    });

    it("explicit x/y win over the cascade", () => {
        expect(at(3, { x: 10, y: 20 })).toEqual({ x: 10, y: 20 });
    });

    it("clamps so the window never sits fully off-screen", () => {
        const p = computeWindowStackPosition({
            width: 600,
            height: 400,
            viewportWidth: 640,
            viewportHeight: 480,
            stackIndex: 99,
        });
        expect(p).toEqual({ x: 40, y: 80 }); // 640-600, 480-400
    });

    it("handles a window larger than the viewport (0 free space)", () => {
        expect(
            computeWindowStackPosition({
                width: 2000,
                height: 1500,
                viewportWidth: 1280,
                viewportHeight: 720,
                stackIndex: 0,
            }),
        ).toEqual({ x: 0, y: 0 });
    });

    it("handles degenerate viewport/stack inputs", () => {
        expect(
            computeWindowStackPosition({
                width: -1,
                height: 0,
                viewportWidth: -10,
                viewportHeight: 0,
                stackIndex: -5,
            }),
        ).toEqual({ x: 0, y: 0 });
        expect(
            computeWindowStackPosition({
                width: 100,
                height: 100,
                viewportWidth: 0,
                viewportHeight: 0,
                stackIndex: 0,
            }),
        ).toEqual({ x: 0, y: 0 });
    });
});

describe("WindowManager", () => {
    const VW = 1280;
    const VH = 720;
    const open = (wm: WindowManager, extra: Partial<Parameters<WindowManager["open"]>[0]> = {}) =>
        wm.open({ width: 500, height: 400, viewportWidth: VW, viewportHeight: VH, ...extra });

    it("assigns sequential ids and focuses the newest window", () => {
        const wm = new WindowManager();
        const a = open(wm);
        const b = open(wm);
        expect(a.id).toBe(1);
        expect(b.id).toBe(2);
        expect(wm.activeWindowId).toBe(b.id);
    });

    it("has monotonically increasing zIndex per open", () => {
        const wm = new WindowManager();
        const a = open(wm);
        const b = open(wm);
        expect(b.zIndex).toBeGreaterThan(a.zIndex);
    });

    it("focus() raises zIndex and switches the active window; no-op when already active", () => {
        const wm = new WindowManager();
        const a = open(wm);
        const b = open(wm);
        const zBefore = b.zIndex;
        wm.focus(a.id);
        expect(wm.activeWindowId).toBe(a.id);
        expect(a.zIndex).toBeGreaterThan(zBefore);
        const zA = a.zIndex;
        wm.focus(a.id); // already active
        expect(a.zIndex).toBe(zA);
    });

    it("minimize() marks the window and falls back to the last visible one", () => {
        const wm = new WindowManager();
        const a = open(wm);
        const b = open(wm);
        wm.minimize(b.id);
        expect(b.minimized).toBe(true);
        expect(wm.activeWindowId).toBe(a.id);
        // fallback raised a's zIndex above b's paused value
        expect(a.zIndex).toBeGreaterThan(b.zIndex);
    });

    it("minimizing a non-active window keeps the active one", () => {
        const wm = new WindowManager();
        const a = open(wm);
        const b = open(wm);
        wm.minimize(a.id);
        expect(a.minimized).toBe(true);
        expect(wm.activeWindowId).toBe(b.id);
    });

    it("minimizing the only window leaves no active window", () => {
        const wm = new WindowManager();
        const a = open(wm);
        wm.minimize(a.id);
        expect(wm.activeWindowId).toBeNull();
    });

    it("restore() clears minimized and refocuses", () => {
        const wm = new WindowManager();
        const a = open(wm);
        const b = open(wm);
        wm.minimize(b.id);
        wm.restore(b.id);
        expect(b.minimized).toBe(false);
        expect(wm.activeWindowId).toBe(b.id);
    });

    it("toggleMaximize() saves and restores previous bounds", () => {
        const wm = new WindowManager();
        const a = open(wm);
        const before = { x: a.x, y: a.y, w: a.w, h: a.h };
        wm.toggleMaximize(a.id);
        expect(a.maximized).toBe(true);
        expect(a.prevBounds).toEqual(before);
        wm.toggleMaximize(a.id);
        expect(a.maximized).toBe(false);
        expect(a.x).toBe(before.x);
        expect(a.y).toBe(before.y);
        expect(a.w).toBe(before.w);
        expect(a.h).toBe(before.h);
    });

    it("toggleMaximize() is a no-op for dialogs", () => {
        const wm = new WindowManager();
        const d = open(wm, { dialog: true });
        wm.toggleMaximize(d.id);
        expect(d.maximized).toBe(false);
        wm.minimize(d.id);
        expect(d.minimized).toBe(false); // dialogs can't be minimized either
    });

    it("close() removes the window and falls back focus", () => {
        const wm = new WindowManager();
        const a = open(wm);
        const b = open(wm);
        const c = open(wm);
        const removed = wm.close(c.id);
        expect(removed).toBe(c);
        expect(wm.get(c.id)).toBeNull();
        expect(wm.activeWindowId).toBe(b.id);
        expect(wm.windows.map((w) => w.id)).toEqual([a.id, b.id]);
    });

    it("close() of a non-active window keeps the active one", () => {
        const wm = new WindowManager();
        const a = open(wm);
        const b = open(wm);
        wm.close(a.id);
        expect(wm.activeWindowId).toBe(b.id);
    });

    it("close() of the last window leaves nothing active", () => {
        const wm = new WindowManager();
        const a = open(wm);
        wm.close(a.id);
        expect(wm.windows).toHaveLength(0);
        expect(wm.activeWindowId).toBeNull();
    });

    it("cascade() arranges visible windows down-right and unmaximizes", () => {
        const wm = new WindowManager();
        const a = open(wm);
        const b = open(wm);
        const c = open(wm);
        wm.minimize(c.id); // invisible in the layout
        wm.toggleMaximize(b.id);
        wm.cascade(VW, VH);
        expect(a.x).toBe(CASCADE_START);
        expect(a.y).toBe(CASCADE_START);
        expect(b.x).toBe(CASCADE_START + CASCADE_STEP);
        expect(b.y).toBe(CASCADE_START + CASCADE_STEP);
        expect(b.maximized).toBe(false);
        // the last cascaded window ends up active
        expect(wm.activeWindowId).toBe(b.id);
        // geometry unchanged for the minimized window
        const cBefore = { x: c.x, y: c.y };
        expect(c.x).toBe(cBefore.x);
    });

    it("tile() fills the desktop grid in window order", () => {
        const wm = new WindowManager();
        const a = open(wm);
        const b = open(wm);
        const c = open(wm);
        const d = open(wm);
        wm.tile(VW, VH);
        // 4 windows → 2x2 grid, taskbar reserved on the bottom
        const wW = Math.floor(VW / 2);
        const hH = Math.floor((VH - 28) / 2);
        expect(a.x).toBe(0);
        expect(a.y).toBe(0);
        expect(b.x).toBe(wW);
        expect(b.y).toBe(0);
        expect(c.x).toBe(0);
        expect(c.y).toBe(hH);
        expect(d.x).toBe(wW);
        expect(d.y).toBe(hH);
        expect(wm.activeWindowId).toBe(d.id);
    });

    it("tile() skips minimized windows", () => {
        const wm = new WindowManager();
        const a = open(wm);
        const b = open(wm);
        wm.minimize(b.id);
        wm.tile(VW, VH);
        expect(a.w).toBe(VW);
        expect(a.h).toBe(VH - 28);
        expect(b.x).not.toBe(0);
    });
});