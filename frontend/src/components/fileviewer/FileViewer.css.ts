import { globalStyle, style } from '@vanilla-extract/css'
import { diffContainer, diffSplitContainer } from '~/components/chat/diff/diffStyles.css'
import { codeViewContainer } from '~/components/chat/markdownEditor/codeViewStyles.css'

// Floating toolbar clearance: toolbar height (28px) + top offset + bottom gap.
const toolbarClearance = 'calc(28px + var(--space-2) * 2)'
export const TOOLBAR_CLEARANCE_PX = 44

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  position: 'relative',
})

export const content = style({
  flex: 1,
  overflow: 'auto',
  minHeight: 0,
})

// Marker class applied to `content` when an outer floating toolbar is visible.
export const hasFloatingToolbar = style({})

// Remove border/margin from diff views when used inside the file viewer.
globalStyle(`${content} ${diffContainer}, ${content} ${diffSplitContainer}`, {
  border: 'none',
  borderRadius: 0,
  marginTop: 0,
})

// Add toolbar clearance to diff views when an outer toolbar is present.
globalStyle(`${hasFloatingToolbar} ${diffContainer}, ${hasFloatingToolbar} ${diffSplitContainer}`, {
  paddingTop: toolbarClearance,
})

export const statusBar = style({
  position: 'absolute',
  bottom: 'var(--space-2)',
  right: 'var(--space-3)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  padding: 'var(--space-1) var(--space-2)',
  borderRadius: 'var(--radius-small)',
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  fontSize: 'var(--text-8)',
  color: 'var(--muted-foreground)',
  pointerEvents: 'none',
  opacity: 0.9,
})

export const statusMeta = style({
  whiteSpace: 'nowrap',
})

export const truncationWarning = style({
  color: 'var(--warning)',
  whiteSpace: 'nowrap',
})

export const loadingState = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: 'var(--muted-foreground)',
  fontSize: 'var(--text-7)',
})

export const errorState = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: 'var(--danger)',
  fontSize: 'var(--text-7)',
  padding: 'var(--space-4)',
  textAlign: 'center',
})

export const imageSizeError = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: 'var(--muted-foreground)',
  fontSize: 'var(--text-7)',
  padding: 'var(--space-4)',
  textAlign: 'center',
})

export const hexScroll = style({
  height: '100%',
  overflow: 'auto',
})

export const hexContainer = style({
  fontFamily: 'var(--font-mono)',
  fontVariantLigatures: 'none',
  fontSize: 'var(--text-8)',
  lineHeight: 1.5,
  paddingInline: 'var(--space-2)',
  whiteSpace: 'pre',
  width: 'max-content',
  marginInline: 'auto',
})

export const hexOffset = style({
  color: 'var(--faint-foreground)',
  userSelect: 'none',
})

export const hexSeparator = style({
  color: 'var(--faint-foreground)',
  userSelect: 'none',
})

export const hexAscii = style({
  color: 'var(--muted-foreground)',
})

export const textViewContainer = style({
  height: '100%',
  overflow: 'auto',
})

// Remove border/margin from code view when used inside the file viewer
// and move padding here so the scrollbar stays at the container edge.
globalStyle(`${textViewContainer} ${codeViewContainer}`, {
  border: 'none',
  borderRadius: 0,
  marginTop: 0,
  overflow: 'visible',
  paddingBlock: 'var(--space-2)',
})

// Add toolbar clearance to code view when an outer toolbar is present
// (direct child only — excludes text views nested inside toggleViewContainer).
globalStyle(`${hasFloatingToolbar} > ${textViewContainer} ${codeViewContainer}`, {
  paddingTop: toolbarClearance,
})

// Container for views that have a render/source toggle (markdown, SVG)
export const toggleViewContainer = style({
  position: 'relative',
  height: '100%',
  overflow: 'auto',
})

// Floating segmented toggle button at top-right
export const viewToggle = style({
  'position': 'absolute',
  'top': 'var(--space-2)',
  'right': 'var(--space-3)',
  'zIndex': 10,
  'display': 'flex',
  'borderRadius': 'var(--radius-small)',
  'border': '1px solid var(--border)',
  'backgroundColor': 'var(--card)',
  'opacity': 0.8,
  'transition': 'opacity 0.15s',
  ':hover': {
    opacity: 1,
  },
})

