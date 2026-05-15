import type { Component } from 'solid-js'
import type { FileInfo } from '~/generated/leapmux/v1/file_pb'
import type { PathFlavor } from '~/lib/paths'
import type { createGitFileStatusStore, DiffStats } from '~/stores/gitFileStatus.store'
import ArrowDownAZ from 'lucide-solid/icons/arrow-down-a-z'
import AtSign from 'lucide-solid/icons/at-sign'
import ChevronRight from 'lucide-solid/icons/chevron-right'
import ClipboardCopy from 'lucide-solid/icons/clipboard-copy'
import Clock from 'lucide-solid/icons/clock'
import Copy from 'lucide-solid/icons/copy'
import Download from 'lucide-solid/icons/download'
import ExternalLink from 'lucide-solid/icons/external-link'
import Eye from 'lucide-solid/icons/eye'
import EyeOff from 'lucide-solid/icons/eye-off'
import File from 'lucide-solid/icons/file'
import FolderClosed from 'lucide-solid/icons/folder-closed'
import FolderOpen from 'lucide-solid/icons/folder-open'
import RefreshCw from 'lucide-solid/icons/refresh-cw'
import TerminalIcon from 'lucide-solid/icons/terminal'
import { createContext, createEffect, createMemo, createSignal, For, Match, on, onCleanup, onMount, Show, Switch, useContext } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import * as workerRpc from '~/api/workerRpc'
import { DropdownMenu } from '~/components/common/DropdownMenu'
import { Icon } from '~/components/common/Icon'
import { StartupSpinner } from '~/components/common/StartupPanel'
import { Tooltip } from '~/components/common/Tooltip'
import { useIsMobile } from '~/hooks/useIsMobile'
import { downloadFileFromWorker, openFileInNewTab } from '~/lib/fileDownload'
import { formatBytes } from '~/lib/formatBytes'
import { basename, detectFlavor, isAbsolute, lastSepIndex, relativeUnder, relativizePath, tildify, untildify } from '~/lib/paths'
import { emptyState } from '~/styles/shared.css'
import * as styles from './DirectoryTree.css'
import { getGitFileIconClass, RowLabelWithStats } from './gitStatusUtils'

export interface DirectoryTreeHandle {
  collapseAll: () => void
  refresh: () => void
}

export interface DirectoryTreeProps {
  workerId: string
  showFiles?: boolean
  selectedPath: string
  onSelect: (path: string) => void
  onFileOpen?: (path: string) => void
  onMention?: (path: string) => void
  onOpenTerminal?: (dirPath: string) => void
  rootPath?: string
  homeDir?: string
  /**
   * Path flavor for the worker this tree is rendering. Defaults to a
   *  best-effort sniff from homeDir/rootPath.
   */
  flavor?: PathFlavor
  gitStatusStore?: ReturnType<typeof createGitFileStatusStore>
  /**
   * Mobile action bar's "Refresh files" button handler. When provided, an
   * always-on Refresh icon renders at the left of the action bar regardless
   * of selection state. Wired by `FilesSection` to `treeHandle.refresh()`.
   */
  onRefresh?: () => void
  /**
   * Mobile action bar's "Toggle hidden files" button handler. When provided,
   * an always-on Eye/EyeOff icon renders at the left of the action bar.
   * Wired by `FilesSection` to its `setShowHiddenFiles` setter.
   */
  onToggleShowHidden?: () => void
  /** When set, only show nodes whose paths are in this set. */
  visiblePaths?: Set<string>
  /** Signal bumped on agent turn-end; drives directory tree refresh. */
  turnEndTrigger?: number
  /** When false, entries with hidden=true are filtered out. Defaults to true. */
  showHiddenFiles?: boolean
  /**
   * Filename layout mode. `'truncate'` (default) clips long names with
   * an ellipsis on a single line; `'wrap'` lets the name break onto up
   * to 3 lines via `-webkit-line-clamp: 3`.
   */
  nameLayout?: 'truncate' | 'wrap'
  /**
   * When false, the initial root-children fetch is suppressed. Used to
   * defer a directory listing for a tab whose working dir isn't on disk
   * yet (e.g. a worktree-creating agent during its STARTING window —
   * fetching now would cache a partial listing that persists until the
   * user manually refreshes). Flipping back to true triggers the load
   * effect to run, which then fetches normally.
   */
  enabled?: boolean
  /** Ref callback for imperative actions (collapse all, etc.). */
  ref?: (handle: DirectoryTreeHandle) => void
}

interface TreeNodeData {
  path: string
  displayName: string
  isDir: boolean
  hidden: boolean
  /**
   * File size in bytes; undefined for directories or when unknown.
   * Stored as `number` (not bigint) so the cache JSON-serializes cleanly —
   * 2^53 bytes (~9 PB) per file is well above any realistic case.
   */
  size?: number
  /** RFC3339 modified timestamp; empty string when unknown. */
  modTime?: string
}

// Content equality for the children cache; see setChildrenInStore.
function sameTreeEntries(a: readonly TreeNodeData[], b: readonly TreeNodeData[]): boolean {
  if (a === b)
    return true
  if (a.length !== b.length)
    return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    if (
      x.path !== y.path
      || x.displayName !== y.displayName
      || x.isDir !== y.isDir
      || x.hidden !== y.hidden
      || x.size !== y.size
      || x.modTime !== y.modTime
    ) {
      return false
    }
  }
  return true
}

// -------------------------------------------------------------------------
// Tree context — bundles stable, tree-wide values to avoid prop drilling
// -------------------------------------------------------------------------

interface TreeContextValue {
  workerId: string
  showFiles: boolean
  rootPath: string
  homeDir?: string
  flavor: () => PathFlavor
  scrollContainer?: HTMLDivElement
  gitStatusStore: () => ReturnType<typeof createGitFileStatusStore> | undefined
  showHiddenFiles: boolean
  visiblePaths: () => Set<string> | undefined
  refreshVersion: () => number
  onSelect: (path: string) => void
  onFileOpen?: (path: string) => void
  onMention?: (path: string) => void
  onOpenTerminal?: (dirPath: string) => void
  onRefresh?: () => void
  onToggleShowHidden?: () => void
  isNodeExpanded: (path: string) => boolean
  setNodeExpanded: (path: string, expanded: boolean) => void
  getChildren: (path: string) => TreeNodeData[] | undefined
  setChildren: (path: string, data: TreeNodeData[], truncated: boolean) => void
  isTruncated: (path: string) => boolean
  /** Open the shared context menu at the given viewport coordinates. */
  openContextMenuAt: (target: { path: string, isDir: boolean }, x: number, y: number) => void
  /** Filename layout mode (truncate vs 3-line wrap). */
  nameLayout: () => 'truncate' | 'wrap'
  /** Active sort mode for the tree's entries. */
  sortMode: () => SortMode
  /** Switch the active sort mode. Persisted in sessionStorage. */
  setSortMode: (mode: SortMode) => void
  /** Mobile-only: open the touch action bar for a file row. */
  openActionBar: (path: string, sourceEl: HTMLElement) => void
}

