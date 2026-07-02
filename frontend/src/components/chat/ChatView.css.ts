import { globalStyle, keyframes, style } from '@vanilla-extract/css'
import { resizeHandleSelectors } from '~/styles/resizeHandle'
import { breakpoints } from '~/styles/tokens'

export const editorResizeHandle = style({
  'height': '4px',
  'flexShrink': 0,
  'cursor': 'row-resize',
  'position': 'relative',
  'userSelect': 'none',
  'margin': '-2px 0',
  'zIndex': 5,
  'selectors': resizeHandleSelectors('vertical'),
  // Mobile: composer height is content-driven; manual resize handle is
  // a desktop-only affordance. Suppressing here also hides the visual
  // divider — the mobile composer's `border-top` replaces it.
  '@media': {
    '(max-width: 639px)': {
      display: 'none',
    },
  },
})

export const editorResizeHandleActive = style({
  selectors: {
    '&::before': {
      background: 'var(--primary) !important',
      height: '1px !important',
    },
  },
})

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  // Column flex parent must allow children to shrink so `messageList`'s
  // `flex: 1` can collapse to give room to `editorPanelWrapper` when the
  // viewport shrinks (e.g. iOS keyboard). See spec T5.
  minHeight: 0,
  overflow: 'hidden',
})

export const messageListWrapper = style({
  position: 'relative',
  flex: 1,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
})

export const messageListSpacer = style({
  flex: 1,
})

// This wrapper is the direct flex child of the scroll container. It must keep
// the virtual spacer's full height; shrinking it lets the browser clamp
// scrollTop against transient child overflow while virtual rows are swapped.
export const messageListSelectionRoot = style({
  flexShrink: 0,
  overflowAnchor: 'none',
})

export const messageListContent = style({
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  gap: 'var(--space-5)',
})

export const messageList = style({
  flex: 1,
  overflowX: 'hidden',
  overflowY: 'auto',
  overflowAnchor: 'none',
  // Keep iOS rubber-band bounce local to the message list so it never
  // propagates up to `mobileCenter` and jitters the composer. Safe on
  // desktop — purely a scroll-chain isolation hint. See spec T7.
  overscrollBehavior: 'contain',
  // The page (`html, body`) sets `touch-action: none` to refuse iOS's
  // OS-level rubber-band gesture. Opt back in to vertical pan here so
  // chat history is still scrollable by touch.
  touchAction: 'pan-y',
  padding: 'var(--space-4) var(--space-4) var(--space-4) var(--space-6)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
  // Off-white "view" surface so the conversation reads as a distinct
  // region from the page chrome.
  backgroundColor: 'var(--lm-view-bg)',
  // openclaw-talk .chat-prose baseline typography
  fontFamily: 'var(--lm-chat-body)',
  fontSize: '16px',
  lineHeight: 1.75,
  letterSpacing: '-0.01em',
})

// Headings inside chat message content use the chat title font stack with
// the openclaw-talk .chat-prose heading metrics — explicit `font-size: 1em`
// keeps every level at body size (matches openclaw-talk's Tailwind preflight
// reset + .chat-prose override; only weight, family, and margins distinguish
// headings from body prose).
globalStyle(`${messageList} h1, ${messageList} h2, ${messageList} h3, ${messageList} h4, ${messageList} h5, ${messageList} h6`, {
  fontFamily: 'var(--lm-chat-title)',
  fontSize: '1em',
  fontWeight: 'var(--font-bold)',
  letterSpacing: '-0.02em',
  marginTop: '1.25em',
  marginBottom: '0.5em',
})

// Bold inline runs (`**bold**`, `<strong>`, `<b>`) inherit body size; only
// the weight changes — same as openclaw-talk's behaviour (no explicit rule
// → browser default weight 700, inherited size).
globalStyle(`${messageList} strong, ${messageList} b`, {
  fontWeight: 'var(--font-bold)',
})

/**
 * Shared look of the "Loading older/newer messages..." indicators. Each is an absolute
 * OVERLAY pill (a sibling of the scroll container, inside the relative wrapper), NOT in
 * the scroll flow. An in-flow indicator would shift the virtualized content by its
 * height when fetching toggles -- and that shift is invisible to the anchor re-pin
 * (whose offset map covers only the virtual rows), so the view bounces by the
 * indicator's height each load cycle and a scrolled reader gets stuck re-triggering the
 * load. As an overlay it never moves the content. pointer-events: none so it can't
 * swallow a scroll/click landing on it. The top/bottom edge is set by each variant.
 */
