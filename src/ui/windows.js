/**
 * Window core: creation, z-order/focus visuals, minimize/restore/maximize,
 * closing, the per-window taskbar button, dragging/resizing and the debounced
 * persistence of the open-window layout.
 *
 * Layout/lifecycle itself belongs to the WindowManager (src/lib/windows.ts);
 * this module only renders it into the DOM and mirrors user gestures back into
 * the manager records. Two things are injected from the app shell to keep the
 * import graph acyclic: `panelActions` (cascade/tile/taskbar properties,
 * those open windows themselves) and the window-close hooks registered by the
 * notepad and calculator modules.
 */

/* ============================================================
 WINDOW MANAGEMENT
 ============================================================ */

/**
 * Shell actions offered in a window's taskbar-button menu. They open windows of
 * their own, so the shell assigns them once at startup — importing the shell
 * here would create an import cycle. `null` until then.
 * @type {{
 *     cascade: ((wins: WinData[]) => void) | null,
 *     tile: ((wins: WinData[]) => void) | null,
 *     properties: (() => void) | null,
 * }}
 */
/** @typedef {import("../types").WinData} WinData */
import { $taskbarWindows, $windowsContainer, eventTargetElement } from "./dom";
import { drawPageIcon } from "./icons";
import { MIN_WINDOW_H, MIN_WINDOW_W } from "../constants";
import { state } from "../state";
import { clampInt, escapeHtml } from "../lib/format";
import { showContextMenu } from "./contextmenu";

export const panelActions = { cascade: null, tile: null, properties: null };

/**
 * Hooks run just before a window is destroyed (notepad autosave flush, the
 * calculator's document key listener). Modules register themselves here so this
 * module needs no knowledge of them.
 * @type {((win: WinData) => void)[]}
 */
export const windowCloseHooks = [];

/**
 * @typedef {object} CreateWindowOpts
 * @property {string} [title]
 * @property {string} [icon]
 * @property {number} [x]
 * @property {number} [y]
 * @property {number} [width]
 * @property {number} [height]
 * @property {boolean} [dialog]
 * @property {string} [content]
 * @property {string} [toolbar]
 * @property {boolean} [addressbar]
 * @property {string} [addressbarValue]
 * @property {boolean} [statusbar]
 * @property {string} [statusText]
 * @property {string} [statusText2]
 * @property {string} [winType]
 * @property {string} [bookmarkId]
 * @property {(el: HTMLDivElement, winData: WinData) => void} [onCreated]
 */

