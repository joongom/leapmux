# Tree row — mobile truncate, wrap toggle, touch action bar

- **id**: `tree-row-mobile-truncate`
- **status**: draft v1
- **date**: 2026-05-14
- **predecessor**: `tree-row-ux-pass2.md`

## Problem

The file tree horizontally scrolls the sidebar on mobile because
`treeInner.width: max-content` sizes to the widest filename; when a row
overflows, the sticky right cluster fails to mask the filename
(`backgroundColor: inherit` is transparent on non-selected, non-zebra
rows). File actions are also gated behind right-click, invisible on
touch.

## User stories

1. Phone user: sidebar never scrolls horizontally.
2. Phone user: I flip a header toggle between **Truncate** and **Wrap**;
   choice persists.
3. Phone user: tapping a file row opens an action bar with Open in new
   tab, Download, Mention, Copy path, Copy relative path.
4. Desktop user: right-click and `Shift+F10` / `ContextMenu` unchanged.

## Acceptance criteria

1. `treeInner` drops `width: max-content` (use `width: 100%`,
   `minWidth: 0`); `.tree` has no horizontal scroll at pane widths ≥ 200px.
2. **Truncate** mode (default): filenames clip with single-line
   ellipsis (existing `nodeName` rule); full name stays in `title`.
3. Toggle control in `FilesSectionHeaderActions` (next to collapse-all /
   hidden / refresh): Truncate / Wrap; icon-only, tooltipped.
4. Toggle persists per-user in `localStorage` under a new
   `PREFIX_FILES_NAME_WRAP` key; default Truncate.
5. **Wrap** mode: filename breaks onto up to **3 lines**
   (`-webkit-line-clamp: 3`); chevron + icon top-aligned.
6. `rightCluster` is always opaque against the row beneath — background
   resolves to base / zebra / hover / selected fill, never transparent
   `inherit`. Verified both themes, zebra even rows.
7. On viewports ≤ mobile breakpoint (Designer decides; provisional
   `(max-width: 640px)`), tapping a row opens a **TreeActionBar** at the
   top of the tree pane. Items: Open in new tab, Download, Mention (when
   handler present), Copy path, Copy relative path; close dismisses.
8. **Open in new tab** reuses the chunked `downloadFileFromWorker` blob,
   calls `window.open(blobUrl, '_blank', 'noopener')`; text/image MIME
   inlines, binary falls back to download. URL revoked on `pagehide`.
9. PC / non-touch / wide viewports unchanged: right-click opens
   `TreeContextMenu`; keyboard parity holds; no action bar rendered.
10. Action bar reachable by Tab; Esc closes and restores focus; items
    use `role="menuitem"` like `TreeContextMenu`.

## Out of scope

- Tree virtualization.
- `FileViewer` preview-panel redesign.
- Forcing the action bar onto PC / wide viewports.
- Double-tap / long-press / swipe gestures — single tap only.
- Meta-column container query at 240px (kept as-is).

## UI notes (Designer)

### 1. Mobile breakpoint + detection
Use the existing `useIsMobile()` hook (`breakpoints.mobile = 768px`, viewport
`max-width: 767px`). This already drives the app's mobile chrome. No new
primitive needed; the TechLead's `useIsTouchViewport()` can wrap the same
`matchMedia` call or just re-export `useIsMobile`. Do **not** use a container
query for the action-bar trigger — the sidebar pane can be narrow on desktop
(split-pane resizing) and should not spawn a touch bar on a pointer-fine device.
Trigger condition: `isMobile() === true` (viewport-width only, 768 px threshold).

### 2. Action bar placement
**Sticky-top inside `.tree`** (position: sticky; top: 0; z-index: 1) — it
follows the tree's own scroll context so it never overlaps the section-header
controls above it or the path-input bar, and it disappears naturally when the
pane scrolls away.

### 3. "Open in new tab" heuristic

| Extension / MIME prefix | Action |
|---|---|
| `.md .txt .log .csv .json .yaml .yml .toml .xml .html .htm .svg` | `window.open(blobUrl, '_blank', 'noopener')` — browser inlines |
| `image/*` | inline open |
| `application/pdf` | inline open |
| Everything else (binary, unknown) | trigger anchor-download (existing `downloadFileFromWorker` path) |

Detection order: file extension first (cheap, no server round-trip); MIME from
`Blob.type` if extension is absent. Revoke blob URL on `pagehide`.

### 4. Toggle icon + slot

- Icon-only `IconButton` (matches existing header actions style; `size="sm"`, `iconSize="sm"`).
- **Truncate mode** icon: `WrapText` (`lucide-solid/icons/wrap-text`), `aria-pressed="false"`.
- **Wrap mode** icon: `AlignJustify` (`lucide-solid/icons/align-justify`), `aria-pressed="true"`.
- Position: inserted **before** `ChevronsDownUp` (collapse-all) in `FilesSectionHeaderActions`.
- Persistence: `localStorage` key `leapmux:files-name-wrap:<workerId>:<workingDir>`, following
  the `PREFIX_FILES_SHOW_HIDDEN` pattern. Export constant `PREFIX_FILES_NAME_WRAP` from
  `browserStorage.ts`. Default: `false` (Truncate).

### 5. Wrap-mode metrics

- `nodeName` in wrap mode: `white-space: normal; display: -webkit-box; -webkit-line-clamp: 3;
  -webkit-box-orient: vertical; overflow: hidden; line-height: 1.35;`
- Chevron + file icon: `align-self: flex-start` (top-aligned to first line).
- `rightCluster`: `align-items: flex-start` — meta columns pin to the **first line** (top).
  Rationale: size and mod-time belong to the file name's start, not its end, and top-alignment
  avoids the cluster jumping when wrap count changes on resize.
