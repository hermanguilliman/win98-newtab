import { describe, expect, it } from "vitest";
import {
    computeWindowStackPosition,
    WINDOW_STACK_OFFSET,
    WINDOW_STACK_WRAP,
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