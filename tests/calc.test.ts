import { describe, expect, it } from "vitest";
import { evalOp } from "../src/lib/calc";

describe("evalOp", () => {
    it("adds", () => {
        expect(evalOp(2, 3, "+")).toBe(5);
    });

    it("subtracts", () => {
        expect(evalOp(5, 2, "-")).toBe(3);
    });

    it("multiplies", () => {
        expect(evalOp(4, 3, "*")).toBe(12);
    });

    it("divides", () => {
        expect(evalOp(10, 4, "/")).toBe(2.5);
    });

    it("dividing by zero returns null", () => {
        expect(evalOp(10, 0, "/")).toBeNull();
        expect(evalOp(-10, 0, "/")).toBeNull();
    });

    it("unknown operator returns null", () => {
        expect(evalOp(1, 2, "%")).toBeNull();
        expect(evalOp(1, 2, "")).toBeNull();
    });
});