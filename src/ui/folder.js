/**
 * Folder windows: a single-window tree browser that navigates in place
 * (history via navStack, «Вверх» to the parent), renders the icon/list view and
 * hosts the per-window toolbar.
 */

/* ============================================================
 FOLDER WINDOW
 ============================================================ */

/** Re-resolve a nav target against the live tree (synthetic root is always rebuilt fresh) */
/** @typedef {import("../types").BookmarkNode} BookmarkNode */
/** @typedef {import("../types").IconEl} IconEl */
/** @typedef {import("../types").WinData} WinData */
import { ALL_ROOT_ID, buildAllBookmarksNode, folderColorFor, getNodePath, isBookmarkNode, isFolderNode, isRootFolder, isVisibleNode } from "../lib/bookmarks";
import { bringToFront, createWindow, restoreWindow, scheduleWindowStateSave } from "./windows";
import { findNodeById, state } from "../state";
import { buildNodeContextMenuItems } from "./nodeOps";
import { canDropIntoFolder, canDropNextTo, clearDropHighlights, clearDropTargets, insertionIndex, isAfterMidpoint, moveBookmarkTo, wireFolderBackgroundDrop } from "./dragdrop";
import { CLICK_DEBOUNCE_MS } from "../constants";
import { currentIconSize, drawFolderIcon } from "./icons";
import { DEFAULT_SETTINGS } from "../lib/settings";
import { handleAuxClick, isSingleClickMode, openNode } from "./desktop";
import { saveSettings } from "./settings";
import { setFaviconImage } from "./favicon";
import { showContextMenu } from "./contextmenu";

/** Placeholder shown when the displayed folder has no visible children. */
const EMPTY_FOLDER_HTML =
    '<div style="padding:20px;color:#808080;font-size:11px;">Папка пуста</div>';

export function resolveNavNode(node, tree) {
    const t = tree || state.treeRoot;
    if (!node) return null;
    if (node.id === ALL_ROOT_ID) return buildAllBookmarksNode(t);
    return findNodeById(t, node.id) || null;
}

/** Current folder-window view mode: "icons" grid or "list" rows */
export function currentFolderViewMode() {
    return (
        state.previewFolderViewMode ||
        (state.settings && state.settings.folderViewMode) ||
        "icons"
    );
}

/** Set the folder-window view mode globally, persist it and re-render open windows */
export function setFolderViewMode(mode) {
    if (mode !== "icons" && mode !== "list") return;
    state.settings = {
        ...(state.settings || DEFAULT_SETTINGS),
        folderViewMode: mode,
    };
    state.previewFolderViewMode = null;
    saveSettings();
    applyFolderViewModeToWindows(mode);
}

/** Apply the view-mode class + toolbar label to every open folder window */
function applyFolderViewModeToWindows(mode) {
    state.windows.forEach((w) => {
        if (!w.el) return;
        const fc = w.el.querySelector(".folder-content");
        if (fc) fc.classList.toggle("folder-view-list", mode === "list");
        const viewBtn = w.el.querySelector('[data-nav="view"]');
        if (viewBtn) {
            const target = mode === "list" ? "Значки" : "Список";
            const sp = viewBtn.querySelector("span");
            if (sp) sp.textContent = "Вид: " + target;
        }
    });
}

/**
 * Render the children of `node` into an already-open folder window and keep
 * the title / addressbar / statusbar / nav buttons in sync.
 */
/** @param {WinData} winData @param {BookmarkNode} node */
export function renderFolderContent(winData, node) {
    const el = winData.el;
    if (!el) return;
    // The window may be created with empty content — ensure the folder container exists
    let fc = el.querySelector(".folder-content");
    if (!fc) {
        const contentEl = el.querySelector(".win98-window-content");
        if (!contentEl) return;
        fc = document.createElement("div");
        fc.className = "folder-content";
        contentEl.appendChild(fc);
    }
    // Empty area drops append to the folder currently shown in this window
    wireFolderBackgroundDrop(
        /** @type {HTMLElement & { _dropWired?: boolean }} */ (fc),
        winData,
    );

    const items = (node.children || []).filter((n) => isVisibleNode(n));
    fc.innerHTML = "";
    const viewMode = currentFolderViewMode();
    fc.classList.toggle("folder-view-list", viewMode === "list");
    // Toolbar view toggle shows the mode it will switch to
    const viewBtn = /** @type {HTMLElement} */ (
        el.querySelector('[data-nav="view"]')
    );
    if (viewBtn) {
        const target = viewMode === "list" ? "Значки" : "Список";
        const sp = viewBtn.querySelector("span");
        if (sp) sp.textContent = "Вид: " + target;
        viewBtn.title =
            target === "Список"
                ? "Переключить в режим «Список»"
                : "Переключить в режим «Значки»";
    }
    if (items.length === 0) {
        fc.innerHTML = EMPTY_FOLDER_HTML;
    } else {
        for (const item of items) {
            fc.appendChild(
                createFolderItem(item, node, {
                    // Folders inside a window navigate the SAME window instead of opening a new one
                    navigateTo: isFolderNode(item)
                        ? (n) => navigateInWindow(winData, n)
                        : undefined,
                }),
            );
        }
    }

    const titleEl = el.querySelector(".win98-titlebar-text");
    if (titleEl) titleEl.textContent = node.title || "Папка";
    const tbBtn = document.getElementById(`tb-${winData.id}`);
    if (tbBtn) {
        const tbSpan = tbBtn.querySelector("span");
        if (tbSpan) tbSpan.textContent = node.title || "Папка";
    }
    const ab = /** @type {HTMLInputElement} */ (el.querySelector(".win98-addressbar-input"));
    if (ab) ab.value = getNodePath(node, state.nodeIndex);
    const sf = el.querySelector(".win98-statusbar-field");
    if (sf) {
        const folders = items.filter(isFolderNode).length;
        const bookmarks = items.filter(isBookmarkNode).length;
        sf.textContent =
            node.id === ALL_ROOT_ID
                ? `Корневых папок: ${folders}`
                : `${folders} пап(ок), ${bookmarks} элемент(ов)`;
    }
    const sf2 = el.querySelector(".win98-statusbar-field2");
    if (sf2) sf2.textContent = `Объектов: ${items.length}`;
}

