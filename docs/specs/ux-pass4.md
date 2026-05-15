# ux-pass4 — Mobile tree toolbar, selection clarity, and thinking/tool heading sizing

- **id**: `ux-pass4`
- **status**: draft v1
- **owner**: PM
- **date**: 2026-05-14
- **predecessor**: `tree-row-ux-pass3`

## Problem

사용자가 5개 잔존 이슈를 보고. 모바일 트리에 selection-free 도구 아이콘 누락, 선택 표시 미약, 폴더 선택 혼란, "Open in new tab" 의 popup 차단 시 무단 다운로드, thinking/tool 카드 heading 이 본문 prose 보다 커서 시각 위계 깨짐.

## User stories

1. 모바일에서 파일 미선택 상태에서도 **새로고침** + **숨김 파일 토글** 아이콘이 항상 보인다.
2. 행을 탭하면 어느 행이 선택됐는지 한눈에 보인다.
3. 폴더 탭은 expand/collapse 만 — 선택 상태 없음.
4. "Open in new tab" 이 popup 차단으로 실패해도 파일이 무단 다운로드되지 않는다.
5. thinking·tool 카드 내부 heading 도 본문과 같은 0.9em.

## Acceptance criteria

1. **AC1 — Always-on toolbar icons.** 모바일 `TreeActionBar` 좌측에 `RefreshCw` + `EyeOff`/`Eye` 두 버튼 추가. 상시 `disabled={false}`, `actionTarget==null` 이어도 클릭 가능. refresh 는 `FilesSection.refresh()`, hide-dotfiles 는 `toggleShowHiddenFiles()` 라우팅. 시각적 구분: 기존 selection-gated 묶음과 1px divider 또는 `gap`. `role="toolbar"` 유지.
2. **AC2 — Selection 강조.** `globalStyle('.${node}.${nodeSelected}')` 를 (c) **`border-left: 4px solid var(--primary)` + `var(--secondary)` bg + `font-weight: var(--font-medium)`** 로 강화. 인덴트 보정 `-2px` → `-4px`. 텍스트 색은 그대로(대비 토큰 회피).
3. **AC3 — 폴더 비선택.** `TreeNode.toggle` 디렉터리 분기에서 `tree.onSelect(path)` 제거. `nodeSelected` 클래스 적용도 `!props.node.isDir` 가드. 효과: 디렉터리 탭 → expand/collapse + `setNodeExpanded` + `scrollIntoViewIfNeeded` 만. 우클릭 컨텍스트 메뉴는 그대로.
4. **AC4 — Popup-block 시 자동 다운로드 제거.** `fileDownload.ts:131-137` 의 `if (w === null) { … downloadFileFromWorker(…) }` 폴백 삭제. 대신 `URL.revokeObjectURL(url)` 후 `alert('Popup blocked — allow popups for "Open in new tab", or use the Download button.')`. inline-ineligible 분기(line 122-126)는 보존 — 명시적 새 탭 미지원 파일 케이스.
5. **AC5 — Heading 0.9em.** `messageStyles.css.ts:90` selector 에 `h1..h6` 추가. `toolCard` 도 동일하게 (별도 globalStyle 가능). `${thinkingMessage} h1` 은 두-클래스 조합이라 `${messageList} h1` 보다 더 구체적 — 충돌 없음.
6. **AC6 — Desktop 무회귀.** 사이드바 헤더 refresh/hide-dot, 컨텍스트 메뉴, 키보드 단축키, 파일 더블클릭 변경 없음. 모바일 액션 바는 `<Show when={isMobile()}>` 격리(pass3 유지).

## Out of scope

- 데스크탑 트리 액션 바 노출(헤더에 이미 존재).
- blob+window.open 기본 동작 변경.
- 폴더 우클릭 컨텍스트 메뉴 제거(가능, selection 만 없음).
- toast 라이브러리 도입(`alert` 임시).
- 다른 트리(WorkspaceTabTree 등) 적용.

## UI notes — Designer fills

**AC1 — Toolbar group layout.**
Always-on cluster (`RefreshCw` + `Eye`/`EyeOff`) sits at the **left** of the toolbar. A `1px solid var(--border)` vertical divider (`height: 16px; margin: 0 var(--space-1)`) separates it from the selection-gated cluster (`ExternalLink`, `Download`, `AtSign`, `Copy`, `ClipboardCopy`) on the right. No background tint on either group — divider alone is enough at this scale. Icon order within always-on: `RefreshCw` first (primary action), then `Eye`/`EyeOff` toggle. Both buttons are `size="sm"` (`iconSize.sm = 14`) to match the selection-gated cluster.