const loadingIndicatorBase = style({
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  padding: 'var(--space-2) var(--space-4)',
  // Match the scroll-to-bottom button's corner (the base button radius token),
  // not a pill -- both float over the same viewport so they should read as one set.
  borderRadius: 'var(--radius-medium)',
  backgroundColor: 'var(--background)',
  border: '1px solid var(--border)',
  color: 'var(--muted-foreground)',
  fontSize: 'var(--text-7)',
  pointerEvents: 'none',
  opacity: 0.95,
})

/** "Loading older messages..." overlay, pinned top-center while scrolled up against the loaded top edge. */
export const loadingOlderIndicator = style([loadingIndicatorBase, { top: 'var(--space-3)' }])

/**
 * "Loading newer messages..." overlay, pinned bottom-center. It takes the scroll-to-bottom
 * button's exact slot (same bottom-center anchor); ChatView hides that button while this is
 * shown (scroll.stalledNewer()) so the two never overlap.
 */
export const loadingNewerIndicator = style([loadingIndicatorBase, { bottom: 'var(--space-3)' }])

export const inputArea = style({
  padding: 'var(--space-1) var(--space-3) var(--space-3)',
  flexShrink: 0,
})

export const footerBar = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 'var(--space-1) var(--space-1) var(--space-1) var(--space-3)',
  backgroundColor: 'var(--background)',
  flexShrink: 0,
})

export const footerBarLeft = style({
  display: 'flex',
  alignItems: 'center',
})

export const scrollToBottomButton = style({
  'position': 'absolute',
  'bottom': 'var(--space-3)',
  'left': '50%',
  'transform': 'translateX(-50%)',
  'zIndex': 10,
  'width': '36px',
  'height': '36px',
  'backgroundColor': 'var(--background)',
  'opacity': 0.8,
  ':hover': {
    opacity: 1,
  },
})

/**
 * Inline startup indicator rendered after the last message when the
 * agent is STARTING or STARTUP_FAILED and the user has already queued
 * messages. Keeps the startup panel visible even when the outer Show's
 * fallback-centered empty state is no longer active. Aligned to match
 * the left margin of message rows.
 */
export const startupPanelInline = style({
  marginLeft: '1px',
  color: 'var(--faint-foreground)',
})

export const emptyChat = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  color: 'var(--faint-foreground)',
})

export const settingsTrigger = style({
  all: 'unset',
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-1)',
  padding: '2px var(--space-1)',
  marginBottom: '3px',
  marginLeft: '-3px',
  fontSize: 'var(--text-8)',
  color: 'var(--faint-foreground)',
  cursor: 'pointer',
  borderRadius: 'var(--radius-small)',
  whiteSpace: 'nowrap',
  userSelect: 'none',
  selectors: {
    '&:hover': { color: 'var(--foreground)', backgroundColor: 'var(--card)' },
    '&[data-disabled]': { opacity: 0.5, cursor: 'default' },
  },
})

export const settingsMenu = style({
  backgroundColor: 'var(--background)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-medium)',
  padding: 'var(--space-4)',
  zIndex: 300,
  minWidth: '180px',
  // Popover/modal max-height: `100vh` is intentional here (not `100dvh`
  // or `--vvh`). A popover is short-lived, doesn't coexist with the
  // virtual keyboard, and should size against the fixed layout viewport
  // so it doesn't snap when the iOS address bar collapses/expands.
  // See chat-composer-mobile spec T11.
  maxHeight: 'calc(100vh - var(--space-6) * 2)',
  overflowY: 'auto',
  boxShadow: 'var(--shadow-large)',
})

export const settingsMenuWide = style({
  'minWidth': '460px',
  '@media': {
    [`(max-width: ${breakpoints.sm - 1}px)`]: {
      minWidth: 'auto',
    },
  },
})

export const settingsPanelColumns = style({
  'display': 'flex',
  'alignItems': 'flex-start',
  'gap': 'var(--space-4)',
  '@media': {
    [`(max-width: ${breakpoints.sm - 1}px)`]: {
      flexDirection: 'column',
      gap: 'var(--space-1)',
    },
  },
})