- `nodeMeta` stays hidden below 240 px container width (existing container query unchanged).

### 6. Sticky cluster background — opaque approach

Change `--lm-tree-row-zebra-bg` from `rgba` to **pre-composited opaque** values:

| Theme | Composited value |
|---|---|
| Light | `#f9f9f9` (≈ `rgba(0,0,0,0.025)` over `#ffffff`) |
| Dark | `rgb(20 20 22)` (≈ `rgba(255,255,255,0.03)` over `rgb(18 18 20)`) |

Rationale: making the token opaque is a one-line change per theme and permanently
solves `rightCluster` bleed-through without conditional JS. Then the cluster simply
uses `backgroundColor: inherit` (existing rule) — it already inherits the correct
opaque fill from the row.

Row-state mapping for `rightCluster` background (via CSS inheritance):

| Row state | Background source |
|---|---|
| Non-zebra (odd) | `var(--background)` — inherits from `.tree` |
| Zebra (even) | `var(--lm-tree-row-zebra-bg)` — now opaque |
| Hover | `var(--card)` — fully opaque, already overrides zebra |
| Selected | `var(--secondary)` — fully opaque, already overrides zebra |

### 7. TreeActionBar visual

Horizontal pill-bar, full sidebar width, `background: var(--card)`,
`border-bottom: 1px solid var(--border)`. Button size: 32 × 32 px touch target
(`padding: 6px`), icon 16 px, icon-only with `title` tooltip. Actions in priority
order:

1. **Open in new tab** — `ExternalLink` (`lucide-solid/icons/external-link`)
2. **Download** — `Download` (`lucide-solid/icons/download`)
3. **Mention** — `AtSign` (`lucide-solid/icons/at-sign`) — rendered only when `onMention` present
4. **Copy path** — `Copy` (`lucide-solid/icons/copy`)
5. **Copy relative path** — `ClipboardCopy` (`lucide-solid/icons/clipboard-copy`)
6. **Close (X)** — `X` (`lucide-solid/icons/x`) — pushed to far right via `margin-left: auto`

All icons already imported elsewhere in the tree components; `ExternalLink` and `X`
are the only additions.

### 8. Dismissal

- Tapping **X** closes the bar and returns focus to the source row.
- Tapping outside the bar (document `pointerdown` listener, `capture: true`) also closes it.
- Selecting an action (**Open in new tab**, **Download**, **Copy***) closes the bar after
  executing.
- **Mention** closes the bar and moves focus to the chat input (existing `onMention` behaviour).
- `Esc` key on any focused action closes the bar and restores focus to the source row
  (`role="menu"` + `aria-label="File actions"` container; `role="menuitem"` per button).
  Announce open via `aria-live="polite"` region adjacent to the bar.

## Tasks

> **Pre-flight (verified by TechLead, 2026-05-14):**
> - `useIsMobile()` lives at `frontend/src/hooks/useIsMobile.ts` and reads
>   `breakpoints.mobile = 768` from `~/styles/tokens`. Reuse directly — no
>   new `useIsTouchViewport()` primitive needed.
> - All lucide icons exist under
>   `frontend/node_modules/lucide-solid/dist/types/icons/`:
>   `wrap-text`, `align-justify`, `external-link`, `x` (plus already-imported
>   `at-sign`, `copy`, `clipboard-copy`, `download`).
> - `--lm-tree-row-zebra-bg` is defined twice in
>   `frontend/src/styles/global.css.ts` (light L173 `rgba(0,0,0,0.025)` on
>   `#ffffff`; dark L238 `rgba(255,255,255,0.03)` on the dark base). The
>   composited opaque values from §6 match those bases exactly.
> - `treeInner` has a single consumer (`DirectoryTree.tsx` L1062). No
>   external dependency on its `max-content` width.
> - Selected (`var(--secondary)`) and hover (`var(--card)`) row backgrounds
>   are already fully opaque on `node`/`nodeSelected` in `sharedTree.css.ts`
>   — switching the zebra token alone resolves `rightCluster` bleed-through
>   across all 4 row states.
>
> **Open-in-new-tab MIME/ext list** (concrete, frozen for T8):
> Inline (open via `window.open(blobUrl, '_blank', 'noopener')`):
> exts `.md .txt .log .csv .json .yaml .yml .toml .xml .html .htm .svg`,
> MIME prefix `image/`, MIME `application/pdf`.
> Everything else (binary, unknown ext + unknown MIME) falls through to the
> existing anchor-download path.

---

### T1 — Opaque zebra token (sticky-cluster masking fix)

- **Subject:** Switch `--lm-tree-row-zebra-bg` from `rgba` to pre-composited opaque values so `rightCluster` (`backgroundColor: inherit`) masks long filenames across all 4 row states.
- **Files:** `frontend/src/styles/global.css.ts`
- **Implementation:** Change light-theme `--lm-tree-row-zebra-bg` to `#f9f9f9` (L173) and dark-theme to `rgb(20 20 22)` (L238). No selector or component change required — zebra rule (`childrenInner > div:nth-child(even) > .node`) and `rightCluster { backgroundColor: inherit }` keep working unchanged. Hover (`var(--card)`) and selected (`var(--secondary)`) already opaque on `.node` — they layer correctly on top via existing specificity.
- **Audit:** `grep -rn "lm-tree-row-zebra-bg\|rightCluster\|backgroundColor: 'inherit'" frontend/src` — confirm only two definitions remain (one per theme), no remaining `rgba(` on this token, and `rightCluster` still inherits.
- **Test gate:** `cd frontend && bun run typecheck && bun run test -- DirectoryTree`

