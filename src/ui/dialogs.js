/**
 * Win98 dialogs (prompt / confirm / message box) built as child windows:
 * the scrollable body and the button row are siblings inside the window
 * content so the buttons never scroll out of view.
 */

/* ============================================================
 WIN98 DIALOGS (prompt / confirm as child windows)
 ============================================================ */

import { closeWindow, createWindow } from "./windows";
import { drawComputerIcon } from "./icons";
import { eventTargetElement } from "./dom";
import { state } from "../state";

export function openDialog(opts) {
    /** @type {HTMLDivElement & { okButton?: HTMLButtonElement }} */
    const body = document.createElement("div");
    body.className = "win98-dialog";
    if (opts.body instanceof HTMLElement) body.appendChild(opts.body);
    else body.innerHTML = typeof opts.body === "string" ? opts.body : "";

    const btnRow = document.createElement("div");
    btnRow.className = "win98-dialog-buttons";
    const buttons = opts.buttons || [{ label: "OK", onClick: null }];

    const winData = createWindow({
        title: opts.title || "",
        icon: opts.icon || drawComputerIcon(16),
        width: opts.width || 340,
        height: 0,
        dialog: true,
        content: "",
        statusbar: false,
        onCreated: (el) => {
            const ce = /** @type {HTMLElement} */ (el.querySelector(".win98-window-content"));
            ce.classList.add("win98-dialog-container");
            ce.style.background = "var(--win98-silver)";
            // Buttons go directly into ce (outside the scrollable body)
            // so they are always visible at the bottom
            buttons.forEach((b, i) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "win98-btn";
                btn.textContent = b.label;
                btn.addEventListener("click", () => {
                    if (b.onClick) b.onClick();
                    if (b.close !== false) closeWindow(winData.id);
                });
                btnRow.appendChild(btn);
                // Expose the first button as the dialog's OK button so
                // prompt dialogs can trigger it from the keyboard (Enter).
                if (i === 0) {
                    body.okButton = btn;
                }
            });
            ce.appendChild(body);
            ce.appendChild(btnRow);
        },
    });

    // NOTE: `winData` must NOT be referenced inside onCreated above — it is
    // called synchronously from createWindow, before the const initializes
    // (temporal dead zone) → ReferenceError → dialog renders titlebar-only.
    // Also mirror the OK button onto winData for the Enter handler below.
    winData.okButton = body.okButton;

    // Win98 dialogs size to their content — no empty space, no needless
    // scrollbars. Cap at the viewport so small screens still work, and
    // recenter vertically after the real height is known.
    requestAnimationFrame(() => {
        const el = winData.el;
        if (!el.isConnected) return;
        el.style.height = "auto";
        const natural = el.offsetHeight;
        const maxH = Math.max(160, window.innerHeight - 56);
        const h = Math.min(natural, maxH);
        el.style.height = h + "px";
        el.style.minHeight = h + "px";
        if (natural > maxH) {
            el.classList.add("win98-window--dialog-scroll");
        }
        const y = Math.max(4, Math.round((window.innerHeight - h) / 2));
        el.style.top = y + "px";
    });

    return winData;
}

/** Enter = default button, Esc = close, for whichever dialog is active */
document.addEventListener("keydown", (e) => {
    const winData = state.windows.find(
        (w) => w.dialog && !w.minimized && w.id === state.windowManager.activeWindowId,
    );
    if (!winData) return;
    if (
        e.key === "Enter" &&
        !eventTargetElement(e).closest("input,textarea,select,button")
    ) {
        e.preventDefault();
        const ok = /** @type {HTMLButtonElement} */ (
            winData.el.querySelector(".win98-dialog-buttons .win98-btn")
        );
        if (ok) ok.click();
    } else if (e.key === "Escape") {
        e.preventDefault();
        closeWindow(winData.id);
    }
});

export function openConfirmDialog(title, message, onConfirm) {
    const body = document.createElement("div");
    body.className = "win98-dialog";
    const txt = document.createElement("div");
    txt.className = "win98-dialog-text";
    txt.textContent = message;
    body.appendChild(txt);
    openDialog({
        title,
        body,
        buttons: [{ label: "OK", onClick: onConfirm }, { label: "Отмена" }],
    });
}

/** Classic Win98 system message box: icon + text, centered OK button */
export function openMessageBox(title, message, icon) {
    const body = document.createElement("div");
    body.className = "win98-dialog win98-msgbox";
    const main = document.createElement("div");
    main.className = "win98-msgbox-main";
    const msgIcon = document.createElement("img");
    msgIcon.className = "win98-msgbox-icon";
    msgIcon.src = icon || drawComputerIcon(32);
    msgIcon.alt = "";
    const txt = document.createElement("div");
    txt.className = "win98-dialog-text";
    txt.textContent = message;
    main.append(msgIcon, txt);
    body.appendChild(main);
    return openDialog({
        title,
        icon: icon || drawComputerIcon(16),
        width: 270,
        body,
        buttons: [{ label: "OK" }],
    });
}

export function openPromptDialog(title, labelText, initialValue, onSubmit) {
    const body = document.createElement("div");
    body.className = "win98-dialog";
    const lbl = document.createElement("div");
    lbl.className = "win98-dialog-label";
    lbl.textContent = labelText;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "win98-addressbar-input";
    input.value = initialValue;
    input.style.width = "100%";
    body.append(lbl, input);

    const winData = openDialog({
        title,
        body,
        buttons: [
            {
                label: "OK",
                onClick: () => {
                    const v = input.value.trim();
                    if (v) onSubmit(v);
                },
            },
            { label: "Отмена" },
        ],
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (winData.okButton) winData.okButton.click();
        } else if (e.key === "Escape") {
            e.preventDefault();
            closeWindow(winData.id);
        }
    });
    setTimeout(() => input.focus(), 50);
    return winData;
}

