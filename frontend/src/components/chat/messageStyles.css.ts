import { globalStyle, keyframes, style } from '@vanilla-extract/css'
import { toolHeaderActions, toolHeaderTimestamp } from './toolStyles.css'

// Shared content rules for any message (flat or bubble). Position is relative
// so absolutely positioned action rows can anchor here.
export const messageBase = style({
  position: 'relative',
  lineHeight: 1.6,
  wordBreak: 'break-word',
})

// Bubble chrome — composed by user / plan / system messages that keep the
// rounded-card appearance.
export const bubbleChrome = style({
  padding: 'var(--space-3) var(--space-4)',
  borderRadius: 'var(--radius-medium)',
  maxWidth: '85%',
})

// Back-compat alias: any code (or globalStyle selector) that referenced
// messageBubble keeps targeting both flat and bubble messages via this
// composed class.
export const messageBubble = style([messageBase, bubbleChrome])

export const userMessage = style([messageBase, bubbleChrome, {
  backgroundColor: 'var(--accent)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
  alignSelf: 'flex-end',
  fontFamily: 'var(--lm-chat-user)',
}])

const pendingPulse = keyframes({
  '0%, 100%': { opacity: 0.5 },
  '50%': { opacity: 0.85 },
})

export const userMessagePending = style([messageBase, bubbleChrome, {
  'backgroundColor': 'var(--accent)',
  'border': '1px solid var(--border)',
  'color': 'var(--foreground)',
  'alignSelf': 'flex-end',
  'fontFamily': 'var(--lm-chat-user)',
  'animation': `${pendingPulse} 1.5s ease-in-out infinite`,
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
      opacity: 0.6,
    },
  },
}])

// Flat assistant body — no bubble chrome. Flows to full chat-column width so
// wide tables / diffs / code stay readable like a document.
export const assistantMessage = style([messageBase, {
  color: 'var(--foreground)',
  alignSelf: 'stretch',
  maxWidth: '100%',
  // Spacing between body and the below-body action row (inside flex row).
  // The parent `messageRow:has(> .assistantMessage)` carries its own
  // marginBottom for inter-row gap; flex items don't collapse margins so the
  // two are additive-but-separate (inside vs. outside the row).
  marginBottom: 'var(--space-4)',
}])

// Carded thinking body — purple-tinted card chrome (`--lm-thinking-bg`) wraps
// the body so the "사고 과정" block reads as a distinct grouped region rather
// than free-flowing prose. Replaces the prior 2px left-accent rule.
export const thinkingMessage = style([messageBase, {
  'color': 'var(--muted-foreground)',
  'fontFamily': 'var(--lm-chat-system)',
  'alignSelf': 'stretch',
  'maxWidth': '100%',
  'backgroundColor': 'var(--lm-thinking-bg)',
  'border': '1px solid var(--border)',
  'borderRadius': 'var(--radius-medium)',
  'padding': 'var(--space-3) var(--space-4)',
  'marginBottom': 'var(--space-4)',
  '@media': {
    '(max-width: 640px)': {
      padding: 'var(--space-2)',
    },
  },
}])

// Shrink prose-bearing descendants of the thinking card by ~10% so the
// thinking block reads as a lighter-weight aside next to the main response.
// Headings (h1..h6) are included so they don't tower over the body prose
// inside the card; code/pre stay excluded (shiki has its own size system).
globalStyle(`${thinkingMessage} p, ${thinkingMessage} li, ${thinkingMessage} blockquote, ${thinkingMessage} td, ${thinkingMessage} th, ${thinkingMessage} h1, ${thinkingMessage} h2, ${thinkingMessage} h3, ${thinkingMessage} h4, ${thinkingMessage} h5, ${thinkingMessage} h6`, {
  fontSize: '0.9em',
})