### T2 — Drop horizontal scroll from `treeInner`

- **Subject:** Make `treeInner.width: 100%` (kill `max-content`) so the sidebar never scrolls horizontally on mobile.
- **Files:** `frontend/src/components/tree/DirectoryTree.css.ts`
- **Implementation:** Replace `width: 'max-content'` with `width: '100%'` and keep `minWidth: '100%'` (now redundant — drop it for clarity). Row flex layout already shrinks `nodeName` via the `min-width: 0` global rule + `nodeName.minWidth: 0` — ellipsis kicks in automatically. Long names in truncate mode clip; in wrap mode (T5) they break.
- **Audit:** `grep -rn "treeInner\|max-content" frontend/src` — confirm `treeInner` has only one consumer (`DirectoryTree.tsx` L1062) and no other component depends on its horizontal-scroll behaviour.
- **Test gate:** `cd frontend && bun run typecheck && bun run test -- DirectoryTree`

### T3 — Persistence: `PREFIX_FILES_NAME_WRAP` localStorage key

- **Subject:** Add a per-(worker, workingDir) localStorage key for the truncate/wrap toggle, matching the `PREFIX_FILES_SHOW_HIDDEN` pattern.
- **Files:** `frontend/src/lib/browserStorage.ts`
- **Implementation:** Export `export const PREFIX_FILES_NAME_WRAP = 'leapmux:files-name-wrap:'`. Append `{ prefix: PREFIX_FILES_NAME_WRAP, ttlMs: 7 * DAY_MS }` to `DYNAMIC_KEY_TTLS`. No new helper needed — consumers reuse `safeGetJson<boolean>` / `safeSetJson`.
- **Audit:** `grep -rn "PREFIX_FILES_NAME_WRAP\|PREFIX_FILES_SHOW_HIDDEN" frontend/src` — confirm new constant exported and added to TTL table.
- **Test gate:** `cd frontend && bun run typecheck && bun run lint`

### T4 — `nodeName` wrap-mode CSS variant + `align-self` rules

- **Subject:** Add a wrap-mode CSS class for `nodeName` (multi-line clamp) and top-alignment helpers for chevron / icon / `rightCluster`.
- **Files:** `frontend/src/components/tree/DirectoryTree.css.ts`
- **Implementation:** Export `nodeNameWrap = style({ whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35, wordBreak: 'break-word', minWidth: 0 })` and `nodeNameMutedWrap = style([nodeNameWrap, { color: 'var(--muted-foreground)' }])`. Export a `nodeWrap` modifier class that sets `alignItems: 'flex-start'` on `.node` and (via `globalStyle`) `align-self: flex-start` on chevron / file icon / folder icon descendants, plus `align-items: flex-start` on `rightCluster`. Do **not** touch `sharedTree.css.ts`.
- **Audit:** `grep -rn "nodeNameWrap\|nodeWrap\|-webkit-line-clamp" frontend/src/components/tree` — confirm class is consumed only by `DirectoryTree.tsx`.
- **Test gate:** `cd frontend && bun run typecheck && bun run lint`

### T5 — `nameLayout` on `TreeContext` + apply wrap classes in `TreeNode`

- **Subject:** Plumb a `nameLayout: () => 'truncate' | 'wrap'` accessor through `TreeContext`; in `TreeNode` (and the root row in `DirectoryTree`) swap `nodeName` ↔ `nodeNameWrap` and toggle the `nodeWrap` modifier on `.node`.
- **Files:** `frontend/src/components/tree/DirectoryTree.tsx`
- **Implementation:** Add `nameLayout: () => 'truncate' | 'wrap'` to `TreeContextValue` and an optional `nameLayout?: 'truncate' | 'wrap'` prop on `DirectoryTreeProps` (default `'truncate'`). Inside `TreeNode`, compute `const wrapMode = () => tree.nameLayout() === 'wrap'` and apply `nodeNameWrap`/`nodeNameMutedWrap` via `classList`, and add `nodeWrap` to the `.node` `classList`. Apply the same swap to the root-row span (DirectoryTree L1086). Keep `title={displayName}` in both modes for a11y.
- **Audit:** `grep -n "nodeName\|nameLayout" frontend/src/components/tree/DirectoryTree.tsx` — confirm both the root row and child rows honour the layout signal.
- **Test gate:** `cd frontend && bun run typecheck && bun run test -- DirectoryTree`

### T6 — Toggle button in `FilesSectionHeaderActions`

- **Subject:** Add the Truncate/Wrap `IconButton` to the section header (positioned **before** `ChevronsDownUp`), persist choice via `PREFIX_FILES_NAME_WRAP`, and forward to `DirectoryTree.nameLayout`.
- **Files:** `frontend/src/components/tree/FilesSection.tsx`
- **Implementation:** Add `nameWrapStorageKey = () => PREFIX_FILES_NAME_WRAP + workerId + ':' + workingDir` and `[wrapName, setWrapName] = createSignal(safeGetJson<boolean>(nameWrapStorageKey()) ?? false)` with re-read + persist effects mirroring `showHiddenFiles` (lines 141–148). Extend `FilesSectionHeaderActionsProps` with `nameWrap?: () => boolean` + `onToggleNameWrap?: () => void`. Insert a new `IconButton` (icon `WrapText` when `nameWrap()===false`, `AlignJustify` when `true`; `aria-pressed={String(nameWrap())}`; `title="Wrap long names"` / `title="Truncate long names"`; `data-testid="files-name-wrap-toggle"`) immediately before the `ChevronsDownUp` button. Pass `nameLayout={wrapName() ? 'wrap' : 'truncate'}` down to `<DirectoryTree>`.
- **Audit:** `grep -n "WrapText\|AlignJustify\|files-name-wrap-toggle\|nameLayout" frontend/src/components/tree/FilesSection.tsx` — confirm icons imported, button rendered, prop forwarded.
- **Test gate:** `cd frontend && bun run typecheck && bun run test -- FilesSection`