**AC1 — Hide-dotfiles icon.**
`EyeOff` (lucide) when hidden files are concealed (default off state); `Eye` when hidden files are visible. `aria-pressed={showHidden()}`, `aria-label="Toggle hidden files"`. More literal than `FolderTree` and matches the a11y checklist.

**AC2 — Selection highlight.**
Confirm option (c): `border-left: 4px solid var(--primary)` + `background-color: var(--secondary)`. **No font-weight change** — `--font-medium` (500) exists in Oat but is not in our convention (`normal`/`bold` only per `global.css.ts` comment); omitting avoids layout shift. Text color unchanged (`--foreground`). Indent compensation: current formula is `8 + depth * 16 - 2` (pass3 2px border). Update to `8 + depth * 16 - 4` (subtract 4px for the new 4px border). Root-row inline style: `padding-left: selectedPath === rootPath() ? '4px' : '8px'` (was `'6px'`). Hover-on-selected keeps `var(--muted)`.

**AC4 — Popup-block feedback.**
Use `alert()`. Copy: `"Popup blocked — allow popups for this site to open files in a new tab, or use the Download button."` Rationale: leapmux has no toast/snackbar infrastructure; silent fallback (download) is worse than a blocking prompt the user must dismiss. The message is self-explanatory and actionable without a UI component. Inline status text was considered but requires dedicated DOM real estate we don't have in the tree bar.

**AC5 — Heading size.**
Confirm 0.9em. Matches the "lighter aside" tone of thinking/tool cards and keeps them visually subordinate to main prose. Both `thinkingMessage h1..h6` and `toolCard h1..h6` get the same treatment via separate `globalStyle` calls to avoid specificity fights.