export const settingsPanelColumn = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
  flex: 1,
  minWidth: 0,
})

export const settingsPanelColumnPrimary = style({
  flex: 1.2,
})

export const settingsFieldset = style({
  position: 'relative',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-medium)',
  padding: 'var(--space-3) var(--space-2) var(--space-2)',
  minWidth: 0,
  selectors: {
    // Read-only group (RadioGroup disabled): mute it and drop the interactive
    // cursor, following the settingsTrigger &[data-disabled] pattern.
    '&[data-disabled]': { opacity: 0.5, cursor: 'default' },
  },
})

export const settingsFieldsetFirst = style({
  marginBlockStart: 0,
})

export const settingsGroupLabel = style({
  position: 'absolute',
  top: 0,
  left: 'var(--space-3)',
  transform: 'translateY(-50%)',
  display: 'inline-block',
  padding: '0 var(--space-2)',
  fontSize: 'var(--text-8)',
  fontWeight: 'var(--font-bold)',
  color: 'var(--muted-foreground)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
  backgroundColor: 'var(--background)',
})

export const settingsRadioItem = style({
  'all': 'unset',
  'boxSizing': 'border-box',
  'display': 'flex',
  'alignItems': 'center',
  'gap': 'var(--space-2)',
  'padding': '3px var(--space-2)',
  'fontSize': 'var(--text-8)',
  'color': 'var(--foreground)',
  'cursor': 'pointer',
  'userSelect': 'none',
  ':hover': {
    backgroundColor: 'var(--card)',
  },
  'selectors': {
    // Inside a read-only group, the items are inert: no interactive cursor, no
    // hover affordance.
    [`${settingsFieldset}[data-disabled] &`]: { cursor: 'default' },
    [`${settingsFieldset}[data-disabled] &:hover`]: { backgroundColor: 'transparent' },
  },
})

// Searchable select: current value display
export const searchableSelectCurrent = style({
  padding: '3px var(--space-2)',
  fontSize: 'var(--text-8)',
  color: 'var(--muted-foreground)',
})

// Searchable select: scrollable list
export const searchableSelectListbox = style({
  // Height fits 5 items (compact — selected value + filter input take extra space).
  // Each item is 1lh tall + 6px vertical padding → calc(1lh + 6px) per item.
  // Font-size must match items so 1lh resolves to the correct item line-height.
  fontSize: 'var(--text-8)',
  minHeight: 'calc((1lh + 6px) * 5)',
  maxHeight: 'calc((1lh + 6px) * 5)',
  overflowY: 'auto',
})

// Searchable select: item
export const searchableSelectItem = style({
  'display': 'flex',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'gap': 'var(--space-2)',
  'padding': '3px var(--space-2)',
  'fontSize': 'var(--text-8)',
  'color': 'var(--foreground)',
  'cursor': 'pointer',
  'userSelect': 'none',
  'whiteSpace': 'nowrap',
  'borderRadius': 'var(--radius-small)',
  ':hover': {
    backgroundColor: 'var(--card)',
  },
})

// Searchable select: highlighted item (keyboard navigation)
export const searchableSelectItemHighlighted = style({
  backgroundColor: 'var(--muted)',
})

// Searchable select: currently selected item
export const searchableSelectItemSelected = style({
  fontWeight: 'var(--font-bold)',
})

// Searchable select: secondary text (right-aligned, muted)
export const searchableSelectItemSecondary = style({
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-8)',
  color: 'var(--muted-foreground)',
  marginLeft: 'auto',
  flexShrink: 0,
})

// Searchable select: filter input container
export const searchableSelectControl = style({
  padding: '3px var(--space-2)',
  borderTop: '1px solid var(--border)',
  marginTop: 'var(--space-1)',
})

// Searchable select: filter input
export const searchableSelectInput = style({
  'all': 'unset',
  'boxSizing': 'border-box',
  'width': '100%',
  'fontSize': 'var(--text-8)',
  'color': 'var(--foreground)',
  '::placeholder': {
    color: 'var(--faint-foreground)',
  },
})

export const footerBarRight = style({
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-1)',
})

