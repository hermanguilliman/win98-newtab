import { describe, expect, it } from "vitest";
import { clampInt, escapeHtml, formatDateTime } from "../src/lib/format";

describe("escapeHtml", () => {
    it("escapes all five special characters", () => {
        expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
            "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
        );
    });

    it("coerces non-strings", () => {
        expect(escapeHtml(42)).toBe("42");
        expect(escapeHtml(null)).toBe("null");
    });

    it("leaves plain text untouched", () => {
        expect(escapeHtml("Москва → Париж 2026")).toBe("Москва → Париж 2026");
    });
});

describe("clampInt", () => {
    it("clamps to the range", () => {
        expect(clampInt(5, 9, 18)).toBe(9);
        expect(clampInt(99, 9, 18)).toBe(18);
        expect(clampInt(12, 9, 18)).toBe(12);
    });

    it("rounds", () => {
        expect(clampInt(10.6, 9, 18)).toBe(11);
        expect(clampInt(9.4, 9, 18)).toBe(9);
    });

    it("returns null for non-finite input", () => {
        expect(clampInt("abc", 0, 10)).toBeNull();
        expect(clampInt(undefined, 0, 10)).toBeNull();
        expect(clampInt(NaN, 0, 10)).toBeNull();
        expect(clampInt(Infinity, 0, 10)).toBeNull();
    });
});

describe("formatDateTime", () => {
    it("formats ru-RU with date and time", () => {
        const out = formatDateTime(new Date(2026, 8, 13, 14, 5)); // 13.09.2026 14:05
        expect(out).toMatch(/сентября/);
        expect(out).toMatch(/2026/);
        expect(out).toMatch(/14:05/);
    });

    it("accepts numeric timestamps", () => {
        const out = formatDateTime(new Date(2026, 8, 13, 9, 0).getTime());
        expect(out).toMatch(/09:00/);
    });

    it("renders Invalid Date for unparseable input (matches previous in-app behavior)", () => {
        expect(formatDateTime("not-a-date")).toBe("Invalid Date");
    });
});