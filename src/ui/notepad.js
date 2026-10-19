/**
 * Notepad window: taskbar quick-launch notes with a debounced autosave to
 * chrome.storage.local. Module state keeps the last saved text and the live
 * textarea so a window close can flush pending edits.
 */

/* ============================================================
 NOTEPAD (taskbar quick launch → notes with autosave)
 ============================================================ */

import { activeContextMenuEl, hideContextMenu, showContextMenu } from "./contextmenu";
import { bringToFront, closeWindow, createWindow, restoreWindow } from "./windows";
import { openConfirmDialog, openMessageBox } from "./dialogs";
import { state } from "../state";

const NOTEPAD_STORAGE_KEY = "notepadText";
const NOTEPAD_SAVE_DEBOUNCE_MS = 500;
let notepadSaveTimer = 0;
let notepadTextLoaded = false;
let notepadText = "";
let notepadTextarea = null;

async function loadNotepadText() {
    try {
        const stored = await chrome.storage.local.get(NOTEPAD_STORAGE_KEY);
        notepadText =
            typeof stored[NOTEPAD_STORAGE_KEY] === "string"
                ? stored[NOTEPAD_STORAGE_KEY]
                : "";
    } catch {
        notepadText = "";
    }
    notepadTextLoaded = true;
}

function scheduleNotepadSave() {
    clearTimeout(notepadSaveTimer);
    notepadSaveTimer = setTimeout(flushNotepadSave, NOTEPAD_SAVE_DEBOUNCE_MS);
}

function flushNotepadSave() {
    clearTimeout(notepadSaveTimer);
    notepadSaveTimer = 0;
    const text = notepadTextarea ? notepadTextarea.value : notepadText;
    notepadText = text;
    chrome.storage.local
        .set({ [NOTEPAD_STORAGE_KEY]: text })
        .catch(() => {});
}

/**
 * Called by the shell's window-close hook: flush pending edits and drop the
 * reference to the textarea that is about to be destroyed.
 */
export function notepadWindowClosed() {
    flushNotepadSave();
    notepadTextarea = null;
}

export function openNotepad() {
    const existing = state.windows.find((w) => w.winType === "notepad");
    if (existing) {
        if (existing.minimized) restoreWindow(existing.id);
        else bringToFront(existing.id);
        return;
    }
    createWindow({
        winType: "notepad",
        title: "Блокнот",
        icon: "icons/notepad.png",
        width: 500,
        height: 380,
        content: `
    <div class="notepad-menubar">
      <button type="button" class="notepad-menu-btn" data-notepad-menu="file">Файл</button>
      <button type="button" class="notepad-menu-btn" data-notepad-menu="edit">Правка</button>
      <button type="button" class="notepad-menu-btn" data-notepad-menu="help">Справка</button>
    </div>
    <textarea class="notepad-textarea" spellcheck="false" wrap="off"></textarea>`,
        statusbar: true,
        statusText: "Готово",
        onCreated: (el, winData) => initNotepadWindow(el, winData),
    });
}

function initNotepadWindow(el, winData) {
    el.classList.add("notepad-window");
    const ta = el.querySelector(".notepad-textarea");
    const statusField = el.querySelector(".win98-statusbar-field");
    notepadTextarea = ta;

    const updateStatus = () => updateNotepadStatus(ta, statusField);
    let userTyped = false;

    if (!notepadTextLoaded) {
        loadNotepadText().then(() => {
            if (!userTyped) ta.value = notepadText;
            updateStatus();
        });
    } else {
        ta.value = notepadText;
    }

    ta.addEventListener("input", () => {
        userTyped = true;
        scheduleNotepadSave();
        updateStatus();
    });
    ta.addEventListener("keyup", updateStatus);
    ta.addEventListener("click", updateStatus);

    // Ctrl+S (also on a Russian keyboard layout) saves right away
    ta.addEventListener("keydown", (e) => {
        if (
            e.ctrlKey &&
            (e.key.toLowerCase() === "s" ||
                e.key.toLowerCase() === "ы")
        ) {
            e.preventDefault();
            flushNotepadSave();
            statusField.textContent = "Сохранено";
            setTimeout(updateStatus, 1200);
        }
    });

    // Menu bar: reuse the Win98 context menu as a dropdown (fixed-position
    // menus need stopPropagation so the document click handler doesn't
    // immediately close what we just opened).
    el.querySelectorAll(".notepad-menu-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const openMenu = activeContextMenuEl();
            if (openMenu && openMenu._notepadOpener === btn) {
                hideContextMenu();
                return;
            }
            const rect = btn.getBoundingClientRect();
            showContextMenu(
                rect.left,
                rect.bottom,
                notepadMenuItems(btn.dataset.notepadMenu, {
                    winData,
                    ta,
                    statusField,
                }),
            );
            const menu = activeContextMenuEl();
            if (menu) {
                menu._notepadOpener = btn;
            }
        });
    });

    setTimeout(() => ta.focus(), 50);
}

function updateNotepadStatus(ta, field) {
    const text = ta.value;
    const pos = ta.selectionStart;
    const line = text.slice(0, pos).split("\n").length;
    const col = pos - text.lastIndexOf("\n", pos - 1);
    field.textContent = `Стр: ${line}, Стб: ${col}`;
}

function notepadMenuItems(menuId, ctx) {
    const { winData, ta, statusField } = ctx;
    const flashSaved = () => {
        statusField.textContent = "Сохранено";
        setTimeout(() => updateNotepadStatus(ta, statusField), 1200);
    };
    const clearAll = () => {
        ta.value = "";
        flushNotepadSave();
        updateNotepadStatus(ta, statusField);
    };
    if (menuId === "file") {
        return [
            {
                label: "Новый",
                action: () => {
                    if (ta.value.trim()) {
                        openConfirmDialog("Блокнот", "Очистить содержимое?", clearAll);
                    } else {
                        clearAll();
                    }
                },
            },
            { type: "separator" },
            {
                label: "Сохранить",
                action: () => {
                    flushNotepadSave();
                    flashSaved();
                },
            },
            { type: "separator" },
            { label: "Закрыть", action: () => closeWindow(winData.id) },
        ];
    }
    if (menuId === "edit") {
        return [{ label: "Выделить всё", action: () => ta.select() }];
    }
    // help
    return [
        {
            label: "О программе",
            action: () =>
                openMessageBox(
                    "О программе",
                    "Блокнот — простые заметки с автосохранением.",
                    "icons/notepad.png",
                ),
        },
    ];
}
