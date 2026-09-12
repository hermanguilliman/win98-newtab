/**
 * Pure bookmark-tree helpers (predicates, indexing, breadcrumbs).
 *
 * `BookmarkNode` mirrors the subset of chrome.bookmarks.BookmarkTreeNode the
 * app actually consumes; structurally compatible with the real type, so the
 * Chrome tree can be passed straight in. Kept free of chrome.* so the logic
 * is unit-testable in Node.
 */

export interface BookmarkNode {
    id: string;
    parentId?: string;
    title: string;
    url?: string;
    children?: BookmarkNode[];
    dateAdded?: number;
    dateGroupModified?: number;
    index?: number;
}

/** Synthetic id of the «Все закладки» root listing (parent of the Chrome root folders). */
export const ALL_ROOT_ID = "__root__";

/**
 * Chrome root folder id → desktop sort order (1=Панель закладок, 2=Другие,
 * 3=Мобильные). Unknown/custom roots sort after these.
 */
export const ROOT_ORDER: Record<number, number> = { 1: 0, 2: 1, 3: 2 };

/** Folder nodes have a children array (possibly empty); bookmarks have a URL. Chrome
 * separator nodes (url: "" without children) must never be rendered as folders. */
export function isFolderNode(n: BookmarkNode | null | undefined): boolean {
    return !!n && !n.url && Array.isArray(n.children);
}

export function isBookmarkNode(n: BookmarkNode | null | undefined): boolean {
    return !!n && !!n.url;
}

/** Anything that should appear on the desktop / in folder windows */
export function isVisibleNode(n: BookmarkNode | null | undefined): boolean {
    return isFolderNode(n) || isBookmarkNode(n);
}

/** Build an id→node index for O(1) lookups (rebuilt after every tree refresh) */
export function buildNodeIndex(
    root: BookmarkNode | null | undefined,
): Map<string, BookmarkNode> {
    const map = new Map<string, BookmarkNode>();
    const walk = (n: BookmarkNode | null | undefined): void => {
        if (!n) return;
        map.set(n.id, n);
        (n.children || []).forEach(walk);
    };
    walk(root);
    return map;
}

/** Chrome root folders sit directly under "0" and can never be moved */
export function isRootFolder(node: BookmarkNode | null | undefined): boolean {
    return !!node && node.parentId === "0";
}

/**
 * Full breadcrumb path (root > … > parent > node), resolved through the
 * id→node index; "/" when the chain is unresolvable.
 */
export function getNodePath(
    node: BookmarkNode | null | undefined,
    nodeIndex: Map<string, BookmarkNode> | null | undefined,
): string {
    const parts: string[] = [];
    let cur = node;
    while (cur && cur.title) {
        parts.unshift(cur.title);
        if (!cur.parentId || cur.parentId === "0") break;
        const parent = nodeIndex && nodeIndex.get(cur.parentId);
        if (!parent) break;
        cur = parent;
    }
    return parts.join(" > ") || "/";
}