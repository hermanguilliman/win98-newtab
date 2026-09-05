# AGENTS.md

## What this is

A single Chrome **Manifest V3** extension (`win98-newtab/`) that replaces the new-tab page with a Windows 98-style desktop of the user's Chrome bookmarks. Plain static files — no build, bundler, package.json, tests, or CI. JS is one IIFE (`newtab.js`); no modules.

## Verify / run

- After any change: reload the extension at `chrome://extensions/` (Developer mode → Load unpacked → the `win98-newtab` folder), then open a new tab.
- Syntax check (there is no test runner): `node --check win98-newtab/newtab.js` and validate JSON with `ConvertFrom-Json` / `JSON.parse`.
- The extension only runs inside the new-tab context; testing navigation/opening behaviors requires bookmark permission to be granted.

## Non-obvious architecture facts

- **Bookmark root grouping**: Chrome root folder IDs are fixed regardless of UI language — `1`=Панель закладок (Bar), `2`=Другие (Other), `3`=Мобильные (Mobile). `newtab.js` sorts by `ROOT_ORDER = {1,2,3}` and inserts a full-width `.desktop-row-separator` between groups so each group starts on a new row. Any unknown/custom root is sorted to the end.
- **All folder + page + shortcut icons are generated at runtime on `<canvas>`** (`drawFolderIcon`, `drawPageIcon`) or fetched as Google favicons. Icon size is driven by the `--win98-icon-size` CSS variable **set on `document.documentElement` (`<html>`)**, not per-icon — so it cascades into opened folder windows and the «Все закладки» window too. Never hardcode icon px in markup; keep `currentIconSize()` / variable wiring.
- **Settings live in `chrome.storage.local` under key `"settings"`**. To add a setting, update ALL of: `DEFAULT_SETTINGS`, `mergeSettings()` (whitelist — unknown/old values are dropped, use `structuredClone` of defaults), and the settings-window UI in `buildSettingsForm()`. Stored keys must survive reloads.
- **Settings window is single-instance** — guarded by `state.windows.find(w => w.title === "Настройки")`; same pattern used for «Все закладки». Windows are managed entirely in JS (`createWindow`/`bringToFront`/`closeWindow`), taskbar buttons and titlebar wiring are rebuilt per window.
- **Wallpaper by remote URL** uses `fetch(..., { mode: "cors" })` and is stored locally as a data URL; servers without CORS headers will fail to download — mention file upload as the fallback when this comes up.
- **Click mode** (single vs double) is handled in three separate places (`createDesktopIcon`, `createFolderItem`, and the «Все закладки» renderer) with a ~350 ms debounce guard; all three must stay in sync, driven by `isSingleClickMode()`.
- Permissions required: `bookmarks`, `storage`, `unlimitedStorage` (the latter because wallpaper images are stored as data URLs in local storage).

## Conventions

- UI copy and this project are **Russian** — keep new labels/messages in Russian.
- Commit messages: conventional commits in English (`feat:`, `fix:`, `docs:`, `chore:`). Repo already has a git history on `master`.
- Styling must stay in the Win98 3D-border language defined in `win98.css` (outset/inset borders, `--win98-*` variables, silver/gray palette); new UI (dialog groups, radios, buttons) should reuse `.win98-groupbox`, `.win98-radio`, `.win98-btn`.