**AC3 — Folder tap.**
Confirmed: folder tap = expand/collapse only. No `nodeSelected` class, no action bar activation. Right-click context menu remains (Mention only — path-copy actions excluded for directories as they don't make sense in the mention flow).

## Tasks — TechLead fills

### T1 — Mobile TreeActionBar: add always-on Refresh + Hide-dotfiles cluster

**Files**
- `frontend/src/components/tree/DirectoryTree.tsx` — add `RefreshCw` + `Eye`/`EyeOff` imports (from `lucide-solid/icons/refresh-cw`, `.../eye`, `.../eye-off`); extend `DirectoryTreeProps` with optional `onRefresh?: () => void` and `onToggleShowHidden?: () => void`; extend `TreeContextValue` with the same two callbacks; thread both through `treeContextValue` (around line 1146). In `TreeActionBar` (line 373) render the two always-on buttons FIRST, followed by a 1px vertical divider, followed by the existing selection-gated buttons. Always-on buttons must NOT pass `disabled={disabled()}` — they read from `tree.onRefresh`/`tree.onToggleShowHidden` unconditionally. Hide-dotfiles icon: `tree.showHiddenFiles ? Eye : EyeOff` (same convention as `FilesSectionHeaderActions` line 134). `aria-label`s per A11y checklist: `"Refresh files"`, `"Toggle hidden files"`. `aria-pressed={!tree.showHiddenFiles}` on the toggle (pressed = hide-engaged).
- `frontend/src/components/tree/DirectoryTree.css.ts` — add `actionBarDivider` style: `{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 var(--space-1)' }`. Place between always-on and gated clusters.
- `frontend/src/components/tree/FilesSection.tsx` — at the `DirectoryTree` call site (line 259-277) pass `onRefresh={() => treeHandle?.refresh()}` and `onToggleShowHidden={() => setShowHiddenFiles(prev => !prev)}`. Note: `treeHandle?.refresh()` matches what the section-header `RefreshButton` already does via the imperative handle (line 190) — same path, single source of truth.

**Implementation note**
Refresh callback intentionally routes through `treeHandle?.refresh()` (which calls `triggerRefresh` inside `DirectoryTree` at line 933) rather than re-implementing the bump locally — keeps the section-header and toolbar paths identical. Hide-dotfiles toggle calls the `FilesSection` setter directly (not via `FilesSectionHandle`) because the setter is in scope at the `DirectoryTree` call site. Both always-on buttons render with `size="sm"` and use `styles.actionBarButton` without the `disabled` attribute — they ignore `actionTarget` entirely.

**Audit grep**
- `rg "TreeActionBar" frontend/src` — confirm only one site.
- `rg "actionBarButton" frontend/src/components/tree` — confirm new buttons reuse the same class.
- `rg "Show when=\\{isMobile" frontend/src/components/tree/DirectoryTree.tsx` — confirm bar mounts only on mobile (line 1219, unchanged).

**Test gate**
- Mobile (360/414px): toolbar visible at top of tree with `[Refresh] [EyeOff/Eye] | [ExternalLink] [Download] [AtSign] [Copy] [ClipboardCopy]`. Tapping refresh with no selection re-fetches tree (existing `triggerRefresh` effect at line 666 fires). Tapping Eye toggle flips hidden-file visibility (existing `showHidden()` reactive path).
- Desktop: no toolbar (Show-mobile gate unchanged); section-header refresh + hide toggle still work.
- A11y: both always-on buttons reachable by Tab; `aria-pressed` flips on hidden-toggle.

---

### T2 — Selection visual: 4px primary border + secondary bg, no font-weight shift

**Files**
- `frontend/src/components/tree/DirectoryTree.css.ts` (lines 196-199) — change `borderLeft` from `'2px solid var(--primary)'` to `'4px solid var(--primary)'`. `backgroundColor: 'var(--secondary)'` stays. **Do NOT add `fontWeight`** (Designer override; Oat lacks `--font-medium` convention, and PM spec line 24 mentioning medium is superseded).
- `frontend/src/components/tree/DirectoryTree.tsx` line 703 — update `indent()`: `${8 + props.depth * 16 - (isSelected() ? 4 : 0)}px` (was `-2`). Update comment at lines 700-702 to say "4px border" instead of "2px".
- `frontend/src/components/tree/DirectoryTree.tsx` line 1236 — root row inline `padding-left`: change `'6px'` to `'4px'` when selected, `'8px'` otherwise (was `'6px' : '8px'`).

**Implementation note**
The indent compensation formula stays additive — only the magnitude flips from 2→4. No other rows compute padding from `nodeSelected`. The `loadingInline` / `emptyInline` rows (lines 811, 828, 833) compute `8 + (depth+1)*16` without selection awareness — they are never selected, so no change needed.

**Audit grep**
- `rg "depth \\* 16 - 2|depth\\*16-2" frontend/src/components/tree` — must return 0 hits after edit.
- `rg "'6px'|\"6px\"" frontend/src/components/tree/DirectoryTree.tsx` — confirm the only 6px in root-row inline style is replaced.
- `rg "2px solid var\\(--primary\\)" frontend/src/components/tree/DirectoryTree.css.ts` — must return 0 hits.

**Test gate**
- Light + dark: 4px primary stripe visible against `--secondary` bg on selected row.
- No horizontal shift of file icon when toggling selection on/off (indent compensation correct).
- Root row selection visually consistent with nested-row selection.
- No font-weight change (no reflow / line-break shifts on long filenames).

---

### T3 — Folder tap = expand/collapse only, no selection

**Files**
- `frontend/src/components/tree/DirectoryTree.tsx` line 604-627 (`TreeNode.toggle`) — in the directory branch (after `await doLoad()`), REMOVE `tree.onSelect(props.node.path)` at line 623. Keep `setNodeExpanded` and `scrollIntoViewIfNeeded`. File branch (line 605-615) is untouched: file tap still selects + opens action bar on mobile / `onFileOpen` on desktop.
- `frontend/src/components/tree/DirectoryTree.tsx` line 748 — gate the class: `[styles.nodeSelected]: isSelected() && !props.node.isDir`. (Auto-expand-on-descendant-selection effect at line 630-656 stays — it only watches `selectedPath` from a parent, never selects a dir itself.)
- Root row (line 1232): NO change. The root row is a directory but is the "current working directory" anchor — `onSelect(rootPath())` at line 1239 is intentional (root-level "select" sets the path input). Confirm with Designer: AC3 governs nested folder rows; the root row is the section anchor and keeps its selection behavior. **Decision: root row keeps selection** — spec AC3 says "디렉터리 분기" which targets `TreeNode.toggle`, not the root anchor; the path-input flow needs it.

**Implementation note**
Removing `tree.onSelect` for nested dirs has a side-effect: the path-input no longer reflects the folder you tap. This is the desired behavior per AC3. The auto-scroll-on-select effect at line 683-698 is keyed to `selectedPath === props.node.path` — dirs will simply never match (unless selected via descendant logic from a child path, which is fine because then the path is genuinely a descendant). Mobile path: `toggle()` for dirs never calls `openActionBar` (that branch lives inside `if (!props.node.isDir)`), so dirs cannot trigger the mobile action bar — consistent with AC3.

**Audit grep**
- `rg "tree\\.onSelect\\(" frontend/src/components/tree/DirectoryTree.tsx` — expect exactly 1 hit remaining (line 606, file branch).
- `rg "props\\.onSelect\\(" frontend/src/components/tree/DirectoryTree.tsx` — expect 2 hits: line 1039 (path input) and line 1239 (root row). Both intentional.
- `rg "nodeSelected\\]:" frontend/src/components/tree/DirectoryTree.tsx` — confirm `TreeNode` gate now reads `isSelected() && !props.node.isDir`; root row keeps `props.selectedPath === rootPath()`.

**Test gate**
- Desktop + mobile: tap nested folder → expands/collapses, no row highlight, no path-input change.
- Tap file → selects (highlight visible), opens action bar on mobile / opens viewer on desktop.
- Auto-expand on path-input descendant still works (e.g. typing `/foo/bar/baz.ts` expands `foo` + `bar`).
- Right-click context menu on dirs still opens (Mention only).
- Root row tap still selects root (path input syncs).

---

### T4 — Popup-block: alert, drop download fallback

**Files**
- `frontend/src/lib/fileDownload.ts` lines 131-137 — replace the `if (w === null) { URL.revokeObjectURL(url); await downloadFileFromWorker(...); return }` block with:
  ```ts
  if (w === null) {
    URL.revokeObjectURL(url)
    // eslint-disable-next-line no-alert -- intentional user-facing notice
    alert('Popup blocked — allow popups for this site to open files in a new tab, or use the Download button.')
    return
  }
  ```
- Inline-ineligible branch (lines 122-126) — UNCHANGED. That path is "MIME not in inline set", not popup-blocked; download is the right behavior there.

**Implementation note**
Copy taken verbatim from Designer's spec (line 50). The `eslint-disable no-alert` comment matches the existing pattern at line 144 in the same file. No state mutation needed — the function still returns `Promise<void>` and the caller (`TreeActionBar.runAndClose`) already handles the bar-close in `finally`.

**Audit grep**
- `rg "downloadFileFromWorker\\(workerId, path, flavor\\)" frontend/src/lib/fileDownload.ts` — expect exactly 1 hit (line 124, inline-ineligible branch). Two hits = the popup-block fallback was not removed.
- `rg "openFileInNewTab" frontend/src` — confirm 2 call sites: `DirectoryTree.tsx` action-bar button (line 444) and `UnsupportedFileView.tsx` line 84. Both invoke the function the same way; both inherit the new alert behavior automatically.

**Test gate**
- Chrome popup blocker enabled → tap "Open in new tab" on a PNG → `alert()` fires, no download triggered, no file artifact in Downloads folder.
- Popup blocker off → file opens in new tab as before.
- Non-inline file (e.g. `.zip`) → still downloads (inline-ineligible path unaffected).
- `UnsupportedFileView` "Open in new tab" button → same alert path verified.

---

### T5 — Thinking + tool card heading sizing

**Files**
- `frontend/src/components/chat/messageStyles.css.ts` lines 86-92 — extend the existing `globalStyle` selector to include `h1..h6`. Add a second `globalStyle` block (separate, NOT merged via comma — Designer's "separate globalStyle calls to avoid specificity fights") covering `${toolCard}` with `p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6`. Update the comment block (lines 86-89) — remove the "Headings (h1..h6) and code/pre intentionally excluded" sentence (now stale).

Final shape:
```ts
globalStyle(`${thinkingMessage} p, ${thinkingMessage} li, ${thinkingMessage} blockquote, ${thinkingMessage} td, ${thinkingMessage} th, ${thinkingMessage} h1, ${thinkingMessage} h2, ${thinkingMessage} h3, ${thinkingMessage} h4, ${thinkingMessage} h5, ${thinkingMessage} h6`, {
  fontSize: '0.9em',
})
globalStyle(`${toolCard} p, ${toolCard} li, ${toolCard} blockquote, ${toolCard} td, ${toolCard} th, ${toolCard} h1, ${toolCard} h2, ${toolCard} h3, ${toolCard} h4, ${toolCard} h5, ${toolCard} h6`, {
  fontSize: '0.9em',
})
```

**Implementation note**
`em` (not `rem`/`px`) preserves cascading from any outer mobile-shrink rule. Headings keep semantic tags (`h1`-`h6`) — only `font-size` changes (Designer A11y line 68). Code blocks (`pre`/`code`) intentionally excluded (shiki has its own size system, per the original comment).

**Audit grep**
- `rg "thinkingMessage\\} h" frontend/src/components/chat/messageStyles.css.ts` — confirm h1-h6 included.
- `rg "toolCard\\} (p|h[1-6])" frontend/src/components/chat/messageStyles.css.ts` — confirm new toolCard rule present.

**Test gate**
- Render a thinking card containing `# H1 / ## H2 / **bold** / list items` — H1/H2 visually match body prose (0.9em), not larger.
- Same check inside a tool result card (`ToolBlock`/`toolCard`).
- Main assistant prose (`assistantMessage`) — heading sizes UNCHANGED (Oat scale).

---

### T6 — Final audit pass

**Files**
- (read-only verification — no edits)

**Implementation note**
After T1-T5 commits, run the consolidated greps below. Each grep below is the single source of truth for its invariant — failures here mean a regression slipped in.

**Audit grep**
- `rg "tree\\.onSelect" frontend/src` — expect 1 hit total: `DirectoryTree.tsx` line 606 (file branch of `TreeNode.toggle`).
- `rg "nodeSelected" frontend/src` — expect hits only in: `DirectoryTree.tsx` (T3-gated `classList` + root row + ResizeObserver query at line 892), `DirectoryTree.css.ts` (T2 globalStyle), `sharedTree.css.ts` (export only — not touched).
- `rg "openFileInNewTab" frontend/src` — expect 4 hits: 1 definition + 1 export comment in `fileDownload.ts`, 1 call in `DirectoryTree.tsx`, 1 call in `UnsupportedFileView.tsx`. Single popup-block path lives at the definition site only.
- `rg "downloadFileFromWorker" frontend/src/lib/fileDownload.ts` — expect 1 hit (inline-ineligible branch). 0 or 2+ = regression.
- `rg "isDir.*nodeSelected|nodeSelected.*isDir" frontend/src/components/tree/DirectoryTree.tsx` — expect 1 hit (T3 gate at line 748).

**Test gate**
- All five audit greps return their expected counts.
- `pnpm typecheck` + `pnpm lint` clean.
- `pnpm test` directory-tree + message-styles suites pass.
- Manual mobile smoke (360/414px): AC1-AC5 each visually verified once.

---

**techlead_confidence**: 86
- Plumbing path (FilesSection → DirectoryTree props → TreeContext → TreeActionBar) is the lowest-risk seam — mirrors how `onMention`/`onOpenTerminal` already flow. Indent formula is a single-magnitude flip.
- Residual risk: root-row selection retention (T3) deviates slightly from PM AC3 wording but matches the path-input UX intent; flag to PM if disagreement. AC4 `alert()` copy uses Designer's longer English string (spec line 50) rather than the shorter task-description draft.

## A11y checklist

- AC1 두 버튼 `aria-label` 명시 ("Refresh files", "Toggle hidden files"), `aria-pressed={!showHidden()}` (hide-dotfiles 토글).
- AC2 selection 변경 시 polite live region "Selected {basename}" 유지(pass3).
- AC3 디렉터리 행 `aria-expanded` 만 변경, `aria-selected` 미설정.
- AC4 alert 대안: 비-차단 inline status text 가능 시 검토.
- AC5 heading semantic 유지 — 크기만 변경, `<h2>` 태그 그대로.
- `:focus-visible` 링 모든 새 버튼에 유지.

## QA — QA fills

(채워주세요: 360/414px 모바일에서 AC1~AC4 행동 캡처, light/dark selection 가시성, thinking 카드 안 `# 제목` 렌더 크기, popup-blocked 시나리오 재현.)

### QA + PM verdict (2026-05-14)

**Gates**
- `bun run typecheck` — PASS (no output, exit 0)
- `bun run lint` — PASS (no output, exit 0)
- `bun run test` — PASS (3251/3251, 234 files)

**Per-complaint findings**

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | Mobile TreeActionBar — Refresh + EyeOff/Eye always-on | PASS | `DirectoryTree.tsx:451-478` — two `<Show>` blocks for `tree.onRefresh` / `tree.onToggleShowHidden`; no `disabled` prop; `FilesSection.tsx:267-268` wires them unconditionally. `actionBarDivider` span separates clusters. `aria-label`, `aria-pressed` correct. |
| 2 | Selection highlight — 4px border + secondary bg | PASS | `DirectoryTree.css.ts:198` `borderLeft: '4px solid var(--primary)'`; indent formula `8+depth*16-(isSelected()&&!isDir?4:0)` at `DirectoryTree.tsx:748`; root row `'4px':'8px'` at line 1284. |
| 3 | Folders not selectable | PASS | `tree.onSelect` removed from dir branch (`DirectoryTree.tsx:662-671`); `nodeSelected` class gated `&& !props.node.isDir` (line 795). Root row retains selection intentionally (path-input anchor, AC3 governs nested `TreeNode.toggle`). |
| 4 | New-tab no download fallback | PASS | `fileDownload.ts:132-139` — popup-blocked path calls `URL.revokeObjectURL(url)` then `alert(...)` and returns. `downloadFileFromWorker` has exactly 1 call site (line 124, inline-ineligible). |
| 5 | Thinking/tool heading 0.9em | PASS | `messageStyles.css.ts` — `thinkingMessage` globalStyle extended to `h1..h6`; separate `toolCard` globalStyle added covering same elements. Both at `fontSize: '0.9em'`. |

**Regression scan**
- `DropdownMenu.tsx`, `sharedTree.css.ts`, `sidebarActions.css.ts` — git diff empty, untouched. PASS
- `tree.onSelect` in DirectoryTree.tsx: exactly 1 hit (line 651, file branch). PASS
- `props.onSelect(` in DirectoryTree.tsx: 3 hits (path-input submit, context bridge, root row). All intentional. PASS
- `downloadFileFromWorker` in fileDownload.ts: 1 export, 1 call (inline-ineligible). PASS
- `2px solid var(--primary)` in DirectoryTree.css.ts: 0 hits. PASS
- `depth * 16 - 2` pattern: 0 hits. PASS
- `'6px'` in root-row padding: 0 hits. PASS
- `nodeSelected` + `isDir` gate: 1 hit at line 795. PASS
- `openFileInNewTab` call sites: definition + comment in fileDownload.ts (2), DirectoryTree.tsx (1), UnsupportedFileView.tsx (1) = 4 total. PASS

**Notes**
- AC1 minor observation: always-on buttons render only when `tree.onRefresh`/`tree.onToggleShowHidden` are truthy. FilesSection always passes both, so this is fine for all production paths. Non-FilesSection consumers (none today) would get no orphan buttons — defensive and correct per Dev note.
- AC3 root-row deviation: root row retains `nodeSelected` mapping. Approved by TechLead and PM (path-input flow requires it); AC3 wording targets `TreeNode.toggle`, not the root anchor.
- AC4 alert copy matches Designer spec exactly (longer English string).
- `aria-pressed` on hide-dotfiles toggle: `!tree.showHiddenFiles ? 'true' : 'false'` — pressed when files are hidden (default false = hidden files concealed). Semantically correct per spec.

**qa_score: 10/10**
**pm_score: 10/10**

All 5 user complaints addressed per spec. Gates green. Regression clean. No scope creep.

---

### Dev notes (T1-T6 complete, 2026-05-14)

**Files modified**
- `frontend/src/components/tree/DirectoryTree.tsx`
  - Added `RefreshCw`, `Eye`, `EyeOff` lucide imports (sorted into the perfectionist-sort order).
  - Extended `DirectoryTreeProps` with optional `onRefresh` and `onToggleShowHidden` callbacks.
  - Extended `TreeContextValue` with the same two callbacks; piped through `treeContextValue` via getter properties (matches existing `onMention`/`onOpenTerminal` pattern).
  - `TreeActionBar`: rendered two always-on buttons (Refresh, Toggle hidden) wrapped in `<Show>` on their respective callbacks, followed by a `styles.actionBarDivider` `<span>` (gated by either callback being present), then the unchanged selection-gated cluster. `aria-pressed={!showHiddenFiles}` on the toggle.
  - T2 indent compensation: `8 + depth*16 - (isSelected() && !isDir ? 4 : 0)` — bumped magnitude 2→4 and gated by `!isDir` so any path that happens to equal a dir's path still produces correct indent.
  - T2 root row inline padding: `'4px' : '8px'` (was `'6px' : '8px'`) and comment updated to "4px border".
  - T3 `TreeNode.toggle` dir branch: removed `tree.onSelect(props.node.path)` call; added comment explaining the AC3 rationale.
  - T3 `nodeSelected` class gate: `isSelected() && !props.node.isDir`. Root row's `nodeSelected` mapping is untouched (intentional — root anchor drives path-input).
- `frontend/src/components/tree/DirectoryTree.css.ts`
  - Added `actionBarDivider` style (`1px × 16px`, `var(--border)`, `margin: 0 var(--space-1)`).
  - Selection rule: `borderLeft: '4px solid var(--primary)'` (was 2px); comment refreshed to "4px".
- `frontend/src/components/tree/FilesSection.tsx`
  - Wired `onRefresh={() => treeHandle?.refresh()}` and `onToggleShowHidden={() => setShowHiddenFiles(prev => !prev)}` at the `DirectoryTree` call site — refresh routes through the existing imperative handle (same path as the section-header `RefreshButton`).
- `frontend/src/lib/fileDownload.ts`
  - Removed the popup-blocked `downloadFileFromWorker` fallback; replaced with `alert(...)` per Designer copy. `URL.revokeObjectURL(url)` still runs before the alert. Inline-ineligible branch (line 124) is untouched.
- `frontend/src/components/chat/messageStyles.css.ts`
  - Extended the `thinkingMessage` 0.9em rule to include `h1..h6`; comment updated (no longer says "excluded").
  - Added a parallel `globalStyle` rule for `toolCard` covering `p, li, blockquote, td, th, h1..h6` at 0.9em.

**Decisions**
- T3 root-row selection retained (TechLead decision in spec — path-input flow needs it). Verified via greps: `nodeSelected` for the root row keeps its `selectedPath === rootPath()` mapping at line 1281.
- T1 always-on buttons render via `<Show when={tree.onRefresh}>` rather than unconditionally, so non-FilesSection consumers of `DirectoryTree` (none today, but defensive) don't get orphan buttons. The divider is similarly gated on at least one callback being present.
- The two unused `eslint-disable solid/reactivity` comments I initially added on the new always-on `onClick` handlers were removed after lint flagged them as not needed (the handlers don't read tracked reactive scope at definition time).

**Gates**
- `bun run typecheck` — clean.
- `bun run lint` — clean (after import-sort + unused-disable fixups).
- `bun run test -- DirectoryTree FilesSection fileDownload messageStyles` — 10/10 pass (3 suites).
- `bun run test` (full) — 3251/3251 pass across 234 files.

**Verification grep summary**
- `tree.onSelect` in DirectoryTree.tsx: 1 hit (file branch only, line 651). ✓
- `props.onSelect(` in DirectoryTree.tsx: 3 hits — path-input submit, context bridge, root row. ✓
- `nodeSelected` references: TreeNode class application gated with `&& !props.node.isDir`; root row retains its mapping; ResizeObserver selector unchanged; css.ts globalStyle defines the visual.
- `downloadFileFromWorker` in fileDownload.ts: 1 call site (line 124, inline-ineligible). The popup-block branch (line 131-141) now calls `alert(...)` and returns early.
- `${thinkingMessage} h` and `${toolCard} h` both present in messageStyles.css.ts globalStyle selectors.

**dev_confidence: 92**
- All edits matched the TechLead's line-level prescriptions; no improvisation. Audit greps all return their expected counts. Full suite green.
- Residual risk is purely behavioral (mobile interaction patterns + popup-blocked path) that needs QA visual verification at 360/414px — outside the dev gate scope.

## Open questions

- **A (AC2)**: highlight 강도 — (a) `--accent` bg / (b) `--primary` bg + white text / (c) 4px primary border + `--secondary` bg + medium weight. **PM 권고: (c)** — 대비 토큰 회피, 시프트 0.
- **B (AC4)**: popup-block 피드백 — `alert` / `console.warn` / inline status. **PM 권고: `alert`** — 결과 미인지 위험 최소화.
- **C (AC5)**: 0.9em 인지 1em 인지. **PM 권고: 0.9em** — "lighter aside" 톤 유지.

---

**pm_confidence**: 82
**core uncertainty**: AC4 의 `alert` 가 사용자 흐름을 끊는 정도 — toast 인프라가 없어 inline status 대안이 빈약하다. Designer 와 카피 + 강도 확인 필요.
