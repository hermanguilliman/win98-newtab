import { describe, expect, it } from "vitest";
import {
    compareEvents,
    eventColorIndex,
    eventCoversDay,
    eventsInMonth,
    eventsOnDay,
    formatDateStr,
    formatEventRange,
    formatEventTime,
    formatInputDate,
    formatInputTime,
    makeEventId,
    normalizeEvent,
    normalizeTime,
    parseDateStr,
    sortEvents,
    toDateStr,
} from "../src/lib/calendarEvents";
import type { CalendarEvent } from "../src/lib/calendarEvents";

const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({
    id: "e1",
    title: "Событие",
    startDate: "2026-09-13",
    endDate: "2026-09-13",
    allDay: false,
    startTime: "09:00",
    endTime: "",
    note: "",
    ...p,
});

describe("parseDateStr / toDateStr", () => {
    it("round-trips a valid date", () => {
        expect(parseDateStr("2026-09-13")).toEqual({ y: 2026, m: 8, d: 13 });
        expect(toDateStr(2026, 8, 13)).toBe("2026-09-13");
    });

    it("rejects malformed/impossible dates", () => {
        expect(parseDateStr("13.09.2026")).toBeNull();
        expect(parseDateStr("2026-13-01")).toBeNull();
        expect(parseDateStr("2026-09-32")).toBeNull();
        expect(parseDateStr("2026-02-30")).toBeNull();
        expect(parseDateStr("nope")).toBeNull();
    });
});

describe("normalizeTime", () => {
    it("accepts and pads valid HH:MM", () => {
        expect(normalizeTime("9:05")).toBe("09:05");
        expect(normalizeTime("23:59")).toBe("23:59");
    });

    it("clears invalid values", () => {
        expect(normalizeTime("24:00")).toBe("");
        expect(normalizeTime("12:60")).toBe("");
        expect(normalizeTime("abc")).toBe("");
        expect(normalizeTime("")).toBe("");
    });
});

describe("normalizeEvent", () => {
    it("fills defaults, accepts minimal input", () => {
        const e = normalizeEvent({
            id: "x",
            title: "  Встреча  ",
            startDate: "2026-09-13",
        });
        expect(e).toEqual({
            id: "x",
            title: "Встреча",
            startDate: "2026-09-13",
            endDate: "2026-09-13",
            allDay: false,
            startTime: "",
            endTime: "",
            note: "",
        });
    });

    it("requires a title and an id", () => {
        expect(normalizeEvent({ id: "x", title: " ", startDate: "2026-09-13" })).toBeNull();
        expect(normalizeEvent({ title: "x", startDate: "2026-09-13" })).toBeNull();
        expect(normalizeEvent({ id: "x", title: "x", startDate: "bad" })).toBeNull();
    });

    it("clamps reversed ranges to a single day", () => {
        const e = normalizeEvent({
            id: "x",
            title: "Разворот",
            startDate: "2026-09-20",
            endDate: "2026-09-13",
        });
        expect(e?.endDate).toBe("2026-09-20");
    });

    it("keeps all-day events time-less", () => {
        const e = normalizeEvent({
            id: "x",
            title: "Отпуск",
            startDate: "2026-07-01",
            endDate: "2026-07-14",
            allDay: true,
            startTime: "09:00",
            endTime: "18:00",
        });
        expect(e?.startTime).toBe("");
        expect(e?.endTime).toBe("");
        expect(e?.allDay).toBe(true);
    });
});

describe("eventCoversDay / eventsInMonth / eventsOnDay", () => {
    const multi = ev({ id: "m", title: "Командировка", startDate: "2026-09-10", endDate: "2026-09-15", allDay: true });

    it("covers [start, end] inclusively", () => {
        expect(eventCoversDay(multi, 2026, 8, 10)).toBe(true);
        expect(eventCoversDay(multi, 2026, 8, 12)).toBe(true);
        expect(eventCoversDay(multi, 2026, 8, 15)).toBe(true);
        expect(eventCoversDay(multi, 2026, 8, 9)).toBe(false);
        expect(eventCoversDay(multi, 2026, 8, 16)).toBe(false);
    });

    it("finds events intersecting a month", () => {
        const list = [multi, ev({ id: "a", title: "Вне месяца", startDate: "2027-01-01", endDate: "2027-01-02", allDay: true })];
        const found = eventsInMonth(list, 2026, 8);
        expect(found.map((x) => x.id)).toEqual(["m"]);
    });

    it("finds a multi-day event entering from the previous month", () => {
        const crossing = ev({ id: "c", title: "Пограничный", startDate: "2026-08-30", endDate: "2026-09-02", allDay: true });
        expect(eventsInMonth([crossing], 2026, 8).map((x) => x.id)).toEqual(["c"]);
    });

    it("returns day events sorted all-day first, then by time", () => {
        const list = [
            ev({ id: "t", title: "Таймслот", startTime: "14:30" }),
            ev({ id: "ad", title: "Весь день", allDay: true, startDate: "2026-09-13", endDate: "2026-09-13", startTime: "", endTime: "" }),
            ev({ id: "early", title: "Раннее", startTime: "08:00" }),
        ];
        const ids = eventsOnDay(list, 2026, 8, 13).map((x) => x.id);
        expect(ids).toEqual(["ad", "early", "t"]);
    });
});

describe("compareEvents / sortEvents", () => {
    it("orders all-day before timed and by start time", () => {
        const a = ev({ id: "a", title: "A", allDay: true, startTime: "", endTime: "" });
        const b = ev({ id: "b", title: "B", startTime: "10:00" });
        const c = ev({ id: "c", title: "C", startTime: "09:00" });
        expect(compareEvents(c, a)).toBeGreaterThan(0);
        expect(sortEvents([a, c, b]).map((x) => x.id)).toEqual(["a", "c", "b"]);
    });
});

describe("display formatting", () => {
    it("formats dates, times and ranges", () => {
        expect(formatDateStr("2026-09-13")).toBe("13.09.2026");
        expect(formatEventTime(ev({ allDay: true }))).toBe("весь день");
        expect(formatEventTime(ev({ startTime: "", endTime: "" }))).toBe("—");
        expect(formatEventTime(ev({ startTime: "09:00" }))).toBe("09:00");
        expect(formatEventTime(ev({ startTime: "09:00", endTime: "11:30" }))).toBe("09:00–11:30");
        expect(formatEventRange(ev({ startDate: "2026-09-13", endDate: "2026-09-13" }))).toBe("13.09.2026");
        expect(formatEventRange(ev({ startDate: "2026-09-13", endDate: "2026-09-15" }))).toBe("13.09.2026 – 15.09.2026");
    });

    it("input formats for native date/time pickers", () => {
        expect(formatInputDate(new Date(2026, 8, 13))).toBe("2026-09-13");
        expect(formatInputTime(new Date(2026, 8, 13, 9, 5))).toBe("09:05");
    });
});

describe("eventColorIndex / makeEventId", () => {
    it("is deterministic and bounded", () => {
        const e = ev({ id: "some-id" });
        expect(eventColorIndex(e, 5)).toBe(eventColorIndex(e, 5));
        expect(eventColorIndex(e, 5)).toBeGreaterThanOrEqual(0);
        expect(eventColorIndex(e, 5)).toBeLessThan(5);
    });

    it("generates unique ids", () => {
        expect(makeEventId()).not.toBe(makeEventId());
    });
});