// Plan execution stays as a user-aligned bubble (it represents a user-issued
// plan command, not assistant prose).
export const planExecutionMessage = style([messageBase, bubbleChrome, {
  backgroundColor: 'var(--accent)',
  border: '1px dashed var(--border)',
  color: 'var(--foreground)',
  alignSelf: 'flex-end',
}])

// Header row above an assistant_text / assistant_thinking message: avatar +
// name + timestamp. Makes flat rows feel attributed, not anonymous.
export const assistantHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  marginBottom: 'var(--space-2)',
})

export const assistantAvatar = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  background: 'var(--accent)',
  color: 'var(--foreground)',
  fontSize: 'var(--text-8)',
  fontWeight: 'var(--font-bold)',
  fontFamily: 'var(--lm-chat-title)',
  flexShrink: 0,
  textTransform: 'uppercase',
  userSelect: 'none',
})

export const assistantName = style({
  fontFamily: 'var(--lm-chat-title)',
  fontSize: 'var(--text-7)',
  fontWeight: 'var(--font-bold)',
  color: 'var(--foreground)',
})

export const assistantTimestamp = style({
  fontSize: 'var(--text-8)',
  color: 'var(--muted-foreground)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-1)',
})

export const thinkingHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-1)',
  color: 'var(--muted-foreground)',
  cursor: 'pointer',
  userSelect: 'none',
})

export const thinkingChevron = style({
  'flexShrink': 0,
  'transition': 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
})

export const thinkingChevronExpanded = style({
  transform: 'rotate(90deg)',
})

export const thinkingContent = style({
  marginTop: 'var(--space-2)',
})

export const systemMessage = style([messageBase, bubbleChrome, {
  backgroundColor: 'transparent',
  border: '1px dashed var(--border)',
  color: 'var(--muted-foreground)',
  alignSelf: 'center',
  fontSize: 'var(--text-7)',
}])

globalStyle(`${systemMessage} pre`, {
  whiteSpace: 'pre-wrap',
  margin: 0,
})

export const metaMessage = style({
  alignSelf: 'stretch',
  minWidth: 0,
})

// Carded tool body — composed onto metaMessage so the existing
// `${messageRow} > .${metaMessage}` flex + actions-positioning rules continue
// to apply. Cyan-tinted (`--lm-tool-bg`) chrome to differentiate tool blocks
// from thinking cards. Same border / radius / padding shape as thinkingMessage.
export const toolCard = style([metaMessage, {
  'fontFamily': 'var(--lm-chat-system)',
  'backgroundColor': 'var(--lm-tool-bg)',
  'border': '1px solid var(--border)',
  'borderRadius': 'var(--radius-medium)',
  'padding': 'var(--space-3) var(--space-4)',
  '@media': {
    '(max-width: 640px)': {
      padding: 'var(--space-2)',
    },
  },
}])

// Match the thinking card's 0.9em prose treatment so tool result bodies and
// headings sit visually subordinate to main assistant prose. Separate
// globalStyle call (not merged via comma with the thinking rule) so the
// two cards can diverge in the future without specificity fights.
globalStyle(`${toolCard} p, ${toolCard} li, ${toolCard} blockquote, ${toolCard} td, ${toolCard} th, ${toolCard} h1, ${toolCard} h2, ${toolCard} h3, ${toolCard} h4, ${toolCard} h5, ${toolCard} h6`, {
  fontSize: '0.9em',
})

export const resultDivider = style({
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  color: 'var(--muted-foreground)',
  fontSize: 'var(--text-7)',
  selectors: {
    '&::before': {
      content: '""',
      flex: 1,
      height: '1px',
      background: 'var(--border)',
    },
    '&::after': {
      content: '""',
      flex: 1,
      height: '1px',
      background: 'var(--border)',
    },
  },
})

// Error detail text shown below the result divider for execution errors
export const resultErrorDetail = style({
  margin: 0,
  padding: '0 var(--space-3)',
  fontSize: 'var(--text-7)',
  fontFamily: 'var(--font-mono)',
  fontVariantLigatures: 'none',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  color: 'var(--muted-foreground)',
})

