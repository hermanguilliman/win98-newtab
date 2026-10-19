/**
 * Search window: indexed bookmark search opened from the start menu and Ctrl+F.
 * Ranking/filtering lives in src/lib/search.ts; this module renders the results
 * and keeps an open window fresh on bookmark events.
 */

/* ============================================================
 SEARCH (start menu + Ctrl+F)
 ============================================================ */

/* buildSearchIndex moved to src/lib/search.ts */

/** @typedef {import("../types").SearchUI} SearchUI */
/** @typedef {import("../types").WinData} WinData */
import { bringToFront, closeWindow, createWindow, restoreWindow } from "./windows";
import { buildSearchIndex, filterSearchNodes } from "../lib/search";
import { drawFolderIcon } from "./icons";
import { findNodeById } from "../state";
import { isSingleClickMode, openNode } from "./desktop";
import { folderColorAt } from "../lib/bookmarks";
import { SEARCH_DEBOUNCE_MS, SEARCH_RESULT_LIMIT } from "../constants";
import { setFaviconImage } from "./favicon";
import { state } from "../state";

export function openSearchWindow() {
    const existing = state.windows.find((w) => w.title === "Поиск");
    if (existing) {
        if (existing.minimized) restoreWindow(existing.id);
        else bringToFront(existing.id);
        return;
    }

    state.searchNodes = buildSearchIndex(state.treeRoot);

    createWindow({
        title: "Поиск",
        icon: "icons/search.svg",
        width: 520,
        height: 400,
        content: "",
        statusbar: true,
        statusText: "Найдено: 0",
        onCreated: (el, winData) => {
            const ce = /** @type {HTMLElement} */ (el.querySelector(".win98-window-content"));
            ce.style.background = "var(--win98-silver)";
            const ui = buildSearchUI(winData);
            ce.appendChild(ui);
            winData.searchFilter = ui.filter;
            ui.input.focus();
        },
    });
}

/** @param {WinData} winData @returns {SearchUI} */
function buildSearchUI(winData) {
    const wrap = /** @type {SearchUI} */ (document.createElement("div"));
    wrap.className = "search-wrap";

    const row = document.createElement("div");
    row.className = "search-row";
    const label = document.createElement("label");
    label.textContent = "Найти:";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "win98-addressbar-input";
    input.placeholder = "Имя или адрес закладки...";
    input.style.boxSizing = "border-box";
    row.append(label, input);
    wrap.appendChild(row);

    const results = document.createElement("div");
    results.className = "search-results";
    wrap.appendChild(results);

    let selectedRow = null;
    let current = [];

    const statusEl = () =>
        winData.el.querySelector(".win98-statusbar-field");

    function selectRow(rowEl) {
        results
            .querySelectorAll(".search-result-row.selected")
            .forEach((r) => r.classList.remove("selected"));
        if (rowEl) {
            rowEl.classList.add("selected");
            rowEl.scrollIntoView({ block: "nearest" });
        }
        selectedRow = rowEl;
    }

    function openSearchResult(n) {
        const node = findNodeById(state.treeRoot, n.id);
        if (node) openNode(node);
    }

    function renderList(filter) {
        const list = filterSearchNodes(
            state.searchNodes,
            filter,
            SEARCH_RESULT_LIMIT,
        );

        results.innerHTML = "";
        current = list;
        list.forEach((n, i) => {
            const rowEl = document.createElement("div");
            rowEl.className = "search-result-row";
            const img = document.createElement("img");
            img.className = "search-result-img";
            img.draggable = false;
            if (n.isFolder) {
                img.src = drawFolderIcon(
                    folderColorAt(i),
                    false,
                    24,
                );
            } else {
                setFaviconImage(img, n.url, 24, 24);
            }
            const text = document.createElement("div");
            text.className = "search-result-text";
            const t = document.createElement("div");
            t.className = "search-result-title";
            t.textContent = n.title || n.url || "Без названия";
            const p = document.createElement("div");
            p.className = "search-result-path";
            p.textContent = n.isFolder ? n.path || "Папка" : n.url;
            text.append(t, p);
            rowEl.append(img, text);
            rowEl.addEventListener("click", (e) => {
                e.stopPropagation();
                if (isSingleClickMode()) openSearchResult(n);
                else selectRow(rowEl);
            });
            rowEl.addEventListener("dblclick", (e) => {
                e.stopPropagation();
                if (!isSingleClickMode()) openSearchResult(n);
            });
            results.appendChild(rowEl);
        });

        selectRow(results.querySelector(".search-result-row"));
        const st = statusEl();
        if (st)
            st.textContent = `Найдено: ${list.length}${list.length >= SEARCH_RESULT_LIMIT ? "+" : ""}`;
    }

    function currentRowIndex() {
        // selectedRow is a direct child of `results`; indexInto children (no array alloc)
        return selectedRow ? Array.prototype.indexOf.call(results.children, selectedRow) : -1;
    }

    // Debounce keystrokes so rapid typing only re-renders once (search can be
    // heavy on large trees); first render below runs immediately.
    let searchTimer = null;
    input.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => renderList(input.value), SEARCH_DEBOUNCE_MS);
    });
    input.addEventListener("keydown", (e) => {
        const rows = results.querySelectorAll(".search-result-row");
        const idx = currentRowIndex();
        if (e.key === "ArrowDown") {
            e.preventDefault();
            selectRow(
                rows[Math.min(rows.length - 1, Math.max(0, idx) + 1)],
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectRow(rows[Math.max(0, idx - 1)]);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (selectedRow && current[Math.max(0, idx)])
                openSearchResult(current[Math.max(0, idx)]);
        } else if (e.key === "Escape") {
            e.preventDefault();
            closeWindow(winData.id);
        }
    });

    renderList("");
    // Expando hooks consumed by refreshSearchWindow() / the window onCreated
    wrap.filter = () => renderList(input.value);
    wrap.input = input;
    return wrap;
}

/** Keep results of an open search window in sync with the live tree */
export function refreshSearchWindow() {
    const sw = state.windows.find((w) => w.title === "Поиск");
    if (!sw) return;
    state.searchNodes = buildSearchIndex(state.treeRoot);
    if (sw.searchFilter) sw.searchFilter();
}