/** Navigate an open folder window to another folder (same window, no new window) */
/** @param {WinData} winData @param {BookmarkNode} node @param {{fromHistory?: boolean}} [opts] */
export function navigateInWindow(winData, node, opts) {
    opts = opts || {};
    if (!winData || !node) return;
    if (!opts.fromHistory) {
        // Save the current folder so «Назад» can return to it
        winData.navStack.push(winData.currentNode || null);
    }
    const target = opts.fromHistory ? node : resolveNavNode(node) || node;
    winData.currentNode = target;
    winData.bookmarkId = target.id;
    renderFolderContent(winData, target);
    updateNavButtons(winData);
    scheduleWindowStateSave();
}

/** @param {WinData} winData */
export function goBack(winData) {
    const prev = winData.navStack.pop();
    if (!prev) return;
    const target = resolveNavNode(prev);
    if (target) navigateInWindow(winData, target, { fromHistory: true });
}

/** @param {WinData} winData */
export function goUp(winData) {
    const cur = winData.currentNode;
    if (!cur) return;
    if (cur.id === ALL_ROOT_ID) return; // top level — button is disabled anyway
    if (cur.parentId && cur.parentId !== "0") {
        const parent = resolveNavNode({ id: cur.parentId });
        if (parent) {
            navigateInWindow(winData, parent);
            return;
        }
    }
    // Chrome root folder (parentId "0") → up to the «Все закладки» listing
    navigateInWindow(winData, buildAllBookmarksNode(state.treeRoot));
}

/** «Назад» disabled without history; «Вверх» disabled at the top level (no previous level) */
/** @param {WinData} winData */
export function updateNavButtons(winData) {
    const el = winData.el;
    if (!el) return;
    const back = /** @type {HTMLButtonElement} */ (el.querySelector('[data-nav="back"]'));
    if (back) back.disabled = winData.navStack.length === 0;
    const up = /** @type {HTMLButtonElement} */ (el.querySelector('[data-nav="up"]'));
    if (up) {
        const cur = winData.currentNode;
        up.disabled = !cur || cur.id === ALL_ROOT_ID;
    }
}