export const viewToggleButton = style({
  all: 'unset',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  cursor: 'pointer',
  color: 'var(--muted-foreground)',
  transition: 'color 0.1s, background-color 0.1s',
  selectors: {
    '&:first-child': {
      borderRadius: 'var(--radius-small) 0 0 var(--radius-small)',
    },
    '&:last-child': {
      borderRadius: '0 var(--radius-small) var(--radius-small) 0',
    },
    '&:hover': {
      color: 'var(--foreground)',
    },
  },
})

export const viewToggleActive = style({
  backgroundColor: 'var(--accent)',
  color: 'var(--foreground)',
})

export const markdownContainer = style({
  boxSizing: 'border-box',
  padding: `${toolbarClearance} var(--space-4) var(--space-4)`,
  overflow: 'auto',
  height: '100%',
})

// Side-by-side split view
export const splitContainer = style({
  display: 'flex',
  height: '100%',
})

export const splitPane = style({
  flex: 1,
  overflow: 'auto',
  minWidth: 0,
})

export const splitDivider = style({
  width: '1px',
  backgroundColor: 'var(--border)',
  flexShrink: 0,
})

export const splitPaneMarkdown = style({
  padding: 'var(--space-4)',
})

export const splitPaneSource = style({})

// Remove border/margin from code view when used inside split pane
// and move padding here so the scrollbar stays at the pane edge.
globalStyle(`${splitPane} ${codeViewContainer}`, {
  border: 'none',
  borderRadius: 0,
  marginTop: 0,
  overflow: 'visible',
  paddingBlock: 'var(--space-2)',
})

// Add toolbar clearance inside toggleViewContainer (ViewToggle always present).
globalStyle(`${toggleViewContainer} ${splitPaneMarkdown}`, {
  paddingTop: toolbarClearance,
})

globalStyle(`${toggleViewContainer} ${splitPane} ${codeViewContainer}`, {
  paddingTop: toolbarClearance,
})

globalStyle(`${toggleViewContainer} > ${textViewContainer} ${codeViewContainer}`, {
  paddingTop: toolbarClearance,
})

// Floating toolbar for image zoom controls (top-left)
export const imageToolbar = style({
  'position': 'absolute',
  'top': 'var(--space-2)',
  'left': 'var(--space-3)',
  'zIndex': 10,
  'display': 'flex',
  'alignItems': 'center',
  'borderRadius': 'var(--radius-small)',
  'border': '1px solid var(--border)',
  'backgroundColor': 'var(--card)',
  'opacity': 0.8,
  'transition': 'opacity 0.15s',
  ':hover': {
    opacity: 1,
  },
})

export const imageToolbarButton = style({
  all: 'unset',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  cursor: 'pointer',
  color: 'var(--muted-foreground)',
  transition: 'color 0.1s, background-color 0.1s',
  selectors: {
    '&:first-child': {
      borderRadius: 'var(--radius-small) 0 0 var(--radius-small)',
    },
    '&:last-child': {
      borderRadius: '0 var(--radius-small) var(--radius-small) 0',
    },
    '&:hover': {
      color: 'var(--foreground)',
    },
  },
})

export const imageToolbarLabel = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '48px',
  height: '28px',
  fontSize: 'var(--text-8)',
  color: 'var(--muted-foreground)',
  userSelect: 'none',
  whiteSpace: 'nowrap',
})

export const imageToolbarTextButton = style({
  all: 'unset',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '28px',
  paddingInline: 'var(--space-1)',
  cursor: 'pointer',
  color: 'var(--muted-foreground)',
  fontSize: 'var(--text-8)',
  transition: 'color 0.1s, background-color 0.1s',
  borderRadius: '0 var(--radius-small) var(--radius-small) 0',
  selectors: {
    '&:hover': {
      color: 'var(--foreground)',
    },
  },
})

// Outer wrapper for image render area (toolbar + scroll container)
export const imageRenderContainer = style({
  position: 'relative',
  height: '100%',
})

// Scrollable wrapper for zoomed images
export const imageScrollContainer = style({
  overflow: 'auto',
  height: '100%',
})

