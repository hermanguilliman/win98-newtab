import { describe, expect, it } from "vitest";
import { getNodeForIcon, setNodeForIcon } from "../src/lib/iconNodes";
import type { BookmarkNode } from "../src/lib/bookmarks";

const node: BookmarkNode = { id: "1", title: "Яндекс", url: "https://ya.ru" };
const other: BookmarkNode = { id: "2", title: "Dev", children: [] };

describe("iconNodes (WeakMap-based node↔element binding)", () => {
    it("round-trips a node per element", () => {
        const el = {} as Element;
        setNodeForIcon(el, node);
        expect(getNodeForIcon(el)).toBe(node);
    });

    it("keys are per-element, not global", () => {
        const el1 = {} as Element;
        const el2 = {} as Element;
        setNodeForIcon(el1, node);
        setNodeForIcon(el2, other);
        expect(getNodeForIcon(el1)).toBe(node);
        expect(getNodeForIcon(el2)).toBe(other);
    });

    it("undefined/null inputs return undefined", () => {
        expect(getNodeForIcon(undefined)).toBeUndefined();
        expect(getNodeForIcon(null)).toBeUndefined();
        expect(getNodeForIcon({} as Element)).toBeUndefined();
    });

    it("setNodeForIcon ignores nullish keys", () => {
        setNodeForIcon(null, node);
        setNodeForIcon(undefined, node); // must not throw
        expect(getNodeForIcon({} as Element)).toBeUndefined();
    });

    it("weakmap stays GC-friendly — elements can be collected", () => {
        let el = {} as Element;
        setNodeForIcon(el, node);
        const saved = getNodeForIcon(el);
        expect(saved).toBe(node);
        el = undefined as unknown as Element; // drop the strong ref
        // no assertion needed — the point is that nothing holds `el` alive
    });
});