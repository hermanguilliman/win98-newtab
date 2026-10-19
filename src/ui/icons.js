/**
 * Canvas icon generation: folder / page / computer / calculator icons are
 * drawn at runtime and memoized as data URLs. The folder style is read from
 * the live settings (including the settings-window preview override in
 * `state.previewFolderStyle`). Pure DOM + canvas, no chrome.*.
 */
import { shadeColor } from "../lib/theme";
import { DEFAULT_SETTINGS } from "../lib/settings";
import { state } from "../state";

/** Icon size for runtime-generated icons (settings → ICON_SIZES). */
export function currentIconSize() {
    return (
        (state.settings && state.settings.iconSize) ||
        DEFAULT_SETTINGS.iconSize
    );
}

/* Pixel-perfect recreations of the original Windows 98 folder icons
   (shell32.dll: closed gold folder 48x48 256-color, classic open folder
   32x32 with the blue document sheet). Row digits: "0" = transparent,
   otherwise 1-based index into the palette. */
const FOLDER_BITMAPS = {
    closed: {
        w: 48,
        h: 48,
        ox: 0,
        oy: 1,
        ow: 48,
        oh: 40,
        palette: [
            "#999900",
            "#000000",
            "#F8F8F8",
            "#FFFF99",
            "#CCCC66",
            "#FFCC99",
        ],
        rows: [
            "000000000000000000000000000000000000000000000000",
            "000000111111111111120000000000000000000000000000",
            "000001333333333333312000000000000000000000000000",
            "000013444444444444441200000000000000000000000000",
            "000134444444444444444120000000000000000000000000",
            "001344444444444444444412000000000000000000000000",
            "013444444444444444444441200000000000000000000000",
            "134444444444444444444444120000000000000000000000",
            "155555555555555555555555511111111111111111111200",
            "133333333333333333333333333333333333333333333320",
            "134444444444444444444444444444444444446446464612",
            "134444444444444444444444444444644646464464446412",
            "134444444444444444444444444464446444444644664612",
            "134444444444444444444444646444464464646464646412",
            "134444444444444444444444444446444446464464464612",
            "134444444444444444444444444644646464444646646412",
            "134444444444444444444646464444444446466464464612",
            "134444444444444444444444444646464644644646646412",
            "134444444444444444464444644444446464464644646612",
            "134444444444444444444464464646464446646464646412",
            "134444444444444446444444444444644664464646464612",
            "134444444444444444464646464646446446464646646612",
            "134444444444444644444444444464646464646464664612",
            "134444444444444446444646464644464646464664646412",
            "134444444444444444446444446446646446464646466612",
            "134444444444646446464464644644464664646466646412",
            "134444444444444444444446464466446446466644666612",
            "134444444444444464464644444644664664646466464612",
            "134444444464464644646446466464644646664664666612",
            "134444444444444446444464644646466464466466646412",
            "134444464446446444464644464646446646646646466612",
            "134444444644644646446446646464664466464666664612",
            "134444444444446444464464446464646664666646466612",
            "134446446446444464646464664646464646464666666612",
            "134444444444646446444646446464666466666464664612",
            "134444446464444464466464664646644664646666466612",
            "134464644444464644644646446646466646666466666612",
            "134444446464646446464464664466464666464664666612",
            "134644644446444646466464466646646466666666664612",
            "151111111111111111111111111111111111111111111112",
            "222222222222222222222222222222222222222222222220",
            "000000000000000000000000000000000000000000000000",
            "000000000000000000000000000000000000000000000000",
            "000000000000000000000000000000000000000000000000",
            "000000000000000000000000000000000000000000000000",
            "000000000000000000000000000000000000000000000000",
            "000000000000000000000000000000000000000000000000",
            "000000000000000000000000000000000000000000000000",
        ],
    },
    open: {
        w: 32,
        h: 32,
        ox: 1,
        oy: 1,
        ow: 30,
        oh: 29,
        palette: [
            "#999900",
            "#CCCC66",
            "#000000",
            "#F8F8F8",
            "#FFFF99",
            "#999900",
            "#0000FF",
            "#000080",
        ],
        rows: [
            "00000000000000000000000000000000",
            "00000000000000010000000000000000",
            "00000000000000123000000000000000",
            "00000000000001442300000000000000",
            "00000011111114444230000000000000",
            "00000144444144444423000000000000",
            "00001425251444444442300000000000",
            "00014252514444444444231111110000",
            "00014525144444444444423444443000",
            "00014251444444444444442325256300",
            "00014514444444444444444232526300",
            "00014144444444444444444423256300",
            "01122222222222222222222222326300",
            "14444444444444444444444443236300",
            "12525252525252525252525251323300",
            "15252525252525257775252521342300",
            "12525252525257777257525252344230",
            "15252525252885777825252525314423",
            "01525252528657887782525252134230",
            "01252525286578253778252525132300",
            "01525252565777777778525252533300",
            "01252525628778888888252525236300",
            "00125252668771525252525252513300",
            "00152525673877113778252525213300",
            "00125252675337777882525252523300",
            "00152525272573333525252525253300",
            "00015252527752525252525252526300",
            "00012525252525252525252525256300",
            "00016666666666666666666666666300",
            "00003333333333333333333333333000",
            "00000000000000000000000000000000",
            "00000000000000000000000000000000",
        ],
    },
};

