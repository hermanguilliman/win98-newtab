/**
 * Shell event wiring: desktop click/right-click, marquee selection, the tray
 * clock + calendar, the start menu and its «Программы» flyout, the taskbar
 * context menu (cascade/tile/properties), taskbar auto-hide and the desktop
 * keyboard navigation. Everything is attached once from attachEventListeners(),
 * which the shell calls after the DOM is ready.
 */

/** @typedef {import("../types").IconEl} IconEl */

import {
    $clock,
    $desktop,
    $desktopIcons,
    $launcherNotepad,
    $menuAllBookmarks,
    $startBtn,
    $startMenu,
    $taskbar,
    eventTargetElement,
} from "./dom";
import { DEFAULT_SETTINGS } from "../lib/settings";
import { getNodeForIcon } from "../lib/iconNodes";
import { currentIconSize, drawFolderIcon } from "./icons";
import { state } from "../state";
import {
    closeWindow,
    minimizeWindow,
    restoreWindow,
    scheduleWindowStateSave,
    syncActiveWindowVisuals,
} from "./windows";
import { hideContextMenu, showContextMenu } from "./contextmenu";
import { applyTaskbarSettings, saveSettings } from "./settings";
import { copyText, deleteNode, openProperties } from "./nodeOps";
import { openCalculator } from "./calculator";
import { openNotepad } from "./notepad";
import { openSearchWindow } from "./searchWindow";
import { openAllBookmarksWindow } from "./allBookmarks";
import { openCalendar } from "./calendarWindow";
import { openDialog, openMessageBox, openPromptDialog } from "./dialogs";
import { openSettingsWindow } from "./settingsWindow";
import { openNode, selectDesktopIcon } from "./desktop";
import { refreshAllBookmarks } from "./liveSync";

/** Cascade all visible windows like Win98 «Каскад окон» (layout math lives
    in src/lib/windows.ts WindowManager.cascade — unit-tested) */
export function cascadeWindows(wins) {
    if (!wins.length) return;
    state.windowManager.cascade(window.innerWidth, window.innerHeight);
    applyWindowManagerLayout();
    scheduleWindowStateSave();
}

/** Tile all visible windows across the desktop like Win98 «Стопкой» */
export function tileWindows(wins) {
    if (!wins.length) return;
    state.windowManager.tile(window.innerWidth, window.innerHeight);
    applyWindowManagerLayout();
    scheduleWindowStateSave();
}

/** Push the geometry the WindowManager just computed (cascade/tile) onto
    every window element, and un-maximize the ones it touched. */
export function applyWindowManagerLayout() {
    // state.windows IS windowManager.windows — the WinData view has el.
    state.windows.forEach((w) => {
        if (!w.el) return;
        w.el.classList.remove("maximized");
        w.el.style.left = w.x + "px";
        w.el.style.top = w.y + "px";
        w.el.style.width = w.w + "px";
        w.el.style.height = w.h + "px";
    });
    syncActiveWindowVisuals();
}

/** «Свойства панели задач» — classic Win98 checkboxes with real behavior */
export function openTaskbarProperties() {
    const body = document.createElement("div");
    body.className = "win98-dialog";
    const makeCheck = (label, key) => {
        const wrap = document.createElement("div");
        wrap.className = "win98-dialog-row";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !!(state.settings && state.settings[key]);
        cb.id = "taskbar-prop-" + key;
        const lbl = document.createElement("label");
        lbl.htmlFor = cb.id;
        lbl.textContent = " " + label;
        wrap.append(cb, lbl);
        return { wrap, cb, key };
    };
    const checks = [
        makeCheck("Автоскрытие панели задач", "taskbarAutoHide"),
        makeCheck("Мелкие значки на панели задач", "taskbarSmallIcons"),
        makeCheck("Показывать часы", "showClock"),
    ];
    checks.forEach((c) => body.appendChild(c.wrap));
    openDialog({
        title: "Свойства панели задач",
        width: 320,
        body,
        buttons: [
            {
                label: "OK",
                onClick: () => {
                    checks.forEach((c) => {
                        state.settings[c.key] = c.cb.checked;
                    });
                    saveSettings();
                    applyTaskbarSettings();
                },
            },
            { label: "Отмена" },
        ],
    });
}

