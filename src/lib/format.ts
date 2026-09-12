/**
 * Pure formatting helpers. No DOM, no chrome.* — unit-testable in Node.
 */

const _ESCAPE_MAP: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

const _ESCAPE_RE = /[&<>"']/g;

/** HTML-escape any value for safe injection into template-built markup. */
export function escapeHtml(str: unknown): string {
    return String(str).replace(_ESCAPE_RE, (ch) => _ESCAPE_MAP[ch] || ch);
}

/**
 * Clamp an integer to [min,max]; returns null if not a finite number.
 * Used to defend every numeric setting against malformed stored values.
 */
export function clampInt(v: unknown, min: number, max: number): number | null {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(max, Math.max(min, Math.round(n)));
}