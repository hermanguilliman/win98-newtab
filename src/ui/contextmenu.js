/**
 * Context menu: one shared popup whose items are supplied by the caller
 * (desktop icons, folder items, search rows, taskbar buttons).
 */

/* ============================================================
 CONTEXT MENU
 ============================================================ */

let activeContextMenu = null;

/**
 * The currently open menu element, so callers (e.g. the notepad menu bar) can
 * tell whether the menu they are about to open is already showing.
 * @returns {(HTMLElement & { _notepadOpener?: Element }) | null}
 */
export function activeContextMenuEl() {
    return activeContextMenu;
}

export function showContextMenu(x, y, items) {
    hideContextMenu();

    const menu = document.createElement("div");
    menu.className = "win98-context-menu";

    for (const item of items) {
        if (item.type === "separator") {
            const sep = document.createElement("div");
            sep.className = "win98-context-menu-separator";
            menu.appendChild(sep);
        } else {
            const el = document.createElement("div");
            el.className =
                "win98-context-menu-item" +
                (item.disabled ? " disabled" : "");
            el.textContent = item.label;
            if (!item.disabled) {
                el.addEventListener("click", () => {
                    hideContextMenu();
                    item.action();
                });
            }
            menu.appendChild(el);
        }
    }

    menu.style.left = x + "px";
    menu.style.top = y + "px";
    document.body.appendChild(menu);
    activeContextMenu = menu;

    // Adjust if off-screen
    requestAnimationFrame(() => {
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = x - rect.width + "px";
        }
        if (rect.bottom > window.innerHeight - 28) {
            menu.style.top = y - rect.height + "px";
        }
    });
}

export function hideContextMenu() {
    if (activeContextMenu) {
        activeContextMenu.remove();
        activeContextMenu = null;
    }
}

