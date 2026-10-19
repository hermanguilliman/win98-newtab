/**
 * Settings window: a tabbed Win98 form (Обои, Поведение, Вид, О системе).
 * Edits are staged into a pending copy of the settings object, previewed live
 * on documentElement CSS variables, and only persisted to chrome.storage on OK.
 */

/* ============================================================
 SETTINGS WINDOW
 ============================================================ */

import { shellActions } from "./shellActions";

import { _clearIconCache, drawFolderIcon } from "./icons";
import { applyDesktopStyle, applyWallpaper, resolveImageSize, saveSettings } from "./settings";
import { bringToFront, closeWindow, createWindow, restoreWindow } from "./windows";
import { clampInt } from "../lib/format";
import { CUSTOM_THEME_KEYS, THEME_OPTIONS } from "../lib/theme";
import { DEFAULT_SETTINGS, FOLDER_STYLES, ICON_SIZES, UI_FONTS } from "../lib/settings";
import { state } from "../state";
import { updateClock } from "./clock";

export function openSettingsWindow() {
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
            const contentEl = /** @type {HTMLElement} */ (
                el.querySelector(".win98-window-content")
            );
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
    let uiType =
        pending.wallpaper.uiType ||
        (pending.wallpaper.type === "color" ? "color" : "file");

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
        { id: "about", label: "О системе" },
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
            .forEach((/** @type {HTMLElement} */ b) =>
                b.classList.toggle("active", b.dataset.tab === id),
            );
        panels
            .querySelectorAll(".win98-tabpanel")
            .forEach((/** @type {HTMLElement} */ p) =>
                p.classList.toggle("active", p.dataset.tabPanel === id),
            );
    }
    selectTab("wp");

    const commit = () => {
        if (uiType !== "color" && !pending.wallpaper.imageData) {
            setMsg(
                uiType === "url"
                    ? "Укажите адрес изображения и нажмите «Скачать»."
                    : "Выберите файл изображения.",
            );
            return; // не закрываем окно, пока обои не выбраны
        }
        state.previewFolderStyle = null;
        state.previewFolderViewMode = null;
        state.settings = pending;
        _clearIconCache(); // new settings may change icon size/style
        applyDesktopStyle();
        saveSettings();
        updateClock();
        shellActions.updateWeather && shellActions.updateWeather();
        shellActions.renderBookmarks && shellActions.renderBookmarks(state.treeRoot, true); // force: icon size/style may have changed
        shellActions.refreshOpenFolderWindows && shellActions.refreshOpenFolderWindows(state.treeRoot); // apply new view mode
        const id = getWinId();
        if (id) closeWindow(id);
    };

    const cancel = () => {
        state.previewFolderStyle = null;
        state.previewFolderViewMode = null;
        _clearIconCache(); // restore memoized icons under the saved style
        applyWallpaper(state.settings.wallpaper);
        applyDesktopStyle();
        updateClock();
        shellActions.renderBookmarks && shellActions.renderBookmarks(state.treeRoot, true); // restore original icon size/style
        shellActions.refreshOpenFolderWindows && shellActions.refreshOpenFolderWindows(state.treeRoot); // restore saved view mode
        const id = getWinId();
        if (id) closeWindow(id);
    };

    /* ---------- Тема groupbox (appearance tab) ----------
       Radio: Classic / Olive / High Contrast / Custom. Every change
       applies live through `livePreview(settings)` (applyDesktopStyle),
       and cancel() above reverts it via applyTheme(state.settings). */
    const buildThemeGroup = (a, livePreview) => {
        const box = document.createElement("div");
        box.className = "win98-groupbox";
        const legend = document.createElement("div");
        legend.className = "win98-groupbox-legend";
        legend.textContent = "Тема";
        box.appendChild(legend);

        // Custom-color pickers (visible only for theme "custom")
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

        const curTheme = THEME_OPTIONS.some((t) => t.id === a.theme)
            ? a.theme
            : DEFAULT_SETTINGS.theme;
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
                customBox.style.display =
                    t.id === "custom" ? "block" : "none";
                livePreview(a);
            });
            lbl.append(rad, txt);
            box.appendChild(lbl);
        });

        box.appendChild(customBox);
        return box;
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
    colorRadio.checked = uiType === "color";
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

    // -- Изображение из интернета --
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

    // -- Масштаб (slider) --
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
        clampInt(Math.round(pending.wallpaper.scale || 100), 10, 500),
    );
    scaleSlider.disabled = uiType === "color";
    const scaleValue = document.createElement("span");
    scaleValue.className = "wp-scale-value";
    scaleValue.textContent = scaleSlider.value + "%";
    scaleRow.append(scaleLabel, scaleSlider, scaleValue);
    wg.appendChild(scaleRow);

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
            state.previewFolderStyle = s.id;
            _clearIconCache(); // icons were memoized under the old style
            shellActions.renderBookmarks && shellActions.renderBookmarks(state.treeRoot, true); // live preview on the desktop
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
            state.previewFolderViewMode = m.id; // live preview in open windows
            shellActions.refreshOpenFolderWindows && shellActions.refreshOpenFolderWindows(state.treeRoot);
        });
        fm.appendChild(lbl);
    });
    vg.appendChild(fm);

    /* ---------- Вид group (UI font) ---------- */
    const ufg = document.createElement("div");
    ufg.className = "win98-groupbox";
    const ufgLegend = document.createElement("div");
    ufgLegend.className = "win98-groupbox-legend";
    ufgLegend.textContent = "Шрифт интерфейса";
    ufg.appendChild(ufgLegend);

    const curFont = UI_FONTS.some((f) => f.value === pending.uiFont)
        ? pending.uiFont
        : DEFAULT_SETTINGS.uiFont;
    UI_FONTS.forEach((f) => {
        const lbl = document.createElement("label");
        lbl.className = "win98-radio";
        const rad = document.createElement("input");
        rad.type = "radio";
        rad.name = "ui-font";
        rad.value = f.value;
        if (curFont === f.value) rad.checked = true;
        const sp = document.createElement("span");
        sp.style.fontFamily = f.value; // каждый вариант набран своим шрифтом
        sp.textContent = f.label;
        rad.addEventListener("change", () => {
            if (!rad.checked) return;
            pending.uiFont = f.value;
            applyDesktopStyle(pending); // live preview
        });
        lbl.append(rad, sp);
        ufg.appendChild(lbl);
    });
    vg.appendChild(ufg);

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

    tabPanels.appearance.appendChild(
        buildThemeGroup(pending, applyDesktopStyle),
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

    /* ---------- О системе group ---------- */
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
    aboutDesc.textContent =
        "Дополнение для Chrome, превращающее новую вкладку в рабочий стол Windows 98: закладки и папки отображаются значками на рабочем столе, двойной клик открывает окна, поиск и настройки — в меню «Пуск».";

    const aboutRows = document.createElement("div");
    aboutRows.className = "about-rows";
    [
        ["Автор", "Herman Guilliman"],
        ["Год", "2026"],
        ["Поддержка", "hermanguilliman@proton.me"],
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
        scaleSlider.disabled = uiType === "color";
    };

    const renderPreview = () => {
        const isImg = uiType !== "color" && pending.wallpaper.imageData;
        previewImg.style.backgroundImage = isImg
            ? `url(${pending.wallpaper.imageData})`
            : "none";
        previewImg.style.backgroundColor =
            pending.wallpaper.color || "#008080";
        const sty = pending.wallpaper.imageStyle || "tile";
        const scale =
            clampInt(Math.round(pending.wallpaper.scale || 100), 10, 500) /
            100;
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
            previewImg.style.backgroundRepeat =
                sty === "tile" ? "repeat" : "no-repeat";
            previewImg.style.backgroundPosition =
                sty === "center" ? "center center" : "0 0";
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

    /* ---------- Events ---------- */
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

    scaleSlider.addEventListener("input", () => {
        pending.wallpaper.scale = clampInt(
            Math.round(+scaleSlider.value || 100),
            10,
            500,
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

    // Initial state
    updateEnabled();
    renderPreview();

    return form;
}
