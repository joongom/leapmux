// Base CSS tokens are provided by @knadh/oat — see
// node_modules/@knadh/oat/css/01-theme.css for the full list of custom
// properties and their values. Common ones:
//   --space-{1..18}                spacing scale
//   --radius-{small,medium,large,full}
//   --text-{1..8}, --text-regular  font-size scale
//   --font-{normal,bold}           font-weight tokens (prefer these over
//                                  numeric weights; --font-medium and
//                                  --font-semibold also exist but our
//                                  convention is normal-or-bold only)
//   --leading-normal               default line-height
//   --shadow-{small,medium,large}
//   --transition, --transition-fast
//   --z-{dropdown,modal}

import { globalFontFace, globalStyle } from '@vanilla-extract/css'

globalFontFace('Hack NF', {
  src: 'url("/fonts/HackNerdFont-3.003-Regular.woff2") format("woff2")',
  fontWeight: 400,
  fontStyle: 'normal',
  fontDisplay: 'swap',
})

globalFontFace('Hack NF', {
  src: 'url("/fonts/HackNerdFont-3.003-Bold.woff2") format("woff2")',
  fontWeight: 700,
  fontStyle: 'normal',
  fontDisplay: 'swap',
})

globalFontFace('Hack NF', {
  src: 'url("/fonts/HackNerdFont-3.003-Italic.woff2") format("woff2")',
  fontWeight: 400,
  fontStyle: 'italic',
  fontDisplay: 'swap',
})

globalFontFace('Hack NF', {
  src: 'url("/fonts/HackNerdFont-3.003-BoldItalic.woff2") format("woff2")',
  fontWeight: 700,
  fontStyle: 'italic',
  fontDisplay: 'swap',
})

// Chat-scoped webfonts (mirrors openclaw-talk/public/fonts/fonts.css).
// Only loaded so the ChatView messageList stack can resolve to a real
// face — the sidebar / settings / composer continue using --font-sans.
globalFontFace('Roboto Condensed', {
  src: 'url("/fonts/Roboto-Condensed-webfont.woff") format("woff")',
  fontWeight: 400,
  fontStyle: 'normal',
  fontDisplay: 'swap',
})

globalFontFace('Roboto Condensed', {
  src: 'url("/fonts/Roboto-BoldCondensed-webfont.woff") format("woff")',
  fontWeight: 700,
  fontStyle: 'normal',
  fontDisplay: 'swap',
})

globalFontFace('Batang', {
  src: 'url("/fonts/Batang_Regular.woff") format("woff")',
  fontWeight: 400,
  fontStyle: 'normal',
  fontDisplay: 'swap',
})

globalFontFace('Batang', {
  src: 'url("/fonts/Batang_Bold.woff") format("woff")',
  fontWeight: 700,
  fontStyle: 'normal',
  fontDisplay: 'swap',
})

globalFontFace('Gyeonggi', {
  src: 'url("/fonts/Title_Light.woff") format("woff")',
  fontWeight: 300,
  fontStyle: 'normal',
  fontDisplay: 'swap',
})

globalFontFace('Gyeonggi', {
  src: 'url("/fonts/Title_Medium.woff") format("woff")',
  fontWeight: 500,
  fontStyle: 'normal',
  fontDisplay: 'swap',
})

globalFontFace('Gyeonggi', {
  src: 'url("/fonts/Title_Bold.woff") format("woff")',
  fontWeight: 700,
  fontStyle: 'normal',
  fontDisplay: 'swap',
})

globalStyle('html, body, #app', {
  height: '100%',
  width: '100%',
  overflow: 'hidden',
})

