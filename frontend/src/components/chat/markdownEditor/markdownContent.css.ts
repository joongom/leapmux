import { globalStyle, style } from '@vanilla-extract/css'
import { codeBlockCode, codeBlockPre, codeWrap } from '~/styles/codeBlock'
import { iconSize } from '~/styles/tokens'
import { shikiDualThemeColors } from '../shikiTokenColors.css'

export const markdownContent = style({
  wordBreak: 'break-word',
})

// Code blocks: move scroll to <code> so the copy button stays fixed.
globalStyle(`${markdownContent} pre`, codeBlockPre('hidden'))
globalStyle(`${markdownContent} pre code`, codeBlockCode)
// Rendered (read-only) markdown code blocks WRAP long lines like every other read-only
// code surface (tool output, Read, diff) instead of scrolling horizontally, which is
// awkward inside a chat message; the copy button preserves the exact source regardless.
// Scoped to markdownContent so the Milkdown EDITOR (which shares codeBlockCode) keeps
// horizontal scroll for a stable caret while typing.
globalStyle(`${markdownContent} pre code`, codeWrap)

// Shiki dual-theme support via CSS variables (color only -- the wrapper owns the bg)
shikiDualThemeColors(`${markdownContent} pre.shiki`)
shikiDualThemeColors(`${markdownContent} pre.shiki span`)

// Task list checkboxes
globalStyle(`${markdownContent} li > input[type="checkbox"]`, {
  marginRight: 'var(--space-1)',
  verticalAlign: 'middle',
  pointerEvents: 'none',
})

// Copy button for code blocks (injected via DOM by MessageBubble.injectCopyButtons).
//
// Keyed to the `code-copy-host` marker class the injector adds to every <pre> it
// augments -- NOT to `.markdownContent`. The button is injected into code blocks in any
// context (markdown bodies AND non-markdown <pre> such as a result-divider error
// detail), but the positioning used to be scoped to `${markdownContent} pre ...`, so a
// <pre> outside the markdown wrapper got an UNpositioned button that fell inline at the
// end of the text. Anchoring on the marker class instead positions it top-right
// everywhere, and the marker carries `position: relative` so the absolute button anchors
// to its own <pre> regardless of the surrounding layout.
export const codeCopyHostClass = 'code-copy-host'

globalStyle(`.${codeCopyHostClass}`, {
  position: 'relative',
})

globalStyle(`.${codeCopyHostClass} .copy-code-button`, {
  all: 'unset',
  boxSizing: 'border-box',
  position: 'absolute',
  top: 'var(--space-1)',
  right: 'var(--space-1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: iconSize.container.md,
  height: iconSize.container.md,
  borderRadius: 'var(--radius-small)',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--card)',
  color: 'var(--muted-foreground)',
  cursor: 'pointer',
  opacity: '0',
  transition: 'opacity var(--transition)',
})

globalStyle(`.${codeCopyHostClass}:hover .copy-code-button`, {
  opacity: '1',
})

globalStyle(`.${codeCopyHostClass} .copy-code-button:hover`, {
  backgroundColor: 'var(--card)',
  color: 'var(--foreground)',
})

// Paragraph rhythm — mirrors openclaw-talk `.chat-prose p` rules.
globalStyle(`${markdownContent} p`, {
  marginBottom: '0.5em',
})

globalStyle(`${markdownContent} p:last-child`, {
  marginBottom: 0,
})

// Lists — mirrors `.chat-prose ul, .chat-prose ol, .chat-prose li`.
globalStyle(`${markdownContent} ul, ${markdownContent} ol`, {
  margin: '0.4em 0',
  paddingLeft: '1.5em',
})

globalStyle(`${markdownContent} li`, {
  marginBottom: '0.2em',
})

// Inline code (not inside <pre>) — mirrors `.chat-prose code:not(pre code)`.
// Background/colour stays on Oat's global `code, pre` rule; we only adjust
// the typographic metrics so it visually aligns with body text.
globalStyle(`${markdownContent} :not(pre) > code`, {
  fontSize: '0.87em',
  lineHeight: 1.5,
  padding: '0.12em 0.35em',
  borderRadius: '4px',
})

// Code blocks — keep mono pre on a tighter line-height than body prose.
globalStyle(`${markdownContent} pre`, {
  lineHeight: 1.5,
  maxWidth: '100%',
})

// Blockquote — mirrors `.chat-prose blockquote`.
globalStyle(`${markdownContent} blockquote`, {
  borderLeft: '2px solid var(--border)',
  paddingLeft: '1em',
  color: 'var(--muted-foreground)',
  margin: '0.75em 0',
})

// Horizontal rule — mirrors `.chat-prose hr`.
globalStyle(`${markdownContent} hr`, {
  border: 'none',
  borderTop: '1px solid var(--border)',
  margin: '1em 0',
})

// Tables — mirrors openclaw-talk/src/app/globals.css `.chat-prose table` rules.
globalStyle(`${markdownContent} table`, {
  width: '100%',
  borderCollapse: 'collapse',
  margin: '0.75em 0',
  fontSize: '14px',
})

globalStyle(`${markdownContent} th, ${markdownContent} td`, {
  border: '1px solid var(--border)',
  padding: '0.4em 0.6em',
  textAlign: 'left',
  lineHeight: 1.5,
})

globalStyle(`${markdownContent} th`, {
  backgroundColor: 'var(--muted)',
  fontWeight: 'var(--font-bold)',
})

// Mobile: shrink + horizontal scroll (matches openclaw-talk).
globalStyle(`${markdownContent} table`, {
  '@media': {
    '(max-width: 640px)': {
      fontSize: '0.8em',
      display: 'block',
      overflowX: 'auto',
    },
  },
})