export const infoTrigger = style({
  all: 'unset',
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-1)',
  padding: '2px',
  fontSize: 'var(--text-8)',
  color: 'var(--faint-foreground)',
  cursor: 'pointer',
  borderRadius: 'var(--radius-small)',
  vars: {
    '--context-grid-inactive': 'var(--border)',
    '--context-grid-warning': 'var(--warning)',
  },
  selectors: {
    '&:hover': { color: 'var(--foreground)', backgroundColor: 'var(--card)', vars: { '--context-grid-inactive': 'var(--border)', '--context-grid-warning': 'var(--warning)' } } as Record<string, unknown>,
  },
})

export const infoRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
})

export const infoLabel = style({
  fontSize: 'var(--text-8)',
  fontWeight: 'var(--font-bold)',
  color: 'var(--muted-foreground)',
  whiteSpace: 'nowrap',
})

export const infoValue = style({
  fontSize: 'var(--text-8)',
  color: 'var(--foreground)',
  fontFamily: 'var(--font-mono)',
  wordBreak: 'break-all',
})

export const infoValueText = style({
  fontSize: 'var(--text-8)',
  color: 'var(--foreground)',
  wordBreak: 'break-all',
})

export const infoCopyButton = style({
  'all': 'unset',
  'boxSizing': 'border-box',
  'display': 'inline-flex',
  'alignItems': 'center',
  'justifyContent': 'center',
  'padding': '2px',
  'cursor': 'pointer',
  'borderRadius': 'var(--radius-small)',
  'color': 'var(--faint-foreground)',
  'flexShrink': 0,
  ':hover': {
    color: 'var(--foreground)',
    backgroundColor: 'var(--card)',
  },
})

export const infoRows = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-1)',
})

export const infoSeparator = style({
  height: '1px',
  backgroundColor: 'var(--border)',
  margin: 'var(--space-1) 0',
})

export const infoContextUsage = style({
  fontSize: 'var(--text-8)',
  color: 'var(--foreground)',
  maxHeight: '300px',
  overflowY: 'auto',
  lineHeight: '1.4',
})

export const rateLimitCountdown = style({
  fontSize: 'var(--text-8)',
  color: 'var(--muted-foreground)',
  fontFamily: 'var(--font-mono)',
  whiteSpace: 'nowrap',
})

export const messageRow = style({
  display: 'flex',
})

export const messageRowContent = style({
  flex: 1,
  minWidth: 0,
  // Isolate the bubble's layout/paint so an internal change (e.g. a tool card
  // expanding) doesn't invalidate siblings. Kept off the row itself so it never
  // clips the span-line bridge pseudo-elements that overflow each row.
  contain: 'layout paint',
})

// Spacer sized to the whole window height; absolutely-positioned rows live
// inside it so the native scrollbar reflects the full message list.
export const virtualSpacer = style({
  position: 'relative',
  width: '100%',
  flexShrink: 0,
  // We anchor the viewport ourselves (useChatScroll); browser scroll anchoring
  // on the absolutely-positioned children would fight our re-pin math.
  overflowAnchor: 'none',
})

// A single virtualized message row, positioned by translateY. Must NOT set
// `contain: paint` / `content-visibility` — that would clip the span-line
// bridges that intentionally overflow the row to connect adjacent rails.
export const virtualRow = style({
  'position': 'absolute',
  'top': 0,
  'left': 0,
  'right': 0,
  'transition': 'opacity var(--transition)',
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
})

const virtualRowFadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
})

export const virtualRowAppear = style({
  'animation': `${virtualRowFadeIn} var(--transition)`,
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
})

export const premeasureRoot = style({
  position: 'fixed',
  top: 0,
  left: 0,
  visibility: 'hidden',
  pointerEvents: 'none',
  overflow: 'hidden',
  zIndex: -1,
  contain: 'layout paint',
})

export const premeasureRow = style({
  display: 'flow-root',
  position: 'relative',
  width: '100%',
})