### T7 — `openFileInNewTab(workerId, path, flavor)` helper

- **Subject:** Refactor `downloadFileFromWorker` so the chunked-blob fetch is shared, then add `openFileInNewTab` that routes inline vs anchor-download based on the frozen MIME/ext list.
- **Files:** `frontend/src/components/tree/DirectoryTree.tsx`
- **Implementation:** Extract `fetchFileBlob(workerId, path): Promise<Blob>` from the existing function. Keep `downloadFileFromWorker` calling it (anchor-click path). Add `openFileInNewTab(workerId, path, flavor)`: lowercase the ext, look up against the frozen list; if inline-eligible, build the `Blob` **with an explicit MIME** (`new Blob(chunks, { type })` using an `ext→mime` map for the inline set, falling back to `application/octet-stream`), then `URL.createObjectURL` → `const w = window.open(url, '_blank', 'noopener')`; if `w === null` (popup blocked), fall through to `downloadFileFromWorker`. Revoke URL on the next `pagehide` event (`window.addEventListener('pagehide', () => URL.revokeObjectURL(url), { once: true })`). Non-inline extensions short-circuit straight to `downloadFileFromWorker` without re-fetching.
- **Audit:** `grep -n "fetchFileBlob\|openFileInNewTab\|window.open" frontend/src/components/tree/DirectoryTree.tsx` — confirm helper exported (module-local), inline list matches spec §3, single chunked-fetch path.
- **Test gate:** `cd frontend && bun run typecheck && bun run lint`

### T8 — `TreeActionBar` component + open-on-tap for mobile files

- **Subject:** Build the sticky-top mobile action bar; on mobile (`useIsMobile()`), tapping a **file** row opens the bar instead of firing `onFileOpen`; directory rows still toggle expand/collapse.
- **Files:** `frontend/src/components/tree/DirectoryTree.tsx`, `frontend/src/components/tree/DirectoryTree.css.ts`
- **Implementation:** Add `actionTarget: () => { path: string } | null` + `setActionTarget` signal in the `DirectoryTree` component; expose `openActionBar(path)` on `TreeContext`. In `TreeNode.toggle`, when `useIsMobile()()` is true and `!node.isDir`, call `tree.openActionBar(path)` instead of `onFileOpen`. Render `<TreeActionBar>` inside the `.tree` div at the top (sticky), `position: sticky; top: 0; z-index: 1; background: var(--card); border-bottom: 1px solid var(--border); padding: 4px 8px`. Items in priority order from spec §7: Open in new tab (`ExternalLink`), Download, Mention (only when `tree.onMention`), Copy path, Copy relative path, Close (`X`, `margin-left: auto`). Each is a `<button role="menuitem">` 32×32 px, `title` tooltip. Container: `role="menu" aria-label="File actions"`. Outside-click closes via `document.addEventListener('pointerdown', …, { capture: true })`. Action selection runs the action then closes. Reuses `T7` helper for Open in new tab; reuses `downloadFileFromWorker` for Download; reuses `tree.onMention` / `navigator.clipboard.writeText`.
- **Audit:** `grep -n "TreeActionBar\|openActionBar\|actionTarget\|useIsMobile\|position: 'sticky'" frontend/src/components/tree/DirectoryTree.tsx frontend/src/components/tree/DirectoryTree.css.ts` — confirm bar mounted once at tree root, only file rows open it, sticky position present.
- **Test gate:** `cd frontend && bun run typecheck && bun run test -- DirectoryTree`

### T9 — A11y: focus restore, Esc, live region

- **Subject:** Wire focus management and screen-reader announcement for the action bar.
- **Files:** `frontend/src/components/tree/DirectoryTree.tsx`
- **Implementation:** Capture the source row's `HTMLElement` at `openActionBar(path, sourceEl)`; on close (X click, Esc, action complete, outside-click), call `sourceEl?.focus()` to restore. Auto-focus the first action item on mount (the "Open in new tab" button) so Tab order flows naturally and Esc has a target. Bind `onKeyDown` at the bar container: `Escape` → close + restore. Add a sibling `<div aria-live="polite" class={styles.srOnly}>` that renders "File actions opened for <basename>" while the bar is open. Note: full focus *trap* is intentionally lighter than spec §10 — the bar is short, contains 4–6 buttons, and a trap would conflict with the outside-click dismissal; ARIA menu semantics + Esc-to-close are sufficient for the touch use case.
- **Audit:** `grep -n "aria-live\|aria-label=\"File actions\"\|sourceEl\|Escape" frontend/src/components/tree/DirectoryTree.tsx` — confirm announcement, label, focus restore, Esc handler all present.
- **Test gate:** `cd frontend && bun run typecheck && bun run test -- DirectoryTree`

### T10 — Audit sweep for sticky / overflow / pointer-events regressions

- **Subject:** Final sweep to make sure the `treeInner` change and opaque-zebra change didn't break any neighbouring component.
- **Files:** (read-only audit)
- **Implementation:** Re-grep across the codebase for any consumer that depends on the old horizontal-scroll or transparent-zebra behaviour. Spot-check `FileViewer.css.ts` and `workspaceList.css.ts` (other `max-content` consumers — independent layouts, should not need changes; just confirm).
- **Audit:** Run all four:
  - `grep -rn "treeInner\|'max-content'" frontend/src`
  - `grep -rn "position: 'sticky'" frontend/src/components/tree`
  - `grep -rn "pointer-events" frontend/src/components/tree`
  - `grep -rn "backgroundColor: 'inherit'\|background.*inherit" frontend/src/components/tree`
