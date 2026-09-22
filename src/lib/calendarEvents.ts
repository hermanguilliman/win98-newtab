/**
 * User calendar events: pure model, normalization, date-range maths and
 * month/day filtering. No DOM, no chrome.* — the app renders the results and
 * persists the array under `chrome.storage.sync` ("calendarEvents").
 *
 * Dates are stored as "YYYY-MM-DD" strings; times as "HH:MM". An event spans
 * an inclusive [startDate, endDate] range (endDate defaults to startDate).
 * `allDay` events carry no times.
 */

export interface CalendarEvent {
    id: string;
    title: string;
    /** Inclusive range start, "YYYY-MM-DD". */
    startDate: string;
    /** Inclusive range end, "YYYY-MM-DD" (>= startDate). */
    endDate: string;
    /** Whole-day event — startTime/endTime are ignored. */
    allDay: boolean;
    /** "HH:MM" or "" for events without a fixed start time. */
    startTime: string;
    /** "HH:MM" or "" — optional end time. */
    endTime: string;
    note: string;
}

/** Parse "YYYY-MM-DD" into {y, m, d} (0-based month) or null. */
export function parseDateStr(s: string): { y: number; m: number; d: number } | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const probe = new Date(y, mo - 1, d);
    if (
        probe.getFullYear() !== y ||
        probe.getMonth() !== mo - 1 ||
        probe.getDate() !== d
    ) {
        return null; // e.g. Feb 30
    }
    return { y, m: mo - 1, d };
}

/** "YYYY-MM-DD" from a calendar position. */
export function toDateStr(y: number, m: number, d: number): string {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
}

const TIME_RE = /^(\d{1,2}):(\d{2})$/;

/** Validate "HH:MM"; returns "" (cleared) for invalid input. */
export function normalizeTime(s: string): string {
    const m = TIME_RE.exec(s ?? "");
    if (!m) return "";
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return "";
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/**
 * Validate + coerce a raw (possibly user-edited) event into the canonical
 * shape. Returns null when the payload is unusable (bad dates, empty title).
 */
export function normalizeEvent(raw: Partial<CalendarEvent>): CalendarEvent | null {
    const title = String(raw.title ?? "").trim();
    const start = parseDateStr(String(raw.startDate ?? ""));
    if (!title || !start || raw.id === undefined) return null;
    let end = parseDateStr(String(raw.endDate ?? ""));
    const allDay = raw.allDay === true;

    let startTime = allDay ? "" : normalizeTime(raw.startTime ?? "");
    let endTime = allDay ? "" : normalizeTime(raw.endTime ?? "");

    if (!end) {
        end = { ...start };
    } else {
        const startTs = new Date(start.y, start.m, start.d).getTime();
        const endTs = new Date(end.y, end.m, end.d).getTime();
        if (endTs < startTs) end = { ...start };
    }

    return {
        id: String(raw.id),
        title,
        startDate: toDateStr(start.y, start.m, start.d),
        endDate: toDateStr(end.y, end.m, end.d),
        allDay,
        startTime,
        endTime,
        note: String(raw.note ?? ""),
    };
}

function parseTs(s: string): number {
    const p = parseDateStr(s);
    return p ? new Date(p.y, p.m, p.d).getTime() : NaN;
}

/** Events whose [startDate, endDate] covers the given day. */
export function eventCoversDay(ev: CalendarEvent, y: number, m: number, d: number): boolean {
    const ts = new Date(y, m, d).getTime();
    return ts >= parseTs(ev.startDate) && ts <= parseTs(ev.endDate);
}

/** Events intersecting the given month (0-based), all-day first then by time. */
export function eventsInMonth(
    events: CalendarEvent[],
    y: number,
    m: number,
): CalendarEvent[] {
    const monthStart = new Date(y, m, 1).getTime();
    const monthEnd = new Date(y, m + 1, 0).getTime();
    return events.filter((ev) => {
        const s = parseTs(ev.startDate);
        const e = parseTs(ev.endDate);
        return s <= monthEnd && e >= monthStart;
    });
}

/** Events covering exactly one day, sorted all-day first, then by start time. */
export function eventsOnDay(
    events: CalendarEvent[],
    y: number,
    m: number,
    d: number,
): CalendarEvent[] {
    return events
        .filter((ev) => eventCoversDay(ev, y, m, d))
        .sort(compareEvents);
}

const EMPTY_TIME = -1;
const TIME_MS = (t: string): number => {
    const m = TIME_RE.exec(t);
    return m ? Number(m[1]) * 60 + Number(m[2]) : EMPTY_TIME;
};

/** Deterministic sort: earlier start first, all-day before timed, then title. */
export function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
    if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
    if (a.endDate !== b.endDate) return a.endDate < b.endDate ? -1 : 1;
    const at = a.allDay ? EMPTY_TIME : TIME_MS(a.startTime);
    const bt = b.allDay ? EMPTY_TIME : TIME_MS(b.startTime);
    if (at !== bt) return at - bt;
    return a.title.localeCompare(b.title, "ru");
}

/** Sort a copy of the array using the canonical ordering. */
export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
    return [...events].sort(compareEvents);
}

/** "13.09.2026" style. */
export function formatDateStr(s: string): string {
    const p = parseDateStr(s);
    return p
        ? `${String(p.d).padStart(2, "0")}.${String(p.m + 1).padStart(2, "0")}.${p.y}`
        : s;
}

/** "09:00" or "09:00–11:30", or "весь день" / "—" for empty. */
export function formatEventTime(ev: CalendarEvent): string {
    if (ev.allDay) return "весь день";
    if (!ev.startTime) return "—";
    return ev.endTime ? `${ev.startTime}–${ev.endTime}` : ev.startTime;
}

/**
 * Compact single-line range: "13.09.2026" for a single day,
 * "13.09.2026 – 15.09.2026" for a multi-day span.
 */
export function formatEventRange(ev: CalendarEvent): string {
    if (ev.startDate === ev.endDate) return formatDateStr(ev.startDate);
    return `${formatDateStr(ev.startDate)} – ${formatDateStr(ev.endDate)}`;
}

/** Deterministic palette index in [0, paletteLen) from the event id. */
export function eventColorIndex(ev: CalendarEvent, paletteLen: number): number {
    let h = 0;
    for (let i = 0; i < ev.id.length; i++) {
        h = (h * 31 + ev.id.charCodeAt(i)) >>> 0;
    }
    return h % Math.max(1, paletteLen);
}

/** "dd.mm.yyyy" from a Date for date-input defaults. */
export function formatInputDate(d: Date): string {
    return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

/** "HH:MM" from a Date for time-input defaults. */
export function formatInputTime(d: Date): string {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Make an event id unique enough for local usage. */
export function makeEventId(): string {
    return (
        Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8)
    );
}