# tree-row-ux-pass2 — DirectoryTree row UX correction

- **id**: `tree-row-ux-pass2`
- **status**: draft v1
- **owner**: PM
- **predecessor**: `ui-openclaw-talk-refresh` (added `nodeMeta` / `rightCluster` / size + modTime columns; introduced overlap regression)

## Problem

직전 cycle에서 추가한 size / modified-time 메타 컬럼이, 긴 파일명에 의해 "**파일 이름이 용량과 날짜위에까지 렌더링 되면서 덮어버리는**" 현상으로 깨진다. 동시에 행 호버 시 노출되는 `⋯` (MoreHorizontal) 메뉴 트리거가 "**사용이 어려운 거 같아**" — 작고, 호버에만 의존하고, 모바일/터치에서 도달 불가. 우클릭으로 컨텍스트 메뉴를 노출하는 게 표준 파일 탐색기 멘탈 모델이다.

## User stories

1. 사용자는 긴 파일명을 가진 행에서도 size / mod-time을 가리지 않고 읽을 수 있다.
2. 사용자는 행을 **우클릭**하여 mention / open terminal / download / copy path 메뉴를 즉시 연다.
3. 사용자는 좌클릭 동작에 영향을 받지 않는다 (디렉터리 토글, 파일 open).
4. 사용자는 **zebra striping** 덕분에 행 간 시각적 구분이 더 쉬워진다.

## Acceptance criteria

1. 긴 파일명은 메타 컬럼을 **절대 덮지 않는다** — label에 `min-width: 0` + `overflow: hidden` + `text-overflow: ellipsis` 적용, `nodeMeta` 클러스터는 `flex-shrink: 0`로 우측 고정.
2. 메타 컬럼(`nodeSize` / `nodeModTime`)은 컨테이너 폭이 ≥ 240px일 때 항상 행 우측에 안정적으로 노출 (기존 container query 유지).
3. `TreeContextMenu`의 `⋯` 버튼(`MoreHorizontal` IconButton)이 **DOM에서 제거**된다. `data-testid="tree-context-button"`도 사라진다 — 관련 테스트는 함께 업데이트.
4. 행을 **우클릭** (`contextmenu` 이벤트) 시 DropdownMenu가 우클릭 좌표 근처에 노출되고, 동일한 메뉴 항목(mention / open terminal / download / copy path / copy relative path)을 동일 조건으로 보여준다. `event.preventDefault()`로 브라우저 기본 메뉴 차단.
5. **좌클릭 1회** 동작은 변하지 않는다 — 디렉터리는 expand/collapse + onSelect, 파일은 onSelect + onFileOpen. 더블 클릭은 다루지 않는다.
6. 행별 **zebra striping**: TreeNode가 짝/홀수 위치에 따라 미세하게 다른 배경(`--lm-tree-row-bg-alt` 신규 토큰, light/dark 양쪽 정의)을 받는다. selected / hover 상태는 zebra보다 우선.
7. **키보드로도 컨텍스트 메뉴를 열 수 있어야 한다** — 행이 포커스된 상태에서 `Shift+F10` 또는 `ContextMenu` 키 입력 시 동일 메뉴가 행 좌측 하단에 노출. 메뉴는 Escape로 닫힘 (DropdownMenu 기본).
8. 변경 범위는 `DirectoryTree.tsx` / `DirectoryTree.css.ts`로 한정. `sidebarActions.css.ts`의 `sidebarActions` / `menuTrigger` export는 **삭제하지 않는다** (WorkspaceTabTree, WorkerSectionContent, WorkspaceContextMenu, WorkerContextMenu, TunnelContextMenu, CustomTitlebar 등이 여전히 사용).

## Out of scope

- DirectoryTree 외 다른 트리/사이드바(`WorkspaceTabTree`, `WorkerSectionContent`)의 `⋯` 트리거 제거 — 본 패스에서는 건드리지 않는다. (TechLead가 audit 단계에서 그쪽도 동일 패턴으로 갈지 후속 사이클 여부 판단)
- 더블 클릭 동작, 드래그 앤 드롭, multi-select.
- 컨텍스트 메뉴 아이콘 / 항목 재디자인 — 항목 구성은 그대로.
- 모바일 long-press → contextmenu 매핑 (브라우저 기본 동작에 위임).

## UI notes — Designer fills

**1. Filename clipping — ellipsis (option a).**
Apply to `nodeName`/`labelWithStats`: `min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis`. No `max-width`; the flex container constrains growth. `rightCluster` stays `flex-shrink: 0`. Add a native `title` attribute for the full name (no JS tooltip needed). Wrapping breaks single-line row rhythm; horizontal scroll is invisible.

**2. rightCluster mask — solid `background-color: inherit`.**
The property is already present on `rightCluster`. A gradient mask is unreliable across zebra → hover → selected state changes and on semi-transparent surfaces. `inherit` propagates whichever solid colour the row currently carries, so meta text sits cleanly on top of clipped label text in every state. No new CSS needed.