- **Test gate:** `cd frontend && bun run typecheck && bun run lint && bun run test`

### T11 — Tests: toggle persistence + action-bar open-on-tap

- **Subject:** Add behavioural tests for the new toggle and the mobile action bar.
- **Files:** `frontend/src/components/tree/FilesSection.test.tsx` (new), `frontend/src/components/tree/DirectoryTree.actionBar.test.tsx` (new)
- **Implementation:** `FilesSection.test.tsx`: render the section, click `files-name-wrap-toggle`, assert `aria-pressed` flips, `localStorage[PREFIX_FILES_NAME_WRAP + ':<worker>:<dir>']` is `'true'`. `DirectoryTree.actionBar.test.tsx`: mock `matchMedia` to force mobile (≤767px), render the tree with a single file row, click the row, assert `role="menu"` with `aria-label="File actions"` appears, X-button closes it, source-row regains focus. Mock `workerRpc.readFile` / `statFile` to a tiny in-memory file. Do **not** test the actual `window.open` call — assert the inline-extension routing logic returns the right branch by extracting the helper as `__test.openOrDownload(path, ext)` if needed, or just leave end-to-end to QA.
- **Audit:** `grep -rn "files-name-wrap-toggle\|File actions" frontend/src/components/tree` — confirm tests reference the production data-testids and ARIA labels.
- **Test gate:** `cd frontend && bun run test -- FilesSection.test && bun run test -- DirectoryTree.actionBar`

---

`techlead_confidence: 78`
- Most uncertain: **T8** (action-bar open-on-tap branching). The existing `TreeNode.toggle` is shared by mobile and desktop, and overriding `onFileOpen` only on mobile/file-rows risks subtle regressions in keyboard parity (e.g. Enter on a file row in a 760-px desktop window that crosses the breakpoint mid-session). Worth a careful manual pass.
- Defer-if-tight: **T11** (vitest behavioural tests). Per spec, e2e is out of scope; the existing `DirectoryTree.windows.test.tsx` covers the structural pieces, and QA's iOS/Android pass in spec §QA catches the real-device behaviour T11 can only approximate.

## A11y checklist

1. Wrap-mode row stays a single focusable target; tab order unchanged.
2. Toggle exposes `aria-pressed` for Truncate/Wrap.
3. Action bar items have `role="menuitem"` in a labelled container.
4. Esc dismisses action bar; focus returns to source row.
5. Ellipsized names keep full filename in accessible name
   (`title` / `aria-label`).
6. Opaque `rightCluster` contrast meets WCAG AA across all row states in
   both themes.

## QA (stub)

- Visual regression at 320 / 375 / 768 / 1280; both themes, both modes.
- iOS Safari + Android Chrome: tap row → action bar; Open-in-new-tab
  inlines `README.md`, downloads `.bin`.
- Desktop: `Shift+F10` still opens menu; toggle reachable via Tab.

### QA verdict

**Date:** 2026-05-14  
**Reviewer:** QA agent  
**Branch:** `feat/ui-openclaw-talk-refresh`

#### Gates

| Gate | Result |
|---|---|
| `bun run typecheck` | PASS — zero errors |
| `bun run lint` | PASS — zero warnings |
| `bun run test` | PASS — 3229 tests across 230 files, all green |

#### Acceptance criteria

| AC | Status | Citation |
|---|---|---|
| AC1: `treeInner` width `100%`, no horizontal scroll | PASS | `DirectoryTree.css.ts:36-38` — `width: '100%'`, `minWidth` removed. No `max-content` anywhere in `/components/tree`. |
| AC2: Truncate mode clips with ellipsis, `title` kept | PASS | `DirectoryTree.tsx:923` — `title={props.node.displayName}` present in both modes. `nodeName` retains `overflow: hidden; text-overflow: ellipsis` from prior pass. |
| AC3: Toggle in `FilesSectionHeaderActions`, icon-only, tooltipped, before `ChevronsDownUp` | PASS | `FilesSection.tsx:113-124` — `<Show when={props.onToggleNameWrap}>` wraps `IconButton` inserted before `ChevronsDownUp` at line 125. |
| AC4: Toggle persists under `PREFIX_FILES_NAME_WRAP` key, default Truncate | PASS | `browserStorage.ts:63`, `FilesSection.tsx:156-177`. Key: `leapmux:files-name-wrap:<workerId>:<workingDir>`. Default `false`. Both re-read and persist effects mirror `showHiddenFiles` pattern with `{ defer: true }`. |
| AC5: Wrap mode: 3-line clamp, chevron+icon top-aligned | PASS | `DirectoryTree.css.ts:69-100` — `WebkitLineClamp: 3`, `alignSelf: 'flex-start'` on `> svg` and `.labelWithStats > svg` inside `nodeWrap`. |
| AC6: `rightCluster` opaque on all 4 row states | PASS | Zebra: `#f9f9f9` / `rgb(20 20 22)` (`global.css.ts:173,238`). Hover (`var(--card)`) and selected (`var(--secondary)`) already opaque. `rightCluster.backgroundColor: 'inherit'` still applies. |
| AC7: `TreeActionBar` on mobile (≤768px), sticky-top, 5 actions + close | PASS | `DirectoryTree.tsx:514-651` — `role="menu" aria-label="File actions"`, sticky via `DirectoryTree.css.ts:235`. Items: ExternalLink, Download, AtSign (conditional), Copy, ClipboardCopy, X. |
| AC8: Open-in-new-tab uses chunked blob, popup-block fallback, URL revoked on pagehide | PASS | `DirectoryTree.tsx:394-427` — `fetchFileBlob` shared, `window.open`, `w === null` → download fallback (`DirectoryTree.tsx:410`), `pagehide` revoke (`DirectoryTree.tsx:416`). |
| AC9: PC right-click / Shift+F10 / ContextMenu key unchanged, no action bar on desktop | PASS | `DirectoryTree.tsx:855-896` — `handleContextMenu` and `handleKeyDown` paths untouched. `isMobile()` guard at line 747 gates action bar. `DropdownMenu.tsx` diff empty — no regressions. |
| AC10: Action bar Tab-reachable; Esc closes + focus restored; `role="menuitem"` | PASS | `DirectoryTree.tsx:540-560` — auto-focus `firstButtonRef`, Esc → `close()`, focus restore via `queueMicrotask(() => el.focus())` at line 1014. All buttons carry `role="menuitem"`. |

