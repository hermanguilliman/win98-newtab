import { describe, expect, it } from "vitest";
import {
    ALL_ROOT_ID,
    ROOT_ORDER,
    buildNodeIndex,
    getNodePath,
    isBookmarkNode,
    isFolderNode,
    isRootFolder,
    isVisibleNode,
} from "../src/lib/bookmarks";
import type { BookmarkNode } from "../src/lib/bookmarks";

function folder(
    id: string,
    title: string,
    parentId: string,
    children: BookmarkNode[] = [],
): BookmarkNode {
    return { id, title, parentId, children };
}

function bookmark(id: string, title: string, url: string, parentId: string): BookmarkNode {
    return { id, title, url, parentId };
}

/** Chrome separator node: url: "" and no children — must never render. */
function separator(id: string, parentId: string): BookmarkNode {
    return { id, title: "---", url: "", parentId };
}

describe("predicates", () => {
    it("isFolderNode: folders yes, bookmarks and separators no", () => {
        expect(isFolderNode(folder("1", "Папка", "0"))).toBe(true);
        expect(isFolderNode(folder("1", "Папка", "0", [bookmark("2", "x", "https://x", "1")]))).toBe(true);
        expect(isBookmarkNode(bookmark("2", "x", "https://x", "1"))).toBe(true);
        expect(isFolderNode(separator("3", "1"))).toBe(false);
        expect(isFolderNode(null)).toBe(false);
        expect(isFolderNode(undefined)).toBe(false);
    });

    it("isBookmarkNode: bookmarks yes, folders/separators no", () => {
        expect(isBookmarkNode(bookmark("2", "x", "https://x", "1"))).toBe(true);
        expect(isBookmarkNode(folder("1", "Папка", "0"))).toBe(false);
        expect(isBookmarkNode(separator("3", "1"))).toBe(false);
        expect(isBookmarkNode(null)).toBe(false);
    });

    it("isVisibleNode filters separators", () => {
        expect(isVisibleNode(bookmark("2", "x", "https://x", "1"))).toBe(true);
        expect(isVisibleNode(folder("1", "Папка", "0"))).toBe(true);
        expect(isVisibleNode(separator("3", "1"))).toBe(false);
    });

    it("isRootFolder: only nodes with parentId 0", () => {
        expect(isRootFolder({ id: "1", title: "Панель закладок", parentId: "0" })).toBe(true);
        expect(isRootFolder(folder("1", "Папка", "0"))).toBe(true);
        expect(isRootFolder(folder("1", "Папка", "12"))).toBe(false);
        expect(isRootFolder(null)).toBe(false);
    });
});

describe("buildNodeIndex", () => {
    it("indexes the whole tree by id", () => {
        const tree = folder("0", "root", "", [
            folder("1", "Bar", "0", [bookmark("11", "g", "https://g", "1")]),
            bookmark("2", "b", "https://b", "0"),
        ]);
        const idx = buildNodeIndex(tree);
        expect(idx.get("0")?.title).toBe("root");
        expect(idx.get("11")?.url).toBe("https://g");
        expect(idx.get("2")?.title).toBe("b");
        expect(idx.get("nope")).toBeUndefined();
        expect(buildNodeIndex(null).size).toBe(0);
    });
});

describe("getNodePath", () => {
    it("builds root > parent > node from the index", () => {
        const root = folder("0", "root", "", [
            folder("1", "Панель закладок", "0", [
                folder("12", "Dev", "1", [bookmark("99", "GH", "https://github.com", "12")]),
            ]),
        ]);
        const idx = buildNodeIndex(root);
        expect(getNodePath(idx.get("99"), idx)).toBe("Панель закладок > Dev > GH");
    });

    it("breaks the chain gracefully when a parent is missing from the index", () => {
        const orphan = bookmark("77", "Сирота", "https://x", "missing-parent");
        expect(getNodePath(orphan, new Map())).toBe("Сирота");
        expect(getNodePath(null, new Map())).toBe("/");
        expect(getNodePath({ id: "55", title: "", parentId: "0" }, new Map())).toBe("/");
    });
});

describe("constants", () => {
    it("root order covers the three Chrome roots", () => {
        expect(ROOT_ORDER[1]).toBe(0); // Панель закладок
        expect(ROOT_ORDER[2]).toBe(1); // Другие
        expect(ROOT_ORDER[3]).toBe(2); // Мобильные
    });

    it("all-bookmarks id is a string constant", () => {
        expect(ALL_ROOT_ID).toBe("__root__");
    });
});