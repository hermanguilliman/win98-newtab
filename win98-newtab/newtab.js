/* ============================================================
   Win98 Bookmarks Desktop — newtab.js
   Chrome Extension that replaces new tab with Win98 desktop
   showing all bookmarks as desktop icons & folders.
   ============================================================ */

(() => {
    "use strict";

    /* ---------- State ---------- */
    const state = {
        windows: [],
        windowIdCounter: 0,
        zCounter: 100,
        activeWindowId: null,
        startMenuOpen: false,
        dragState: null,
        resizeState: null,
        settings: null,
        treeRoot: null,
        bookmarksRefreshTimer: 0,
        searchNodes: [],
        selectedDesktopEl: null,
        weatherData: null,
    };

    /* ---------- Default settings ---------- */
    const DEFAULT_SETTINGS = {
        clickMode: "double",
        iconSize: 32,
        labelSize: 11,
        iconGap: 4,
        desktopPadX: 8,
        desktopPadY: 8,
        folderIconStyle: "classic",
        weatherCity: "Москва",
        showClockDate: true,
        showClockWeekday: true,
        iconLabelShadow: true,
        folderViewMode: "icons",
        wallpaper: {
            type: "color",
            color: "#008080",
            imageData: null,
            imageStyle: "tile",
        },
    };

    /** Allowed icon sizes */
    const ICON_SIZES = [24, 32, 48];

    /* ---------- DOM Refs ---------- */
    const $desktop = document.getElementById("desktop");
    const $desktopIcons = document.getElementById("desktop-icons");
    const $windowsContainer = document.getElementById("windows-container");
    const $taskbarWindows = document.getElementById("taskbar-windows");
    const $startBtn = document.getElementById("start-btn");
    const $startMenu = document.getElementById("start-menu");
    const $clock = document.getElementById("clock");
    const $weather = document.getElementById("weather");
    const $menuAllBookmarks = document.getElementById("menu-all-bookmarks");

    /* ============================================================
     ICON GENERATION (Canvas → DataURL)
     ============================================================ */

    /** Draw a folder icon in the given style: "classic" (flat), "glossy" (gradient + shine) or "outlined" (dark contour) */
    function currentIconSize() {
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

    function drawFolderIcon(
        color = "#d4c044",
        open = false,
        size = currentIconSize(),
        style = folderIconStyleName(),
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

    /** Draw a shortcut overlay arrow */
    function drawShortcutArrow() {
        const c = document.createElement("canvas");
        c.width = 32;
        c.height = 32;
        const ctx = c.getContext("2d");

        // White square background for arrow
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(16, 14, 14, 14);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.strokeRect(16.5, 14.5, 13, 13);

        // Arrow
        ctx.fillStyle = "#000080";
        // Arrow body
        ctx.fillRect(19, 20, 8, 2);
        // Arrow head
        ctx.beginPath();
        ctx.moveTo(25, 17);
        ctx.lineTo(29, 21);
        ctx.lineTo(25, 23);
        ctx.closePath();
        ctx.fill();

        return c.toDataURL();
    }

    /** Draw a generic webpage icon */
    function drawPageIcon(size = currentIconSize()) {
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
    function drawComputerIcon(size = currentIconSize()) {
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

    /** Generate a favicon URL from bookmark URL */
    function getFaviconUrl(url) {
        try {
            const u = new URL(url);
            return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=${currentIconSize()}`;
        } catch {
            return null;
        }
    }

    /** Color palette for folders */
    const FOLDER_COLORS = [
        "#d4c044",
        "#c8a032",
        "#a0c844",
        "#64a0c8",
        "#c86464",
        "#64c864",
        "#c89644",
        "#9664c8",
        "#c864a0",
    ];

    /** Folder icon appearance styles (selectable in Настройки → Вид) */
    const FOLDER_STYLES = [
        { id: "classic", label: "Классические" },
        { id: "glossy", label: "Объёмные" },
        { id: "outlined", label: "С контуром" },
    ];

    /** Live-preview override while the settings window is open (cleared on OK/Отмена) */
    let previewFolderStyle = null;

    /** Live-preview override for the folder window view mode (icons / list) */
    let previewFolderViewMode = null;

    /** Currently active folder icon style id */
    function folderIconStyleName() {
        return (
            previewFolderStyle ||
            (state.settings && state.settings.folderIconStyle) ||
            DEFAULT_SETTINGS.folderIconStyle
        );
    }

    function shadeColor(color, percent) {
        let R = parseInt(color.substring(1, 3), 16);
        let G = parseInt(color.substring(3, 5), 16);
        let B = parseInt(color.substring(5, 7), 16);
        R = Math.min(255, Math.max(0, R + Math.round((R * percent) / 100)));
        G = Math.min(255, Math.max(0, G + Math.round((G * percent) / 100)));
        B = Math.min(255, Math.max(0, B + Math.round((B * percent) / 100)));
        return `#${R.toString(16).padStart(2, "0")}${G.toString(16).padStart(2, "0")}${B.toString(16).padStart(2, "0")}`;
    }

    /* ============================================================
     CLOCK
     ============================================================ */
    function updateClock(src) {
        const s = src || state.settings || DEFAULT_SETTINGS;
        const now = new Date();
        const h = now.getHours().toString().padStart(2, "0");
        const m = now.getMinutes().toString().padStart(2, "0");
        const parts = [];
        if (s.showClockWeekday) {
            const wd = now.toLocaleDateString("ru-RU", { weekday: "short" });
            parts.push(wd.endsWith(".") ? wd : wd + ".");
        }
        if (s.showClockDate) {
            const d = now.getDate().toString().padStart(2, "0");
            const mo = (now.getMonth() + 1).toString().padStart(2, "0");
            parts.push(`${d}.${mo}.${now.getFullYear()}`);
        }
        parts.push(`${h}:${m}`);
        $clock.textContent = parts.join(" ");
    }

    /* ============================================================
     WEATHER (Open-Meteo, no API key)
     ============================================================ */

    /** Map WMO weather code → emoji icon */
    function weatherIcon(code) {
        if (code === 0) return "☀️";
        if (code === 1) return "🌤️";
        if (code === 2) return "⛅";
        if (code === 3) return "☁️";
        if (code === 45 || code === 48) return "🌫️";
        if (code >= 51 && code <= 67) return "🌧️";
        if (code >= 71 && code <= 77) return "❄️";
        if (code >= 80 && code <= 82) return "🌦️";
        if (code === 85 || code === 86) return "🌨️";
        if (code >= 95) return "⛈️";
        return "🌡️";
    }

    function hideWeather() {
        $weather.classList.remove("visible");
        $weather.replaceChildren();
    }

    function renderWeather(temp, code) {
        const icon = document.createElement("span");
        icon.className = "weather-icon";
        icon.textContent = weatherIcon(code);
        const tempEl = document.createElement("span");
        tempEl.className = "weather-temp";
        tempEl.textContent = `${Math.round(temp)}°`;
        $weather.replaceChildren(icon, tempEl);
        $weather.classList.add("visible");
    }

    /** Map wind bearing (deg) → Russian compass direction */
    function windDirName(deg) {
        const dirs = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"];
        return dirs[Math.round(((deg % 360) / 45)) % 8];
    }

    function weatherCityName() {
        return (
            (state.settings && state.settings.weatherCity) ||
            DEFAULT_SETTINGS.weatherCity
        );
    }

    /** Render the weather emoji as a transparent 32×32 PNG (for the window icon) */
    function weatherEmojiDataUrl(code) {
        try {
            const c = document.createElement("canvas");
            c.width = 32;
            c.height = 32;
            const ctx = c.getContext("2d");
            ctx.font = "24px 'Segoe UI Emoji', 'Noto Color Emoji', serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(weatherIcon(code), 16, 18);
            return c.toDataURL();
        } catch {
            return "icons/search.svg";
        }
    }

    function saveWeatherCache(city, data) {
        const payload = { city, ts: Date.now(), ...data };
        return chrome.storage.local.set({ weather: payload }).catch(() => {});
    }

    async function refreshWeather(city) {
        const currentCity =
            city ||
            (state.settings && state.settings.weatherCity) ||
            DEFAULT_SETTINGS.weatherCity;
        try {
            // Resolve city → coordinates
            const geoResp = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(currentCity)}&count=1&language=ru&format=json`,
                { mode: "cors" },
            );
            const geo = await geoResp.json();
            const hit = geo && geo.results && geo.results[0];
            if (!hit) {
                hideWeather();
                return;
            }
            // Current weather (full set of fields for the details window)
            const wxResp = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}&current=temperature_2m,weather_code,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,cloud_cover`,
                { mode: "cors" },
            );
            const wx = await wxResp.json();
            if (!wx || !wx.current) {
                hideWeather();
                return;
            }
            const cur = wx.current;
            state.weatherData = {
                city: currentCity,
                temp: cur.temperature_2m,
                code: cur.weather_code,
                feelsLike: cur.apparent_temperature,
                humidity: cur.relative_humidity_2m,
                precipitation: cur.precipitation,
                windSpeed: cur.wind_speed_10m,
                windDirection: cur.wind_direction_10m,
                cloudCover: cur.cloud_cover,
                updated: new Date().toLocaleTimeString("ru-RU"),
            };
            renderWeather(cur.temperature_2m, cur.weather_code);
            saveWeatherCache(currentCity, state.weatherData);
            renderOpenWeatherWindow();
        } catch {
            // Offline or blocked — keep showing cached value if any, else nothing
        }
    }

    /** Read the stored settings + weather cache in parallel (used at startup so
     *  the tray renders the cached value without waiting on anything else) */
    async function readCityAndCache() {
        let city =
            (state.settings && state.settings.weatherCity) ||
            DEFAULT_SETTINGS.weatherCity;
        let cache = {};
        try {
            const [settings, stored] = await Promise.all([
                chrome.storage.local.get("settings"),
                chrome.storage.local.get("weather"),
            ]);
            if (settings.settings && settings.settings.weatherCity) {
                city = settings.settings.weatherCity;
            }
            cache = stored || {};
        } catch {
            // keep defaults on failure
        }
        return { city, cache };
    }

    async function updateWeather() {
        const { city, cache } = await readCityAndCache();
        // Always show the last saved value immediately (if it matches the
        // current city) so the tray never flicks/clears on load — then refresh
        // in the background so the stale value is replaced as soon as the
        // network responds. If there is no cache for this city yet, fall back
        // to the remote value with nothing shown in the meantime.
        if (cache && typeof cache.temp === "number" && cache.city === city) {
            state.weatherData = cache;
            renderWeather(cache.temp, cache.code);
        } else {
            state.weatherData = null;
            hideWeather();
        }
        refreshWeather(city);
    }

    /** Re-render the open weather details window (no-op if it is closed) */
    function renderOpenWeatherWindow() {
        const win = state.windows.find((w) => w.winType === "weather");
        if (win) renderWeatherWindow(win);
    }

    /** Fill the weather details window content from state.weatherData */
    function renderWeatherWindow(winData) {
        const el = winData.el;
        const ce = el.querySelector(".win98-window-content");
        const d = state.weatherData;
        ce.replaceChildren();

        const wrap = document.createElement("div");
        wrap.className = "weather-details";

        // Hero panel
        const hero = document.createElement("div");
        hero.className = "weather-hero";
        const icon = document.createElement("span");
        icon.className = "weather-hero-icon";
        icon.textContent = d ? weatherIcon(d.code) : "🌡️";
        const heroInfo = document.createElement("div");
        heroInfo.className = "weather-hero-info";
        const heroTemp = document.createElement("div");
        heroTemp.className = "weather-hero-temp";
        heroTemp.textContent = d ? `${Math.round(d.temp)}°` : "—";
        const heroCity = document.createElement("div");
        heroCity.className = "weather-hero-city";
        heroCity.textContent = d && d.city ? d.city : weatherCityName();
        heroInfo.append(heroTemp, heroCity);
        hero.append(icon, heroInfo);
        wrap.appendChild(hero);

        // Details group box
        const box = document.createElement("div");
        box.className = "win98-groupbox";
        const legend = document.createElement("span");
        legend.className = "win98-groupbox-legend";
        legend.textContent = "Подробнее";
        box.appendChild(legend);

        const rows = [
            [
                "Ощущается как",
                d && d.feelsLike != null ? `${Math.round(d.feelsLike)}°` : "—",
            ],
            [
                "Влажность",
                d && d.humidity != null ? `${Math.round(d.humidity)}%` : "—",
            ],
            [
                "Осадки",
                d && d.precipitation != null
                    ? `${d.precipitation} мм`
                    : "—",
            ],
            [
                "Ветер",
                d && d.windSpeed != null
                    ? `${Math.round(d.windSpeed)} км/ч${
                          d.windDirection != null
                              ? ", " + windDirName(d.windDirection)
                              : ""
                      }`
                    : "—",
            ],
            [
                "Облачность",
                d && d.cloudCover != null ? `${d.cloudCover}%` : "—",
            ],
        ];
        rows.forEach(([label, value]) => {
            const row = document.createElement("div");
            row.className = "weather-stat-row";
            const l = document.createElement("span");
            l.className = "weather-stat-label";
            l.textContent = label;
            const v = document.createElement("span");
            v.className = "weather-stat-value";
            v.textContent = value;
            row.append(l, v);
            box.appendChild(row);
        });
        wrap.appendChild(box);
        ce.appendChild(wrap);

        // Status bar
        const sb = el.querySelector(".win98-statusbar-field");
        if (sb) {
            sb.textContent = d && d.updated
                ? `Обновлено: ${d.updated}`
                : "Загрузка данных...";
        }
    }

    /** Open the single-instance weather details window */
    function openWeatherWindow() {
        const existing = state.windows.find((w) => w.winType === "weather");
        if (existing) {
            if (existing.minimized) restoreWindow(existing.id);
            else bringToFront(existing.id);
            return;
        }
        createWindow({
            winType: "weather",
            title: "Погода",
            icon: state.weatherData
                ? weatherEmojiDataUrl(state.weatherData.code)
                : "icons/search.svg",
            width: 360,
            height: 290,
            content: "",
            statusbar: true,
            statusText: "Загрузка данных...",
            onCreated: (el, winData) => {
                el.querySelector(".win98-window-content").style.background =
                    "var(--win98-silver)";
                renderWeatherWindow(winData);
            },
        });
        if (!state.weatherData) refreshWeather();
    }

    // Tray weather: hint + double-click opens the details window
    $weather.title = "Двойное нажатие — подробная информация о погоде";
    $weather.addEventListener("dblclick", () => openWeatherWindow());

    /* ============================================================
     WINDOW MANAGEMENT
     ============================================================ */

    function createWindow(opts) {
        const id = ++state.windowIdCounter;
        const w = opts.width || 500;
        const h = opts.height || 400;
        // Windows appear centered on the desktop; each new window is nudged
        // down-right by 28px so stacked windows stay distinguishable.
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const freeX = Math.max(0, vw - w);
        const freeY = Math.max(0, vh - h);
        const x =
            opts.x ??
            Math.max(0, Math.min(freeX, Math.round(vw / 2 - w / 2 + (state.windows.length % 6) * 28)));
        const y =
            opts.y ??
            Math.max(0, Math.min(freeY, Math.round(vh / 2 - h / 2 + (state.windows.length % 6) * 28)));

        const winData = {
            id,
            title: opts.title || "Window",
            icon: opts.icon || drawPageIcon(),
            x,
            y,
            w,
            h,
            minimized: false,
            maximized: false,
            prevBounds: null,
            winType: opts.winType || null,
            bookmarkId: opts.bookmarkId || null,
        };

        // Build DOM
        const el = document.createElement("div");
        el.className = "win98-window";
        el.id = `win-${id}`;
        el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${++state.zCounter};`;

        el.innerHTML = `
      <div class="win98-titlebar" data-win-id="${id}">
        <img class="win98-titlebar-icon" src="${opts.icon || drawPageIcon()}" alt="">
        <span class="win98-titlebar-text">${escapeHtml(opts.title || "")}</span>
        <div class="win98-titlebar-buttons">
          <button class="win98-titlebar-btn" data-action="minimize" title="Свернуть">_</button>
          <button class="win98-titlebar-btn" data-action="maximize" title="Развернуть">□</button>
          <button class="win98-titlebar-btn" data-action="close" title="Закрыть">✕</button>
        </div>
      </div>
      ${opts.toolbar ? `<div class="win98-toolbar">${opts.toolbar}</div>` : ""}
      ${opts.addressbar ? `<div class="win98-addressbar"><label>Адрес:</label><input class="win98-addressbar-input" type="text" value="${escapeHtml(opts.addressbarValue || "")}" readonly></div>` : ""}
      <div class="win98-window-content">${opts.content || ""}</div>
      ${opts.statusbar !== false ? `<div class="win98-statusbar"><div class="win98-statusbar-field">${escapeHtml(opts.statusText || "")}</div></div>` : ""}
      <div class="win98-resize-handle"></div>
    `;

        $windowsContainer.appendChild(el);

        winData.el = el;
        state.windows.push(winData);

        // Title bar events
        const titlebar = el.querySelector(".win98-titlebar");
        titlebar.addEventListener("mousedown", (e) => {
            if (e.target.closest(".win98-titlebar-btn")) return;
            bringToFront(id);
            startDrag(e, winData);
        });
        titlebar.addEventListener("dblclick", (e) => {
            if (e.target.closest(".win98-titlebar-btn")) return;
            toggleMaximize(id);
        });

        // Title bar buttons
        el.querySelector('[data-action="minimize"]').addEventListener(
            "click",
            () => minimizeWindow(id),
        );
        el.querySelector('[data-action="maximize"]').addEventListener(
            "click",
            () => toggleMaximize(id),
        );
        el.querySelector('[data-action="close"]').addEventListener(
            "click",
            () => closeWindow(id),
        );

        // Resize handle
        const resizeHandle = el.querySelector(".win98-resize-handle");
        resizeHandle.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            bringToFront(id);
            startResize(e, winData);
        });

        // Click to focus
        el.addEventListener("mousedown", () => bringToFront(id));

        // Taskbar button
        const tbBtn = document.createElement("button");
        tbBtn.className = "taskbar-win-btn win98-btn active";
        tbBtn.id = `tb-${id}`;
        tbBtn.innerHTML = `<img src="${opts.icon || drawPageIcon()}" alt=""><span>${escapeHtml(opts.title || "")}</span>`;
        tbBtn.addEventListener("click", () => {
            if (winData.minimized) {
                restoreWindow(id);
            } else if (state.activeWindowId === id) {
                minimizeWindow(id);
            } else {
                bringToFront(id);
            }
        });
        $taskbarWindows.appendChild(tbBtn);

        bringToFront(id);

        if (opts.onCreated) opts.onCreated(el, winData);

        return winData;
    }

    function bringToFront(id) {
        if (state.activeWindowId === id) return;
        state.activeWindowId = id;
        const winData = state.windows.find((w) => w.id === id);
        if (!winData) return;

        winData.el.style.zIndex = ++state.zCounter;

        // Update titlebar active state
        state.windows.forEach((w) => {
            const tb = w.el.querySelector(".win98-titlebar");
            if (w.id === id) {
                tb.classList.remove("inactive");
            } else {
                tb.classList.add("inactive");
            }
        });

        // Update taskbar active
        document
            .querySelectorAll(".taskbar-win-btn")
            .forEach((b) => b.classList.remove("active"));
        const tbBtn = document.getElementById(`tb-${id}`);
        if (tbBtn) tbBtn.classList.add("active");
    }

    function minimizeWindow(id) {
        const winData = state.windows.find((w) => w.id === id);
        if (!winData) return;
        winData.minimized = true;
        winData.el.style.display = "none";
        if (state.activeWindowId === id) {
            state.activeWindowId = null;
            // Focus next visible
            const visible = state.windows.filter((w) => !w.minimized);
            if (visible.length) bringToFront(visible[visible.length - 1].id);
        }
        updateTaskbarButtons();
    }

    function restoreWindow(id) {
        const winData = state.windows.find((w) => w.id === id);
        if (!winData) return;
        winData.minimized = false;
        winData.el.style.display = "";
        bringToFront(id);
        updateTaskbarButtons();
    }

    function toggleMaximize(id) {
        const winData = state.windows.find((w) => w.id === id);
        if (!winData) return;

        if (winData.maximized) {
            // Restore
            winData.maximized = false;
            const b = winData.prevBounds;
            winData.el.style.left = b.x + "px";
            winData.el.style.top = b.y + "px";
            winData.el.style.width = b.w + "px";
            winData.el.style.height = b.h + "px";
            winData.el.classList.remove("maximized");
        } else {
            // Maximize
            winData.prevBounds = {
                x: parseInt(winData.el.style.left),
                y: parseInt(winData.el.style.top),
                w: parseInt(winData.el.style.width),
                h: parseInt(winData.el.style.height),
            };
            winData.el.classList.add("maximized");
            winData.maximized = true;
        }
    }

    function closeWindow(id) {
        const idx = state.windows.findIndex((w) => w.id === id);
        if (idx === -1) return;
        const winData = state.windows[idx];
        winData.el.remove();
        state.windows.splice(idx, 1);

        const tbBtn = document.getElementById(`tb-${id}`);
        if (tbBtn) tbBtn.remove();

        if (state.activeWindowId === id) {
            state.activeWindowId = null;
            const visible = state.windows.filter((w) => !w.minimized);
            if (visible.length) bringToFront(visible[visible.length - 1].id);
        }
    }

    function updateTaskbarButtons() {
        state.windows.forEach((w) => {
            const tbBtn = document.getElementById(`tb-${w.id}`);
            if (tbBtn) {
                if (w.id === state.activeWindowId && !w.minimized) {
                    tbBtn.classList.add("active");
                } else {
                    tbBtn.classList.remove("active");
                }
            }
        });
    }

    /* ============================================================
     DRAG & RESIZE
     ============================================================ */

    function startDrag(e, winData) {
        if (winData.maximized) return;
        const rect = winData.el.getBoundingClientRect();
        state.dragState = {
            winData,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
        };
        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
    }

    function onDragMove(e) {
        const d = state.dragState;
        if (!d) return;
        const x = e.clientX - d.offsetX;
        const y = e.clientY - d.offsetY;
        d.winData.el.style.left = x + "px";
        d.winData.el.style.top = Math.max(0, y) + "px";
    }

    function onDragEnd() {
        state.dragState = null;
        document.removeEventListener("mousemove", onDragMove);
        document.removeEventListener("mouseup", onDragEnd);
    }

    function startResize(e, winData) {
        if (winData.maximized) return;
        state.resizeState = {
            winData,
            startX: e.clientX,
            startY: e.clientY,
            startW: parseInt(winData.el.style.width),
            startH: parseInt(winData.el.style.height),
        };
        document.addEventListener("mousemove", onResizeMove);
        document.addEventListener("mouseup", onResizeEnd);
    }

    function onResizeMove(e) {
        const r = state.resizeState;
        if (!r) return;
        const newW = Math.max(200, r.startW + (e.clientX - r.startX));
        const newH = Math.max(120, r.startH + (e.clientY - r.startY));
        r.winData.el.style.width = newW + "px";
        r.winData.el.style.height = newH + "px";
    }

    function onResizeEnd() {
        state.resizeState = null;
        document.removeEventListener("mousemove", onResizeMove);
        document.removeEventListener("mouseup", onResizeEnd);
    }

    /* ============================================================
     BOOKMARKS LOADING
     ============================================================ */

    async function loadBookmarks() {
        let tree;
        try {
            const result = await chrome.bookmarks.getTree();
            tree = result[0];
        } catch (err) {
            showEmptyState(
                "Не удалось загрузить закладки. Проверьте права расширения.",
            );
            return;
        }

        state.treeRoot = tree;
        renderBookmarks(tree);
    }

    /** Render the desktop icons from a bookmarks tree (used on init and on live refresh) */
    function renderBookmarks(tree) {
        $desktopIcons.innerHTML = "";
        const emptyMsg = document.querySelector(".empty-desktop-msg");
        if (emptyMsg) emptyMsg.remove();

        const children = tree ? tree.children || [] : [];
        // Chrome root IDs are always: 1=Bar, 2=Other, 3=Mobile
        const ROOT_ORDER = { 1: 0, 2: 1, 3: 2 };
        const roots = children
            .filter((n) => n.children && n.children.length > 0)
            .sort(
                (a, b) => (ROOT_ORDER[a.id] ?? 99) - (ROOT_ORDER[b.id] ?? 99),
            );

        if (roots.length === 0 && countAllBookmarks(tree) === 0) {
            showEmptyState(
                "Нет закладок. Добавьте закладки в Chrome и они появятся здесь.",
            );
            return;
        }

        renderDesktopIcons(roots);
    }

    function countAllBookmarks(node) {
        let count = 0;
        if (node.url) count++;
        if (node.children) {
            for (const child of node.children) {
                count += countAllBookmarks(child);
            }
        }
        return count;
    }

    function showEmptyState(msg) {
        const el = document.createElement("div");
        el.className = "empty-desktop-msg";
        el.textContent = msg;
        $desktop.appendChild(el);
    }

    /** Folder nodes have a children array (possibly empty); bookmarks have a URL. Chrome
      separator nodes (url: "" without children) must never be rendered as folders. */
    function isFolderNode(n) {
        return !!n && !n.url && Array.isArray(n.children);
    }
    function isBookmarkNode(n) {
        return !!n && !!n.url;
    }
    /** Anything that should appear on the desktop / in folder windows */
    function isVisibleNode(n) {
        return isFolderNode(n) || isBookmarkNode(n);
    }

    /** Recursively find a node in the cached tree by id */
    function findNodeById(node, id) {
        if (!node) return null;
        if (node.id === id) return node;
        if (node.children) {
            for (const child of node.children) {
                const hit = findNodeById(child, id);
                if (hit) return hit;
            }
        }
        return null;
    }

    const EMPTY_FOLDER_HTML =
        '<div style="padding:20px;color:#808080;font-size:11px;">Папка пуста</div>';

    /* ============================================================
     DESKTOP ICONS RENDERING
     ============================================================ */

    let colorIdx = 0;

    function renderDesktopIcons(roots) {
        $desktopIcons.innerHTML = "";
        colorIdx = 0;

        roots.forEach((root, rootIdx) => {
            if (rootIdx > 0) {
                // Force next group onto a new row
                const sep = document.createElement("div");
                sep.className = "desktop-row-separator";
                $desktopIcons.appendChild(sep);
            }
            const items = root.children || [];
            for (const item of items) {
                if (!isVisibleNode(item)) continue;
                const icon = createDesktopIcon(item);
                $desktopIcons.appendChild(icon);
            }
        });
    }

    function createDesktopIcon(node) {
        const div = document.createElement("div");
        div.className = "desktop-icon";

        const isFolder = isFolderNode(node);

        // Create icon image
        const img = document.createElement("img");
        img.draggable = false;

        if (isFolder) {
            img.src = drawFolderIcon(
                FOLDER_COLORS[colorIdx % FOLDER_COLORS.length],
            );
            colorIdx++;
        } else {
            // Try favicon, fallback to page icon
            const favUrl = getFaviconUrl(node.url);
            if (favUrl) {
                img.src = favUrl;
                img.onerror = () => {
                    img.src = drawPageIcon();
                };
            } else {
                img.src = drawPageIcon();
            }
        }

        const label = document.createElement("div");
        label.className = "desktop-icon-label";
        label.textContent = node.title || node.url || "Без названия";

        div.appendChild(img);
        div.appendChild(label);

        // Click / Double-click → mode-dependent open
        div.addEventListener("click", (e) => {
            e.stopPropagation();
            if (isSingleClickMode()) {
                const prev = Number(div.dataset.lastClick || 0);
                const now = Date.now();
                div.dataset.lastClick = now;
                if (now - prev < 350) return; // part of a double-click
                openNode(node);
            } else {
                selectDesktopIcon(div);
            }
        });

        div.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            if (!isSingleClickMode()) {
                openNode(node);
            }
        });

        // Middle mouse button → open bookmark in a background tab
        div.addEventListener("auxclick", (e) => handleAuxClick(e, node));

        // Right-click context menu
        div.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectDesktopIcon(div);
            showContextMenu(
                e.clientX,
                e.clientY,
                buildNodeContextMenuItems(node),
            );
        });

        div._node = node;
        return div;
    }

    function selectDesktopIcon(el) {
        document
            .querySelectorAll(".desktop-icon.selected")
            .forEach((d) => d.classList.remove("selected"));
        if (!el) return;
        el.classList.add("selected");
        state.selectedDesktopEl = el;
    }

    /** Open a bookmark node (URL → navigate, folder → window) */
    function openNode(node) {
        if (node.url) {
            window.location.href = node.url;
        } else {
            openFolderWindow(node);
        }
    }

    /** Open a bookmark URL in a new background tab (middle-click) */
    function openInBackgroundTab(url) {
        chrome.tabs.create({ url, active: false });
    }

    /** Middle-click (auxclick, button=1) → background tab; folders are ignored */
    function handleAuxClick(e, node) {
        if (e.button !== 1) return;
        e.preventDefault();
        e.stopPropagation();
        if (node && node.url) openInBackgroundTab(node.url);
    }

    /** Current click mode from settings */
    function isSingleClickMode() {
        return state.settings && state.settings.clickMode === "single";
    }

    /* ============================================================
     FOLDER WINDOW
     ============================================================ */

    /* Sentinel id for the synthetic «Все закладки» top-level listing */
    const ALL_ROOT_ID = "__root__";

    /** Build the synthetic top-level node that lists the Chrome root folders */
    function buildAllBookmarksNode(tree) {
        return {
            id: ALL_ROOT_ID,
            title: "Все закладки",
            children: ((tree && tree.children) || []).filter(isVisibleNode),
        };
    }

    /** Re-resolve a nav target against the live tree (synthetic root is always rebuilt fresh) */
    function resolveNavNode(node, tree) {
        const t = tree || state.treeRoot;
        if (!node) return null;
        if (node.id === ALL_ROOT_ID) return buildAllBookmarksNode(t);
        return findNodeById(t, node.id) || null;
    }

    /** Current folder-window view mode: "icons" grid or "list" rows */
    function currentFolderViewMode() {
        return (
            previewFolderViewMode ||
            (state.settings && state.settings.folderViewMode) ||
            "icons"
        );
    }

    /** Set the folder-window view mode globally, persist it and re-render open windows */
    function setFolderViewMode(mode) {
        if (mode !== "icons" && mode !== "list") return;
        state.settings = {
            ...(state.settings || DEFAULT_SETTINGS),
            folderViewMode: mode,
        };
        previewFolderViewMode = null;
        saveSettings();
        applyFolderViewModeToWindows(mode);
    }

    /** Apply the view-mode class + toolbar label to every open folder window */
    function applyFolderViewModeToWindows(mode) {
        state.windows.forEach((w) => {
            if (!w.el) return;
            const fc = w.el.querySelector(".folder-content");
            if (fc) fc.classList.toggle("folder-view-list", mode === "list");
            const viewBtn = w.el.querySelector('[data-nav="view"]');
            if (viewBtn) {
                const target = mode === "list" ? "Значки" : "Список";
                const sp = viewBtn.querySelector("span");
                if (sp) sp.textContent = "Вид: " + target;
            }
        });
    }

    /**
     * Render the children of `node` into an already-open folder window and keep
     * the title / addressbar / statusbar / nav buttons in sync.
     */
    function renderFolderContent(winData, node) {
        const el = winData.el;
        if (!el) return;
        // The window may be created with empty content — ensure the folder container exists
        let fc = el.querySelector(".folder-content");
        if (!fc) {
            const contentEl = el.querySelector(".win98-window-content");
            if (!contentEl) return;
            fc = document.createElement("div");
            fc.className = "folder-content";
            contentEl.appendChild(fc);
        }

        const items = (node.children || []).filter(isVisibleNode);
        fc.innerHTML = "";
        const viewMode = currentFolderViewMode();
        fc.classList.toggle("folder-view-list", viewMode === "list");
        // Toolbar view toggle shows the mode it will switch to
        const viewBtn = el.querySelector('[data-nav="view"]');
        if (viewBtn) {
            const target = viewMode === "list" ? "Значки" : "Список";
            const sp = viewBtn.querySelector("span");
            if (sp) sp.textContent = "Вид: " + target;
            viewBtn.title =
                target === "Список"
                    ? "Переключить в режим «Список»"
                    : "Переключить в режим «Значки»";
        }
        if (items.length === 0) {
            fc.innerHTML = EMPTY_FOLDER_HTML;
        } else {
            for (const item of items) {
                fc.appendChild(
                    createFolderItem(item, node, {
                        // Folders inside a window navigate the SAME window instead of opening a new one
                        navigateTo: isFolderNode(item)
                            ? (n) => navigateInWindow(winData, n)
                            : undefined,
                    }),
                );
            }
        }

        const titleEl = el.querySelector(".win98-titlebar-text");
        if (titleEl) titleEl.textContent = node.title || "Папка";
        const tbBtn = document.getElementById(`tb-${winData.id}`);
        if (tbBtn) {
            const tbSpan = tbBtn.querySelector("span");
            if (tbSpan) tbSpan.textContent = node.title || "Папка";
        }
        const ab = el.querySelector(".win98-addressbar-input");
        if (ab) ab.value = getNodePath(node);
        const sf = el.querySelector(".win98-statusbar-field");
        if (sf) {
            const folders = items.filter(isFolderNode).length;
            const bookmarks = items.filter(isBookmarkNode).length;
            sf.textContent =
                node.id === ALL_ROOT_ID
                    ? `Корневых папок: ${folders}`
                    : `${folders} пап(ок), ${bookmarks} элемент(ов)`;
        }
    }

    /** Navigate an open folder window to another folder (same window, no new window) */
    function navigateInWindow(winData, node, opts) {
        opts = opts || {};
        if (!winData || !node) return;
        if (!opts.fromHistory) {
            // Save the current folder so «Назад» can return to it
            winData.navStack.push(winData.currentNode || null);
        }
        const target = opts.fromHistory ? node : resolveNavNode(node) || node;
        winData.currentNode = target;
        winData.bookmarkId = target.id;
        renderFolderContent(winData, target);
        updateNavButtons(winData);
    }

    function goBack(winData) {
        const prev = winData.navStack.pop();
        if (!prev) return;
        const target = resolveNavNode(prev);
        if (target) navigateInWindow(winData, target, { fromHistory: true });
    }

    function goUp(winData) {
        const cur = winData.currentNode;
        if (!cur) return;
        if (cur.id === ALL_ROOT_ID) return; // top level — button is disabled anyway
        if (cur.parentId && cur.parentId !== "0") {
            const parent = resolveNavNode({ id: cur.parentId });
            if (parent) {
                navigateInWindow(winData, parent);
                return;
            }
        }
        // Chrome root folder (parentId "0") → up to the «Все закладки» listing
        navigateInWindow(winData, buildAllBookmarksNode(state.treeRoot));
    }

    /** «Назад» disabled without history; «Вверх» disabled at the top level (no previous level) */
    function updateNavButtons(winData) {
        const el = winData.el;
        if (!el) return;
        const back = el.querySelector('[data-nav="back"]');
        if (back) back.disabled = winData.navStack.length === 0;
        const up = el.querySelector('[data-nav="up"]');
        if (up) {
            const cur = winData.currentNode;
            up.disabled = !cur || cur.id === ALL_ROOT_ID;
        }
    }

    function openFolderWindow(node) {
        const folderIcon = drawFolderIcon(
            FOLDER_COLORS[colorIdx % FOLDER_COLORS.length],
            true,
        );

        const toolbarHtml = `
      <button class="win98-toolbar-btn" data-nav="back" disabled>
        <span>← Назад</span>
      </button>
      <button class="win98-toolbar-btn" data-nav="up" disabled>
        <span>⬆ Вверх</span>
      </button>
      <button class="win98-toolbar-btn" data-nav="view">
        <span>Вид: Список</span>
      </button>
    `;

        createWindow({
            title: node.title || "Папка",
            icon: folderIcon,
            bookmarkId: node.id,
            width: 550,
            height: 400,
            toolbar: toolbarHtml,
            addressbar: true,
            addressbarValue: getNodePath(node),
            content: "",
            statusbar: true,
            statusText: "",
            onCreated: (el, winData) => {
                // Folder windows browse the tree with history in a single window
                winData.currentNode = node;
                winData.navStack = [];
                renderFolderContent(winData, node);
                updateNavButtons(winData);

                el.querySelector('[data-nav="back"]')?.addEventListener(
                    "click",
                    () => goBack(winData),
                );
                el.querySelector('[data-nav="up"]')?.addEventListener(
                    "click",
                    () => goUp(winData),
                );
                el.querySelector('[data-nav="view"]')?.addEventListener(
                    "click",
                    () =>
                        setFolderViewMode(
                            currentFolderViewMode() === "list"
                                ? "icons"
                                : "list",
                        ),
                );
            },
        });
    }

    function createFolderItem(node, parentNode, options) {
        options = options || {};
        const div = document.createElement("div");
        div.className = "folder-item";
        div.dataset.bookmarkId = String(node.id || "");

        const isFolder = isFolderNode(node);
        const img = document.createElement("img");
        img.draggable = false;

        if (isFolder) {
            img.src = drawFolderIcon(
                FOLDER_COLORS[colorIdx % FOLDER_COLORS.length],
            );
            colorIdx++;
        } else {
            const favUrl = getFaviconUrl(node.url);
            if (favUrl) {
                img.src = favUrl;
                img.onerror = () => {
                    img.src = drawPageIcon();
                };
            } else {
                img.src = drawPageIcon();
            }
        }

        const label = document.createElement("div");
        label.className = "folder-item-label";
        label.textContent = node.title || node.url || "Без названия";

        div.appendChild(img);
        div.appendChild(label);

        // Open a bookmark normally; a folder either navigates the current window
        // (folder windows / «Все закладки») or opens a new one (desktop, search)
        const openItem = () => {
            if (
                isFolderNode(node) &&
                typeof options.navigateTo === "function"
            ) {
                options.navigateTo(node);
            } else {
                openNode(node);
            }
        };

        div.addEventListener("click", (e) => {
            e.stopPropagation();
            if (isSingleClickMode()) {
                const prev = Number(div.dataset.lastClick || 0);
                const now = Date.now();
                div.dataset.lastClick = now;
                if (now - prev < 350) return; // part of a double-click
                openItem();
            } else {
                document
                    .querySelectorAll(".folder-item.selected")
                    .forEach((d) => d.classList.remove("selected"));
                div.classList.add("selected");
            }
        });

        div.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            if (!isSingleClickMode()) {
                openItem();
            }
        });

        // Middle mouse button → open bookmark in a background tab
        div.addEventListener("auxclick", (e) => handleAuxClick(e, node));

        div.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            document
                .querySelectorAll(".folder-item.selected")
                .forEach((d) => d.classList.remove("selected"));
            div.classList.add("selected");
            showContextMenu(
                e.clientX,
                e.clientY,
                buildNodeContextMenuItems(node),
            );
        });

        div._node = node;
        return div;
    }

    function getNodePath(node) {
        // Build the full path from the cached tree: root > … > parent > node
        const parts = [];
        let cur = node;
        while (cur && cur.title) {
            parts.unshift(cur.title);
            if (!cur.parentId || cur.parentId === "0") break;
            const parent = findNodeById(state.treeRoot, cur.parentId);
            if (!parent) break;
            cur = parent;
        }
        return parts.join(" > ") || "/";
    }

    /* ============================================================
     NODE OPERATIONS (open variants, copy, rename, delete)
     ============================================================ */

    function copyText(text) {
        if (!text) return;
        try {
            navigator.clipboard.writeText(text);
        } catch {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
        }
    }

    function createTab(url, active) {
        if (!url) return Promise.resolve();
        return chrome.tabs.create({ url, active });
    }

    function openInNewWindow(url, incognito) {
        if (!url) return;
        chrome.windows.create({ url, incognito: !!incognito }).catch(() => {});
    }

    /** Build the right-click menu items for a bookmark or folder node */
    function buildNodeContextMenuItems(node) {
        if (!node) return [];
        if (isBookmarkNode(node)) {
            return [
                { label: "Открыть", action: () => openNode(node) },
                {
                    label: "Открыть в новой вкладке",
                    action: () => createTab(node.url, true),
                },
                {
                    label: "Открыть в фоновой вкладке",
                    action: () => createTab(node.url, false),
                },
                {
                    label: "Открыть в новом окне",
                    action: () => openInNewWindow(node.url, false),
                },
                {
                    label: "Открыть в режиме инкогнито",
                    action: () => openInNewWindow(node.url, true),
                },
                { type: "separator" },
                { label: "Копировать адрес", action: () => copyText(node.url) },
                { type: "separator" },
                { label: "Переименовать", action: () => renameNode(node) },
                { label: "Удалить", action: () => deleteNode(node) },
            ];
        }
        return [
            { label: "Открыть", action: () => openNode(node) },
            { type: "separator" },
            { label: "Переименовать", action: () => renameNode(node) },
            { label: "Удалить", action: () => deleteNode(node) },
        ];
    }

    function renameNode(node) {
        openPromptDialog(
            "Переименовать",
            "Новое имя:",
            node.title || "",
            (newName) => {
                if (newName && newName !== node.title) {
                    chrome.bookmarks
                        .update(node.id, { title: newName })
                        .catch(() => {});
                }
            },
        );
    }

    function deleteNode(node) {
        const folder = isFolderNode(node);
        openConfirmDialog(
            folder ? "Удалить папку" : "Удалить закладку",
            folder
                ? `Удалить папку «${node.title}» вместе со всем содержимым?`
                : `Удалить закладку «${node.title}»?`,
            () => {
                if (folder)
                    chrome.bookmarks.removeTree(node.id).catch(() => {});
                else chrome.bookmarks.remove(node.id).catch(() => {});
            },
        );
    }

    /* ============================================================
     WIN98 DIALOGS (prompt / confirm as child windows)
     ============================================================ */

    function openDialog(opts) {
        const body = document.createElement("div");
        body.className = "win98-dialog";
        if (opts.body instanceof HTMLElement) body.appendChild(opts.body);
        else body.innerHTML = typeof opts.body === "string" ? opts.body : "";

        const btnRow = document.createElement("div");
        btnRow.className = "win98-dialog-buttons";
        const buttons = opts.buttons || [{ label: "OK", onClick: null }];

        const winData = createWindow({
            title: opts.title || "",
            icon: opts.icon || "icons/settings.svg",
            width: opts.width || 340,
            height: opts.height || 140,
            content: "",
            statusbar: false,
            onCreated: (el) => {
                const ce = el.querySelector(".win98-window-content");
                ce.style.background = "var(--win98-silver)";
                ce.appendChild(body);
                buttons.forEach((b, i) => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "win98-btn";
                    btn.textContent = b.label;
                    btn.addEventListener("click", () => {
                        if (b.onClick) b.onClick();
                        if (b.close !== false) closeWindow(winData.id);
                    });
                    btnRow.appendChild(btn);
                    if (i === 0) body.okButton = btn;
                });
                body.appendChild(btnRow);
            },
        });
        return winData;
    }

    function openConfirmDialog(title, message, onConfirm) {
        const body = document.createElement("div");
        body.className = "win98-dialog";
        const txt = document.createElement("div");
        txt.className = "win98-dialog-text";
        txt.textContent = message;
        body.appendChild(txt);
        openDialog({
            title,
            body,
            buttons: [{ label: "OK", onClick: onConfirm }, { label: "Отмена" }],
        });
    }

    /** Classic Win98 system message box: icon + text, centered OK button */
    function openMessageBox(title, message, icon) {
        const body = document.createElement("div");
        body.className = "win98-dialog win98-msgbox";
        const main = document.createElement("div");
        main.className = "win98-msgbox-main";
        const msgIcon = document.createElement("img");
        msgIcon.className = "win98-msgbox-icon";
        msgIcon.src = icon || drawComputerIcon(32);
        msgIcon.alt = "";
        const txt = document.createElement("div");
        txt.className = "win98-dialog-text";
        txt.textContent = message;
        main.append(msgIcon, txt);
        body.appendChild(main);
        return openDialog({
            title,
            icon: icon || drawComputerIcon(16),
            width: 270,
            height: 168,
            body,
            buttons: [{ label: "OK" }],
        });
    }

    function openPromptDialog(title, labelText, initialValue, onSubmit) {
        const body = document.createElement("div");
        body.className = "win98-dialog";
        const lbl = document.createElement("div");
        lbl.className = "win98-dialog-label";
        lbl.textContent = labelText;
        const input = document.createElement("input");
        input.type = "text";
        input.className = "win98-addressbar-input";
        input.value = initialValue;
        input.style.width = "100%";
        body.append(lbl, input);

        const winData = openDialog({
            title,
            body,
            buttons: [
                {
                    label: "OK",
                    onClick: () => {
                        const v = input.value.trim();
                        if (v) onSubmit(v);
                    },
                },
                { label: "Отмена" },
            ],
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (body.okButton) body.okButton.click();
            } else if (e.key === "Escape") {
                e.preventDefault();
                closeWindow(winData.id);
            }
        });
        setTimeout(() => input.focus(), 50);
        return winData;
    }

    /* ============================================================
     LIVE SYNC with the bookmarks service
     ============================================================ */

    function attachBookmarkListeners() {
        ["onCreated", "onRemoved", "onChanged", "onMoved"].forEach((evt) => {
            const api = chrome.bookmarks[evt];
            if (api && typeof api.addListener === "function") {
                api.addListener(scheduleBookmarksRefresh);
            }
        });
    }

    function scheduleBookmarksRefresh() {
        clearTimeout(state.bookmarksRefreshTimer);
        state.bookmarksRefreshTimer = setTimeout(refreshAllBookmarks, 250);
    }

    /** Re-read the whole tree, re-render the desktop and all windows that show a folder */
    async function refreshAllBookmarks() {
        let tree = state.treeRoot;
        try {
            tree = (await chrome.bookmarks.getTree())[0];
            state.treeRoot = tree;
        } catch {
            // Permission revoked or API unavailable — keep showing what we have
            return;
        }
        renderBookmarks(tree);
        refreshOpenFolderWindows(tree);
        refreshSearchWindow();
    }

    function refreshOpenFolderWindows(tree) {
        state.windows.forEach((w) => {
            if (w.bookmarkId == null) return;
            const fc = w.el && w.el.querySelector(".folder-content");
            if (!fc) return;

            // The «Все закладки» top-level listing (or a nested folder inside that window)
            if (w.bookmarkId === ALL_ROOT_ID || w.winType === "all-bookmarks") {
                const target = resolveNavNode(w.currentNode, tree);
                if (!target) {
                    // Current folder was deleted → return to the top-level listing
                    w.currentNode = buildAllBookmarksNode(tree);
                    w.bookmarkId = ALL_ROOT_ID;
                    renderFolderContent(w, w.currentNode);
                } else {
                    w.currentNode = target;
                    if (w.bookmarkId !== target.id) w.bookmarkId = target.id;
                    renderFolderContent(w, target);
                }
                updateNavButtons(w);
                return;
            }

            const node = tree ? findNodeById(tree, w.bookmarkId) : null;
            if (!node) {
                closeWindow(w.id); // folder was deleted
                return;
            }
            w.currentNode = node;
            renderFolderContent(w, node);
            updateNavButtons(w);
        });
    }

    /* ============================================================
     SEARCH (start menu + Ctrl+F)
     ============================================================ */

    /** Flatten the whole tree into a searchable list of bookmarks and folders */
    function buildSearchIndex(tree) {
        const out = [];
        const walk = (node, path) => {
            if (!node) return;
            const p = path ? `${path} > ${node.title}` : node.title;
            if (isBookmarkNode(node)) {
                out.push({
                    id: node.id,
                    title: node.title || "",
                    url: node.url,
                    path,
                    isFolder: false,
                });
            } else if (isFolderNode(node)) {
                out.push({
                    id: node.id,
                    title: node.title || "",
                    url: null,
                    path,
                    isFolder: true,
                });
                (node.children || []).forEach((c) => walk(c, p));
            }
        };
        (tree ? tree.children || [] : []).forEach((r) => walk(r, ""));
        return out;
    }

    function openSearchWindow() {
        const existing = state.windows.find((w) => w.title === "Поиск");
        if (existing) {
            if (existing.minimized) restoreWindow(existing.id);
            else bringToFront(existing.id);
            return;
        }

        state.searchNodes = buildSearchIndex(state.treeRoot);

        createWindow({
            title: "Поиск",
            icon: "icons/search.svg",
            width: 520,
            height: 400,
            content: "",
            statusbar: true,
            statusText: "Найдено: 0",
            onCreated: (el, winData) => {
                const ce = el.querySelector(".win98-window-content");
                ce.style.background = "var(--win98-silver)";
                const ui = buildSearchUI(winData);
                ce.appendChild(ui);
                winData.searchFilter = ui.filter;
                ui.input.focus();
            },
        });
    }

    function buildSearchUI(winData) {
        const wrap = document.createElement("div");
        wrap.className = "search-wrap";

        const row = document.createElement("div");
        row.className = "search-row";
        const label = document.createElement("label");
        label.textContent = "Найти:";
        const input = document.createElement("input");
        input.type = "text";
        input.className = "win98-addressbar-input";
        input.placeholder = "Имя или адрес закладки...";
        input.style.boxSizing = "border-box";
        row.append(label, input);
        wrap.appendChild(row);

        const results = document.createElement("div");
        results.className = "search-results";
        wrap.appendChild(results);

        let selectedRow = null;
        let current = [];

        const statusEl = () =>
            winData.el.querySelector(".win98-statusbar-field");

        function selectRow(rowEl) {
            results
                .querySelectorAll(".search-result-row.selected")
                .forEach((r) => r.classList.remove("selected"));
            if (rowEl) {
                rowEl.classList.add("selected");
                rowEl.scrollIntoView({ block: "nearest" });
            }
            selectedRow = rowEl;
        }

        function openSearchResult(n) {
            const node = findNodeById(state.treeRoot, n.id);
            if (node) openNode(node);
        }

        function renderList(filter) {
            const q = (filter || "").toLowerCase().trim();
            let list = state.searchNodes;
            if (q) {
                list = state.searchNodes.filter(
                    (n) =>
                        n.title.toLowerCase().includes(q) ||
                        (n.url || "").toLowerCase().includes(q) ||
                        (n.path || "").toLowerCase().includes(q),
                );
                const score = (n) => {
                    const t = n.title.toLowerCase();
                    const u = (n.url || "").toLowerCase();
                    if (t.startsWith(q)) return 0;
                    if (t.includes(q)) return 1;
                    if (u.startsWith(q)) return 2;
                    return 3;
                };
                list = list.sort(
                    (a, b) =>
                        score(a) - score(b) ||
                        a.title.localeCompare(b.title, "ru"),
                );
            }
            list = list.slice(0, 200);

            results.innerHTML = "";
            current = list;
            list.forEach((n, i) => {
                const rowEl = document.createElement("div");
                rowEl.className = "search-result-row";
                const img = document.createElement("img");
                img.className = "search-result-img";
                img.draggable = false;
                if (n.isFolder) {
                    img.src = drawFolderIcon(
                        FOLDER_COLORS[i % FOLDER_COLORS.length],
                        false,
                        24,
                    );
                } else {
                    const fav = getFaviconUrl(n.url);
                    img.src = fav || drawPageIcon(24);
                    if (fav)
                        img.onerror = () => {
                            img.src = drawPageIcon(24);
                        };
                }
                const text = document.createElement("div");
                text.className = "search-result-text";
                const t = document.createElement("div");
                t.className = "search-result-title";
                t.textContent = n.title || n.url || "Без названия";
                const p = document.createElement("div");
                p.className = "search-result-path";
                p.textContent = n.isFolder ? n.path || "Папка" : n.url;
                text.append(t, p);
                rowEl.append(img, text);
                rowEl.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (isSingleClickMode()) openSearchResult(n);
                    else selectRow(rowEl);
                });
                rowEl.addEventListener("dblclick", (e) => {
                    e.stopPropagation();
                    if (!isSingleClickMode()) openSearchResult(n);
                });
                results.appendChild(rowEl);
            });

            selectRow(results.querySelector(".search-result-row"));
            const st = statusEl();
            if (st)
                st.textContent = `Найдено: ${list.length}${list.length >= 200 ? "+" : ""}`;
        }

        function currentRowIndex() {
            return Array.from(
                results.querySelectorAll(".search-result-row"),
            ).indexOf(selectedRow);
        }

        input.addEventListener("input", () => renderList(input.value));
        input.addEventListener("keydown", (e) => {
            const rows = results.querySelectorAll(".search-result-row");
            const idx = currentRowIndex();
            if (e.key === "ArrowDown") {
                e.preventDefault();
                selectRow(
                    rows[Math.min(rows.length - 1, Math.max(0, idx) + 1)],
                );
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                selectRow(rows[Math.max(0, idx - 1)]);
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (selectedRow && current[Math.max(0, idx)])
                    openSearchResult(current[Math.max(0, idx)]);
            } else if (e.key === "Escape") {
                e.preventDefault();
                closeWindow(winData.id);
            }
        });

        renderList("");
        wrap.filter = () => renderList(input.value);
        wrap.input = input;
        return wrap;
    }

    /** Keep results of an open search window in sync with the live tree */
    function refreshSearchWindow() {
        const sw = state.windows.find((w) => w.title === "Поиск");
        if (!sw) return;
        state.searchNodes = buildSearchIndex(state.treeRoot);
        if (sw.searchFilter) sw.searchFilter();
    }

    /* ============================================================
     CONTEXT MENU
     ============================================================ */

    let activeContextMenu = null;

    function showContextMenu(x, y, items) {
        hideContextMenu();

        const menu = document.createElement("div");
        menu.className = "win98-context-menu";

        for (const item of items) {
            if (item.type === "separator") {
                const sep = document.createElement("div");
                sep.className = "win98-context-menu-separator";
                menu.appendChild(sep);
            } else {
                const el = document.createElement("div");
                el.className =
                    "win98-context-menu-item" +
                    (item.disabled ? " disabled" : "");
                el.textContent = item.label;
                if (!item.disabled) {
                    el.addEventListener("click", () => {
                        hideContextMenu();
                        item.action();
                    });
                }
                menu.appendChild(el);
            }
        }

        menu.style.left = x + "px";
        menu.style.top = y + "px";
        document.body.appendChild(menu);
        activeContextMenu = menu;

        // Adjust if off-screen
        requestAnimationFrame(() => {
            const rect = menu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                menu.style.left = x - rect.width + "px";
            }
            if (rect.bottom > window.innerHeight - 28) {
                menu.style.top = y - rect.height + "px";
            }
        });
    }

    function hideContextMenu() {
        if (activeContextMenu) {
            activeContextMenu.remove();
            activeContextMenu = null;
        }
    }

    /* ============================================================
     START MENU
     ============================================================ */

    function toggleStartMenu() {
        state.startMenuOpen = !state.startMenuOpen;
        $startMenu.style.display = state.startMenuOpen ? "flex" : "none";
    }

    function closeStartMenu() {
        state.startMenuOpen = false;
        $startMenu.style.display = "none";
    }

    /* ============================================================
     EVENT LISTENERS
     ============================================================ */

    // Desktop click → deselect
    $desktop.addEventListener("click", (e) => {
        if (e.target === $desktop || e.target === $desktopIcons) {
            document
                .querySelectorAll(".desktop-icon.selected")
                .forEach((d) => d.classList.remove("selected"));
        }
        hideContextMenu();
        closeStartMenu();
    });

    // Desktop right-click
    $desktop.addEventListener("contextmenu", (e) => {
        if (e.target.closest(".desktop-icon")) return;
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, [
            { label: "Обновить", action: () => location.reload() },
            { type: "separator" },
            {
                label: "Открыть все закладки",
                action: () => openAllBookmarksWindow(),
            },
        ]);
    });

    // Start button
    $startBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleStartMenu();
    });

    /* ---------- Easter egg: 10 clicks on the clock ---------- */
    let clockClicks = 0;
    let clockClickTimer = null;
    $clock.addEventListener("click", () => {
        clockClicks++;
        clearTimeout(clockClickTimer);
        clockClickTimer = setTimeout(() => {
            clockClicks = 0;
        }, 2500);
        if (clockClicks >= 10) {
            clockClicks = 0;
            clearTimeout(clockClickTimer);
            openMessageBox("Внимание", "Ты старый", "icons/pc_icon.png");
        }
    });

    // Start menu: open all bookmarks
    $menuAllBookmarks.addEventListener("click", () => {
        closeStartMenu();
        openAllBookmarksWindow();
    });

    // Start menu: settings
    document.getElementById("menu-settings").addEventListener("click", () => {
        closeStartMenu();
        openSettingsWindow();
    });

    // Start menu: search
    document.getElementById("menu-search").addEventListener("click", () => {
        closeStartMenu();
        openSearchWindow();
    });

    // Close menus on outside click
    document.addEventListener("click", (e) => {
        if (
            !e.target.closest("#start-menu") &&
            !e.target.closest("#start-btn")
        ) {
            closeStartMenu();
        }
        if (!e.target.closest(".win98-context-menu")) {
            hideContextMenu();
        }
    });

    /* ============================================================
     KEYBOARD: desktop navigation + shortcuts
     ============================================================ */

    /** Estimate how many desktop icons fit in one row (for up/down arrows) */
    function desktopRowLength() {
        const size = currentIconSize();
        const gap =
            (state.settings && state.settings.iconGap) ||
            DEFAULT_SETTINGS.iconGap;
        return Math.max(
            1,
            Math.floor($desktopIcons.clientWidth / (size + gap + 12)),
        );
    }

    document.addEventListener("keydown", (e) => {
        // Ctrl+F — поиск по закладкам (работает из любого места)
        if (
            e.ctrlKey &&
            (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А")
        ) {
            e.preventDefault();
            openSearchWindow();
            return;
        }
        if (e.key === "Escape") {
            if (state.startMenuOpen) closeStartMenu();
            hideContextMenu();
            return;
        }

        const tag =
            (document.activeElement && document.activeElement.tagName) || "";
        if (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT" ||
            tag === "BUTTON"
        )
            return;

        const all = Array.from(
            document.querySelectorAll("#desktop-icons .desktop-icon"),
        );
        const sel = state.selectedDesktopEl;

        if (
            e.key === "ArrowLeft" ||
            e.key === "ArrowRight" ||
            e.key === "ArrowUp" ||
            e.key === "ArrowDown"
        ) {
            if (!all.length) return;
            let idx = all.indexOf(sel);
            if (idx === -1) idx = 0;
            if (e.key === "ArrowRight") idx = Math.min(all.length - 1, idx + 1);
            else if (e.key === "ArrowLeft") idx = Math.max(0, idx - 1);
            else if (e.key === "ArrowDown")
                idx = Math.min(all.length - 1, idx + desktopRowLength());
            else idx = Math.max(0, idx - desktopRowLength());
            selectDesktopIcon(all[idx]);
            e.preventDefault();
            return;
        }
        if (e.key === "Enter" && sel && sel._node) {
            e.preventDefault();
            openNode(sel._node);
            return;
        }
        if ((e.key === "Delete" || e.key === "Del") && sel && sel._node) {
            e.preventDefault();
            deleteNode(sel._node);
            return;
        }
        if (
            e.ctrlKey &&
            (e.key === "c" ||
                e.key === "C" ||
                e.key === "с" ||
                e.key === "С") &&
            sel &&
            sel._node &&
            sel._node.url
        ) {
            copyText(sel._node.url);
        }
    });

    /* ============================================================
     ALL BOOKMARKS WINDOW
     ============================================================ */

    function openAllBookmarksWindow() {
        // Single instance — track by winType, not title (title changes while browsing)
        const existing = state.windows.find(
            (w) => w.winType === "all-bookmarks",
        );
        if (existing) {
            if (existing.minimized) restoreWindow(existing.id);
            else bringToFront(existing.id);
            return;
        }

        chrome.bookmarks.getTree((tree) => {
            state.treeRoot = tree[0];

            const toolbarHtml = `
        <button class="win98-toolbar-btn" data-nav="back" disabled>
          <span>← Назад</span>
        </button>
        <button class="win98-toolbar-btn" data-nav="up" disabled>
          <span>⬆ Вверх</span>
        </button>
        <button class="win98-toolbar-btn" data-nav="refresh">
          <span>🔄 Обновить</span>
        </button>
        <button class="win98-toolbar-btn" data-nav="view">
          <span>Вид: Список</span>
        </button>
      `;

            createWindow({
                winType: "all-bookmarks",
                title: "Все закладки",
                icon: drawFolderIcon("#d4c044", true),
                width: 650,
                height: 450,
                toolbar: toolbarHtml,
                bookmarkId: ALL_ROOT_ID,
                addressbar: true,
                addressbarValue: "Все закладки",
                content: "",
                statusbar: true,
                statusText: "",
                onCreated: (el, winData) => {
                    winData.currentNode = buildAllBookmarksNode(state.treeRoot);
                    winData.navStack = [];
                    renderFolderContent(winData, winData.currentNode);
                    updateNavButtons(winData);

                    el.querySelector('[data-nav="back"]')?.addEventListener(
                        "click",
                        () => goBack(winData),
                    );
                    el.querySelector('[data-nav="up"]')?.addEventListener(
                        "click",
                        () => goUp(winData),
                    );
                    el.querySelector('[data-nav="refresh"]')?.addEventListener(
                        "click",
                        () => {
                            chrome.bookmarks.getTree((t) => {
                                state.treeRoot = t[0];
                                const target = resolveNavNode(
                                    winData.currentNode,
                                    t[0],
                                );
                                if (target)
                                    navigateInWindow(winData, target, {
                                        fromHistory: true,
                                    });
                                else updateNavButtons(winData);
                            });
                        },
                    );
                    el.querySelector('[data-nav="view"]')?.addEventListener(
                        "click",
                        () =>
                            setFolderViewMode(
                                currentFolderViewMode() === "list"
                                    ? "icons"
                                    : "list",
                            ),
                    );
                },
            });
        });
    }

    /* ============================================================
     SETTINGS (storage + wallpaper + click mode)
     ============================================================ */

    function mergeSettings(partial) {
        const base = structuredClone(DEFAULT_SETTINGS);
        if (!partial) return base;
        if (partial.clickMode === "single" || partial.clickMode === "double") {
            base.clickMode = partial.clickMode;
        }
        if (ICON_SIZES.includes(partial.iconSize)) {
            base.iconSize = partial.iconSize;
        }
        if (clampInt(partial.labelSize, 9, 18) !== null)
            base.labelSize = clampInt(partial.labelSize, 9, 18);
        if (clampInt(partial.iconGap, 0, 32) !== null)
            base.iconGap = clampInt(partial.iconGap, 0, 32);
        if (clampInt(partial.desktopPadX, 0, 64) !== null)
            base.desktopPadX = clampInt(partial.desktopPadX, 0, 64);
        if (clampInt(partial.desktopPadY, 0, 64) !== null)
            base.desktopPadY = clampInt(partial.desktopPadY, 0, 64);
        if (FOLDER_STYLES.some((s) => s.id === partial.folderIconStyle)) {
            base.folderIconStyle = partial.folderIconStyle;
        }
        if (
            typeof partial.weatherCity === "string" &&
            partial.weatherCity.trim()
        ) {
            base.weatherCity = partial.weatherCity.trim();
        }
        if (typeof partial.showClockDate === "boolean") {
            base.showClockDate = partial.showClockDate;
        }
        if (typeof partial.showClockWeekday === "boolean") {
            base.showClockWeekday = partial.showClockWeekday;
        }
        if (typeof partial.iconLabelShadow === "boolean") {
            base.iconLabelShadow = partial.iconLabelShadow;
        }
        if (
            partial.folderViewMode === "icons" ||
            partial.folderViewMode === "list"
        ) {
            base.folderViewMode = partial.folderViewMode;
        }
        if (partial.wallpaper) {
            const wp = partial.wallpaper;
            if (wp.type === "color" || wp.type === "image")
                base.wallpaper.type = wp.type;
            if (typeof wp.color === "string") base.wallpaper.color = wp.color;
            if (typeof wp.imageData === "string")
                base.wallpaper.imageData = wp.imageData;
            if (["stretch", "tile", "center"].includes(wp.imageStyle))
                base.wallpaper.imageStyle = wp.imageStyle;
        }
        return base;
    }

    async function loadSettings() {
        try {
            const stored = await chrome.storage.local.get("settings");
            state.settings = mergeSettings(stored.settings);
        } catch (err) {
            state.settings = mergeSettings(null);
        }
        applyWallpaper(state.settings.wallpaper);
        applyDesktopStyle();
        updateClock();
    }

    /** Apply all desktop layout CSS variables (icon size, label size, spacing, padding) */
    function applyDesktopStyle(src) {
        const s = src || state.settings || DEFAULT_SETTINGS;
        const el = document.documentElement;
        el.style.setProperty(
            "--win98-icon-size",
            (s.iconSize || DEFAULT_SETTINGS.iconSize) + "px",
        );
        el.style.setProperty(
            "--win98-label-size",
            (s.labelSize ?? DEFAULT_SETTINGS.labelSize) + "px",
        );
        el.style.setProperty(
            "--win98-icon-gap",
            (s.iconGap ?? DEFAULT_SETTINGS.iconGap) + "px",
        );
        el.style.setProperty(
            "--win98-desktop-pad-x",
            (s.desktopPadX ?? DEFAULT_SETTINGS.desktopPadX) + "px",
        );
        el.style.setProperty(
            "--win98-desktop-pad-y",
            (s.desktopPadY ?? DEFAULT_SETTINGS.desktopPadY) + "px",
        );
        // Icon label appearance: transparent like original Win98 with drop
        // shadows ("Use drop shadows for icon labels on the desktop" checkbox).
        // No opaque background — the wallpaper/desktop color shows through.
        el.style.setProperty(
            "--win98-label-shadow",
            s.iconLabelShadow ? "1px 1px 1px rgba(0,0,0,0.7)" : "none",
        );
    }

    /** Apply the icon size as CSS variables on the desktop + windows (back-compat) */
    function applyIconSize(size) {
        if (size)
            state.settings = {
                ...(state.settings || DEFAULT_SETTINGS),
                iconSize: size,
            };
        applyDesktopStyle();
    }

    function saveSettings() {
        return chrome.storage.local
            .set({ settings: state.settings })
            .catch(() => {});
    }

    /** Apply wallpaper to the desktop background */
    function applyWallpaper(wp) {
        wp =
            wp ||
            (state.settings && state.settings.wallpaper) ||
            DEFAULT_SETTINGS.wallpaper;
        const desk = document.getElementById("desktop");
        desk.style.backgroundPosition = "0 0";

        if (wp.type !== "color" && wp.imageData) {
            desk.style.backgroundImage = `url(${wp.imageData})`;
            desk.style.backgroundColor = wp.color || "#008080";
            const sty = wp.imageStyle || "tile";
            if (sty === "stretch") {
                desk.style.backgroundSize = "100% 100%";
                desk.style.backgroundRepeat = "no-repeat";
            } else if (sty === "center") {
                desk.style.backgroundSize = "auto";
                desk.style.backgroundRepeat = "no-repeat";
                desk.style.backgroundPosition = "center center";
            } else {
                desk.style.backgroundSize = "auto";
                desk.style.backgroundRepeat = "repeat";
            }
        } else {
            desk.style.backgroundImage = "none";
            desk.style.backgroundColor = wp.color || "#008080";
            desk.style.backgroundSize = "auto";
            desk.style.backgroundRepeat = "repeat";
        }
    }

    /* ============================================================
     SETTINGS WINDOW
     ============================================================ */

    function openSettingsWindow() {
        // Single instance
        const existing = state.windows.find((w) => w.title === "Настройки");
        if (existing) {
            if (existing.minimized) restoreWindow(existing.id);
            else bringToFront(existing.id);
            return;
        }

        const pending = structuredClone(state.settings);
        let settingsWinId = null;

        createWindow({
            title: "Настройки",
            icon: "icons/settings.svg",
            width: 460,
            height: 540,
            content: "",
            statusbar: false,
            onCreated: (el, winData) => {
                settingsWinId = winData.id;
                const contentEl = el.querySelector(".win98-window-content");
                contentEl.style.background = "var(--win98-silver)";
                contentEl.appendChild(
                    buildSettingsForm(pending, () => settingsWinId),
                );
            },
        });
    }

    /**
     * Build the settings form. Live-preview applies changes to the desktop,
     * but they are only committed to disk on OK.
     */
    function buildSettingsForm(pending, getWinId) {
        const form = document.createElement("form");
        form.className = "win98-form";
        form.addEventListener("submit", (e) => e.preventDefault());

        // UI type: "color" | "file" | "url" (maps to persisted type color|image)
        let uiType = pending.wallpaper.type === "color" ? "color" : "file";

        /* ---------- Tab bar + panels ---------- */
        const tabsWrap = document.createElement("div");
        tabsWrap.className = "win98-tabs-wrap";
        const tabBar = document.createElement("div");
        tabBar.className = "win98-tabs";
        const panels = document.createElement("div");
        panels.className = "win98-tabpanels";

        const TAB_DEFS = [
            { id: "wp", label: "Обои" },
            { id: "behavior", label: "Поведение" },
            { id: "appearance", label: "Вид" },
        ];
        const tabPanels = {};

        TAB_DEFS.forEach((t) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "win98-tab";
            btn.dataset.tab = t.id;
            btn.textContent = t.label;
            btn.addEventListener("click", () => selectTab(t.id));
            tabBar.appendChild(btn);

            const panel = document.createElement("div");
            panel.className = "win98-tabpanel";
            panel.dataset.tabPanel = t.id;
            panels.appendChild(panel);
            tabPanels[t.id] = panel;
        });

        tabsWrap.appendChild(tabBar);
        tabsWrap.appendChild(panels);
        form.appendChild(tabsWrap);

        function selectTab(id) {
            tabBar
                .querySelectorAll(".win98-tab")
                .forEach((b) =>
                    b.classList.toggle("active", b.dataset.tab === id),
                );
            panels
                .querySelectorAll(".win98-tabpanel")
                .forEach((p) =>
                    p.classList.toggle("active", p.dataset.tabPanel === id),
                );
        }
        selectTab("wp");

        const commit = () => {
            previewFolderStyle = null;
            previewFolderViewMode = null;
            state.settings = pending;
            applyDesktopStyle();
            saveSettings();
            updateClock();
            updateWeather();
            renderBookmarks(state.treeRoot);
            refreshOpenFolderWindows(state.treeRoot); // apply new view mode
            const id = getWinId();
            if (id) closeWindow(id);
        };

        const cancel = () => {
            previewFolderStyle = null;
            previewFolderViewMode = null;
            applyWallpaper(state.settings.wallpaper);
            applyDesktopStyle();
            updateClock();
            renderBookmarks(state.treeRoot);
            refreshOpenFolderWindows(state.treeRoot); // restore saved view mode
            const id = getWinId();
            if (id) closeWindow(id);
        };

        /* ---------- Обои group ---------- */
        const wg = document.createElement("div");
        wg.className = "win98-groupbox";
        const wgLegend = document.createElement("div");
        wgLegend.className = "win98-groupbox-legend";
        wgLegend.textContent = "Обои";
        wg.appendChild(wgLegend);

        // -- Цвет фона --
        const colorRow = document.createElement("label");
        colorRow.className = "win98-radio";
        const colorRadio = document.createElement("input");
        colorRadio.type = "radio";
        colorRadio.name = "wp-type";
        colorRadio.value = "color";
        const colorSpan = document.createElement("span");
        colorSpan.textContent = "Цвет фона:";
        const colorPicker = document.createElement("input");
        colorPicker.type = "color";
        colorPicker.className = "wp-color-picker";
        colorPicker.value = pending.wallpaper.color || "#008080";
        colorRow.append(colorRadio, colorSpan, colorPicker);
        wg.appendChild(colorRow);

        // -- Изображение с компьютера --
        const fileRow = document.createElement("div");
        fileRow.className = "win98-radio-row";
        const fileRadio = document.createElement("input");
        fileRadio.type = "radio";
        fileRadio.name = "wp-type";
        fileRadio.value = "file";
        const fileLabel = document.createElement("span");
        fileLabel.textContent = "Изображение с компьютера:";
        const fileBtn = document.createElement("button");
        fileBtn.type = "button";
        fileBtn.className = "win98-btn";
        fileBtn.textContent = "Выбрать файл...";
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.style.display = "none";
        fileRow.append(fileRadio, fileLabel, fileBtn, fileInput);
        wg.appendChild(fileRow);

        // -- Изображение из интернета --
        const urlRow = document.createElement("div");
        urlRow.className = "win98-radio-row";
        const urlRadio = document.createElement("input");
        urlRadio.type = "radio";
        urlRadio.name = "wp-type";
        urlRadio.value = "url";
        const urlLabel = document.createElement("span");
        urlLabel.textContent = "Изображение из интернета:";
        const urlInput = document.createElement("input");
        urlInput.type = "url";
        urlInput.className = "win98-addressbar-input";
        urlInput.placeholder = "https://example.com/oboi.png";
        const dlBtn = document.createElement("button");
        dlBtn.type = "button";
        dlBtn.className = "win98-btn";
        dlBtn.textContent = "Скачать";
        urlRow.append(urlRadio, urlLabel, urlInput, dlBtn);
        wg.appendChild(urlRow);

        // -- Расположение --
        const styleRow = document.createElement("div");
        styleRow.className = "wp-style-row";
        const STYLE_LABELS = ["Замостить", "Растянуть", "По центру"];
        ["tile", "stretch", "center"].forEach((s, i) => {
            const lbl = document.createElement("label");
            lbl.className = "win98-radio";
            const r = document.createElement("input");
            r.type = "radio";
            r.name = "wp-style";
            r.value = s;
            if (pending.wallpaper.imageStyle === s) r.checked = true;
            const sp = document.createElement("span");
            sp.textContent = STYLE_LABELS[i];
            lbl.append(r, sp);
            styleRow.appendChild(lbl);
        });
        wg.appendChild(styleRow);

        // -- Preview --
        const preview = document.createElement("div");
        preview.className = "wp-preview";
        const previewImg = document.createElement("div");
        previewImg.className = "wp-preview-img";
        preview.appendChild(previewImg);
        wg.appendChild(preview);

        // -- Message line --
        const msg = document.createElement("div");
        msg.className = "settings-msg";
        wg.appendChild(msg);

        tabPanels.wp.appendChild(wg);

        /* ---------- Открытие group ---------- */
        const mg = document.createElement("div");
        mg.className = "win98-groupbox";
        const mgLegend = document.createElement("div");
        mgLegend.className = "win98-groupbox-legend";
        mgLegend.textContent = "Открытие";
        mg.appendChild(mgLegend);

        const singleLbl = document.createElement("label");
        singleLbl.className = "win98-radio";
        const singleRadio = document.createElement("input");
        singleRadio.type = "radio";
        singleRadio.name = "click-mode";
        singleRadio.value = "single";
        if (pending.clickMode === "single") singleRadio.checked = true;
        singleLbl.append(
            singleRadio,
            document.createTextNode("Открывать одним кликом"),
        );

        const doubleLbl = document.createElement("label");
        doubleLbl.className = "win98-radio";
        const doubleRadio = document.createElement("input");
        doubleRadio.type = "radio";
        doubleRadio.name = "click-mode";
        doubleRadio.value = "double";
        if (pending.clickMode === "double") doubleRadio.checked = true;
        doubleLbl.append(
            doubleRadio,
            document.createTextNode("Открывать двойным кликом"),
        );

        mg.append(singleLbl, doubleLbl);
        tabPanels.behavior.appendChild(mg);

        /* ---------- Часы group ---------- */
        const clg = document.createElement("div");
        clg.className = "win98-groupbox";
        const clgLegend = document.createElement("div");
        clgLegend.className = "win98-groupbox-legend";
        clgLegend.textContent = "Часы";
        clg.appendChild(clgLegend);

        const dateLbl = document.createElement("label");
        dateLbl.className = "win98-checkbox";
        const dateCb = document.createElement("input");
        dateCb.type = "checkbox";
        dateCb.checked = !!pending.showClockDate;
        dateLbl.append(dateCb, document.createTextNode("Показывать дату"));

        const wdLbl = document.createElement("label");
        wdLbl.className = "win98-checkbox";
        const wdCb = document.createElement("input");
        wdCb.type = "checkbox";
        wdCb.checked = !!pending.showClockWeekday;
        wdLbl.append(wdCb, document.createTextNode("Показывать день недели"));

        clg.append(dateLbl, wdLbl);
        tabPanels.behavior.appendChild(clg);

        /* ---------- Вид group (icon size) ---------- */
        const vg = document.createElement("div");
        vg.className = "win98-groupbox";
        const vgLegend = document.createElement("div");
        vgLegend.className = "win98-groupbox-legend";
        vgLegend.textContent = "Вид";
        vg.appendChild(vgLegend);

        const SIZE_LABELS = { 24: "Мелкие", 32: "Средние", 48: "Крупные" };
        const sizeRow = document.createElement("div");
        sizeRow.className = "wp-style-row";
        ICON_SIZES.forEach((s) => {
            const lbl = document.createElement("label");
            lbl.className = "win98-radio";
            const r = document.createElement("input");
            r.type = "radio";
            r.name = "icon-size";
            r.value = String(s);
            if (pending.iconSize === s) r.checked = true;
            const sp = document.createElement("span");
            sp.textContent = SIZE_LABELS[s] || s;
            lbl.append(r, sp);
            r.addEventListener("change", () => {
                if (r.checked) {
                    pending.iconSize = s;
                    applyDesktopStyle(pending); // live preview
                }
            });
            sizeRow.appendChild(lbl);
        });
        vg.appendChild(sizeRow);

        /* ---------- Вид group (folder icon style) ---------- */
        const fg = document.createElement("div");
        fg.className = "win98-groupbox";
        const fgLegend = document.createElement("div");
        fgLegend.className = "win98-groupbox-legend";
        fgLegend.textContent = "Иконки папок";
        fg.appendChild(fgLegend);

        const curFolderStyle = FOLDER_STYLES.some(
            (s) => s.id === pending.folderIconStyle,
        )
            ? pending.folderIconStyle
            : DEFAULT_SETTINGS.folderIconStyle;

        FOLDER_STYLES.forEach((s) => {
            const lbl = document.createElement("label");
            lbl.className = "win98-radio";
            lbl.style.display = "flex";
            lbl.style.alignItems = "center";
            lbl.style.gap = "6px";
            lbl.style.marginBottom = "2px";
            const rad = document.createElement("input");
            rad.type = "radio";
            rad.name = "folder-style";
            rad.value = s.id;
            if (curFolderStyle === s.id) rad.checked = true;
            const prev = document.createElement("img");
            prev.src = drawFolderIcon("#d4c044", false, 24, s.id);
            prev.width = 24;
            prev.height = 24;
            prev.style.imageRendering = "pixelated";
            prev.style.flexShrink = "0";
            const sp = document.createElement("span");
            sp.textContent = s.label;
            rad.addEventListener("change", () => {
                if (!rad.checked) return;
                pending.folderIconStyle = s.id;
                previewFolderStyle = s.id;
                renderBookmarks(state.treeRoot); // live preview on the desktop
            });
            lbl.append(rad, prev, sp);
            fg.appendChild(lbl);
        });
        vg.appendChild(fg);

        /* ---------- Вид group (folder view mode) ---------- */
        const fm = document.createElement("div");
        fm.className = "win98-groupbox";
        const fmLegend = document.createElement("div");
        fmLegend.className = "win98-groupbox-legend";
        fmLegend.textContent = "Ссылки в папках";
        fm.appendChild(fmLegend);

        const VIEW_MODE_LABELS = [
            { id: "icons", label: "Значки" },
            { id: "list", label: "Список" },
        ];
        const curViewMode =
            pending.folderViewMode === "list" ? "list" : "icons";
        VIEW_MODE_LABELS.forEach((m) => {
            const lbl = document.createElement("label");
            lbl.className = "win98-radio";
            const r = document.createElement("input");
            r.type = "radio";
            r.name = "folder-view-mode";
            r.value = m.id;
            if (curViewMode === m.id) r.checked = true;
            const sp = document.createElement("span");
            sp.textContent = m.label;
            lbl.append(r, sp);
            r.addEventListener("change", () => {
                if (!r.checked) return;
                pending.folderViewMode = m.id;
                previewFolderViewMode = m.id; // live preview in open windows
                refreshOpenFolderWindows(state.treeRoot);
            });
            fm.appendChild(lbl);
        });
        vg.appendChild(fm);

        // Numeric style settings with live preview
        const makeNumRow = (label, key, min, max) => {
            const row = document.createElement("div");
            row.className = "wp-style-row";
            row.style.justifyContent = "space-between";
            const cap = document.createElement("span");
            cap.textContent = label;
            const inp = document.createElement("input");
            inp.type = "number";
            inp.min = String(min);
            inp.max = String(max);
            inp.value = String(pending[key] ?? DEFAULT_SETTINGS[key]);
            inp.className = "win98-addressbar-input";
            inp.style.width = "64px";
            inp.addEventListener("change", () => {
                const v = clampInt(inp.value, min, max);
                if (v === null) {
                    inp.value = String(pending[key] ?? DEFAULT_SETTINGS[key]);
                    return;
                }
                pending[key] = v;
                inp.value = String(v);
                applyDesktopStyle(pending); // live preview
            });
            row.append(cap, inp);
            return row;
        };
        vg.appendChild(makeNumRow("Размер текста, пкс", "labelSize", 9, 18));
        vg.appendChild(
            makeNumRow("Расстояние между иконками, пкс", "iconGap", 0, 32),
        );
        vg.appendChild(
            makeNumRow("Отступ сверху и снизу, пкс", "desktopPadY", 0, 64),
        );
        vg.appendChild(
            makeNumRow("Отступ слева и справа, пкс", "desktopPadX", 0, 64),
        );

        tabPanels.appearance.appendChild(vg);

        /* ---------- Надписи group (icon label background) ---------- */
        const lg = document.createElement("div");
        lg.className = "win98-groupbox";
        const lgLegend = document.createElement("div");
        lgLegend.className = "win98-groupbox-legend";
        lgLegend.textContent = "Надписи";
        lg.appendChild(lgLegend);

        const shadowLbl = document.createElement("label");
        shadowLbl.className = "win98-checkbox";
        const shadowCb = document.createElement("input");
        shadowCb.type = "checkbox";
        shadowCb.checked = !!pending.iconLabelShadow;
        shadowLbl.append(
            shadowCb,
            document.createTextNode(
                "Тени для подписей значков на рабочем столе",
            ),
        );
        shadowLbl.addEventListener("change", () => {
            pending.iconLabelShadow = shadowCb.checked;
            applyDesktopStyle(pending); // live preview on the desktop
        });
        lg.appendChild(shadowLbl);
        tabPanels.appearance.appendChild(lg);

        /* ---------- Погода group ---------- */
        const wxg = document.createElement("div");
        wxg.className = "win98-groupbox";
        const wxgLegend = document.createElement("div");
        wxgLegend.className = "win98-groupbox-legend";
        wxgLegend.textContent = "Погода";
        wxg.appendChild(wxgLegend);

        const cityLbl = document.createElement("label");
        cityLbl.className = "win98-radio";
        const cityInput = document.createElement("input");
        cityInput.type = "text";
        cityInput.className = "win98-addressbar-input";
        cityInput.value = pending.weatherCity || "";
        cityInput.placeholder = "Город";
        cityInput.style.width = "200px";
        const cityTip = document.createElement("div");
        cityTip.className = "settings-msg";
        cityTip.style.marginLeft = "0";
        cityTip.textContent = "Город для отображения погоды в панели задач";

        wxg.append(cityLbl, cityInput, cityTip);
        tabPanels.behavior.appendChild(wxg);

        /* ---------- Dialog buttons ---------- */
        const btnRow = document.createElement("div");
        btnRow.className = "win98-dialog-buttons";
        const okBtn = document.createElement("button");
        okBtn.type = "button";
        okBtn.className = "win98-btn";
        okBtn.textContent = "OK";
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "win98-btn";
        cancelBtn.textContent = "Отмена";
        btnRow.append(okBtn, cancelBtn);
        form.appendChild(btnRow);

        /* ---------- Helpers ---------- */
        const updateEnabled = () => {
            fileBtn.disabled = uiType !== "file";
            urlInput.disabled = uiType !== "url";
            dlBtn.disabled = uiType !== "url";
            styleRow
                .querySelectorAll("input")
                .forEach((r) => (r.disabled = uiType === "color"));
        };

        const renderPreview = () => {
            const isImg = uiType !== "color" && pending.wallpaper.imageData;
            previewImg.style.backgroundImage = isImg
                ? `url(${pending.wallpaper.imageData})`
                : "none";
            previewImg.style.backgroundColor =
                pending.wallpaper.color || "#008080";
            const sty = pending.wallpaper.imageStyle || "tile";
            if (sty === "stretch") {
                previewImg.style.backgroundSize = "100% 100%";
                previewImg.style.backgroundRepeat = "no-repeat";
            } else if (sty === "center") {
                previewImg.style.backgroundSize = "auto";
                previewImg.style.backgroundRepeat = "no-repeat";
                previewImg.style.backgroundPosition = "center center";
            } else {
                previewImg.style.backgroundSize = "auto";
                previewImg.style.backgroundRepeat = "repeat";
                previewImg.style.backgroundPosition = "0 0";
            }
        };

        const setMsg = (text, isError = true) => {
            msg.textContent = text || "";
            msg.classList.toggle("settings-error", isError);
            msg.classList.toggle("settings-success", !isError);
        };

        const liveApply = () => applyWallpaper(pending.wallpaper);

        /* ---------- Events ---------- */
        [colorRadio, fileRadio, urlRadio].forEach((r) => {
            r.addEventListener("change", () => {
                if (!r.checked) return;
                uiType = r.value;
                pending.wallpaper.type = uiType === "color" ? "color" : "image";
                updateEnabled();
                renderPreview();
                liveApply();
            });
        });

        colorPicker.addEventListener("input", () => {
            pending.wallpaper.color = colorPicker.value;
            renderPreview();
            liveApply();
        });

        fileBtn.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", () => {
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                pending.wallpaper.imageData = reader.result;
                pending.wallpaper.type = "image";
                uiType = "file";
                fileRadio.checked = true;
                updateEnabled();
                renderPreview();
                liveApply();
                setMsg("Обои выбраны. Нажмите OK, чтобы сохранить.", false);
            };
            reader.onerror = () => setMsg("Не удалось прочитать файл.");
            reader.readAsDataURL(file);
        });

        dlBtn.addEventListener("click", async () => {
            const u = urlInput.value.trim();
            if (!u) {
                setMsg("Введите адрес изображения.");
                return;
            }
            dlBtn.disabled = true;
            dlBtn.textContent = "Загружаем...";
            setMsg("");
            try {
                const resp = await fetch(u, { mode: "cors" });
                if (!resp.ok) throw new Error("HTTP " + resp.status);
                const blob = await resp.blob();
                const reader = new FileReader();
                const dataUrl = await new Promise((res, rej) => {
                    reader.onload = () => res(reader.result);
                    reader.onerror = () => rej(new Error("read error"));
                    reader.readAsDataURL(blob);
                });
                pending.wallpaper.imageData = dataUrl;
                pending.wallpaper.type = "image";
                uiType = "url";
                urlRadio.checked = true;
                updateEnabled();
                renderPreview();
                liveApply();
                setMsg("Обои скачаны и сохранены локально. Нажмите OK.", false);
            } catch (err) {
                setMsg(
                    "Не удалось загрузить: сервер не разрешает доступ (CORS) или адрес неверный.",
                );
            } finally {
                dlBtn.disabled = uiType !== "url";
                dlBtn.textContent = "Скачать";
            }
        });

        styleRow.querySelectorAll("input").forEach((r) => {
            r.addEventListener("change", () => {
                if (r.checked) {
                    pending.wallpaper.imageStyle = r.value;
                    renderPreview();
                    liveApply();
                }
            });
        });

        singleRadio.addEventListener("change", () => {
            if (singleRadio.checked) pending.clickMode = "single";
        });
        doubleRadio.addEventListener("change", () => {
            if (doubleRadio.checked) pending.clickMode = "double";
        });

        cityInput.addEventListener("change", () => {
            const v = cityInput.value.trim();
            if (v) pending.weatherCity = v;
        });

        dateCb.addEventListener("change", () => {
            pending.showClockDate = dateCb.checked;
            updateClock(pending);
        });
        wdCb.addEventListener("change", () => {
            pending.showClockWeekday = wdCb.checked;
            updateClock(pending);
        });

        okBtn.addEventListener("click", commit);
        cancelBtn.addEventListener("click", cancel);

        // Initial state
        updateEnabled();
        renderPreview();

        return form;
    }

    /* ============================================================
     UTILITIES
     ============================================================ */

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    /** Clamp an integer to [min,max]; returns null if not a finite number */
    function clampInt(v, min, max) {
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        return Math.min(max, Math.max(min, Math.round(n)));
    }

    /* ============================================================
     INIT
     ============================================================ */

    function init() {
        // Render bare time immediately; date/weekday appear only after settings
        // are loaded, so disabled toggles never flash back on at startup.
        updateClock({});
        setInterval(updateClock, 10000);
        attachBookmarkListeners();
        updateWeather(); // reads cache + refreshes in the background right away
        loadSettings().then(() => {
            loadBookmarks();
        });
    }

    // Start
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
