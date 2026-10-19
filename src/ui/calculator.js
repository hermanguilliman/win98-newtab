/**
 * Calculator window: a Win98-style keypad bound to evalOp (src/lib/calc.ts).
 * Keyboard input is wired through a document key listener that the window-close
 * hook in the shell detaches when the window is destroyed.
 */

/* ============================================================
 CALCULATOR
 ============================================================ */

import { bringToFront, createWindow, restoreWindow } from "./windows";
import { drawCalcIcon } from "./icons";
import { evalOp } from "../lib/calc";
import { eventTargetElement } from "./dom";
import { state } from "../state";

export function openCalculator() {
    const existing = state.windows.find(
        (w) => w.winType === "calculator",
    );
    if (existing) {
        if (existing.minimized) restoreWindow(existing.id);
        else bringToFront(existing.id);
        return;
    }
    createWindow({
        winType: "calculator",
        title: "Калькулятор",
        icon: drawCalcIcon(),
        width: 250,
        height: 322,
        statusbar: false,
        content: `
          <div class="calc-display" id="calc-display">0</div>
          <div class="calc-keys">
            <button data-key="MC">MC</button><button data-key="MR">MR</button><button data-key="MS">MS</button><button data-key="M+" class="calc-span2">M+</button>
            <button data-key="Back" class="calc-span2">Back</button><button data-key="CE">CE</button><button data-key="C">C</button>
            <button data-key="sqrt">√</button><button data-key="7">7</button><button data-key="8">8</button><button data-key="9">9</button><button data-key="/">/</button>
            <button data-key="%">%</button><button data-key="4">4</button><button data-key="5">5</button><button data-key="6">6</button><button data-key="*">*</button>
            <button data-key="1/x">1/x</button><button data-key="1">1</button><button data-key="2">2</button><button data-key="3">3</button><button data-key="-">-</button>
            <button data-key="±">±</button><button data-key="0">0</button><button data-key=".">.</button><button data-key="+">+</button><button data-key="=">=</button>
          </div>`,
        onCreated: (el, winData) => {
            el.classList.add("calc-window");
            initCalcWindow(el, winData);
        },
    });
}

function initCalcWindow(el, winData) {
    const calc = {
        display: "0",
        acc: null,
        op: null,
        fresh: true,
        error: false,
        mem: 0,
    };
    el._calc = calc;
    const displayEl = el.querySelector("#calc-display");
    const render = () => {
        displayEl.textContent = calc.display;
    };

    el.querySelector(".calc-keys").addEventListener("click", (e) => {
        const btn = /** @type {HTMLElement | null} */ (
            eventTargetElement(e).closest("button[data-key]")
        );
        if (!btn) return;
        calcInput(calc, btn.dataset.key);
        render();
    });

    // Keyboard support — only while this window is the active one
    const onKey = (e) => {
        if (state.windowManager.activeWindowId !== winData.id) return;
        const map = { Escape: "C", Backspace: "Back", Enter: "=" };
        const k = map[e.key] || e.key;
        if (
            /^[0-9.]$/.test(k) ||
            ["+", "-", "*", "/", "%", "="].includes(k)
        ) {
            e.preventDefault();
            calcInput(calc, k);
            render();
        }
    };
    el._calcKeyHandler = onKey;
    document.addEventListener("keydown", onKey);
}

function calcInput(calc, key) {
    if (calc.error && key !== "C" && key !== "CE") {
        calcInput(calc, "C");
    }
    const num = () => {
        const v = parseFloat(calc.display);
        return Number.isFinite(v) ? v : 0;
    };
    const fmt = (v) => {
        if (!Number.isFinite(v)) return "Ошибка";
        return String(parseFloat(v.toPrecision(12)));
    };

    if (/^[0-9]$/.test(key)) {
        if (calc.error) return;
        if (calc.fresh) {
            calc.display = key;
            calc.fresh = false;
        } else {
            calc.display =
                (calc.display === "0" ? "" : calc.display) + key;
        }
        if (calc.display.length > 16) calc.display = calc.display.slice(0, 16);
    } else if (key === ".") {
        if (calc.error) return;
        if (calc.fresh) {
            calc.display = "0.";
            calc.fresh = false;
        } else if (!calc.display.includes(".")) {
            calc.display += ".";
        }
    } else if (["+", "-", "*", "/"].includes(key)) {
        if (calc.acc !== null && calc.op && !calc.fresh) {
            const res = evalOp(calc.acc, num(), calc.op);
            if (res === null) {
                calc.error = true;
                calc.display = "Ошибка";
                return;
            }
            calc.acc = res;
            calc.display = fmt(res);
        } else {
            calc.acc = num();
        }
        calc.op = key;
        calc.fresh = true;
    } else if (key === "=") {
        if (calc.error) return;
        if (calc.acc !== null && calc.op) {
            const res = evalOp(calc.acc, num(), calc.op);
            if (res === null) {
                calc.error = true;
                calc.display = "Ошибка";
                return;
            }
            calc.display = fmt(res);
            calc.acc = null;
            calc.op = null;
        }
        calc.fresh = true;
    } else if (key === "C") {
        Object.assign(calc, {
            display: "0",
            acc: null,
            op: null,
            fresh: true,
            error: false,
        });
    } else if (key === "CE") {
        calc.display = "0";
        calc.fresh = true;
        calc.error = false;
    } else if (key === "Back") {
        if (calc.fresh || calc.error) return;
        calc.display =
            calc.display.length > 1 ? calc.display.slice(0, -1) : "0";
        if (calc.display === "-") calc.display = "0";
    } else if (key === "sqrt") {
        const v = num();
        if (v < 0) {
            calc.error = true;
            calc.display = "Ошибка";
            return;
        }
        calc.display = fmt(Math.sqrt(v));
        calc.fresh = true;
    } else if (key === "%") {
        if (calc.acc !== null && calc.op) {
            calc.display = fmt((calc.acc * num()) / 100);
        }
        calc.fresh = true;
    } else if (key === "1/x") {
        const v = num();
        if (v === 0) {
            calc.error = true;
            calc.display = "Ошибка";
            return;
        }
        calc.display = fmt(1 / v);
        calc.fresh = true;
    } else if (key === "±") {
        if (calc.error) return;
        if (calc.display !== "0") {
            calc.display = calc.display.startsWith("-")
                ? calc.display.slice(1)
                : "-" + calc.display;
        }
    } else if (key === "MC") {
        calc.mem = 0;
    } else if (key === "MR") {
        calc.display = fmt(calc.mem);
        calc.fresh = true;
    } else if (key === "MS") {
        calc.mem = num();
    } else if (key === "M+") {
        calc.mem += num();
    }
}