#### Specific concerns

- **`treeInner` now `width: 100%`** — CONFIRMED. `DirectoryTree.css.ts:37`. `minWidth` removed (was redundant). No stray `max-content` in `/components/tree`.
- **`--lm-tree-row-zebra-bg` opaque** — CONFIRMED. Light `#f9f9f9` (`global.css.ts:173`), dark `rgb(20 20 22)` (`global.css.ts:238`). No `rgba(` remains on that token.
- **`rightCluster` opaque on all 4 states** — CONFIRMED. Inherits from row background; all 4 states (base=`var(--background)`, zebra=opaque token, hover=`var(--card)`, selected=`var(--secondary)`) are opaque.
- **`nameLayout` prop plumbed** — CONFIRMED. `TreeContextValue.nameLayout` (`DirectoryTree.tsx:141`), `nameLayoutMode()` accessor, applied to both root row (L1381) and child rows (L920).
- **Toggle persists via `PREFIX_FILES_NAME_WRAP`** — CONFIRMED. Key pattern matches spec §4.
- **`TreeActionBar` mobile-only via `useIsMobile()`** — CONFIRMED. `DirectoryTree.tsx:662,747`.
- **Mobile file-row tap → action bar; dir-row still toggles** — CONFIRMED. Guard at `toggle()` L742: only `!props.node.isDir` enters the mobile branch. Dir rows fall through to `doLoad()` normally.
- **PC right-click unchanged** — CONFIRMED. `handleContextMenu` path untouched; `TreeContextMenu` renders at same root location. `DropdownMenu.tsx` diff empty.
- **Keyboard parity `Shift+F10` / `ContextMenu`** — CONFIRMED. `DirectoryTree.tsx:865-873` unchanged.
- **`openFileInNewTab` ext→MIME map** — CONFIRMED. All 12 inline extensions from spec §3 present (`DirectoryTree.tsx:358-380`), plus common images. MIME from `Blob.type` for absent ext not applicable (ext-first detection per spec).
- **ESC + outside-click close with focus restore** — CONFIRMED. `createEffect` installs/removes capture-phase `pointerdown` listener; `onKeyDown` handles Escape; `queueMicrotask(() => el.focus())` restores focus.

#### Regression scan

- `DropdownMenu.tsx`, `sharedTree.css.ts`, `sidebarActions.css.ts` diffs — ALL EMPTY. No regressions.
- `grep "treeInner|max-content" frontend/src/components/tree` — only definition (`DirectoryTree.css.ts:36`) and usage (`DirectoryTree.tsx:1352`). No stray `max-content`.
- `TreeActionBar` — only in `DirectoryTree.tsx` (definition + mount) and `DirectoryTree.actionBar.test.tsx`. Correctly scoped.
- `sidebarActions` consumers (WorkspaceSectionContent, WorkspaceTabTree, WorkerSectionContent) — unchanged; diff empty for `sidebarActions.css.ts`.

#### Visual reasoning

- **Long filename, truncate mode** — `nodeName.minWidth: 0` + `overflow: hidden; text-overflow: ellipsis` clips at right edge of label area. `rightCluster.marginLeft: auto` + `position: sticky; right: 0` pins meta to viewport right. Masking is opaque (inherits `#f9f9f9` on zebra rows). No overflow into meta column.
- **Long filename, wrap mode** — `nodeNameWrap` multi-line clamp (3 lines, 1.35 line-height). Chevron and file icon get `alignSelf: flex-start; marginTop: 2px`. `rightCluster` gets `alignItems: flex-start` so size/time pins to first line.
- **Mobile tap on file** — `isMobile()` true, `openActionBar()` sets signal, `<TreeActionBar>` shows via `<Show when={props.target()}>`. Auto-focus first button.
- **PC right-click** — `handleContextMenu` → `openContextMenuAt` → `setMenuTarget` → `TreeContextMenu` renders at cursor. `DropdownMenu` unchanged.
- **Zebra row meta masking** — opaque `#f9f9f9` / `rgb(20 20 22)` ensures `rightCluster`'s `backgroundColor: inherit` resolves to a solid colour, not a semi-transparent overlay that bleeds long text through.

#### Items needing rework

1. **`createEffect` adds `pointerdown` listener without removing previous** (`DirectoryTree.tsx:540-549`): If `props.target()` transitions non-null → non-null (e.g., tapping a second file while bar is open), the listener is added twice. Correct fix: call `removeEventListener` at the top of the `if` branch before re-adding, or use SolidJS `onCleanup` inside the effect. Low severity (current UX requires closing before re-opening), but is a latent double-fire risk.

