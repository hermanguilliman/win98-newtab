# AGENTS.md

## What this is

A single Chrome **Manifest V3** extension (`win98-newtab/`) that replaces the new-tab page with a Windows 98-style desktop of the user's Chrome bookmarks. Plain static files — no build, bundler, package.json, tests, or CI. JS is one IIFE (`newtab.js`); no modules.

## Verify / run

- After any change: reload the extension at `chrome://extensions/` (Developer mode → Load unpacked → the `win98-newtab` folder), then open a new tab.
- Syntax check (there is no test runner): `node --check win98-newtab/newtab.js` and validate JSON with `ConvertFrom-Json` / `JSON.parse`.
- The extension only runs inside the new-tab context; testing navigation/opening behaviors requires bookmark permission to be granted.

## Non-obvious architecture facts

- **Bookmark root grouping**: Chrome root folder IDs are fixed regardless of UI language — `1`=Панель закладок (Bar), `2`=Другие (Other), `3`=Мобильные (Mobile). `newtab.js` sorts by `ROOT_ORDER = {1,2,3}` and inserts a full-width `.desktop-row-separator` between groups so each group starts on a new row. Any unknown/custom root is sorted to the end.
- **All folder + page + shortcut icons are generated at runtime on `<canvas>`** (`drawFolderIcon`, `drawPageIcon`) or fetched as Google favicons (`getFaviconUrl` → `https://www.google.com/s2/favicons?domain=...&sz=...`). Icon size is driven by the `--win98-icon-size` CSS variable **set on `document.documentElement` (`<html>`)**, not per-icon — so it cascades into opened folder windows and the «Все закладки» window too. Never hardcode icon px in markup; keep `currentIconSize()` / variable wiring. The same CSS-variable pattern also drives other desktop layout settings (label size `--win98-label-size`, icon gap `--win98-icon-gap`, desktop padding `--win98-desktop-pad-x/y`) — all applied together by `applyDesktopStyle()`.
- **Live sync**: the whole bookmark tree is cached in `state.treeRoot` (re-read on every `chrome.bookmarks` event — `onCreated/onRemoved/onChanged/onMoved`). `scheduleBookmarksRefresh()` debounces (250 ms) into `refreshAllBookmarks()`, which re-renders the desktop (`renderBookmarks`) and every open folder window whose `winData.bookmarkId` matches a node (`refreshOpenFolderWindows`). Folder windows are tagged with `bookmarkId` via `createWindow` opts; windows whose folder was deleted are closed automatically.
- **Separator nodes** (`url: ""`, no children) exist in the bookmarks tree and must never render — always filter with `isVisibleNode()` (`isFolderNode` = has `children` array AND no url; `isBookmarkNode` = has url).
- **Settings live in `chrome.storage.local` under key `"settings"`**. To add a setting, update ALL of: `DEFAULT_SETTINGS`, `mergeSettings()` (whitelist — unknown/old values are dropped, use `structuredClone` of defaults), and the settings-window UI in `buildSettingsForm()`. Stored keys must survive reloads. The settings window is **tabbed** (`.win98-tabs` / `.win98-tabpanel` in `buildSettingsForm`): tabs are «Обои», «Поведение», «Вид» — new setting groups go into the fitting `tabPanels.<id>` panel (or add a new tab def + panel), and OK/Отмена buttons stay outside the panels so they are always visible.
- **Settings window is single-instance** — guarded by `state.windows.find(w => w.title === "Настройки")`; same pattern used for «Все закладки» and «Поиск». Windows are managed entirely in JS (`createWindow`/`bringToFront`/`closeWindow`), taskbar buttons and titlebar wiring are rebuilt per window.
- **Node operations** (open variants, copy, rename, delete) live in one place: `buildNodeContextMenuItems(node)` builds the right-click items for any bookmark/folder, reused by desktop icons, folder windows and search results. Rename/delete prompt with Win98-style child dialogs (`openDialog`/`openPromptDialog`/`openConfirmDialog`); all bookmarks mutations go through the `chrome.bookmarks.*` API so live sync keeps the UI consistent.
- **Search window** flattens the cached tree with `buildSearchIndex()` into `state.searchNodes`; `Ctrl+F` and the «Поиск» start-menu item open it; results are re-filtered on `input` (ranked: title-starts-with > title-contains > url-starts-with > url-contains) and kept fresh by `refreshSearchWindow()` on bookmark events.
- **Wallpaper by remote URL** uses `fetch(..., { mode: "cors" })` and is stored locally as a data URL; servers without CORS headers will fail to download — mention file upload as the fallback when this comes up.
- **Click mode** (single vs double) is handled in `createDesktopIcon`, `createFolderItem` (used by folder windows AND the «Все закладки» renderer — no third copy anymore) and the search results, with a ~350 ms debounce guard; all must stay in sync, driven by `isSingleClickMode()`.
- Permissions required: `bookmarks`, `storage`, `unlimitedStorage` (the latter because wallpaper images are stored as data URLs in local storage).

## Conventions

- UI copy and this project are **Russian** — keep new labels/messages in Russian.
- Commit messages: conventional commits in English (`feat:`, `fix:`, `docs:`, `chore:`). Repo already has a git history on `master`.
- Styling must stay in the Win98 3D-border language defined in `win98.css` (outset/inset borders, `--win98-*` variables, silver/gray palette); new UI (dialog groups, radios, buttons) should reuse `.win98-groupbox`, `.win98-radio`, `.win98-btn`.