// iOS Safari viewport lock. See `docs/specs/pwa-standalone-safe-area.md`
// for the full rationale and Apple/WebKit references.
//
//  1. `position: fixed` + `height: 100dvh` ties the body to the dynamic
//     visible viewport. `dvh` tracks iOS 16.4+ keyboard-up shrinkage on
//     its own, so we don't drive body height from JS.
//  2. `padding-top: env(safe-area-inset-top)` keeps content out from
//     under the system status bar in standalone PWA mode. No bottom
//     padding — the composer sits flush with the screen bottom and the
//     home indicator overlays it translucently (KakaoTalk-style).
//  3. `transform: translateY(calc(-1 * var(--vv-offset, 0px)))` cancels
//     the residual `visualViewport.offsetTop` that iOS 26 WebKit leaves
//     non-zero after keyboard dismiss (FB19889436). `window.scrollTo(0,0)`
//     can't fix this — body is `overflow: hidden`, there's nothing to
//     scroll. The hook only sets `--vv-offset` while the keyboard is
//     *down*; during keyboard-up iOS' own visual-viewport translate
//     brings the composer into view and a counter-translate would
//     double-shift.
//
// Note: the body's `transform` makes body the containing block for
// descendant `position: fixed` elements. Native HTML `popover` API
// consumers (DropdownMenu, Tooltip, GridSizePopover, LinkPopover)
// escape via the top layer. The one non-top-layered fixed consumer is
// `SelectionQuotePopover`, which counter-translates by
// `var(--vv-offset, 0px)` to stay viewport-relative.
globalStyle('body', {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100dvh',
  paddingTop: 'env(safe-area-inset-top)',
  // NO padding-bottom: keep KakaoTalk-style intrusion (composer flush
  // with screen bottom, home-indicator translucently overlaying it).
  boxSizing: 'border-box',
  // iOS-26 mitigation: cancel any residual visualViewport.offsetTop the
  // OS leaves non-zero after keyboard dismiss. Default 0 on every other
  // platform; the hook only sets it when it's actually non-zero.
  transform: 'translateY(calc(-1 * var(--vv-offset, 0px)))',
  willChange: 'transform',
  // Kill iOS Safari's rubber-band overscroll on the page itself.
  // `overscroll-behavior` alone isn't enough on iOS WebKit — the bounce
  // is dispatched below that layer. `touch-action: none` on html+body
  // refuses the pan gesture entirely at the page level; inner scroll
  // regions opt back in (e.g. messageList → `pan-y`).
  overscrollBehavior: 'none',
  touchAction: 'none',
})

globalStyle('html', {
  overscrollBehavior: 'none',
  touchAction: 'none',
})

// Mobile form-control font-size floor. iOS Safari (browser + standalone
// PWA) auto-zooms when focusing an `<input>` / `<textarea>` / `<select>`
// whose computed font-size is < 16px. The zoom is NOT undone on blur
// and persists across in-app navigations (e.g. after submitting the
// login form), leaving the user on the next screen at ~1.15x scale with
// no easy way back. Anchoring form-control font-size at 16px on mobile
// is the standard suppression and does not affect desktop styling or
// disable user pinch-zoom.
globalStyle('input, textarea, select', {
  '@media': {
    '(max-width: 639px)': {
      fontSize: '16px',
    },
  },
})