// Hidden message rendered as raw JSON (developer mode)
export const hiddenMessageJson = style({
  margin: 0,
  padding: 'var(--space-2) var(--space-3)',
  fontSize: 'var(--text-7)',
  fontFamily: 'var(--font-mono)',
  fontVariantLigatures: 'none',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  color: 'var(--muted-foreground)',
  backgroundColor: 'var(--card)',
  border: '1px dashed var(--border)',
  borderRadius: 'var(--radius-small)',
  maxHeight: '300px',
  overflow: 'auto',
})

// Reset Shiki's <pre>/<code> chrome so the wrapper's padding/border/scroll
// remain authoritative; spans pick up dual-theme colors via CSS vars.
globalStyle(`${hiddenMessageJson} pre.shiki`, {
  margin: 0,
  padding: 0,
  border: 'none',
  background: 'none',
  backgroundColor: 'transparent',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  fontSize: 'inherit',
  fontFamily: 'inherit',
  lineHeight: 'inherit',
})

globalStyle(`${hiddenMessageJson} pre.shiki code`, {
  padding: 0,
  background: 'none',
  backgroundColor: 'transparent',
  fontSize: 'inherit',
  fontFamily: 'inherit',
})

globalStyle(`${hiddenMessageJson} pre.shiki span`, {
  color: 'var(--shiki-light)',
})

globalStyle(`html[data-theme="dark"] ${hiddenMessageJson} pre.shiki span`, {
  color: 'var(--shiki-dark)',
})

// Control response message (compact)
export const controlResponseMessage = style({
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  color: 'var(--foreground)',
  fontSize: 'var(--text-7)',
  alignSelf: 'stretch',
})

// Base styles for message row layout
const messageRowBase = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--space-1)',
  alignSelf: 'stretch',
  maxWidth: '100%',
} as const

// Flex row wrapping a message bubble + right-aligned ToolHeaderActions outside the bubble
export const messageRow = style(messageRowBase)

// Right-aligned variant for user message bubbles
export const messageRowEnd = style({
  ...messageRowBase,
  justifyContent: 'flex-end',
})

// Centered variant for status/notification messages
export const messageRowCenter = style({
  ...messageRowBase,
  justifyContent: 'center',
  position: 'relative',
})

// Vertical rhythm: flat assistant/thinking rows get 16px (var(--space-4))
// breathing room beneath them so consecutive flat blocks don't fuse without
// a card frame. User and notification rows keep the previous compact density.
globalStyle(`${messageRow}:has(> .${assistantMessage}), ${messageRow}:has(> .${thinkingMessage})`, {
  marginTop: 'var(--space-1)',
  marginBottom: 'var(--space-4)',
})

globalStyle(`${messageRowEnd}, ${messageRowCenter}`, {
  marginTop: 'var(--space-1)',
  marginBottom: 'var(--space-1)',
})

// Stack assistant/thinking row as a column so the action row sits below body.
globalStyle(`${messageRow}:has(> .${assistantMessage}), ${messageRow}:has(> .${thinkingMessage})`, {
  flexDirection: 'column',
  alignItems: 'stretch',
})

// Inside messageRow, stretch meta messages (tools, result dividers) to fill available space
globalStyle(`${messageRow} > .${metaMessage}`, {
  flex: 1,
  alignSelf: 'auto',
})

// Inside messageRow containing a metaMessage, position actions absolutely so they don't take space.
// Tool rows also get the spec's micro-divider: a 1px hairline + tighter
// vertical rhythm (var(--space-2)) since dense tool sequences should stay compact.
globalStyle(`${messageRow}:has(> .${metaMessage})`, {
  position: 'relative',
  marginTop: 'var(--space-1)',
  marginBottom: 'var(--space-2)',
  paddingTop: 'var(--space-2)',
  borderTop: '1px solid var(--border)',
})