const TreeContext = createContext<TreeContextValue>()

function useTree(): TreeContextValue {
  const ctx = useContext(TreeContext)
  if (!ctx)
    throw new Error('useTree must be used within a TreeContext.Provider')
  return ctx
}

// -------------------------------------------------------------------------
// Serialization helpers for sessionStorage
// -------------------------------------------------------------------------

interface DirectoryTreeStateJSON {
  expandedPaths: Record<string, boolean>
  childrenCache: Record<string, TreeNodeData[]>
  truncatedDirs?: Record<string, boolean>
}

function serializeState(
  expandedPaths: Record<string, boolean>,
  childrenCache: Record<string, TreeNodeData[]>,
  truncatedDirs: Record<string, boolean>,
): string {
  return JSON.stringify({ expandedPaths, childrenCache, truncatedDirs })
}

function deserializeState(raw: string): { expandedPaths: Record<string, boolean>, childrenCache: Record<string, TreeNodeData[]>, truncatedDirs: Record<string, boolean> } | null {
  try {
    const json: DirectoryTreeStateJSON = JSON.parse(raw)
    if (!json || typeof json !== 'object')
      return null
    return {
      expandedPaths: json.expandedPaths ?? {},
      childrenCache: json.childrenCache ?? {},
      truncatedDirs: json.truncatedDirs ?? {},
    }
  }
  catch {
    return null
  }
}

// -------------------------------------------------------------------------
// Visibility helpers
// -------------------------------------------------------------------------

function isDescendantPath(child: string, parent: string, flavor: PathFlavor): boolean {
  const rel = relativeUnder(child, parent, flavor)
  return rel !== null && rel !== ''
}

// Git emits untracked dirs as "build/"; merged tree nodes like "build/bin"
// match by walking ancestors.
function isPathVisible(path: string, visible: Set<string>, flavor: PathFlavor): boolean {
  let dir = path
  while (true) {
    if (visible.has(dir))
      return true
    const i = lastSepIndex(dir, flavor)
    if (i <= 0)
      return false
    dir = dir.substring(0, i)
  }
}

// -------------------------------------------------------------------------
// File listing
// -------------------------------------------------------------------------

/**
 * Tree sort mode. Two options exposed in the UI:
 *  - `name-asc`     directories first, then files; both alphabetical
 *  - `mtime-desc`   directories first, then files; within each group
 *                   most-recently modified first, ties broken by name
 */
export type SortMode = 'name-asc' | 'mtime-desc'

const DEFAULT_SORT_MODE: SortMode = 'name-asc'

function sortEntries(a: FileInfo, b: FileInfo): number {
  if (a.isDir !== b.isDir)
    return a.isDir ? -1 : 1
  return a.name.localeCompare(b.name)
}

function compareByMode(a: TreeNodeData, b: TreeNodeData, mode: SortMode): number {
  if (a.isDir !== b.isDir)
    return a.isDir ? -1 : 1
  if (mode === 'mtime-desc') {
    const ta = a.modTime ? Date.parse(a.modTime) : 0
    const tb = b.modTime ? Date.parse(b.modTime) : 0
    if (ta !== tb)
      return tb - ta
    // tie-break by name
  }
  return a.displayName.localeCompare(b.displayName)
}

async function loadChildren(
  workerId: string,
  dirPath: string,
  showFiles: boolean,
): Promise<{ entries: TreeNodeData[], truncated: boolean }> {
  const resp = await workerRpc.listDirectory(workerId, { workerId, path: dirPath, maxDepth: 5, dirsOnly: !showFiles })
  const entries = resp.entries.toSorted(sortEntries)

  return {
    entries: entries.map(entry => ({
      path: entry.path,
      displayName: entry.name,
      isDir: entry.isDir,
      hidden: entry.hidden,
      size: entry.isDir ? undefined : Number(entry.size),
      modTime: entry.modTime,
    })),
    truncated: resp.truncated,
  }
}

/**
 * Format a modified timestamp as a compact relative string (e.g. "3s", "12m",
 * "2h", "5d", "3mo", "2y"). Empty string for invalid/missing timestamps.
 */
function formatModTimeShort(modTime: string | undefined): string {
  if (!modTime)
    return ''
  const t = new Date(modTime).getTime()
  if (Number.isNaN(t))
    return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (diffSec < 60)
    return `${diffSec}s`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60)
    return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24)
    return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30)
    return `${diffDay}d`
  const diffMo = Math.floor(diffDay / 30)
  if (diffMo < 12)
    return `${diffMo}mo`
  const diffYr = Math.floor(diffDay / 365)
  return `${diffYr}y`
}

function formatModTimeFull(modTime: string | undefined): string {
  if (!modTime)
    return ''
  const d = new Date(modTime)
  if (Number.isNaN(d.getTime()))
    return ''
  return d.toLocaleString()
}

/**
 * Headless context menu for a tree node — rendered once at the
 * DirectoryTree root and re-targeted by right-click / keyboard shortcut.
 * Positioning uses DropdownMenu's `anchorRef` + `open` programmatic path:
 * a single 1×1 invisible `<div>` is moved to the cursor (or focused row's
 * bottom-left for keyboard) and passed as the anchor. `calcPopoverPosition`
 * only reads `getBoundingClientRect()`, so this satisfies the contract
 * without modifying DropdownMenu.
 */
