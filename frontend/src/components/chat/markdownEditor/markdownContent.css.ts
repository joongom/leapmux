import { globalStyle, style } from '@vanilla-extract/css'
import { codeBlockCode, codeBlockPre } from '~/styles/codeBlock'
import { iconSize } from '~/styles/tokens'

export const markdownContent = style({
  wordBreak: 'break-word',
})

// Code blocks: move scroll to <code> so the copy button stays fixed.
globalStyle(`${markdownContent} pre`, codeBlockPre('hidden'))
globalStyle(`${markdownContent} pre code`, codeBlockCode)

// Shiki dual-theme support via CSS variables
globalStyle(`${markdownContent} pre.shiki`, {
  color: 'var(--shiki-light)',
})

globalStyle(`${markdownContent} pre.shiki span`, {
  color: 'var(--shiki-light)',
})

globalStyle(`html[data-theme="dark"] ${markdownContent} pre.shiki`, {
  color: 'var(--shiki-dark)',
})

globalStyle(`html[data-theme="dark"] ${markdownContent} pre.shiki span`, {
  color: 'var(--shiki-dark)',
})

// Task list checkboxes
globalStyle(`${markdownContent} li > input[type="checkbox"]`, {
  marginRight: 'var(--space-1)',
  verticalAlign: 'middle',
  pointerEvents: 'none',
})

// Copy button for code blocks (injected via DOM)
globalStyle(`${markdownContent} pre .copy-code-button`, {
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
  transition: 'opacity 0.15s',
})

globalStyle(`${markdownContent} pre:hover .copy-code-button`, {
  opacity: '1',
})

globalStyle(`${markdownContent} pre .copy-code-button:hover`, {
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