2. **Root-row wrap mode does not use `nodeNameMutedWrap` for hidden state** (`DirectoryTree.tsx:1381`): The root directory is never hidden, so this is benign, but it is a minor inconsistency with child row logic (which correctly applies `nodeNameMutedWrap` on hidden nodes in wrap mode).

3. **`TreeActionBar` test does not verify focus restoration to source row** (`DirectoryTree.actionBar.test.tsx:102-107`): The test asserts bar unmounts on X-click but does not call `expect(row).toHaveFocus()` after close. jsdom supports `focus()` tracking, so this assertion is feasible. Currently the focus-restore contract is untested in automation.

4. **`createEffect` pointerdown listener: re-add on re-open** (same as item 1 — minor). In the current flow a user can only re-open by closing first (which sets target to null, removing the listener). So real-world impact is zero, but worth a cleanup note for future refactors.

**Overall verdict: PASS with minor notes**  
All 10 ACs pass. Three gates (typecheck, lint, test) are green. Two benign-but-noteworthy code issues (#1/#4 are the same root cause) and one missing test assertion (#3) noted above. No blockers.

### PM verdict

**Date:** 2026-05-14
**Reviewer:** PM agent
**Branch:** `feat/ui-openclaw-talk-refresh`

#### Scope vs. user's 8 points (verified by `git diff HEAD`)

Files touched are tightly scoped to the spec: `global.css.ts` (zebra token),
`DirectoryTree.css.ts` (treeInner, wrap classes, action-bar styles),
`DirectoryTree.tsx` (nameLayout, openFileInNewTab, TreeActionBar, mobile tap
routing), `FilesSection.tsx` (toggle + persistence), `browserStorage.ts` (new
prefix), `buildSectionDef.tsx` (handle wiring), plus two new test files. No
unrelated drive-by changes. Diff is on-spec.

#### Per-requirement satisfaction

| # | User ask (KR) | Verdict | Note |
|---|---|---|---|
| 1 | Filename overflows size/time text | SATISFIED | Truncate mode keeps `overflow:hidden; text-overflow:ellipsis`; sticky `rightCluster` now opaque (zebra token de-rgba'd) so meta no longer bleeds through. Visual masking is the actual root cause and it is fixed. |
| 2 | Sidebar has horizontal scroll | SATISFIED | `treeInner.width: max-content` → `100%`; `minWidth` dropped. Confirmed no other `max-content` in `/components/tree`. |
| 3 | Cut + "…" within column area | SATISFIED | Default mode preserves single-line ellipsis; full name on `title` attribute (a11y preserved). |
| 4 | Wrap to 2+ lines is also OK | SATISFIED | 3-line `-webkit-line-clamp`, top-aligned chevron/icons, meta pinned to first line. Slightly exceeds ask (user said "2줄 이상", chose 3). |
| 5 | Header toggle option | SATISFIED | `IconButton` in `FilesSectionHeaderActions` before `ChevronsDownUp`, `WrapText`/`AlignJustify`, `aria-pressed`, tooltipped, persisted per-(worker,workingDir) for 7d. |
| 6 | Fix on both mobile and PC | SATISFIED | Truncate + opaque-zebra fixes apply at all viewports. Wrap toggle works on PC too. Right-click / `Shift+F10` / `ContextMenu` paths untouched (QA confirmed empty `DropdownMenu` diff). |
| 7 | Mobile tap → menu pinned at top with Download | SATISFIED | `TreeActionBar` is `position: sticky; top: 0` inside `.tree`, mobile-gated via `useIsMobile()` (≤767px). Download present; 5 actions total. Auto-focus first button, Esc closes, outside-click closes, focus restored to source row. |
| 8 | "가장 필요": download → open in new tab | SATISFIED with caveat | `openFileInNewTab` ships with frozen 20-ext inline map (md/txt/log/csv/json/yaml/yml/toml/xml/html/htm/svg + image/* + pdf), popup-block fallback to download, `pagehide` URL revoke. Caveat in Risks below. |

#### Weighted score (out of 100)

Weights — #1,#2,#3 = 15 each (must-fix layout, 45); #5 = 10; #4 = 8; #7 = 12; #8 = 15; #6 = 10. Total = 100.

- #1 (15) × 1.00 = 15.0
- #2 (15) × 1.00 = 15.0
- #3 (15) × 1.00 = 15.0
- #4 (8)  × 1.00 = 8.0
- #5 (10) × 0.95 = 9.5  (icon-only — discoverability is the only nick; tooltip + `aria-pressed` mitigate)
- #6 (10) × 1.00 = 10.0
- #7 (12) × 0.95 = 11.4 (sticky-top inside `.tree` is correct; double-listener latent risk drops 0.05)
- #8 (15) × 0.90 = 13.5 (works, but iOS Safari blob-URL inline rendering is unverified — see risk #2)

**pm_score: 97**

#### User-perceptible risks

1. **Wrap-mode meta-column alignment** — LOW. Spec §5 chose top-alignment for size/time deliberately; with 3-line names this leaves visible vertical whitespace beside meta, which is unusual but consistent and not a regression vs. truncate mode (default). Acceptable.
2. **iOS Safari "Open in new tab"** — MEDIUM. Mobile Safari is historically hostile to `window.open(blobURL, '_blank')`: it sometimes opens a tab that immediately downloads, sometimes blocks the popup, sometimes opens a blank tab. The code has a popup-block fallback (`w === null` → download) but does **not** detect "opened but failed to render" — for unsupported MIMEs on iOS, users may see a blank tab. The download fallback covers binary/unknown ext correctly. This is the user's "가장 필요" item, so it warrants a real-device pass; spec §QA already calls this out.
3. **Toggle discoverability** — LOW. Icon-only with `title` tooltip; no first-run hint or label. A user not hovering the icon may not realize the option exists. `aria-pressed` covers a11y. If discoverability complaints surface, a one-time tooltip or label-on-hover-row could be added later — not a ship blocker.
4. **QA-flagged double-listener (rework #1/#4)** — NOT user-perceptible in current flow. Re-opening the bar requires closing first (which nulls the target and removes the listener via the else-branch). The risk only materializes if a future refactor allows non-null→non-null target transitions. Worth cleaning up but does not affect this ship.
5. **Mobile file-row keyboard parity** — LOW. On a mobile-width desktop window (≤767px), pressing Enter on a file row now opens the action bar instead of firing `onFileOpen`. TechLead flagged this at confidence 78. For real touch users this is correct; for the narrow-window desktop edge case it is a slight behaviour change but defensible — user can still use the toggle/keyboard escape.
6. **Wrap meta column at narrow widths** — LOW. `nodeMeta` is gated by a 240px container query (unchanged), so the meta numbers only appear when there is room. No layout collision risk.

#### Decision

**SHIP AS-IS.** All 8 user points are addressed; the layout bugs (#1/#2/#3 — the screenshot's primary complaint) are decisively fixed at the root cause (opaque zebra + drop max-content), not papered over. The two QA-noted code-hygiene items (double-listener cleanup, focus-restore test assertion) are latent / cosmetic and do not affect user experience. The only user-perceptible risk that warrants follow-up is iOS Safari open-in-new-tab behaviour on #8; the download fallback ensures the worst case is "user gets a downloaded file" rather than "broken." Recommend real-device verification post-ship; not a gate.

**3-line summary:**
1. Implementation is tightly scoped, all 10 ACs pass, and the three must-fix layout bugs (#1/#2/#3) are solved at root cause.
2. #8 (Open-in-new-tab — user's "가장 필요") ships with a popup-block download fallback but iOS Safari inline rendering is unverified; download is the safe degraded path.
3. Ship now; track iOS real-device pass for #8 and the double-listener cleanup as follow-ups.

### Dev notes

- **Files modified:**
  - `frontend/src/styles/global.css.ts` — T1: zebra token → opaque
    `#f9f9f9` (light) / `rgb(20 20 22)` (dark).
  - `frontend/src/components/tree/DirectoryTree.css.ts` — T2: `treeInner`
    width `max-content` → `100%`; T4: `nodeNameWrap`,
    `nodeNameMutedWrap`, `nodeWrap` + globalStyle rules for top-aligned
    chevron/icons and `rightCluster` in wrap mode; T8: `actionBar`,
    `actionBarButton`, `actionBarClose`, `actionBarLiveRegion`.
  - `frontend/src/lib/browserStorage.ts` — T3: new
    `PREFIX_FILES_NAME_WRAP` constant + 7d TTL entry.
  - `frontend/src/components/tree/DirectoryTree.tsx` — T5/T7/T8/T9:
    `nameLayout` prop, `TreeContextValue.nameLayout` + `openActionBar`,
    `fetchFileBlob` extraction, `openFileInNewTab` (frozen ext→MIME
    map, popup-block fallback, `pagehide` revoke), `TreeActionBar`
    component (sticky-top, role=menu, Esc + outside-click close,
    focus restore via `nodeRef`), mobile tap routing in `TreeNode.toggle`.
  - `frontend/src/components/tree/FilesSection.tsx` — T6: `wrapName`
    signal w/ persistence, `nameWrap` / `toggleNameWrap` on
    `FilesSectionHandle`, header-actions toggle (`WrapText`/`AlignJustify`,
    `aria-pressed`, `data-testid="files-name-wrap-toggle"`); passes
    `nameLayout` down to `DirectoryTree`.
  - `frontend/src/components/shell/buildSectionDef.tsx` — wires the
    new header-action props through the section handle.
  - `frontend/src/components/tree/FilesSection.test.tsx` — new (T11).
  - `frontend/src/components/tree/DirectoryTree.actionBar.test.tsx` —
    new (T11).
- **Defer / punt:**
  - Did **not** add an exported `srOnly` to `~/styles/shared.css`;
    instead added a local `actionBarLiveRegion` style in
    `DirectoryTree.css.ts` (kept the change scoped to this feature).
  - Did **not** end-to-end test `window.open` / `URL.createObjectURL`
    in jsdom — T11 covers the open-on-tap routing + close. Real-device
    inline-vs-download routing left to QA per spec §QA.
  - Did **not** add a full focus trap inside the action bar (per
    TechLead T9 note: outside-click dismissal + ARIA menu semantics +
    Esc-to-close suffice).
- **Contrast / sizing nudges:** none beyond what the spec already
  specified. The opaque zebra token landed exactly at the
  pre-composited values from Designer §6.
- `dev_confidence: 86`

## Open questions (flag, do not decide)

- Mobile breakpoint: 640 vs 768; media-query vs container-query on
  `.container` (already `containerType: inline-size`).
- Action bar location: sticky-top of `.tree`, under section header, or
  bottom sheet.
- Download vs Open in new tab: both, or auto-route by MIME?
- Persistence: `localStorage` (proposed) vs Oat preference store vs
  `sessionStorage`.
- Wrap mode + `tabular-nums` meta alignment for 2–3 line rows: top vs
  center.

---

`pm_confidence: 72`
Core uncertainty: whether **Open in new tab** can reliably inline-render
worker-streamed blobs on mobile Safari + Android Chrome without a served
Content-Type — may force download fallback for most MIMEs.