const TreeContextMenu: Component<{
  open: () => boolean
  anchorRef: () => HTMLElement | undefined
  target: () => { path: string, isDir: boolean } | null
  onClose: () => void
}> = (props) => {
  const tree = useTree()
  const path = () => props.target()?.path ?? ''
  const isDir = () => props.target()?.isDir ?? false

  return (
    <DropdownMenu
      anchorRef={props.anchorRef}
      open={props.open}
      onToggle={(open) => {
        if (!open)
          props.onClose()
      }}
    >
      <Show when={tree.onMention}>
        <button
          role="menuitem"
          data-testid="tree-mention-button"
          onClick={() => tree.onMention?.(path())}
        >
          <Icon icon={AtSign} size="sm" />
          Mention in chat
        </button>
      </Show>
      <Show when={isDir() && tree.onOpenTerminal}>
        <button
          role="menuitem"
          data-testid="tree-open-terminal-button"
          onClick={() => tree.onOpenTerminal?.(path())}
        >
          <Icon icon={TerminalIcon} size="sm" />
          Open a terminal tab here
        </button>
      </Show>
      <Show when={!isDir()}>
        <button
          role="menuitem"
          data-testid="tree-download-button"
          onClick={() => { void downloadFileFromWorker(tree.workerId, path(), tree.flavor()) }}
        >
          <Icon icon={Download} size="sm" />
          Download
        </button>
      </Show>
      <button
        role="menuitem"
        data-testid="tree-copy-path-button"
        onClick={() => navigator.clipboard.writeText(path())}
      >
        <Icon icon={Copy} size="sm" />
        Copy path
      </button>
      <button
        role="menuitem"
        data-testid="tree-copy-relative-path-button"
        onClick={() => {
          const p = path()
          const rel = p === tree.rootPath
            ? '.'
            : relativizePath(p, tree.rootPath, tree.homeDir, tree.flavor())
          navigator.clipboard.writeText(rel)
        }}
      >
        <Icon icon={ClipboardCopy} size="sm" />
        Copy relative path
      </button>
    </DropdownMenu>
  )
}

/**
 * Sticky-top mobile action bar (T4/T7). Mounted unconditionally on
 * mobile so its layout slot is occupied at all times — tapping a file
 * row toggles the disabled-state of the buttons rather than mounting
 * the bar, eliminating the row-shift the user complained about. Outside-
 * click and Esc clear the target (re-disabling the buttons); they no
 * longer unmount the bar.
 */
const TreeActionBar: Component<{
  target: () => { path: string } | null
  onClose: () => void
}> = (props) => {
  const tree = useTree()
  let barRef: HTMLDivElement | undefined
  let firstButtonRef: HTMLButtonElement | undefined

  const path = () => props.target()?.path ?? ''
  const name = () => path() ? basename(path(), tree.flavor()) : ''
  const disabled = () => props.target() === null

  const close = () => props.onClose()

  const runAndClose = (fn: () => void | Promise<void>) => {
    if (disabled())
      return
    void Promise.resolve().then(fn).finally(close)
  }

  // Outside-click clears the target (re-disables buttons). The bar
  // itself stays mounted at all times.
  const onPointerDown = (e: PointerEvent) => {
    if (!props.target())
      return
    const t = e.target as Node | null
    if (barRef && t && !barRef.contains(t))
      close()
  }

  createEffect(() => {
    if (props.target() !== null) {
      document.addEventListener('pointerdown', onPointerDown, { capture: true })
      // Auto-focus first action so Tab/Esc have a target.
      queueMicrotask(() => firstButtonRef?.focus())
    }
    else {
      document.removeEventListener('pointerdown', onPointerDown, { capture: true })
    }
  })

  onCleanup(() => {
    document.removeEventListener('pointerdown', onPointerDown, { capture: true })
  })

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  return (
    <>
      <div
        ref={barRef}
        class={styles.actionBar}
        role="toolbar"
        aria-label="File actions"
        onKeyDown={onKeyDown}
      >
        <Show when={tree.onRefresh}>
          <button
            type="button"
            class={styles.actionBarButton}
            title="Refresh files"
            aria-label="Refresh files"
            data-testid="tree-action-refresh"
            onClick={() => tree.onRefresh?.()}
          >
            <Icon icon={RefreshCw} size="sm" />
          </button>
        </Show>
        <Show when={tree.onToggleShowHidden}>
          <button
            type="button"
            class={styles.actionBarButton}
            title="Toggle hidden files"
            aria-label="Toggle hidden files"
            aria-pressed={!tree.showHiddenFiles ? 'true' : 'false'}
            data-testid="tree-action-toggle-hidden"
            onClick={() => tree.onToggleShowHidden?.()}
          >
            <Icon icon={tree.showHiddenFiles ? Eye : EyeOff} size="sm" />
          </button>
        </Show>
        <Show when={tree.onRefresh || tree.onToggleShowHidden}>
          <span class={styles.actionBarDivider} aria-hidden="true" />
        </Show>
        <button
          ref={firstButtonRef}
          type="button"
          class={styles.actionBarButton}
          title="Open in new tab"
          data-testid="tree-action-open-new-tab"
          disabled={disabled()}
          aria-disabled={disabled() ? 'true' : 'false'}
          tabIndex={disabled() ? -1 : 0}
          // eslint-disable-next-line solid/reactivity -- onClick handler; reads tree fields on user invocation, not tracked
          onClick={() => runAndClose(() => openFileInNewTab(tree.workerId, path(), tree.flavor()))}
        >
          <Icon icon={ExternalLink} size="sm" />
        </button>
        <button
          type="button"
          class={styles.actionBarButton}
          title="Download"
          data-testid="tree-action-download"
          disabled={disabled()}
          aria-disabled={disabled() ? 'true' : 'false'}
          tabIndex={disabled() ? -1 : 0}
          // eslint-disable-next-line solid/reactivity -- onClick handler; reads tree fields on user invocation, not tracked
          onClick={() => runAndClose(() => downloadFileFromWorker(tree.workerId, path(), tree.flavor()))}
        >
          <Icon icon={Download} size="sm" />
        </button>
        <Show when={tree.onMention}>
          <button
            type="button"
            class={styles.actionBarButton}
            title="Mention in chat"
            data-testid="tree-action-mention"
            disabled={disabled()}
            aria-disabled={disabled() ? 'true' : 'false'}
            tabIndex={disabled() ? -1 : 0}
            // eslint-disable-next-line solid/reactivity -- onClick handler; reads tree.onMention on user invocation
            onClick={() => runAndClose(() => tree.onMention?.(path()))}
          >
            <Icon icon={AtSign} size="sm" />
          </button>
        </Show>
        <button
          type="button"
          class={styles.actionBarButton}
          title="Copy path"
          data-testid="tree-action-copy-path"
          disabled={disabled()}
          aria-disabled={disabled() ? 'true' : 'false'}
          tabIndex={disabled() ? -1 : 0}
          // eslint-disable-next-line solid/reactivity -- onClick handler
          onClick={() => runAndClose(() => { void navigator.clipboard.writeText(path()) })}
        >
          <Icon icon={Copy} size="sm" />
        </button>
        <button
          type="button"
          class={styles.actionBarButton}
          title="Copy relative path"
          data-testid="tree-action-copy-relative-path"
          disabled={disabled()}
          aria-disabled={disabled() ? 'true' : 'false'}
          tabIndex={disabled() ? -1 : 0}
          // eslint-disable-next-line solid/reactivity -- onClick handler
          onClick={() => runAndClose(() => {
            const p = path()
            const rel = p === tree.rootPath
              ? '.'
              : relativizePath(p, tree.rootPath, tree.homeDir, tree.flavor())
            void navigator.clipboard.writeText(rel)
          })}
        >
          <Icon icon={ClipboardCopy} size="sm" />
        </button>
      </div>
      <div class={styles.actionBarLiveRegion} aria-live="polite">
        {name() ? `Selected ${name()}` : ''}
      </div>
    </>
  )
}

