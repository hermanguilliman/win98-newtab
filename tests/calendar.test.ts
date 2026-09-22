import { describe, expect, it } from "vitest";
import {
    addMonths,
    formatDayTitle,
    monthCells,
    monthTitle,
    todayInMonth,
} from "../src/lib/calendar";

describe("addMonths", () => {
    it("shifts forward within a year", () => {
        expect(addMonths(2026, 4, 1)).toEqual({ year: 2026, month: 5 });
        expect(addMonths(2026, 4, 3)).toEqual({ year: 2026, month: 7 });
    });

    it("wraps across year boundaries", () => {
        expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
        expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
        expect(addMonths(2026, 2, -3)).toEqual({ year: 2025, month: 11 });
    });

    it("handles multi-year jumps", () => {
        expect(addMonths(2026, 6, 24)).toEqual({ year: 2028, month: 6 });
        expect(addMonths(2026, 6, -24)).toEqual({ year: 2024, month: 6 });
    });
});

describe("monthTitle", () => {
    it("renders the Russian long month + year", () => {
        expect(monthTitle(2026, 8)).toBe("сентябрь 2026 г.");
        expect(monthTitle(2026, 0)).toBe("январь 2026 г.");
    });
});

describe("formatDayTitle", () => {
    it("renders weekday, day, month and year in Russian", () => {
        // 2026-09-13 is a Sunday.
        expect(formatDayTitle(2026, 8, 13)).toBe(
            "воскресенье, 13 сентября 2026 г.",
        );
        expect(formatDayTitle(2026, 8, 22)).toBe(
            "вторник, 22 сентября 2026 г.",
        );
    });
});

describe("monthCells", () => {
    it("is Monday-first: September 2026 starts on a Tuesday (1 null cell)", () => {
        // 2026-09-01 is a Tuesday; getDay() = 2 → offset (2+6)%7 = 1
        expect(monthCells(2026, 8)[0]).toBeNull();
        expect(monthCells(2026, 8)[1]).toBe(1);
        expect(monthCells(2026, 8)).toHaveLength(1 + 30); // Sep has 30 days
        expect(monthCells(2026, 8).at(-1)).toBe(30);
    });

    it("February 2024 (leap) has 29 days", () => {
        const cells = monthCells(2024, 1);
        // 2024-02-01 is a Thursday → 3 leading blanks + 29 days
        const days = cells.filter((c) => c !== null);
        expect(days).toHaveLength(29);
        expect(cells).toHaveLength(32);
        expect(days.at(-1)).toBe(29);
    });

    it("January 2026 starts on a Thursday (3 null cells)", () => {
        // 2026-01-01 is a Thursday; getDay()=4 → offset (4+6)%7 = 3
        const cells = monthCells(2026, 0);
        expect(cells.slice(0, 3)).toEqual([null, null, null]);
        expect(cells[3]).toBe(1);
        expect(cells.filter((c) => c !== null)).toHaveLength(31);
    });

    it("always starts with the 1st after the leading blanks", () => {
        for (const [y, m] of [[2026, 0], [2026, 8], [2025, 11], [2024, 1]] as const) {
            const cells = monthCells(y, m);
            const firstDay = cells.find((c) => c === 1);
            expect(firstDay).toBe(1);
            // the 1st sits right after the leading blank run
            expect(cells.indexOf(1)).toBe(cells.findIndex((c) => c !== null));
        }
    });
});

describe("todayInMonth", () => {
    it("returns the day when now is in the given month", () => {
        expect(todayInMonth(2026, 8, new Date(2026, 8, 13))).toBe(13);
    });

    it("returns null for other months/years", () => {
        expect(todayInMonth(2026, 7, new Date(2026, 8, 13))).toBeNull();
        expect(todayInMonth(2027, 8, new Date(2026, 8, 13))).toBeNull();
    });
});