/** @param {CreateWindowOpts} opts @returns {WinData} */
export function createWindow(opts) {
    const w = opts.width || 500;
    const h = opts.height != null ? opts.height : 400;
    const isDialog = !!opts.dialog;
    // The WindowManager (src/lib/windows.ts, unit-tested) owns id, geometry
    // (centered + 28px cascade), z-order and the active window. The array
    // it pushes into IS state.windows, so no manual push/focus below.
    /** @type {WinData} */
    const winData = /** @type {WinData} */ (
        state.windowManager.open({
            width: w,
            height: h,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            x: opts.x,
            y: opts.y,
            dialog: isDialog,
        })
    );
    const x = winData.x;
    const y = winData.y;

    // Resolve the window icon once (falling back to a page icon) so we don't
    // re-generate the same canvas three times below.
    const resolvedIcon = opts.icon || drawPageIcon();

    winData.title = opts.title || "Window";
    winData.icon = resolvedIcon;
    winData.winType = opts.winType || null;
    winData.bookmarkId = opts.bookmarkId || null;

    // Build DOM
    const el = document.createElement("div");
    el.className = "win98-window" + (isDialog ? " win98-window--dialog" : "");
    el.id = `win-${winData.id}`;
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${winData.zIndex};`;

    el.innerHTML = `
  <div class="win98-titlebar" data-win-id="${winData.id}">
    <img class="win98-titlebar-icon" src="${resolvedIcon}" alt="">
    <span class="win98-titlebar-text">${escapeHtml(opts.title || "")}</span>
    <div class="win98-titlebar-buttons">
      ${isDialog
        ? `<button class="win98-titlebar-btn" data-action="close" title="Закрыть">✕</button>`
        : `<button class="win98-titlebar-btn" data-action="minimize" title="Свернуть">_</button>
           <button class="win98-titlebar-btn" data-action="maximize" title="Развернуть">□</button>
           <button class="win98-titlebar-btn" data-action="close" title="Закрыть">✕</button>`}
    </div>
  </div>
  ${opts.toolbar ? `<div class="win98-toolbar">${opts.toolbar}</div>` : ""}
  ${opts.addressbar ? `<div class="win98-addressbar"><label>Адрес:</label><input class="win98-addressbar-input" type="text" value="${escapeHtml(opts.addressbarValue || "")}" readonly></div>` : ""}
  <div class="win98-window-content">${opts.content || ""}</div>
  ${opts.statusbar !== false ? `<div class="win98-statusbar"><div class="win98-statusbar-field">${escapeHtml(opts.statusText || "")}</div>${opts.statusText2 != null ? `<div class="win98-statusbar-field win98-statusbar-field2">${escapeHtml(opts.statusText2)}</div>` : ""}</div>` : ""}
  ${isDialog ? "" : `<div class="win98-resize-handle"></div>`}
`;

    $windowsContainer.appendChild(el);

    winData.el = el;
    // NOTE: no push — windowManager.open() already put winData into
    // state.windows (same array).

    // Title bar events
    const titlebar = el.querySelector(".win98-titlebar");
    titlebar.addEventListener("mousedown", (e) => {
        if (eventTargetElement(e).closest(".win98-titlebar-btn")) return;
        bringToFront(winData.id);
        startDrag(/** @type {MouseEvent} */ (e), winData);
    });
    titlebar.addEventListener("dblclick", (e) => {
        if (isDialog) return;
        if (eventTargetElement(e).closest(".win98-titlebar-btn")) return;
        toggleMaximize(winData.id);
    });

    // Title bar buttons
    el.querySelector('[data-action="minimize"]')?.addEventListener(
        "click",
        () => minimizeWindow(winData.id),
    );
    el.querySelector('[data-action="maximize"]')?.addEventListener(
        "click",
        () => toggleMaximize(winData.id),
    );
    el.querySelector('[data-action="close"]')?.addEventListener(
        "click",
        () => closeWindow(winData.id),
    );

    // Resize handle
    const resizeHandle = el.querySelector(".win98-resize-handle");
    resizeHandle?.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        bringToFront(winData.id);
        startResize(/** @type {MouseEvent} */ (e), winData);
    });

    // Click to focus
    el.addEventListener("mousedown", () => bringToFront(winData.id));

    // Taskbar button
    const tbBtn = document.createElement("button");
    tbBtn.className = "taskbar-win-btn win98-btn active";
    tbBtn.id = `tb-${winData.id}`;
    tbBtn.innerHTML = `<img src="${resolvedIcon}" alt=""><span>${escapeHtml(opts.title || "")}</span>`;
    tbBtn.addEventListener("click", () => {
        if (winData.minimized) {
            restoreWindow(winData.id);
        } else if (state.windowManager.activeWindowId === winData.id) {
            minimizeWindow(winData.id);
        } else {
            bringToFront(winData.id);
        }
    });
    // Right-click a taskbar button → per-window menu + generic panel actions
    tbBtn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation(); // don't show the generic taskbar menu separately
        const visible = state.windowManager.windows.filter((w) => !w.minimized);
        const items = [];
        if (winData.minimized) {
            items.push({
                label: "Восстановить",
                action: () => restoreWindow(winData.id),
            });
        } else {
            items.push({
                label: "Свернуть",
                action: () => minimizeWindow(winData.id),
            });
        }
        items.push({ label: "Закрыть", action: () => closeWindow(winData.id) });
        items.push({ type: "separator" });
        items.push({
            label: "Каскад окон",
            disabled: visible.length === 0 || !panelActions.cascade,
            action: () => panelActions.cascade && panelActions.cascade(visible),
        });
        items.push({
            label: "Стопкой",
            disabled: visible.length === 0 || !panelActions.tile,
            action: () => panelActions.tile && panelActions.tile(visible),
        });
        items.push({ type: "separator" });
        items.push({
            label: "Свойства панели задач",
            disabled: !panelActions.properties,
            action: () => panelActions.properties && panelActions.properties(),
        });
        showContextMenu(e.clientX, e.clientY, items);
    });
    $taskbarWindows.appendChild(tbBtn);

    // open() already made this window active in the WindowManager — the
    // DOM just needs its titlebar/taskbar/z-order synced to the manager.
    syncActiveWindowVisuals();

    if (opts.onCreated) opts.onCreated(el, winData);

    scheduleWindowStateSave();

    return winData;
}

/** Apply the WindowManager's z-order + active window to the DOM: every
    window element gets its managed zIndex, titlebars get .inactive on
    non-active windows, and the taskbar button of the active window gets
    .active. Call after any focus/open/minimize/restore/close. */
export function syncActiveWindowVisuals() {
    const wm = state.windowManager;
    state.windows.forEach((w) => {
        if (!w.el) return;
        w.el.style.zIndex = String(w.zIndex);
        const tb = w.el.querySelector(".win98-titlebar");
        if (tb) tb.classList.toggle("inactive", w.id !== wm.activeWindowId);
    });
    document
        .querySelectorAll(".taskbar-win-btn")
        .forEach((b) => b.classList.remove("active"));
    const tbBtn =
        wm.activeWindowId != null
            ? document.getElementById(`tb-${wm.activeWindowId}`)
            : null;
    if (tbBtn) tbBtn.classList.add("active");
}

export function bringToFront(id) {
    state.windowManager.focus(id);
    syncActiveWindowVisuals();
}

/** Animate a window shrinking into its taskbar button (Win98 minimize). */
function animateWindowToButton(el, btn, onEnd) {
    const reduced =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!btn || reduced) {
        onEnd();
        return;
    }
    const wRect = el.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    if (!wRect.width || !wRect.height) {
        onEnd();
        return;
    }
    const dx =
        bRect.left + bRect.width / 2 - (wRect.left + wRect.width / 2);
    const dy =
        bRect.top + bRect.height / 2 - (wRect.top + wRect.height / 2);
    el.style.transition = "transform 0.18s ease-in";
    el.style.transformOrigin = "center center";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(0.06)`;
    const handler = () => {
        el.removeEventListener("transitionend", handler);
        el.style.transition = "";
        el.style.transform = "";
        el.style.transformOrigin = "";
        onEnd();
    };
    el.addEventListener("transitionend", handler);
    // Fallback in case the transition never fires
    setTimeout(() => {
        if (el.style.transform) handler();
    }, 250);
}