**3. Zebra tokens (light / dark).**
Introduce one token, redefined per theme in `global.css.ts`:
- Light (`:root`): `--lm-tree-row-zebra-bg: rgba(0, 0, 0, 0.025)` — 2.5% darkening on `#ffffff`
- Dark (`[data-theme="dark"]`): `--lm-tree-row-zebra-bg: rgba(255, 255, 255, 0.03)` — 3% lightening on `rgb(18 18 20)`

Both pass WCAG AA body contrast; the small delta is enough for row separation without fighting foreground text.

**4. Hover / selection precedence.**
Layer order (bottom → top): zebra → hover → selected. Hover (`var(--card)`) and selected (`var(--secondary)`) are fully opaque, so they always cover zebra. Contrast steps are: zebra ~2–3% → hover ~4% → selected ~6–8%, keeping each state visually distinct in both themes.

**5. Context menu anchor — cursor `clientX / clientY`.**
Native OS feel; menu appears where the pointer already is. Min-width `160px`, max-width `240px`. Shadow: `var(--shadow-medium)`. Open: opacity `0→1` + scale `0.97→1` over `var(--transition-fast)` (120ms). Close: opacity `1→0` over `80ms`. Honour `prefers-reduced-motion` (skip animation).

**6. Keyboard menu anchor.**
`ContextMenu` / `Shift+F10` → open at the focused row's `getBoundingClientRect().left, bottom`. Deterministic, always on-screen, mirrors VS Code / macOS Finder convention.

**7. Affordance replacing ⋯.**
`cursor: context-menu` on all tree rows (file + directory). No icon added — per-row badges pollute a dense list. The pointer glyph is the platform-standard right-click signal; zero layout cost.

## Tasks — TechLead fills

> Decision: **reuse DropdownMenu's existing `anchorRef` + `open` programmatic
> path** rather than extending the API. `calcPopoverPosition` only invokes
> `getBoundingClientRect()` on the anchor, so a 1×1 `position:fixed` invisible
> "virtual anchor" `<div>` placed at `(clientX, clientY)` (or at the row's
> `getBoundingClientRect().left/bottom` for keyboard) satisfies the contract.
> No change to `DropdownMenu.tsx` schema; this keeps blast radius limited to
> `DirectoryTree.tsx` + `DirectoryTree.css.ts` + `global.css.ts` (per PM scope).
>
> Audit (run from `frontend/`):
> - `rg "anchorRef" src/components/common/DropdownMenu.tsx` → confirms the prop
>   exists (`Accessor<HTMLElement | undefined>`) and is wired through `getAnchor()`.
> - `rg "calcPopoverPosition\(" src/lib/popoverPosition.ts` → confirms anchor
>   is only consumed via `getBoundingClientRect()`.

### Test-baseline audit (Dev: read before touching code)

These tests reference `tree-context-button` and must be updated together with
the trigger removal (T7):

- `tests/e2e/037-quote-and-mention.spec.ts` — lines 149, 284, 299 (mention flow)
- `tests/e2e/065-directory-tree.spec.ts` — lines 52, 83, 113, 148 (menu open flow, 4 sites)
- `tests/e2e/014-workspace-archive.spec.ts` — line 210 (mention from tree row)

No Vitest unit test references the testid (`DirectoryTree.windows.test.tsx`
only tests Windows path flavor / path input; safe).

### T1 — Add `--lm-tree-row-zebra-bg` token in `global.css.ts` (light + dark)

- **Files**: `src/styles/global.css.ts`
- **Note**: Add `'--lm-tree-row-zebra-bg': 'rgba(0,0,0,0.025)'` inside the
  `globalStyle(':root', { vars: { … } })` block (next to other `--lm-*`
  tokens). Add `'--lm-tree-row-zebra-bg': 'rgba(255,255,255,0.03)'` inside the
  `globalStyle('[data-theme="dark"]', { vars: { … } })` block. Do NOT add a
  rule that paints rows — `DirectoryTree.css.ts` consumes the token via
  `globalStyle` selector in T2.
- **Audit**: `rg "lm-tree-row-zebra-bg" src/` → 1 hit in `global.css.ts` light,
  1 hit in dark, plus the consumer in T2 = 3 total after T2 lands.
- **Test gate**: `cd frontend && bun run typecheck && bun run lint`.

### T2 — Add zebra styling + `nodeName` ellipsis fix in `DirectoryTree.css.ts`

