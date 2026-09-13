/**
 * Calendar (tray clock → month calendar): pure month arithmetic and
 * Monday-first grid layout. No DOM — app.js renders the returned cells.
 */

export interface MonthPosition {
    year: number;
    /** 0-based month (0 = January). */
    month: number;
}

/**
 * Shift a month position by `delta` months, wraparound safe
 * (e.g. prev(2026, 0) === { year: 2025, month: 11 }).
 */
export function addMonths(
    year: number,
    month: number,
    delta: number,
): MonthPosition {
    const idx = year * 12 + month + delta;
    return { year: Math.floor(idx / 12), month: ((idx % 12) + 12) % 12 };
}

/** Russian long month + year label, e.g. "сентябрь 2026 г.". */
export function monthTitle(year: number, month: number): string {
    return new Date(year, month, 1).toLocaleString("ru-RU", {
        month: "long",
        year: "numeric",
    });
}

/**
 * Monday-first calendar grid for a month: leading `null`s for the empty
 * cells before the 1st, then 1…daysInMonth. Month is 0-based.
 */
export function monthCells(year: number, month: number): (number | null)[] {
    const firstDow = new Date(year, month, 1).getDay(); // 0 = Sunday
    const offset = (firstDow + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
}

/** Day of month that is "today" inside the given month, or null. */
export function todayInMonth(
    year: number,
    month: number,
    now: Date = new Date(),
): number | null {
    return now.getFullYear() === year && now.getMonth() === month
        ? now.getDate()
        : null;
}