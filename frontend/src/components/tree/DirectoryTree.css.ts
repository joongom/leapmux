import { globalStyle, style } from '@vanilla-extract/css'
import { childrenInner, labelWithStats, node, nodeSelected } from './sharedTree.css'

export {
  chevron,
  chevronExpanded,
  chevronPlaceholder,
  childrenInner,
  childrenWrapper,
  childrenWrapperExpanded,
} from './sharedTree.css'

export { node, nodeSelected }

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  // Enable container queries so meta columns (size, modTime) can
  // show/hide based on the tree pane's width — Finder-style.
  containerType: 'inline-size',
})

export const tree = style({
  flex: 1,
  overflowY: 'auto',
  // Defense-in-depth against any descendant pushing its intrinsic width
  // beyond the pane (e.g. a long filename whose `min-width: 0` clipping
  // regresses). With `overflow-y: auto` + `overflow-x: hidden` the row
  // can never induce a horizontal scrollbar — labels are clipped earlier.
  overflowX: 'hidden',
  padding: 0,
})

/**
 * Inner wrapper that fills the tree pane; rows shrink via `min-width: 0`
 * on `nodeName`, so long filenames clip (truncate mode) or wrap (wrap mode)
 * without forcing horizontal overflow.
 */
export const treeInner = style({
  width: '100%',
})

export const folderIcon = style({
  flexShrink: 0,
  color: 'var(--primary)',
})

export const fileIcon = style({
  flexShrink: 0,
  color: 'var(--muted-foreground)',
})

// Git-status icon color overrides (applied to folder/file icons).
export const iconStaged = style({ color: 'var(--success)' })
export const iconUnstaged = style({ color: 'var(--warning)' })
export const iconUntracked = style({ color: 'var(--success)' })
export const iconConflict = style({ color: 'var(--danger)' })
export const iconDirChanged = style({ color: 'var(--warning)', opacity: 0.85 })

export const nodeName = style({
  whiteSpace: 'nowrap',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
})

export const nodeNameMuted = style([nodeName, {
  color: 'var(--muted-foreground)',
}])

// Wrap-mode variant: multi-line clamp (up to 3 lines) for long names.
// `overflow-wrap: anywhere` (over `break-all`/`break-word`) preserves
// natural break points (underscores, dots) when the pane is wide enough
// and only fractures mid-word as a last resort — keeps names like
// `Korea_PQC_GovernmentRoadmap.tsx` legible.
export const nodeNameWrap = style({
  whiteSpace: 'normal',
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  lineHeight: 1.35,
  overflowWrap: 'anywhere',
  minWidth: 0,
})

export const nodeNameMutedWrap = style([nodeNameWrap, {
  color: 'var(--muted-foreground)',
}])

// Modifier class applied to `.node` when wrap mode is active. Switches the
// row to flex-start alignment so chevron + file/folder icons pin to the
// first line, and lets `rightCluster` (meta) sit at top as well.
export const nodeWrap = style({
  alignItems: 'flex-start',
})

// Top-align chevron / file / folder icons within a wrap-mode row.
globalStyle(`.${nodeWrap} > svg`, {
  alignSelf: 'flex-start',
  marginTop: '2px',
})

// Top-align icons that are nested inside the label wrapper (file/folder icons).
globalStyle(`.${nodeWrap} .${labelWithStats} > svg`, {
  alignSelf: 'flex-start',
  marginTop: '2px',
})

// Right-aligned cluster that holds the meta block (size + modTime). It
// carries `marginLeft: auto` so meta stays pinned to the row's right edge
// regardless of how short or long the filename is. `position: sticky`
// keeps meta visible when a long filename forces horizontal overflow.
// (Prior to pass2 this also wrapped the `⋯` context-menu trigger; the
// trigger has been removed in favour of right-click on the row itself.)
export const rightCluster = style({
  marginLeft: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  flexShrink: 0,
  // Stick to the right edge of the visible tree pane so meta + actions
  // remain visible even when a long filename pushes the row past the
  // pane width (horizontal scroll).
  position: 'sticky',
  right: 0,
  paddingLeft: 'var(--space-2)',
  paddingRight: 'var(--space-2)',
  backgroundColor: 'inherit',
})

// In wrap mode, the meta cluster pins to the row's first line (top), not
// the vertical centre — matches Designer §5.
globalStyle(`.${nodeWrap} > .${rightCluster}`, {
  alignItems: 'flex-start',
})

export const nodeMeta = style({
  // Hidden by default; container query below reveals it on wide panes.
  // macOS Finder-style: meta columns appear only when the pane is wide
  // enough to show them without crowding the filename.
  'display': 'none',
  'alignItems': 'baseline',
  'gap': 'var(--space-3)',
  'color': 'var(--muted-foreground)',
  'fontSize': 'var(--text-8)',
  'fontVariantNumeric': 'tabular-nums',
  'whiteSpace': 'nowrap',
  '@container': {
    '(min-width: 240px)': {
      display: 'flex',
    },
  },
})

export const nodeSize = style({
  minWidth: '52px',
  textAlign: 'right',
})

export const nodeModTime = style({
  minWidth: '40px',
  textAlign: 'right',
})

// Allow the labelWithStats wrapper inside a tree row to shrink below its
// intrinsic content width — required for `nodeName`'s ellipsis (and the
// wrap-mode `-webkit-line-clamp`) to kick in. Uses a *descendant* selector
// because RowLabelWithStats is wrapped by the shared `Tooltip` component,
// which inserts a `<span style="display:contents">` between `.node` and
// `.labelWithStats`. A direct-child selector (`.node > .labelWithStats`)
// fails to match across that wrapper, leaving the label at its intrinsic
// width and forcing the row to grow → horizontal scroll regression.
globalStyle(`.${node} .${labelWithStats}`, {
  minWidth: 0,
  overflow: 'hidden',
})

