# pwa-standalone-safe-area

Status: shipped (see commit history on `feat/ui-openclaw-talk-refresh`).

## Requirement

When the user adds leapmux to the iOS home screen and launches it as a
standalone PWA, the layout has to be correct across all keyboard states
without regressing any other surface:

1. Desktop browsers (no notch, safe-area = 0)
2. Mobile Safari in-browser (URL bar covers the top inset)
3. Mobile Safari → "Add to Home Screen" → standalone PWA (system bars
   overlay; `env(safe-area-inset-*)` reports non-zero values)
4. Tauri desktop webview (no safe-area)
5. iOS keyboard up + composer focused (composer must ride above the
   keyboard)
6. iOS keyboard dismiss (composer must remain visible — iOS 26 leaves
   `visualViewport.offsetTop` non-zero after dismiss)

Symptoms observed in standalone PWA mode prior to this fix:

- The chat tab bar overlapped the system status bar / Dynamic Island.
- A `safe-area-inset-*`-sized white band appeared below the composer.
- After dismissing the on-screen keyboard the composer would scroll
  below the visible area (iOS 26 bug FB19889436).

## Root cause

Two coordinated WebKit behaviours converge in standalone PWA mode and
need separate mitigations:

1. **`viewport-fit=cover` + `apple-mobile-web-app-status-bar-style=
   black-translucent`** make the layout viewport extend under the
   system status bar. Content at `top: 0` overlaps the status bar
   unless we apply `padding-top: env(safe-area-inset-top)` on `body`.
2. **iOS 26 WebKit leaves `visualViewport.offsetTop` non-zero after the
   on-screen keyboard dismisses** (Apple Developer Forum thread
   800125, FB19889436). With our `body { position: fixed; overflow:
   hidden }` there is no document scroll for `window.scrollTo(0, 0)`
   to reset, so the bottom-anchored composer falls outside the visible
   window. The cancellation has to happen via CSS transform on `body`.

Additionally:

- `window.innerHeight` in iOS standalone PWA tracks `visualViewport
  .height` (both shrink with the keyboard). A simple `innerH - vvH`
  keyboard detector never fires there — we use focus on an
  `<input>` / `<textarea>` / `contenteditable` instead.
- `100vh` and certain `100dvh` builds also report short of the screen
  in standalone mode. We anchor body to `100dvh` (which iOS 16.4+
  tracks correctly as the dynamic visible viewport), and skip
  publishing a JS-driven `--vvh` for body height entirely.

## Fix (as shipped)

### `frontend/src/styles/global.css.ts` — `body`

```ts
globalStyle('body', {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100dvh',
  paddingTop: 'env(safe-area-inset-top)',
  // NO padding-bottom — composer sits flush with screen bottom,
  // home-indicator translucently overlays it (KakaoTalk style).
  boxSizing: 'border-box',
  // iOS-26 mitigation: cancel residual visualViewport.offsetTop after
  // keyboard dismiss. Only set by the hook when keyboard is *down*;
  // identity (0) on desktop / Tauri / mobile Safari.
  transform: 'translateY(calc(-1 * var(--vv-offset, 0px)))',
  willChange: 'transform',
  overscrollBehavior: 'none',
  touchAction: 'none',
})
```

Note: the `transform` on body establishes a containing block for
descendant `position: fixed` elements. Native HTML `popover` API
consumers (DropdownMenu, Tooltip, GridSizePopover, LinkPopover) escape
this via the top layer. The one non-top-layered exception is
`SelectionQuotePopover`, which counter-translates by
`var(--vv-offset, 0px)` to stay viewport-relative.

### `frontend/src/styles/global.css.ts` — input zoom suppression

```ts
// iOS Safari auto-zooms when focusing inputs with computed
// font-size < 16px; the zoom is NOT undone on blur. Floor at 16px
// on mobile only.
globalStyle('input, textarea, select', {
  '@media': {
    '(max-width: 639px)': { fontSize: '16px' },
  },
})
```

### `frontend/src/hooks/useVisualViewportInset.ts`

Publishes two CSS custom properties on `:root`:

- `--vvh` = `visualViewport.height`, **only while an editable is
  focused**. Available for inner consumers (composer popovers, etc.)
  that want to clamp against the visible-above-keyboard region. The
  body itself uses `100dvh` and does not consume `--vvh`.
- `--vv-offset` = `visualViewport.offsetTop` (px), **only when no
  editable is focused and the offset is > 0.5 px**. Drives the body
  counter-translate. Suppressing it during keyboard-up is critical:
  iOS itself translates the visual viewport then, and a body
  counter-translate would double-shift, pushing the composer past
  the visible top.

Listeners: `visualViewport.resize`, `visualViewport.scroll`,
`window.resize`, `window.pageshow`, `document.focusin`,
`document.focusout`. rAF-coalesced. `pageshow` catches the iOS quirk
where returning from background can leave `offsetTop` dirty.

`window.scrollTo(0, 0)` was tried in earlier passes and dropped —
documented as a no-op with `position: fixed; overflow: hidden`.

### `frontend/src/components/common/SelectionQuotePopover.css.ts`

```ts
export const popover = style({
  position: 'fixed',
  // … existing chrome …
  // Counter-translate body's --vv-offset mitigation so JS-computed
  // viewport-relative top/left land where intended.
  transform: 'translateY(var(--vv-offset, 0px))',
})
```

## A11y

- Focus ring — unchanged
- Keyboard operability — composer continues to ride above iOS keyboard
  via iOS' own visual-viewport translate (no longer JS-driven)
- `prefers-reduced-motion` — pure layout, no motion
- Screen reader — no semantic changes
- Color contrast — unchanged

## Surface matrix

| Surface | Expected behaviour |
|---|---|
| Desktop browser | `--vv-offset` never set → transform = identity. `100dvh` = window height. No regression. |
| Mobile Safari (browser), no keyboard | `--vv-offset` never set in normal use. `100dvh` already tracks the URL-bar collapsing chrome correctly. No regression. |
| Mobile Safari (browser), keyboard up | Editable focused → `--vv-offset` is *suppressed*. `100dvh` shrinks with keyboard; composer naturally above keyboard. |
| iOS standalone PWA, no keyboard | Tab bar below status bar (padding-top safe-area). Composer flush with screen bottom; home-indicator overlays translucently. |
| iOS standalone PWA, keyboard up | Editable focused → `--vv-offset` suppressed. iOS' own visualViewport translate brings composer into view above the keyboard. |
| iOS standalone PWA, keyboard dismiss | iOS leaves `offsetTop ≠ 0` → hook publishes `--vv-offset` → body `transform: translateY(-offset)` cancels it. Composer visible at screen bottom. |
| Tauri webview | Same as desktop. |

## Known residuals

- A small (~safe-area-bottom sized) gap below the composer can still
  appear on first paint in some iOS standalone PWA states. Living
  with it as agreed on 2026-05-15; chasing further would risk
  regressing the keyboard-open / dismiss paths.

## References

- [Apple Developer Forum 800125 — iOS 26 visualViewport.offsetTop not resetting (FB19889436)](https://developer.apple.com/forums/thread/800125)
- [iifx.dev — Debugging iOS 26: Fixed Positioning Post-Keyboard Interaction](https://iifx.dev/en/articles/460201403/debugging-ios-26-how-to-correct-fixed-positioning-post-keyboard-interaction)
- [Apple Developer Forum 744327 — iOS 17 PWA position:fixed drift](https://developer.apple.com/forums/thread/744327)
- [bramus/viewport-resize-behavior explainer](https://github.com/bramus/viewport-resize-behavior/blob/main/explainer.md)