interface GitIconInfo { class: string, testId: string | undefined }
const NO_GIT_ICON: GitIconInfo = { class: '', testId: undefined }

const TreeNode: Component<{
  node: TreeNodeData
  selectedPath: string
  depth: number
}> = (props) => {
  const tree = useTree()
  const isMobile = useIsMobile()
  const [loading, setLoading] = createSignal(false)
  let wrapperRef!: HTMLDivElement
  let nodeRef!: HTMLDivElement
  let childrenRef: HTMLDivElement | undefined
  const wrapMode = () => tree.nameLayout() === 'wrap'

  const expanded = () => tree.isNodeExpanded(props.node.path)
  const isSelected = () => props.selectedPath === props.node.path
  // Whether this row should render the selected visual. Files always
  // can; directories only in directory-picker mode (`!showFiles`) where
  // selecting a folder is the primary action. In file-browser mode
  // folders never look selected.
  const showSelectedVisual = () => isSelected() && (!props.node.isDir || !tree.showFiles)
  const allChildren = () => tree.getChildren(props.node.path) ?? []
  const children = createMemo(() => {
    const all = allChildren()
    const showHidden = tree.showHiddenFiles
    const visible = tree.visiblePaths()
    const flavor = tree.flavor()
    const mode = tree.sortMode()
    const filtered = (showHidden && !visible)
      ? all.slice()
      : all.filter(c =>
          (showHidden || !c.hidden)
          && (!visible || isPathVisible(c.path, visible, flavor)),
        )
    return filtered.sort((a, b) => compareByMode(a, b, mode))
  })
  const loaded = () => tree.getChildren(props.node.path) !== undefined

  const doScroll = () => {
    const container = tree.scrollContainer
    if (!container || !wrapperRef)
      return
    const containerRect = container.getBoundingClientRect()
    const wrapperRect = wrapperRef.getBoundingClientRect()
    if (wrapperRect.bottom > containerRect.bottom) {
      // Scroll so the children are visible, but clamp so the node
      // row itself (the selected directory) stays visible at the top.
      const nodeRowHeight = nodeRef ? nodeRef.getBoundingClientRect().height : 0
      const overflow = wrapperRect.bottom - containerRect.bottom
      const maxScroll = wrapperRect.top - containerRect.top - nodeRowHeight
      container.scrollTop += Math.min(overflow, Math.max(0, maxScroll))
    }
  }

  const scrollIntoViewIfNeeded = () => {
    if (!childrenRef) {
      requestAnimationFrame(doScroll)
      return
    }
    // Wait for the CSS grid-template-rows expand transition to finish
    // so that wrapperRef has its full height when we measure.
    // When prefers-reduced-motion is enabled, transitions are instant
    // so transitionend never fires — use requestAnimationFrame instead.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      requestAnimationFrame(doScroll)
      return
    }
    const onEnd = (e: TransitionEvent) => {
      if (e.target !== childrenRef)
        return
      childrenRef!.removeEventListener('transitionend', onEnd)
      doScroll()
    }
    childrenRef.addEventListener('transitionend', onEnd)
  }

  const doLoad = async () => {
    if (loaded() || loading())
      return
    setLoading(true)
    try {
      const result = await loadChildren(tree.workerId, props.node.path, tree.showFiles)
      tree.setChildren(props.node.path, result.entries, result.truncated)
    }
    catch {
      // ignore load errors
    }
    finally {
      setLoading(false)
    }
  }

  const toggle = async () => {
    if (!props.node.isDir) {
      tree.onSelect(props.node.path)
      // Mobile single-tap on a file row opens the touch action bar
      // instead of firing onFileOpen directly. Desktop / wide viewports
      // keep the existing behaviour.
      if (isMobile()) {
        tree.openActionBar(props.node.path, nodeRef)
        return
      }
      tree.onFileOpen?.(props.node.path)
      return
    }
    await doLoad()
    const willExpand = !expanded()

    // Two modes, keyed off `showFiles`:
    //  - Directory-picker mode (`showFiles === false`, e.g. the New
    //    Agent working-dir tree): the whole point is to choose a
    //    directory, so a folder click selects it (drives the path
    //    input / working dir) AND toggles expand.
    //  - File-browser mode (`showFiles === true`, the sidebar Files
    //    section): folders only expand/collapse and never carry a
    //    selected visual (selection is for files there).
    if (!tree.showFiles) {
      tree.onSelect(props.node.path)
    }
    tree.setNodeExpanded(props.node.path, willExpand)
    // File-browser mode only: if this folder was somehow selected (via
    // path-input / external restore), expanding it clears that stale
    // selection so folders never look "active" while just peeking in.
    if (tree.showFiles && willExpand && props.selectedPath === props.node.path) {
      tree.onSelect('')
    }
    if (willExpand) {
      scrollIntoViewIfNeeded()
    }
  }

  // Auto-expand when selectedPath changes to a descendant of this node.
  createEffect(on(
    () => props.selectedPath,
    (selected) => {
      if (!props.node.isDir)
        return
      const flavor = tree.flavor()
      if (!isDescendantPath(selected, props.node.path, flavor))
        return

      if (!loaded()) {
        doLoad().then(() => { // eslint-disable-line solid/reactivity -- one-shot async load
          tree.setNodeExpanded(props.node.path, true)
          // Scroll into view for the deepest auto-expanded node.
          // Only scroll if this is the closest ancestor (children will handle deeper).
          const hasMatchingChild = children().some(
            c => c.isDir && (isDescendantPath(selected, c.path, flavor) || selected === c.path),
          )
          if (!hasMatchingChild) {
            scrollIntoViewIfNeeded()
          }
        })
      }
      else if (!expanded()) {
        tree.setNodeExpanded(props.node.path, true)
      }
    },
  ))

  // Re-fetch when expanded but cache is missing (e.g. after sessionStorage restore).
  createEffect(() => {
    if (props.node.isDir && expanded() && !loaded() && !loading()) {
      doLoad()
    }
  })

  // Silently re-fetch when refreshVersion bumps (keeps old data visible).
  createEffect(on(
    () => tree.refreshVersion(),
    (_, prev) => {
      if (prev === undefined)
        return
      if (!props.node.isDir || !expanded())
        return
      loadChildren(tree.workerId, props.node.path, tree.showFiles)
        .then((result) => { // eslint-disable-line solid/reactivity -- one-shot async refresh
          tree.setChildren(props.node.path, result.entries, result.truncated)
        })
        .catch(() => { /* ignore refresh errors */ })
    },
  ))

  // Scroll into view when this node is selected via path input.
  // Skip for directories that are collapsed — collapsing should not scroll.
  createEffect(() => {
    if (props.selectedPath === props.node.path && nodeRef) {
      if (props.node.isDir && !expanded())
        return
      const container = tree.scrollContainer
      if (!container)
        return
      requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect()
        const nodeRect = nodeRef.getBoundingClientRect()
        if (nodeRect.top < containerRect.top || nodeRect.bottom > containerRect.bottom) {
          container.scrollTop += nodeRect.top - containerRect.top
        }
      })
    }
  })

  // When selected we add a 4px `border-left` accent (see DirectoryTree.css.ts
  // — `.node.nodeSelected`). Subtract that 4px from the inline padding-left
  // so the icon does not shift horizontally on selection / deselection.
  // Directories never receive the selected class (ux-pass4 AC3), so the
  // compensation only applies to file rows.
  const indent = () => `${8 + props.depth * 16 - (showSelectedVisual() ? 4 : 0)}px`
  const gitIcon = createMemo<GitIconInfo>(() => {
    const store = tree.gitStatusStore()
    if (!store)
      return NO_GIT_ICON
    if (props.node.isDir) {
      return store.hasChanges(props.node.path)
        ? { class: styles.iconDirChanged, testId: undefined }
        : NO_GIT_ICON
    }
    const entry = store.getFileStatus(props.node.path)
    return entry ? getGitFileIconClass(entry) : NO_GIT_ICON
  })
  const diffStats = createMemo<DiffStats | null>(() => {
    const store = tree.gitStatusStore()
    return store ? store.getNodeDiffStats(props.node.path, props.node.isDir) : null
  })

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    tree.openContextMenuAt(
      { path: props.node.path, isDir: props.node.isDir },
      e.clientX,
      e.clientY,
    )
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault()
      const r = nodeRef.getBoundingClientRect()
      tree.openContextMenuAt(
        { path: props.node.path, isDir: props.node.isDir },
        r.left,
        r.bottom,
      )
    }
  }

  return (
    <div ref={wrapperRef}>
      <div
        ref={nodeRef}
        class={styles.node}
        classList={{
          [styles.nodeSelected]: showSelectedVisual(),
          [styles.nodeWrap]: wrapMode(),
        }}
        style={{
          'padding-left': indent(),
          // File rows use the OS-standard context-menu cursor to signal
          // that right-click is the primary action surface. Directory
          // rows keep `pointer` (toggle expand/collapse).
          ...(props.node.isDir ? {} : { cursor: 'context-menu' }),
        }}
        tabindex="0"
        data-testid="tree-row"
        onClick={toggle}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
      >
        <Show
          when={props.node.isDir}
          fallback={<span class={styles.chevronPlaceholder} />}
        >
          <Icon icon={ChevronRight} size="md" class={`${styles.chevron}${expanded() ? ` ${styles.chevronExpanded}` : ''}`} />
        </Show>
        <Show
          when={props.node.isDir}
          fallback={<Icon icon={File} size="sm" class={gitIcon().class || styles.fileIcon} data-testid={gitIcon().testId} />}
        >
          <Show
            when={expanded()}
            fallback={<Icon icon={FolderClosed} size="sm" class={gitIcon().class || styles.folderIcon} data-testid={gitIcon().testId} />}
          >
            <Icon icon={FolderOpen} size="sm" class={gitIcon().class || styles.folderIcon} data-testid={gitIcon().testId} />
          </Show>
        </Show>
        <RowLabelWithStats
          label={(
            <span
              class={
                wrapMode()
                  ? (props.node.hidden ? styles.nodeNameMutedWrap : styles.nodeNameWrap)
                  : (props.node.hidden ? styles.nodeNameMuted : styles.nodeName)
              }
              title={props.node.displayName}
            >
              {props.node.displayName}
            </span>
          )}
          tooltipLabel={props.node.displayName}
          stats={diffStats()}
        />
        <div class={styles.rightCluster}>
          <div class={styles.nodeMeta} aria-hidden="true">
            <span class={styles.nodeSize}>
              <Show when={!props.node.isDir && props.node.size !== undefined}>
                {formatBytes(props.node.size!)}
              </Show>
            </span>
            <span class={styles.nodeModTime} title={formatModTimeFull(props.node.modTime)}>
              {formatModTimeShort(props.node.modTime)}
            </span>
          </div>
        </div>
      </div>
      <Show when={loading()}>
        <div class={styles.loadingInline} style={{ 'padding-left': `${8 + (props.depth + 1) * 16}px` }}>
          Loading...
        </div>
      </Show>
      <Show when={loaded()}>
        <div ref={childrenRef} class={styles.childrenWrapper} classList={{ [styles.childrenWrapperExpanded]: expanded() && !loading() }}>
          <div class={styles.childrenInner}>
            <For each={children()}>
              {child => (
                <TreeNode
                  node={child}
                  selectedPath={props.selectedPath}
                  depth={props.depth + 1}
                />
              )}
            </For>
            <Show when={children().length === 0}>
              <div class={styles.emptyInline} style={{ 'padding-left': `${8 + (props.depth + 1) * 16}px` }}>
                Empty
              </div>
            </Show>
            <Show when={tree.isTruncated(props.node.path) && !tree.visiblePaths()}>
              <div class={styles.emptyInline} style={{ 'padding-left': `${8 + (props.depth + 1) * 16}px` }}>
                {`${children().length}+ entries, listing truncated`}
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}

