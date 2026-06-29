# Language Reactor Plus

A [Tampermonkey](https://www.tampermonkey.net/) userscript that adds missing controls to
[Language Reactor](https://www.languagereactor.com/) (the Netflix/YouTube language-learning
overlay, formerly Language Learning with Netflix). An umbrella for small enhancements; more
features will land over time.

## Features

### 1. Resizable subtitles

Language Reactor has no built-in font-size control. This adds a **ZH/EN** button next to the
Auto-pause control, opening a panel with two sliders:

- **Learning-language line** — 20–250 px
- **Translation line** — 10–100 px

Plus:

- Sizes persist across sessions (`localStorage`) and re-apply after the single-page app
  re-renders (a `MutationObserver` re-injects the controls).
- Works in both the standard player and fullscreen / over-video mode.
- Fixes subtitle centring and alignment, strips the background box, and auto-sizes the
  transliteration line to 40% of the main line.

## Install

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Open the
   [raw script](https://raw.githubusercontent.com/Atcold/language-reactor-plus/main/language-reactor-plus.user.js)
   — Tampermonkey offers a one-click install.
3. Updates are pulled automatically via the script's `@updateURL`.

## Caveat

The CSS selectors (`.media-wrap .dc-orig`, `.dc-translit`, `.main-translation-wrap`, MUI
class names, …) are tied to Language Reactor's current DOM. This is a working hack, not a
stable integration: expect it to break when LR re-renders its player, and to need version
bumps.

## Status

Submitted upstream as a feature request (LR is closed-source, no public repo to fork):
[forum thread](https://forum.languagelearningwithnetflix.com/t/feature-request-adjustable-subtitle-font-size-with-working-userscript-as-proof-of-concept/41539).
