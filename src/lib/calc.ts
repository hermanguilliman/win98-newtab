/**
 * Pure calculator arithmetic. No DOM, no chrome.* — unit-testable in Node.
 */

/** Binary arithmetic used by the calculator; `null` for division by zero or unknown ops. */
export function evalOp(a: number, b: number, op: string): number | null {
    switch (op) {
        case "+":
            return a + b;
        case "-":
            return a - b;
        case "*":
            return a * b;
        case "/":
            return b === 0 ? null : a / b;
    }
    return null;
}