/**
 * Node operations shared by desktop icons, folder windows and search results:
 * the right-click menu (open variants, copy/paste, rename, delete, properties)
 * and the bookmark mutations behind it.
 */

/* ============================================================
 NODE OPERATIONS (open variants, copy, rename, delete)
 ============================================================ */

import { drawFolderIcon, drawPageIcon } from "./icons";
import { formatDateTime } from "../lib/format";
import { getNodePath, isBookmarkNode, isFolderNode, isVisibleNode } from "../lib/bookmarks";
import { openConfirmDialog, openDialog, openPromptDialog } from "./dialogs";
import { openNode } from "./desktop";
import { state } from "../state";

export function copyText(text) {
    if (!text) return;
    try {
        navigator.clipboard.writeText(text);
    } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
    }
}

function createTab(url, active) {
    if (!url) return Promise.resolve();
    return chrome.tabs.create({ url, active });
}

function openInNewWindow(url, incognito) {
    if (!url) return;
    chrome.windows.create({ url, incognito: !!incognito }).catch(() => {});
}

/** Build the right-click menu items for a bookmark or folder node */
export function buildNodeContextMenuItems(node) {
    if (!node) return [];
    if (isBookmarkNode(node)) {
        return [
            { label: "Открыть", action: () => openNode(node) },
            {
                label: "Открыть в новой вкладке",
                action: () => createTab(node.url, true),
            },
            {
                label: "Открыть в фоновой вкладке",
                action: () => createTab(node.url, false),
            },
            {
                label: "Открыть в новом окне",
                action: () => openInNewWindow(node.url, false),
            },
            {
                label: "Открыть в режиме инкогнито",
                action: () => openInNewWindow(node.url, true),
            },
            { type: "separator" },
            {
                label: "Копировать адрес",
                action: () => {
                    copyText(node.url);
                    state.clipUrl = node.url;
                },
            },
            { type: "separator" },
            { label: "Переименовать", action: () => renameNode(node) },
            { label: "Удалить", action: () => deleteNode(node) },
            { type: "separator" },
            { label: "Свойства", action: () => openProperties(node) },
        ];
    }
    return [
        { label: "Открыть", action: () => openNode(node) },
        { type: "separator" },
        { label: "Переименовать", action: () => renameNode(node) },
        { label: "Удалить", action: () => deleteNode(node) },
        { type: "separator" },
        { label: "Свойства", action: () => openProperties(node) },
    ];
}

/** Win98 «Свойства» dialog for a bookmark or folder */
export function openProperties(node) {
    const isFolder = isFolderNode(node);
    const body = document.createElement("div");
    body.className = "win98-dialog";

    const gb = document.createElement("div");
    gb.className = "win98-groupbox props-group";
    const legend = document.createElement("div");
    legend.className = "win98-groupbox-legend";
    legend.textContent = isFolder ? "Папка" : "Интернет-ярлык";
    gb.appendChild(legend);

    const row = (k, v) => {
        const r = document.createElement("div");
        r.className = "props-row";
        const kEl = document.createElement("span");
        kEl.className = "props-row-key";
        kEl.textContent = k + ":";
        const vEl = document.createElement("span");
        vEl.className = "props-row-value";
        vEl.textContent = v || "—";
        r.append(kEl, vEl);
        return r;
    };

    gb.appendChild(row("Тип", isFolder ? "Папка" : "Интернет-ярлык"));
    if (!isFolder) gb.appendChild(row("Адрес", node.url));
    gb.appendChild(row("Расположение", getNodePath(node, state.nodeIndex)));
    if (isFolder) {
        const kids = (node.children || []).filter(isVisibleNode);
        gb.appendChild(
            row(
                "Содержит",
                `${kids.filter(isFolderNode).length} пап(ок), ` +
                    `${kids.filter(isBookmarkNode).length} закладк(и)`,
            ),
        );
    }
    if (node.dateAdded) {
        gb.appendChild(row("Дата добавления", formatDateTime(node.dateAdded)));
    }
    gb.appendChild(row("Идентификатор", node.id));
    body.appendChild(gb);

    return openDialog({
        title: "Свойства: " + (node.title || "Без названия"),
        icon: isFolder
            ? drawFolderIcon("#c0b060", false, 16)
            : drawPageIcon(16),
        width: 380,
        body,
        buttons: [{ label: "OK" }],
    });
}

function renameNode(node) {
    openPromptDialog(
        "Переименовать",
        "Новое имя:",
        node.title || "",
        (newName) => {
            if (newName && newName !== node.title) {
                chrome.bookmarks
                    .update(node.id, { title: newName })
                    .catch(() => {});
            }
        },
    );
}

export function deleteNode(node) {
    const folder = isFolderNode(node);
    openConfirmDialog(
        folder ? "Удалить папку" : "Удалить закладку",
        folder
            ? `Удалить папку «${node.title}» вместе со всем содержимым? Действие необратимо.`
            : `Удалить закладку «${node.title}»? Действие необратимо.`,
        () => {
            if (folder)
                chrome.bookmarks.removeTree(node.id).catch(() => {});
            else chrome.bookmarks.remove(node.id).catch(() => {});
        },
    );
}
