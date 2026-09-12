import { describe, expect, it } from "vitest";
import { buildSearchIndex, filterSearchNodes } from "../src/lib/search";
import type { BookmarkNode } from "../src/lib/bookmarks";

function folder(
    id: string,
    title: string,
    children: BookmarkNode[] = [],
    parentId = "0",
): BookmarkNode {
    return { id, title, parentId, children };
}

function bookmark(id: string, title: string, url: string, parentId = "0"): BookmarkNode {
    return { id, title, url, parentId };
}

function sampleTree(): BookmarkNode {
    return folder("0", "root", [
        folder("1", "Панель закладок", [
            bookmark("11", "GitHub", "https://github.com"),
            bookmark("12", "Gmail", "https://mail.google.com"),
            folder("13", "Dev", [bookmark("131", "Docker Hub", "https://hub.docker.com")]),
        ]),
        bookmark("2", "Яндекс", "https://ya.ru"),
    ]);
}

describe("buildSearchIndex", () => {
    it("flattens bookmarks and folders with breadcrumb paths", () => {
        const nodes = buildSearchIndex(sampleTree());
        const byId = new Map(nodes.map((n) => [n.id, n]));
        expect(nodes).toHaveLength(6);

        expect(byId.get("11")).toMatchObject({
            title: "GitHub",
            isFolder: false,
            path: "Панель закладок",
        });
        expect(byId.get("131")).toMatchObject({
            title: "Docker Hub",
            isFolder: false,
            path: "Панель закладок > Dev",
        });
        expect(byId.get("13")).toMatchObject({
            title: "Dev",
            isFolder: true,
            url: null,
            path: "Панель закладок",
        });
        expect(byId.get("2")?.path).toBe("");
    });

    it("precomputes lowercased copies", () => {
        const [root] = buildSearchIndex(folder("1", "Панель")); // no — root has no children
        const nodes = buildSearchIndex(sampleTree());
        const gh = nodes.find((n) => n.id === "11");
        expect(gh?._tl).toBe("github");
        expect(gh?._ul).toBe("https://github.com");
        const dev = nodes.find((n) => n.id === "13");
        expect(dev?._pl).toBe("панель закладок");
    });

    it("handles empty/null trees", () => {
        expect(buildSearchIndex(null)).toEqual([]);
        expect(buildSearchIndex(undefined)).toEqual([]);
        expect(buildSearchIndex(folder("0", "root"))).toEqual([]);
    });
});

describe("filterSearchNodes", () => {
    const nodes = buildSearchIndex(sampleTree());

    it("ranks by title-starts-with first, then alphabetical", () => {
        const res = filterSearchNodes(nodes, "g", 10);
        expect(res.map((n) => n.id)).toEqual(["11", "12"]); // GitHub before Gmail
    });

    it("prefers title matches over url matches", () => {
        // "docker" only matches via path, "hub" matches url of 131 + path
        const res = filterSearchNodes(nodes, "hub", 10);
        expect(res[0]?.id).toBe("131");
        expect(res.length).toBeGreaterThan(0);
    });

    it("matches paths and urls too", () => {
        const res = filterSearchNodes(nodes, "mail.google", 10);
        expect(res.map((n) => n.id)).toContain("12");
    });

    it("empty query returns first `limit` entries unsorted", () => {
        const res = filterSearchNodes(nodes, "", 2);
        expect(res).toHaveLength(2);
        expect(res[0]?.id).toBe("1"); // insertion order preserved
        expect(res[1]?.id).toBe("11");
    });

    it("undefined filter behaves like empty", () => {
        expect(filterSearchNodes(nodes, undefined, 10)).toHaveLength(nodes.length);
    });

    it("case-insensitive", () => {
        const res = filterSearchNodes(nodes, "GITHUB", 10);
        expect(res.map((n) => n.id)).toEqual(["11"]);
    });
});