// Zebra striping: alternating rows in the children-inner list pick up a
// subtle background. Selectors are scoped to children of `childrenInner`
// so root-level rows are unaffected (root has its own bg via selection).
// Hover (`var(--card)`) and selected (`var(--secondary)`) are fully opaque
// and so layer on top of the zebra background without extra specificity.
globalStyle(`.${childrenInner} > div:nth-child(even) > .${node}`, {
  backgroundColor: 'var(--lm-tree-row-zebra-bg)',
})

// Selection visual: sage-tinted background (more visible than `--secondary`
// which read as nearly-white over zebra) plus a 4px accent border on the
// leading edge and bold text. The inline `padding-left` set by `TreeNode`
// (and the root row) already compensates the 4px so the icon never shifts
// on selection — see `indent()` in DirectoryTree.tsx. Scoped to
// `.node.nodeSelected` so the rule only applies inside DirectoryTree
// without touching `sharedTree.css.ts`.
globalStyle(`.${node}.${nodeSelected}`, {
  backgroundColor: 'var(--accent)',
  borderLeft: '4px solid var(--primary)',
  fontWeight: 'var(--font-bold)',
})

// Hovered-selected gets a slightly darker accent so the hover affordance
// still reads against the selected fill.
globalStyle(`.${node}.${nodeSelected}:hover`, {
  backgroundColor: 'var(--accent)',
  filter: 'brightness(0.96)',
})

export const loadingState = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--space-6)',
  color: 'var(--faint-foreground)',
  fontSize: 'var(--text-7)',
})

export const loadingInline = style({
  fontSize: 'var(--text-7)',
  color: 'var(--faint-foreground)',
  padding: '2px var(--space-2)',
})

export const errorState = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--space-6)',
  color: 'var(--danger)',
  fontSize: 'var(--text-7)',
})

export const emptyInline = style({
  fontSize: 'var(--text-7)',
  color: 'var(--faint-foreground)',
  padding: '2px var(--space-2)',
})

export const pathInput = style({
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-1)',
  padding: 'var(--space-1)',
  borderBottom: '1px solid var(--border)',
  flexShrink: 0,
})

// Compact icon button to the right of the path input that opens the
// sort-mode dropdown. Sized to match the input's intrinsic height so
// the row stays visually tidy on both desktop and mobile.
export const sortButton = style({
  'all': 'unset',
  'boxSizing': 'border-box',
  'display': 'inline-flex',
  'alignItems': 'center',
  'justifyContent': 'center',
  'flexShrink': 0,
  'width': '28px',
  'height': '28px',
  'borderRadius': 'var(--radius-2, 6px)',
  'color': 'var(--muted-foreground)',
  'cursor': 'pointer',
  ':hover': {
    background: 'var(--secondary)',
    color: 'var(--foreground)',
  },
  ':focus-visible': {
    outline: '2px solid var(--ring)',
    outlineOffset: '1px',
  },
})

// Oat's default `input` style sets `margin-block-start: var(--space-1)` for
// form-field spacing under a label. That's not wanted here — the input sits
// alone in a flex row and we want a uniform --space-1 gap on all four sides
// of the input (provided by pathInput's padding).
globalStyle(`${pathInput} input`, {
  marginBlockStart: 0,
})

export const pathHint = style({
  fontSize: 'var(--text-8)',
  color: 'var(--warning-foreground, var(--faint-foreground))',
  padding: '2px var(--space-2) 0',
  lineHeight: 1.2,
})

// -------------------------------------------------------------------------
// Mobile touch action bar (T8) — sticky-top inside `.tree`.
// -------------------------------------------------------------------------

export const actionBar = style({
  position: 'sticky',
  top: 0,
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-1)',
  // Top/bottom padding 0 — the 1px borderBottom alone separates the bar
  // from the first row. Previous `4px var(--space-2)` produced a visible
  // white band above the bar on mobile.
  padding: '0 var(--space-2)',
  height: '36px',
  background: 'var(--card)',
  borderBottom: '1px solid var(--border)',
})

export const actionBarButton = style({
  'display': 'inline-flex',
  'alignItems': 'center',
  'justifyContent': 'center',
  'width': '32px',
  'height': '32px',
  'padding': '6px',
  'border': '0',
  'background': 'transparent',
  'color': 'var(--foreground)',
  'borderRadius': 'var(--radius-2, 6px)',
  'cursor': 'pointer',
  ':hover': {
    background: 'var(--secondary)',
  },
  ':focus-visible': {
    outline: '2px solid var(--ring)',
    outlineOffset: '1px',
  },
  // Disabled state for the always-mounted bar when no file is selected.
  // Keep `pointer-events` intact so the tooltip/focus still reach the
  // button; the click handler short-circuits on `disabled`.
  ':disabled': {
    opacity: 0.4,
    color: 'var(--muted-foreground)',
    cursor: 'not-allowed',
  },
})

// 1px vertical hairline separating always-on cluster (Refresh / Toggle
// Hidden) from the selection-gated cluster (Open / Download / …) in the
// mobile action bar. No background tint on either group — the divider
// alone is enough at this scale.
export const actionBarDivider = style({
  width: '1px',
  height: '16px',
  background: 'var(--border)',
  margin: '0 var(--space-1)',
})

// Screen-reader-only live region (visually hidden but read by AT).
export const actionBarLiveRegion = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
})