// Centering wrapper for image (fit and zoomed)
export const imageZoomWrapper = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '100%',
  minHeight: '100%',
  width: 'max-content',
  padding: `${toolbarClearance} var(--space-4) var(--space-4)`,
})

// Checkerboard transparency pattern + border for images
export const imageCheckerboard = style({
  backgroundImage: 'repeating-conic-gradient(rgba(128,128,128,0.15) 0% 25%, transparent 0% 50%)',
  backgroundSize: '16px 16px',
  border: '1px solid var(--border)',
})

// ---------------------------------------------------------------------------
// UnsupportedFileView — GitHub-style "this file cannot be displayed" card.
// Used for binary files, oversized text, and oversized images.
// ---------------------------------------------------------------------------

export const unsupportedWrapper = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  width: '100%',
  padding: 'var(--space-4)',
  boxSizing: 'border-box',
})

export const unsupportedCard = style({
  'boxSizing': 'border-box',
  'display': 'flex',
  'flexDirection': 'column',
  'alignItems': 'center',
  'gap': 'var(--space-4)',
  'maxWidth': '400px',
  'width': '100%',
  'padding': 'var(--space-6) var(--space-5)',
  'border': '1px solid var(--border)',
  'borderRadius': 'var(--radius-medium)',
  'backgroundColor': 'var(--card)',
  'boxShadow': 'var(--shadow-small)',
  '@media': {
    '(max-width: 480px)': {
      maxWidth: '100%',
    },
  },
})

export const unsupportedIcon = style({
  color: 'var(--muted-foreground)',
  flexShrink: 0,
})

export const unsupportedHeader = style({
  margin: 0,
  fontSize: 'var(--text-6)',
  fontWeight: 'var(--font-bold)',
  color: 'var(--foreground)',
  textAlign: 'center',
})

export const unsupportedSubtext = style({
  margin: 0,
  fontSize: 'var(--text-7)',
  color: 'var(--muted-foreground)',
  textAlign: 'center',
})

export const unsupportedFilename = style({
  fontSize: 'var(--text-5)',
  fontWeight: 'var(--font-bold)',
  color: 'var(--foreground)',
  textAlign: 'center',
  wordBreak: 'break-all',
})

export const unsupportedSize = style({
  fontSize: 'var(--text-7)',
  color: 'var(--muted-foreground)',
  textAlign: 'center',
})

export const unsupportedButtonRow = style({
  'display': 'flex',
  'flexDirection': 'row',
  'gap': 'var(--space-3)',
  'flexWrap': 'wrap',
  'justifyContent': 'center',
  'width': '100%',
  '@media': {
    '(max-width: 480px)': {
      flexDirection: 'column',
      flexWrap: 'nowrap',
    },
  },
})

const unsupportedButtonBase = style({
  'all': 'unset',
  'boxSizing': 'border-box',
  'display': 'inline-flex',
  'alignItems': 'center',
  'justifyContent': 'center',
  'minHeight': '44px',
  'minWidth': '120px',
  'paddingInline': 'var(--space-4)',
  'borderRadius': 'var(--radius-medium)',
  'border': '1px solid var(--border)',
  'fontSize': 'var(--text-7)',
  'fontWeight': 'var(--font-bold)',
  'cursor': 'pointer',
  'transition': 'background-color 0.1s, color 0.1s, border-color 0.1s',
  ':focus-visible': {
    outline: '2px solid var(--ring, var(--foreground))',
    outlineOffset: '2px',
  },
  '@media': {
    '(max-width: 480px)': {
      width: '100%',
      minHeight: '44px',
    },
  },
})

export const unsupportedPrimaryButton = style([
  unsupportedButtonBase,
  {
    'backgroundColor': 'var(--foreground)',
    'color': 'var(--background)',
    'borderColor': 'var(--foreground)',
    ':hover': {
      opacity: 0.85,
    },
  },
])

export const unsupportedSecondaryButton = style([
  unsupportedButtonBase,
  {
    'backgroundColor': 'transparent',
    'color': 'var(--foreground)',
    ':hover': {
      backgroundColor: 'var(--muted, var(--accent))',
    },
  },
])
