/**
 * User-data storage: settings and calendar events follow the user across
 * devices via chrome.storage.sync, with chrome.storage.local as the legacy
 * source (one-way migration on first read) and as the overflow fallback
 * when a payload exceeds the sync quota (8 KB per item) - data is never lost.
 */

/* ---------- User-data storage (chrome.storage.sync first) ----------
   Settings and calendar events are user data that should follow the user
   across devices → they live in chrome.storage.sync. Bulk caches that are
   rebuildable or too large for the sync quota (faviconCache, isdayoffRaw,
   weather) stay in chrome.storage.local — see their own sections. */

/**
 * Read a user-data key preferring chrome.storage.sync; falls back to a
 * legacy copy still sitting in chrome.storage.local (one-way migration —
 * the local value is lifted up to sync on first hit). Returns undefined
 * when neither store has the key.
 * @param {string} key
 */
export async function syncStoredGet(key) {
    try {
        const fromSync = await chrome.storage.sync.get(key);
        if (fromSync && fromSync[key] !== undefined) return fromSync[key];
    } catch {}
    try {
        const fromLocal = await chrome.storage.local.get(key);
        if (fromLocal && fromLocal[key] !== undefined) {
            chrome.storage.sync.set({ [key]: fromLocal[key] }).catch(() => {});
            return fromLocal[key];
        }
    } catch {}
    return undefined;
}

/** Write a user-data key to chrome.storage.sync. If the payload exceeds
 *  the sync quota (8 KB per item) or the rate limit, the data is kept in
 *  chrome.storage.local instead so it is never lost — syncStoredGet()
 *  still finds it there on the next load. */
export function syncStoredSet(key, value) {
    const payload = { [key]: value };
    return chrome.storage.sync.set(payload).catch(() =>
        chrome.storage.local.set(payload).catch(() => {}),
    );
}