export function openFolderWindow(node) {
    // Single instance per folder: if it is already displayed in some window,
    // just bring that window to the front instead of opening a new one.
    const existing = state.windows.find((w) => w.bookmarkId === node.id);
    if (existing) {
        if (existing.minimized) restoreWindow(existing.id);
        else bringToFront(existing.id);
        return;
    }

    const folderIcon = drawFolderIcon(
        folderColorFor(node.id),
        true,
    );

    const toolbarHtml = `
  <button class="win98-toolbar-btn" data-nav="back" disabled>
    <span>← Назад</span>
  </button>
  <button class="win98-toolbar-btn" data-nav="up" disabled>
    <span>⬆ Вверх</span>
  </button>
  <button class="win98-toolbar-btn" data-nav="view">
    <span>Вид: Список</span>
  </button>
`;

    createWindow({
        title: node.title || "Папка",
        icon: folderIcon,
        bookmarkId: node.id,
        width: 550,
        height: 400,
        toolbar: toolbarHtml,
        addressbar: true,
        addressbarValue: getNodePath(node, state.nodeIndex),
        content: "",
        statusbar: true,
        statusText: "",
        onCreated: (el, winData) => {
            // Folder windows browse the tree with history in a single window
            winData.currentNode = node;
            winData.navStack = [];
            renderFolderContent(winData, node);
            updateNavButtons(winData);

            // Second statusbar field: «Объектов: N» (Win98 Explorer style)
            const statusBar = el.querySelector(".win98-statusbar");
            if (statusBar) {
                const objField = document.createElement("div");
                objField.className =
                    "win98-statusbar-field win98-statusbar-field2";
                objField.textContent = "Объектов: 0";
                statusBar.appendChild(objField);
            }

            el.querySelector('[data-nav="back"]')?.addEventListener(
                "click",
                () => goBack(winData),
            );
            el.querySelector('[data-nav="up"]')?.addEventListener(
                "click",
                () => goUp(winData),
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
}

/**
 * @param {BookmarkNode} node
 * @param {BookmarkNode} parentNode
 * @param {{navigateTo?: (folder: BookmarkNode) => void}} [options]
 * @returns {IconEl}
 */
function createFolderItem(node, parentNode, options) {
    options = options || {};
    /** @type {IconEl} */
    const div = document.createElement("div");
    div.className = "folder-item";
    div.dataset.bookmarkId = String(node.id || "");

    const isFolder = isFolderNode(node);
    const img = document.createElement("img");
    img.draggable = false;

    if (isFolder) {
        img.src = drawFolderIcon(folderColorFor(node.id));
    } else {
        setFaviconImage(img, node.url, currentIconSize());
    }

    const label = document.createElement("div");
    label.className = "folder-item-label";
    label.textContent = node.title || node.url || "Без названия";

    div.appendChild(img);
    div.appendChild(label);

    // Open a bookmark normally; a folder either navigates the current window
    // (folder windows / «Все закладки») or opens a new one (desktop, search)
    const openItem = () => {
        if (
            isFolderNode(node) &&
            typeof options.navigateTo === "function"
        ) {
            options.navigateTo(node);
        } else {
            openNode(node);
        }
    };

    div.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isSingleClickMode()) {
            const prev = Number(div.dataset.lastClick || 0);
            const now = Date.now();
            div.dataset.lastClick = String(now);
            if (now - prev < CLICK_DEBOUNCE_MS) return; // part of a double-click
            openItem();
        } else {
            // Scope to this window's list, not every open folder window
            const scope = div.closest(".folder-content") || document;
            scope
                .querySelectorAll(".folder-item.selected")
                .forEach((d) => d.classList.remove("selected"));
            div.classList.add("selected");
        }
    });

    div.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        if (!isSingleClickMode()) {
            openItem();
        }
    });

    // Middle mouse button → open bookmark in a background tab
    div.addEventListener("auxclick", (e) => handleAuxClick(e, node));

    div.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const scope = div.closest(".folder-content") || document;
        scope
            .querySelectorAll(".folder-item.selected")
            .forEach((d) => d.classList.remove("selected"));
        div.classList.add("selected");
        showContextMenu(
            e.clientX,
            e.clientY,
            buildNodeContextMenuItems(node),
        );
    });

    // ---------- Drag & drop: move this node between folder windows ----------
    // Chrome root folders (parentId "0") are fixed and cannot be moved, but
    // they stay valid drop targets (as folders) below.
    if (!isRootFolder(node)) {
        div.draggable = true;

        div.addEventListener("dragstart", (e) => {
            state.nodeDragState = { id: String(node.id), sourceEl: div };
            e.dataTransfer.effectAllowed = "move";
            try {
                e.dataTransfer.setData("text/plain", String(node.id));
            } catch {
                /* module state is the source of truth */
            }
            div.classList.add("dragging");
        });

        div.addEventListener("dragend", () => {
            state.nodeDragState = null;
            clearDropHighlights();
            div.classList.remove("dragging");
        });
    }

    div.addEventListener("dragover", (e) => {
        const drag = state.nodeDragState;
        if (!drag || drag.id === String(node.id)) return;
        const into = isFolderNode(node) && canDropIntoFolder(drag.id, node.id);
        const nextTo =
            !isFolderNode(node) && canDropNextTo(drag.id, node.id);
        if (!into && !nextTo) return; // no preventDefault → «нельзя» cursor
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        clearDropTargets();
        if (into) {
            div.classList.add("drop-into");
        } else {
            div.classList.add(
                isAfterMidpoint(div, e) ? "drop-after" : "drop-before",
            );
        }
    });

    div.addEventListener("drop", (e) => {
        const drag = state.nodeDragState;
        if (!drag) return;
        e.preventDefault();
        e.stopPropagation();
        clearDropHighlights();
        state.nodeDragState = null;

        // Drop onto a folder → move into it (append at the end)
        if (isFolderNode(node)) {
            if (!canDropIntoFolder(drag.id, node.id)) return;
            moveBookmarkTo(drag.id, node.id, -1);
            return;
        }
        // Drop onto a bookmark → insert before/after it (reorder)
        if (!canDropNextTo(drag.id, node.id)) return;
        const parent = findNodeById(state.treeRoot, node.parentId);
        const idx = insertionIndex(
            parent,
            node.id,
            isAfterMidpoint(div, e),
            drag.id,
        );
        if (idx < 0) return;
        moveBookmarkTo(drag.id, node.parentId, idx);
    });

    return div;
}
