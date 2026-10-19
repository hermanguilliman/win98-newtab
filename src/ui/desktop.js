/**
 * Desktop icon rendering: the incremental re-render of the bookmark roots (reusing
 * elements so favicons and selection survive), icon/label helpers, selection and
 * the desktop-wide event delegation.
 */

/* ============================================================
 DESKTOP ICONS RENDERING
 ============================================================ */

// Built/visible desktop icons keyed by bookmark id — lets a refresh reuse
// the existing elements (cleaned favicons, .selected state, canvas folder
// icons) instead of tearing the whole desktop down.
/** @typedef {import("../types").BookmarkNode} BookmarkNode */
/** @typedef {import("../types").IconEl} IconEl */
import { $desktopIcons, eventTargetElement } from "./dom";
import { buildNodeContextMenuItems } from "./nodeOps";
import { openFolderWindow } from "./folder";
import { CLICK_DEBOUNCE_MS } from "../constants";
import { currentIconSize, drawFolderIcon } from "./icons";
import { folderColorFor, isFolderNode, isVisibleNode } from "../lib/bookmarks";
import { getNodeForIcon, setNodeForIcon } from "../lib/iconNodes";
import { setFaviconImage } from "./favicon";
import { showContextMenu } from "./contextmenu";
import { state } from "../state";

export const desktopIconsById = new Map();

/** Fill an icon <img> for a node: folder canvas or (cleaned) favicon. */
function setIconImage(img, node) {
    if (isFolderNode(node)) {
        img.src = drawFolderIcon(folderColorFor(node.id));
        return;
    }
    // Favicon from the persistent cache (or the raw one now, swapping in the
    // background-cleaned copy once fetched); generic page icon as fallback.
    setFaviconImage(img, node.url, currentIconSize());
}

function setIconLabel(icon, node) {
    const label = icon.querySelector(".desktop-icon-label");
    if (label) label.textContent = node.title || node.url || "Без названия";
}

/** Render the desktop icons. Incremental by default: existing elements are
    re-used and re-ordered via replaceChildren (no flicker, no favicon
    re-fetch, selection survives). Pass force=true when every icon must be
    (re)built from scratch (icon size/style changed). */
export function renderDesktopIcons(roots, force) {
    const next = [];
    roots.forEach((root, rootIdx) => {
        if (rootIdx > 0) {
            // Force next group onto a new row
            const sep = document.createElement("div");
            sep.className = "desktop-row-separator";
            next.push(sep);
        }
        const items = root.children || [];
        for (const item of items) {
            if (!isVisibleNode(item)) continue;
            const existing = desktopIconsById.get(item.id);
            if (existing && !force) {
                const prev = getNodeForIcon(existing);
                setIconLabel(existing, item);
                if (!prev || prev.url !== item.url) {
                    const img = existing.querySelector("img");
                    if (img) setIconImage(img, item);
                }
                setNodeForIcon(existing, item);
                next.push(existing);
            } else {
                const icon = createDesktopIcon(item);
                desktopIconsById.set(item.id, icon);
                next.push(icon);
            }
        }
    });

    // Drop mappings for nodes that are no longer on the desktop
    desktopIconsById.clear();
    for (const el of next) {
        if (!el.classList.contains("desktop-icon")) continue;
        const n = getNodeForIcon(el);
        if (n) desktopIconsById.set(n.id, el);
    }

    $desktopIcons.replaceChildren(...next);

    // The selected icon may have been a node that disappeared
    if (state.selectedDesktopEl && !state.selectedDesktopEl.isConnected) {
        state.selectedDesktopEl = null;
    }
}

/** @param {BookmarkNode} node @returns {IconEl} */
function createDesktopIcon(node) {
    /** @type {IconEl} */
    const div = document.createElement("div");
    div.className = "desktop-icon";

    // Create icon image
    const img = document.createElement("img");
    img.draggable = false;
    setIconImage(img, node);

    const label = document.createElement("div");
    label.className = "desktop-icon-label";
    label.textContent = node.title || node.url || "Без названия";

    div.appendChild(img);
    div.appendChild(label);

    // Event handling is delegated on $desktopIcons (see init) — listeners are
    // attached once on the container rather than once per icon.
    setNodeForIcon(div, node);
    return div;
}

export function selectDesktopIcon(el) {
    $desktopIcons
        .querySelectorAll(".desktop-icon.selected")
        .forEach((d) => d.classList.remove("selected"));
    if (!el) return;
    el.classList.add("selected");
    state.selectedDesktopEl = el;
}

/** Attach delegated click/dblclick/auxclick/contextmenu on the desktop icons
    container — one listener set total instead of four per desktop icon. */
export function attachDesktopIconEvents() {
    $desktopIcons.addEventListener("click", (e) => {
        const div = /** @type {IconEl | null} */ (eventTargetElement(e).closest(".desktop-icon"));
        if (!div) return;
        const node = getNodeForIcon(div);
        if (!node) return;
        if (isSingleClickMode()) {
            const prev = Number(div.dataset.lastClick || 0);
            const now = Date.now();
            div.dataset.lastClick = String(now);
            if (now - prev < CLICK_DEBOUNCE_MS) return; // part of a double-click
            openNode(node);
        } else {
            selectDesktopIcon(div);
        }
    });

    $desktopIcons.addEventListener("dblclick", (e) => {
        const div = /** @type {IconEl | null} */ (eventTargetElement(e).closest(".desktop-icon"));
        if (!div) return;
        const node = getNodeForIcon(div);
        if (!node) return;
        if (!isSingleClickMode()) openNode(node);
    });

    // Middle mouse button → open bookmark in a background tab
    $desktopIcons.addEventListener("auxclick", (e) => {
        const div = /** @type {IconEl | null} */ (eventTargetElement(e).closest(".desktop-icon"));
        if (!div) return;
        const node = getNodeForIcon(div);
        if (!node) return;
        handleAuxClick(e, node);
    });

    // Right-click context menu
    $desktopIcons.addEventListener("contextmenu", (e) => {
        const div = /** @type {IconEl | null} */ (eventTargetElement(e).closest(".desktop-icon"));
        if (!div) return;
        const node = getNodeForIcon(div);
        if (!node) return;
        e.preventDefault();
        selectDesktopIcon(div);
        showContextMenu(
            e.clientX,
            e.clientY,
            buildNodeContextMenuItems(node),
        );
    });
}

/** Open a bookmark node (URL → navigate, folder → window) */
/** @param {BookmarkNode} node */
export function openNode(node) {
    if (node.url) {
        window.location.href = node.url;
    } else {
        openFolderWindow(node);
    }
}

/** Open a bookmark URL in a new background tab (middle-click) */
function openInBackgroundTab(url) {
    chrome.tabs.create({ url, active: false });
}

/** Middle-click (auxclick, button=1) → background tab; folders are ignored */
export function handleAuxClick(e, node) {
    if (e.button !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    if (node && node.url) openInBackgroundTab(node.url);
}

/** Current click mode from settings */
export function isSingleClickMode() {
    return state.settings && state.settings.clickMode === "single";
}
