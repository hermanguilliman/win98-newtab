/**
 * Calendar window: month grid with Russian holidays (isdayoff.ru, cached) and
 * user events stored in chrome.storage.sync. Pure grid/date math and the event
 * model live in src/lib/calendar.ts, holidays.ts and calendarEvents.ts.
 */

/* ============================================================
 CALENDAR (tray clock → month calendar)
 Russian state holidays via isdayoff.ru (cached), user events
 with start/end dates + times (chrome.storage.sync).
 ============================================================ */

/** @typedef {import("../types").WinData} WinData */
import { addMonths, formatDayTitle, monthCells, monthTitle, todayInMonth } from "../lib/calendar";
import { bringToFront, closeWindow, createWindow, restoreWindow } from "./windows";
import { drawComputerIcon } from "./icons";
import { eventColorIndex, eventCoversDay, eventsInMonth, eventsOnDay, formatEventTime, formatInputDate, makeEventId, normalizeEvent, parseDateStr, sortEvents } from "../lib/calendarEvents";
import { eventTargetElement } from "./dom";
import { openConfirmDialog, openDialog } from "./dialogs";
import { parseIsdayoffStatus, ruDayInfo } from "../lib/holidays";
import { state } from "../state";
import { syncStoredGet, syncStoredSet } from "./storage";

const CALENDAR_EVENTS_KEY = "calendarEvents";
const ISDAYOFF_URL = "https://isdayoff.ru/api/getdata";
const ISDAYOFF_CACHE_KEY = "isdayoffRaw";
/** Left marker colors for day-panel event rows (indexed via eventColorIndex). */
const EVENT_COLORS = [
    "#0f5c8c",
    "#8a3324",
    "#6a5acd",
    "#5c7a1f",
    "#b07200",
    "#7a3b7a",
];

let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth(); // 0-based
/** @type {{ y: number, m: number, d: number } | null} */
let calendarSelected = null;
let calendarEventsLoaded = false;
/** @type {Map<number, import("../lib/holidays").RuYearTransfers | null>} */
const isdayoffMemory = new Map();

/* ---------- persistence ---------- */

async function loadCalendarEvents() {
    try {
        const arr = await syncStoredGet(CALENDAR_EVENTS_KEY);
        if (Array.isArray(arr)) {
            state.calendarEvents = sortEvents(
                arr.map((raw) => normalizeEvent(raw)).filter((e) => e !== null),
            );
        }
    } catch {
        state.calendarEvents = [];
    }
    calendarEventsLoaded = true;
    // The window may already be open and rendered before storage answered
    // (openCalendar fires loadCalendarEvents without awaiting); re-render
    // so loaded events appear without waiting for a click/navigation.
    refreshCalendarWindow();
}

function saveCalendarEvents() {
    syncStoredSet(CALENDAR_EVENTS_KEY, state.calendarEvents);
}

/**
 * Day status for (y,m,d): prefers live isdayoff data if already fetched,
 * otherwise falls back to the built-in registry / базовое правило ст. 112.
 */
function ruDayInfoFor(y, m, d) {
    return ruDayInfo(y, m, d, isdayoffMemory.get(y) ?? null);
}

/**
 * Make sure we know the isdayoff status string for `year`, in this order:
 * memory → chrome.storage (persistent cache) → network. Stores the raw
 * string so every day lookup is locally resolved afterwards.
 */
async function ensureRuYearTransfers(year) {
    if (isdayoffMemory.has(year)) return isdayoffMemory.get(year);
    try {
        const stored = await chrome.storage.local.get(ISDAYOFF_CACHE_KEY);
        const raw = stored[ISDAYOFF_CACHE_KEY] && stored[ISDAYOFF_CACHE_KEY][year];
        if (typeof raw === "string" && raw.length > 0) {
            const parsed = parseIsdayoffStatus(raw, year);
            isdayoffMemory.set(year, parsed);
            return parsed;
        }
    } catch {}
    let parsed = null;
    let rawText = "";
    try {
        const res = await fetch(`${ISDAYOFF_URL}?year=${year}&country=ru`);
        if (res.ok) rawText = await res.text();
    } catch {}
    if (rawText) parsed = parseIsdayoffStatus(rawText, year);
    isdayoffMemory.set(year, parsed);
    if (parsed) {
        try {
            const stored = await chrome.storage.local.get(ISDAYOFF_CACHE_KEY);
            const map = stored[ISDAYOFF_CACHE_KEY] || {};
            map[year] = rawText;
            await chrome.storage.local.set({ [ISDAYOFF_CACHE_KEY]: map });
        } catch {}
    }
    return parsed;
}

/* ---------- window ---------- */

