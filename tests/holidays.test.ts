import { describe, expect, it } from "vitest";
import {
    monthDayStr,
    parseIsdayoffStatus,
    ruDayInfo,
    RU_FIXED_HOLIDAYS,
    RU_YEAR_TRANSFERS,
} from "../src/lib/holidays";

describe("monthDayStr", () => {
    it("pads month and day", () => {
        expect(monthDayStr(0, 1)).toBe("01-01");
        expect(monthDayStr(11, 31)).toBe("12-31");
        expect(monthDayStr(8, 7)).toBe("09-07");
    });
});

describe("RU_FIXED_HOLIDAYS", () => {
    it("covers all 14 federal non-working days", () => {
        const dates = RU_FIXED_HOLIDAYS.map((h) => h.date).sort();
        expect(dates).toEqual([
            "01-01", "01-02", "01-03", "01-04", "01-05", "01-06", "01-07",
            "01-08", "02-23", "03-08", "05-01", "05-09", "06-12", "11-04",
        ]);
    });

    it("names Рождество on 01-07", () => {
        const xmas = RU_FIXED_HOLIDAYS.find((h) => h.date === "01-07");
        expect(xmas?.name).toBe("Рождество Христово");
    });
});

describe("ruDayInfo — fixed holidays", () => {
    it("marks fixed holidays as day off with names", () => {
        const d = ruDayInfo(2025, 4, 9); // 2025-05-09 Friday
        expect(d.isDayOff).toBe(true);
        expect(d.status).toBe("holiday");
        expect(d.holidayName).toBe("День Победы");
    });

    it("marks weekday holidays in the registry via extraOff", () => {
        const d = ruDayInfo(2026, 5, 12); // 2026-06-12 Friday
        expect(d.isDayOff).toBe(true);
        expect(d.status).toBe("holiday");
        expect(d.holidayName).toBe("День России");
    });
});

describe("ruDayInfo — weekends", () => {
    it("marks Saturday and Sunday as day off", () => {
        expect(ruDayInfo(2026, 8, 19).isDayOff).toBe(true); // Sat 2026-09-19
        expect(ruDayInfo(2026, 8, 20).isDayOff).toBe(true); // Sun 2026-09-20
    });

    it("marks plain weekdays as work", () => {
        expect(ruDayInfo(2026, 8, 21).isDayOff).toBe(false); // Mon 2026-09-21
        expect(ruDayInfo(2026, 8, 22).isDayOff).toBe(false); // Tue 2026-09-22
    });
});

describe("ruDayInfo — known transfers 2024–2026", () => {
    it("2025: 2025-05-08 is the transfer from Feb 23 (постановление)", () => {
        const d = ruDayInfo(2025, 4, 8); // Thursday
        expect(d.isDayOff).toBe(true);
        expect(d.transferred).toBe(true);
        expect(d.status).toBe("off");
    });

    it("2025: 2025-11-01 was a forced working Saturday", () => {
        const d = ruDayInfo(2025, 10, 1);
        expect(d.isDayOff).toBe(false);
        expect(d.status).toBe("work");
    });

    it("2025: 2025-12-31 is a transfer day", () => {
        const d = ruDayInfo(2025, 11, 31);
        expect(d.isDayOff).toBe(true);
        expect(d.transferred).toBe(true);
    });

    it("2026: 2026-01-09 extends New Year holidays", () => {
        const d = ruDayInfo(2026, 0, 9); // Friday
        expect(d.isDayOff).toBe(true);
        expect(d.transferred).toBe(true);
    });

    it("2026: 2026-03-09 follows Women's Day on Sunday", () => {
        const d = ruDayInfo(2026, 2, 9); // Monday
        expect(d.isDayOff).toBe(true);
        expect(d.transferred).toBe(true);
    });

    it("2026: 2026-05-11 follows Victory Day on Saturday", () => {
        const d = ruDayInfo(2026, 4, 11); // Monday
        expect(d.isDayOff).toBe(true);
        expect(d.transferred).toBe(true);
    });

    it("2024: 2024-04-27 was a forced working Saturday", () => {
        const d = ruDayInfo(2024, 3, 27);
        expect(d.isDayOff).toBe(false);
    });

    it("2024: 2024-12-28 was a forced working Saturday", () => {
        const d = ruDayInfo(2024, 11, 28);
        expect(d.isDayOff).toBe(false);
    });

    it("registered years NEVER apply the base-rule transfer on top", () => {
        // 2025-02-24 (Monday) is a normal workday: the Sunday holiday was
        // moved to May 8 by the bylaw, not to the next day.
        const d = ruDayInfo(2025, 1, 24);
        expect(d.isDayOff).toBe(false);
        expect(d.status).toBe("work");
    });
});

