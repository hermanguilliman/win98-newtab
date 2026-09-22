(() => {
  // src/lib/format.ts
  var _ESCAPE_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  var _ESCAPE_RE = /[&<>"']/g;
  function escapeHtml(str) {
    return String(str).replace(_ESCAPE_RE, (ch) => _ESCAPE_MAP[ch] || ch);
  }
  function clampInt(v, min, max) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(max, Math.max(min, Math.round(n)));
  }
  function formatDateTime(ts) {
    try {
      return new Date(ts).toLocaleString("ru-RU", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return String(ts);
    }
  }

  // src/lib/calc.ts
  function evalOp(a, b, op) {
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

  // src/lib/bookmarks.ts
  var ALL_ROOT_ID = "__root__";
  var ROOT_ORDER = { 1: 0, 2: 1, 3: 2 };
  function isFolderNode(n) {
    return !!n && !n.url && Array.isArray(n.children);
  }
  function isBookmarkNode(n) {
    return !!n && !!n.url;
  }
  function isVisibleNode(n) {
    return isFolderNode(n) || isBookmarkNode(n);
  }
  function buildNodeIndex(root) {
    const map = /* @__PURE__ */ new Map();
    const walk = (n) => {
      if (!n) return;
      map.set(n.id, n);
      (n.children || []).forEach(walk);
    };
    walk(root);
    return map;
  }
  function isRootFolder(node) {
    return !!node && node.parentId === "0";
  }
  function getNodePath(node, nodeIndex) {
    const parts = [];
    let cur = node;
    while (cur && cur.title) {
      parts.unshift(cur.title);
      if (!cur.parentId || cur.parentId === "0") break;
      const parent = nodeIndex && nodeIndex.get(cur.parentId);
      if (!parent) break;
      cur = parent;
    }
    return parts.join(" > ") || "/";
  }
  function buildAllBookmarksNode(tree) {
    return {
      id: ALL_ROOT_ID,
      title: "Все закладки",
      children: (tree && tree.children || []).filter((n) => isVisibleNode(n))
    };
  }
  var FOLDER_COLORS = [
    "#d4c044",
    "#c8a032",
    "#a0c844",
    "#64a0c8",
    "#c86464",
    "#64c864",
    "#c89644",
    "#9664c8",
    "#c864a0"
  ];
  function folderColorFor(id) {
    const s = String(id);
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = h * 31 + s.charCodeAt(i) | 0;
    }
    return FOLDER_COLORS[Math.abs(h) % FOLDER_COLORS.length];
  }
  function folderColorAt(i) {
    return FOLDER_COLORS[Math.abs(i) % FOLDER_COLORS.length];
  }

  // src/lib/theme.ts
  var THEME_OPTIONS = [
    {
      id: "classic",
      label: "Классическая",
      desc: "Стандартные серые цвета Windows 98"
    },
    {
      id: "olive",
      label: "Оливковая",
      desc: "Тёплые зелёно-оливковые тона"
    },
    {
      id: "high-contrast",
      label: "Высокий контраст",
      desc: "Чёрные окна, белый текст, синяя подсветка"
    },
    {
      id: "dracula",
      label: "Дракула",
      desc: "Тёмная тема с фиолетовыми и зелёными акцентами"
    },
    { id: "custom", label: "Пользовательская", desc: "Свои цвета" }
  ];
  var THEME_COLORS = {
    olive: {
      "--win98-silver": "#b5b5a1",
      "--win98-btn-face": "#b5b5a1",
      "--win98-hover": "#d5d5c1",
      "--win98-inset-bg": "#d0d0b8",
      "--win98-input-bg": "#fffff0",
      "--win98-navy": "#404000",
      "--win98-highlight": "#808000",
      "--win98-shadow": "#505040",
      "--win98-dark-gray": "#606050",
      "--win98-radio-edge2": "#a0a090",
      "--win98-wp-preview": "#408040",
      "--win98-title-active": "linear-gradient(90deg, #404000, #808040)",
      "--win98-title-inactive": "linear-gradient(90deg, #808040, #a0a080)"
    },
    "high-contrast": {
      "--win98-silver": "#000000",
      "--win98-btn-face": "#000000",
      "--win98-hover": "#000080",
      "--win98-inset-bg": "#000000",
      "--win98-input-bg": "#000000",
      "--win98-content-bg": "#000000",
      "--win98-navy": "#0000ff",
      "--win98-highlight": "#0000ff",
      "--win98-black": "#ffffff",
      "--win98-shadow": "#808080",
      "--win98-dark-gray": "#808080",
      "--win98-radio-check": "#00ff00",
      "--win98-radio-edge1": "#ffffff",
      "--win98-radio-edge2": "#808080",
      "--win98-radio-shadow": "#000000",
      "--win98-wp-preview": "#000000",
      "--win98-title-active": "linear-gradient(90deg, #000080, #0000ff)",
      "--win98-title-inactive": "linear-gradient(90deg, #808080, #808080)"
    },
    dracula: {
      "--win98-silver": "#282a36",
      "--win98-btn-face": "#44475a",
      "--win98-hover": "#44475a",
      "--win98-inset-bg": "#21222c",
      "--win98-input-bg": "#191a21",
      "--win98-content-bg": "#282a36",
      "--win98-navy": "#bd93f9",
      "--win98-highlight": "#ff79c6",
      "--win98-black": "#f8f8f2",
      "--win98-shadow": "#191a21",
      "--win98-dark-gray": "#6272a4",
      "--win98-radio-check": "#50fa7b",
      "--win98-radio-edge1": "#f8f8f2",
      "--win98-radio-edge2": "#6272a4",
      "--win98-radio-shadow": "#191a21",
      "--win98-wp-preview": "#282a36",
      "--win98-title-active": "linear-gradient(90deg, #44475a, #bd93f9)",
      "--win98-title-inactive": "linear-gradient(90deg, #282a36, #44475a)"
    }
  };
  var CUSTOM_THEME_KEYS = [
    { css: "--win98-silver", label: "Цвет окон", def: "#c0c0c0" },
    { css: "--win98-content-bg", label: "Фон содержимого окон", def: "#ffffff" },
    { css: "--win98-btn-face", label: "Цвет кнопок", def: "#c0c0c0" },
    { css: "--win98-navy", label: "Цвет выделения", def: "#000080" },
    { css: "--win98-black", label: "Цвет текста", def: "#000000" },
    { css: "--win98-highlight", label: "Цвет подсветки", def: "#0000aa" },
    { css: "--win98-shadow", label: "Цвет теней", def: "#606060" }
  ];
  function shadeColor(color, percent) {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);
    R = Math.min(255, Math.max(0, R + Math.round(R * percent / 100)));
    G = Math.min(255, Math.max(0, G + Math.round(G * percent / 100)));
    B = Math.min(255, Math.max(0, B + Math.round(B * percent / 100)));
    return `#${R.toString(16).padStart(2, "0")}${G.toString(16).padStart(2, "0")}${B.toString(16).padStart(2, "0")}`;
  }
  function themeResetKeys() {
    const keys = /* @__PURE__ */ new Set();
    Object.values(THEME_COLORS).forEach(
      (palette) => Object.keys(palette).forEach((k) => keys.add(k))
    );
    CUSTOM_THEME_KEYS.forEach((k) => keys.add(k.css));
    return [...keys];
  }
  function themeColorsFor(themeId, customColors) {
    if (themeId === "custom") {
      const sel = customColors["--win98-navy"] || "#000080";
      const inactive = customColors["--win98-shadow"] || "#808080";
      return {
        ...customColors,
        "--win98-title-active": `linear-gradient(90deg, ${sel}, ${shadeColor(sel, 35)})`,
        "--win98-title-inactive": `linear-gradient(90deg, ${inactive}, ${shadeColor(inactive, 35)})`
      };
    }
    if (THEME_COLORS[themeId]) return THEME_COLORS[themeId];
    return null;
  }

  // src/lib/settings.ts
  var ICON_SIZES = [24, 32, 48];
  var FOLDER_STYLES = [
    { id: "classic", label: "Классические" },
    { id: "glossy", label: "Объёмные" },
    { id: "outlined", label: "С контуром" }
  ];
  var UI_FONTS = [
    { label: "Tahoma", value: "Tahoma, 'MS Sans Serif', 'Segoe UI', sans-serif" },
    { label: "MS Sans Serif", value: "'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif" },
    { label: "Segoe UI", value: "'Segoe UI', Tahoma, sans-serif" },
    { label: "Courier New", value: "'Courier New', monospace" },
    { label: "Times New Roman", value: "'Times New Roman', Times, serif" }
  ];
  var DEFAULT_SETTINGS = {
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
    uiFont: "Tahoma, 'MS Sans Serif', 'Segoe UI', sans-serif",
    taskbarAutoHide: false,
    taskbarSmallIcons: false,
    showClock: true,
    theme: "classic",
    customColors: {},
    wallpaper: {
      type: "color",
      color: "#008080",
      imageData: null,
      imageStyle: "tile",
      scale: 100,
      uiType: "color"
    }
  };
  var HEX6_RE = /^#[0-9a-fA-F]{6}$/;
  function mergeSettings(partial) {
    const base = structuredClone(DEFAULT_SETTINGS);
    if (!partial) return base;
    if (partial.clickMode === "single" || partial.clickMode === "double") {
      base.clickMode = partial.clickMode;
    }
    if (typeof partial.iconSize === "number" && ICON_SIZES.includes(partial.iconSize)) {
      base.iconSize = partial.iconSize;
    }
    const labelSize = clampInt(partial.labelSize, 9, 18);
    if (labelSize !== null) base.labelSize = labelSize;
    const iconGap = clampInt(partial.iconGap, 0, 32);
    if (iconGap !== null) base.iconGap = iconGap;
    const desktopPadX = clampInt(partial.desktopPadX, 0, 64);
    if (desktopPadX !== null) base.desktopPadX = desktopPadX;
    const desktopPadY = clampInt(partial.desktopPadY, 0, 64);
    if (desktopPadY !== null) base.desktopPadY = desktopPadY;
    const folderStyle = partial.folderIconStyle;
    if (folderStyle && FOLDER_STYLES.some((s) => s.id === folderStyle)) {
      base.folderIconStyle = folderStyle;
    }
    if (typeof partial.weatherCity === "string" && partial.weatherCity.trim()) {
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
    if (partial.folderViewMode === "icons" || partial.folderViewMode === "list") {
      base.folderViewMode = partial.folderViewMode;
    }
    const uiFont = partial.uiFont;
    if (uiFont && UI_FONTS.some((f) => f.value === uiFont)) {
      base.uiFont = uiFont;
    }
    if (typeof partial.taskbarAutoHide === "boolean") {
      base.taskbarAutoHide = partial.taskbarAutoHide;
    }
    if (typeof partial.taskbarSmallIcons === "boolean") {
      base.taskbarSmallIcons = partial.taskbarSmallIcons;
    }
    if (typeof partial.showClock === "boolean") {
      base.showClock = partial.showClock;
    }
    const theme = partial.theme;
    if (theme && THEME_OPTIONS.some((t) => t.id === theme)) {
      base.theme = theme;
    }
    if (partial.customColors && typeof partial.customColors === "object" && !Array.isArray(partial.customColors)) {
      const colors = {};
      CUSTOM_THEME_KEYS.forEach((k) => {
        const v = partial.customColors[k.css];
        if (typeof v === "string" && HEX6_RE.test(v)) {
          colors[k.css] = v;
        }
      });
      base.customColors = colors;
    }
    if (partial.wallpaper && typeof partial.wallpaper === "object" && !Array.isArray(partial.wallpaper)) {
      const wp = partial.wallpaper;
      if (wp.type === "color" || wp.type === "image") {
        base.wallpaper.type = wp.type;
      }
      if (typeof wp.color === "string") base.wallpaper.color = wp.color;
      if (typeof wp.imageData === "string") base.wallpaper.imageData = wp.imageData;
      if (wp.imageStyle === "stretch" || wp.imageStyle === "tile" || wp.imageStyle === "center") {
        base.wallpaper.imageStyle = wp.imageStyle;
      }
      if (typeof wp.scale === "number") {
        const scale = clampInt(Math.round(wp.scale), 10, 500);
        if (scale !== null) {
          base.wallpaper.scale = scale;
        }
      }
      if (wp.uiType === "color" || wp.uiType === "file" || wp.uiType === "url") {
        base.wallpaper.uiType = wp.uiType;
      }
    }
    return base;
  }

  // src/lib/search.ts
  function buildSearchIndex(tree) {
    const out = [];
    const walk = (node, path) => {
      if (!node) return;
      const p = path ? `${path} > ${node.title}` : node.title;
      const title = node.title || "";
      if (isBookmarkNode(node)) {
        out.push({
          id: node.id,
          title,
          url: node.url,
          path,
          isFolder: false,
          _tl: title.toLowerCase(),
          _ul: (node.url || "").toLowerCase(),
          _pl: (path || "").toLowerCase()
        });
      } else if (isFolderNode(node)) {
        out.push({
          id: node.id,
          title,
          url: null,
          path,
          isFolder: true,
          _tl: title.toLowerCase(),
          _ul: "",
          _pl: (path || "").toLowerCase()
        });
        (node.children || []).forEach((c) => walk(c, p));
      }
    };
    (tree ? tree.children || [] : []).forEach((r) => walk(r, ""));
    return out;
  }
  function scoreNode(n, q) {
    if (n._tl.startsWith(q)) return 0;
    if (n._tl.includes(q)) return 1;
    if (n._ul.startsWith(q)) return 2;
    return 3;
  }
  function filterSearchNodes(nodes, filter, limit) {
    const q = (filter || "").toLowerCase().trim();
    let list = nodes;
    if (q) {
      list = nodes.filter(
        (n) => n._tl.includes(q) || n._ul.includes(q) || n._pl.includes(q)
      );
      list = list.sort(
        (a, b) => scoreNode(a, q) - scoreNode(b, q) || a.title.localeCompare(b.title, "ru")
      );
    }
    return list.slice(0, limit);
  }

  // src/lib/iconNodes.ts
  var iconNodes = /* @__PURE__ */ new WeakMap();
  function setNodeForIcon(el, node) {
    if (el) iconNodes.set(el, node);
  }
  function getNodeForIcon(el) {
    return el && iconNodes.get(el) || void 0;
  }

  // src/lib/windows.ts
  var WINDOW_STACK_OFFSET = 28;
  var WINDOW_STACK_WRAP = 6;
  var TASKBAR_HEIGHT = 28;
  var CASCADE_START = 28;
  var CASCADE_STEP = 24;
  var CASCADE_MAX_W = 420;
  var CASCADE_MAX_H = 320;
  function computeWindowStackPosition(o) {
    const vw = Math.max(0, o.viewportWidth);
    const vh = Math.max(0, o.viewportHeight);
    const w = Math.max(0, o.width);
    const h = Math.max(0, o.height);
    const freeX = Math.max(0, vw - w);
    const freeY = Math.max(0, vh - h);
    const nudge = o.stackIndex % WINDOW_STACK_WRAP * WINDOW_STACK_OFFSET;
    return {
      x: o.x ?? clamp(Math.round(vw / 2 - w / 2 + nudge), 0, freeX),
      y: o.y ?? clamp(Math.round(vh / 2 - h / 2 + nudge), 0, freeY)
    };
  }
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }
  var WindowManager = class {
    constructor() {
      /** All open windows, in creation order. The object identity is the same
          object the app extends with `el`/`title`/etc. */
      this.windows = [];
      /** Id of the window currently in front, or null */
      this.activeWindowId = null;
      this.idCounter = 0;
      this.zCounter = 100;
    }
    /** Open a new window: allocate id, cascade the position, bring to front. */
    open(o) {
      const w = o.width || 500;
      const h = o.height != null ? o.height : 400;
      const pos = computeWindowStackPosition({
        width: w,
        height: h,
        viewportWidth: o.viewportWidth,
        viewportHeight: o.viewportHeight,
        stackIndex: this.windows.length,
        x: o.x,
        y: o.y
      });
      const win = {
        id: ++this.idCounter,
        x: pos.x,
        y: pos.y,
        w,
        h,
        dialog: !!o.dialog,
        minimized: false,
        maximized: false,
        prevBounds: null,
        zIndex: ++this.zCounter
      };
      this.windows.push(win);
      this.activeWindowId = win.id;
      return win;
    }
    get(id) {
      return this.windows.find((w) => w.id === id) || null;
    }
    /** Raise a window to the front (no-op when it is already active). */
    focus(id) {
      if (this.activeWindowId === id) return;
      const win = this.get(id);
      if (!win) return;
      this.activeWindowId = id;
      win.zIndex = ++this.zCounter;
    }
    /** Minimize a window; when it was active, focus the last visible one. */
    minimize(id) {
      const win = this.get(id);
      if (!win || win.minimized || win.dialog) return;
      win.minimized = true;
      if (this.activeWindowId === id) this.focusFallback();
    }
    /** Restore a minimized window and bring it to the front. */
    restore(id) {
      const win = this.get(id);
      if (!win) return;
      win.minimized = false;
      this.focus(id);
    }
    /** Toggle maximize; keeps pre-maximize bounds to restore later. */
    toggleMaximize(id) {
      const win = this.get(id);
      if (!win || win.dialog) return;
      if (win.maximized) {
        win.maximized = false;
        const b = win.prevBounds;
        if (b) {
          win.x = b.x;
          win.y = b.y;
          win.w = b.w;
          win.h = b.h;
        }
      } else {
        win.prevBounds = { x: win.x, y: win.y, w: win.w, h: win.h };
        win.maximized = true;
      }
    }
    /** Close a window; when it was active, focus the last visible one. */
    close(id) {
      const idx = this.windows.findIndex((w) => w.id === id);
      if (idx === -1) return null;
      const [win] = this.windows.splice(idx, 1);
      if (this.activeWindowId === id) this.focusFallback();
      return win;
    }
    /** Win98 «Каскад окон»: arrange all visible windows cascading down-right. */
    cascade(viewportWidth, viewportHeight) {
      this.windows.filter((w) => !w.minimized).forEach((win, i) => {
        win.maximized = false;
        win.x = CASCADE_START + i * CASCADE_STEP;
        win.y = CASCADE_START + i * CASCADE_STEP;
        win.w = Math.min(CASCADE_MAX_W, viewportWidth - 60);
        win.h = Math.min(CASCADE_MAX_H, viewportHeight - 90);
        this.focus(win.id);
      });
    }
    /** Win98 «Стопкой»: tile all visible windows across the desktop. */
    tile(viewportWidth, viewportHeight) {
      const wins = this.windows.filter((w) => !w.minimized);
      if (!wins.length) return;
      const cols = Math.ceil(Math.sqrt(wins.length));
      const rows = Math.ceil(wins.length / cols);
      const areaW = viewportWidth;
      const areaH = Math.max(1, viewportHeight - TASKBAR_HEIGHT);
      const wW = Math.floor(areaW / cols);
      const hH = Math.floor(areaH / rows);
      wins.forEach((win, i) => {
        win.maximized = false;
        win.x = i % cols * wW;
        win.y = Math.floor(i / cols) * hH;
        win.w = wW;
        win.h = hH;
        this.focus(win.id);
      });
    }
    /** Focus the last visible (non-minimized) window in creation order. */
    focusFallback() {
      const visible = this.windows.filter((w) => !w.minimized);
      const next = visible[visible.length - 1];
      this.activeWindowId = next ? next.id : null;
      if (next) next.zIndex = ++this.zCounter;
    }
  };

  // src/lib/weather.ts
  function weatherIcon(code) {
    if (code == null) return "🌡️";
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
  var WIND_DIRS = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"];
  function windDirName(deg) {
    if (deg == null || !Number.isFinite(deg)) return "—";
    return WIND_DIRS[Math.round(deg % 360 / 45) % 8];
  }
  function buildGeocodingUrl(city) {
    return `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`;
  }
  function buildForecastUrl(latitude, longitude) {
    return `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,cloud_cover`;
  }
  function parseWeatherCurrent(current, city, updated) {
    if (!current || typeof current !== "object") return null;
    const c = current;
    if (typeof c.temperature_2m !== "number") return null;
    return {
      city,
      temp: c.temperature_2m,
      code: typeof c.weather_code === "number" ? c.weather_code : -1,
      feelsLike: numOrUndef(c.apparent_temperature),
      humidity: numOrUndef(c.relative_humidity_2m),
      precipitation: numOrUndef(c.precipitation),
      windSpeed: numOrUndef(c.wind_speed_10m),
      windDirection: numOrUndef(c.wind_direction_10m),
      cloudCover: numOrUndef(c.cloud_cover),
      updated
    };
  }
  function firstGeocodeHit(geo) {
    if (!geo || typeof geo !== "object") return null;
    const g = geo;
    const hit = Array.isArray(g.results) ? g.results[0] : void 0;
    if (!hit || typeof hit !== "object") return null;
    const h = hit;
    if (typeof h.latitude !== "number" || typeof h.longitude !== "number") {
      return null;
    }
    return { latitude: h.latitude, longitude: h.longitude };
  }
  function formatUpdatedTime(date) {
    return date.toLocaleTimeString("ru-RU");
  }
  function numOrUndef(v) {
    return typeof v === "number" ? v : void 0;
  }

  // src/lib/calendar.ts
  function addMonths(year, month, delta) {
    const idx = year * 12 + month + delta;
    return { year: Math.floor(idx / 12), month: (idx % 12 + 12) % 12 };
  }
  function monthTitle(year, month) {
    return new Date(year, month, 1).toLocaleString("ru-RU", {
      month: "long",
      year: "numeric"
    });
  }
  function formatDayTitle(year, month, day) {
    return new Date(year, month, day).toLocaleString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }
  function monthCells(year, month) {
    const firstDow = new Date(year, month, 1).getDay();
    const offset = (firstDow + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }
  function todayInMonth(year, month, now = /* @__PURE__ */ new Date()) {
    return now.getFullYear() === year && now.getMonth() === month ? now.getDate() : null;
  }

  // src/lib/holidays.ts
  var RU_FIXED_HOLIDAYS = [
    { date: "01-01", name: "Новогодние каникулы" },
    { date: "01-02", name: "Новогодние каникулы" },
    { date: "01-03", name: "Новогодние каникулы" },
    { date: "01-04", name: "Новогодние каникулы" },
    { date: "01-05", name: "Новогодние каникулы" },
    { date: "01-06", name: "Новогодние каникулы" },
    { date: "01-07", name: "Рождество Христово" },
    { date: "01-08", name: "Новогодние каникулы" },
    { date: "02-23", name: "День защитника Отечества" },
    { date: "03-08", name: "Международный женский день" },
    { date: "05-01", name: "Праздник Весны и Труда" },
    { date: "05-09", name: "День Победы" },
    { date: "06-12", name: "День России" },
    { date: "11-04", name: "День народного единства" }
  ];
  var RU_FIXED_HOLIDAY_MAP = new Map(
    RU_FIXED_HOLIDAYS.map((h) => [h.date, h.name])
  );
  var RU_YEAR_TRANSFERS = {
    2024: {
      extraOff: [
        "01-01",
        "01-02",
        "01-03",
        "01-04",
        "01-05",
        "01-08",
        "02-23",
        "03-08",
        "04-29",
        "04-30",
        "05-01",
        "05-09",
        "05-10",
        "06-12",
        "11-04",
        "12-30",
        "12-31"
      ],
      forcedWork: ["04-27", "11-02", "12-28"]
    },
    2025: {
      extraOff: [
        "01-01",
        "01-02",
        "01-03",
        "01-06",
        "01-07",
        "01-08",
        "05-01",
        "05-02",
        "05-08",
        "05-09",
        "06-12",
        "06-13",
        "11-03",
        "11-04",
        "12-31"
      ],
      forcedWork: ["11-01"]
    },
    2026: {
      extraOff: [
        "01-01",
        "01-02",
        "01-05",
        "01-06",
        "01-07",
        "01-08",
        "01-09",
        "02-23",
        "03-09",
        "05-01",
        "05-11",
        "06-12",
        "11-04",
        "12-31"
      ],
      forcedWork: []
    }
  };
  function monthDayStr(month, day) {
    return String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }
  function isWeekend(year, month, day) {
    const dow = new Date(year, month, day).getDay();
    return dow === 0 || dow === 6;
  }
  function nextWorkingDayAfter(date) {
    const d = new Date(date);
    do {
      d.setDate(d.getDate() + 1);
    } while (d.getDay() === 0 || d.getDay() === 6 || RU_FIXED_HOLIDAY_MAP.has(monthDayStr(d.getMonth(), d.getDate())));
    return d;
  }
  function transferredFromWeekendHoliday(year, month, day) {
    const target = new Date(year, month, day);
    for (let i = 1; i <= 14; i++) {
      const cand = new Date(year, month, day - i);
      const candDow = cand.getDay();
      if (candDow !== 0 && candDow !== 6) continue;
      const key = monthDayStr(cand.getMonth(), cand.getDate());
      if (!RU_FIXED_HOLIDAY_MAP.has(key)) continue;
      const moved = nextWorkingDayAfter(cand);
      if (moved.getFullYear() === target.getFullYear() && moved.getMonth() === target.getMonth() && moved.getDate() === target.getDate()) {
        return true;
      }
    }
    return false;
  }
  function ruDayInfo(year, month, day, transfers) {
    const key = monthDayStr(month, day);
    const table = transfers ?? RU_YEAR_TRANSFERS[year];
    const holidayName = RU_FIXED_HOLIDAY_MAP.get(key);
    const isHoliday = holidayName !== void 0;
    if (table && table.forcedWork.includes(key)) {
      return { isDayOff: false, status: "work" };
    }
    if (table && table.extraOff.includes(key)) {
      return {
        isDayOff: true,
        status: isHoliday ? "holiday" : "off",
        holidayName,
        transferred: !isHoliday
      };
    }
    if (isHoliday) {
      return { isDayOff: true, status: "holiday", holidayName };
    }
    if (isWeekend(year, month, day)) {
      return { isDayOff: true, status: "off" };
    }
    if (!table && transferredFromWeekendHoliday(year, month, day)) {
      return { isDayOff: true, status: "off", transferred: true };
    }
    return { isDayOff: false, status: "work" };
  }
  function parseIsdayoffStatus(status, year) {
    const length = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
    const extraOff = [];
    const forcedWork = [];
    let sawDayOff = false;
    for (let i = 0; i < Math.min(status.length, length); i++) {
      const ch = status.charCodeAt(i);
      const isOff = ch === 49 || ch === 50;
      if (isOff) sawDayOff = true;
      const d = new Date(year, 0, i + 1);
      const week = d.getDay() === 0 || d.getDay() === 6;
      const key = monthDayStr(d.getMonth(), d.getDate());
      if (isOff && !week) extraOff.push(key);
      else if (!isOff && week) forcedWork.push(key);
    }
    if (!sawDayOff) return null;
    return { extraOff, forcedWork };
  }

  // src/lib/calendarEvents.ts
  function parseDateStr(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const probe = new Date(y, mo - 1, d);
    if (probe.getFullYear() !== y || probe.getMonth() !== mo - 1 || probe.getDate() !== d) {
      return null;
    }
    return { y, m: mo - 1, d };
  }
  function toDateStr(y, m, d) {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }
  var TIME_RE = /^(\d{1,2}):(\d{2})$/;
  function normalizeTime(s) {
    const m = TIME_RE.exec(s ?? "");
    if (!m) return "";
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return "";
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  function normalizeEvent(raw) {
    const title = String(raw.title ?? "").trim();
    const start = parseDateStr(String(raw.startDate ?? ""));
    if (!title || !start || raw.id === void 0) return null;
    let end = parseDateStr(String(raw.endDate ?? ""));
    const allDay = raw.allDay === true;
    let startTime = allDay ? "" : normalizeTime(raw.startTime ?? "");
    let endTime = allDay ? "" : normalizeTime(raw.endTime ?? "");
    if (!end) {
      end = { ...start };
    } else {
      const startTs = new Date(start.y, start.m, start.d).getTime();
      const endTs = new Date(end.y, end.m, end.d).getTime();
      if (endTs < startTs) end = { ...start };
    }
    return {
      id: String(raw.id),
      title,
      startDate: toDateStr(start.y, start.m, start.d),
      endDate: toDateStr(end.y, end.m, end.d),
      allDay,
      startTime,
      endTime,
      note: String(raw.note ?? "")
    };
  }
  function parseTs(s) {
    const p = parseDateStr(s);
    return p ? new Date(p.y, p.m, p.d).getTime() : NaN;
  }
  function eventCoversDay(ev, y, m, d) {
    const ts = new Date(y, m, d).getTime();
    return ts >= parseTs(ev.startDate) && ts <= parseTs(ev.endDate);
  }
  function eventsInMonth(events, y, m) {
    const monthStart = new Date(y, m, 1).getTime();
    const monthEnd = new Date(y, m + 1, 0).getTime();
    return events.filter((ev) => {
      const s = parseTs(ev.startDate);
      const e = parseTs(ev.endDate);
      return s <= monthEnd && e >= monthStart;
    });
  }
  function eventsOnDay(events, y, m, d) {
    return events.filter((ev) => eventCoversDay(ev, y, m, d)).sort(compareEvents);
  }
  var EMPTY_TIME = -1;
  var TIME_MS = (t) => {
    const m = TIME_RE.exec(t);
    return m ? Number(m[1]) * 60 + Number(m[2]) : EMPTY_TIME;
  };
  function compareEvents(a, b) {
    if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
    if (a.endDate !== b.endDate) return a.endDate < b.endDate ? -1 : 1;
    const at = a.allDay ? EMPTY_TIME : TIME_MS(a.startTime);
    const bt = b.allDay ? EMPTY_TIME : TIME_MS(b.startTime);
    if (at !== bt) return at - bt;
    return a.title.localeCompare(b.title, "ru");
  }
  function sortEvents(events) {
    return [...events].sort(compareEvents);
  }
  function formatEventTime(ev) {
    if (ev.allDay) return "весь день";
    if (!ev.startTime) return "—";
    return ev.endTime ? `${ev.startTime}–${ev.endTime}` : ev.startTime;
  }
  function eventColorIndex(ev, paletteLen) {
    let h = 0;
    for (let i = 0; i < ev.id.length; i++) {
      h = h * 31 + ev.id.charCodeAt(i) >>> 0;
    }
    return h % Math.max(1, paletteLen);
  }
  function formatInputDate(d) {
    return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function makeEventId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  // src/app.js
  function eventTargetElement(e) {
    return e.target instanceof Element ? e.target : null;
  }
  var windowManager = new WindowManager();
  var state = {
    windowManager,
    /** @type {WinData[]} */
    // The manager's array is ManagedWindow[]; by the time any window is
    // read by app code it has been extended with title/icon/winType/
    // bookmarkId/el by createWindow, so the WinData view is accurate.
    windows: (
      /** @type {WinData[]} */
      windowManager.windows
    ),
    startMenuOpen: false,
    dragState: null,
    resizeState: null,
    /** @type {Settings | null} */
    settings: null,
    /** @type {BookmarkNode | null} */
    treeRoot: null,
    bookmarksRefreshTimer: 0,
    /** @type {SearchNode[]} */
    searchNodes: [],
    /** @type {Map<string, BookmarkNode> | null} */
    nodeIndex: null,
    /** @type {IconEl | null} */
    selectedDesktopEl: null,
    weatherData: null,
    clipUrl: null,
    /** @type {import("./lib/calendarEvents").CalendarEvent[]} */
    calendarEvents: []
  };
  var CLICK_DEBOUNCE_MS = 350;
  var BOOKMARK_REFRESH_DEBOUNCE_MS = 250;
  var SEARCH_RESULT_LIMIT = 200;
  var MIN_WINDOW_W = 200;
  var MIN_WINDOW_H = 120;
  var CLOCK_INTERVAL_MS = 1e4;
  var SEARCH_DEBOUNCE_MS = 150;
  var $desktop = document.getElementById("desktop");
  var $desktopIcons = document.getElementById("desktop-icons");
  var $windowsContainer = document.getElementById("windows-container");
  var $taskbarWindows = document.getElementById("taskbar-windows");
  var $startBtn = document.getElementById("start-btn");
  var $startMenu = document.getElementById("start-menu");
  var $clock = document.getElementById("clock");
  var $weather = document.getElementById("weather");
  var $menuAllBookmarks = document.getElementById("menu-all-bookmarks");
  var $launcherNotepad = document.getElementById("launcher-notepad");
  var $taskbar = document.getElementById("taskbar");
  function currentIconSize() {
    return state.settings && state.settings.iconSize || DEFAULT_SETTINGS.iconSize;
  }
  var FOLDER_BITMAPS = {
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
        "#FFCC99"
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
        "000000000000000000000000000000000000000000000000"
      ]
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
        "#000080"
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
        "00000000000000000000000000000000"
      ]
    }
  };
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
      dh
    );
    return c.toDataURL();
  }
  var _iconCache = {
    folder: /* @__PURE__ */ new Map(),
    page: /* @__PURE__ */ new Map(),
    computer: /* @__PURE__ */ new Map(),
    calc: /* @__PURE__ */ new Map()
  };
  function _clearIconCache() {
    _iconCache.folder.clear();
    _iconCache.page.clear();
    _iconCache.computer.clear();
    _iconCache.calc.clear();
  }
  function drawFolderIcon(color = "#d4c044", open = false, size = currentIconSize(), style = folderIconStyleName()) {
    const key = `${color}|${open ? 1 : 0}|${size}|${style}`;
    const cached = _iconCache.folder.get(key);
    if (cached !== void 0) return cached;
    const dataUrl = _drawFolderIcon(color, open, size, style);
    _iconCache.folder.set(key, dataUrl);
    return dataUrl;
  }
  function _drawFolderIcon(color, open, size, style) {
    if (style === "classic") {
      return drawFolderBitmap(
        open ? FOLDER_BITMAPS.open : FOLDER_BITMAPS.closed,
        size
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
        (h - 1) * k
      );
    };
    if (open) {
      ctx.fillStyle = dark;
      r(2, 8, 28, 22);
      ctx.fillStyle = color;
      r(2, 6, 14, 5);
      ctx.fillStyle = color;
      r(2, 10, 28, 20);
      ctx.fillStyle = light;
      r(4, 12, 24, 2);
      ctx.fillStyle = shadeColor(color, -40);
      r(4, 28, 24, 2);
      r(28, 12, 2, 18);
    } else {
      ctx.fillStyle = color;
      r(2, 4, 14, 5);
      ctx.fillStyle = dark;
      r(2, 8, 28, 22);
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
      ctx.fillStyle = light;
      r(4, 10, 24, 2);
      ctx.fillStyle = shadeColor(color, -20);
      r(4, 28, 24, 2);
      r(28, 11, 2, 19);
    }
    if (style === "glossy") {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.moveTo(5 * k, 11 * k);
      ctx.lineTo(14 * k, 11 * k);
      ctx.lineTo(9 * k, 19 * k);
      ctx.lineTo(5 * k, 19 * k);
      ctx.closePath();
      ctx.fill();
    } else if (style === "outlined") {
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
  function drawPageIcon(size = currentIconSize()) {
    const key = `page|${size}`;
    const cached = _iconCache.page.get(key);
    if (cached !== void 0) return cached;
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
    ctx.fillStyle = "#ffffff";
    r(4, 2, 22, 28);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = Math.max(1, k);
    ctx.strokeRect(4.5 * k, 2.5 * k, 21 * k, 27 * k);
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
    ctx.fillStyle = "#000000";
    for (let i = 0; i < 4; i++) {
      const w = i === 3 ? 12 : 16;
      r(7, 12 + i * 4, w, 1.5);
    }
    return c.toDataURL();
  }
  function drawComputerIcon(size = currentIconSize()) {
    const key = `computer|${size}`;
    const cached = _iconCache.computer.get(key);
    if (cached !== void 0) return cached;
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
    ctx.fillStyle = "#000000";
    r(4, 3, 24, 18);
    ctx.fillStyle = "#d9c69a";
    r(5, 4, 22, 16);
    ctx.fillStyle = "#000000";
    r(7, 6, 18, 12);
    ctx.fillStyle = "#008080";
    r(8, 7, 16, 10);
    ctx.fillStyle = "#FFFFFF";
    r(10, 8, 12, 6);
    ctx.fillStyle = "#000080";
    r(10, 8, 12, 2);
    ctx.fillRect(21 * k, 8 * k, 1 * k, 2 * k);
    ctx.fillStyle = "#000000";
    r(15, 21, 3, 3);
    ctx.fillStyle = "#e8e8e8";
    r(15, 21, 1, 3);
    ctx.fillStyle = "#000000";
    r(12, 23, 8, 2);
    ctx.fillStyle = "#9c8c60";
    r(13, 24, 6, 1);
    ctx.fillStyle = "#000000";
    r(3, 26, 26, 3);
    ctx.fillStyle = "#808080";
    r(4, 27, 9, 1);
    r(15, 27, 12, 1);
    return c.toDataURL();
  }
  function drawCalcIcon(size = currentIconSize()) {
    const key = `calc|${size}`;
    const cached = _iconCache.calc.get(key);
    if (cached !== void 0) return cached;
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
    ctx.fillStyle = "#000000";
    r(3, 2, 26, 28);
    ctx.fillStyle = "#c0c0c0";
    r(4, 3, 24, 26);
    ctx.fillStyle = "#ffffff";
    r(4, 3, 24, 1);
    r(4, 3, 1, 26);
    ctx.fillStyle = "#848484";
    r(27, 3, 1, 26);
    r(4, 28, 24, 1);
    ctx.fillStyle = "#6a8c96";
    r(6, 4, 20, 6);
    ctx.fillStyle = "#cde3e8";
    r(7, 5, 18, 4);
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
  function getFaviconUrl(url) {
    try {
      const u = new URL(url);
      return "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=" + encodeURIComponent(u.origin) + "&size=128";
    } catch {
      return null;
    }
  }
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
    const isBg = (i) => d[i + 3] >= 248 && d[i] >= 242 && d[i + 1] >= 242 && d[i + 2] >= 242;
    let minX = w, minY = h, maxX = -1, maxY = -1;
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
    let sx = 0, sy = 0, sw = w, sh = h;
    if (maxX >= 0 && (minX > 0 || minY > 0 || maxX < w - 1 || maxY < h - 1)) {
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
      dh
    );
    return out.toDataURL();
  }
  var FAVICON_CACHE_KEY = "faviconCache";
  var FAVICON_CACHE_MAX = 800;
  var faviconCacheMem = /* @__PURE__ */ new Map();
  var faviconPending = /* @__PURE__ */ new Map();
  var faviconSaveTimer = 0;
  function isPageReload() {
    try {
      const entries = performance.getEntriesByType("navigation");
      if (entries.length === 0) return false;
      const nav = (
        /** @type {PerformanceNavigationTiming} */
        entries[0]
      );
      return nav.type === "reload";
    } catch {
      return false;
    }
  }
  async function prepareFaviconCache() {
    if (isPageReload()) {
      try {
        await chrome.storage.local.remove(FAVICON_CACHE_KEY);
      } catch {
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
    }
  }
  function scheduleFaviconSave() {
    clearTimeout(faviconSaveTimer);
    faviconSaveTimer = setTimeout(() => {
      chrome.storage.local.set({ [FAVICON_CACHE_KEY]: Object.fromEntries(faviconCacheMem) }).catch(() => {
      });
    }, 400);
  }
  function cachedFavicon(favUrl) {
    return faviconCacheMem.get(favUrl) || null;
  }
  function ensureFavicon(favUrl, size) {
    const inflight = faviconPending.get(favUrl);
    if (inflight) return inflight;
    const p = faviconDataUrl(favUrl, size).then((clean) => {
      faviconCacheMem.set(favUrl, clean);
      if (faviconCacheMem.size > FAVICON_CACHE_MAX) {
        const oldest = faviconCacheMem.keys().next().value;
        if (oldest !== void 0) faviconCacheMem.delete(oldest);
      }
      scheduleFaviconSave();
      return clean;
    }).finally(() => {
      faviconPending.delete(favUrl);
    });
    faviconPending.set(favUrl, p);
    return p;
  }
  function setFaviconImage(img, url, size, fallbackSize) {
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
    ensureFavicon(favUrl, size).then((clean) => {
      img.src = clean;
    }).catch(() => {
    });
  }
  var previewFolderStyle = null;
  var previewFolderViewMode = null;
  function folderIconStyleName() {
    return previewFolderStyle || state.settings && state.settings.folderIconStyle || DEFAULT_SETTINGS.folderIconStyle;
  }
  function updateClock(src) {
    const s = src || state.settings || DEFAULT_SETTINGS;
    const now = /* @__PURE__ */ new Date();
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
  function weatherCityName() {
    return state.settings && state.settings.weatherCity || DEFAULT_SETTINGS.weatherCity;
  }
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
    return chrome.storage.local.set({ weather: payload }).catch(() => {
    });
  }
  async function refreshWeather(city) {
    const currentCity = city || state.settings && state.settings.weatherCity || DEFAULT_SETTINGS.weatherCity;
    try {
      const geoResp = await fetch(buildGeocodingUrl(currentCity), {
        mode: "cors"
      });
      const geo = await geoResp.json();
      const hit = firstGeocodeHit(geo);
      if (!hit) {
        hideWeather();
        return;
      }
      const wxResp = await fetch(
        buildForecastUrl(hit.latitude, hit.longitude),
        { mode: "cors" }
      );
      const wx = await wxResp.json();
      const parsed = parseWeatherCurrent(
        wx && wx.current,
        currentCity,
        formatUpdatedTime(/* @__PURE__ */ new Date())
      );
      if (!parsed) {
        hideWeather();
        return;
      }
      state.weatherData = parsed;
      renderWeather(parsed.temp, parsed.code);
      saveWeatherCache(currentCity, state.weatherData);
      renderOpenWeatherWindow();
    } catch {
    }
  }
  async function readCityAndCache() {
    let city = state.settings && state.settings.weatherCity || DEFAULT_SETTINGS.weatherCity;
    let cache = {};
    try {
      const [settings, stored] = await Promise.all([
        chrome.storage.local.get("settings"),
        chrome.storage.local.get("weather")
      ]);
      if (settings.settings && settings.settings.weatherCity) {
        city = settings.settings.weatherCity;
      }
      cache = stored || {};
    } catch {
    }
    return { city, cache };
  }
  async function updateWeather() {
    const { city, cache } = await readCityAndCache();
    if (cache && typeof cache.temp === "number" && cache.city === city) {
      state.weatherData = cache;
      renderWeather(cache.temp, cache.code);
    } else {
      state.weatherData = null;
      hideWeather();
    }
    refreshWeather(city);
  }
  function renderOpenWeatherWindow() {
    const win = state.windows.find((w) => w.winType === "weather");
    if (win) renderWeatherWindow(win);
  }
  function renderWeatherWindow(winData) {
    const el = winData.el;
    const ce = el.querySelector(".win98-window-content");
    const d = state.weatherData;
    ce.replaceChildren();
    const wrap = document.createElement("div");
    wrap.className = "weather-details";
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
    const box = document.createElement("div");
    box.className = "win98-groupbox";
    const legend = document.createElement("span");
    legend.className = "win98-groupbox-legend";
    legend.textContent = "Подробнее";
    box.appendChild(legend);
    const rows = [
      [
        "Ощущается как",
        d && d.feelsLike != null ? `${Math.round(d.feelsLike)}°` : "—"
      ],
      [
        "Влажность",
        d && d.humidity != null ? `${Math.round(d.humidity)}%` : "—"
      ],
      [
        "Осадки",
        d && d.precipitation != null ? `${d.precipitation} мм` : "—"
      ],
      [
        "Ветер",
        d && d.windSpeed != null ? `${Math.round(d.windSpeed)} км/ч${d.windDirection != null ? ", " + windDirName(d.windDirection) : ""}` : "—"
      ],
      [
        "Облачность",
        d && d.cloudCover != null ? `${d.cloudCover}%` : "—"
      ]
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
    const sb = el.querySelector(".win98-statusbar-field");
    if (sb) {
      sb.textContent = d && d.updated ? `Обновлено: ${d.updated}` : "Загрузка данных...";
    }
  }
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
      icon: state.weatherData ? weatherEmojiDataUrl(state.weatherData.code) : "icons/search.svg",
      width: 360,
      height: 290,
      content: "",
      statusbar: true,
      statusText: "Загрузка данных...",
      onCreated: (el, winData) => {
        el.querySelector(".win98-window-content").style.background = "var(--win98-silver)";
        renderWeatherWindow(winData);
      }
    });
    if (!state.weatherData) refreshWeather();
  }
  $weather.title = "Двойное нажатие — подробная информация о погоде";
  $weather.addEventListener("dblclick", () => openWeatherWindow());
  function createWindow(opts) {
    const w = opts.width || 500;
    const h = opts.height != null ? opts.height : 400;
    const isDialog = !!opts.dialog;
    const winData = (
      /** @type {WinData} */
      state.windowManager.open({
        width: w,
        height: h,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        x: opts.x,
        y: opts.y,
        dialog: isDialog
      })
    );
    const x = winData.x;
    const y = winData.y;
    const resolvedIcon = opts.icon || drawPageIcon();
    winData.title = opts.title || "Window";
    winData.icon = resolvedIcon;
    winData.winType = opts.winType || null;
    winData.bookmarkId = opts.bookmarkId || null;
    const el = document.createElement("div");
    el.className = "win98-window" + (isDialog ? " win98-window--dialog" : "");
    el.id = `win-${winData.id}`;
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${winData.zIndex};`;
    el.innerHTML = `
      <div class="win98-titlebar" data-win-id="${winData.id}">
        <img class="win98-titlebar-icon" src="${resolvedIcon}" alt="">
        <span class="win98-titlebar-text">${escapeHtml(opts.title || "")}</span>
        <div class="win98-titlebar-buttons">
          ${isDialog ? `<button class="win98-titlebar-btn" data-action="close" title="Закрыть">✕</button>` : `<button class="win98-titlebar-btn" data-action="minimize" title="Свернуть">_</button>
               <button class="win98-titlebar-btn" data-action="maximize" title="Развернуть">□</button>
               <button class="win98-titlebar-btn" data-action="close" title="Закрыть">✕</button>`}
        </div>
      </div>
      ${opts.toolbar ? `<div class="win98-toolbar">${opts.toolbar}</div>` : ""}
      ${opts.addressbar ? `<div class="win98-addressbar"><label>Адрес:</label><input class="win98-addressbar-input" type="text" value="${escapeHtml(opts.addressbarValue || "")}" readonly></div>` : ""}
      <div class="win98-window-content">${opts.content || ""}</div>
      ${opts.statusbar !== false ? `<div class="win98-statusbar"><div class="win98-statusbar-field">${escapeHtml(opts.statusText || "")}</div>${opts.statusText2 != null ? `<div class="win98-statusbar-field win98-statusbar-field2">${escapeHtml(opts.statusText2)}</div>` : ""}</div>` : ""}
      ${isDialog ? "" : `<div class="win98-resize-handle"></div>`}
    `;
    $windowsContainer.appendChild(el);
    winData.el = el;
    const titlebar = el.querySelector(".win98-titlebar");
    titlebar.addEventListener("mousedown", (e) => {
      if (eventTargetElement(e).closest(".win98-titlebar-btn")) return;
      bringToFront(winData.id);
      startDrag(
        /** @type {MouseEvent} */
        e,
        winData
      );
    });
    titlebar.addEventListener("dblclick", (e) => {
      if (isDialog) return;
      if (eventTargetElement(e).closest(".win98-titlebar-btn")) return;
      toggleMaximize(winData.id);
    });
    el.querySelector('[data-action="minimize"]')?.addEventListener(
      "click",
      () => minimizeWindow(winData.id)
    );
    el.querySelector('[data-action="maximize"]')?.addEventListener(
      "click",
      () => toggleMaximize(winData.id)
    );
    el.querySelector('[data-action="close"]')?.addEventListener(
      "click",
      () => closeWindow(winData.id)
    );
    const resizeHandle = el.querySelector(".win98-resize-handle");
    resizeHandle?.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      bringToFront(winData.id);
      startResize(
        /** @type {MouseEvent} */
        e,
        winData
      );
    });
    el.addEventListener("mousedown", () => bringToFront(winData.id));
    const tbBtn = document.createElement("button");
    tbBtn.className = "taskbar-win-btn win98-btn active";
    tbBtn.id = `tb-${winData.id}`;
    tbBtn.innerHTML = `<img src="${resolvedIcon}" alt=""><span>${escapeHtml(opts.title || "")}</span>`;
    tbBtn.addEventListener("click", () => {
      if (winData.minimized) {
        restoreWindow(winData.id);
      } else if (state.windowManager.activeWindowId === winData.id) {
        minimizeWindow(winData.id);
      } else {
        bringToFront(winData.id);
      }
    });
    tbBtn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const visible = state.windowManager.windows.filter((w2) => !w2.minimized);
      const items = [];
      if (winData.minimized) {
        items.push({
          label: "Восстановить",
          action: () => restoreWindow(winData.id)
        });
      } else {
        items.push({
          label: "Свернуть",
          action: () => minimizeWindow(winData.id)
        });
      }
      items.push({ label: "Закрыть", action: () => closeWindow(winData.id) });
      items.push({ type: "separator" });
      items.push({
        label: "Каскад окон",
        disabled: visible.length === 0,
        action: () => cascadeWindows(visible)
      });
      items.push({
        label: "Стопкой",
        disabled: visible.length === 0,
        action: () => tileWindows(visible)
      });
      items.push({ type: "separator" });
      items.push({
        label: "Свойства панели задач",
        action: openTaskbarProperties
      });
      showContextMenu(e.clientX, e.clientY, items);
    });
    $taskbarWindows.appendChild(tbBtn);
    syncActiveWindowVisuals();
    if (opts.onCreated) opts.onCreated(el, winData);
    scheduleWindowStateSave();
    return winData;
  }
  function syncActiveWindowVisuals() {
    const wm = state.windowManager;
    state.windows.forEach((w) => {
      if (!w.el) return;
      w.el.style.zIndex = String(w.zIndex);
      const tb = w.el.querySelector(".win98-titlebar");
      if (tb) tb.classList.toggle("inactive", w.id !== wm.activeWindowId);
    });
    document.querySelectorAll(".taskbar-win-btn").forEach((b) => b.classList.remove("active"));
    const tbBtn = wm.activeWindowId != null ? document.getElementById(`tb-${wm.activeWindowId}`) : null;
    if (tbBtn) tbBtn.classList.add("active");
  }
  function bringToFront(id) {
    state.windowManager.focus(id);
    syncActiveWindowVisuals();
  }
  function animateWindowToButton(el, btn, onEnd) {
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!btn || reduced) {
      onEnd();
      return;
    }
    const wRect = el.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    if (!wRect.width || !wRect.height) {
      onEnd();
      return;
    }
    const dx = bRect.left + bRect.width / 2 - (wRect.left + wRect.width / 2);
    const dy = bRect.top + bRect.height / 2 - (wRect.top + wRect.height / 2);
    el.style.transition = "transform 0.18s ease-in";
    el.style.transformOrigin = "center center";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(0.06)`;
    const handler = () => {
      el.removeEventListener("transitionend", handler);
      el.style.transition = "";
      el.style.transform = "";
      el.style.transformOrigin = "";
      onEnd();
    };
    el.addEventListener("transitionend", handler);
    setTimeout(() => {
      if (el.style.transform) handler();
    }, 250);
  }
  function animateWindowFromButton(el, btn) {
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!btn || reduced) return;
    const wRect = el.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    if (!wRect.width || !wRect.height) return;
    const dx = bRect.left + bRect.width / 2 - (wRect.left + wRect.width / 2);
    const dy = bRect.top + bRect.height / 2 - (wRect.top + wRect.height / 2);
    el.style.transition = "none";
    el.style.transformOrigin = "center center";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(0.06)`;
    void el.offsetWidth;
    el.style.transition = "transform 0.18s ease-out";
    el.style.transform = "";
    const handler = () => {
      el.removeEventListener("transitionend", handler);
      el.style.transition = "";
      el.style.transformOrigin = "";
    };
    el.addEventListener("transitionend", handler);
  }
  function minimizeWindow(id) {
    const wm = state.windowManager;
    const winData = (
      /** @type {WinData | null} */
      wm.get(id)
    );
    if (!winData || winData.minimized) return;
    wm.minimize(id);
    const btn = document.getElementById(`tb-${id}`);
    animateWindowToButton(winData.el, btn, () => {
      if (winData.minimized) winData.el.style.display = "none";
    });
    syncActiveWindowVisuals();
    scheduleWindowStateSave();
  }
  function restoreWindow(id) {
    const wm = state.windowManager;
    const winData = (
      /** @type {WinData | null} */
      wm.get(id)
    );
    if (!winData) return;
    wm.restore(id);
    winData.el.style.display = "";
    const btn = document.getElementById(`tb-${id}`);
    animateWindowFromButton(winData.el, btn);
    syncActiveWindowVisuals();
    scheduleWindowStateSave();
  }
  function toggleMaximize(id) {
    const wm = state.windowManager;
    const winData = (
      /** @type {WinData | null} */
      wm.get(id)
    );
    if (!winData) return;
    wm.toggleMaximize(id);
    if (winData.maximized) {
      winData.el.classList.add("maximized");
    } else {
      winData.el.classList.remove("maximized");
      winData.el.style.left = winData.x + "px";
      winData.el.style.top = winData.y + "px";
      winData.el.style.width = winData.w + "px";
      winData.el.style.height = winData.h + "px";
    }
    syncActiveWindowVisuals();
    scheduleWindowStateSave();
  }
  function closeWindow(id) {
    const wm = state.windowManager;
    const winData = (
      /** @type {WinData | null} */
      wm.get(id)
    );
    if (!winData) return;
    if (winData.winType === "notepad") {
      flushNotepadSave();
      notepadTextarea = null;
    }
    const calcEl = (
      /** @type {HTMLDivElement & { _calcKeyHandler?: (e: Event) => void }} */
      winData.el
    );
    if (calcEl && calcEl._calcKeyHandler) {
      document.removeEventListener("keydown", calcEl._calcKeyHandler);
    }
    const tbBtn = document.getElementById(`tb-${id}`);
    if (tbBtn) tbBtn.remove();
    wm.close(id);
    winData.el.remove();
    scheduleWindowStateSave();
    syncActiveWindowVisuals();
  }
  function updateTaskbarButtons() {
    state.windowManager.windows.forEach((w) => {
      const tbBtn = document.getElementById(`tb-${w.id}`);
      if (tbBtn) {
        if (w.id === state.windowManager.activeWindowId && !w.minimized) {
          tbBtn.classList.add("active");
        } else {
          tbBtn.classList.remove("active");
        }
      }
    });
  }
  var STORAGE_WINDOWS_KEY = "openWindows";
  function collectWindowState() {
    return state.windows.filter((w) => !w.dialog && w.title !== "Настройки").map((w) => {
      const d = {
        winType: w.winType || null,
        title: w.title || "",
        bookmarkId: w.bookmarkId || null,
        x: parseInt(w.el.style.left) || 0,
        y: parseInt(w.el.style.top) || 0,
        w: parseInt(w.el.style.width) || w.w || 400,
        h: parseInt(w.el.style.height) || w.h || 300,
        minimized: !!w.minimized,
        maximized: !!w.maximized
      };
      if (!w.winType && w.bookmarkId) {
        d.navStackIds = (w.navStack || []).map((n) => n && n.id || null).filter((v) => v !== null);
      }
      return d;
    });
  }
  var windowStateSaveTimer = null;
  function scheduleWindowStateSave() {
    clearTimeout(windowStateSaveTimer);
    windowStateSaveTimer = setTimeout(() => {
      const activeIndex = state.windowManager.windows.findIndex(
        (w) => w.id === state.windowManager.activeWindowId
      );
      chrome.storage.local.set({
        [STORAGE_WINDOWS_KEY]: {
          windows: collectWindowState(),
          activeIndex
        }
      }).catch(() => {
      });
    }, 400);
  }
  function lastCreatedWindow() {
    return state.windows[state.windows.length - 1] || null;
  }
  function applySavedWindowState(win, d) {
    if (!win || !d) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = clampInt(d.x, 0, Math.max(0, vw - 40)) ?? win.x ?? 0;
    const y = clampInt(d.y, 0, Math.max(0, vh - 60)) ?? win.y ?? 0;
    const w = clampInt(d.w, 120, vw) ?? win.w ?? 400;
    const h = clampInt(d.h, 80, vh - 40) ?? win.h ?? 300;
    win.el.style.left = x + "px";
    win.el.style.top = y + "px";
    win.el.style.width = w + "px";
    win.el.style.height = h + "px";
    win.x = x;
    win.y = y;
    win.w = w;
    win.h = h;
    if (d.maximized) {
      win.prevBounds = { x, y, w, h };
      win.el.classList.add("maximized");
      win.maximized = true;
    }
    if (d.minimized) {
      win.minimized = true;
      win.el.style.display = "none";
    }
  }
  function resolveSavedNodeId(id) {
    if (id === ALL_ROOT_ID) return buildAllBookmarksNode(state.treeRoot);
    return findNodeById(state.treeRoot, id) || null;
  }
  function restoreFolderWindowFromSaved(d) {
    let node = null;
    if (d.bookmarkId === ALL_ROOT_ID) {
      node = buildAllBookmarksNode(state.treeRoot);
    } else if (d.bookmarkId) {
      node = findNodeById(state.treeRoot, d.bookmarkId);
    }
    if (!node) return null;
    if (node.id !== ALL_ROOT_ID && !isFolderNode(node)) return null;
    openFolderWindow(node);
    const win = lastCreatedWindow();
    if (!win) return null;
    applySavedWindowState(win, d);
    win.navStack = (d.navStackIds || []).map(resolveSavedNodeId).filter(Boolean);
    updateNavButtons(win);
    return win;
  }
  async function restoreSavedWindows() {
    let stored = null;
    try {
      stored = await chrome.storage.local.get(STORAGE_WINDOWS_KEY);
    } catch {
      return;
    }
    const data = stored && stored[STORAGE_WINDOWS_KEY];
    if (!data || !Array.isArray(data.windows) || data.windows.length === 0) {
      return;
    }
    const seen = /* @__PURE__ */ new Set();
    const list = data.windows.filter((d) => {
      const key = d.bookmarkId ? "b:" + d.bookmarkId : d.winType ? "t:" + d.winType : d.title === "Поиск" ? "search" : "o:" + d.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    for (const [i, d] of list.entries()) {
      let win = null;
      if (d.winType === "all-bookmarks") {
        win = await openAllBookmarksWindow();
        applySavedWindowState(win, d);
      } else if (d.winType === "notepad") {
        openNotepad();
        win = lastCreatedWindow();
        applySavedWindowState(win, d);
      } else if (d.winType === "calculator") {
        openCalculator();
        win = lastCreatedWindow();
        applySavedWindowState(win, d);
      } else if (d.winType === "weather") {
        openWeatherWindow();
        win = lastCreatedWindow();
        applySavedWindowState(win, d);
      } else if (d.winType === "calendar") {
        openCalendar();
        win = lastCreatedWindow();
        applySavedWindowState(win, d);
      } else if (!d.winType && d.title === "Поиск") {
        openSearchWindow();
        win = lastCreatedWindow();
        applySavedWindowState(win, d);
      } else if (!d.winType && d.bookmarkId) {
        win = restoreFolderWindowFromSaved(d);
      }
      if (win) win._savedIndex = i;
    }
    const target = state.windows.find(
      (w) => w._savedIndex === data.activeIndex
    );
    const visible = state.windows.filter((w) => !w.minimized);
    if (target && !target.minimized) {
      bringToFront(target.id);
    } else if (visible.length) {
      bringToFront(visible[visible.length - 1].id);
    }
    updateTaskbarButtons();
    scheduleWindowStateSave();
  }
  function startDrag(e, winData) {
    if (winData.maximized) return;
    const rect = winData.el.getBoundingClientRect();
    state.dragState = {
      winData,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      x: e.clientX,
      y: e.clientY,
      raf: null
    };
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", onDragEnd);
  }
  function onDragMove(e) {
    const d = state.dragState;
    if (!d) return;
    d.x = e.clientX;
    d.y = e.clientY;
    if (d.raf) return;
    d.raf = requestAnimationFrame(() => {
      d.raf = null;
      const x = d.x - d.offsetX;
      const y = d.y - d.offsetY;
      d.winData.el.style.left = x + "px";
      d.winData.el.style.top = Math.max(0, y) + "px";
    });
  }
  function onDragEnd() {
    const d = state.dragState;
    if (d && d.winData) {
      d.winData.x = parseInt(d.winData.el.style.left) || d.winData.x;
      d.winData.y = parseInt(d.winData.el.style.top) || d.winData.y;
    }
    state.dragState = null;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragEnd);
    scheduleWindowStateSave();
  }
  function startResize(e, winData) {
    if (winData.maximized) return;
    state.resizeState = {
      winData,
      startX: e.clientX,
      startY: e.clientY,
      startW: parseInt(winData.el.style.width),
      startH: parseInt(winData.el.style.height),
      x: e.clientX,
      y: e.clientY,
      raf: null
    };
    document.addEventListener("mousemove", onResizeMove);
    document.addEventListener("mouseup", onResizeEnd);
  }
  function onResizeMove(e) {
    const r = state.resizeState;
    if (!r) return;
    r.x = e.clientX;
    r.y = e.clientY;
    if (r.raf) return;
    r.raf = requestAnimationFrame(() => {
      r.raf = null;
      const newW = Math.max(MIN_WINDOW_W, r.startW + (r.x - r.startX));
      const newH = Math.max(MIN_WINDOW_H, r.startH + (r.y - r.startY));
      r.winData.el.style.width = newW + "px";
      r.winData.el.style.height = newH + "px";
    });
  }
  function onResizeEnd() {
    const r = state.resizeState;
    if (r && r.winData) {
      r.winData.w = parseInt(r.winData.el.style.width) || r.winData.w;
      r.winData.h = parseInt(r.winData.el.style.height) || r.winData.h;
    }
    state.resizeState = null;
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup", onResizeEnd);
    scheduleWindowStateSave();
  }
  async function loadBookmarks() {
    let tree;
    try {
      const result = await chrome.bookmarks.getTree();
      tree = result[0];
    } catch (err) {
      showEmptyState(
        "Не удалось загрузить закладки. Проверьте права расширения."
      );
      return;
    }
    state.treeRoot = tree;
    state.nodeIndex = buildNodeIndex(tree);
    renderBookmarks(tree);
  }
  function renderBookmarks(tree, force) {
    const emptyMsg = document.querySelector(".empty-desktop-msg");
    if (emptyMsg) emptyMsg.remove();
    const children = tree ? tree.children || [] : [];
    const roots = children.filter((n) => n.children && n.children.length > 0).sort(
      (a, b) => (ROOT_ORDER[a.id] ?? 99) - (ROOT_ORDER[b.id] ?? 99)
    );
    if (roots.length === 0) {
      $desktopIcons.replaceChildren();
      desktopIconsById.clear();
      showEmptyState(
        "Нет закладок. Добавьте закладки в Chrome и они появятся здесь."
      );
      return;
    }
    renderDesktopIcons(roots, force);
  }
  function showEmptyState(msg) {
    const el = document.createElement("div");
    el.className = "empty-desktop-msg";
    el.textContent = msg;
    $desktop.appendChild(el);
  }
  function findNodeById(node, id) {
    void node;
    return state.nodeIndex && state.nodeIndex.get(id) || null;
  }
  var EMPTY_FOLDER_HTML = '<div style="padding:20px;color:#808080;font-size:11px;">Папка пуста</div>';
  var desktopIconsById = /* @__PURE__ */ new Map();
  var nodeDragState = null;
  function setIconImage(img, node) {
    if (isFolderNode(node)) {
      img.src = drawFolderIcon(folderColorFor(node.id));
      return;
    }
    setFaviconImage(img, node.url, currentIconSize());
  }
  function setIconLabel(icon, node) {
    const label = icon.querySelector(".desktop-icon-label");
    if (label) label.textContent = node.title || node.url || "Без названия";
  }
  function renderDesktopIcons(roots, force) {
    const next = [];
    roots.forEach((root, rootIdx) => {
      if (rootIdx > 0) {
        const sep = document.createElement("div");
        sep.className = "desktop-row-separator";
        next.push(sep);
      }
      const items = root.children || [];
      for (const item of items) {
        if (!isVisibleNode(item)) continue;
        const existing = desktopIconsById.get(item.id);
        if (existing && !force) {
          const prev = getNodeForIcon(existing);
          setIconLabel(existing, item);
          if (!prev || prev.url !== item.url) {
            const img = existing.querySelector("img");
            if (img) setIconImage(img, item);
          }
          setNodeForIcon(existing, item);
          next.push(existing);
        } else {
          const icon = createDesktopIcon(item);
          desktopIconsById.set(item.id, icon);
          next.push(icon);
        }
      }
    });
    desktopIconsById.clear();
    for (const el of next) {
      if (!el.classList.contains("desktop-icon")) continue;
      const n = getNodeForIcon(el);
      if (n) desktopIconsById.set(n.id, el);
    }
    $desktopIcons.replaceChildren(...next);
    if (state.selectedDesktopEl && !state.selectedDesktopEl.isConnected) {
      state.selectedDesktopEl = null;
    }
  }
  function createDesktopIcon(node) {
    const div = document.createElement("div");
    div.className = "desktop-icon";
    const img = document.createElement("img");
    img.draggable = false;
    setIconImage(img, node);
    const label = document.createElement("div");
    label.className = "desktop-icon-label";
    label.textContent = node.title || node.url || "Без названия";
    div.appendChild(img);
    div.appendChild(label);
    setNodeForIcon(div, node);
    return div;
  }
  function selectDesktopIcon(el) {
    $desktopIcons.querySelectorAll(".desktop-icon.selected").forEach((d) => d.classList.remove("selected"));
    if (!el) return;
    el.classList.add("selected");
    state.selectedDesktopEl = el;
  }
  function attachDesktopIconEvents() {
    $desktopIcons.addEventListener("click", (e) => {
      const div = (
        /** @type {IconEl | null} */
        eventTargetElement(e).closest(".desktop-icon")
      );
      if (!div) return;
      const node = getNodeForIcon(div);
      if (!node) return;
      if (isSingleClickMode()) {
        const prev = Number(div.dataset.lastClick || 0);
        const now = Date.now();
        div.dataset.lastClick = String(now);
        if (now - prev < CLICK_DEBOUNCE_MS) return;
        openNode(node);
      } else {
        selectDesktopIcon(div);
      }
    });
    $desktopIcons.addEventListener("dblclick", (e) => {
      const div = (
        /** @type {IconEl | null} */
        eventTargetElement(e).closest(".desktop-icon")
      );
      if (!div) return;
      const node = getNodeForIcon(div);
      if (!node) return;
      if (!isSingleClickMode()) openNode(node);
    });
    $desktopIcons.addEventListener("auxclick", (e) => {
      const div = (
        /** @type {IconEl | null} */
        eventTargetElement(e).closest(".desktop-icon")
      );
      if (!div) return;
      const node = getNodeForIcon(div);
      if (!node) return;
      handleAuxClick(e, node);
    });
    $desktopIcons.addEventListener("contextmenu", (e) => {
      const div = (
        /** @type {IconEl | null} */
        eventTargetElement(e).closest(".desktop-icon")
      );
      if (!div) return;
      const node = getNodeForIcon(div);
      if (!node) return;
      e.preventDefault();
      selectDesktopIcon(div);
      showContextMenu(
        e.clientX,
        e.clientY,
        buildNodeContextMenuItems(node)
      );
    });
  }
  function openNode(node) {
    if (node.url) {
      window.location.href = node.url;
    } else {
      openFolderWindow(node);
    }
  }
  function openInBackgroundTab(url) {
    chrome.tabs.create({ url, active: false });
  }
  function handleAuxClick(e, node) {
    if (e.button !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    if (node && node.url) openInBackgroundTab(node.url);
  }
  function isSingleClickMode() {
    return state.settings && state.settings.clickMode === "single";
  }
  function resolveNavNode(node, tree) {
    const t = tree || state.treeRoot;
    if (!node) return null;
    if (node.id === ALL_ROOT_ID) return buildAllBookmarksNode(t);
    return findNodeById(t, node.id) || null;
  }
  function currentFolderViewMode() {
    return previewFolderViewMode || state.settings && state.settings.folderViewMode || "icons";
  }
  function setFolderViewMode(mode) {
    if (mode !== "icons" && mode !== "list") return;
    state.settings = {
      ...state.settings || DEFAULT_SETTINGS,
      folderViewMode: mode
    };
    previewFolderViewMode = null;
    saveSettings();
    applyFolderViewModeToWindows(mode);
  }
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
  function renderFolderContent(winData, node) {
    const el = winData.el;
    if (!el) return;
    let fc = el.querySelector(".folder-content");
    if (!fc) {
      const contentEl = el.querySelector(".win98-window-content");
      if (!contentEl) return;
      fc = document.createElement("div");
      fc.className = "folder-content";
      contentEl.appendChild(fc);
    }
    wireFolderBackgroundDrop(
      /** @type {HTMLElement & { _dropWired?: boolean }} */
      fc,
      winData
    );
    const items = (node.children || []).filter((n) => isVisibleNode(n));
    fc.innerHTML = "";
    const viewMode = currentFolderViewMode();
    fc.classList.toggle("folder-view-list", viewMode === "list");
    const viewBtn = (
      /** @type {HTMLElement} */
      el.querySelector('[data-nav="view"]')
    );
    if (viewBtn) {
      const target = viewMode === "list" ? "Значки" : "Список";
      const sp = viewBtn.querySelector("span");
      if (sp) sp.textContent = "Вид: " + target;
      viewBtn.title = target === "Список" ? "Переключить в режим «Список»" : "Переключить в режим «Значки»";
    }
    if (items.length === 0) {
      fc.innerHTML = EMPTY_FOLDER_HTML;
    } else {
      for (const item of items) {
        fc.appendChild(
          createFolderItem(item, node, {
            // Folders inside a window navigate the SAME window instead of opening a new one
            navigateTo: isFolderNode(item) ? (n) => navigateInWindow(winData, n) : void 0
          })
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
    const ab = (
      /** @type {HTMLInputElement} */
      el.querySelector(".win98-addressbar-input")
    );
    if (ab) ab.value = getNodePath(node, state.nodeIndex);
    const sf = el.querySelector(".win98-statusbar-field");
    if (sf) {
      const folders = items.filter(isFolderNode).length;
      const bookmarks = items.filter(isBookmarkNode).length;
      sf.textContent = node.id === ALL_ROOT_ID ? `Корневых папок: ${folders}` : `${folders} пап(ок), ${bookmarks} элемент(ов)`;
    }
    const sf2 = el.querySelector(".win98-statusbar-field2");
    if (sf2) sf2.textContent = `Объектов: ${items.length}`;
  }
  function navigateInWindow(winData, node, opts) {
    opts = opts || {};
    if (!winData || !node) return;
    if (!opts.fromHistory) {
      winData.navStack.push(winData.currentNode || null);
    }
    const target = opts.fromHistory ? node : resolveNavNode(node) || node;
    winData.currentNode = target;
    winData.bookmarkId = target.id;
    renderFolderContent(winData, target);
    updateNavButtons(winData);
    scheduleWindowStateSave();
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
    if (cur.id === ALL_ROOT_ID) return;
    if (cur.parentId && cur.parentId !== "0") {
      const parent = resolveNavNode({ id: cur.parentId });
      if (parent) {
        navigateInWindow(winData, parent);
        return;
      }
    }
    navigateInWindow(winData, buildAllBookmarksNode(state.treeRoot));
  }
  function updateNavButtons(winData) {
    const el = winData.el;
    if (!el) return;
    const back = (
      /** @type {HTMLButtonElement} */
      el.querySelector('[data-nav="back"]')
    );
    if (back) back.disabled = winData.navStack.length === 0;
    const up = (
      /** @type {HTMLButtonElement} */
      el.querySelector('[data-nav="up"]')
    );
    if (up) {
      const cur = winData.currentNode;
      up.disabled = !cur || cur.id === ALL_ROOT_ID;
    }
  }
  function openFolderWindow(node) {
    const existing = state.windows.find((w) => w.bookmarkId === node.id);
    if (existing) {
      if (existing.minimized) restoreWindow(existing.id);
      else bringToFront(existing.id);
      return;
    }
    const folderIcon = drawFolderIcon(
      folderColorFor(node.id),
      true
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
      addressbarValue: getNodePath(node, state.nodeIndex),
      content: "",
      statusbar: true,
      statusText: "",
      onCreated: (el, winData) => {
        winData.currentNode = node;
        winData.navStack = [];
        renderFolderContent(winData, node);
        updateNavButtons(winData);
        const statusBar = el.querySelector(".win98-statusbar");
        if (statusBar) {
          const objField = document.createElement("div");
          objField.className = "win98-statusbar-field win98-statusbar-field2";
          objField.textContent = "Объектов: 0";
          statusBar.appendChild(objField);
        }
        el.querySelector('[data-nav="back"]')?.addEventListener(
          "click",
          () => goBack(winData)
        );
        el.querySelector('[data-nav="up"]')?.addEventListener(
          "click",
          () => goUp(winData)
        );
        el.querySelector('[data-nav="view"]')?.addEventListener(
          "click",
          () => setFolderViewMode(
            currentFolderViewMode() === "list" ? "icons" : "list"
          )
        );
      }
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
      img.src = drawFolderIcon(folderColorFor(node.id));
    } else {
      setFaviconImage(img, node.url, currentIconSize());
    }
    const label = document.createElement("div");
    label.className = "folder-item-label";
    label.textContent = node.title || node.url || "Без названия";
    div.appendChild(img);
    div.appendChild(label);
    const openItem = () => {
      if (isFolderNode(node) && typeof options.navigateTo === "function") {
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
        div.dataset.lastClick = String(now);
        if (now - prev < CLICK_DEBOUNCE_MS) return;
        openItem();
      } else {
        const scope = div.closest(".folder-content") || document;
        scope.querySelectorAll(".folder-item.selected").forEach((d) => d.classList.remove("selected"));
        div.classList.add("selected");
      }
    });
    div.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      if (!isSingleClickMode()) {
        openItem();
      }
    });
    div.addEventListener("auxclick", (e) => handleAuxClick(e, node));
    div.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const scope = div.closest(".folder-content") || document;
      scope.querySelectorAll(".folder-item.selected").forEach((d) => d.classList.remove("selected"));
      div.classList.add("selected");
      showContextMenu(
        e.clientX,
        e.clientY,
        buildNodeContextMenuItems(node)
      );
    });
    if (!isRootFolder(node)) {
      div.draggable = true;
      div.addEventListener("dragstart", (e) => {
        nodeDragState = { id: String(node.id), sourceEl: div };
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", String(node.id));
        } catch {
        }
        div.classList.add("dragging");
      });
      div.addEventListener("dragend", () => {
        nodeDragState = null;
        clearDropHighlights();
        div.classList.remove("dragging");
      });
    }
    div.addEventListener("dragover", (e) => {
      const drag = nodeDragState;
      if (!drag || drag.id === String(node.id)) return;
      const into = isFolderNode(node) && canDropIntoFolder(drag.id, node.id);
      const nextTo = !isFolderNode(node) && canDropNextTo(drag.id, node.id);
      if (!into && !nextTo) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      clearDropTargets();
      if (into) {
        div.classList.add("drop-into");
      } else {
        div.classList.add(
          isAfterMidpoint(div, e) ? "drop-after" : "drop-before"
        );
      }
    });
    div.addEventListener("drop", (e) => {
      const drag = nodeDragState;
      if (!drag) return;
      e.preventDefault();
      e.stopPropagation();
      clearDropHighlights();
      nodeDragState = null;
      if (isFolderNode(node)) {
        if (!canDropIntoFolder(drag.id, node.id)) return;
        moveBookmarkTo(drag.id, node.id, -1);
        return;
      }
      if (!canDropNextTo(drag.id, node.id)) return;
      const parent = findNodeById(state.treeRoot, node.parentId);
      const idx = insertionIndex(
        parent,
        node.id,
        isAfterMidpoint(div, e),
        drag.id
      );
      if (idx < 0) return;
      moveBookmarkTo(drag.id, node.parentId, idx);
    });
    return div;
  }
  function clearDropTargets() {
    document.querySelectorAll(
      ".folder-item.drop-into, .folder-item.drop-before, .folder-item.drop-after, .folder-content.drop-append"
    ).forEach(
      (el) => el.classList.remove(
        "drop-into",
        "drop-before",
        "drop-after",
        "drop-append"
      )
    );
  }
  function clearDropHighlights() {
    clearDropTargets();
    document.querySelectorAll(".folder-item.dragging").forEach((el) => el.classList.remove("dragging"));
  }
  function isNodeWithin(node, ancestorId) {
    let cur = node;
    while (cur && cur.id !== ALL_ROOT_ID) {
      if (String(cur.id) === String(ancestorId)) return true;
      cur = cur.parentId ? findNodeById(state.treeRoot, cur.parentId) : null;
    }
    return false;
  }
  function canDropIntoFolder(draggedId, targetId) {
    const dragged = findNodeById(state.treeRoot, draggedId);
    const target = findNodeById(state.treeRoot, targetId);
    if (!dragged || !target || !isFolderNode(target)) return false;
    if (isRootFolder(dragged)) return false;
    if (String(dragged.id) === String(target.id)) return false;
    if (isNodeWithin(target, dragged.id)) return false;
    return true;
  }
  function canDropNextTo(draggedId, targetId) {
    const dragged = findNodeById(state.treeRoot, draggedId);
    const target = findNodeById(state.treeRoot, targetId);
    if (!dragged || !target) return false;
    if (isRootFolder(dragged) || isRootFolder(target)) return false;
    if (String(dragged.id) === String(target.id)) return false;
    if (isNodeWithin(target, dragged.id)) return false;
    return true;
  }
  function isAfterMidpoint(el, e) {
    const r = el.getBoundingClientRect();
    return e.clientY >= r.top + r.height / 2;
  }
  function insertionIndex(parent, targetId, after, draggedId) {
    const siblings = (parent && parent.children || []).filter(
      (k) => String(k.id) !== String(draggedId)
    );
    const pos = siblings.findIndex(
      (k) => String(k.id) === String(targetId)
    );
    if (pos < 0) return -1;
    return pos + (after ? 1 : 0);
  }
  function moveBookmarkTo(id, parentId, index) {
    if (!id || !parentId) return;
    const opts = { parentId: String(parentId) };
    if (typeof index === "number" && index >= 0) opts.index = index;
    chrome.bookmarks.move(String(id), opts).then(() => scheduleBookmarksRefresh()).catch(() => {
      openMessageBox(
        "Перемещение",
        "Не удалось переместить объект."
      );
    });
  }
  function wireFolderBackgroundDrop(fc, winData) {
    if (fc._dropWired) return;
    fc._dropWired = true;
    const targetParentId = () => {
      const cur = winData.currentNode;
      if (!cur || cur.id === ALL_ROOT_ID) return null;
      return cur.id;
    };
    fc.addEventListener("dragover", (e) => {
      const drag = nodeDragState;
      if (!drag) return;
      const parentId = targetParentId();
      if (!parentId || !canDropIntoFolder(drag.id, parentId)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      clearDropTargets();
      fc.classList.add("drop-append");
    });
    fc.addEventListener("dragleave", (e) => {
      if (!fc.contains(
        /** @type {Node | null} */
        e.relatedTarget
      )) {
        fc.classList.remove("drop-append");
      }
    });
    fc.addEventListener("drop", (e) => {
      const drag = nodeDragState;
      fc.classList.remove("drop-append");
      if (!drag) return;
      const parentId = targetParentId();
      e.preventDefault();
      e.stopPropagation();
      nodeDragState = null;
      if (!parentId || !canDropIntoFolder(drag.id, parentId)) return;
      moveBookmarkTo(drag.id, parentId, -1);
    });
  }
  function attachNodeDragGlobals() {
    document.addEventListener("dragend", () => {
      nodeDragState = null;
      clearDropHighlights();
    });
  }
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
    chrome.windows.create({ url, incognito: !!incognito }).catch(() => {
    });
  }
  function buildNodeContextMenuItems(node) {
    if (!node) return [];
    if (isBookmarkNode(node)) {
      return [
        { label: "Открыть", action: () => openNode(node) },
        {
          label: "Открыть в новой вкладке",
          action: () => createTab(node.url, true)
        },
        {
          label: "Открыть в фоновой вкладке",
          action: () => createTab(node.url, false)
        },
        {
          label: "Открыть в новом окне",
          action: () => openInNewWindow(node.url, false)
        },
        {
          label: "Открыть в режиме инкогнито",
          action: () => openInNewWindow(node.url, true)
        },
        { type: "separator" },
        {
          label: "Копировать адрес",
          action: () => {
            copyText(node.url);
            state.clipUrl = node.url;
          }
        },
        { type: "separator" },
        { label: "Переименовать", action: () => renameNode(node) },
        { label: "Удалить", action: () => deleteNode(node) },
        { type: "separator" },
        { label: "Свойства", action: () => openProperties(node) }
      ];
    }
    return [
      { label: "Открыть", action: () => openNode(node) },
      { type: "separator" },
      { label: "Переименовать", action: () => renameNode(node) },
      { label: "Удалить", action: () => deleteNode(node) },
      { type: "separator" },
      { label: "Свойства", action: () => openProperties(node) }
    ];
  }
  function openProperties(node) {
    const isFolder = isFolderNode(node);
    const body = document.createElement("div");
    body.className = "win98-dialog";
    const gb = document.createElement("div");
    gb.className = "win98-groupbox props-group";
    const legend = document.createElement("div");
    legend.className = "win98-groupbox-legend";
    legend.textContent = isFolder ? "Папка" : "Интернет-ярлык";
    gb.appendChild(legend);
    const row = (k, v) => {
      const r = document.createElement("div");
      r.className = "props-row";
      const kEl = document.createElement("span");
      kEl.className = "props-row-key";
      kEl.textContent = k + ":";
      const vEl = document.createElement("span");
      vEl.className = "props-row-value";
      vEl.textContent = v || "—";
      r.append(kEl, vEl);
      return r;
    };
    gb.appendChild(row("Тип", isFolder ? "Папка" : "Интернет-ярлык"));
    if (!isFolder) gb.appendChild(row("Адрес", node.url));
    gb.appendChild(row("Расположение", getNodePath(node, state.nodeIndex)));
    if (isFolder) {
      const kids = (node.children || []).filter(isVisibleNode);
      gb.appendChild(
        row(
          "Содержит",
          `${kids.filter(isFolderNode).length} пап(ок), ${kids.filter(isBookmarkNode).length} закладк(и)`
        )
      );
    }
    if (node.dateAdded) {
      gb.appendChild(row("Дата добавления", formatDateTime(node.dateAdded)));
    }
    gb.appendChild(row("Идентификатор", node.id));
    body.appendChild(gb);
    return openDialog({
      title: "Свойства: " + (node.title || "Без названия"),
      icon: isFolder ? drawFolderIcon("#c0b060", false, 16) : drawPageIcon(16),
      width: 380,
      body,
      buttons: [{ label: "OK" }]
    });
  }
  function renameNode(node) {
    openPromptDialog(
      "Переименовать",
      "Новое имя:",
      node.title || "",
      (newName) => {
        if (newName && newName !== node.title) {
          chrome.bookmarks.update(node.id, { title: newName }).catch(() => {
          });
        }
      }
    );
  }
  function deleteNode(node) {
    const folder = isFolderNode(node);
    openConfirmDialog(
      folder ? "Удалить папку" : "Удалить закладку",
      folder ? `Удалить папку «${node.title}» вместе со всем содержимым? Действие необратимо.` : `Удалить закладку «${node.title}»? Действие необратимо.`,
      () => {
        if (folder)
          chrome.bookmarks.removeTree(node.id).catch(() => {
          });
        else chrome.bookmarks.remove(node.id).catch(() => {
        });
      }
    );
  }
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
      icon: opts.icon || drawComputerIcon(16),
      width: opts.width || 340,
      height: 0,
      dialog: true,
      content: "",
      statusbar: false,
      onCreated: (el) => {
        const ce = (
          /** @type {HTMLElement} */
          el.querySelector(".win98-window-content")
        );
        ce.classList.add("win98-dialog-container");
        ce.style.background = "var(--win98-silver)";
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
          if (i === 0) {
            body.okButton = btn;
          }
        });
        ce.appendChild(body);
        ce.appendChild(btnRow);
      }
    });
    winData.okButton = body.okButton;
    requestAnimationFrame(() => {
      const el = winData.el;
      if (!el.isConnected) return;
      el.style.height = "auto";
      const natural = el.offsetHeight;
      const maxH = Math.max(160, window.innerHeight - 56);
      const h = Math.min(natural, maxH);
      el.style.height = h + "px";
      el.style.minHeight = h + "px";
      if (natural > maxH) {
        el.classList.add("win98-window--dialog-scroll");
      }
      const y = Math.max(4, Math.round((window.innerHeight - h) / 2));
      el.style.top = y + "px";
    });
    return winData;
  }
  document.addEventListener("keydown", (e) => {
    const winData = state.windows.find(
      (w) => w.dialog && !w.minimized && w.id === state.windowManager.activeWindowId
    );
    if (!winData) return;
    if (e.key === "Enter" && !eventTargetElement(e).closest("input,textarea,select,button")) {
      e.preventDefault();
      const ok = (
        /** @type {HTMLButtonElement} */
        winData.el.querySelector(".win98-dialog-buttons .win98-btn")
      );
      if (ok) ok.click();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeWindow(winData.id);
    }
  });
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
      buttons: [{ label: "OK", onClick: onConfirm }, { label: "Отмена" }]
    });
  }
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
      body,
      buttons: [{ label: "OK" }]
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
          }
        },
        { label: "Отмена" }
      ]
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (winData.okButton) winData.okButton.click();
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeWindow(winData.id);
      }
    });
    setTimeout(() => input.focus(), 50);
    return winData;
  }
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
    state.bookmarksRefreshTimer = setTimeout(refreshAllBookmarks, BOOKMARK_REFRESH_DEBOUNCE_MS);
  }
  async function refreshAllBookmarks() {
    let tree = state.treeRoot;
    try {
      tree = (await chrome.bookmarks.getTree())[0];
      state.treeRoot = tree;
      state.nodeIndex = buildNodeIndex(tree);
    } catch {
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
      if (w.bookmarkId === ALL_ROOT_ID || w.winType === "all-bookmarks") {
        const target = resolveNavNode(w.currentNode, tree);
        if (!target) {
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
        closeWindow(w.id);
        return;
      }
      w.currentNode = node;
      renderFolderContent(w, node);
      updateNavButtons(w);
    });
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
        const ce = (
          /** @type {HTMLElement} */
          el.querySelector(".win98-window-content")
        );
        ce.style.background = "var(--win98-silver)";
        const ui = buildSearchUI(winData);
        ce.appendChild(ui);
        winData.searchFilter = ui.filter;
        ui.input.focus();
      }
    });
  }
  function buildSearchUI(winData) {
    const wrap = (
      /** @type {SearchUI} */
      document.createElement("div")
    );
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
    const statusEl = () => winData.el.querySelector(".win98-statusbar-field");
    function selectRow(rowEl) {
      results.querySelectorAll(".search-result-row.selected").forEach((r) => r.classList.remove("selected"));
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
      const list = filterSearchNodes(
        state.searchNodes,
        filter,
        SEARCH_RESULT_LIMIT
      );
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
            folderColorAt(i),
            false,
            24
          );
        } else {
          setFaviconImage(img, n.url, 24, 24);
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
        st.textContent = `Найдено: ${list.length}${list.length >= SEARCH_RESULT_LIMIT ? "+" : ""}`;
    }
    function currentRowIndex() {
      return selectedRow ? Array.prototype.indexOf.call(results.children, selectedRow) : -1;
    }
    let searchTimer = null;
    input.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => renderList(input.value), SEARCH_DEBOUNCE_MS);
    });
    input.addEventListener("keydown", (e) => {
      const rows = results.querySelectorAll(".search-result-row");
      const idx = currentRowIndex();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectRow(
          rows[Math.min(rows.length - 1, Math.max(0, idx) + 1)]
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
  function refreshSearchWindow() {
    const sw = state.windows.find((w) => w.title === "Поиск");
    if (!sw) return;
    state.searchNodes = buildSearchIndex(state.treeRoot);
    if (sw.searchFilter) sw.searchFilter();
  }
  var activeContextMenu = null;
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
        el.className = "win98-context-menu-item" + (item.disabled ? " disabled" : "");
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
  function toggleStartMenu() {
    state.startMenuOpen = !state.startMenuOpen;
    $startMenu.style.display = state.startMenuOpen ? "flex" : "none";
    if (state.startMenuOpen && state.settings && state.settings.taskbarAutoHide) {
      $taskbar.classList.add("taskbar-force-show");
    }
  }
  function closeStartMenu() {
    state.startMenuOpen = false;
    $startMenu.style.display = "none";
    const flyout = document.getElementById("start-menu-flyout");
    if (flyout) flyout.style.display = "none";
    if (state.settings && state.settings.taskbarAutoHide) {
      $taskbar.classList.remove("taskbar-force-show");
    }
  }
  var CALENDAR_EVENTS_KEY = "calendarEvents";
  var ISDAYOFF_URL = "https://isdayoff.ru/api/getdata";
  var ISDAYOFF_CACHE_KEY = "isdayoffRaw";
  var EVENT_CHIP_COLORS = [
    "#0f5c8c",
    "#8a3324",
    "#6a5acd",
    "#5c7a1f",
    "#b07200",
    "#7a3b7a"
  ];
  var calendarYear = (/* @__PURE__ */ new Date()).getFullYear();
  var calendarMonth = (/* @__PURE__ */ new Date()).getMonth();
  var calendarSelected = null;
  var calendarEventsLoaded = false;
  var isdayoffMemory = /* @__PURE__ */ new Map();
  async function loadCalendarEvents() {
    try {
      const stored = await chrome.storage.local.get(CALENDAR_EVENTS_KEY);
      const arr = stored[CALENDAR_EVENTS_KEY];
      if (Array.isArray(arr)) {
        state.calendarEvents = sortEvents(
          arr.map((raw) => normalizeEvent(raw)).filter((e) => e !== null)
        );
      }
    } catch {
      state.calendarEvents = [];
    }
    calendarEventsLoaded = true;
    refreshCalendarWindow();
  }
  function saveCalendarEvents() {
    chrome.storage.local.set({ [CALENDAR_EVENTS_KEY]: state.calendarEvents }).catch(() => {
    });
  }
  function ruDayInfoFor(y, m, d) {
    return ruDayInfo(y, m, d, isdayoffMemory.get(y) ?? null);
  }
  async function ensureRuYearTransfers(year) {
    if (isdayoffMemory.has(year)) return isdayoffMemory.get(year);
    try {
      const stored = await chrome.storage.local.get(ISDAYOFF_CACHE_KEY);
      const raw = stored[ISDAYOFF_CACHE_KEY] && stored[ISDAYOFF_CACHE_KEY][year];
      if (typeof raw === "string" && raw.length > 0) {
        const parsed2 = parseIsdayoffStatus(raw, year);
        isdayoffMemory.set(year, parsed2);
        return parsed2;
      }
    } catch {
    }
    let parsed = null;
    let rawText = "";
    try {
      const res = await fetch(`${ISDAYOFF_URL}?year=${year}&country=ru`);
      if (res.ok) rawText = await res.text();
    } catch {
    }
    if (rawText) parsed = parseIsdayoffStatus(rawText, year);
    isdayoffMemory.set(year, parsed);
    if (parsed) {
      try {
        const stored = await chrome.storage.local.get(ISDAYOFF_CACHE_KEY);
        const map = stored[ISDAYOFF_CACHE_KEY] || {};
        map[year] = rawText;
        await chrome.storage.local.set({ [ISDAYOFF_CACHE_KEY]: map });
      } catch {
      }
    }
    return parsed;
  }
  function openCalendar() {
    const existing = state.windows.find((w) => w.winType === "calendar");
    if (existing) {
      renderCalendar(existing);
      if (existing.minimized) restoreWindow(existing.id);
      else bringToFront(existing.id);
      return;
    }
    if (!calendarEventsLoaded) {
      loadCalendarEvents().catch(() => {
      });
    }
    createWindow({
      winType: "calendar",
      title: "Календарь",
      icon: drawComputerIcon(16),
      width: 360,
      height: 470,
      content: "",
      statusbar: false,
      onCreated: (el, winData) => {
        el.querySelector(".win98-window-content").style.background = "var(--win98-silver)";
        renderCalendar(winData);
        ensureRuYearTransfers(calendarYear).then((transfers) => {
          if (transfers !== (isdayoffMemory.get(calendarYear) ?? null)) {
            renderCalendar(winData);
          }
        });
      }
    });
  }
  function refreshCalendarWindow() {
    const cal = state.windows.find((w) => w.winType === "calendar");
    if (cal) renderCalendar(cal);
  }
  function renderCalendar(winData) {
    const el = winData.el;
    if (!el) return;
    const ce = el.querySelector(".win98-window-content");
    if (!ce) return;
    ce.innerHTML = "";
    if (!calendarSelected) {
      const n = /* @__PURE__ */ new Date();
      calendarSelected = { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
    }
    const header = document.createElement("div");
    header.className = "cal-header";
    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "win98-btn cal-nav";
    prev.textContent = "◀";
    prev.addEventListener("click", () => {
      const p = addMonths(calendarYear, calendarMonth, -1);
      calendarYear = p.year;
      calendarMonth = p.month;
      renderCalendar(winData);
      ensureRuYearTransfers(calendarYear).then((transfers) => {
        if (transfers !== (isdayoffMemory.get(calendarYear) ?? null)) {
          renderCalendar(winData);
        }
      });
    });
    const title = document.createElement("div");
    title.className = "cal-title";
    title.textContent = monthTitle(calendarYear, calendarMonth);
    const next = document.createElement("button");
    next.type = "button";
    next.className = "win98-btn cal-nav";
    next.textContent = "▶";
    next.addEventListener("click", () => {
      const p = addMonths(calendarYear, calendarMonth, 1);
      calendarYear = p.year;
      calendarMonth = p.month;
      renderCalendar(winData);
      ensureRuYearTransfers(calendarYear).then((transfers) => {
        if (transfers !== (isdayoffMemory.get(calendarYear) ?? null)) {
          renderCalendar(winData);
        }
      });
    });
    header.append(prev, title, next);
    ce.appendChild(header);
    const grid = document.createElement("div");
    grid.className = "cal-grid";
    const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    for (const d of dayNames) {
      const cell = document.createElement("div");
      cell.className = "cal-cell cal-dow" + (d === "Сб" || d === "Вс" ? " cal-weekend" : "");
      cell.textContent = d;
      grid.appendChild(cell);
    }
    const cells = monthCells(calendarYear, calendarMonth);
    const todayDay = todayInMonth(calendarYear, calendarMonth);
    const monthEvents = eventsInMonth(state.calendarEvents, calendarYear, calendarMonth);
    for (const cell of cells) {
      if (cell === null) {
        const empty = document.createElement("div");
        empty.className = "cal-cell cal-empty";
        grid.appendChild(empty);
        continue;
      }
      const day = cell;
      const info = ruDayInfoFor(calendarYear, calendarMonth, day);
      const isToday = calendarYear === (/* @__PURE__ */ new Date()).getFullYear() && calendarMonth === (/* @__PURE__ */ new Date()).getMonth() && day === todayDay;
      const isSelected = calendarSelected && calendarSelected.y === calendarYear && calendarSelected.m === calendarMonth && calendarSelected.d === day;
      const dayEl = document.createElement("div");
      dayEl.className = "cal-cell cal-day" + (info.isDayOff ? " cal-off" : "") + (info.status === "holiday" ? " cal-holiday" : "") + (isToday ? " cal-today" : "") + (isSelected ? " cal-selected" : "");
      dayEl.dataset.y = String(calendarYear);
      dayEl.dataset.m = String(calendarMonth);
      dayEl.dataset.d = String(day);
      if (info.holidayName) dayEl.title = info.holidayName;
      const num = document.createElement("div");
      num.className = "cal-daynum";
      num.textContent = String(day);
      dayEl.appendChild(num);
      const dayEvents2 = monthEvents.filter(
        (ev) => eventCoversDay(ev, calendarYear, calendarMonth, day)
      );
      const chips = document.createElement("div");
      chips.className = "cal-chips";
      dayEvents2.slice(0, 2).forEach((ev) => {
        const chip = document.createElement("div");
        chip.className = "cal-chip";
        chip.textContent = ev.allDay ? ev.title : `${ev.startTime || ""} ${ev.title}`.trim();
        chip.style.background = EVENT_CHIP_COLORS[eventColorIndex(ev, EVENT_CHIP_COLORS.length)];
        chip.dataset.eventId = ev.id;
        chip.addEventListener("click", (e) => {
          e.stopPropagation();
          const target = state.calendarEvents.find((x) => x.id === ev.id);
          if (target) openEventDialog(winData, target);
        });
        chips.appendChild(chip);
      });
      if (dayEvents2.length > 2) {
        const more = document.createElement("div");
        more.className = "cal-chip-more";
        more.textContent = `+${dayEvents2.length - 2}`;
        chips.appendChild(more);
      }
      if (chips.children.length > 0) dayEl.appendChild(chips);
      dayEl.addEventListener("click", () => {
        calendarSelected = { y: calendarYear, m: calendarMonth, d: day };
        renderCalendar(winData);
      });
      grid.appendChild(dayEl);
    }
    ce.appendChild(grid);
    const panel = document.createElement("div");
    panel.className = "cal-panel";
    const pTitle = document.createElement("div");
    pTitle.className = "cal-panel-title";
    pTitle.textContent = formatDayTitle(
      calendarSelected.y,
      calendarSelected.m,
      calendarSelected.d
    );
    panel.appendChild(pTitle);
    const selInfo = ruDayInfoFor(
      calendarSelected.y,
      calendarSelected.m,
      calendarSelected.d
    );
    if (selInfo.holidayName) {
      const hol = document.createElement("div");
      hol.className = "cal-panel-holiday";
      hol.textContent = selInfo.holidayName;
      panel.appendChild(hol);
    }
    const list = document.createElement("div");
    list.className = "cal-panel-events";
    const dayEvents = eventsOnDay(
      state.calendarEvents,
      calendarSelected.y,
      calendarSelected.m,
      calendarSelected.d
    );
    if (dayEvents.length === 0) {
      const none = document.createElement("div");
      none.className = "cal-panel-empty";
      none.textContent = "Нет событий";
      list.appendChild(none);
    } else {
      dayEvents.forEach((ev) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "win98-btn cal-ev-item";
        const time = document.createElement("span");
        time.className = "cal-ev-time";
        time.textContent = formatEventTime(ev);
        const name = document.createElement("span");
        name.className = "cal-ev-name";
        name.textContent = ev.title;
        item.append(time, name);
        item.addEventListener("click", () => openEventDialog(winData, ev));
        list.appendChild(item);
      });
    }
    panel.appendChild(list);
    const btns = document.createElement("div");
    btns.className = "cal-panel-buttons";
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "win98-btn";
    addBtn.textContent = "Добавить событие";
    addBtn.addEventListener("click", () => {
      openEventDialog(winData, null, calendarSelected);
    });
    const todayBtn = document.createElement("button");
    todayBtn.type = "button";
    todayBtn.className = "win98-btn";
    todayBtn.textContent = "Сегодня";
    todayBtn.addEventListener("click", () => {
      const n = /* @__PURE__ */ new Date();
      calendarYear = n.getFullYear();
      calendarMonth = n.getMonth();
      calendarSelected = { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
      renderCalendar(winData);
      ensureRuYearTransfers(calendarYear).then((transfers) => {
        if (transfers !== (isdayoffMemory.get(calendarYear) ?? null)) {
          renderCalendar(winData);
        }
      });
    });
    btns.append(addBtn, todayBtn);
    panel.appendChild(btns);
    ce.appendChild(panel);
  }
  function openEventDialog(winData, event, defaultDay) {
    const body = document.createElement("div");
    body.className = "win98-dialog ev-dialog";
    const mkField = (label) => {
      const row = document.createElement("label");
      row.className = "ev-field";
      const lab = document.createElement("span");
      lab.className = "ev-label";
      lab.textContent = label;
      row.appendChild(lab);
      return { row, lab };
    };
    const titleRow = mkField("Название:");
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "win98-addressbar-input ev-input";
    titleInput.value = event ? event.title : "";
    titleRow.row.appendChild(titleInput);
    const allDayRow = document.createElement("label");
    allDayRow.className = "ev-inline";
    const allDayChk = document.createElement("input");
    allDayChk.type = "checkbox";
    allDayChk.className = "win98-checkbox";
    allDayChk.checked = event ? event.allDay : true;
    const allDayLabel = document.createElement("span");
    allDayLabel.textContent = "Весь день";
    allDayRow.append(allDayChk, allDayLabel);
    const startRow = mkField("Начало:");
    const startDate = document.createElement("input");
    startDate.type = "date";
    startDate.className = "ev-input ev-date";
    const startParsed = event ? parseDateStr(event.startDate) : null;
    startDate.value = event ? startParsed ? formatInputDate(new Date(startParsed.y, startParsed.m, startParsed.d)) : "" : defaultDay ? formatInputDate(new Date(defaultDay.y, defaultDay.m, defaultDay.d)) : formatInputDate(/* @__PURE__ */ new Date());
    const startTime = document.createElement("input");
    startTime.type = "time";
    startTime.className = "ev-input ev-time";
    startTime.value = event ? event.startTime : "";
    const endRow = mkField("Окончание:");
    const endDate = document.createElement("input");
    endDate.type = "date";
    endDate.className = "ev-input ev-date";
    const endParsed = event ? parseDateStr(event.endDate) : null;
    endDate.value = event ? endParsed ? formatInputDate(new Date(endParsed.y, endParsed.m, endParsed.d)) : "" : startDate.value;
    const endTime = document.createElement("input");
    endTime.type = "time";
    endTime.className = "ev-input ev-time";
    endTime.value = event && !event.allDay ? event.endTime : "";
    const noteRow = mkField("Заметка:");
    const noteInput = document.createElement("textarea");
    noteInput.className = "ev-input ev-note";
    noteInput.rows = 3;
    noteInput.value = event ? event.note : "";
    body.append(
      titleRow.row,
      allDayRow,
      startRow.row,
      endRow.row,
      noteRow.row
    );
    startRow.row.append(startDate, startTime);
    endRow.row.append(endDate, endTime);
    const err = document.createElement("div");
    err.className = "ev-error";
    err.style.display = "none";
    body.appendChild(err);
    const setError = (msg) => {
      err.textContent = msg;
      err.style.display = msg ? "" : "none";
    };
    const syncAllDay = () => {
      startTime.disabled = allDayChk.checked;
      endTime.disabled = allDayChk.checked;
      startDate.disabled = false;
      endDate.disabled = false;
    };
    allDayChk.addEventListener("change", syncAllDay);
    syncAllDay();
    endDate.addEventListener("input", () => {
      if (endDate.value < startDate.value) endDate.value = startDate.value;
    });
    startDate.addEventListener("input", () => {
      if (!endDate.value || endDate.value === startDate.value) {
        endDate.value = startDate.value;
      } else if (endDate.value < startDate.value) {
        endDate.value = startDate.value;
      }
    });
    const doSave = () => {
      const norm = normalizeEvent({
        id: event ? event.id : makeEventId(),
        title: titleInput.value,
        startDate: startDate.value,
        endDate: endDate.value,
        allDay: allDayChk.checked,
        startTime: allDayChk.checked ? "" : startTime.value,
        endTime: allDayChk.checked ? "" : endTime.value,
        note: noteInput.value
      });
      if (!norm || !norm.title) {
        setError("Введите название события.");
        return false;
      }
      if (event) {
        const i = state.calendarEvents.findIndex((x) => x.id === event.id);
        if (i >= 0) state.calendarEvents[i] = norm;
        else state.calendarEvents.push(norm);
      } else {
        state.calendarEvents.push(norm);
      }
      state.calendarEvents = sortEvents(state.calendarEvents);
      saveCalendarEvents();
      refreshCalendarWindow();
      return true;
    };
    const buttons = [
      { label: "OK", onClick: doSave },
      { label: "Отмена", onClick: () => {
      } }
    ];
    if (event) {
      buttons.push({
        label: "Удалить",
        onClick: () => {
          openConfirmDialog(
            "Удалить событие",
            `Удалить «${event.title}»?`,
            () => {
              state.calendarEvents = state.calendarEvents.filter(
                (x) => x.id !== event.id
              );
              saveCalendarEvents();
              refreshCalendarWindow();
            }
          );
        }
      });
    }
    const evDialog = openDialog({
      title: event ? "Изменить событие" : "Новое событие",
      body,
      width: 380,
      buttons
    });
    body.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && eventTargetElement(e) !== noteInput) {
        e.preventDefault();
        if (doSave()) closeWindow(evDialog.id);
      }
    });
  }
  $desktop.addEventListener("click", (e) => {
    if (e.target === $desktop || e.target === $desktopIcons) {
      document.querySelectorAll(".desktop-icon.selected").forEach((d) => d.classList.remove("selected"));
    }
    hideContextMenu();
    closeStartMenu();
  });
  $desktop.addEventListener("contextmenu", (e) => {
    if (eventTargetElement(e).closest(".desktop-icon")) return;
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      { label: "Обновить", action: () => refreshAllBookmarks() },
      { type: "separator" },
      {
        label: "Создать папку",
        action: () => {
          openPromptDialog(
            "Создать папку",
            "Имя новой папки:",
            "",
            (name) => {
              if (name)
                chrome.bookmarks.create({ parentId: "1", title: name }).catch(() => {
                });
            }
          );
        }
      },
      {
        label: "Вставить",
        disabled: !state.clipUrl,
        action: () => {
          if (!state.clipUrl) return;
          let title = "";
          try {
            title = new URL(state.clipUrl).hostname;
          } catch {
          }
          chrome.bookmarks.create({
            parentId: "1",
            title: title || state.clipUrl,
            url: state.clipUrl
          }).catch(() => {
          });
        }
      },
      { type: "separator" },
      {
        label: "Открыть все закладки",
        action: () => openAllBookmarksWindow()
      },
      { type: "separator" },
      {
        label: "Настройки",
        action: () => openSettingsWindow()
      }
    ]);
  });
  var clockClicks = 0;
  var clockCalendarTimer = null;
  $clock.addEventListener("click", () => {
    clockClicks++;
    clearTimeout(clockCalendarTimer);
    if (clockClicks >= 10) {
      clockClicks = 0;
      clearTimeout(clockCalendarTimer);
      const cal = state.windows.find((w) => w.winType === "calendar");
      if (cal) closeWindow(cal.id);
      openMessageBox("Внимание", "Ты старый", "icons/pc_icon.png");
      return;
    }
    clockCalendarTimer = setTimeout(() => {
      clockClicks = 0;
      clockCalendarTimer = null;
      openCalendar();
    }, 300);
  });
  $startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleStartMenu();
  });
  $menuAllBookmarks.addEventListener("click", () => {
    closeStartMenu();
    openAllBookmarksWindow();
  });
  document.getElementById("menu-settings").addEventListener("click", () => {
    closeStartMenu();
    openSettingsWindow();
  });
  document.getElementById("menu-search").addEventListener("click", () => {
    closeStartMenu();
    openSearchWindow();
  });
  $launcherNotepad.addEventListener("click", () => openNotepad());
  var $showDesktopBtn = document.getElementById("show-desktop-btn");
  if ($showDesktopBtn) {
    let collapsedWindows = null;
    $showDesktopBtn.addEventListener("click", () => {
      const visible = state.windows.filter((w) => !w.minimized);
      if (visible.length > 0) {
        collapsedWindows = visible.map((w) => w.id);
        visible.forEach((w) => minimizeWindow(w.id));
        $showDesktopBtn.classList.add("active");
        $showDesktopBtn.title = "Развернуть все окна";
      } else if (collapsedWindows && collapsedWindows.length > 0) {
        collapsedWindows.forEach((id) => restoreWindow(id));
        collapsedWindows = null;
        $showDesktopBtn.classList.remove("active");
        $showDesktopBtn.title = "Свернуть все окна";
      }
    });
  }
  var $menuPrograms = document.getElementById("menu-programs");
  var $menuProgramsImg = (
    /** @type {HTMLImageElement | null} */
    document.getElementById("menu-programs-img")
  );
  var $flyout = document.getElementById("start-menu-flyout");
  if ($menuProgramsImg) {
    $menuProgramsImg.src = drawFolderIcon("#c89644", false);
  }
  var flyoutTimer = null;
  function showFlyout() {
    clearTimeout(flyoutTimer);
    if ($flyout) $flyout.style.display = "block";
  }
  function hideFlyoutDelayed() {
    flyoutTimer = setTimeout(() => {
      if ($flyout) $flyout.style.display = "none";
    }, 200);
  }
  if ($menuPrograms) {
    $menuPrograms.addEventListener("mouseenter", showFlyout);
    $menuPrograms.addEventListener("mouseleave", hideFlyoutDelayed);
    $menuPrograms.addEventListener("click", (e) => {
      e.stopPropagation();
      showFlyout();
    });
  }
  if ($flyout) {
    $flyout.addEventListener("mouseenter", showFlyout);
    $flyout.addEventListener("mouseleave", hideFlyoutDelayed);
    $flyout.addEventListener("click", (e) => {
      const item = (
        /** @type {HTMLElement | null} */
        eventTargetElement(e).closest(".start-menu-flyout-item")
      );
      if (!item || !item.dataset.action) return;
      closeStartMenu();
      const actionMap = {
        notepad: openNotepad,
        calculator: openCalculator,
        "all-bookmarks": openAllBookmarksWindow
      };
      const action = actionMap[item.dataset.action];
      if (action) action();
    });
  }
  $taskbar.addEventListener("contextmenu", (e) => {
    if (eventTargetElement(e).closest("#start-btn")) return;
    e.preventDefault();
    const visible = state.windows.filter((w) => !w.minimized);
    showContextMenu(e.clientX, e.clientY, [
      {
        label: "Каскад окон",
        disabled: visible.length === 0,
        action: () => cascadeWindows(visible)
      },
      {
        label: "Стопкой",
        disabled: visible.length === 0,
        action: () => tileWindows(visible)
      },
      { type: "separator" },
      { label: "Свойства панели задач", action: openTaskbarProperties }
    ]);
  });
  function cascadeWindows(wins) {
    if (!wins.length) return;
    state.windowManager.cascade(window.innerWidth, window.innerHeight);
    applyWindowManagerLayout();
    scheduleWindowStateSave();
  }
  function tileWindows(wins) {
    if (!wins.length) return;
    state.windowManager.tile(window.innerWidth, window.innerHeight);
    applyWindowManagerLayout();
    scheduleWindowStateSave();
  }
  function applyWindowManagerLayout() {
    state.windows.forEach((w) => {
      if (!w.el) return;
      w.el.classList.remove("maximized");
      w.el.style.left = w.x + "px";
      w.el.style.top = w.y + "px";
      w.el.style.width = w.w + "px";
      w.el.style.height = w.h + "px";
    });
    syncActiveWindowVisuals();
  }
  function openTaskbarProperties() {
    const body = document.createElement("div");
    body.className = "win98-dialog";
    const makeCheck = (label, key) => {
      const wrap = document.createElement("div");
      wrap.className = "win98-dialog-row";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!(state.settings && state.settings[key]);
      cb.id = "taskbar-prop-" + key;
      const lbl = document.createElement("label");
      lbl.htmlFor = cb.id;
      lbl.textContent = " " + label;
      wrap.append(cb, lbl);
      return { wrap, cb, key };
    };
    const checks = [
      makeCheck("Автоскрытие панели задач", "taskbarAutoHide"),
      makeCheck("Мелкие значки на панели задач", "taskbarSmallIcons"),
      makeCheck("Показывать часы", "showClock")
    ];
    checks.forEach((c) => body.appendChild(c.wrap));
    openDialog({
      title: "Свойства панели задач",
      width: 320,
      body,
      buttons: [
        {
          label: "OK",
          onClick: () => {
            checks.forEach((c) => {
              state.settings[c.key] = c.cb.checked;
            });
            saveSettings();
            applyTaskbarSettings();
          }
        },
        { label: "Отмена" }
      ]
    });
  }
  document.addEventListener("mousemove", (e) => {
    if (state.settings && state.settings.taskbarAutoHide) {
      if (e.clientY >= window.innerHeight - 6) {
        $taskbar.classList.add("taskbar-force-show");
      }
    }
  });
  $taskbar.addEventListener("mouseleave", () => {
    if (state.settings && state.settings.taskbarAutoHide && !state.startMenuOpen) {
      $taskbar._hideTimer = setTimeout(
        () => $taskbar.classList.remove("taskbar-force-show"),
        300
      );
    }
  });
  $taskbar.addEventListener(
    "mouseenter",
    () => clearTimeout($taskbar._hideTimer)
  );
  var marqueeEl = null;
  var marqueeStart = null;
  function deselectAllDesktopIcons() {
    $desktopIcons.querySelectorAll(".desktop-icon.selected").forEach((d) => d.classList.remove("selected"));
    state.selectedDesktopEl = null;
  }
  function selectIconsInRect(rect) {
    deselectAllDesktopIcons();
    $desktopIcons.querySelectorAll(".desktop-icon").forEach((icon) => {
      if (!getNodeForIcon(icon)) return;
      const r = icon.getBoundingClientRect();
      if (r.right < rect.left || r.left > rect.right || r.bottom < rect.top || r.top > rect.bottom) {
        return;
      }
      icon.classList.add("selected");
    });
  }
  function onMarqueeMove(e) {
    if (!marqueeStart) return;
    const dx = e.clientX - marqueeStart.x;
    const dy = e.clientY - marqueeStart.y;
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4 && !marqueeEl) return;
    if (!marqueeEl) {
      marqueeEl = document.createElement("div");
      marqueeEl.className = "desktop-marquee";
      document.body.appendChild(marqueeEl);
    }
    const x = Math.min(marqueeStart.x, e.clientX);
    const y = Math.min(marqueeStart.y, e.clientY);
    marqueeEl.style.left = x + "px";
    marqueeEl.style.top = y + "px";
    marqueeEl.style.width = Math.abs(dx) + "px";
    marqueeEl.style.height = Math.abs(dy) + "px";
    selectIconsInRect(marqueeEl.getBoundingClientRect());
  }
  function onMarqueeUp() {
    document.removeEventListener("mousemove", onMarqueeMove);
    document.removeEventListener("mouseup", onMarqueeUp);
    marqueeStart = null;
    if (marqueeEl) {
      marqueeEl.remove();
      marqueeEl = null;
    }
  }
  $desktop.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (eventTargetElement(e).closest(".desktop-icon")) return;
    if (eventTargetElement(e).closest(".win98-window")) return;
    marqueeStart = { x: e.clientX, y: e.clientY };
    document.addEventListener("mousemove", onMarqueeMove);
    document.addEventListener("mouseup", onMarqueeUp);
  });
  document.addEventListener("click", (e) => {
    if (!eventTargetElement(e).closest("#start-menu") && !eventTargetElement(e).closest("#start-btn")) {
      closeStartMenu();
    }
    if (!eventTargetElement(e).closest(".win98-context-menu")) {
      hideContextMenu();
    }
  });
  function desktopRowLength() {
    const size = currentIconSize();
    const gap = state.settings && state.settings.iconGap || DEFAULT_SETTINGS.iconGap;
    return Math.max(
      1,
      Math.floor($desktopIcons.clientWidth / (size + gap + 28))
    );
  }
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А")) {
      e.preventDefault();
      openSearchWindow();
      return;
    }
    if (e.key === "Escape") {
      if (state.startMenuOpen) closeStartMenu();
      hideContextMenu();
      return;
    }
    const tag = document.activeElement && document.activeElement.tagName || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON")
      return;
    const all = Array.from(
      document.querySelectorAll("#desktop-icons .desktop-icon")
    );
    const sel = state.selectedDesktopEl;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
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
    const node = sel ? getNodeForIcon(sel) : void 0;
    if (e.key === "Enter" && node) {
      e.preventDefault();
      openNode(node);
      return;
    }
    if (e.altKey && e.key === "Enter" && node) {
      e.preventDefault();
      openProperties(node);
      return;
    }
    if ((e.key === "Delete" || e.key === "Del") && node) {
      e.preventDefault();
      deleteNode(node);
      return;
    }
    if (e.ctrlKey && (e.key === "c" || e.key === "C" || e.key === "с" || e.key === "С") && node && node.url) {
      copyText(node.url);
      state.clipUrl = node.url;
    }
  });
  function openAllBookmarksWindow() {
    const existing = state.windows.find(
      (w) => w.winType === "all-bookmarks"
    );
    if (existing) {
      if (existing.minimized) restoreWindow(existing.id);
      else bringToFront(existing.id);
      return Promise.resolve(existing);
    }
    return new Promise((resolve) => {
      chrome.bookmarks.getTree((tree) => {
        state.treeRoot = tree[0];
        state.nodeIndex = buildNodeIndex(tree[0]);
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
        const win = createWindow({
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
              () => goBack(winData)
            );
            el.querySelector('[data-nav="up"]')?.addEventListener(
              "click",
              () => goUp(winData)
            );
            el.querySelector('[data-nav="refresh"]')?.addEventListener(
              "click",
              () => {
                chrome.bookmarks.getTree((t) => {
                  state.treeRoot = t[0];
                  state.nodeIndex = buildNodeIndex(t[0]);
                  const target = resolveNavNode(
                    winData.currentNode,
                    t[0]
                  );
                  if (target)
                    navigateInWindow(winData, target, {
                      fromHistory: true
                    });
                  else updateNavButtons(winData);
                });
              }
            );
            el.querySelector('[data-nav="view"]')?.addEventListener(
              "click",
              () => setFolderViewMode(
                currentFolderViewMode() === "list" ? "icons" : "list"
              )
            );
          }
        });
        resolve(win);
      });
    });
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
    applyTaskbarSettings();
    updateClock();
  }
  function applyTheme(src) {
    const s = src || state.settings || DEFAULT_SETTINGS;
    const el = document.documentElement;
    const themeId = s.theme || DEFAULT_SETTINGS.theme;
    themeResetKeys().forEach((name) => el.style.removeProperty(name));
    const colors = themeColorsFor(themeId, s.customColors || {});
    if (!colors) return;
    Object.entries(colors).forEach(([name, value]) => {
      if (value) el.style.setProperty(name, value);
    });
  }
  function applyDesktopStyle(src) {
    applyTheme(src);
    const s = src || state.settings || DEFAULT_SETTINGS;
    const el = document.documentElement;
    el.style.setProperty(
      "--win98-icon-size",
      (s.iconSize || DEFAULT_SETTINGS.iconSize) + "px"
    );
    el.style.setProperty(
      "--win98-label-size",
      (s.labelSize ?? DEFAULT_SETTINGS.labelSize) + "px"
    );
    el.style.setProperty(
      "--win98-icon-gap",
      (s.iconGap ?? DEFAULT_SETTINGS.iconGap) + "px"
    );
    el.style.setProperty(
      "--win98-desktop-pad-x",
      (s.desktopPadX ?? DEFAULT_SETTINGS.desktopPadX) + "px"
    );
    el.style.setProperty(
      "--win98-desktop-pad-y",
      (s.desktopPadY ?? DEFAULT_SETTINGS.desktopPadY) + "px"
    );
    el.style.setProperty(
      "--win98-label-shadow",
      s.iconLabelShadow ? "1px 1px 1px rgba(0,0,0,0.7)" : "none"
    );
    el.style.setProperty(
      "--win98-font",
      s.uiFont || DEFAULT_SETTINGS.uiFont
    );
  }
  function saveSettings() {
    return chrome.storage.local.set({ settings: state.settings }).catch(() => {
    });
  }
  function applyTaskbarSettings() {
    const s = state.settings || DEFAULT_SETTINGS;
    $taskbar.classList.toggle("taskbar-small", !!s.taskbarSmallIcons);
    $clock.style.display = s.showClock !== false ? "" : "none";
    if (s.taskbarAutoHide) {
      $taskbar.classList.add("taskbar-autohide");
    } else {
      $taskbar.classList.remove("taskbar-autohide");
      $taskbar.classList.remove("taskbar-force-show");
    }
  }
  function resolveImageSize(dataUrl) {
    if (!state.wallpaperSizeCache) state.wallpaperSizeCache = /* @__PURE__ */ new Map();
    let pending = state.wallpaperSizeCache.get(dataUrl);
    if (!pending) {
      pending = new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      });
      state.wallpaperSizeCache.set(dataUrl, pending);
    }
    return pending;
  }
  function applyWallpaper(wp) {
    wp = wp || state.settings && state.settings.wallpaper || DEFAULT_SETTINGS.wallpaper;
    const desk = document.getElementById("desktop");
    desk.style.backgroundPosition = "0 0";
    if (wp.type !== "color" && wp.imageData) {
      desk.style.backgroundImage = `url(${wp.imageData})`;
      desk.style.backgroundColor = wp.color || "#008080";
      const sty = wp.imageStyle || "tile";
      const scale = clampInt(Math.round(wp.scale || 100), 10, 500) / 100;
      const applyTileOrCenter = (size) => {
        if (size && scale !== 1) {
          const w = Math.max(1, Math.round(size.w * scale));
          const h = Math.max(1, Math.round(size.h * scale));
          desk.style.backgroundSize = `${w}px ${h}px`;
        } else {
          desk.style.backgroundSize = "auto";
        }
        desk.style.backgroundRepeat = sty === "tile" ? "repeat" : "no-repeat";
        desk.style.backgroundPosition = sty === "center" ? "center center" : "0 0";
      };
      if (sty === "stretch") {
        desk.style.backgroundSize = "100% 100%";
        desk.style.backgroundRepeat = "no-repeat";
      } else if (scale !== 1) {
        desk.style.backgroundSize = "auto";
        resolveImageSize(wp.imageData).then(applyTileOrCenter);
      } else {
        applyTileOrCenter(null);
      }
    } else {
      desk.style.backgroundImage = "none";
      desk.style.backgroundColor = wp.color || "#008080";
      desk.style.backgroundSize = "auto";
      desk.style.backgroundRepeat = "repeat";
    }
  }
  function openSettingsWindow() {
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
        const contentEl = (
          /** @type {HTMLElement} */
          el.querySelector(".win98-window-content")
        );
        contentEl.style.background = "var(--win98-silver)";
        contentEl.appendChild(
          buildSettingsForm(pending, () => settingsWinId)
        );
      }
    });
  }
  function buildSettingsForm(pending, getWinId) {
    const form = document.createElement("form");
    form.className = "win98-form";
    form.addEventListener("submit", (e) => e.preventDefault());
    let uiType = pending.wallpaper.uiType || (pending.wallpaper.type === "color" ? "color" : "file");
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
      { id: "about", label: "О системе" }
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
      tabBar.querySelectorAll(".win98-tab").forEach(
        (b) => b.classList.toggle("active", b.dataset.tab === id)
      );
      panels.querySelectorAll(".win98-tabpanel").forEach(
        (p) => p.classList.toggle("active", p.dataset.tabPanel === id)
      );
    }
    selectTab("wp");
    const commit = () => {
      if (uiType !== "color" && !pending.wallpaper.imageData) {
        setMsg(
          uiType === "url" ? "Укажите адрес изображения и нажмите «Скачать»." : "Выберите файл изображения."
        );
        return;
      }
      previewFolderStyle = null;
      previewFolderViewMode = null;
      state.settings = pending;
      _clearIconCache();
      applyDesktopStyle();
      saveSettings();
      updateClock();
      updateWeather();
      renderBookmarks(state.treeRoot, true);
      refreshOpenFolderWindows(state.treeRoot);
      const id = getWinId();
      if (id) closeWindow(id);
    };
    const cancel = () => {
      previewFolderStyle = null;
      previewFolderViewMode = null;
      _clearIconCache();
      applyWallpaper(state.settings.wallpaper);
      applyDesktopStyle();
      updateClock();
      renderBookmarks(state.treeRoot, true);
      refreshOpenFolderWindows(state.treeRoot);
      const id = getWinId();
      if (id) closeWindow(id);
    };
    const buildThemeGroup = (a, livePreview) => {
      const box = document.createElement("div");
      box.className = "win98-groupbox";
      const legend = document.createElement("div");
      legend.className = "win98-groupbox-legend";
      legend.textContent = "Тема";
      box.appendChild(legend);
      const customBox = document.createElement("div");
      CUSTOM_THEME_KEYS.forEach((k) => {
        const row = document.createElement("div");
        row.className = "wp-style-row";
        row.style.justifyContent = "space-between";
        const cap = document.createElement("span");
        cap.textContent = k.label;
        const swatch = document.createElement("input");
        swatch.type = "color";
        swatch.className = "wp-color-picker";
        swatch.value = a.customColors[k.css] || k.def;
        swatch.addEventListener("input", () => {
          a.customColors = a.customColors || {};
          a.customColors[k.css] = swatch.value;
          livePreview(a);
        });
        row.append(cap, swatch);
        customBox.appendChild(row);
      });
      const curTheme = THEME_OPTIONS.some((t) => t.id === a.theme) ? a.theme : DEFAULT_SETTINGS.theme;
      customBox.style.display = curTheme === "custom" ? "block" : "none";
      THEME_OPTIONS.forEach((t) => {
        const lbl = document.createElement("label");
        lbl.className = "win98-radio";
        lbl.style.alignItems = "flex-start";
        const rad = document.createElement("input");
        rad.type = "radio";
        rad.name = "theme";
        rad.value = t.id;
        rad.checked = curTheme === t.id;
        const txt = document.createElement("span");
        const title = document.createElement("span");
        title.style.fontWeight = "bold";
        title.style.display = "block";
        title.textContent = t.label;
        const desc = document.createElement("span");
        desc.style.color = "var(--win98-dark-gray)";
        desc.style.fontSize = "10px";
        desc.textContent = t.desc;
        txt.append(title, desc);
        rad.addEventListener("change", () => {
          if (!rad.checked) return;
          a.theme = t.id;
          customBox.style.display = t.id === "custom" ? "block" : "none";
          livePreview(a);
        });
        lbl.append(rad, txt);
        box.appendChild(lbl);
      });
      box.appendChild(customBox);
      return box;
    };
    const wg = document.createElement("div");
    wg.className = "win98-groupbox";
    const wgLegend = document.createElement("div");
    wgLegend.className = "win98-groupbox-legend";
    wgLegend.textContent = "Обои";
    wg.appendChild(wgLegend);
    const colorRow = document.createElement("label");
    colorRow.className = "win98-radio";
    const colorRadio = document.createElement("input");
    colorRadio.type = "radio";
    colorRadio.name = "wp-type";
    colorRadio.value = "color";
    colorRadio.checked = uiType === "color";
    const colorSpan = document.createElement("span");
    colorSpan.textContent = "Цвет фона:";
    const colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.className = "wp-color-picker";
    colorPicker.value = pending.wallpaper.color || "#008080";
    colorRow.append(colorRadio, colorSpan, colorPicker);
    wg.appendChild(colorRow);
    const fileRow = document.createElement("div");
    fileRow.className = "win98-radio-row";
    const fileRadio = document.createElement("input");
    fileRadio.type = "radio";
    fileRadio.name = "wp-type";
    fileRadio.value = "file";
    fileRadio.checked = uiType === "file";
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
    const urlRow = document.createElement("div");
    urlRow.className = "win98-radio-row";
    const urlRadio = document.createElement("input");
    urlRadio.type = "radio";
    urlRadio.name = "wp-type";
    urlRadio.value = "url";
    urlRadio.checked = uiType === "url";
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
    const scaleRow = document.createElement("div");
    scaleRow.className = "wp-scale-row";
    const scaleLabel = document.createElement("label");
    scaleLabel.className = "wp-scale-label";
    scaleLabel.textContent = "Масштаб:";
    const scaleSlider = document.createElement("input");
    scaleSlider.type = "range";
    scaleSlider.min = "10";
    scaleSlider.max = "500";
    scaleSlider.step = "10";
    scaleSlider.className = "win98-range";
    scaleSlider.value = String(
      clampInt(Math.round(pending.wallpaper.scale || 100), 10, 500)
    );
    scaleSlider.disabled = uiType === "color";
    const scaleValue = document.createElement("span");
    scaleValue.className = "wp-scale-value";
    scaleValue.textContent = scaleSlider.value + "%";
    scaleRow.append(scaleLabel, scaleSlider, scaleValue);
    wg.appendChild(scaleRow);
    const preview = document.createElement("div");
    preview.className = "wp-preview";
    const previewImg = document.createElement("div");
    previewImg.className = "wp-preview-img";
    preview.appendChild(previewImg);
    wg.appendChild(preview);
    const msg = document.createElement("div");
    msg.className = "settings-msg";
    wg.appendChild(msg);
    tabPanels.wp.appendChild(wg);
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
      document.createTextNode("Открывать одним кликом")
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
      document.createTextNode("Открывать двойным кликом")
    );
    mg.append(singleLbl, doubleLbl);
    tabPanels.behavior.appendChild(mg);
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
          applyDesktopStyle(pending);
        }
      });
      sizeRow.appendChild(lbl);
    });
    vg.appendChild(sizeRow);
    const fg = document.createElement("div");
    fg.className = "win98-groupbox";
    const fgLegend = document.createElement("div");
    fgLegend.className = "win98-groupbox-legend";
    fgLegend.textContent = "Иконки папок";
    fg.appendChild(fgLegend);
    const curFolderStyle = FOLDER_STYLES.some(
      (s) => s.id === pending.folderIconStyle
    ) ? pending.folderIconStyle : DEFAULT_SETTINGS.folderIconStyle;
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
        _clearIconCache();
        renderBookmarks(state.treeRoot, true);
      });
      lbl.append(rad, prev, sp);
      fg.appendChild(lbl);
    });
    vg.appendChild(fg);
    const fm = document.createElement("div");
    fm.className = "win98-groupbox";
    const fmLegend = document.createElement("div");
    fmLegend.className = "win98-groupbox-legend";
    fmLegend.textContent = "Ссылки в папках";
    fm.appendChild(fmLegend);
    const VIEW_MODE_LABELS = [
      { id: "icons", label: "Значки" },
      { id: "list", label: "Список" }
    ];
    const curViewMode = pending.folderViewMode === "list" ? "list" : "icons";
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
        previewFolderViewMode = m.id;
        refreshOpenFolderWindows(state.treeRoot);
      });
      fm.appendChild(lbl);
    });
    vg.appendChild(fm);
    const ufg = document.createElement("div");
    ufg.className = "win98-groupbox";
    const ufgLegend = document.createElement("div");
    ufgLegend.className = "win98-groupbox-legend";
    ufgLegend.textContent = "Шрифт интерфейса";
    ufg.appendChild(ufgLegend);
    const curFont = UI_FONTS.some((f) => f.value === pending.uiFont) ? pending.uiFont : DEFAULT_SETTINGS.uiFont;
    UI_FONTS.forEach((f) => {
      const lbl = document.createElement("label");
      lbl.className = "win98-radio";
      const rad = document.createElement("input");
      rad.type = "radio";
      rad.name = "ui-font";
      rad.value = f.value;
      if (curFont === f.value) rad.checked = true;
      const sp = document.createElement("span");
      sp.style.fontFamily = f.value;
      sp.textContent = f.label;
      rad.addEventListener("change", () => {
        if (!rad.checked) return;
        pending.uiFont = f.value;
        applyDesktopStyle(pending);
      });
      lbl.append(rad, sp);
      ufg.appendChild(lbl);
    });
    vg.appendChild(ufg);
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
        applyDesktopStyle(pending);
      });
      row.append(cap, inp);
      return row;
    };
    vg.appendChild(makeNumRow("Размер текста, пкс", "labelSize", 9, 18));
    vg.appendChild(
      makeNumRow("Расстояние между иконками, пкс", "iconGap", 0, 32)
    );
    vg.appendChild(
      makeNumRow("Отступ сверху и снизу, пкс", "desktopPadY", 0, 64)
    );
    vg.appendChild(
      makeNumRow("Отступ слева и справа, пкс", "desktopPadX", 0, 64)
    );
    tabPanels.appearance.appendChild(
      buildThemeGroup(pending, applyDesktopStyle)
    );
    tabPanels.appearance.appendChild(vg);
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
        "Тени для подписей значков на рабочем столе"
      )
    );
    shadowLbl.addEventListener("change", () => {
      pending.iconLabelShadow = shadowCb.checked;
      applyDesktopStyle(pending);
    });
    lg.appendChild(shadowLbl);
    tabPanels.appearance.appendChild(lg);
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
    const abg = document.createElement("div");
    abg.className = "win98-groupbox";
    const abgLegend = document.createElement("div");
    abgLegend.className = "win98-groupbox-legend";
    abgLegend.textContent = "О системе";
    abg.appendChild(abgLegend);
    const aboutTitle = document.createElement("div");
    aboutTitle.className = "about-title";
    aboutTitle.textContent = "Win98 Bookmarks Desktop";
    const aboutDesc = document.createElement("div");
    aboutDesc.className = "about-desc";
    aboutDesc.textContent = "Дополнение для Chrome, превращающее новую вкладку в рабочий стол Windows 98: закладки и папки отображаются значками на рабочем столе, двойной клик открывает окна, поиск и настройки — в меню «Пуск».";
    const aboutRows = document.createElement("div");
    aboutRows.className = "about-rows";
    [
      ["Автор", "Herman Guilliman"],
      ["Год", "2026"],
      ["Поддержка", "hermanguilliman@proton.me"]
    ].forEach(([k, v]) => {
      const row = document.createElement("div");
      row.className = "about-row";
      const kEl = document.createElement("span");
      kEl.className = "about-row-key";
      kEl.textContent = k + ":";
      const vEl = document.createElement("span");
      vEl.className = "about-row-value";
      vEl.textContent = v;
      row.append(kEl, vEl);
      aboutRows.appendChild(row);
    });
    abg.append(aboutTitle, aboutDesc, aboutRows);
    tabPanels.about.appendChild(abg);
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
    const updateEnabled = () => {
      fileBtn.disabled = uiType !== "file";
      urlInput.disabled = uiType !== "url";
      dlBtn.disabled = uiType !== "url";
      styleRow.querySelectorAll("input").forEach((r) => r.disabled = uiType === "color");
      scaleSlider.disabled = uiType === "color";
    };
    const renderPreview = () => {
      const isImg = uiType !== "color" && pending.wallpaper.imageData;
      previewImg.style.backgroundImage = isImg ? `url(${pending.wallpaper.imageData})` : "none";
      previewImg.style.backgroundColor = pending.wallpaper.color || "#008080";
      const sty = pending.wallpaper.imageStyle || "tile";
      const scale = clampInt(Math.round(pending.wallpaper.scale || 100), 10, 500) / 100;
      const applyStyle = (size) => {
        if (sty === "stretch") {
          previewImg.style.backgroundSize = "100% 100%";
          previewImg.style.backgroundRepeat = "no-repeat";
          previewImg.style.backgroundPosition = "0 0";
          return;
        }
        if (size && scale !== 1) {
          previewImg.style.backgroundSize = `${Math.max(1, Math.round(size.w * scale))}px ${Math.max(1, Math.round(size.h * scale))}px`;
        } else {
          previewImg.style.backgroundSize = "auto";
        }
        previewImg.style.backgroundRepeat = sty === "tile" ? "repeat" : "no-repeat";
        previewImg.style.backgroundPosition = sty === "center" ? "center center" : "0 0";
      };
      if (isImg && scale !== 1) {
        applyStyle(null);
        resolveImageSize(pending.wallpaper.imageData).then(applyStyle);
      } else {
        applyStyle(null);
      }
    };
    const setMsg = (text, isError = true) => {
      msg.textContent = text || "";
      msg.classList.toggle("settings-error", isError);
      msg.classList.toggle("settings-success", !isError);
    };
    const liveApply = () => applyWallpaper(pending.wallpaper);
    [colorRadio, fileRadio, urlRadio].forEach((r) => {
      r.addEventListener("change", () => {
        if (!r.checked) return;
        uiType = r.value;
        pending.wallpaper.type = uiType === "color" ? "color" : "image";
        pending.wallpaper.uiType = uiType;
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
        pending.wallpaper.uiType = "file";
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
        pending.wallpaper.uiType = "url";
        uiType = "url";
        urlRadio.checked = true;
        updateEnabled();
        renderPreview();
        liveApply();
        setMsg("Обои скачаны и сохранены локально. Нажмите OK.", false);
      } catch (err) {
        setMsg(
          "Не удалось загрузить: сервер не разрешает доступ (CORS) или адрес неверный."
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
    scaleSlider.addEventListener("input", () => {
      pending.wallpaper.scale = clampInt(
        Math.round(+scaleSlider.value || 100),
        10,
        500
      );
      scaleValue.textContent = scaleSlider.value + "%";
      renderPreview();
      liveApply();
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
    updateEnabled();
    renderPreview();
    return form;
  }
  var NOTEPAD_STORAGE_KEY = "notepadText";
  var NOTEPAD_SAVE_DEBOUNCE_MS = 500;
  var notepadSaveTimer = 0;
  var notepadTextLoaded = false;
  var notepadText = "";
  var notepadTextarea = null;
  async function loadNotepadText() {
    try {
      const stored = await chrome.storage.local.get(NOTEPAD_STORAGE_KEY);
      notepadText = typeof stored[NOTEPAD_STORAGE_KEY] === "string" ? stored[NOTEPAD_STORAGE_KEY] : "";
    } catch {
      notepadText = "";
    }
    notepadTextLoaded = true;
  }
  function scheduleNotepadSave() {
    clearTimeout(notepadSaveTimer);
    notepadSaveTimer = setTimeout(flushNotepadSave, NOTEPAD_SAVE_DEBOUNCE_MS);
  }
  function flushNotepadSave() {
    clearTimeout(notepadSaveTimer);
    notepadSaveTimer = 0;
    const text = notepadTextarea ? notepadTextarea.value : notepadText;
    notepadText = text;
    chrome.storage.local.set({ [NOTEPAD_STORAGE_KEY]: text }).catch(() => {
    });
  }
  function openNotepad() {
    const existing = state.windows.find((w) => w.winType === "notepad");
    if (existing) {
      if (existing.minimized) restoreWindow(existing.id);
      else bringToFront(existing.id);
      return;
    }
    createWindow({
      winType: "notepad",
      title: "Блокнот",
      icon: "icons/notepad.png",
      width: 500,
      height: 380,
      content: `
        <div class="notepad-menubar">
          <button type="button" class="notepad-menu-btn" data-notepad-menu="file">Файл</button>
          <button type="button" class="notepad-menu-btn" data-notepad-menu="edit">Правка</button>
          <button type="button" class="notepad-menu-btn" data-notepad-menu="help">Справка</button>
        </div>
        <textarea class="notepad-textarea" spellcheck="false" wrap="off"></textarea>`,
      statusbar: true,
      statusText: "Готово",
      onCreated: (el, winData) => initNotepadWindow(el, winData)
    });
  }
  function initNotepadWindow(el, winData) {
    el.classList.add("notepad-window");
    const ta = el.querySelector(".notepad-textarea");
    const statusField = el.querySelector(".win98-statusbar-field");
    notepadTextarea = ta;
    const updateStatus = () => updateNotepadStatus(ta, statusField);
    let userTyped = false;
    if (!notepadTextLoaded) {
      loadNotepadText().then(() => {
        if (!userTyped) ta.value = notepadText;
        updateStatus();
      });
    } else {
      ta.value = notepadText;
    }
    ta.addEventListener("input", () => {
      userTyped = true;
      scheduleNotepadSave();
      updateStatus();
    });
    ta.addEventListener("keyup", updateStatus);
    ta.addEventListener("click", updateStatus);
    ta.addEventListener("keydown", (e) => {
      if (e.ctrlKey && (e.key.toLowerCase() === "s" || e.key.toLowerCase() === "ы")) {
        e.preventDefault();
        flushNotepadSave();
        statusField.textContent = "Сохранено";
        setTimeout(updateStatus, 1200);
      }
    });
    el.querySelectorAll(".notepad-menu-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (activeContextMenu && activeContextMenu._notepadOpener === btn) {
          hideContextMenu();
          return;
        }
        const rect = btn.getBoundingClientRect();
        showContextMenu(
          rect.left,
          rect.bottom,
          notepadMenuItems(btn.dataset.notepadMenu, {
            winData,
            ta,
            statusField
          })
        );
        if (activeContextMenu) {
          activeContextMenu._notepadOpener = btn;
        }
      });
    });
    setTimeout(() => ta.focus(), 50);
  }
  function updateNotepadStatus(ta, field) {
    const text = ta.value;
    const pos = ta.selectionStart;
    const line = text.slice(0, pos).split("\n").length;
    const col = pos - text.lastIndexOf("\n", pos - 1);
    field.textContent = `Стр: ${line}, Стб: ${col}`;
  }
  function notepadMenuItems(menuId, ctx) {
    const { winData, ta, statusField } = ctx;
    const flashSaved = () => {
      statusField.textContent = "Сохранено";
      setTimeout(() => updateNotepadStatus(ta, statusField), 1200);
    };
    const clearAll = () => {
      ta.value = "";
      flushNotepadSave();
      updateNotepadStatus(ta, statusField);
    };
    if (menuId === "file") {
      return [
        {
          label: "Новый",
          action: () => {
            if (ta.value.trim()) {
              openConfirmDialog("Блокнот", "Очистить содержимое?", clearAll);
            } else {
              clearAll();
            }
          }
        },
        { type: "separator" },
        {
          label: "Сохранить",
          action: () => {
            flushNotepadSave();
            flashSaved();
          }
        },
        { type: "separator" },
        { label: "Закрыть", action: () => closeWindow(winData.id) }
      ];
    }
    if (menuId === "edit") {
      return [{ label: "Выделить всё", action: () => ta.select() }];
    }
    return [
      {
        label: "О программе",
        action: () => openMessageBox(
          "О программе",
          "Блокнот — простые заметки с автосохранением.",
          "icons/notepad.png"
        )
      }
    ];
  }
  function openCalculator() {
    const existing = state.windows.find(
      (w) => w.winType === "calculator"
    );
    if (existing) {
      if (existing.minimized) restoreWindow(existing.id);
      else bringToFront(existing.id);
      return;
    }
    createWindow({
      winType: "calculator",
      title: "Калькулятор",
      icon: drawCalcIcon(),
      width: 250,
      height: 322,
      statusbar: false,
      content: `
              <div class="calc-display" id="calc-display">0</div>
              <div class="calc-keys">
                <button data-key="MC">MC</button><button data-key="MR">MR</button><button data-key="MS">MS</button><button data-key="M+" class="calc-span2">M+</button>
                <button data-key="Back" class="calc-span2">Back</button><button data-key="CE">CE</button><button data-key="C">C</button>
                <button data-key="sqrt">√</button><button data-key="7">7</button><button data-key="8">8</button><button data-key="9">9</button><button data-key="/">/</button>
                <button data-key="%">%</button><button data-key="4">4</button><button data-key="5">5</button><button data-key="6">6</button><button data-key="*">*</button>
                <button data-key="1/x">1/x</button><button data-key="1">1</button><button data-key="2">2</button><button data-key="3">3</button><button data-key="-">-</button>
                <button data-key="±">±</button><button data-key="0">0</button><button data-key=".">.</button><button data-key="+">+</button><button data-key="=">=</button>
              </div>`,
      onCreated: (el, winData) => {
        el.classList.add("calc-window");
        initCalcWindow(el, winData);
      }
    });
  }
  function initCalcWindow(el, winData) {
    const calc = {
      display: "0",
      acc: null,
      op: null,
      fresh: true,
      error: false,
      mem: 0
    };
    el._calc = calc;
    const displayEl = el.querySelector("#calc-display");
    const render = () => {
      displayEl.textContent = calc.display;
    };
    el.querySelector(".calc-keys").addEventListener("click", (e) => {
      const btn = (
        /** @type {HTMLElement | null} */
        eventTargetElement(e).closest("button[data-key]")
      );
      if (!btn) return;
      calcInput(calc, btn.dataset.key);
      render();
    });
    const onKey = (e) => {
      if (state.windowManager.activeWindowId !== winData.id) return;
      const map = { Escape: "C", Backspace: "Back", Enter: "=" };
      const k = map[e.key] || e.key;
      if (/^[0-9.]$/.test(k) || ["+", "-", "*", "/", "%", "="].includes(k)) {
        e.preventDefault();
        calcInput(calc, k);
        render();
      }
    };
    el._calcKeyHandler = onKey;
    document.addEventListener("keydown", onKey);
  }
  function calcInput(calc, key) {
    if (calc.error && key !== "C" && key !== "CE") {
      calcInput(calc, "C");
    }
    const num = () => {
      const v = parseFloat(calc.display);
      return Number.isFinite(v) ? v : 0;
    };
    const fmt = (v) => {
      if (!Number.isFinite(v)) return "Ошибка";
      return String(parseFloat(v.toPrecision(12)));
    };
    if (/^[0-9]$/.test(key)) {
      if (calc.error) return;
      if (calc.fresh) {
        calc.display = key;
        calc.fresh = false;
      } else {
        calc.display = (calc.display === "0" ? "" : calc.display) + key;
      }
      if (calc.display.length > 16) calc.display = calc.display.slice(0, 16);
    } else if (key === ".") {
      if (calc.error) return;
      if (calc.fresh) {
        calc.display = "0.";
        calc.fresh = false;
      } else if (!calc.display.includes(".")) {
        calc.display += ".";
      }
    } else if (["+", "-", "*", "/"].includes(key)) {
      if (calc.acc !== null && calc.op && !calc.fresh) {
        const res = evalOp(calc.acc, num(), calc.op);
        if (res === null) {
          calc.error = true;
          calc.display = "Ошибка";
          return;
        }
        calc.acc = res;
        calc.display = fmt(res);
      } else {
        calc.acc = num();
      }
      calc.op = key;
      calc.fresh = true;
    } else if (key === "=") {
      if (calc.error) return;
      if (calc.acc !== null && calc.op) {
        const res = evalOp(calc.acc, num(), calc.op);
        if (res === null) {
          calc.error = true;
          calc.display = "Ошибка";
          return;
        }
        calc.display = fmt(res);
        calc.acc = null;
        calc.op = null;
      }
      calc.fresh = true;
    } else if (key === "C") {
      Object.assign(calc, {
        display: "0",
        acc: null,
        op: null,
        fresh: true,
        error: false
      });
    } else if (key === "CE") {
      calc.display = "0";
      calc.fresh = true;
      calc.error = false;
    } else if (key === "Back") {
      if (calc.fresh || calc.error) return;
      calc.display = calc.display.length > 1 ? calc.display.slice(0, -1) : "0";
      if (calc.display === "-") calc.display = "0";
    } else if (key === "sqrt") {
      const v = num();
      if (v < 0) {
        calc.error = true;
        calc.display = "Ошибка";
        return;
      }
      calc.display = fmt(Math.sqrt(v));
      calc.fresh = true;
    } else if (key === "%") {
      if (calc.acc !== null && calc.op) {
        calc.display = fmt(calc.acc * num() / 100);
      }
      calc.fresh = true;
    } else if (key === "1/x") {
      const v = num();
      if (v === 0) {
        calc.error = true;
        calc.display = "Ошибка";
        return;
      }
      calc.display = fmt(1 / v);
      calc.fresh = true;
    } else if (key === "±") {
      if (calc.error) return;
      if (calc.display !== "0") {
        calc.display = calc.display.startsWith("-") ? calc.display.slice(1) : "-" + calc.display;
      }
    } else if (key === "MC") {
      calc.mem = 0;
    } else if (key === "MR") {
      calc.display = fmt(calc.mem);
      calc.fresh = true;
    } else if (key === "MS") {
      calc.mem = num();
    } else if (key === "M+") {
      calc.mem += num();
    }
  }
  function init() {
    updateClock({});
    setTimeout(() => {
      updateClock();
      setInterval(updateClock, CLOCK_INTERVAL_MS);
    }, CLOCK_INTERVAL_MS - Date.now() % CLOCK_INTERVAL_MS);
    attachDesktopIconEvents();
    attachBookmarkListeners();
    attachNodeDragGlobals();
    updateWeather();
    loadSettings().then(prepareFaviconCache).then(loadBookmarks).then(() => restoreSavedWindows());
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
