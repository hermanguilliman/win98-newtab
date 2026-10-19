/**
 * Favicons: build the Google faviconV2 URL, fetch + clean the bitmap (trim
 * opaque near-white margins so boxed icons blend into the wallpaper), cache
 * the cleaned data URLs in chrome.storage.local and paint <img> elements.
 * `prepareFaviconCache()` drops the cache after a page reload - the manual
 * icon-refresh affordance (Chrome cannot tell F5 from Ctrl+F5).
 */
import { drawPageIcon } from "./icons";

/** Generate a favicon URL from bookmark URL.
 *  Google's undocumented faviconV2 endpoint rasterizes the site's best
 *  favicon (including SVG and apple-touch-icon variants, via
 *  fallback_opts=TYPE,SIZE,URL) into a PNG; 128px is requested so even SVG
 *  originals downscale crisply. The URL is size-independent — the canvas
 *  re-render in faviconDataUrl does the final downscale. */
function getFaviconUrl(url) {
    try {
        const u = new URL(url);
        return (
            "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON" +
            "&fallback_opts=TYPE,SIZE,URL&url=" +
            encodeURIComponent(u.origin) +
            "&size=128"
        );
    } catch {
        return null;
    }
}

/**
 * Fetch a favicon and re-render it with a transparent background.
 * Google's favicon service returns opaque white PNGs when the site's icon
 * is a framed/square image; we trim near-white opaque margins so the icon
 * blends into the wallpaper like a real Win98 shortcut (no white box).
 * Resolves with a data URL, rejects when the fetch/decode fails.
 * @param {string} url
 * @param {number} size
 * @returns {Promise<string>}
 */
async function faviconDataUrl(url, size) {
    const resp = await fetch(url, { mode: "cors" });
    if (!resp.ok) throw new Error("favicon HTTP " + resp.status);
    const blob = await resp.blob();
    const bmp = await createImageBitmap(blob);
    const w = bmp.width;
    const h = bmp.height;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, w, h).data;

    // Near-white opaque pixels are treated as background (a white canvas
    // the site drew around its icon). Everything else is content.
    const isBg = (i) =>
        d[i + 3] >= 248 &&
        d[i] >= 242 &&
        d[i + 1] >= 242 &&
        d[i + 2] >= 242;
    let minX = w,
        minY = h,
        maxX = -1,
        maxY = -1;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (d[i + 3] >= 24 && !isBg(i)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    // Nothing trimmed when the content already fills the canvas (or the
    // icon is entirely white — return it as-is rather than a transparent blank).
    let sx = 0,
        sy = 0,
        sw = w,
        sh = h;
    if (
        maxX >= 0 &&
        (minX > 0 || minY > 0 || maxX < w - 1 || maxY < h - 1)
    ) {
        sx = minX;
        sy = minY;
        sw = maxX - minX + 1;
        sh = maxY - minY + 1;
    }

    const out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    const octx = out.getContext("2d");
    octx.imageSmoothingEnabled = true;
    const scale = size / Math.max(sw, sh);
    const dw = sw * scale;
    const dh = sh * scale;
    octx.drawImage(
        c,
        sx,
        sy,
        sw,
        sh,
        (size - dw) / 2,
        (size - dh) / 2,
        dw,
        dh,
    );
    return out.toDataURL();
}

/* ---------- Persistent favicon cache (chrome.storage.local "faviconCache") ----------
   Cleaned favicon data URLs survive page loads, so most new tabs render icons
   instantly from storage without touching the network. The cache is keyed by the
   full favicon URL (domain + size), so an icon-size change naturally misses and
   re-fetches. A page reload (F5 / Ctrl+F5 — Chrome exposes no API to tell the
   two apart) drops the cache, force-refreshing every icon from the network. */

const FAVICON_CACHE_KEY = "faviconCache";
const FAVICON_CACHE_MAX = 800; // FIFO eviction keeps storage bounded
const faviconCacheMem = new Map(); // favUrl -> cleaned data URL
const faviconPending = new Map(); // favUrl -> in-flight Promise (dedupe)
let faviconSaveTimer = 0;

/** True when the new-tab page was (re)loaded rather than newly opened. */
function isPageReload() {
    try {
        const entries = performance.getEntriesByType("navigation");
        if (entries.length === 0) return false;
        const nav = /** @type {PerformanceNavigationTiming} */ (entries[0]);
        return nav.type === "reload";
    } catch {
        return false;
    }
}

/** Load the stored favicon cache into memory; on a page reload, drop it so
 *  this load re-fetches every icon from the network (force refresh). */
export async function prepareFaviconCache() {
    if (isPageReload()) {
        try {
            await chrome.storage.local.remove(FAVICON_CACHE_KEY);
        } catch {
            // storage unavailable — just start empty
        }
        return;
    }
    try {
        const stored = await chrome.storage.local.get(FAVICON_CACHE_KEY);
        const entries = stored[FAVICON_CACHE_KEY];
        if (entries && typeof entries === "object") {
            for (const [k, v] of Object.entries(entries)) {
                if (typeof v === "string" && v.startsWith("data:image/")) {
                    faviconCacheMem.set(k, v);
                }
            }
        }
    } catch {
        // cache starts empty on failure
    }
}

/** Debounced persist of the in-memory cache. */
function scheduleFaviconSave() {
    clearTimeout(faviconSaveTimer);
    faviconSaveTimer = setTimeout(() => {
        chrome.storage.local
            .set({ [FAVICON_CACHE_KEY]: Object.fromEntries(faviconCacheMem) })
            .catch(() => {});
    }, 400);
}

/** Cleaned data URL for a favicon URL, or null when not cached yet. */
function cachedFavicon(favUrl) {
    return faviconCacheMem.get(favUrl) || null;
}

/** Fetch + clean a favicon, memoizing the result and deduping in-flight
 *  requests (desktop + folder window + search may ask for the same one). */
function ensureFavicon(favUrl, size) {
    const inflight = faviconPending.get(favUrl);
    if (inflight) return inflight;
    const p = faviconDataUrl(favUrl, size)
        .then((clean) => {
            faviconCacheMem.set(favUrl, clean);
            if (faviconCacheMem.size > FAVICON_CACHE_MAX) {
                const oldest = faviconCacheMem.keys().next().value;
                if (oldest !== undefined) faviconCacheMem.delete(oldest);
            }
            scheduleFaviconSave();
            return clean;
        })
        .finally(() => {
            faviconPending.delete(favUrl);
        });
    faviconPending.set(favUrl, p);
    return p;
}

/** Point an <img> at a bookmark's favicon: cached clean copy when available,
 *  otherwise the raw favicon now + cleaned swap-in once fetched. */
export function setFaviconImage(img, url, size, fallbackSize) {
    const favUrl = getFaviconUrl(url);
    if (!favUrl) {
        img.src = drawPageIcon(fallbackSize || size);
        return;
    }
    const cached = cachedFavicon(favUrl);
    if (cached) {
        img.src = cached;
        return;
    }
    img.onerror = () => {
        img.src = drawPageIcon(fallbackSize || size);
    };
    img.src = favUrl;
    ensureFavicon(favUrl, size)
        .then((clean) => {
            img.src = clean;
        })
        .catch(() => {});
}