/** Render a bitmap folder icon, keeping pixel-art crispness at any size */
function drawFolderBitmap(map, size) {
    const sprite = document.createElement("canvas");
    sprite.width = map.w;
    sprite.height = map.h;
    const sctx = sprite.getContext("2d");
    for (let y = 0; y < map.h; y++) {
        const row = map.rows[y];
        for (let x = 0; x < map.w; x++) {
            const ix = row.charCodeAt(x) - 48;
            if (ix > 0) {
                sctx.fillStyle = map.palette[ix - 1];
                sctx.fillRect(x, y, 1, 1);
            }
        }
    }
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const scale = size / Math.max(map.ow, map.oh);
    const dw = map.ow * scale;
    const dh = map.oh * scale;
    ctx.drawImage(
        sprite,
        map.ox,
        map.oy,
        map.ow,
        map.oh,
        (size - dw) / 2,
        (size - dh) / 2,
        dw,
        dh,
    );
    return c.toDataURL();
}

/** Memoization caches for generated icon data URLs (pure per parameters).
    Cleared whenever an icon-affecting setting changes. */
const _iconCache = {
    folder: new Map(),
    page: new Map(),
    computer: new Map(),
    calc: new Map(),
};
export function _clearIconCache() {
    _iconCache.folder.clear();
    _iconCache.page.clear();
    _iconCache.computer.clear();
    _iconCache.calc.clear();
}

export function drawFolderIcon(
    color = "#d4c044",
    open = false,
    size = currentIconSize(),
    style = folderIconStyleName(),
) {
    const key = `${color}|${open ? 1 : 0}|${size}|${style}`;
    const cached = _iconCache.folder.get(key);
    if (cached !== undefined) return cached;
    const dataUrl = _drawFolderIcon(color, open, size, style);
    _iconCache.folder.set(key, dataUrl);
    return dataUrl;
}

