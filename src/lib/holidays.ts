/**
 * Russian state holidays and working-day calendar (производственный календарь).
 * Pure logic, no DOM / chrome.* — the app calls `ruDayInfo` to style calendar
 * cells and builds per-year transfer tables either from the built-in registry
 * (`RU_YEAR_TRANSFERS`) or from a fetched isdayoff.ru status string
 * (`parseIsdayoffStatus`).
 *
 * Model:
 *  - Fixed federal holidays (ст. 112 ТК РФ) are non-working regardless of the
 *    weekday; their names come from `RU_FIXED_HOLIDAYS`.
 *  - Weekends (Sat/Sun) are non-working.
 *  - Government decrees can add extra non-working days in the middle of the
 *    week (переносы) or turn a weekend into a working day (отработанные
 *    субботы/воскресенья) — encoded per year in `RU_YEAR_TRANSFERS` (2024–2026,
 *    verified against the official постановления) or supplied by the app from
 *    the live API.
 *  - For years without any transfer data the базовое правило ст. 112 applies:
 *    a fixed holiday that falls on a Saturday or Sunday moves its day-off to
 *    the next working day.
 */

export type RuDayStatus = "work" | "off" | "holiday";

export interface RuDayInfo {
    /** Non-working for the general population (weekend, holiday or transfer). */
    isDayOff: boolean;
    status: RuDayStatus;
    /** Name of a fixed federal holiday landing on this exact date. */
    holidayName?: string;
    /** Day-off caused by a government transfer / базовое правило переноса. */
    transferred?: boolean;
}

/** Per-year day-status anomalies beyond weekends and fixed holidays. */
export interface RuYearTransfers {
    /** Extra non-working weekdays ("MM-DD") — переносы праздников. */
    extraOff: string[];
    /** Weekends turned into working days ("MM-DD"). */
    forcedWork: string[];
}

/** Federal non-working holidays (ст. 112 ТК РФ), date keys are "MM-DD". */
export const RU_FIXED_HOLIDAYS: { date: string; name: string }[] = [
    { date: "01-01", name: "Новогодние каникулы" },
    { date: "01-02", name: "Новогодние каникулы" },
    { date: "01-03", name: "Новогодние каникулы" },
    { date: "01-04", name: "Новогодние каникулы" },
    { date: "01-05", name: "Новогодние каникулы" },
    { date: "01-06", name: "Новогодние каникулы" },
    { date: "01-07", name: "Рождество Христово" },
    { date: "01-08", name: "Новогодние каникулы" },
    { date: "02-23", name: "День защитника Отечества" },
    { date: "03-08", name: "Международный женский день" },
    { date: "05-01", name: "Праздник Весны и Труда" },
    { date: "05-09", name: "День Победы" },
    { date: "06-12", name: "День России" },
    { date: "11-04", name: "День народного единства" },
];

export const RU_FIXED_HOLIDAY_MAP: ReadonlyMap<string, string> = new Map(
    RU_FIXED_HOLIDAYS.map((h) => [h.date, h.name]),
);

/**
 * Government decree transfers, verified against the official производственный
 * календарь (постановления Правительства РФ). Years absent from this registry
 * fall back to the базовое правило ст. 112 (holiday-on-weekend shifts to the
 * next working day).
 */
export const RU_YEAR_TRANSFERS: Readonly<Record<number, RuYearTransfers>> = {
    2024: {
        extraOff: [
            "01-01", "01-02", "01-03", "01-04", "01-05", "01-08",
            "02-23", "03-08", "04-29", "04-30", "05-01", "05-09", "05-10",
            "06-12", "11-04", "12-30", "12-31",
        ],
        forcedWork: ["04-27", "11-02", "12-28"],
    },
    2025: {
        extraOff: [
            "01-01", "01-02", "01-03", "01-06", "01-07", "01-08",
            "05-01", "05-02", "05-08", "05-09", "06-12", "06-13",
            "11-03", "11-04", "12-31",
        ],
        forcedWork: ["11-01"],
    },
    2026: {
        extraOff: [
            "01-01", "01-02", "01-05", "01-06", "01-07", "01-08", "01-09",
            "02-23", "03-09", "05-01", "05-11", "06-12", "11-04", "12-31",
        ],
        forcedWork: [],
    },
};

/** "MM-DD" for a month/day using leading zeroes. */
export function monthDayStr(month: number, day: number): string {
    return (
        String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0")
    );
}