export function openCalendar() {
    const existing = state.windows.find((w) => w.winType === "calendar");
    if (existing) {
        renderCalendar(existing);
        if (existing.minimized) restoreWindow(existing.id);
        else bringToFront(existing.id);
        return;
    }
    if (!calendarEventsLoaded) {
        loadCalendarEvents().catch(() => {});
    }
    createWindow({
        winType: "calendar",
        title: "Календарь",
        icon: drawComputerIcon(16),
        width: 360,
        height: 470,
        content: "",
        statusbar: false,
        onCreated: (el, winData) => {
            /** @type {HTMLElement} */
            (el.querySelector(".win98-window-content")).style.background =
                "var(--win98-silver)";
            renderCalendar(winData);
            ensureRuYearTransfers(calendarYear).then((transfers) => {
                if (transfers !== (isdayoffMemory.get(calendarYear) ?? null)) {
                    renderCalendar(winData);
                }
            });
        },
    });
}

/** Re-render the calendar window (after events/transfer changes). */
function refreshCalendarWindow() {
    const cal = state.windows.find((w) => w.winType === "calendar");
    if (cal) renderCalendar(cal);
}

/* ---------- rendering ---------- */

function renderCalendar(winData) {
    const el = winData.el;
    if (!el) return;
    const ce = el.querySelector(".win98-window-content");
    if (!ce) return;
    ce.innerHTML = "";

    if (!calendarSelected) {
        const n = new Date();
        calendarSelected = { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
    }

    // Header: prev / month-year / next
    const header = document.createElement("div");
    header.className = "cal-header";
    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "win98-btn cal-nav";
    prev.textContent = "◀";
    prev.addEventListener("click", () => {
        const p = addMonths(calendarYear, calendarMonth, -1);
        calendarYear = p.year;
        calendarMonth = p.month;
        renderCalendar(winData);
        ensureRuYearTransfers(calendarYear).then((transfers) => {
            if (transfers !== (isdayoffMemory.get(calendarYear) ?? null)) {
                renderCalendar(winData);
            }
        });
    });
    const title = document.createElement("div");
    title.className = "cal-title";
    title.textContent = monthTitle(calendarYear, calendarMonth);
    const next = document.createElement("button");
    next.type = "button";
    next.className = "win98-btn cal-nav";
    next.textContent = "▶";
    next.addEventListener("click", () => {
        const p = addMonths(calendarYear, calendarMonth, 1);
        calendarYear = p.year;
        calendarMonth = p.month;
        renderCalendar(winData);
        ensureRuYearTransfers(calendarYear).then((transfers) => {
            if (transfers !== (isdayoffMemory.get(calendarYear) ?? null)) {
                renderCalendar(winData);
            }
        });
    });
    header.append(prev, title, next);
    ce.appendChild(header);

    // Day-of-week header (Mon..Sun)
    const grid = document.createElement("div");
    grid.className = "cal-grid";
    const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    for (const d of dayNames) {
        const cell = document.createElement("div");
        cell.className = "cal-cell cal-dow" + (d === "Сб" || d === "Вс" ? " cal-weekend" : "");
        cell.textContent = d;
        grid.appendChild(cell);
    }

    const cells = monthCells(calendarYear, calendarMonth);
    const todayDay = todayInMonth(calendarYear, calendarMonth);
    const monthEvents = eventsInMonth(state.calendarEvents, calendarYear, calendarMonth);
    for (const cell of cells) {
        if (cell === null) {
            const empty = document.createElement("div");
            empty.className = "cal-cell cal-empty";
            grid.appendChild(empty);
            continue;
        }
        const day = cell;
        const info = ruDayInfoFor(calendarYear, calendarMonth, day);
        const isToday =
            calendarYear === new Date().getFullYear() &&
            calendarMonth === new Date().getMonth() &&
            day === todayDay;
        const isSelected =
            calendarSelected &&
            calendarSelected.y === calendarYear &&
            calendarSelected.m === calendarMonth &&
            calendarSelected.d === day;

        const dayEl = document.createElement("div");
        dayEl.className =
            "cal-cell cal-day" +
            (info.isDayOff ? " cal-off" : "") +
            (info.status === "holiday" ? " cal-holiday" : "") +
            (isToday ? " cal-today" : "") +
            (isSelected ? " cal-selected" : "");
        dayEl.dataset.y = String(calendarYear);
        dayEl.dataset.m = String(calendarMonth);
        dayEl.dataset.d = String(day);
        if (info.holidayName) dayEl.title = info.holidayName;
        const num = document.createElement("div");
        num.className = "cal-daynum";
        num.textContent = String(day);
        dayEl.appendChild(num);

        const dayEvents = monthEvents.filter((ev) =>
            eventCoversDay(ev, calendarYear, calendarMonth, day),
        );
        // Show a compact event-count badge instead of chip rows so the
        // grid cells keep a uniform height; details live in the day panel.
        if (dayEvents.length > 0) {
            const badge = document.createElement("div");
            badge.className = "cal-evt-count";
            badge.textContent = String(dayEvents.length);
            const peek = dayEvents
                .slice(0, 3)
                .map((ev) => (ev.allDay ? ev.title : `${ev.startTime || ""} ${ev.title}`.trim()))
                .join("\n");
            badge.title = peek + (dayEvents.length > 3 ? `\n+${dayEvents.length - 3} ещё` : "");
            dayEl.appendChild(badge);
        }

        dayEl.addEventListener("click", () => {
            calendarSelected = { y: calendarYear, m: calendarMonth, d: day };
            renderCalendar(winData);
        });
        grid.appendChild(dayEl);
    }
    ce.appendChild(grid);

    // Day panel: title, holiday name, events of the selected day.
    const panel = document.createElement("div");
    panel.className = "cal-panel";
    const pTitle = document.createElement("div");
    pTitle.className = "cal-panel-title";
    pTitle.textContent = formatDayTitle(
        calendarSelected.y,
        calendarSelected.m,
        calendarSelected.d,
    );
    panel.appendChild(pTitle);

    const selInfo = ruDayInfoFor(
        calendarSelected.y,
        calendarSelected.m,
        calendarSelected.d,
    );
    if (selInfo.holidayName) {
        const hol = document.createElement("div");
        hol.className = "cal-panel-holiday";
        hol.textContent = selInfo.holidayName;
        panel.appendChild(hol);
    }

    const list = document.createElement("div");
    list.className = "cal-panel-events";
    const dayEvents = eventsOnDay(
        state.calendarEvents,
        calendarSelected.y,
        calendarSelected.m,
        calendarSelected.d,
    );
    if (dayEvents.length === 0) {
        const none = document.createElement("div");
        none.className = "cal-panel-empty";
        none.textContent = "Нет событий";
        list.appendChild(none);
    } else {
        dayEvents.forEach((ev) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "cal-ev-item";
            const time = document.createElement("span");
            time.className = "cal-ev-time";
            time.textContent = formatEventTime(ev);
            const name = document.createElement("span");
            name.className = "cal-ev-name";
            name.textContent = ev.title;
            item.append(time, name);
            item.style.borderLeftColor =
                EVENT_COLORS[eventColorIndex(ev, EVENT_COLORS.length)];
            item.addEventListener("click", () => openEventDialog(winData, ev));
            list.appendChild(item);
        });
    }
    panel.appendChild(list);

    const btns = document.createElement("div");
    btns.className = "cal-panel-buttons";
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "win98-btn";
    addBtn.textContent = "Добавить событие";
    addBtn.addEventListener("click", () => {
        openEventDialog(winData, null, calendarSelected);
    });
    const todayBtn = document.createElement("button");
    todayBtn.type = "button";
    todayBtn.className = "win98-btn";
    todayBtn.textContent = "Сегодня";
    todayBtn.addEventListener("click", () => {
        const n = new Date();
        calendarYear = n.getFullYear();
        calendarMonth = n.getMonth();
        calendarSelected = { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
        renderCalendar(winData);
        ensureRuYearTransfers(calendarYear).then((transfers) => {
            if (transfers !== (isdayoffMemory.get(calendarYear) ?? null)) {
                renderCalendar(winData);
            }
        });
    });
    btns.append(addBtn, todayBtn);
    panel.appendChild(btns);
    ce.appendChild(panel);
}

/* ---------- event editor dialog ---------- */

/**
 * Win98 dialog to create/edit a calendar event.
 * @param {WinData} winData calendar window
 * @param {import("../lib/calendarEvents").CalendarEvent | null} event existing event or null for a new one
 * @param {{ y: number, m: number, d: number } | null} [defaultDay] preselected day for new events
 */
function openEventDialog(winData, event, defaultDay) {
    const body = document.createElement("div");
    body.className = "win98-dialog ev-dialog";

    const mkField = (label) => {
        const row = document.createElement("label");
        row.className = "ev-field";
        const lab = document.createElement("span");
        lab.className = "ev-label";
        lab.textContent = label;
        row.appendChild(lab);
        return { row, lab };
    };

    const titleRow = mkField("Название:");
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "win98-addressbar-input ev-input";
    titleInput.value = event ? event.title : "";
    titleRow.row.appendChild(titleInput);

    const allDayRow = document.createElement("label");
    allDayRow.className = "ev-inline";
    const allDayChk = document.createElement("input");
    allDayChk.type = "checkbox";
    allDayChk.className = "win98-checkbox";
    allDayChk.checked = event ? event.allDay : true;
    const allDayLabel = document.createElement("span");
    allDayLabel.textContent = "Весь день";
    allDayRow.append(allDayChk, allDayLabel);

    const startRow = mkField("Начало:");
    const startDate = document.createElement("input");
    startDate.type = "date";
    startDate.className = "ev-input ev-date";
    const startParsed = event ? parseDateStr(event.startDate) : null;
    startDate.value = event
        ? startParsed
            ? formatInputDate(new Date(startParsed.y, startParsed.m, startParsed.d))
            : ""
        : defaultDay
          ? formatInputDate(new Date(defaultDay.y, defaultDay.m, defaultDay.d))
          : formatInputDate(new Date());
    const startTime = document.createElement("input");
    startTime.type = "time";
    startTime.className = "ev-input ev-time";
    startTime.value = event ? event.startTime : "";
    const endRow = mkField("Окончание:");
    const endDate = document.createElement("input");
    endDate.type = "date";
    endDate.className = "ev-input ev-date";
    const endParsed = event ? parseDateStr(event.endDate) : null;
    endDate.value = event
        ? endParsed
            ? formatInputDate(new Date(endParsed.y, endParsed.m, endParsed.d))
            : ""
        : startDate.value;
    const endTime = document.createElement("input");
    endTime.type = "time";
    endTime.className = "ev-input ev-time";
    endTime.value = event && !event.allDay ? event.endTime : "";

    const noteRow = mkField("Заметка:");
    const noteInput = document.createElement("textarea");
    noteInput.className = "ev-input ev-note";
    noteInput.rows = 3;
    noteInput.value = event ? event.note : "";

    body.append(
        titleRow.row,
        allDayRow,
        startRow.row,
        endRow.row,
        noteRow.row,
    );
    startRow.row.append(startDate, startTime);
    endRow.row.append(endDate, endTime);

    // error line
    const err = document.createElement("div");
    err.className = "ev-error";
    err.style.display = "none";
    body.appendChild(err);

    const setError = (msg) => {
        err.textContent = msg;
        err.style.display = msg ? "" : "none";
    };

    const syncAllDay = () => {
        startTime.disabled = allDayChk.checked;
        endTime.disabled = allDayChk.checked;
        startDate.disabled = false;
        endDate.disabled = false;
    };
    allDayChk.addEventListener("change", syncAllDay);
    syncAllDay();

    // end date follows start unless explicitly edited on a new event
    endDate.addEventListener("input", () => {
        if (endDate.value < startDate.value) endDate.value = startDate.value;
    });
    startDate.addEventListener("input", () => {
        if (!endDate.value || endDate.value === startDate.value) {
            endDate.value = startDate.value;
        } else if (endDate.value < startDate.value) {
            endDate.value = startDate.value;
        }
    });

    const doSave = () => {
        const norm = normalizeEvent({
            id: event ? event.id : makeEventId(),
            title: titleInput.value,
            startDate: startDate.value,
            endDate: endDate.value,
            allDay: allDayChk.checked,
            startTime: allDayChk.checked ? "" : startTime.value,
            endTime: allDayChk.checked ? "" : endTime.value,
            note: noteInput.value,
        });
        if (!norm || !norm.title) {
            setError("Введите название события.");
            return false;
        }
        if (event) {
            const i = state.calendarEvents.findIndex((x) => x.id === event.id);
            if (i >= 0) state.calendarEvents[i] = norm;
            else state.calendarEvents.push(norm);
        } else {
            state.calendarEvents.push(norm);
        }
        state.calendarEvents = sortEvents(state.calendarEvents);
        saveCalendarEvents();
        refreshCalendarWindow();
        return true;
    };

    const buttons = [
        { label: "OK", onClick: doSave },
        { label: "Отмена", onClick: () => {} },
    ];
    if (event) {
        buttons.push({
            label: "Удалить",
            onClick: () => {
                openConfirmDialog(
                    "Удалить событие",
                    `Удалить «${event.title}»?`,
                    () => {
                        state.calendarEvents = state.calendarEvents.filter(
                            (x) => x.id !== event.id,
                        );
                        saveCalendarEvents();
                        refreshCalendarWindow();
                    },
                );
            },
        });
    }

    const evDialog = openDialog({
        title: event ? "Изменить событие" : "Новое событие",
        body,
        width: 380,
        buttons,
    });
    // Enter submits the form (except in the note textarea, where it makes
    // a new line). `doSave` returns false on validation failure; the OK
    // button path closes the dialog itself via openDialog.
    body.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && eventTargetElement(e) !== noteInput) {
            e.preventDefault();
            if (doSave()) closeWindow(evDialog.id);
        }
    });
}
