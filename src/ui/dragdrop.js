/**
 * Node drag & drop: moving bookmarks/folders between folder windows and onto
 * desktop icons. Pure insertion/midpoint math lives in this module; the actual
 * chrome.bookmarks.move calls go through moveBookmarkTo.
 */

/* ============================================================
 NODE DRAG & DROP (move bookmarks/folders between folder windows)
 ============================================================ */

/** Clear drop-target highlights only (keeps the dragged source faded) */
/** @typedef {import("../types").WinData} WinData */
import { ALL_ROOT_ID, isFolderNode, isRootFolder } from "../lib/bookmarks";
import { scheduleBookmarksRefresh } from "./liveSync";
import { findNodeById, state } from "../state";
import { openMessageBox } from "./dialogs";

export function clearDropTargets() {
    document
        .querySelectorAll(
            ".folder-item.drop-into, .folder-item.drop-before, .folder-item.drop-after, .folder-content.drop-append",
        )
        .forEach((el) =>
            el.classList.remove(
                "drop-into",
                "drop-before",
                "drop-after",
                "drop-append",
            ),
        );
}

/** Clear every drag highlight (drop targets + dragged source) */
export function clearDropHighlights() {
    clearDropTargets();
    document
        .querySelectorAll(".folder-item.dragging")
        .forEach((el) => el.classList.remove("dragging"));
}

/** Is `node` the given node itself or one of its descendants? */
function isNodeWithin(node, ancestorId) {
    let cur = node;
    while (cur && cur.id !== ALL_ROOT_ID) {
        if (String(cur.id) === String(ancestorId)) return true;
        cur = cur.parentId
            ? findNodeById(state.treeRoot, cur.parentId)
            : null;
    }
    return false;
}

/* isRootFolder moved to src/lib/bookmarks.ts */

/** Can `draggedId` be moved INTO the folder `targetId`? */
export function canDropIntoFolder(draggedId, targetId) {
    const dragged = findNodeById(state.treeRoot, draggedId);
    const target = findNodeById(state.treeRoot, targetId);
    if (!dragged || !target || !isFolderNode(target)) return false;
    if (isRootFolder(dragged)) return false;
    if (String(dragged.id) === String(target.id)) return false;
    // A folder must never be moved into itself or its own descendants.
    if (isNodeWithin(target, dragged.id)) return false;
    return true;
}

/** Can `draggedId` be reordered next to the bookmark `targetId`? */
export function canDropNextTo(draggedId, targetId) {
    const dragged = findNodeById(state.treeRoot, draggedId);
    const target = findNodeById(state.treeRoot, targetId);
    if (!dragged || !target) return false;
    if (isRootFolder(dragged) || isRootFolder(target)) return false;
    if (String(dragged.id) === String(target.id)) return false;
    // Inserting into a node that lives inside the dragged folder → cycle.
    if (isNodeWithin(target, dragged.id)) return false;
    return true;
}

/** Pointer below the vertical middle of an item → insert after it */
export function isAfterMidpoint(el, e) {
    const r = el.getBoundingClientRect();
    return e.clientY >= r.top + r.height / 2;
}

/** Insertion index for `draggedId` before/after `targetId`, computed on the
    sibling list WITHOUT the dragged node — matching how chrome.bookmarks.move
    places a node after it has been removed from its old position. */
export function insertionIndex(parent, targetId, after, draggedId) {
    const siblings = ((parent && parent.children) || []).filter(
        (k) => String(k.id) !== String(draggedId),
    );
    const pos = siblings.findIndex(
        (k) => String(k.id) === String(targetId),
    );
    if (pos < 0) return -1;
    return pos + (after ? 1 : 0);
}

/** Move a node into `parentId` (index < 0 → append) and refresh the UI */
export function moveBookmarkTo(id, parentId, index) {
    if (!id || !parentId) return;
    const opts = { parentId: String(parentId) };
    if (typeof index === "number" && index >= 0) opts.index = index;
    chrome.bookmarks
        .move(String(id), opts)
        .then(() => scheduleBookmarksRefresh())
        .catch(() => {
            openMessageBox(
                "Перемещение",
                "Не удалось переместить объект.",
            );
        });
}

/** Make the empty area of a folder window a drop zone that appends the
    dragged node to the folder currently displayed in that window. */
/** @param {HTMLElement & { _dropWired?: boolean }} fc @param {WinData} winData */
export function wireFolderBackgroundDrop(fc, winData) {
    if (fc._dropWired) return;
    fc._dropWired = true;

    const targetParentId = () => {
        const cur = winData.currentNode;
        if (!cur || cur.id === ALL_ROOT_ID) return null;
        return cur.id;
    };

    fc.addEventListener("dragover", (e) => {
        const drag = state.nodeDragState;
        if (!drag) return;
        const parentId = targetParentId();
        if (!parentId || !canDropIntoFolder(drag.id, parentId)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        clearDropTargets();
        fc.classList.add("drop-append");
    });

    fc.addEventListener("dragleave", (e) => {
        // Ignore transitions onto child items inside the same container.
        if (!fc.contains(/** @type {Node | null} */ (e.relatedTarget))) {
            fc.classList.remove("drop-append");
        }
    });

    fc.addEventListener("drop", (e) => {
        const drag = state.nodeDragState;
        fc.classList.remove("drop-append");
        if (!drag) return;
        const parentId = targetParentId();
        e.preventDefault();
        e.stopPropagation();
        state.nodeDragState = null;
        if (!parentId || !canDropIntoFolder(drag.id, parentId)) return;
        moveBookmarkTo(drag.id, parentId, -1);
    });
}

/** Safety net: whenever a drag ends anywhere, reset highlights and state */
export function attachNodeDragGlobals() {
    document.addEventListener("dragend", () => {
        state.nodeDragState = null;
        clearDropHighlights();
    });
}