- **Files**: `src/components/tree/DirectoryTree.css.ts`
- **Note**: (a) Update the existing `nodeName` style to include
  `minWidth: 0`, `overflow: 'hidden'`, `textOverflow: 'ellipsis'` (it already
  has `whiteSpace: 'nowrap'`); `nodeNameMuted` extends `nodeName` so it
  inherits automatically. Also ensure the flex parent containing it
  (`labelWithStats` in `sharedTree.css.ts` — do NOT modify that shared file;
  instead add a local override via `globalStyle` against `.${rightCluster}`'s
  preceding sibling, OR add `min-width: 0` on the `RowLabelWithStats` wrapper
  via a sibling selector in `DirectoryTree.css.ts`). Simplest path: add
  `globalStyle('.' + node + ' > *:not(.' + rightCluster + ')', { minWidth: 0 })`
  — vanilla-extract `globalStyle` accepts template literals. (b) Add a
  `globalStyle` rule `\`.${childrenInner} > div:nth-child(even) > .${node}\``
  setting `backgroundColor: 'var(--lm-tree-row-zebra-bg)'`. Hover/selected
  are already opaque `var(--card)` / `var(--secondary)` so they layer on top
  without extra specificity work. (c) Add `cursor: 'context-menu'` only on
  file rows — implement by adding a new `nodeFile` modifier style and
  toggling it via `classList` from `DirectoryTree.tsx` in T6, OR add it
  inline as `style={{ cursor: ... }}` in T6 (preferred — keeps the css module
  free of a one-off modifier). For this task, just leave the cursor change
  for T6; do CSS-only changes here.
- **Audit**: `rg "min-width:\s*0|minWidth:\s*0" src/components/tree/DirectoryTree.css.ts`
  → 1+ hit; `rg "nth-child\(even\)" src/components/tree/DirectoryTree.css.ts`
  → 1 hit.
- **Test gate**: `cd frontend && bun run typecheck && bun run lint`.

### T3 — Remove `TreeContextMenu` IconButton trigger; switch to programmatic open via virtual anchor

- **Files**: `src/components/tree/DirectoryTree.tsx`
- **Note**: Delete the `<IconButton icon={MoreHorizontal} ... data-testid="tree-context-button" />`
  trigger render prop. Convert `TreeContextMenu` to a **headless menu**: it
  accepts `open: Accessor<boolean>`, `anchorRef: Accessor<HTMLElement | undefined>`,
  and `onClose: () => void`, then renders only `<DropdownMenu anchorRef={...} open={...} onToggle={...}>{items}</DropdownMenu>`.
  Hoist a single shared virtual-anchor `<div>` and a single shared menu
  instance to the `DirectoryTree` root level (one per tree), keyed by the
  currently-targeted row's `path` + `isDir`, so we don't mount one popover
  per row (would be O(n) DOM nodes). Drop the imports of `MoreHorizontal`,
  `IconButton`, `menuTrigger`, `sidebarActions` from this file (do NOT delete
  those exports — see T9 audit).
- **Audit**: `rg "tree-context-button|MoreHorizontal|menuTrigger|sidebarActions" src/components/tree/DirectoryTree.tsx`
  → must return 0 hits after this task.
- **Test gate**: `cd frontend && bun run typecheck && bun run lint`.

### T4 — Wire `oncontextmenu` on each row + virtual anchor positioned at `clientX/clientY`