describe("ruDayInfo — base rule for unregistered years (ст. 112)", () => {
    it("2027: Victory Day on Sunday moves to Monday May 10", () => {
        const sun = ruDayInfo(2027, 4, 9); // Sunday
        expect(sun.isDayOff).toBe(true);
        expect(sun.status).toBe("holiday");
        const mon = ruDayInfo(2027, 4, 10); // Monday
        expect(mon.isDayOff).toBe(true);
        expect(mon.transferred).toBe(true);
    });

    it("2027: May 1 on Saturday moves to Monday May 3", () => {
        expect(ruDayInfo(2027, 4, 1).isDayOff).toBe(true); // Sat holiday
        const mon = ruDayInfo(2027, 4, 3); // Monday
        expect(mon.isDayOff).toBe(true);
        expect(mon.transferred).toBe(true);
        expect(ruDayInfo(2027, 4, 4).isDayOff).toBe(false); // Tue work
    });

    it("2027: Russia Day on Saturday moves to Monday June 14", () => {
        const mon = ruDayInfo(2027, 5, 14); // Monday
        expect(mon.isDayOff).toBe(true);
        expect(mon.transferred).toBe(true);
    });

    it("2027: weekday holidays don't transfer", () => {
        // 2027-11-04 is Thursday
        expect(ruDayInfo(2027, 10, 4).isDayOff).toBe(true);
        // Friday Nov 5 is a plain workday
        expect(ruDayInfo(2027, 10, 5).isDayOff).toBe(false);
    });

    it("2027: chained New Year weekend holidays land on Jan 11", () => {
        // 2027-01-03 is Sunday (holiday); the nearest real working day
        // after the whole holiday block is Monday 2027-01-11.
        const d = ruDayInfo(2027, 0, 11);
        expect(d.isDayOff).toBe(true);
        expect(d.transferred).toBe(true);
    });
});

describe("ruDayInfo — explicit transfers param", () => {
    it("overrides the built-in registry", () => {
        const custom = {
            extraOff: ["05-13"],
            forcedWork: [],
        };
        // 2025-05-13 is Tuesday; made a day off by a hypothetical transfer.
        expect(ruDayInfo(2025, 4, 13, custom).isDayOff).toBe(true);
        // 2025-05-08 built-in transfer is gone under the custom table.
        expect(ruDayInfo(2025, 4, 8, custom).isDayOff).toBe(false);
    });

    it("forcedWork beats the weekend rule", () => {
        const custom = { extraOff: [], forcedWork: ["09-19"] };
        expect(ruDayInfo(2026, 8, 19, custom).isDayOff).toBe(false);
    });
});

describe("parseIsdayoffStatus", () => {
    it("returns null for all-zero payload (year not yet published)", () => {
        expect(parseIsdayoffStatus("0000000000", 2030)).toBeNull();
    });

    it("converts a status string into extraOff/forcedWork", () => {
        // Hand-build a status for 2026 where Jan 1 is a holiday, Jan 3 a
        // weekend day-off, and Jan 5 an extra weekday off (transfer).
        const len = 365;
        const buf = new Array(len).fill("0");
        // 2026-01-01 is Thursday → index 0. 2026-01-03 Sat → index 2.
        // 2026-01-04 Sun → index 3. 2026-01-05 Mon → index 4.
        buf[0] = "1";
        buf[2] = "1";
        buf[3] = "1";
        buf[4] = "1";
        const parsed = parseIsdayoffStatus(buf.join(""), 2026);
        expect(parsed).not.toBeNull();
        expect(parsed!.extraOff).toContain("01-01");
        expect(parsed!.extraOff).toContain("01-05");
        expect(parsed!.extraOff).not.toContain("01-03"); // weekend, not extra
        expect(parsed!.extraOff).not.toContain("01-04");
        expect(parsed!.forcedWork).not.toContain("01-03");
    });

    it("recognizes shortened working days (4) as working", () => {
        const len = 365;
        const buf = new Array(len).fill("0");
        // 2026-01-01 Thursday is a day off; 2026-01-05 Monday is a
        // shortened pre-holiday working day ("4").
        buf[0] = "1";
        buf[4] = "4";
        const parsed = parseIsdayoffStatus(buf.join(""), 2026);
        expect(parsed).not.toBeNull();
        expect(parsed!.extraOff).toContain("01-01");
        expect(parsed!.extraOff).not.toContain("01-05");
    });
});

describe("RU_YEAR_TRANSFERS registry sanity", () => {
    it("has no overlapping dates between extraOff and forcedWork", () => {
        for (const year of Object.keys(RU_YEAR_TRANSFERS)) {
            const t = RU_YEAR_TRANSFERS[Number(year)];
            const overlap = t.extraOff.filter((d) =>
                t.forcedWork.includes(d),
            );
            expect(overlap).toEqual([]);
        }
    });
});