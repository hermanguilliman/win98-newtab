/**
 * Search: flattening the bookmark tree into a rankable list and the ranked
 * filter query used by the «Поиск» window.
 */
import type { BookmarkNode } from "./bookmarks";
import { isBookmarkNode, isFolderNode } from "./bookmarks";

export interface SearchNode {
    id: string;
    title: string;
    /** null for folders, the URL for bookmarks. */
    url: string | null | undefined;
    path: string | undefined;
    isFolder: boolean;
    /** Lowercased copies are precomputed so filtering/sorting never re-lowercases. */
    _tl: string;
    _ul: string;
    _pl: string;
}

/** Flatten the whole tree into a searchable list of bookmarks and folders. */
export function buildSearchIndex(
    tree: BookmarkNode | null | undefined,
): SearchNode[] {
    const out: SearchNode[] = [];
    const walk = (node: BookmarkNode | null | undefined, path: string | undefined) => {
        if (!node) return;
        const p = path ? `${path} > ${node.title}` : node.title;
        const title = node.title || "";
        if (isBookmarkNode(node)) {
            out.push({
                id: node.id,
                title,
                url: node.url,
                path,
                isFolder: false,
                _tl: title.toLowerCase(),
                _ul: (node.url || "").toLowerCase(),
                _pl: (path || "").toLowerCase(),
            });
        } else if (isFolderNode(node)) {
            out.push({
                id: node.id,
                title,
                url: null,
                path,
                isFolder: true,
                _tl: title.toLowerCase(),
                _ul: "",
                _pl: (path || "").toLowerCase(),
            });
            (node.children || []).forEach((c) => walk(c, p));
        }
    };
    (tree ? tree.children || [] : []).forEach((r) => walk(r, ""));
    return out;
}

/** Rank: title-starts-with > title-contains > url-starts-with > url-contains. */
export function scoreNode(n: SearchNode, q: string): number {
    if (n._tl.startsWith(q)) return 0;
    if (n._tl.includes(q)) return 1;
    if (n._ul.startsWith(q)) return 2;
    return 3;
}

/**
 * Filter + rank + trim to `limit` (mirrors the search window's live filter:
 * empty query returns the first `limit` entries unsorted).
 */
export function filterSearchNodes(
    nodes: SearchNode[],
    filter: string | undefined,
    limit: number,
): SearchNode[] {
    const q = (filter || "").toLowerCase().trim();
    let list = nodes;
    if (q) {
        list = nodes.filter(
            (n) => n._tl.includes(q) || n._ul.includes(q) || n._pl.includes(q),
        );
        list = list.sort(
            (a, b) =>
                scoreNode(a, q) - scoreNode(b, q) ||
                a.title.localeCompare(b.title, "ru"),
        );
    }
    return list.slice(0, limit);
}