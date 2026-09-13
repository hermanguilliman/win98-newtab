import { describe, expect, it } from "vitest";
import {
    ALL_ROOT_ID,
    FOLDER_COLORS,
    ROOT_ORDER,
    buildAllBookmarksNode,
    buildNodeIndex,
    folderColorAt,
    folderColorFor,
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

describe("buildAllBookmarksNode", () => {
    it("builds the synthetic root with only visible children", () => {
        const tree = folder("0", "root", "", [
            folder("1", "Bar", "0", [bookmark("11", "g", "https://g", "1")]),
            bookmark("2", "b", "https://b", "0"),
            { id: "3", title: "sep", parentId: "0" }, // separator: no url, no children
        ]);
        const node = buildAllBookmarksNode(tree);
        expect(node.id).toBe(ALL_ROOT_ID);
        expect(node.title).toBe("Все закладки");
        expect((node.children || []).map((n) => n.id)).toEqual(["1", "2"]);
    });

    it("filters out invisible nodes from deeper folders", () => {
        const tree = folder("0", "root", "", [
            folder("1", "Bar", "0", [
                bookmark("11", "g", "https://g", "1"),
                { id: "12", title: "sep2", parentId: "1" },
            ]),
        ]);
        const node = buildAllBookmarksNode(tree);
        expect((node.children || []).map((n) => n.id)).toEqual(["1"]);
    });

    it("never caches — returns a fresh node on every call", () => {
        const tree = folder("0", "root", "", [
            bookmark("2", "b", "https://b", "0"),
        ]);
        const first = buildAllBookmarksNode(tree);
        expect(first).not.toBe(buildAllBookmarksNode(tree));
        expect(first.children).not.toBe(buildAllBookmarksNode(tree).children);
    });

    it("tolerates null/undefined tree and missing children", () => {
        expect(buildAllBookmarksNode(null).children).toEqual([]);
        expect(buildAllBookmarksNode(undefined).children).toEqual([]);
        expect(buildAllBookmarksNode(folder("0", "root", "")).children).toEqual([]);
    });
});

describe("folderColorFor", () => {
    it("is deterministic — the same id always maps to the same color", () => {
        const ids = ["1", "2", "3", "folder-42", "Папка с именем"];
        ids.forEach((id) => {
            expect(folderColorFor(id)).toBe(folderColorFor(id));
        });
    });

    it("always returns a color from the palette", () => {
        for (let i = 0; i < 50; i++) {
            expect(FOLDER_COLORS).toContain(folderColorFor("some-id-" + i));
        }
    });

    it("different ids can share a color (hash collisions are fine)", () => {
        expect(folderColorFor("a")).toBe(folderColorFor("a"));
        expect(typeof folderColorFor("anything")).toBe("string");
    });
});

describe("folderColorAt", () => {
    it("cycles through the palette", () => {
        FOLDER_COLORS.forEach((color, i) => {
            expect(folderColorAt(i)).toBe(color);
        });
        expect(folderColorAt(FOLDER_COLORS.length)).toBe(FOLDER_COLORS[0]);
        expect(folderColorAt(FOLDER_COLORS.length + 2)).toBe(FOLDER_COLORS[2]);
    });

    it("handles negative indexes via abs", () => {
        expect(folderColorAt(-1)).toBe(FOLDER_COLORS[1]);
    });
});
