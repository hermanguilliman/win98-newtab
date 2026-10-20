/**
 * Bookmark tree loading + live sync.
 * Reads the tree from chrome.bookmarks, renders the desktop roots and keeps every
 * open folder window (and the search window) in step with tree events. The
 * desktop render itself lives in src/ui/desktop.js; this module owns the
 * tree <-> UI sync.
 */

import { $desktop, $desktopIcons } from "./dom";
import { BOOKMARK_REFRESH_DEBOUNCE_MS } from "../constants";
import {
    ALL_ROOT_ID,
    ROOT_ORDER,
    buildAllBookmarksNode,
    buildNodeIndex,
} from "../lib/bookmarks";
import { state, findNodeById } from "../state";
import { closeWindow } from "./windows";
import { desktopIconsById, renderDesktopIcons } from "./desktop";
import {
    renderFolderContent,
    resolveNavNode,
    updateNavButtons,
} from "./folder";
import { refreshSearchWindow } from "./searchWindow";

/* ============================================================
 BOOKMARKS LOADING
 ============================================================ */

export async function loadBookmarks() {
    let tree;
    try {
        const result = await chrome.bookmarks.getTree();
        tree = result[0];
    } catch (err) {
        showEmptyState(
            "Не удалось загрузить закладки. Проверьте права расширения.",
        );
        return;
    }

    state.treeRoot = tree;
    state.nodeIndex = buildNodeIndex(tree);
    renderBookmarks(tree);
}

/** Render the desktop icons from a bookmarks tree (used on init and on live refresh).
    Without `force` the render is incremental — existing icon elements are reused. */
export function renderBookmarks(tree, force) {
    const emptyMsg = document.querySelector(".empty-desktop-msg");
    if (emptyMsg) emptyMsg.remove();

    const children = tree ? tree.children || [] : [];
    const roots = children
        .filter((n) => n.children && n.children.length > 0)
        .sort(
            (a, b) => (ROOT_ORDER[a.id] ?? 99) - (ROOT_ORDER[b.id] ?? 99),
        );

    // A bookmark anywhere makes its root have children, so `roots` is empty
    // only when there are truly no bookmarks at all — no extra full-tree walk.
    if (roots.length === 0) {
        $desktopIcons.replaceChildren();
        desktopIconsById.clear();
        showEmptyState(
            "Нет закладок. Добавьте закладки в Chrome и они появятся здесь.",
        );
        return;
    }

    renderDesktopIcons(roots, force);
}

function showEmptyState(msg) {
    const el = document.createElement("div");
    el.className = "empty-desktop-msg";
    el.textContent = msg;
    $desktop.appendChild(el);
}

/* ============================================================
 LIVE SYNC with the bookmarks service
 ============================================================ */

export function attachBookmarkListeners() {
    ["onCreated", "onRemoved", "onChanged", "onMoved"].forEach((evt) => {
        const api = chrome.bookmarks[evt];
        if (api && typeof api.addListener === "function") {
            api.addListener(scheduleBookmarksRefresh);
        }
    });
}

export function scheduleBookmarksRefresh() {
    clearTimeout(state.bookmarksRefreshTimer);
    state.bookmarksRefreshTimer = setTimeout(refreshAllBookmarks, BOOKMARK_REFRESH_DEBOUNCE_MS);
}

/** Re-read the whole tree, re-render the desktop and all windows that show a folder */
export async function refreshAllBookmarks() {
    let tree = state.treeRoot;
    try {
        tree = (await chrome.bookmarks.getTree())[0];
        state.treeRoot = tree;
        state.nodeIndex = buildNodeIndex(tree);
    } catch {
        // Permission revoked or API unavailable — keep showing what we have
        return;
    }
    renderBookmarks(tree);
    refreshOpenFolderWindows(tree);
    refreshSearchWindow();
}

export function refreshOpenFolderWindows(tree) {
    state.windows.forEach((w) => {
        if (w.bookmarkId == null) return;
        const fc = w.el && w.el.querySelector(".folder-content");
        if (!fc) return;

        // The «Все закладки» top-level listing (or a nested folder inside that window)
        if (w.bookmarkId === ALL_ROOT_ID || w.winType === "all-bookmarks") {
            const target = resolveNavNode(w.currentNode, tree);
            if (!target) {
                // Current folder was deleted → return to the top-level listing
                w.currentNode = buildAllBookmarksNode(tree);
                w.bookmarkId = ALL_ROOT_ID;
                renderFolderContent(w, w.currentNode);
            } else {
                w.currentNode = target;
                if (w.bookmarkId !== target.id) w.bookmarkId = target.id;
                renderFolderContent(w, target);
            }
            updateNavButtons(w);
            return;
        }

        const node = tree ? findNodeById(tree, w.bookmarkId) : null;
        if (!node) {
            closeWindow(w.id); // folder was deleted
            return;
        }
        w.currentNode = node;
        renderFolderContent(w, node);
        updateNavButtons(w);
    });
}