// Carded tool rows already carry a full border, so suppress the meta-row
// hairline (and its associated paddingTop) to avoid a double edge above the
// card. Must come AFTER the generic metaMessage rule above so the cascade wins
// for rows whose meta child is specifically a `toolCard`.
globalStyle(`${messageRow}:has(> .${toolCard})`, {
  borderTop: 'none',
  paddingTop: 0,
})

globalStyle(`${messageRow}:has(> .${metaMessage}) > .${toolHeaderActions}`, {
  position: 'absolute',
  right: 0,
  marginLeft: 0,
  background: 'var(--background)',
  borderRadius: 'var(--radius-small)',
  paddingLeft: 'var(--space-1)',
})

// Inside messageRowEnd, place actions to the left of the bubble in a 2-column grid (mirrored via RTL)
globalStyle(`${messageRowEnd} > .${toolHeaderActions}`, {
  order: -1,
  paddingRight: 'var(--space-1)',
  paddingTop: 'var(--space-1)',
  paddingBottom: 'var(--space-1)',
  display: 'grid',
  gridTemplateColumns: 'auto auto',
  direction: 'rtl',
})

// Reset direction on children so text inside buttons renders LTR
globalStyle(`${messageRowEnd} > .${toolHeaderActions} > *`, {
  direction: 'ltr',
})

// Assistant/thinking action row sits flush beneath the message body. Drop the
// old 2-col grid that paired actions with the right gutter — the row wrapper is
// now a flex column (see flexDirection rule above) so a single horizontal flex
// row reads naturally below the prose. Spec "Action row design" specifies
// `var(--space-2)` (0.5rem) gap between items — override the tighter 2px
// default used by tool-row actions in the right gutter, which stays unchanged.
globalStyle(`${messageRow}:has(> .${assistantMessage}) > .${toolHeaderActions}, ${messageRow}:has(> .${thinkingMessage}) > .${toolHeaderActions}`, {
  marginTop: 'var(--space-1)',
  marginLeft: 0,
  paddingLeft: 0,
  display: 'flex',
  alignSelf: 'flex-start',
  gap: 'var(--space-2)',
})

// Add right padding to timestamps in user grid (mirrored) so they align with the icon button below
globalStyle(`${messageRowEnd} > .${toolHeaderActions} .${toolHeaderTimestamp}`, {
  paddingRight: 'var(--space-1)',
})

// Inside messageRowCenter, position actions at the right edge absolutely
globalStyle(`${messageRowCenter} > .${toolHeaderActions}`, {
  position: 'absolute',
  right: 0,
  marginLeft: 0,
  background: 'var(--background)',
  borderRadius: 'var(--radius-small)',
  paddingLeft: 'var(--space-1)',
})

// When hovering or keyboard-focusing a message row, reveal the actions.
// :focus-within keeps the actions operable for keyboard users (A11y checklist).
globalStyle(`${messageRow}:hover .${toolHeaderActions}, ${messageRowEnd}:hover .${toolHeaderActions}, ${messageRowCenter}:hover .${toolHeaderActions}, ${messageRow}:focus-within .${toolHeaderActions}, ${messageRowEnd}:focus-within .${toolHeaderActions}, ${messageRowCenter}:focus-within .${toolHeaderActions}`, {
  opacity: 1,
})

// Target both flat (assistantMessage/thinkingMessage) and bubble messages —
// messageBase is composed by every message variant via T3/T4.
globalStyle(`${messageBase} code`, {
  fontFamily: 'var(--font-mono)',
  fontVariantLigatures: 'none',
})

globalStyle(`${messageBase} pre`, {
  fontFamily: 'var(--font-mono)',
  fontVariantLigatures: 'none',
})

// Attachment list shown inside user message bubbles in chat history
export const attachmentList = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '2px',
  fontSize: 'var(--text-8)',
  marginBottom: 'var(--space-2)',
})

export const attachmentItem = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-1)',
  color: 'var(--muted-foreground)',
})