/** True for Saturday (6) or Sunday (0). */
export function isWeekend(year: number, month: number, day: number): boolean {
    const dow = new Date(year, month, day).getDay();
    return dow === 0 || dow === 6;
}

/**
 * The next calendar day after `date` that is neither a weekend nor a fixed
 * federal holiday — i.e. the first настоящий working day. Used by the
 * base rule to place a transferred day-off after a holiday that landed on a
 * weekend (it would otherwise be lost), chaining through New Year holidays etc.
 */
function nextWorkingDayAfter(date: Date): Date {
    const d = new Date(date);
    do {
        d.setDate(d.getDate() + 1);
    } while (
        d.getDay() === 0 ||
        d.getDay() === 6 ||
        RU_FIXED_HOLIDAY_MAP.has(monthDayStr(d.getMonth(), d.getDate()))
    );
    return d;
}

/**
 * Hand-rolled weekday transfer lookup for the базовое правило ст. 112:
 * finds the `year`'s fixed holiday whose next working day is exactly
 * (year, month, day). Limited to the query day minus 14 days to keep scans
 * bounded.
 */
function transferredFromWeekendHoliday(
    year: number,
    month: number,
    day: number,
): boolean {
    const target = new Date(year, month, day);
    for (let i = 1; i <= 14; i++) {
        const cand = new Date(year, month, day - i);
        const candDow = cand.getDay();
        if (candDow !== 0 && candDow !== 6) continue; // only weekend holidays transfer
        const key = monthDayStr(cand.getMonth(), cand.getDate());
        if (!RU_FIXED_HOLIDAY_MAP.has(key)) continue;
        const moved = nextWorkingDayAfter(cand);
        if (
            moved.getFullYear() === target.getFullYear() &&
            moved.getMonth() === target.getMonth() &&
            moved.getDate() === target.getDate()
        ) {
            return true;
        }
    }
    return false;
}

/**
 * Day status for (year, month, day).
 * @param transfers optional per-year anomalies; when omitted or null the
 *        built-in registry (`RU_YEAR_TRANSFERS`) is consulted, and years absent
 *        from it get the базовое правило ст. 112.
 */
export function ruDayInfo(
    year: number,
    month: number,
    day: number,
    transfers?: RuYearTransfers | null,
): RuDayInfo {
    const key = monthDayStr(month, day);
    const table = transfers ?? RU_YEAR_TRANSFERS[year];
    const holidayName = RU_FIXED_HOLIDAY_MAP.get(key);
    const isHoliday = holidayName !== undefined;

    if (table && table.forcedWork.includes(key)) {
        // Explicitly made a working day despite being a weekend (перенос).
        return { isDayOff: false, status: "work" };
    }
    if (table && table.extraOff.includes(key)) {
        return {
            isDayOff: true,
            status: isHoliday ? "holiday" : "off",
            holidayName,
            transferred: !isHoliday,
        };
    }
    if (isHoliday) {
        return { isDayOff: true, status: "holiday", holidayName };
    }
    if (isWeekend(year, month, day)) {
        return { isDayOff: true, status: "off" };
    }
    if (!table && transferredFromWeekendHoliday(year, month, day)) {
        return { isDayOff: true, status: "off", transferred: true };
    }
    return { isDayOff: false, status: "work" };
}

/**
 * Convert an isdayoff.ru /api/getdata response (one char per day of the year:
 * 0=working, 1=day-off, 2=holiday, 4=shortened working) into a
 * `RuYearTransfers` table. Returns null when the payload carries no day-off
 * codes at all — the service answers all-zero strings for years it has no data
 * for, which must not be mistaken for a valid "everything worked" calendar.
 */
export function parseIsdayoffStatus(
    status: string,
    year: number,
): RuYearTransfers | null {
    const length = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
        ? 366
        : 365;
    const extraOff: string[] = [];
    const forcedWork: string[] = [];
    let sawDayOff = false;
    for (let i = 0; i < Math.min(status.length, length); i++) {
        const ch = status.charCodeAt(i);
        const isOff = ch === 0x31 /* "1" */ || ch === 0x32 /* "2" */;
        if (isOff) sawDayOff = true;
        const d = new Date(year, 0, i + 1);
        const week = d.getDay() === 0 || d.getDay() === 6;
        const key = monthDayStr(d.getMonth(), d.getDate());
        if (isOff && !week) extraOff.push(key);
        else if (!isOff && week) forcedWork.push(key);
    }
    if (!sawDayOff) return null;
    return { extraOff, forcedWork };
}