export const DirectoryTree: Component<DirectoryTreeProps> = (props) => {
  const isMobile = useIsMobile()
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [inputValue, setInputValue] = createSignal('')
  let loadVersion = 0
  let treeRef!: HTMLDivElement
  let rootRowRef!: HTMLDivElement
  // 1×1 invisible anchor used by the shared context menu. Positioned to
  // `(clientX, clientY)` on right-click or to the focused row's
  // `left, bottom` on Shift+F10 / ContextMenu key — DropdownMenu only
  // calls `getBoundingClientRect()` on the anchor, so a hidden div is
  // sufficient without modifying the shared DropdownMenu component.
  let virtualAnchorEl!: HTMLDivElement

  // Shared context-menu state — one menu instance per DirectoryTree,
  // re-targeted by each row. Avoids mounting one popover per row.
  const [menuTarget, setMenuTarget] = createSignal<{ path: string, isDir: boolean } | null>(null)
  const openContextMenuAt = (target: { path: string, isDir: boolean }, x: number, y: number) => {
    virtualAnchorEl.style.left = `${x}px`
    virtualAnchorEl.style.top = `${y}px`
    setMenuTarget(target)
  }

  // Mobile touch action-bar state.
  const [actionTarget, setActionTarget] = createSignal<{ path: string } | null>(null)
  let actionSourceEl: HTMLElement | null = null
  const openActionBar = (path: string, sourceEl: HTMLElement) => {
    actionSourceEl = sourceEl
    setActionTarget({ path })
  }
  const closeActionBar = () => {
    setActionTarget(null)
    // Defer focus restore so any pending click handlers settle first.
    const el = actionSourceEl
    actionSourceEl = null
    if (el)
      queueMicrotask(() => el.focus())
  }

  const nameLayoutMode = () => props.nameLayout ?? 'truncate'

  // Sort mode signal. Persisted across reloads via `sortModeStorageKey` so
  // the user's last choice is restored. Default `name-asc` matches the
  // historical sort order.
  const sortModeStorageKey = () => `directoryTree:sortMode:${props.rootPath ?? '~'}:${props.showFiles ? 'files' : 'dirs'}`
  const readPersistedSortMode = (): SortMode => {
    try {
      const raw = sessionStorage.getItem(sortModeStorageKey())
      return raw === 'mtime-desc' ? 'mtime-desc' : DEFAULT_SORT_MODE
    }
    catch {
      return DEFAULT_SORT_MODE
    }
  }
  const [sortMode, setSortModeSignal] = createSignal<SortMode>(DEFAULT_SORT_MODE)
  const setSortMode = (mode: SortMode) => {
    setSortModeSignal(mode)
    try {
      sessionStorage.setItem(sortModeStorageKey(), mode)
    }
    catch { /* quota / private mode — non-fatal */ }
  }
  // Re-sync sort mode whenever the storage key changes (rootPath swap).
  createEffect(() => {
    void sortModeStorageKey()
    setSortModeSignal(readPersistedSortMode())
  })

  // When the tree container shrinks (e.g. WorktreeOptions appearing below),
  // re-scroll the selected node into view if it was pushed out.
  onMount(() => {
    const observer = new ResizeObserver(() => {
      if (!treeRef)
        return
      const selected = treeRef.querySelector(`.${styles.nodeSelected}`) as HTMLElement | null
      if (!selected)
        return
      const containerRect = treeRef.getBoundingClientRect()
      const nodeRect = selected.getBoundingClientRect()
      if (nodeRect.top < containerRect.top || nodeRect.bottom > containerRect.bottom) {
        treeRef.scrollTop += nodeRect.top - containerRect.top
      }
    })
    observer.observe(treeRef)
    onCleanup(() => observer.disconnect())
  })

  // -------------------------------------------------------------------------
  // Centralized tree state: expanded paths + children cache
  // -------------------------------------------------------------------------
  const [state, setState] = createStore<{
    expandedPaths: Record<string, boolean>
    childrenCache: Record<string, TreeNodeData[]>
    truncatedDirs: Record<string, boolean>
  }>({
    expandedPaths: {},
    childrenCache: {},
    truncatedDirs: {},
  })

  const [refreshVersion, setRefreshVersion] = createSignal(0)
  const triggerRefresh = () => setRefreshVersion(v => v + 1)

  // Expose imperative handle via ref callback.
  createEffect(() => {
    props.ref?.({
      collapseAll: () => {
        setState(produce((s) => {
          const rp = props.rootPath ?? '~'
          for (const key of Object.keys(s.expandedPaths)) {
            if (key !== rp)
              delete s.expandedPaths[key]
          }
        }))
      },
      refresh: triggerRefresh,
    })
  })

  const storageKey = () => `directoryTree:state:${props.rootPath ?? '~'}:${props.showFiles ? 'files' : 'dirs'}`

  // Restore state from sessionStorage when rootPath changes
  createEffect(() => {
    const key = storageKey()
    try {
      const stored = sessionStorage.getItem(key)
      if (stored) {
        const restored = deserializeState(stored)
        if (restored) {
          setState(restored)
          return
        }
      }
    }
    catch { /* ignore corrupt data */ }
    // Default: root is expanded
    setState({
      expandedPaths: { [props.rootPath ?? '~']: true },
      childrenCache: {},
      truncatedDirs: {},
    })
  })

  // Persist state whenever it changes
  createEffect(() => {
    // Read all to subscribe
    const expanded = state.expandedPaths
    const cache = state.childrenCache
    const truncated = state.truncatedDirs
    try {
      sessionStorage.setItem(storageKey(), serializeState(expanded, cache, truncated))
    }
    catch { /* quota exceeded — ignore */ }
  })

  const isNodeExpanded = (path: string) => !!state.expandedPaths[path]
  const setNodeExpanded = (path: string, expanded: boolean) => {
    setState(produce((s) => {
      if (expanded) {
        s.expandedPaths[path] = true
      }
      else {
        delete s.expandedPaths[path]
      }
    }))
  }

  const getChildren = (path: string): TreeNodeData[] | undefined => state.childrenCache[path]
  const isTruncated = (path: string): boolean => !!state.truncatedDirs[path]
  // Every turn-end fans out into one loadChildren per expanded TreeNode.
  // Most subtrees haven't changed between turns, so skip the setState when
  // data and truncation match the cache — otherwise Solid would invalidate
  // children(), per-node gitIcon/diffStats, prefixIndex (walks every file ×
  // every ancestor), and downstream JSX for a subtree whose contents are
  // already on screen. Load-bearing; keep.
  const setChildrenInStore = (path: string, data: TreeNodeData[], truncated: boolean) => {
    const existing = state.childrenCache[path]
    const truncationUnchanged = !!state.truncatedDirs[path] === truncated
    if (truncationUnchanged && existing && sameTreeEntries(existing, data))
      return
    setState(produce((s) => {
      s.childrenCache[path] = data
      if (truncated) {
        s.truncatedDirs[path] = true
      }
      else {
        delete s.truncatedDirs[path]
      }
    }))
  }

  const workerFlavor = createMemo<PathFlavor>(() =>
    props.flavor ?? detectFlavor(props.homeDir || props.rootPath || ''))

  const rootPath = () => props.rootPath ?? '~'
  const rootDisplayName = () => {
    const rp = rootPath()
    return basename(rp, workerFlavor()) || rp
  }

  // Root children derived from the centralized cache, optionally filtered.
  const showHidden = () => props.showHiddenFiles ?? true
  const rootChildren = createMemo(() => {
    const all = getChildren(rootPath())
    if (!all)
      return undefined
    const sh = showHidden()
    const visible = props.visiblePaths
    const flavor = workerFlavor()
    const mode = sortMode()
    const filtered = (sh && !visible)
      ? all.slice()
      : all.filter(c =>
          (sh || !c.hidden)
          && (!visible || isPathVisible(c.path, visible, flavor)),
        )
    return filtered.sort((a, b) => compareByMode(a, b, mode))
  })

  const submitPath = (raw: string) => {
    const value = raw.trim()
    if (!value)
      return
    props.onSelect(untildify(value, props.homeDir, workerFlavor()))
  }

  // Sync external selectedPath to input (tildified for display)
  createEffect(() => {
    setInputValue(tildify(props.selectedPath, props.homeDir, workerFlavor()))
  })

  // Load root children when workerId or rootPath changes
  createEffect(() => {
    const workerId = props.workerId
    const root = props.rootPath ?? '~'
    if (!workerId)
      return
    if (props.enabled === false)
      return

    // If we already have cached children (from sessionStorage or previous
    // load), skip fetching — this eliminates flicker on tab switches.
    if (getChildren(root) !== undefined)
      return

    const version = ++loadVersion
    setLoading(true)
    setError(null)
    loadChildren(workerId, root, props.showFiles ?? false)
      // eslint-disable-next-line solid/reactivity -- async promise callback; setChildrenInStore reads state as a current-value check, not a subscription
      .then((result) => {
        if (version !== loadVersion)
          return
        setChildrenInStore(root, result.entries, result.truncated)
        setLoading(false)
      })
      .catch((err) => {
        if (version !== loadVersion)
          return
        setError(err instanceof Error ? err.message : 'Failed to load directory')
        setLoading(false)
      })
  })

  // Auto-refresh tree when an agent turn ends.
  createEffect(on(
    () => props.turnEndTrigger,
    (_, prev) => {
      if (prev !== undefined) {
        triggerRefresh()
      }
    },
  ))

  // Re-fetch root silently when refreshVersion bumps (keeps old data visible).
  createEffect(on(
    () => refreshVersion(),
    (_, prev) => {
      if (prev === undefined)
        return
      const workerId = props.workerId
      const root = props.rootPath ?? '~'
      if (!workerId)
        return
      loadChildren(workerId, root, props.showFiles ?? false)
        // eslint-disable-next-line solid/reactivity -- async promise callback; setChildrenInStore reads state as a current-value check, not a subscription
        .then((result) => {
          setChildrenInStore(root, result.entries, result.truncated)
        })
        .catch(() => { /* ignore refresh errors */ })
    },
  ))

  const handlePathKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitPath(inputValue())
    }
  }

  const handlePathBlur = () => {
    const value = inputValue().trim()
    if (!value)
      return
    // Avoid re-emitting the displayed tildified value.
    if (value === tildify(props.selectedPath, props.homeDir, workerFlavor()))
      return
    submitPath(value)
  }

  const rootDiffStats = createMemo<DiffStats | null>(() => {
    const store = props.gitStatusStore
    return store ? store.getNodeDiffStats(rootPath(), true) : null
  })

  const flavorHint = createMemo(() => {
    const raw = inputValue().trim()
    if (!raw || raw.startsWith('~'))
      return null
    const rawFlavor = detectFlavor(raw)
    if (!isAbsolute(raw, rawFlavor))
      return null
    const wf = workerFlavor()
    if (rawFlavor === wf)
      return null
    return wf === 'win32'
      ? 'This looks like a POSIX path but the worker expects Windows paths.'
      : 'This looks like a Windows path but the worker expects POSIX paths.'
  })

  const treeContextValue: TreeContextValue = {
    get workerId() { return props.workerId },
    get showFiles() { return props.showFiles ?? false },
    get rootPath() { return rootPath() },
    get homeDir() { return props.homeDir },
    flavor: workerFlavor,
    get scrollContainer() { return treeRef },
    get showHiddenFiles() { return showHidden() },
    gitStatusStore: () => props.gitStatusStore,
    visiblePaths: () => props.visiblePaths,
    refreshVersion,
    onSelect: path => props.onSelect(path),
    get onFileOpen() { return props.onFileOpen },
    get onMention() { return props.onMention },
    get onOpenTerminal() { return props.onOpenTerminal },
    get onRefresh() { return props.onRefresh },
    get onToggleShowHidden() { return props.onToggleShowHidden },
    isNodeExpanded,
    setNodeExpanded,
    getChildren,
    setChildren: setChildrenInStore,
    isTruncated,
    openContextMenuAt,
    nameLayout: nameLayoutMode,
    sortMode,
    setSortMode,
    openActionBar,
  }

  return (
    <TreeContext.Provider value={treeContextValue}>
      {/* Virtual anchor for the shared context menu — positioned to
          (clientX, clientY) on right-click or to the row's left/bottom on
          keyboard. `position: fixed` + `pointer-events: none` so it never
          interferes with row interaction. */}
      <div
        ref={virtualAnchorEl}
        aria-hidden="true"
        style={{
          'position': 'fixed',
          'width': '1px',
          'height': '1px',
          'pointer-events': 'none',
          'opacity': 0,
        }}
      />
      <TreeContextMenu
        open={() => menuTarget() !== null}
        anchorRef={() => virtualAnchorEl}
        target={menuTarget}
        onClose={() => setMenuTarget(null)}
      />
      <div class={styles.container}>
        <div class={styles.pathInput}>
          <Tooltip text={props.selectedPath} showWhen="clipped">
            <input
              type="text"
              value={inputValue()}
              onInput={e => setInputValue(e.currentTarget.value)}
              // Direct listener so preventDefault() fires before Dialog's keydown handler.
              on:keydown={handlePathKeyDown}
              onBlur={handlePathBlur}
              placeholder="Enter path..."
            />
          </Tooltip>
          <DropdownMenu
            trigger={triggerProps => (
              <button
                type="button"
                class={styles.sortButton}
                title={sortMode() === 'mtime-desc' ? '정렬: 최신 수정 순' : '정렬: 이름 오름차순'}
                aria-label="정렬 방식"
                data-testid="tree-sort-button"
                {...triggerProps}
              >
                <Icon
                  icon={sortMode() === 'mtime-desc' ? Clock : ArrowDownAZ}
                  size="sm"
                />
              </button>
            )}
            placement={{ placement: 'auto' }}
          >
            <button
              role="menuitemradio"
              aria-checked={sortMode() === 'name-asc'}
              data-testid="tree-sort-name-asc"
              onClick={(e) => {
                setSortMode('name-asc')
                ;(e.currentTarget.closest('[popover]') as HTMLElement | null)?.hidePopover()
              }}
            >
              <Icon icon={ArrowDownAZ} size="sm" />
              이름 오름차순
            </button>
            <button
              role="menuitemradio"
              aria-checked={sortMode() === 'mtime-desc'}
              data-testid="tree-sort-mtime-desc"
              onClick={(e) => {
                setSortMode('mtime-desc')
                ;(e.currentTarget.closest('[popover]') as HTMLElement | null)?.hidePopover()
              }}
            >
              <Icon icon={Clock} size="sm" />
              최신 수정 순
            </button>
          </DropdownMenu>
        </div>
        <Show when={flavorHint()}>
          {hint => (
            <div class={styles.pathHint} data-testid="path-flavor-hint">{hint()}</div>
          )}
        </Show>
        <div class={styles.tree} ref={treeRef}>
          {/* On mobile the action bar is always mounted (T4) so tapping a
              file row never causes a layout shift — only its disabled
              state flips. On desktop the bar is omitted entirely; the
              right-click / Shift+F10 context menu remains the primary
              action surface there. */}
          <Show when={isMobile()}>
            <TreeActionBar
              target={actionTarget}
              onClose={closeActionBar}
            />
          </Show>
          <Switch fallback={(
            <div class={styles.treeInner}>
              {/* Root directory row */}
              <div
                ref={rootRowRef}
                class={styles.node}
                classList={{
                  // In directory-picker mode (`!showFiles`) the root
                  // ("~") is a valid pick, so show the selected visual.
                  // File-browser mode keeps the root unhighlighted.
                  [styles.nodeSelected]: !props.showFiles && props.selectedPath === rootPath(),
                  [styles.nodeWrap]: nameLayoutMode() === 'wrap',
                }}
                style={{ 'padding-left': (!props.showFiles && props.selectedPath === rootPath()) ? '4px' : '8px' }}
                tabindex="0"
                data-testid="tree-root-node"
                onClick={() => props.onSelect(rootPath())}
                onContextMenu={(e) => {
                  e.preventDefault()
                  openContextMenuAt({ path: rootPath(), isDir: true }, e.clientX, e.clientY)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
                    e.preventDefault()
                    const r = rootRowRef.getBoundingClientRect()
                    openContextMenuAt({ path: rootPath(), isDir: true }, r.left, r.bottom)
                  }
                }}
              >
                <Icon icon={FolderOpen} size="sm" class={styles.folderIcon} />
                <RowLabelWithStats
                  label={(
                    <span
                      class={nameLayoutMode() === 'wrap' ? styles.nodeNameWrap : styles.nodeName}
                      title={rootDisplayName()}
                    >
                      {rootDisplayName()}
                    </span>
                  )}
                  tooltipLabel={rootDisplayName()}
                  stats={rootDiffStats()}
                />
              </div>
              <Show when={rootChildren() !== undefined}>
                <div class={`${styles.childrenWrapper} ${styles.childrenWrapperExpanded}`}>
                  <div class={styles.childrenInner}>
                    <Show
                      when={rootChildren()!.length > 0}
                      fallback={<div class={emptyState}>{props.visiblePaths ? 'No changes' : 'Empty directory'}</div>}
                    >
                      <For each={rootChildren()}>
                        {node => (
                          <TreeNode
                            node={node}
                            selectedPath={props.selectedPath}
                            depth={0}
                          />
                        )}
                      </For>
                      <Show when={isTruncated(rootPath()) && !props.visiblePaths}>
                        <div class={styles.emptyInline} style={{ 'padding-left': '24px' }}>
                          {`${rootChildren()!.length}+ entries, listing truncated`}
                        </div>
                      </Show>
                    </Show>
                  </div>
                </div>
              </Show>
            </div>
          )}
          >
            <Match when={error()}>
              <div class={styles.errorState}>{error()}</div>
            </Match>
            <Match when={props.enabled === false}>
              <div class={styles.loadingState} data-testid="directory-tree-starting">
                <StartupSpinner label="Starting…" />
              </div>
            </Match>
            <Match when={loading()}>
              <div class={styles.loadingState}>Loading...</div>
            </Match>
          </Switch>
        </div>
      </div>
    </TreeContext.Provider>
  )
}
