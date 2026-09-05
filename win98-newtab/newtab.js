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
  };

  /* ---------- Default settings ---------- */
  const DEFAULT_SETTINGS = {
    clickMode: "double",
    wallpaper: {
      type: "color",
      color: "#008080",
      imageData: null,
      imageStyle: "tile",
    },
  };

  /* ---------- DOM Refs ---------- */
  const $desktop = document.getElementById("desktop");
  const $desktopIcons = document.getElementById("desktop-icons");
  const $windowsContainer = document.getElementById("windows-container");
  const $taskbarWindows = document.getElementById("taskbar-windows");
  const $startBtn = document.getElementById("start-btn");
  const $startMenu = document.getElementById("start-menu");
  const $clock = document.getElementById("clock");
  const $menuAllBookmarks = document.getElementById("menu-all-bookmarks");

  /* ============================================================
     ICON GENERATION (Canvas → DataURL)
     ============================================================ */

  /** Draw a classic Win98 folder icon */
  function drawFolderIcon(color = "#d4c044", open = false) {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext("2d");

    if (open) {
      // Back flap
      ctx.fillStyle = shadeColor(color, -30);
      ctx.fillRect(2, 8, 28, 22);
      // Tab
      ctx.fillStyle = color;
      ctx.fillRect(2, 6, 14, 5);
      // Front
      ctx.fillStyle = color;
      ctx.fillRect(2, 10, 28, 20);
      // Highlight
      ctx.fillStyle = shadeColor(color, 30);
      ctx.fillRect(4, 12, 24, 2);
      // Shadow
      ctx.fillStyle = shadeColor(color, -40);
      ctx.fillRect(4, 28, 24, 2);
      ctx.fillRect(28, 12, 2, 18);
    } else {
      // Tab
      ctx.fillStyle = color;
      ctx.fillRect(2, 4, 14, 5);
      // Back
      ctx.fillStyle = shadeColor(color, -30);
      ctx.fillRect(2, 8, 28, 22);
      // Front
      ctx.fillStyle = color;
      ctx.fillRect(2, 9, 28, 21);
      // Highlight
      ctx.fillStyle = shadeColor(color, 30);
      ctx.fillRect(4, 10, 24, 2);
      // Inner shadow
      ctx.fillStyle = shadeColor(color, -20);
      ctx.fillRect(4, 28, 24, 2);
      ctx.fillRect(28, 11, 2, 19);
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
  function drawPageIcon() {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext("2d");

    // Page background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(4, 2, 22, 28);
    // Page border
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.strokeRect(4.5, 2.5, 21, 27);
    // Corner fold
    ctx.fillStyle = "#c0c0c0";
    ctx.beginPath();
    ctx.moveTo(20, 2);
    ctx.lineTo(26, 8);
    ctx.lineTo(20, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(20, 2);
    ctx.lineTo(20, 8);
    ctx.lineTo(26, 8);
    ctx.stroke();
    // Text lines
    ctx.fillStyle = "#000000";
    for (let i = 0; i < 4; i++) {
      const w = i === 3 ? 12 : 16;
      ctx.fillRect(7, 12 + i * 4, w, 1.5);
    }

    return c.toDataURL();
  }

  /** Generate a favicon URL from bookmark URL */
  function getFaviconUrl(url) {
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
    } catch {
      return null;
    }
  }

  /** Color palette for folders */
  const FOLDER_COLORS = [
    "#d4c044", "#c8a032", "#a0c844",
    "#64a0c8", "#c86464", "#64c864",
    "#c89644", "#9664c8", "#c864a0",
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

  /* ============================================================
     CLOCK
     ============================================================ */
  function updateClock() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    $clock.textContent = `${h}:${m}`;
  }

  /* ============================================================
     WINDOW MANAGEMENT
     ============================================================ */

  function createWindow(opts) {
    const id = ++state.windowIdCounter;
    const w = opts.width || 500;
    const h = opts.height || 400;
    const x = opts.x ?? Math.max(20, 80 + (state.windows.length % 6) * 28);
    const y = opts.y ?? Math.max(20, 40 + (state.windows.length % 6) * 28);

    const winData = {
      id,
      title: opts.title || "Window",
      icon: opts.icon || drawPageIcon(),
      x, y, w, h,
      minimized: false,
      maximized: false,
      prevBounds: null,
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
    el.querySelector('[data-action="minimize"]').addEventListener("click", () => minimizeWindow(id));
    el.querySelector('[data-action="maximize"]').addEventListener("click", () => toggleMaximize(id));
    el.querySelector('[data-action="close"]').addEventListener("click", () => closeWindow(id));

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
    document.querySelectorAll(".taskbar-win-btn").forEach((b) => b.classList.remove("active"));
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
      showEmptyState("Не удалось загрузить закладки. Проверьте права расширения.");
      return;
    }

    const children = tree.children || [];
    // Chrome root IDs are always: 1=Bar, 2=Other, 3=Mobile
    const ROOT_ORDER = { "1": 0, "2": 1, "3": 2 };
    const roots = children
      .filter((n) => n.children && n.children.length > 0)
      .sort((a, b) => (ROOT_ORDER[a.id] ?? 99) - (ROOT_ORDER[b.id] ?? 99));

    if (roots.length === 0 && countAllBookmarks(tree) === 0) {
      showEmptyState("Нет закладок. Добавьте закладки в Chrome и они появятся здесь.");
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

  /* ============================================================
     DESKTOP ICONS RENDERING
     ============================================================ */

  let colorIdx = 0;

  function renderDesktopIcons(roots) {
    $desktopIcons.innerHTML = "";
    colorIdx = 0;

    for (const root of roots) {
      const items = root.children || [];
      for (const item of items) {
        const icon = createDesktopIcon(item);
        $desktopIcons.appendChild(icon);
      }
    }
  }

  function createDesktopIcon(node) {
    const div = document.createElement("div");
    div.className = "desktop-icon";

    const isFolder = !node.url;

    // Create icon image
    const img = document.createElement("img");
    img.draggable = false;

    if (isFolder) {
      img.src = drawFolderIcon(FOLDER_COLORS[colorIdx % FOLDER_COLORS.length]);
      colorIdx++;
    } else {
      // Try favicon, fallback to page icon
      const favUrl = getFaviconUrl(node.url);
      if (favUrl) {
        img.src = favUrl;
        img.onerror = () => { img.src = drawPageIcon(); };
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

    // Right-click context menu
    div.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectDesktopIcon(div);
      showContextMenu(e.clientX, e.clientY, [
        { label: "Открыть", action: () => openNode(node) },
        { type: "separator" },
        { label: "Копировать ссылку", action: () => {
          if (node.url) navigator.clipboard.writeText(node.url);
        }, disabled: !node.url },
      ]);
    });

    return div;
  }

  function selectDesktopIcon(el) {
    document.querySelectorAll(".desktop-icon.selected").forEach((d) => d.classList.remove("selected"));
    el.classList.add("selected");
  }

  /** Open a bookmark node (URL → navigate, folder → window) */
  function openNode(node) {
    if (node.url) {
      window.location.href = node.url;
    } else {
      openFolderWindow(node);
    }
  }

  /** Current click mode from settings */
  function isSingleClickMode() {
    return state.settings && state.settings.clickMode === "single";
  }

  /* ============================================================
     FOLDER WINDOW
     ============================================================ */

  function openFolderWindow(node) {
    const folderIcon = drawFolderIcon(FOLDER_COLORS[colorIdx % FOLDER_COLORS.length], true);

    const content = document.createElement("div");
    content.className = "folder-content";

    const items = node.children || [];
    if (items.length === 0) {
      content.innerHTML = '<div style="padding:20px;color:#808080;font-size:11px;">Папка пуста</div>';
    } else {
      for (const item of items) {
        content.appendChild(createFolderItem(item, node));
      }
    }

    const childCount = items.filter((i) => !i.url).length;
    const itemCount = items.filter((i) => i.url).length;

    const toolbarHtml = `
      <button class="win98-toolbar-btn" data-nav="back" disabled>
        <span>← Назад</span>
      </button>
      <button class="win98-toolbar-btn" data-nav="up" data-parent="${node.parentId || ""}">
        <span>⬆ Вверх</span>
      </button>
    `;

    createWindow({
      title: node.title || "Папка",
      icon: folderIcon,
      width: 550,
      height: 400,
      toolbar: toolbarHtml,
      addressbarValue: getNodePath(node),
      content: content.outerHTML,
      statusbar: true,
      statusText: `${childCount} пап(ок), ${itemCount} элемент(ов)`,
      onCreated: (el) => {
        // Re-attach folder item events
        const folderContent = el.querySelector(".folder-content");
        if (folderContent) {
          folderContent.innerHTML = "";
          for (const item of items) {
            folderContent.appendChild(createFolderItem(item, node));
          }
          if (items.length === 0) {
            folderContent.innerHTML = '<div style="padding:20px;color:#808080;font-size:11px;">Папка пуста</div>';
          }
        }

        // Toolbar nav
        el.querySelector('[data-nav="back"]')?.addEventListener("click", () => {
          // Go back — find parent
          if (node.parentId) {
            chrome.bookmarks.get(node.parentId, (results) => {
              if (results && results[0]) openFolderWindow(results[0]);
            });
          }
        });
        el.querySelector('[data-nav="up"]')?.addEventListener("click", () => {
          if (node.parentId) {
            chrome.bookmarks.get(node.parentId, (results) => {
              if (results && results[0]) openFolderWindow(results[0]);
            });
          }
        });
      },
    });
  }

  function createFolderItem(node, parentNode) {
    const div = document.createElement("div");
    div.className = "folder-item";

    const isFolder = !node.url;
    const img = document.createElement("img");
    img.draggable = false;

    if (isFolder) {
      img.src = drawFolderIcon(FOLDER_COLORS[colorIdx % FOLDER_COLORS.length]);
      colorIdx++;
    } else {
      const favUrl = getFaviconUrl(node.url);
      if (favUrl) {
        img.src = favUrl;
        img.onerror = () => { img.src = drawPageIcon(); };
      } else {
        img.src = drawPageIcon();
      }
    }

    const label = document.createElement("div");
    label.className = "folder-item-label";
    label.textContent = node.title || node.url || "Без названия";

    div.appendChild(img);
    div.appendChild(label);

    div.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isSingleClickMode()) {
        const prev = Number(div.dataset.lastClick || 0);
        const now = Date.now();
        div.dataset.lastClick = now;
        if (now - prev < 350) return; // part of a double-click
        openNode(node);
      } else {
        document.querySelectorAll(".folder-item.selected").forEach((d) => d.classList.remove("selected"));
        div.classList.add("selected");
      }
    });

    div.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      if (!isSingleClickMode()) {
        openNode(node);
      }
    });

    div.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll(".folder-item.selected").forEach((d) => d.classList.remove("selected"));
      div.classList.add("selected");
      showContextMenu(e.clientX, e.clientY, [
        { label: "Открыть", action: () => openNode(node) },
        { type: "separator" },
        { label: "Копировать ссылку", action: () => {
          if (node.url) navigator.clipboard.writeText(node.url);
        }, disabled: !node.url },
      ]);
    });

    return div;
  }

  function getNodePath(node) {
    // Build a simple path string from the node title
    const parts = [];
    let current = node;
    while (current && current.title) {
      parts.unshift(current.title);
      if (current.parentId) {
        // Synchronous would need cache, just show title
        break;
      }
      break;
    }
    return parts.join(" > ") || "/";
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

    // Adjust if off-screen
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menu.style.left = (x - rect.width) + "px";
      }
      if (rect.bottom > window.innerHeight - 28) {
        menu.style.top = (y - rect.height) + "px";
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
      document.querySelectorAll(".desktop-icon.selected").forEach((d) => d.classList.remove("selected"));
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
      { label: "Открыть все закладки", action: () => openAllBookmarksWindow() },
    ]);
  });

  // Start button
  $startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleStartMenu();
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

  // Close menus on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#start-menu") && !e.target.closest("#start-btn")) {
      closeStartMenu();
    }
    if (!e.target.closest(".win98-context-menu")) {
      hideContextMenu();
    }
  });

  /* ============================================================
     ALL BOOKMARKS WINDOW
     ============================================================ */

  function openAllBookmarksWindow() {
    // Check if already open
    const existing = state.windows.find((w) => w.title === "Все закладки");
    if (existing) {
      if (existing.minimized) restoreWindow(existing.id);
      else bringToFront(existing.id);
      return;
    }

    chrome.bookmarks.getTree((tree) => {
      const content = document.createElement("div");
      content.className = "folder-content";

      function renderNode(node, container) {
        if (!node.children) return;
        for (const child of node.children) {
          if (child.children) {
            // Folder
            const item = document.createElement("div");
            item.className = "folder-item";
            const img = document.createElement("img");
            img.src = drawFolderIcon(FOLDER_COLORS[colorIdx % FOLDER_COLORS.length]);
            colorIdx++;
            img.draggable = false;
            const label = document.createElement("div");
            label.className = "folder-item-label";
            label.textContent = child.title || "Без названия";
            item.appendChild(img);
            item.appendChild(label);
            item.addEventListener("click", (e) => {
              e.stopPropagation();
              if (isSingleClickMode()) {
                const prev = Number(item.dataset.lastClick || 0);
                const now = Date.now();
                item.dataset.lastClick = now;
                if (now - prev < 350) return;
                openNode(child);
              } else {
                container.querySelectorAll(".folder-item.selected").forEach((d) => d.classList.remove("selected"));
                item.classList.add("selected");
              }
            });
            item.addEventListener("dblclick", (e) => {
              e.stopPropagation();
              if (!isSingleClickMode()) openNode(child);
            });
            container.appendChild(item);
          } else if (child.url) {
            // Bookmark
            const item = document.createElement("div");
            item.className = "folder-item";
            const img = document.createElement("img");
            const favUrl = getFaviconUrl(child.url);
            img.src = favUrl || drawPageIcon();
            if (favUrl) img.onerror = () => { img.src = drawPageIcon(); };
            img.draggable = false;
            const label = document.createElement("div");
            label.className = "folder-item-label";
            label.textContent = child.title || child.url;
            item.appendChild(img);
            item.appendChild(label);
            item.addEventListener("click", (e) => {
              e.stopPropagation();
              if (isSingleClickMode()) {
                const prev = Number(item.dataset.lastClick || 0);
                const now = Date.now();
                item.dataset.lastClick = now;
                if (now - prev < 350) return;
                openNode(child);
              } else {
                container.querySelectorAll(".folder-item.selected").forEach((d) => d.classList.remove("selected"));
                item.classList.add("selected");
              }
            });
            item.addEventListener("dblclick", (e) => {
              e.stopPropagation();
              if (!isSingleClickMode()) openNode(child);
            });
            container.appendChild(item);
          }
        }
      }

      for (const root of tree[0].children || []) {
        renderNode(root, content);
      }

      createWindow({
        title: "Все закладки",
        icon: drawFolderIcon("#d4c044", true),
        width: 650,
        height: 450,
        toolbar: `
          <button class="win98-toolbar-btn" id="ab-refresh"><span>🔄 Обновить</span></button>
        `,
        content: content.outerHTML,
        statusbar: true,
        statusText: `Загрузка...`,
        onCreated: (el, winData) => {
          // Re-render content
          const fc = el.querySelector(".folder-content");
          if (fc) {
            fc.innerHTML = "";
            chrome.bookmarks.getTree((t) => {
              for (const root of t[0].children || []) {
                renderNode(root, fc);
              }
              const total = fc.querySelectorAll(".folder-item").length;
              const sf = el.querySelector(".win98-statusbar-field");
              if (sf) sf.textContent = `Всего: ${total} элементов`;
            });
          }

          el.querySelector("#ab-refresh")?.addEventListener("click", () => {
            closeWindow(winData.id);
            openAllBookmarksWindow();
          });
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
    if (partial.wallpaper) {
      const wp = partial.wallpaper;
      if (wp.type === "color" || wp.type === "image") base.wallpaper.type = wp.type;
      if (typeof wp.color === "string") base.wallpaper.color = wp.color;
      if (typeof wp.imageData === "string") base.wallpaper.imageData = wp.imageData;
      if (["stretch", "tile", "center"].includes(wp.imageStyle)) base.wallpaper.imageStyle = wp.imageStyle;
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
  }

  function saveSettings() {
    return chrome.storage.local.set({ settings: state.settings }).catch(() => {});
  }

  /** Apply wallpaper to the desktop background */
  function applyWallpaper(wp) {
    wp = wp || (state.settings && state.settings.wallpaper) || DEFAULT_SETTINGS.wallpaper;
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
      height: 480,
      content: "",
      statusbar: false,
      onCreated: (el, winData) => {
        settingsWinId = winData.id;
        const contentEl = el.querySelector(".win98-window-content");
        contentEl.style.background = "var(--win98-silver)";
        contentEl.appendChild(buildSettingsForm(pending, () => settingsWinId));
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

    const commit = () => {
      state.settings = pending;
      saveSettings();
      const id = getWinId();
      if (id) closeWindow(id);
    };

    const cancel = () => {
      applyWallpaper(state.settings.wallpaper);
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

    form.appendChild(wg);

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
    singleLbl.append(singleRadio, document.createTextNode("Открывать одним кликом"));

    const doubleLbl = document.createElement("label");
    doubleLbl.className = "win98-radio";
    const doubleRadio = document.createElement("input");
    doubleRadio.type = "radio";
    doubleRadio.name = "click-mode";
    doubleRadio.value = "double";
    if (pending.clickMode === "double") doubleRadio.checked = true;
    doubleLbl.append(doubleRadio, document.createTextNode("Открывать двойным кликом"));

    mg.append(singleLbl, doubleLbl);
    form.appendChild(mg);

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
      styleRow.querySelectorAll("input").forEach((r) => (r.disabled = uiType === "color"));
    };

    const renderPreview = () => {
      const isImg = uiType !== "color" && pending.wallpaper.imageData;
      previewImg.style.backgroundImage = isImg ? `url(${pending.wallpaper.imageData})` : "none";
      previewImg.style.backgroundColor = pending.wallpaper.color || "#008080";
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
        setMsg("Не удалось загрузить: сервер не разрешает доступ (CORS) или адрес неверный.");
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

  /* ============================================================
     INIT
     ============================================================ */

  function init() {
    updateClock();
    setInterval(updateClock, 10000);
    loadSettings().then(loadBookmarks);
  }

  // Start
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