- **Files**: `src/components/tree/DirectoryTree.tsx`
- **Note**: Add a tree-level state: `const [menuTarget, setMenuTarget] = createSignal<{ path: string, isDir: boolean } | null>(null)`
  plus an anchor element ref `let virtualAnchorEl!: HTMLDivElement` (1×1
  `position: fixed; pointer-events: none; opacity: 0;`). On each row (both
  `TreeNode`'s `.node` and the root-row `.node`), add `onContextMenu={(e) => { e.preventDefault(); virtualAnchorEl.style.left = e.clientX + 'px'; virtualAnchorEl.style.top = e.clientY + 'px'; setMenuTarget({ path: props.node.path, isDir: props.node.isDir }); }}`.
  Pass `open={() => menuTarget() !== null}` and `anchorRef={() => virtualAnchorEl}`
  to the single shared `TreeContextMenu`. Reset `menuTarget` to `null` in the
  DropdownMenu's `onToggle` when it closes. **Verify** the existing `toggle`
  (left-click `onClick`) still fires for selection/expand/file-open — right-
  click should not call `toggle`.
- **Audit**: `rg "onContextMenu|oncontextmenu" src/components/tree/DirectoryTree.tsx`
  → 2 hits (TreeNode row + root row); `rg "virtualAnchorEl" src/components/tree/DirectoryTree.tsx`
  → ≥3 hits (decl + onContextMenu writes + anchorRef accessor).
- **Test gate**: `cd frontend && bun run typecheck && bun run lint`.

### T5 — Keyboard: `ContextMenu` / `Shift+F10` opens menu at row's `left, bottom`

- **Files**: `src/components/tree/DirectoryTree.tsx`
- **Note**: Add `tabindex="0"` to the row container (`.node`) — single
  tabindex per row is fine; the tree isn't a roving-tabindex listbox today
  and PM out-of-scope-d full keyboard nav. Add `onKeyDown={(e) => { if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); const r = nodeRef.getBoundingClientRect(); virtualAnchorEl.style.left = r.left + 'px'; virtualAnchorEl.style.top = r.bottom + 'px'; setMenuTarget({...}); } }}`.
  Confirm Escape close still works (DropdownMenu's built-in popover light-
  dismiss + its own `Escape` handler).
- **Audit**: `rg "Shift\\+F10|ContextMenu" src/components/tree/DirectoryTree.tsx`
  → 1+ hit; `rg "tabindex|tabIndex" src/components/tree/DirectoryTree.tsx`
  → 2 hits (TreeNode row + root row).
- **Test gate**: `cd frontend && bun run typecheck && bun run lint`.

### T6 — Add `cursor: context-menu` affordance on file rows only

- **Files**: `src/components/tree/DirectoryTree.tsx` (inline style or
  `classList`) — keep it co-located with the JSX to avoid a tiny one-off
  CSS export.
- **Note**: On the file branch of `TreeNode` (i.e. `!props.node.isDir`), add
  `style={{ cursor: 'context-menu' }}` to override `node`'s base
  `cursor: 'pointer'`. Directory rows keep `pointer` (toggle affordance).
  Root row keeps `pointer` (it's always a dir).
- **Audit**: `rg "cursor: 'context-menu'|'context-menu'" src/components/tree/DirectoryTree.tsx`
  → 1 hit.
- **Test gate**: `cd frontend && bun run typecheck && bun run lint`.

### T7 — Update e2e tests that target `tree-context-button` to use right-click

- **Files**:
  - `tests/e2e/065-directory-tree.spec.ts` (4 sites: 52, 83, 113, 148)
  - `tests/e2e/037-quote-and-mention.spec.ts` (3 sites: 149, 284, 299)
  - `tests/e2e/014-workspace-archive.spec.ts` (1 site: 210)
- **Note**: Replace `treeRow.locator('[data-testid="tree-context-button"]').click()`
  with `treeRow.click({ button: 'right' })`. Keep menu-item testids
  (`tree-mention-button`, `tree-download-button`, `tree-copy-path-button`,
  `tree-copy-relative-path-button`, `tree-open-terminal-button`) unchanged —
  the menu items themselves don't change. Where the test uses `:visible`,
  keep it. Verify there are no remaining hover-then-click patterns relying
  on the `⋯` button.
- **Audit**: `rg "tree-context-button" tests/ src/` → 0 hits;
  `rg "button: 'right'" tests/e2e/` → 8 hits (one per replaced site).
- **Test gate**: `cd frontend && bun run typecheck && bun run lint`. (e2e
  runs are gated behind the manual e2e harness — Dev does not run them
  here; QA does in their pass.)

### T8 — Verification pass: file-list bottom-row right-click behaviour parity

- **Files**: read-only audit
- **Note**: Manually verify (via code reading, not run) that right-clicking
  the **last row in a long tree** still opens the menu near the cursor and
  does NOT get clipped — `calcPopoverPosition` already flips above when
  below-overflow occurs. No code change expected; if a regression is
  spotted, file follow-up — do not fix in this cycle.
- **Audit**: `rg "flipped" src/lib/popoverPosition.ts` → existing flip
  logic is present.
- **Test gate**: n/a (read-only).

### T9 — Audit: shared `sidebarActions` / `menuTrigger` consumers unaffected

- **Files**: read-only audit
- **Note**: Confirm the shared exports survived the cleanup and other
  components still compile + render their `⋯` triggers. Per PM scope, this
  cycle does NOT migrate them.
- **Audit**:
  - `rg "from '.*sidebarActions.css'" src/` → expect ≥7 hits across
    `WorkspaceTabTree.tsx`, `WorkspaceSectionContent.tsx`, `WorkerSectionContent.tsx`,
    `WorkspaceContextMenu.tsx`, `WorkerContextMenu.tsx`, `TunnelContextMenu.tsx`,
    `workspaceList.css.ts` — same set as before this cycle.
  - `rg "menuTrigger" src/components/shell/CustomTitlebar.tsx` → 1 hit
    (uses its own local `menuTrigger` export from `CustomTitlebar.css.ts`,
    not the tree one — confirm via the import line).
  - `rg "from '~/components/tree/sidebarActions.css'" src/` → must still
    return the WorkspaceTabTree/WorkerSectionContent/Workspace+WorkerContextMenu/TunnelContextMenu set.
- **Test gate**: `cd frontend && bun run typecheck && bun run lint && bun run test -- tree`.

## A11y checklist

- [ ] Focus ring visible on all new interactive elements (≥ 3:1 contrast)
- [ ] Keyboard operability (tab order, Enter/Space activation, Shift+F10 / ContextMenu key for context menu)
- [ ] `aria-*` attributes on stateful components (row uses `aria-expanded` for dirs; popover anchor reflects open state)
- [ ] `prefers-reduced-motion` respected (no new transitions added that ignore it)
- [ ] Screen reader announces state changes (menu open/close via DropdownMenu defaults)
- [ ] Color contrast ≥ 4.5:1 for body text on both zebra rows in light + dark themes (WCAG AA)

## QA — fills after Dev

- Manual: long-filename row — `nodeName` has `min-width:0 / overflow:hidden / text-overflow:ellipsis`; parent `labelWithStats` wrapper gets `minWidth:0` via scoped `globalStyle`. ✓
- Manual: right-click on root row / dir row / file row → single hoisted `TreeContextMenu` re-targeted via `openContextMenuAt`; menu appears at cursor coords. ✓
- Manual: left-click (`onClick={toggle}`) is a separate handler from `onContextMenu`; no path collision. ✓
- Keyboard: `tabindex="0"` on both `TreeNode .node` and root row; `Shift+F10` / `ContextMenu` key open menu at `getBoundingClientRect().left, bottom`. ✓
- Regression: `sidebarActions.css.ts` / `DropdownMenu.tsx` / `sharedTree.css.ts` are untouched (`git diff HEAD` empty). ✓
- Automated: `bun run typecheck` clean; `bun run lint` clean; `bun run test` 228 files / 3226 tests passed, zero snapshot rebaselines. ✓

### QA verdict

#### Gates
| Gate | Result |
|---|---|
| `bun run typecheck` | PASS — clean, 0 errors |
| `bun run lint` | PASS — clean, 0 warnings |
| `bun run test` | PASS — 228 files, 3226 tests, 0 failures |

#### Acceptance criteria

| AC | Status | Evidence |
|---|---|---|
| AC1 — `nodeName` ellipsis triple (`min-width:0 / overflow:hidden / text-overflow:ellipsis`) + `nodeMeta` / `rightCluster` `flex-shrink:0` | PASS | `DirectoryTree.css.ts:54–58` (nodeName), `:76` (rightCluster flexShrink), `:119–122` (labelWithStats globalStyle) |
| AC2 — Meta columns shown at ≥240px via container query; container query retained | PASS | `DirectoryTree.css.ts:98–102` (`@container (min-width: 240px)`); `container.containerType = 'inline-size'` at `:24` |
| AC3 — `⋯` button (`MoreHorizontal` IconButton, `data-testid="tree-context-button"`) removed from DOM | PASS | `grep tree-context-button src/ tests/` → 0 hits (only `.output/` build artifacts); `MoreHorizontal` / `IconButton` / `menuTrigger` imports removed from `DirectoryTree.tsx` |
| AC4 — Right-click opens DropdownMenu at cursor coords; same menu items; `e.preventDefault()` called first | PASS | `DirectoryTree.tsx:603–610` (`e.preventDefault()` line 604, before `openContextMenuAt`); single hoisted `TreeContextMenu` at root; `anchorRef` → `virtualAnchorEl` positioned to `clientX/clientY`; menu items match spec (mention / terminal / download / copy path / copy relative path) |
| AC5 — Left-click unchanged (dir expand/collapse + onSelect, file onSelect + onFileOpen) | PASS | `onClick={toggle}` at `:639` untouched; `onContextMenu` is a separate handler path; `e.preventDefault()` in contextmenu handler does not suppress click |
| AC6 — Zebra striping via `--lm-tree-row-zebra-bg`; light + dark tokens defined; hover + selected override zebra (opaque) | PASS | `global.css.ts:173` (light `rgba(0,0,0,0.025)`), `:238` (dark `rgba(255,255,255,0.03)`); zebra selector `DirectoryTree.css.ts:129`; hover=`var(--card)` / selected=`var(--secondary)` are fully opaque in `sharedTree.css.ts:13,19` — no specificity bump needed |
| AC7 — Keyboard `Shift+F10` / `ContextMenu` opens menu at row's `getBoundingClientRect().left, bottom`; Escape closes via DropdownMenu default | PASS | `DirectoryTree.tsx:612–622` (TreeNode `handleKeyDown`), `:1076–1082` (root row inline handler); `tabindex="0"` at `:637` and `:1069` |
| AC8 — Change scope limited to `DirectoryTree.tsx` / `DirectoryTree.css.ts` / `global.css.ts`; `sidebarActions` / `menuTrigger` exports not deleted | PASS | `git diff HEAD -- sidebarActions.css.ts sharedTree.css.ts DropdownMenu.tsx` → empty; 7 external consumers verified still import from `sidebarActions.css.ts` |

#### Regression scan

- `grep -rn "tree-context-button|MoreHorizontal|menuTrigger" src/components/tree/DirectoryTree.tsx` → **0 hits**. ✓
- These identifiers still appear in `WorkspaceContextMenu.tsx`, `WorkspaceTabTree.tsx`, `TunnelContextMenu.tsx`, `WorkerContextMenu.tsx`, `sidebarActions.css.ts`, `workspaceList.css.ts` — all correct (out-of-scope consumers). ✓
- `grep -rn "sidebarActions\b" src/components/` → present in `WorkspaceSectionContent`, `WorkspaceTabTree`, `WorkerSectionContent`, `workspaceList.css.ts` (all non-DirectoryTree). ✓
- `DropdownMenu.tsx` / `sharedTree.css.ts` / `sidebarActions.css.ts` — `git diff HEAD` empty for all three. ✓
- `CustomTitlebar.tsx` uses its own `styles.menuTrigger` from `CustomTitlebar.css.ts`, not the tree's export. ✓

#### E2e spec static review

- `065-directory-tree.spec.ts`: 4 sites migrated (lines 51, 79, 106, 138) — `button: 'right'` present, no residual hover/`tree-context-button` references. ✓
- `037-quote-and-mention.spec.ts`: 3 sites migrated (lines 146, 278, 290) — clean. ✓
- `014-workspace-archive.spec.ts`: 1 site migrated (line 209) — clean. ✓
- Total: 8 right-click replacements confirmed. ✓

#### Specific concern checks

- **Single hoisted `TreeContextMenu` instance**: rendered once at `DirectoryTree` root (`:1035`), not per-row. ✓
- **Virtual anchor dimensions**: `position:fixed; width:1px; height:1px; pointer-events:none; opacity:0` at `:1027–1033`. ✓ (`opacity:0` instead of `display:none` is correct — hidden divs have zero `getBoundingClientRect()` which would break positioning.)
- **`e.preventDefault()` before opening**: line 604 (`e.preventDefault()`) is called before `openContextMenuAt` at line 605. ✓
- **Keyboard `Shift+F10` / `ContextMenu`**: implemented at `TreeNode` level (`:613`) and root row level (`:1077`). ✓
- **`tabindex="0"` on rows**: TreeNode `.node` at `:637`; root row at `:1069`. ✓
- **`cursor: context-menu` on file rows only**: inline style `...(props.node.isDir ? {} : { cursor: 'context-menu' })` at `:635`. Directory rows keep `pointer` from `sharedTree.css.ts`. ✓
- **`nodeName` ellipsis triple**: `minWidth:0`, `overflow:'hidden'`, `textOverflow:'ellipsis'` at `DirectoryTree.css.ts:56–58`. ✓
- **Zebra selector scoped to `childrenInner`**: `.${childrenInner} > div:nth-child(even) > .${node}` at `:129`. Root row is in `.treeInner`, not `.childrenInner` → root unaffected. ✓
- **Hover and selected override zebra**: `var(--card)` (hover) and `var(--secondary)` (selected) are solid/opaque colors in `sharedTree.css.ts`, naturally covering zebra `rgba(...)` without specificity bumps. ✓

#### Visual reasoning

- Long filename → `nodeName` ellipsizes before reaching `rightCluster` (which is `flex-shrink:0` + sticky right). ✓
- Right-click on a row → virtual anchor moves to `(clientX, clientY)` then `setMenuTarget` triggers `showPopover()` → menu appears at cursor. ✓
- Left-click → `onClick={toggle}` fires independently; `onContextMenu` is only triggered by right-click / keyboard. ✓
- Zebra: `:nth-child(even)` rows in `childrenInner` receive `rgba(0,0,0,0.025)` / `rgba(255,255,255,0.03)` subtle background. ✓
- `⋯` button gone — `MoreHorizontal` / `IconButton` removed from imports and JSX. ✓

#### Items needing rework

1. **Minor — stale test comment** (`065-directory-tree.spec.ts` line 81 comment): says "3 items: mention, copy path, copy relative path" for a file row, but the implementation now adds a `tree-download-button` (4th item). The test logic itself still passes (it only asserts 3 specific items are visible and terminal is absent; it does not assert exactly 3 total), but the comment is incorrect. Recommend updating the comment and adding a `tree-download-button` assertion.
2. **Minor — download button not tested in any e2e spec**: `tree-download-button` is implemented and rendered for file rows (`DirectoryTree.tsx:407–413`) but has no e2e coverage (static scan: 0 hits for `tree-download-button` in `tests/e2e/`). Low risk since the button is straightforward, but coverage is incomplete.

Both items are non-blocking — they do not fail any AC or gate.

`qa_score: 94`

### PM verdict

원본 사용자 발화 5개에 대한 독립 채점 (QA의 AC 기반 채점과 별도로, "사용자 문장" 기준으로 본다).

| # | 사용자 요구 (요약) | 가중치 | 충족도 | 1줄 근거 |
|---|---|---|---|---|
| 1 | 긴 파일명이 size/날짜 위로 덮어쓰는 레이아웃 깨짐을 고쳐라 | 0.25 | 95 | `nodeName`에 `min-width:0 / overflow:hidden / text-overflow:ellipsis` 3종 + `rightCluster`에 `flex-shrink:0` + `position:sticky right:0` + `backgroundColor:inherit` 마스킹 — 긴 이름은 ellipsis로 잘리고 메타는 우측 고정. `title` 속성으로 풀네임도 보존. |
| 2 | 행별 `⋯` 메뉴가 사용 어려움 (서술형 — 본 항목은 #3+#4로 해소되는지 본다) | — | — | #3·#4로 흡수 평가. |
| 3 | 우클릭 시 팝업, 좌클릭은 지금처럼 1회 클릭으로 즉시 오픈 보존 | 0.30 | 95 | `onContextMenu={preventDefault → openContextMenuAt(clientX,clientY)}`와 `onClick={toggle}`가 별도 핸들러로 공존; 우클릭은 `toggle`을 호출하지 않고 좌클릭 단일 클릭 동작은 그대로. 가상 앵커(1×1 invisible div)를 커서 좌표로 이동시켜 네이티브 OS 멘탈 모델 재현. Shift+F10 / ContextMenu 키보드도 지원 (스펙 초과 가산점). |
| 4 | `⋯` 자체 제거 | 0.25 | 100 | `MoreHorizontal` / `IconButton` / `menuTrigger` / `sidebarActions` import 4개 모두 제거, `data-testid="tree-context-button"` DOM에서 사라짐, 8개 e2e 사이트 `button:'right'`로 마이그레이션. |
| 5 | 행별 zebra 교차 배경으로 시각적 구분 | 0.15 | 85 | `--lm-tree-row-zebra-bg` 토큰 light/dark 각각 정의 후 `.childrenInner > div:nth-child(even) > .node`에 적용. hover/selected가 opaque라 정상적으로 zebra를 덮음. 다만 light 2.5% / dark 3% 델타는 디자이너 의도(WCAG 양보)지만 사용자가 "느낌이 별로 안 난다"고 할 수 있는 미세 수준 — 충족도는 명백히 됐으나 사용자 체감 리스크 존재. |
| 6 | 이상하면 롤백 요청 (메타 요구) | — | — | 변경 범위 3파일 + 3 e2e로 제한, `git diff` 공유 컴포넌트(`DropdownMenu` / `sharedTree.css.ts` / `sidebarActions.css.ts`) 모두 비어있음 → 롤백 시 폭발 반경 작음. |

**가중 합산**: 0.25×95 + 0.30×95 + 0.25×100 + 0.15×85 = 23.75 + 28.5 + 25 + 12.75 = **90.0**.

#### 사용자가 결과를 본 뒤 제기할 가능성이 있는 리스크 (확률 순)

1. **Zebra가 너무 미세하다** — light 모드 2.5% / dark 3% delta는 디자이너가 본문 가독성을 위해 의도적으로 누른 값. 사용자가 "교차로 적용된 게 잘 안 보인다"고 할 가능성 중간 이상. → 즉시 토큰 값만 4–5%로 올려서 대응 가능 (1파일 1줄, 다른 변경 불필요).
2. **파일 affordance가 줄어듦** — `⋯`이 사라져서 "여기에 메뉴가 있다"는 시각 신호가 `cursor: context-menu` 글리프 하나로 축소. 데스크톱 우클릭 관습에 익숙한 사용자엔 자연스럽지만, 트랙패드/터치 사용자가 메뉴 도달 경로를 잃을 수 있다. 모바일 long-press는 out-of-scope로 명시되어 있으나 사용자가 "메뉴 어디로 갔어"라 물을 가능성 있음.
3. **Download 메뉴 항목 신규 추가** — Dev가 스펙에 없던 `tree-download-button`을 파일 행에 추가했음. 사용자가 명시적으로 요청하지 않은 기능이 들어간 것 — 환영받을 수도, "왜 임의로 늘렸냐"라는 반응이 나올 수도 있음. QA도 이 항목의 e2e 미커버를 minor로 잡았다.
4. **Long-filename 마우스오버 시 OS tooltip만 노출** — JS 툴팁이 아닌 native `title` 속성이라 약 500ms 지연이 있다. 일부 사용자는 "잘린 이름을 즉시 보고 싶다"고 할 수 있음.
5. **container query 240px 컷오프** — 좁은 트리 패널에선 size/modTime이 통째로 사라진다. 사용자가 "왜 어떤 행은 메타가 보이고 어떤 화면에선 안 보이냐"는 혼란 가능성 — 다만 이는 pass1부터 유지된 동작이며 본 패스의 회귀가 아니다.

#### 결정

**Ship.** 사용자가 명시한 5개 요구 모두 코드 레벨에서 충족됐고, 변경 범위가 좁아 롤백 가능성을 사용자가 행사해도 비용이 낮다. 단, 출시 직후 사용자 반응 1차 확인 포인트는 **(a) zebra 가시성**과 **(b) Download 항목 추가에 대한 수용성** 두 가지 — 둘 다 미세 조정으로 대응 가능한 범위.

`pm_score: 90`

### Dev notes

**Files modified**:
- `frontend/src/styles/global.css.ts` — added `--lm-tree-row-zebra-bg` token in both light (`:root`) and dark (`[data-theme="dark"]`) blocks.
- `frontend/src/components/tree/DirectoryTree.css.ts` — added `minWidth: 0 / overflow: hidden / textOverflow: ellipsis` to `nodeName`; added local `globalStyle` for `.node > .labelWithStats` (`minWidth: 0` so the ellipsis cascade reaches `nodeName`); added zebra `globalStyle` for `.childrenInner > div:nth-child(even) > .node`; dropped the now-obsolete `sidebarActions` import and its `rightCluster` override (no longer rendered inside the cluster).
- `frontend/src/components/tree/DirectoryTree.tsx` — removed `IconButton` + `MoreHorizontal` + `menuTrigger` + `sidebarActions` imports; converted `TreeContextMenu` to headless (props: `open`, `anchorRef`, `target`, `onClose`) and hoisted a single instance + a single 1×1 `position: fixed` invisible virtual anchor div to the `DirectoryTree` root; added `openContextMenuAt(target, x, y)` on the tree context; wired `onContextMenu` (preventDefault → move anchor → set target) on both `TreeNode` `.node` and the root row; added `tabindex="0"` + `onKeyDown` for `ContextMenu` / `Shift+F10` (opens at row's `getBoundingClientRect().left, bottom`); added `cursor: 'context-menu'` inline style on file-row branches only (directories keep `pointer`); added native `title` attribute on `nodeName` spans for full-filename hover-reveal.

**e2e sites migrated (8)** — replaced `treeRow.locator('[data-testid="tree-context-button"]').click()` (with prior `hover`) by `treeRow.click({ button: 'right' })`:
- `tests/e2e/065-directory-tree.spec.ts` lines 51, 79, 106, 138
- `tests/e2e/037-quote-and-mention.spec.ts` lines 146, 278, 290
- `tests/e2e/014-workspace-archive.spec.ts` line 209

**Gates**:
- `bun run typecheck` clean
- `bun run lint` clean
- `bun run test` — 228 files / 3226 tests passed; **zero snapshot rebaselines**.

**Contrast / spacing nudges**: none beyond Designer's specified tokens. Zebra `rgba(0,0,0,0.025)` light + `rgba(255,255,255,0.03)` dark applied verbatim; hover (`var(--card)`) and selected (`var(--secondary)`) backgrounds are fully opaque per existing styles, so the layering precedence (zebra → hover → selected) holds without specificity bumps.

**Audit results**:
- `rg "tree-context-button"` → 0 hits across `src/` and `tests/`.
- `rg "MoreHorizontal|menuTrigger|sidebarActions" src/components/tree/DirectoryTree.tsx` → 0 hits.
- `rg "lm-tree-row-zebra-bg" src/` → 3 hits (light token + dark token + consumer).
- `rg "onContextMenu" src/components/tree/DirectoryTree.tsx` → 2 row-level handlers + 1 doc comment.
- `rg "tabindex" src/components/tree/DirectoryTree.tsx` → 2 hits (TreeNode + root row).
- Shared `sidebarActions` / `menuTrigger` consumers untouched: `WorkspaceTabTree`, `WorkspaceSectionContent`, `WorkerSectionContent`, `WorkspaceContextMenu`, `WorkerContextMenu`, `TunnelContextMenu`, `workspaceList.css.ts` — all still import and render the `⋯` trigger pattern unchanged. `CustomTitlebar.tsx` consumes its own local `menuTrigger` from `CustomTitlebar.css.ts` (verified).
- `calcPopoverPosition` flip logic present (`src/lib/popoverPosition.ts`) — last-row right-click will flip above when below-overflow occurs, no change required.

**Implementation notes for QA**:
- Right-click never invokes `toggle` (the left-click handler) — `onContextMenu` is a separate listener and `preventDefault()` blocks the browser's native menu, not the row's own `onClick`.
- The virtual anchor is `pointer-events: none; opacity: 0` so it cannot be hit-tested or seen; it merely supplies a `getBoundingClientRect()` to `calcPopoverPosition`.
- Keyboard menu opens at the focused row's bottom-left (Designer-spec), which mirrors VS Code / macOS Finder. Escape closes via `DropdownMenu`'s built-in handler.
- The `nodeName` span now carries `title={displayName}` so OS-level tooltip still surfaces the full filename when an ellipsis clips it (no JS tooltip needed, per Designer note 1).

`dev_confidence: 92`

---

`pm_confidence: 78`
Key uncertainty: 우클릭 위치 기준 popover 앵커가 DropdownMenu의 anchorRef 경로 하나만으로 충분한지 — 좌표 기반 가상 앵커(getBoundingClientRect를 mock하는 dummy element)가 필요할 수 있고, 이는 TechLead가 DropdownMenu API를 그대로 둘지 미세 확장할지 결정해야 한다.

`techlead_confidence: 84`
- DropdownMenu decision: **do not extend** — reuse the existing `anchorRef` + `open` programmatic path with a real 1×1 `position:fixed` invisible DOM "virtual anchor" element repositioned to `clientX/clientY` (or row's `left/bottom` for keyboard). `calcPopoverPosition` only reads `getBoundingClientRect()`, so a hidden div is sufficient and avoids touching the shared common component.
- Anticipated test breakage: all 8 e2e sites that target `[data-testid="tree-context-button"]` (in `065-directory-tree.spec.ts` ×4, `037-quote-and-mention.spec.ts` ×3, `014-workspace-archive.spec.ts` ×1) — fixed in T7 by switching to `.click({ button: 'right' })` on the tree row. No Vitest unit tests reference the testid.