/** Animate a window growing back from its taskbar button (Win98 restore). */
function animateWindowFromButton(el, btn) {
    const reduced =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!btn || reduced) return;
    const wRect = el.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    if (!wRect.width || !wRect.height) return;
    const dx =
        bRect.left + bRect.width / 2 - (wRect.left + wRect.width / 2);
    const dy =
        bRect.top + bRect.height / 2 - (wRect.top + wRect.height / 2);
    el.style.transition = "none";
    el.style.transformOrigin = "center center";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(0.06)`;
    void el.offsetWidth; // force reflow so the start position applies
    el.style.transition = "transform 0.18s ease-out";
    el.style.transform = "";
    const handler = () => {
        el.removeEventListener("transitionend", handler);
        el.style.transition = "";
        el.style.transformOrigin = "";
    };
    el.addEventListener("transitionend", handler);
}

export function minimizeWindow(id) {
    const wm = state.windowManager;
    const winData = /** @type {WinData | null} */ (wm.get(id));
    if (!winData || winData.minimized) return;
    wm.minimize(id); // flips the flag + falls focus to the last visible
    const btn = document.getElementById(`tb-${id}`);
    animateWindowToButton(winData.el, btn, () => {
        // Only hide if still minimized — a restore mid-animation wins
        if (winData.minimized) winData.el.style.display = "none";
    });
    syncActiveWindowVisuals();
    scheduleWindowStateSave();
}

export function restoreWindow(id) {
    const wm = state.windowManager;
    const winData = /** @type {WinData | null} */ (wm.get(id));
    if (!winData) return;
    wm.restore(id); // clears minimized + focuses
    winData.el.style.display = "";
    const btn = document.getElementById(`tb-${id}`);
    animateWindowFromButton(winData.el, btn);
    syncActiveWindowVisuals();
    scheduleWindowStateSave();
}

function toggleMaximize(id) {
    const wm = state.windowManager;
    const winData = /** @type {WinData | null} */ (wm.get(id));
    if (!winData) return;

    wm.toggleMaximize(id);

    if (winData.maximized) {
        // Just maximized — the .maximized class makes the CSS stretch the window
        winData.el.classList.add("maximized");
    } else {
        // Just restored — apply the pre-maximize bounds back to the DOM
        winData.el.classList.remove("maximized");
        winData.el.style.left = winData.x + "px";
        winData.el.style.top = winData.y + "px";
        winData.el.style.width = winData.w + "px";
        winData.el.style.height = winData.h + "px";
    }
    syncActiveWindowVisuals();
    scheduleWindowStateSave();
}

export function closeWindow(id) {
    const wm = state.windowManager;
    const winData = /** @type {WinData | null} */ (wm.get(id));
    if (!winData) return;

    // Let the owning module clean up (notepad autosave flush, calculator key
    // listener, …) before the element goes away.
    windowCloseHooks.forEach((hook) => hook(winData));

    const tbBtn = document.getElementById(`tb-${id}`);
    if (tbBtn) tbBtn.remove();

    wm.close(id); // removes from state + falls focus to the last visible
    winData.el.remove();

    scheduleWindowStateSave();
    syncActiveWindowVisuals();
}

export function updateTaskbarButtons() {
    state.windowManager.windows.forEach((w) => {
        const tbBtn = document.getElementById(`tb-${w.id}`);
        if (tbBtn) {
            if (
                w.id === state.windowManager.activeWindowId &&
                !w.minimized
            ) {
                tbBtn.classList.add("active");
            } else {
                tbBtn.classList.remove("active");
            }
        }
    });
}

/* ============================================================
 WINDOW STATE PERSISTENCE
 (remember open windows so a tab reload can restore them)
 ============================================================ */

export const STORAGE_WINDOWS_KEY = "openWindows";

/** Serialize the current open windows into storage-friendly descriptors.
    Settings windows and dialogs are transient — never persisted. */
function collectWindowState() {
    return state.windows
        .filter((w) => !w.dialog && w.title !== "Настройки")
        .map((w) => {
            const d = {
                winType: w.winType || null,
                title: w.title || "",
                bookmarkId: w.bookmarkId || null,
                x: parseInt(w.el.style.left) || 0,
                y: parseInt(w.el.style.top) || 0,
                w: parseInt(w.el.style.width) || w.w || 400,
                h: parseInt(w.el.style.height) || w.h || 300,
                minimized: !!w.minimized,
                maximized: !!w.maximized,
            };
            // Folder windows keep their «Назад» history across a reload
            if (!w.winType && w.bookmarkId) {
                d.navStackIds = (w.navStack || [])
                    .map((n) => (n && n.id) || null)
                    .filter((v) => v !== null);
            }
            return d;
        });
}

let windowStateSaveTimer = null;
/** Debounced write of the open-window layout to chrome.storage.local */
export function scheduleWindowStateSave() {
    clearTimeout(windowStateSaveTimer);
    windowStateSaveTimer = setTimeout(() => {
        const activeIndex = state.windowManager.windows.findIndex(
            (w) => w.id === state.windowManager.activeWindowId,
        );
        chrome.storage.local
            .set({
                [STORAGE_WINDOWS_KEY]: {
                    windows: collectWindowState(),
                    activeIndex,
                },
            })
            .catch(() => {});
    }, 400);
}

/** The window created by the most recent open* call (used by the restore path) */
export function lastCreatedWindow() {
    return state.windows[state.windows.length - 1] || null;
}

/** Re-apply saved geometry and minimized/maximized state to a fresh window */
export function applySavedWindowState(win, d) {
    if (!win || !d) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = clampInt(d.x, 0, Math.max(0, vw - 40)) ?? win.x ?? 0;
    const y = clampInt(d.y, 0, Math.max(0, vh - 60)) ?? win.y ?? 0;
    const w = clampInt(d.w, 120, vw) ?? win.w ?? 400;
    const h = clampInt(d.h, 80, vh - 40) ?? win.h ?? 300;
    win.el.style.left = x + "px";
    win.el.style.top = y + "px";
    win.el.style.width = w + "px";
    win.el.style.height = h + "px";
    win.x = x;
    win.y = y;
    win.w = w;
    win.h = h;
    if (d.maximized) {
        win.prevBounds = { x, y, w, h };
        win.el.classList.add("maximized");
        win.maximized = true;
    }
    if (d.minimized) {
        win.minimized = true;
        win.el.style.display = "none";
    }
}

/** Recreate every window that was open before the tab reloaded */

/* ============================================================
 DRAG & RESIZE
 ============================================================ */

/** @param {MouseEvent} e @param {WinData} winData */
function startDrag(e, winData) {
    if (winData.maximized) return;
    const rect = winData.el.getBoundingClientRect();
    state.dragState = {
        winData,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        x: e.clientX,
        y: e.clientY,
        raf: null,
    };
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", onDragEnd);
}

function onDragMove(e) {
    const d = state.dragState;
    if (!d) return;
    // Always track the latest cursor position; only coalesce the style write
    // to one per animation frame (mousemove can fire faster than 60 Hz).
    d.x = e.clientX;
    d.y = e.clientY;
    if (d.raf) return;
    d.raf = requestAnimationFrame(() => {
        d.raf = null;
        const x = d.x - d.offsetX;
        const y = d.y - d.offsetY;
        d.winData.el.style.left = x + "px";
        d.winData.el.style.top = Math.max(0, y) + "px";
    });
}

function onDragEnd() {
    const d = state.dragState;
    // Sync the final position back into the WindowManager record so a
    // subsequent maximize/restore uses the dragged position (layout px,
    // matching el.style.left/top).
    if (d && d.winData) {
        d.winData.x = parseInt(d.winData.el.style.left) || d.winData.x;
        d.winData.y = parseInt(d.winData.el.style.top) || d.winData.y;
    }
    state.dragState = null;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragEnd);
    scheduleWindowStateSave();
}

/** @param {MouseEvent} e @param {WinData} winData */
function startResize(e, winData) {
    if (winData.maximized) return;
    state.resizeState = {
        winData,
        startX: e.clientX,
        startY: e.clientY,
        startW: parseInt(winData.el.style.width),
        startH: parseInt(winData.el.style.height),
        x: e.clientX,
        y: e.clientY,
        raf: null,
    };
    document.addEventListener("mousemove", onResizeMove);
    document.addEventListener("mouseup", onResizeEnd);
}

function onResizeMove(e) {
    const r = state.resizeState;
    if (!r) return;
    r.x = e.clientX;
    r.y = e.clientY;
    if (r.raf) return;
    r.raf = requestAnimationFrame(() => {
        r.raf = null;
        const newW = Math.max(MIN_WINDOW_W, r.startW + (r.x - r.startX));
        const newH = Math.max(MIN_WINDOW_H, r.startH + (r.y - r.startY));
        r.winData.el.style.width = newW + "px";
        r.winData.el.style.height = newH + "px";
    });
}

function onResizeEnd() {
    const r = state.resizeState;
    // Sync the final size back into the WindowManager record.
    if (r && r.winData) {
        r.winData.w = parseInt(r.winData.el.style.width) || r.winData.w;
        r.winData.h = parseInt(r.winData.el.style.height) || r.winData.h;
    }
    state.resizeState = null;
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup", onResizeEnd);
    scheduleWindowStateSave();
}