// LeapMux color scheme overrides (light theme)
globalStyle(':root', {
  vars: {
    // Core palette — white base (openclaw-talk-aligned)
    '--background': '#ffffff',
    '--foreground': '#111827',
    '--card': '#fafbfc',
    '--card-foreground': '#111827',

    // Primary — teal accent (leapmux original; user bubble + working
    // indicator + focus ring inherit this)
    '--primary': 'rgb(13 148 136)',
    '--primary-foreground': 'rgb(255 255 255)',

    // Secondary — light neutral
    '--secondary': '#f3f4f6',
    '--secondary-foreground': '#111827',

    // Muted
    '--muted': '#f3f4f6',
    '--muted-foreground': '#6b7280',

    // Faint — subtler than muted
    '--faint': '#f9fafb',
    '--faint-foreground': '#9ca3af',

    // Accent — soft sage green (leapmux original; user bubble fill)
    '--accent': 'rgb(222 235 225)',
    '--accent-foreground': 'rgb(34 32 30)',

    // Semantic colors
    '--danger': 'rgb(220 74 68)',
    '--danger-foreground': 'rgb(255 255 255)',
    '--success': 'rgb(101 163 13)',
    '--success-foreground': 'rgb(255 255 255)',
    '--warning': 'rgb(245 158 11)',
    '--warning-foreground': '#111827',

    // Typography — wire user-configurable fonts into Oat's variables
    '--font-sans': `var(--ui-font-family, system-ui, sans-serif)`,
    '--font-mono': `var(--mono-font-family, "Hack NF", Hack, "SF Mono", Consolas, monospace)`,

    // Chat-scoped typography (applied only inside the ChatView container).
    // `Batang` is listed first for body/user so its Latin & digit glyphs
    // (which Batang does ship) are used in Hangul-mixed sentences like
    // "현재 ($17.00, +2.93%)" — Roboto Condensed first produced a visible
    // serif/sans-serif discontinuity at the language boundary. Roboto
    // Condensed remains the fallback for any glyph Batang lacks.
    '--lm-chat-body': `'Batang', 'Roboto Condensed', system-ui, -apple-system, sans-serif`,
    // Gyeonggi remains primary for titles: its display-weight Latin/digit
    // glyphs match the Hangul tone better than Roboto Condensed.
    '--lm-chat-title': `'Gyeonggi', 'Roboto Condensed', system-ui, sans-serif`,
    '--lm-chat-user': `'Batang', 'Roboto Condensed', sans-serif`,
    // System UI stack for thinking/tool cards — keeps these chrome regions
    // visually distinct from Batang-first prose. `system-ui` already resolves
    // to the platform-native CJK font on Korean macOS/iOS/Windows; explicit
    // Korean fallbacks intentionally omitted.
    '--lm-chat-system': `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,

    // Borders and interactive
    '--border': 'rgba(0,0,0,0.08)',
    '--input': 'rgba(0,0,0,0.06)',
    '--ring': '#2563eb',

    // Scrollbar
    '--scrollbar-thumb': 'rgb(from var(--muted-foreground) r g b / 0.35)',
    '--scrollbar-thumb-hover': 'rgb(from var(--muted-foreground) r g b / 0.55)',
    '--scrollbar-track': 'transparent',

    // LeapMux-specific custom variables
    '--lm-bg-translucent': 'rgba(255, 255, 255, 0.5)',
    '--lm-danger-subtle': 'rgb(253 235 233)',
    '--lm-success-subtle': 'rgb(236 247 220)',
    '--lm-warning-subtle': 'rgb(254 245 221)',
    '--lm-icon-monochrome': 'rgb(101 99 99)',
    '--lm-thinking': '#7c3aed',
    '--lm-tool': '#0891b2',
    '--lm-thinking-bg': 'rgba(124,58,237,0.03)',
    '--lm-tool-bg': 'rgba(8,145,178,0.03)',
    '--lm-tree-row-zebra-bg': 'rgba(0, 0, 0, 0.045)',
    // Chat view background — off-white "secondary" surface for the
    // conversation scroll area (distinct from the page --background).
    '--lm-view-bg': '#fafbfc',
  },
})

// LeapMux color scheme overrides (dark theme)
globalStyle('[data-theme="dark"]', {
  vars: {
    // Core palette — neutral dark base (openclaw-talk-aligned)
    '--background': 'rgb(18 18 20)',
    '--foreground': 'rgb(225 223 219)',
    '--card': 'rgb(28 27 30)',
    '--card-foreground': 'rgb(225 223 219)',

    // Primary — brighter teal for dark bg (leapmux original)
    '--primary': 'rgb(20 184 166)',
    '--primary-foreground': 'rgb(12 12 11)',

    // Secondary
    '--secondary': 'rgb(38 37 42)',
    '--secondary-foreground': 'rgb(225 223 219)',

    // Muted
    '--muted': 'rgb(38 37 42)',
    // Spec table called for rgb(120 116 112) but that gave 3.95:1 against the
    // dark background — below AA body's 4.5:1. Lightened to ~150 → 6.2:1.
    '--muted-foreground': 'rgb(150 146 142)',

    // Faint — subtler than muted
    '--faint': 'rgb(32 31 35)',
    '--faint-foreground': 'rgb(107 104 98)',

    // Accent — soft sage green (leapmux original; user bubble fill)
    '--accent': 'rgb(45 62 50)',
    '--accent-foreground': 'rgb(232 230 225)',

    // Chat-scoped typography — system UI stack for thinking/tool cards.
    // Mirrors the light-theme definition so the token resolves identically
    // if a future refactor scopes chat fonts per theme.
    '--lm-chat-system': `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,

    // Semantic colors
    '--danger': 'rgb(239 83 80)',
    '--danger-foreground': 'rgb(255 255 255)',
    '--success': 'rgb(132 204 22)',
    '--success-foreground': 'rgb(12 12 11)',
    '--warning': 'rgb(251 191 36)',
    '--warning-foreground': 'rgb(18 18 20)',

    // Borders and interactive
    '--border': 'rgba(255,255,255,0.08)',
    '--input': 'rgba(255,255,255,0.06)',
    '--ring': 'rgb(20 184 166)',

    // Scrollbar
    '--scrollbar-thumb': 'rgb(from var(--muted-foreground) r g b / 0.35)',
    '--scrollbar-thumb-hover': 'rgb(from var(--muted-foreground) r g b / 0.55)',
    '--scrollbar-track': 'transparent',

    // LeapMux-specific custom variables
    '--lm-bg-translucent': 'rgba(18, 18, 20, 0.5)',
    '--lm-danger-subtle': 'rgb(50 30 28)',
    '--lm-success-subtle': 'rgb(28 38 20)',
    '--lm-warning-subtle': 'rgb(46 40 24)',
    '--lm-icon-monochrome': 'rgb(190 187 183)',
    '--lm-opencode-inner': '#4B4646',
    '--lm-opencode-outer': '#F1ECEC',
    '--lm-thinking': '#a78bfa',
    '--lm-tool': '#22d3ee',
    '--lm-thinking-bg': 'rgba(124,58,237,0.08)',
    '--lm-tool-bg': 'rgba(8,145,178,0.08)',
    '--lm-tree-row-zebra-bg': 'rgba(255, 255, 255, 0.05)',
    // Chat view background — matches --card for dark to keep the
    // conversation area slightly lifted from the page --background.
    '--lm-view-bg': 'rgb(28 27 30)',
  },
})

