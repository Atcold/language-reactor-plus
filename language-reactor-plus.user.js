// ==UserScript==
// @name         Language Reactor Plus
// @namespace    https://github.com/Atcold/language-reactor-plus
// @version      1.6
// @description  Supercharges Language Reactor. Feature 1: persistent, resizable subtitles (learning + translation lines) with fixed centring, in standard and fullscreen modes.
// @author       Alfredo Canziani
// @match        *://www.languagereactor.com/*
// @grant        none
// @homepageURL  https://github.com/Atcold/language-reactor-plus
// @supportURL   https://github.com/Atcold/language-reactor-plus/issues
// @downloadURL  https://raw.githubusercontent.com/Atcold/language-reactor-plus/main/language-reactor-plus.user.js
// @updateURL    https://raw.githubusercontent.com/Atcold/language-reactor-plus/main/language-reactor-plus.user.js
// ==/UserScript==

(function() {
    'use strict';

    // =========================================================================
    // Configuration
    // -------------------------------------------------------------------------
    // All tunable constants live here so behaviour can be adjusted in one place.
    // =========================================================================
    const CONFIG = {
        // localStorage keys used to persist the chosen font sizes across reloads.
        STORAGE_ZH: 'sub-zh-size',
        STORAGE_EN: 'sub-en-size',

        // Default font sizes (px) applied when nothing has been saved yet.
        DEFAULT_ZH: 125,
        DEFAULT_EN: 25,

        // Slider bounds (px) for the ZH (learning) and EN (translation) lines.
        ZH_MIN: 20,  ZH_MAX: 250,
        EN_MIN: 10,  EN_MAX: 100,

        // The transliteration / pinyin line is sized relative to the ZH line.
        TRANSLIT_RATIO: 0.4,

        // Full-opacity colour for Language Reactor's per-word "orange outline".
        // Native default is barely visible (~0.27 alpha); we force it solid.
        ORANGE_OUTLINE_COLOR: 'rgba(140, 67, 0, 1)',

        // <style> element id holding our injected subtitle CSS.
        STYLE_ID: 'tm-subtitle-fix-style',

        // <style> element id holding the (static) settings-widget CSS.
        WIDGET_STYLE_ID: 'lrp-widget-style',
    };

    // Read a persisted size, falling back to the default when unset.
    const getSavedZh = () => localStorage.getItem(CONFIG.STORAGE_ZH) || CONFIG.DEFAULT_ZH;
    const getSavedEn = () => localStorage.getItem(CONFIG.STORAGE_EN) || CONFIG.DEFAULT_EN;

    // =========================================================================
    // 1. CSS applicator
    // -------------------------------------------------------------------------
    // Rewrites a single <style> element (created once, then reused) so the
    // subtitles re-layout instantly. Exposed on window so it can be re-run live
    // from the console while developing.
    // =========================================================================
    function applySubtitleFix(zhV, enV) {
        let styleEl = document.getElementById(CONFIG.STYLE_ID);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = CONFIG.STYLE_ID;
            document.head.appendChild(styleEl);
        }

        const translitV = zhV * CONFIG.TRANSLIT_RATIO;

        styleEl.innerHTML = `
            /* Subtitle container: centred, full-width, anchored near the bottom. */
            .media-wrap .bottom-panel {
                display: block !important;
                text-align: center !important;
                width: 100% !important;
                position: absolute !important;
                bottom: 2% !important;
                left: 0 !important;
                height: auto !important;
                max-height: 40vh !important;
                overflow: visible !important;
            }

            /* Learning line (e.g. Chinese characters): main ZH glyphs. */
            .media-wrap .dc-orig,
            .media-wrap .lln-word .dc-down,
            .media-wrap .sentence-view .dc-down {
                font-size: ${zhV}px !important;
                line-height: 1.1 !important;
                display: block !important;
                text-align: center !important;
                margin: 0 auto !important;
            }

            /* Non-word tokens in the learning line (punctuation, spacing). */
            .media-wrap .sentence-view .lln-not-word {
                font-size: ${zhV}px !important;
                line-height: 1.1 !important;
                display: inline-block !important;
                vertical-align: bottom !important;
                margin: 0 0.1em !important;
            }

            /* Transliteration / pinyin line above each word (scaled from ZH). */
            .media-wrap .dc-translit,
            .media-wrap .lln-word .dc-up,
            .media-wrap .sentence-view .dc-up {
                font-size: ${translitV}px !important;
                line-height: 1.1 !important;
                display: block !important;
                text-align: center !important;
                margin-bottom: 2px !important;
            }

            /* Translation line (English) below the learning line. */
            .media-wrap .main-translation-wrap,
            .media-wrap .main-translation-wrap span,
            .media-wrap [lang="en"] {
                font-size: ${enV}px !important;
                line-height: 1.4 !important;
                display: block !important;
                text-align: center !important;
                margin: 5px auto 0 !important;
            }

            /* Each word stacks its transliteration over its glyph, inline. */
            .media-wrap .lln-word,
            .media-wrap .dc-layer {
                display: inline-block !important;
                vertical-align: bottom !important;
                margin: 0 0.15em !important;
                text-align: center !important;
                width: auto !important;
            }

            /* Keep a whole sentence on one centred row. */
            .media-wrap .sentence-row,
            .media-wrap .sentence-view {
                display: inline-block !important;
                white-space: nowrap !important;
                width: auto !important;
                max-width: 98vw !important;
                margin: 0 auto !important;
            }

            /* Strip the default card chrome so subtitles float over the video. */
            .media-wrap .MuiPaper-root,
            .media-wrap .sentence-wrap-main {
                background-color: transparent !important;
                box-shadow: none !important;
                border: none !important;
            }

            /* Make the per-word orange outline fully opaque (native is ~0.27). */
            .media-wrap .lln-orange-outline .dc-hover::before {
                border-color: ${CONFIG.ORANGE_OUTLINE_COLOR} !important;
            }
        `;

        localStorage.setItem(CONFIG.STORAGE_ZH, zhV);
        localStorage.setItem(CONFIG.STORAGE_EN, enV);
    }

    // =========================================================================
    // 2. Settings widget (button + slider panel)
    // -------------------------------------------------------------------------
    // Builds one "ZH/EN" button with a pop-over panel of two sliders. There are
    // two mount points (standard toolbar and fullscreen over-video bar), so this
    // is parameterised by `index`: 0 = standard, 1 = fullscreen.
    // =========================================================================

    // Inject the static widget CSS once. Kept separate from applySubtitleFix
    // (which is rewritten on every resize) since these rules never change.
    function injectWidgetStyles() {
        if (document.getElementById(CONFIG.WIDGET_STYLE_ID)) return;

        const styleEl = document.createElement('style');
        styleEl.id = CONFIG.WIDGET_STYLE_ID;
        styleEl.innerHTML = `
            /* Widget wrapper next to Auto-pause. */
            .lrp-settings {
                position: relative;
                align-items: center;
                pointer-events: auto;
            }
            /* Standard bar: inline, to the right of Auto-pause. */
            .lrp-settings--standard {
                display: inline-flex;
                margin-left: 8px;
            }
            /* Fullscreen bar: stacked below Auto-pause and centred. */
            .lrp-settings--fullscreen {
                display: flex;
                justify-content: center;
                margin-top: 8px;
            }

            /* "ZH/EN" trigger button, blended with LR's MUI controls. */
            .lrp-btn {
                color: rgba(255, 255, 255, 0.7);
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 4px;
                padding: 2px 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 24px;
                width: auto;
                min-width: 32px;
            }

            /* Slider pop-over (hidden until the button is clicked). right:0
               keeps it from spilling past the screen edge. */
            .lrp-panel {
                position: absolute;
                right: 0;
                background: rgba(24, 26, 27, 0.95);
                border: 1px solid rgba(232, 230, 227, 0.2);
                border-radius: 8px;
                padding: 12px;
                width: 180px;
                display: none;
                flex-direction: column;
                gap: 10px;
                z-index: 10000;
                color: #fff;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
            }
            .lrp-panel--standard { top: 30px; }       /* opens downward */
            .lrp-panel--fullscreen { top: -165px; }   /* opens upward to stay on screen */
        `;
        document.head.appendChild(styleEl);
    }

    function buildSettingsWidget(index) {
        const isFullscreen = (index === 1);

        const container = document.createElement('div');
        container.id = `persistent-settings-${index}`;
        container.className = `lrp-settings ${isFullscreen ? 'lrp-settings--fullscreen' : 'lrp-settings--standard'}`;

        // Trigger button. Keep the MUI classes for base styling, add our own.
        const btn = document.createElement('button');
        btn.className = 'MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeSmall lrp-btn';
        btn.innerHTML = '<span style="font-size: 10px; font-weight: bold;">ZH/EN</span>';

        const panel = document.createElement('div');
        panel.className = `lrp-panel ${isFullscreen ? 'lrp-panel--fullscreen' : 'lrp-panel--standard'}`;
        panel.innerHTML = `
            <div style="font-size: 11px;">ZH: <span class="zh-val-display">${getSavedZh()}</span>px</div>
            <input type="range" class="zh-range-input" min="${CONFIG.ZH_MIN}" max="${CONFIG.ZH_MAX}" value="${getSavedZh()}" style="width: 100%;">
            <div style="font-size: 11px;">EN: <span class="en-val-display">${getSavedEn()}</span>px</div>
            <input type="range" class="en-range-input" min="${CONFIG.EN_MIN}" max="${CONFIG.EN_MAX}" value="${getSavedEn()}" style="width: 100%;">
        `;

        // Apply current slider values, mirroring them across BOTH widgets so the
        // standard and fullscreen panels stay in sync.
        const update = () => {
            const zh = container.querySelector('.zh-range-input').value;
            const en = container.querySelector('.en-range-input').value;

            document.querySelectorAll('.zh-val-display').forEach(el => el.innerText = zh);
            document.querySelectorAll('.en-val-display').forEach(el => el.innerText = en);
            document.querySelectorAll('.zh-range-input').forEach(el => el.value = zh);
            document.querySelectorAll('.en-range-input').forEach(el => el.value = en);

            applySubtitleFix(zh, en);
        };

        // Toggle the panel; stopPropagation so the document handler below
        // (which closes it on any outside click) doesn't immediately re-close.
        // Read the computed value since the hidden default lives in the class.
        btn.onclick = (e) => {
            e.stopPropagation();
            const hidden = getComputedStyle(panel).display === 'none';
            panel.style.display = hidden ? 'flex' : 'none';
        };
        panel.querySelector('.zh-range-input').oninput = update;
        panel.querySelector('.en-range-input').oninput = update;
        document.addEventListener('click', () => panel.style.display = 'none');
        panel.onclick = (e) => e.stopPropagation();

        container.appendChild(btn);
        container.appendChild(panel);
        return container;
    }

    // =========================================================================
    // 3. Injection logic
    // -------------------------------------------------------------------------
    // Locates the Auto-pause control in both the standard and fullscreen bars
    // and inserts a settings widget next to each (once). Re-applies the saved
    // sizes on every run so styling survives Language Reactor's DOM churn.
    // =========================================================================
    function injectSettings() {
        injectWidgetStyles();

        const mountPoints = [
            document.querySelector('.main-toolbar [aria-label="Auto-pause"]'),                 // 0: standard
            document.querySelector('.video-subs-wrap-overvideo [aria-label="Auto-pause"]'),    // 1: fullscreen
        ];

        mountPoints.forEach((apWrapper, index) => {
            if (!apWrapper) return;                                       // bar not present yet
            if (document.getElementById(`persistent-settings-${index}`)) return;  // already injected

            const widget = buildSettingsWidget(index);
            apWrapper.parentNode.insertBefore(widget, apWrapper.nextSibling);
        });

        // Keep subtitles styled even as Language Reactor re-renders the DOM.
        applySubtitleFix(getSavedZh(), getSavedEn());
    }

    // =========================================================================
    // 4. Bootstrap
    // -------------------------------------------------------------------------
    // Language Reactor is a SPA that swaps its DOM in and out, so we watch for
    // changes and (re)inject as needed, plus run once on load.
    // =========================================================================
    const observer = new MutationObserver(() => injectSettings());
    observer.observe(document.body, { childList: true, subtree: true });
    injectSettings();

    // Expose internals for live development from the DevTools console, e.g.
    //   LRP.applySubtitleFix(150, 30);   // resize without reloading
    //   LRP.injectSettings();            // re-run injection after editing
    window.LRP = { applySubtitleFix, injectSettings, observer, CONFIG };
    window.applySubtitleFix = applySubtitleFix;  // backwards-compatible alias
})();