function _drawFolderIcon(
    color,
    open,
    size,
    style,
) {
    if (style === "classic") {
        // Authentic Win98 folder bitmap (gold closed / open with document)
        return drawFolderBitmap(
            open ? FOLDER_BITMAPS.open : FOLDER_BITMAPS.closed,
            size,
        );
    }
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const k = size / 32;
    const r = (x, y, w, h) => ctx.fillRect(x * k, y * k, w * k, h * k);

    const light = shadeColor(color, 30);
    const dark = shadeColor(color, -45);

    const outlineRect = (x, y, w, h) => {
        ctx.strokeStyle = shadeColor(color, -55);
        ctx.lineWidth = Math.max(1, k);
        ctx.strokeRect(
            (x + 0.5) * k,
            (y + 0.5) * k,
            (w - 1) * k,
            (h - 1) * k,
        );
    };

    if (open) {
        // Back flap
        ctx.fillStyle = dark;
        r(2, 8, 28, 22);
        // Tab
        ctx.fillStyle = color;
        r(2, 6, 14, 5);
        // Front
        ctx.fillStyle = color;
        r(2, 10, 28, 20);
        // Highlight
        ctx.fillStyle = light;
        r(4, 12, 24, 2);
        // Shadow
        ctx.fillStyle = shadeColor(color, -40);
        r(4, 28, 24, 2);
        r(28, 12, 2, 18);
    } else {
        // Tab
        ctx.fillStyle = color;
        r(2, 4, 14, 5);
        // Back
        ctx.fillStyle = dark;
        r(2, 8, 28, 22);
        // Front (glossy gets a vertical gradient)
        if (style === "glossy") {
            const grad = ctx.createLinearGradient(0, 9 * k, 0, 30 * k);
            grad.addColorStop(0, shadeColor(color, 20));
            grad.addColorStop(0.55, color);
            grad.addColorStop(1, shadeColor(color, -30));
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = color;
        }
        r(2, 9, 28, 21);
        // Highlight
        ctx.fillStyle = light;
        r(4, 10, 24, 2);
        // Inner shadow
        ctx.fillStyle = shadeColor(color, -20);
        r(4, 28, 24, 2);
        r(28, 11, 2, 19);
    }

    if (style === "glossy") {
        // Diagonal shine stripe across the front
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.moveTo(5 * k, 11 * k);
        ctx.lineTo(14 * k, 11 * k);
        ctx.lineTo(9 * k, 19 * k);
        ctx.lineTo(5 * k, 19 * k);
        ctx.closePath();
        ctx.fill();
    } else if (style === "outlined") {
        // Crisp dark outline around every part of the folder
        if (open) {
            outlineRect(2, 6, 14, 5);
            outlineRect(2, 8, 28, 22);
            outlineRect(2, 10, 28, 20);
        } else {
            outlineRect(2, 4, 14, 5);
            outlineRect(2, 8, 28, 22);
            outlineRect(2, 9, 28, 21);
        }
    }

    return c.toDataURL();
}

/** Draw a generic webpage icon */
export function drawPageIcon(size = currentIconSize()) {
    const key = `page|${size}`;
    const cached = _iconCache.page.get(key);
    if (cached !== undefined) return cached;
    const dataUrl = _drawPageIcon(size);
    _iconCache.page.set(key, dataUrl);
    return dataUrl;
}

function _drawPageIcon(size) {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const k = size / 32;
    const r = (x, y, w, h) => ctx.fillRect(x * k, y * k, w * k, h * k);

    // Page background
    ctx.fillStyle = "#ffffff";
    r(4, 2, 22, 28);
    // Page border
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = Math.max(1, k);
    ctx.strokeRect(4.5 * k, 2.5 * k, 21 * k, 27 * k);
    // Corner fold
    ctx.fillStyle = "#c0c0c0";
    ctx.beginPath();
    ctx.moveTo(20 * k, 2 * k);
    ctx.lineTo(26 * k, 8 * k);
    ctx.lineTo(20 * k, 8 * k);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(20 * k, 2 * k);
    ctx.lineTo(20 * k, 8 * k);
    ctx.lineTo(26 * k, 8 * k);
    ctx.stroke();
    // Text lines
    ctx.fillStyle = "#000000";
    for (let i = 0; i < 4; i++) {
        const w = i === 3 ? 12 : 16;
        r(7, 12 + i * 4, w, 1.5);
    }

    return c.toDataURL();
}

