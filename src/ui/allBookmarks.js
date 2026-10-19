/**
 * The single-instance «Все закладки» window: a flat listing of every Chrome root
 * group (Панель закладок, Другие, Мобильные) that reuses the folder-window item
 * renderer and navigates in place.
 */

/* ============================================================
 ALL BOOKMARKS WINDOW
 ============================================================ */

import { ALL_ROOT_ID, buildAllBookmarksNode, buildNodeIndex } from "../lib/bookmarks";
import { bringToFront, createWindow, restoreWindow } from "./windows";
import { currentFolderViewMode, goBack, goUp, navigateInWindow, renderFolderContent, resolveNavNode, setFolderViewMode, updateNavButtons } from "./folder";
import { drawFolderIcon } from "./icons";
import { state } from "../state";

export function openAllBookmarksWindow() {
    // Single instance — track by winType, not title (title changes while browsing)
    const existing = state.windows.find(
        (w) => w.winType === "all-bookmarks",
    );
    if (existing) {
        if (existing.minimized) restoreWindow(existing.id);
        else bringToFront(existing.id);
        return Promise.resolve(existing);
    }

    return new Promise((resolve) => {
        chrome.bookmarks.getTree((tree) => {
            state.treeRoot = tree[0];
            state.nodeIndex = buildNodeIndex(tree[0]);

        const toolbarHtml = `
    <button class="win98-toolbar-btn" data-nav="back" disabled>
      <span>← Назад</span>
    </button>
    <button class="win98-toolbar-btn" data-nav="up" disabled>
      <span>⬆ Вверх</span>
    </button>
    <button class="win98-toolbar-btn" data-nav="refresh">
      <span>🔄 Обновить</span>
    </button>
    <button class="win98-toolbar-btn" data-nav="view">
      <span>Вид: Список</span>
    </button>
  `;

        const win = createWindow({
            winType: "all-bookmarks",
            title: "Все закладки",
            icon: drawFolderIcon("#d4c044", true),
            width: 650,
            height: 450,
            toolbar: toolbarHtml,
            bookmarkId: ALL_ROOT_ID,
            addressbar: true,
            addressbarValue: "Все закладки",
            content: "",
            statusbar: true,
            statusText: "",
            onCreated: (el, winData) => {
                winData.currentNode = buildAllBookmarksNode(state.treeRoot);
                winData.navStack = [];
                renderFolderContent(winData, winData.currentNode);
                updateNavButtons(winData);

                el.querySelector('[data-nav="back"]')?.addEventListener(
                    "click",
                    () => goBack(winData),
                );
                el.querySelector('[data-nav="up"]')?.addEventListener(
                    "click",
                    () => goUp(winData),
                );
                el.querySelector('[data-nav="refresh"]')?.addEventListener(
                    "click",
                    () => {
                        chrome.bookmarks.getTree((t) => {
                            state.treeRoot = t[0];
                            state.nodeIndex = buildNodeIndex(t[0]);
                            const target = resolveNavNode(
                                winData.currentNode,
                                t[0],
                            );
                            if (target)
                                navigateInWindow(winData, target, {
                                    fromHistory: true,
                                });
                            else updateNavButtons(winData);
                        });
                    },
                );
                el.querySelector('[data-nav="view"]')?.addEventListener(
                    "click",
                    () =>
                        setFolderViewMode(
                            currentFolderViewMode() === "list"
                                ? "icons"
                                : "list",
                        ),
                );
            },
        });
        resolve(win);
        });
    });
}