export function attachEventListeners() {
    /* ============================================================
     START MENU
     ============================================================ */

    function toggleStartMenu() {
        state.startMenuOpen = !state.startMenuOpen;
        $startMenu.style.display = state.startMenuOpen ? "flex" : "none";
        // With auto-hide, keep the taskbar visible while the menu is open
        if (state.startMenuOpen && state.settings && state.settings.taskbarAutoHide) {
            $taskbar.classList.add("taskbar-force-show");
        }
    }

    function closeStartMenu() {
        state.startMenuOpen = false;
        $startMenu.style.display = "none";
        const flyout = document.getElementById("start-menu-flyout");
        if (flyout) flyout.style.display = "none";
        if (state.settings && state.settings.taskbarAutoHide) {
            $taskbar.classList.remove("taskbar-force-show");
        }
    }

    /* ============================================================
     EVENT LISTENERS
     ============================================================ */

    // Desktop click → deselect
    $desktop.addEventListener("click", (e) => {
        if (e.target === $desktop || e.target === $desktopIcons) {
            document
                .querySelectorAll(".desktop-icon.selected")
                .forEach((d) => d.classList.remove("selected"));
        }
        hideContextMenu();
        closeStartMenu();
    });

    // Desktop right-click
    $desktop.addEventListener("contextmenu", (e) => {
        if (eventTargetElement(e).closest(".desktop-icon")) return;
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, [
            { label: "Обновить", action: () => refreshAllBookmarks() },
            { type: "separator" },
            {
                label: "Создать папку",
                action: () => {
                    openPromptDialog(
                        "Создать папку",
                        "Имя новой папки:",
                        "",
                        (name) => {
                            if (name)
                                chrome.bookmarks
                                    .create({ parentId: "1", title: name })
                                    .catch(() => {});
                        },
                    );
                },
            },
            {
                label: "Вставить",
                disabled: !state.clipUrl,
                action: () => {
                    if (!state.clipUrl) return;
                    let title = "";
                    try {
                        title = new URL(state.clipUrl).hostname;
                    } catch {}
                    chrome.bookmarks
                        .create({
                            parentId: "1",
                            title: title || state.clipUrl,
                            url: state.clipUrl,
                        })
                        .catch(() => {});
                },
            },
            { type: "separator" },
            {
                label: "Открыть все закладки",
                action: () => openAllBookmarksWindow(),
            },
            { type: "separator" },
            {
                label: "Настройки",
                action: () => openSettingsWindow(),
            },
        ]);
    });

    // Clock click → calendar (single click) or easter egg (10 rapid clicks).
    // Календарь открывается только после паузы 300 ms: быстрая серия кликов
    // (пасхалка) не сопровождается появлением окна календаря раньше времени.
    let clockClicks = 0;
    let clockCalendarTimer = null;

    $clock.addEventListener("click", () => {
        clockClicks++;
        clearTimeout(clockCalendarTimer);
        if (clockClicks >= 10) {
            clockClicks = 0;
            clearTimeout(clockCalendarTimer);
            const cal = state.windows.find((w) => w.winType === "calendar");
            if (cal) closeWindow(cal.id);
            openMessageBox("Внимание", "Ты старый", "icons/pc_icon.png");
            return;
        }
        clockCalendarTimer = setTimeout(() => {
            clockClicks = 0;
            clockCalendarTimer = null;
            openCalendar();
        }, 300);
    });

    // Start button
    $startBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleStartMenu();
    });

    // Start menu: open all bookmarks
    $menuAllBookmarks.addEventListener("click", () => {
        closeStartMenu();
        openAllBookmarksWindow();
    });

    // Start menu: settings
    document.getElementById("menu-settings").addEventListener("click", () => {
        closeStartMenu();
        openSettingsWindow();
    });

    // Start menu: search
    document.getElementById("menu-search").addEventListener("click", () => {
        closeStartMenu();
        openSearchWindow();
    });

    // Quick launch: notepad
    $launcherNotepad.addEventListener("click", () => openNotepad());

    /* ---------- «Show desktop» strip: minimize all / restore all ---------- */
    const $showDesktopBtn = document.getElementById("show-desktop-btn");
    if ($showDesktopBtn) {
        // Windows that were visible when the desktop was shown, to restore
        let collapsedWindows = null;
        $showDesktopBtn.addEventListener("click", () => {
            const visible = state.windows.filter((w) => !w.minimized);
            if (visible.length > 0) {
                // First click: collapse everything
                collapsedWindows = visible.map((w) => w.id);
                visible.forEach((w) => minimizeWindow(w.id));
                $showDesktopBtn.classList.add("active");
                $showDesktopBtn.title = "Развернуть все окна";
            } else if (collapsedWindows && collapsedWindows.length > 0) {
                // Second click: restore what was visible before
                collapsedWindows.forEach((id) => restoreWindow(id));
                collapsedWindows = null;
                $showDesktopBtn.classList.remove("active");
                $showDesktopBtn.title = "Свернуть все окна";
            }
        });
    }

    /* ---------- Start menu: «Программы» flyout ---------- */
    const $menuPrograms = document.getElementById("menu-programs");
    const $menuProgramsImg = /** @type {HTMLImageElement | null} */ (
        document.getElementById("menu-programs-img")
    );
    const $flyout = document.getElementById("start-menu-flyout");
    if ($menuProgramsImg) {
        // Orange folder icon = the classic Win98 «Программы» icon
        $menuProgramsImg.src = drawFolderIcon("#c89644", false);
    }
    let flyoutTimer = null;
    function showFlyout() {
        clearTimeout(flyoutTimer);
        if ($flyout) $flyout.style.display = "block";
    }
    function hideFlyoutDelayed() {
        flyoutTimer = setTimeout(() => {
            if ($flyout) $flyout.style.display = "none";
        }, 200);
    }
    if ($menuPrograms) {
        $menuPrograms.addEventListener("mouseenter", showFlyout);
        $menuPrograms.addEventListener("mouseleave", hideFlyoutDelayed);
        $menuPrograms.addEventListener("click", (e) => {
            e.stopPropagation();
            showFlyout();
        });
    }
    if ($flyout) {
        $flyout.addEventListener("mouseenter", showFlyout);
        $flyout.addEventListener("mouseleave", hideFlyoutDelayed);
        $flyout.addEventListener("click", (e) => {
            const item = /** @type {HTMLElement | null} */ (
                eventTargetElement(e).closest(".start-menu-flyout-item")
            );
            if (!item || !item.dataset.action) return;
            closeStartMenu();
            /** @type {Record<string, () => void>} */
            const actionMap = {
                notepad: openNotepad,
                calculator: openCalculator,
                "all-bookmarks": openAllBookmarksWindow,
            };
            const action = actionMap[item.dataset.action];
            if (action) action();
        });
    }

    /* ---------- Taskbar right-click menu ---------- */
    $taskbar.addEventListener("contextmenu", (e) => {
        if (eventTargetElement(e).closest("#start-btn")) return;
        e.preventDefault();
        const visible = state.windows.filter((w) => !w.minimized);
        showContextMenu(e.clientX, e.clientY, [
            {
                label: "Каскад окон",
                disabled: visible.length === 0,
                action: () => cascadeWindows(visible),
            },
            {
                label: "Стопкой",
                disabled: visible.length === 0,
                action: () => tileWindows(visible),
            },
            { type: "separator" },
            { label: "Свойства панели задач", action: openTaskbarProperties },
        ]);
    });

    /* ---------- Taskbar auto-hide hover behavior ---------- */
    document.addEventListener("mousemove", (e) => {
        if (state.settings && state.settings.taskbarAutoHide) {
            if (e.clientY >= window.innerHeight - 6) {
                $taskbar.classList.add("taskbar-force-show");
            }
        }
    });
    $taskbar.addEventListener("mouseleave", () => {
        if (
            state.settings &&
            state.settings.taskbarAutoHide &&
            !state.startMenuOpen
        ) {
            $taskbar._hideTimer = setTimeout(
                () => $taskbar.classList.remove("taskbar-force-show"),
                300,
            );
        }
    });
    $taskbar.addEventListener("mouseenter", () =>
        clearTimeout($taskbar._hideTimer),
    );

    /* ---------- Marquee selection on the desktop ---------- */
    let marqueeEl = null;
    let marqueeStart = null;

    function deselectAllDesktopIcons() {
        $desktopIcons
            .querySelectorAll(".desktop-icon.selected")
            .forEach((d) => d.classList.remove("selected"));
        state.selectedDesktopEl = null;
    }

    function selectIconsInRect(rect) {
        deselectAllDesktopIcons();
        $desktopIcons.querySelectorAll(".desktop-icon").forEach((/** @type {IconEl} */ icon) => {
            if (!getNodeForIcon(icon)) return;
            const r = icon.getBoundingClientRect();
            if (
                r.right < rect.left ||
                r.left > rect.right ||
                r.bottom < rect.top ||
                r.top > rect.bottom
            ) {
                return;
            }
            icon.classList.add("selected");
        });
    }

    function onMarqueeMove(e) {
        if (!marqueeStart) return;
        const dx = e.clientX - marqueeStart.x;
        const dy = e.clientY - marqueeStart.y;
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4 && !marqueeEl) return;
        if (!marqueeEl) {
            marqueeEl = document.createElement("div");
            marqueeEl.className = "desktop-marquee";
            document.body.appendChild(marqueeEl);
        }
        const x = Math.min(marqueeStart.x, e.clientX);
        const y = Math.min(marqueeStart.y, e.clientY);
        marqueeEl.style.left = x + "px";
        marqueeEl.style.top = y + "px";
        marqueeEl.style.width = Math.abs(dx) + "px";
        marqueeEl.style.height = Math.abs(dy) + "px";
        selectIconsInRect(marqueeEl.getBoundingClientRect());
    }

    function onMarqueeUp() {
        document.removeEventListener("mousemove", onMarqueeMove);
        document.removeEventListener("mouseup", onMarqueeUp);
        marqueeStart = null;
        if (marqueeEl) {
            marqueeEl.remove();
            marqueeEl = null;
        }
    }

    $desktop.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        if (eventTargetElement(e).closest(".desktop-icon")) return;
        if (eventTargetElement(e).closest(".win98-window")) return;
        marqueeStart = { x: e.clientX, y: e.clientY };
        document.addEventListener("mousemove", onMarqueeMove);
        document.addEventListener("mouseup", onMarqueeUp);
    });

    // Close menus on outside click
    document.addEventListener("click", (e) => {
        if (
            !eventTargetElement(e).closest("#start-menu") &&
            !eventTargetElement(e).closest("#start-btn")
        ) {
            closeStartMenu();
        }
        if (!eventTargetElement(e).closest(".win98-context-menu")) {
            hideContextMenu();
        }
    });

    /* ============================================================
     KEYBOARD: desktop navigation + shortcuts
     ============================================================ */

    /** Estimate how many desktop icons fit in one row (for up/down arrows) */
    function desktopRowLength() {
        const size = currentIconSize();
        const gap =
            (state.settings && state.settings.iconGap) ||
            DEFAULT_SETTINGS.iconGap;
        // Cell width = icon size + 28px (matches .desktop-icon in win98.css),
        // plus the gap between cells.
        return Math.max(
            1,
            Math.floor($desktopIcons.clientWidth / (size + gap + 28)),
        );
    }

    document.addEventListener("keydown", (e) => {
        // Ctrl+F — поиск по закладкам (работает из любого места)
        if (
            e.ctrlKey &&
            (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А")
        ) {
            e.preventDefault();
            openSearchWindow();
            return;
        }
        if (e.key === "Escape") {
            if (state.startMenuOpen) closeStartMenu();
            hideContextMenu();
            return;
        }

        const tag =
            (document.activeElement && document.activeElement.tagName) || "";
        if (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT" ||
            tag === "BUTTON"
        )
            return;

        const all = Array.from(
            document.querySelectorAll("#desktop-icons .desktop-icon"),
        );
        const sel = state.selectedDesktopEl;

        if (
            e.key === "ArrowLeft" ||
            e.key === "ArrowRight" ||
            e.key === "ArrowUp" ||
            e.key === "ArrowDown"
        ) {
            if (!all.length) return;
            let idx = all.indexOf(sel);
            if (idx === -1) idx = 0;
            if (e.key === "ArrowRight") idx = Math.min(all.length - 1, idx + 1);
            else if (e.key === "ArrowLeft") idx = Math.max(0, idx - 1);
            else if (e.key === "ArrowDown")
                idx = Math.min(all.length - 1, idx + desktopRowLength());
            else idx = Math.max(0, idx - desktopRowLength());
            selectDesktopIcon(all[idx]);
            e.preventDefault();
            return;
        }
        const node = sel ? getNodeForIcon(sel) : undefined;
        if (e.key === "Enter" && node) {
            e.preventDefault();
            openNode(node);
            return;
        }
        // Alt+Enter — «Свойства» выделенного ярлыка
        if (e.altKey && e.key === "Enter" && node) {
            e.preventDefault();
            openProperties(node);
            return;
        }
        if ((e.key === "Delete" || e.key === "Del") && node) {
            e.preventDefault();
            deleteNode(node);
            return;
        }
        if (
            e.ctrlKey &&
            (e.key === "c" ||
                e.key === "C" ||
                e.key === "с" ||
                e.key === "С") &&
            node &&
            node.url
        ) {
            copyText(node.url);
            state.clipUrl = node.url;
        }
    });
}