/** Draw a Win98-style computer (monitor + stand + keyboard) */
export function drawComputerIcon(size = currentIconSize()) {
    const key = `computer|${size}`;
    const cached = _iconCache.computer.get(key);
    if (cached !== undefined) return cached;
    const dataUrl = _drawComputerIcon(size);
    _iconCache.computer.set(key, dataUrl);
    return dataUrl;
}

function _drawComputerIcon(size) {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const k = size / 32;
    const r = (x, y, w, h) => ctx.fillRect(x * k, y * k, w * k, h * k);

    // Monitor outline
    ctx.fillStyle = "#000000";
    r(4, 3, 24, 18);
    // Beige face
    ctx.fillStyle = "#d9c69a";
    r(5, 4, 22, 16);
    // Screen bezel
    ctx.fillStyle = "#000000";
    r(7, 6, 18, 12);
    // Teal screen (like the Win98 desktop)
    ctx.fillStyle = "#008080";
    r(8, 7, 16, 10);
    // A little window on the screen
    ctx.fillStyle = "#FFFFFF";
    r(10, 8, 12, 6);
    ctx.fillStyle = "#000080";
    r(10, 8, 12, 2);
    ctx.fillRect(21 * k, 8 * k, 1 * k, 2 * k);

    // Stand
    ctx.fillStyle = "#000000";
    r(15, 21, 3, 3);
    ctx.fillStyle = "#e8e8e8";
    r(15, 21, 1, 3);
    // Base
    ctx.fillStyle = "#000000";
    r(12, 23, 8, 2);
    ctx.fillStyle = "#9c8c60";
    r(13, 24, 6, 1);
    // Keyboard
    ctx.fillStyle = "#000000";
    r(3, 26, 26, 3);
    ctx.fillStyle = "#808080";
    r(4, 27, 9, 1);
    r(15, 27, 12, 1);

    return c.toDataURL();
}

/** Generate a calculator icon (gray body, LCD, key grid) on canvas */
export function drawCalcIcon(size = currentIconSize()) {
    const key = `calc|${size}`;
    const cached = _iconCache.calc.get(key);
    if (cached !== undefined) return cached;
    const dataUrl = _drawCalcIcon(size);
    _iconCache.calc.set(key, dataUrl);
    return dataUrl;
}

function _drawCalcIcon(size) {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const k = size / 32;
    const r = (x, y, w, h) => ctx.fillRect(x * k, y * k, w * k, h * k);

    // Body outline
    ctx.fillStyle = "#000000";
    r(3, 2, 26, 28);
    // Silver face
    ctx.fillStyle = "#c0c0c0";
    r(4, 3, 24, 26);
    ctx.fillStyle = "#ffffff";
    r(4, 3, 24, 1);
    r(4, 3, 1, 26);
    ctx.fillStyle = "#848484";
    r(27, 3, 1, 26);
    r(4, 28, 24, 1);

    // Display (green LCD)
    ctx.fillStyle = "#6a8c96";
    r(6, 4, 20, 6);
    ctx.fillStyle = "#cde3e8";
    r(7, 5, 18, 4);

    // Key grid: 6 rows × 4 columns
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 4; col++) {
            const bx = 5 + col * 6;
            const by = 12 + row * 3;
            ctx.fillStyle = "#808080";
            ctx.fillRect(bx * k, by * k, 5 * k, 2 * k);
            ctx.fillRect((bx + 1) * k, (by + 1) * k, 4 * k, 1 * k);
            ctx.fillStyle = "#e8e8e8";
            ctx.fillRect(bx * k, by * k, 5 * k, 1 * k);
            ctx.fillRect(bx * k, by * k, 1 * k, 2 * k);
            ctx.fillStyle = "#a0a0a0";
            ctx.fillRect(bx * k, (by + 1) * k, 3 * k, 1 * k);
        }
    }

    return c.toDataURL();
}

/** Currently active folder icon style id */
function folderIconStyleName() {
    return (
        state.previewFolderStyle ||
        (state.settings && state.settings.folderIconStyle) ||
        DEFAULT_SETTINGS.folderIconStyle
    );
}
