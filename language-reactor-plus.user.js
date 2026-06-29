// ==UserScript==
// @name         Language Reactor Plus
// @namespace    https://github.com/Atcold/language-reactor-plus
// @version      1.4
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

    // 1. CSS Applicator
    window.applySubtitleFix = function(zhV, enV) {
        let styleEl = document.getElementById('tm-subtitle-fix-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'tm-subtitle-fix-style';
            document.head.appendChild(styleEl);
        }

        styleEl.innerHTML = `
            .media-wrap .bottom-panel { display: block !important; text-align: center !important; width: 100% !important; position: absolute !important; bottom: 2% !important; left: 0 !important; height: auto !important; max-height: 40vh !important; overflow: visible !important; }
            .media-wrap .dc-orig, .media-wrap .lln-word .dc-down, .media-wrap .sentence-view .dc-down { font-size: ${zhV}px !important; line-height: 1.1 !important; display: block !important; text-align: center !important; margin: 0 auto !important; }
            .media-wrap .sentence-view .lln-not-word { font-size: ${zhV}px !important; line-height: 1.1 !important; display: inline-block !important; vertical-align: bottom !important; margin: 0 0.1em !important; }
            .media-wrap .dc-translit, .media-wrap .lln-word .dc-up, .media-wrap .sentence-view .dc-up { font-size: ${zhV * 0.4}px !important; line-height: 1.1 !important; display: block !important; text-align: center !important; margin-bottom: 2px !important; }
            .media-wrap .main-translation-wrap, .media-wrap .main-translation-wrap span, .media-wrap [lang="en"] { font-size: ${enV}px !important; line-height: 1.4 !important; display: block !important; text-align: center !important; margin: 5px auto 0 !important; }
            .media-wrap .lln-word, .media-wrap .dc-layer { display: inline-block !important; vertical-align: bottom !important; margin: 0 0.15em !important; text-align: center !important; width: auto !important; }
            .media-wrap .sentence-row, .media-wrap .sentence-view { display: inline-block !important; white-space: nowrap !important; width: auto !important; max-width: 98vw !important; margin: 0 auto !important; }
            .media-wrap .MuiPaper-root, .media-wrap .sentence-wrap-main { background-color: transparent !important; box-shadow: none !important; border: none !important; }
        `;
        localStorage.setItem('sub-zh-size', zhV);
        localStorage.setItem('sub-en-size', enV);
    };

    // 2. Multi-Target Injection Logic
    function injectSettings() {
        const standardAp = document.querySelector('.main-toolbar [aria-label="Auto-pause"]');
        const fullscreenAp = document.querySelector('.video-subs-wrap-overvideo [aria-label="Auto-pause"]');

        [standardAp, fullscreenAp].forEach((apWrapper, index) => {
            if (!apWrapper) return;

            const uniqueId = `persistent-settings-${index}`;
            if (document.getElementById(uniqueId)) return;

            const savedZh = localStorage.getItem('sub-zh-size') || 122;
            const savedEn = localStorage.getItem('sub-en-size') || 25;

            const container = document.createElement('div');
            container.id = uniqueId;

            if (index === 1) {
                // Fullscreen/Over-video: Place BELOW AP
                container.style.cssText = 'display: flex; position: relative; align-items: center; justify-content: center; margin-top: 8px; pointer-events: auto;';
            } else {
                // Standard Title Bar: Place to the RIGHT of AP
                container.style.cssText = 'display: inline-flex; position: relative; align-items: center; margin-left: 8px; pointer-events: auto;';
            }

            const btn = document.createElement('button');
            btn.className = 'MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeSmall';
            btn.style.cssText = 'color: rgba(255, 255, 255, 0.7); background: transparent; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px; padding: 2px 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; height: 24px; width: auto; min-width: 32px;';
            btn.innerHTML = '<span style="font-size: 10px; font-weight: bold;">ZH/EN</span>';

            const panel = document.createElement('div');
            // FIX: Align "right: 0" so it doesn't extend past the screen edge
            const panelTop = (index === 1) ? '-165px' : '30px';
            const panelRight = '0px';

            panel.style.cssText = `position: absolute; top: ${panelTop}; right: ${panelRight}; background: rgba(24, 26, 27, 0.95); border: 1px solid rgba(232, 230, 227, 0.2); border-radius: 8px; padding: 12px; width: 180px; display: none; flex-direction: column; gap: 10px; z-index: 10000; color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.5);`;
            panel.innerHTML = `
                <div style="font-size: 11px;">ZH: <span class="zh-val-display">${savedZh}</span>px</div>
                <input type="range" class="zh-range-input" min="20" max="250" value="${savedZh}" style="width: 100%;">
                <div style="font-size: 11px;">EN: <span class="en-val-display">${savedEn}</span>px</div>
                <input type="range" class="en-range-input" min="10" max="100" value="${savedEn}" style="width: 100%;">
            `;

            const update = () => {
                const zh = container.querySelector('.zh-range-input').value;
                const en = container.querySelector('.en-range-input').value;

                document.querySelectorAll('.zh-val-display').forEach(el => el.innerText = zh);
                document.querySelectorAll('.en-val-display').forEach(el => el.innerText = en);
                document.querySelectorAll('.zh-range-input').forEach(el => el.value = zh);
                document.querySelectorAll('.en-range-input').forEach(el => el.value = en);

                window.applySubtitleFix(zh, en);
            };

            btn.onclick = (e) => {
                e.stopPropagation();
                const isHidden = panel.style.display === 'none';
                panel.style.display = isHidden ? 'flex' : 'none';
            };

            panel.querySelector('.zh-range-input').oninput = update;
            panel.querySelector('.en-range-input').oninput = update;
            document.addEventListener('click', () => panel.style.display = 'none');
            panel.onclick = (e) => e.stopPropagation();

            container.appendChild(btn);
            container.appendChild(panel);
            apWrapper.parentNode.insertBefore(container, apWrapper.nextSibling);
        });

        const currentZh = localStorage.getItem('sub-zh-size') || 122;
        const currentEn = localStorage.getItem('sub-en-size') || 25;
        window.applySubtitleFix(currentZh, currentEn);
    }

    const observer = new MutationObserver(() => injectSettings());
    observer.observe(document.body, { childList: true, subtree: true });
    injectSettings();
})();