export const editorPanelWrapper = style({
  'flexShrink': 0,
  '@media': {
    // Mobile composer: anchor visually at the bottom of `mobileCenter`,
    // pad below for the home-indicator safe area (iOS zeros this out
    // automatically when the keyboard is up, so no double padding), and
    // add a thin top divider + subtle upward shadow that replaces the
    // suppressed resize handle. See spec T6 / T9.
    '(max-width: 639px)': {
      borderTop: '1px solid var(--border)',
      backgroundColor: 'var(--background)',
      boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.06)',
      // Refuse pan gestures inside the composer area too. iOS Safari
      // dispatches its OS-level keyboard-avoid scroll on ANY pan on a
      // focused contenteditable; html/body `touch-action: none` doesn't
      // reach the inner ProseMirror surface unless every descendant
      // also opts out.
      touchAction: 'none',
    },
  },
})

// Apply the same lock to every descendant of the composer on mobile —
// the ProseMirror contenteditable, attachment dropzone, toolbar buttons
// etc. Each element has its own `touch-action`, so we need a cascading
// selector to cover the lot. Taps still register; only pan/zoom gestures
// are rejected.
globalStyle(`${editorPanelWrapper} *`, {
  '@media': {
    '(max-width: 639px)': {
      touchAction: 'none',
    },
  },
})

/**
 * Mobile composer single-row layout: `[+] [editor] [Send]`.
 *
 * Replaces the desktop two-row arrangement (`[toolbar] [editor] [footer bar]`)
 * on viewports < 640px. The middle editor slot grows to fill horizontal space;
 * the `+` button hosts a DropdownMenu with attachment / model / agent-info /
 * interrupt actions; the Send button is always visible and disables when the
 * editor is empty without attachments or while sending/streaming.
 * See spec composer-mobile-simplify T4–T7.
 */
export const mobileComposerRow = style({
  display: 'flex',
  alignItems: 'flex-end',
  gap: 'var(--space-2)',
  padding: 'var(--space-2)',
  minWidth: 0,
})

export const mobileEditorSlot = style({
  flex: 1,
  minWidth: 0,
  // KakaoTalk-style pill container: soft card surface, subtle border, large
  // radius so the editor reads as a chip rather than a form field. The inner
  // MarkdownEditor still caps its own height via `editorWrapperStyle()`
  // (requestedHeight / maxHeight props) and handles its own scrolling; this
  // slot now also owns the visible chrome around the contenteditable.
  backgroundColor: 'var(--lm-view-bg)',
  border: '1px solid var(--border)',
  borderRadius: '20px',
  overflow: 'hidden',
  selectors: {
    // Subtle border darken on focus instead of the hard blue ring.
    '&:focus-within': {
      borderColor: 'var(--muted-foreground)',
    },
  },
})

export const mobilePlusButton = style({
  all: 'unset',
  boxSizing: 'border-box',
  width: '36px',
  height: '36px',
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  // Line-icon look — no chrome, muted color.
  color: 'var(--muted-foreground)',
  borderRadius: 'var(--radius-medium)',
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled), &:active:not(:disabled)': {
      backgroundColor: 'var(--card)',
      color: 'var(--foreground)',
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
})

export const mobileSendButton = style({
  all: 'unset',
  boxSizing: 'border-box',
  width: '36px',
  height: '36px',
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--primary)',
  color: 'white',
  // Circular KakaoTalk-style send affordance.
  borderRadius: '50%',
  cursor: 'pointer',
  selectors: {
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
})

export const mobilePlusMenu = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: '200px',
  padding: 'var(--space-1)',
})

export const mobilePlusMenuItem = style({
  all: 'unset',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  padding: 'var(--space-2) var(--space-3)',
  width: '100%',
  fontSize: 'var(--text-7)',
  color: 'var(--foreground)',
  cursor: 'pointer',
  borderRadius: 'var(--radius-small)',
  userSelect: 'none',
  selectors: {
    '&:hover:not(:disabled)': {
      backgroundColor: 'var(--card)',
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
})

export const mobilePlusMenuItemDestructive = style({
  color: 'var(--destructive)',
})

export const mobilePlusMenuSeparator = style({
  border: 'none',
  borderTop: '1px solid var(--border)',
  margin: 'var(--space-1) 0',
})

// Wrapper around nested DropdownMenu triggers (EditorSettingsDropdown,
// agent-info popover) rendered inside the `+` menu. The slot stops pointer
// events from bubbling to the outer `<menu>`'s `onClick` (which would
// hidePopover() and close the `+` menu before the nested popover opens).
export const mobilePlusMenuSlot = style({
  display: 'flex',
  flexDirection: 'column',
})