// Override Oat's code/pre background (var(--faint)) with a semi-transparent
// foreground tint so it blends naturally on any surface.
globalStyle('code, pre', {
  backgroundColor: 'rgb(from var(--foreground) r g b / 0.075)',
})

// Prevent double background when code/pre are nested.
globalStyle('pre code, pre pre, code pre, code code', {
  backgroundColor: 'transparent',
})

// Reduce hr margin inside dropdown menus (Oat base sets var(--space-8) = 2rem).
globalStyle('ot-dropdown hr', {
  margin: 'var(--space-2) 0',
})

// Remove italic from blockquotes (Oat default).
globalStyle('blockquote', {
  fontStyle: 'normal',
})

// Enable native width/height: auto transitions (progressive enhancement).
globalStyle(':root', {
  interpolateSize: 'allow-keywords',
} as any)

// Extend Oat button transitions to include color, border-color, and width.
globalStyle('button, [role="button"]', {
  'transition': 'background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), opacity var(--transition-fast), transform var(--transition-fast), width var(--transition-fast)',
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
})

// Consistent thin scrollbars across browsers (standard CSS — Firefox & Chrome 121+).
globalStyle('*', {
  scrollbarWidth: 'thin',
  scrollbarColor: 'var(--scrollbar-thumb) var(--scrollbar-track)',
})

// WebKit scrollbar styling (Safari & older Chrome).
globalStyle('*::-webkit-scrollbar', {
  width: '8px',
  height: '8px',
})

globalStyle('*::-webkit-scrollbar-track', {
  background: 'transparent',
})

globalStyle('*::-webkit-scrollbar-thumb', {
  backgroundColor: 'var(--scrollbar-thumb)',
  borderRadius: '4px',
  border: '2px solid transparent',
  backgroundClip: 'content-box',
})

globalStyle('*::-webkit-scrollbar-thumb:hover', {
  backgroundColor: 'var(--scrollbar-thumb-hover)',
})

globalStyle('*::-webkit-scrollbar-corner', {
  background: 'transparent',
})

// Prevent radio/checkbox inputs from shrinking inside flex containers.
globalStyle('input[type="radio"], input[type="checkbox"]', {
  flexShrink: 0,
})

// Render the focus ring inside the element so it is never clipped by an
// ancestor with overflow: hidden. Outline color and thickness still come
// from Oat's :focus-visible rule (2px solid var(--ring)); we only flip the
// offset from +2px (outside) to -2px (inside).
globalStyle(':focus-visible', {
  outlineOffset: '-2px',
})

// Add a 1px --background-colored ring just inside the focus outline on
// Oat-styled buttons so the teal outline stays distinguishable when the
// button itself is filled with --primary / --secondary / --danger. Uses
// var(--background) so the inner ring is invisible on surfaces that share
// the page background (where no separator is needed).
globalStyle(
  'button:focus-visible, [type="submit"]:focus-visible, [type="reset"]:focus-visible, [type="button"]:focus-visible, a.button:focus-visible, ::file-selector-button:focus-visible',
  {
    boxShadow: 'inset 0 0 0 2px var(--background)',
  },
)
