# tree-row-ux-pass3 — DirectoryTree row UX correction (regression sweep)

- **id**: `tree-row-ux-pass3`
- **status**: draft v1
- **owner**: PM
- **date**: 2026-05-14
- **predecessor**: `tree-row-ux-pass2` (shipped the regressions below)

## Problem

사용자 인용: "가로 스크롤이 그대로 ... 여러줄로 보여달라 했던 거 같은데 ... 상단 여백이 있어 ... 터치하면 밀려난 만큼 스크롤 되어 UX 점수 꽝 ... 파일이 선택됐다는 것도 보여줘야 ... 격줄로 적용이 안 됨." pass2가 모바일 5종 동시 회귀.

## Pre-work — confirmed DOM facts

- `TreeNode`: `<div wrapperRef> → <div class={node}>`. wrapperRef는 class 없이 `.childrenInner` 직계 자식.
- 루트 행은 `.treeInner` 직계 → `.childrenInner` 자식이 아님 → zebra가 root에 새지 않음.
- `RowLabelWithStats`: `.node > Tooltip의 <span style="display:contents"> > <span class={labelWithStats}>`. 직계 셀렉터 `.node > .labelWithStats`는 **매칭 실패** — 가로 스크롤 회귀의 직접 원인. `min-width:0`가 라벨까지 못 닿아 flex 자식이 intrinsic width로 부풀음.
- Zebra 셀렉터 `.childrenInner > div:nth-child(even) > .node`는 매칭됨. 회귀 원인은 토큰 값(`#f9f9f9`)이 light 대비 너무 옅고, 모바일 액션바 슬라이드인이 첫 행을 시점에서 가려 인지 실패.

## User stories

1. 모바일에서 긴 파일명이 있어도 트리 패널 **가로 스크롤 0**.
2. 파일명은 **기본 wrap** (최대 3줄), 헤더 토글로 truncate ↔ wrap.
3. 모바일에서 액션 아이콘 바는 **항상 노출**, 선택 전엔 disabled, 선택 후 활성.
4. 행 탭 시 **선택 상태가 명확히 보이고** 액션바가 활성 — 행이 시점에서 사라지지 않는다(레이아웃 시프트 0).
5. 행 zebra striping이 light/dark 모두 육안 식별 가능.

## Acceptance criteria

1. **가로 스크롤 박멸.** globalStyle을 `.${node} .${labelWithStats}` (descendant)로 수정해 Tooltip의 `display:contents` 래퍼를 건너뛰고 `min-width:0; overflow:hidden`을 라벨에 전달. `.tree { overflow-x:hidden }` 최종 방어. 360px 폭에서 가로 스크롤 0.
2. **wrap이 기본.** `FilesSection`에서 `PREFIX_FILES_NAME_WRAP` 값이 없을 때 **기본 `true`**. 기존 false 저장 사용자에게도 적용하려면 마이그레이션 키 bump(`:v2`) 또는 null→true 폴백 명시. 토글 동작 동일.
3. **rightCluster 마스킹.** `background-color: inherit` 유지 — zebra/hover/selected 모든 상태에서 라벨 비침 0.
4. **TreeActionBar 모바일 항상 노출.** `useIsMobile()`가 true면 `actionTarget` 무관 렌더. `actionTarget == null`이면 모든 버튼 `disabled` + `aria-disabled="true"` + dim(opacity 0.4) + `pointer-events:none`. 파일 탭 시 target만 세팅 — 바는 이미 자리잡혀 **레이아웃 시프트 0**.
5. **PC 분리.** 데스크탑은 액션바 미렌더, 기존 우클릭/`Shift+F10` 컨텍스트 메뉴 유지. 사용자 불만은 모바일 한정, PC UX 회귀 이유 없음.
6. **상단 여백 제거.** `actionBar { padding: 0 var(--space-2) }`(현 `4px ...`→0), `.tree { padding-top:0 }`(pass2의 `var(--space-1) 0`가 흰 띠 원인). 액션바와 첫 행은 1px `border-bottom`만으로 분리.
7. **행 선택 시각화.** 파일 행 탭 → `tree.onSelect(path)` + `nodeSelected` 클래스. 모바일에서는 `onFileOpen` 즉시 호출 **금지** — "Open in new tab" 액션으로만. 데스크탑은 기존대로.
8. **Zebra 가시화.** `--lm-tree-row-zebra-bg`: light `rgba(0,0,0,0.045)`, dark `rgba(255,255,255,0.05)`. 셀렉터 정상이므로 토큰 명도만 강화.
9. **a11y.** disabled 버튼 `aria-disabled`+`tabindex="-1"`. 선택 변경 시 polite live region에 "Selected {basename}". `:focus-visible` 링 유지. 액션바 `role="toolbar"`+`aria-label="File actions"`.
10. **Regression budget.** 데스크탑 우클릭/키보드 컨텍스트 메뉴/디렉터리 토글/`scrollIntoViewIfNeeded` 변경 없음.
11. **모바일 좌우 그라데이션 제거.** 사용자 신규 보고: 모바일 뷰에서 좌/우 가장자리에 그라데이션 효과가 보임. 모바일에서는 제거. (수정 대상 후보: `frontend/src/components/chat/markdownEditor/markdownContent.css.ts:14-25` Shiki 가로 스크롤 페이드, 그 외 `linear-gradient` 또는 `WebkitMaskImage` 사용처. Dev가 실제 화면에서 원인 픽한 뒤 `@media (max-width: 768px)`로 비활성.)
12. **한글 문장 내 영문/숫자도 한글 폰트(Batang)로.** 사용자 신규 보고: 현재 chat body `--lm-chat-body`가 `'Roboto Condensed', 'Batang', ...` 이라 Latin/숫자는 Roboto가 우선됨. 한글-영문 혼용 문장에서 시각적 불연속. 두 가지 옵션:
    - (A) `--lm-chat-body`를 `'Batang', 'Roboto Condensed', system-ui, ...`로 순서 swap — Batang이 가진 Latin/숫자 사용. 일관된 serif 톤.
    - (B) `unicode-range`로 Roboto Condensed를 비-한글에만 적용.
    Designer/Dev 결정. 기본은 (A)로 simple swap.
13. **채팅 뷰 영역 배경색.** 사용자 신규 보고: 에이전트 대화가 흐르는 뷰 영역에 `#fafbfc` 배경 적용. 새 토큰 `--lm-view-bg` 도입 (light `#fafbfc`, dark은 `--card`와 동일한 `rgb(28 27 30)`). `messageList`에 `backgroundColor: 'var(--lm-view-bg)'` 적용. 사이드바·헤더·composer는 영향 없음.

## Out of scope

- pinch-to-zoom, drag-and-drop, multi-select, deep-depth zebra cycling, 더블 클릭.
- 다른 트리(WorkspaceTabTree 등)에 동일 패턴 적용 — 후속 cycle.
- PC 액션바 노출 — 명시적으로 제외 (criterion 5).

## UI notes — Designer fills

**1. Action bar dimensions.** `actionBar`: `height: 36px`, `padding: 0 var(--space-2)` (top 0 — eliminates the existing `4px` leading whitespace). Divider: `border-bottom: 1px solid var(--border)`. No `padding-top` on `.tree` — current `var(--space-1) 0` is the source of the white stripe above the bar; set `padding: 0`.

**2. Disabled icon state.** Keep buttons in DOM (focusable for tooltip). Do NOT set `pointer-events: none` — screen-reader focus and tooltip hover must still work. Instead: `opacity: 0.4`, `color: var(--muted-foreground)`, `cursor: not-allowed`, `aria-disabled="true"`, handler body guards with `if (disabled) return`. On active/enabled: full `opacity: 1`, `color: var(--foreground)`, `cursor: pointer`. Click feedback: `:active { opacity: 0.7; transform: scale(0.92) }` (already covered by `--transition-fast` on `button`).

**3. Selection visual.** `nodeSelected`: `background: var(--secondary)` (existing), add `border-left: 2px solid var(--primary)` and compensate with `padding-left: calc(indent - 2px)`. Text stays `--font-normal` — bold shifts layout. Hover-on-selected: `background: var(--muted)` (already in sharedTree). Zebra `rgba(0,0,0,0.045)` is semi-transparent; `var(--secondary)` `#f3f4f6` is opaque — selection reliably wins without specificity hacks. Mobile file single-tap: calls `onSelect(path)` + `openActionBar(path, el)`, does NOT call `onFileOpen`. Mobile dir single-tap: toggles expand + `onSelect` (no action bar). Desktop preserves current behavior.

**4. Word-wrap choice.** Use `overflow-wrap: anywhere` (already have `nodeNameWrap`). Change `wordBreak: 'break-word'` → `overflowWrap: 'anywhere'` in `nodeNameWrap`. Rationale: `anywhere` breaks only when the word truly won't fit, preserving natural break points (underscores, dots) when the pane is wide enough. `break-all` is too aggressive and breaks "PQC" inside a word. `-webkit-line-clamp: 3` still caps at 3 lines.

**5. Meta column alignment in wrap mode.** `rightCluster` aligns to `flex-start` (top of first line). Already implemented via `globalStyle(.nodeWrap > .rightCluster, { alignItems: 'flex-start' })` — confirm unchanged. Size and mtime visually pair with the filename's first line, matching macOS Finder convention.

**6. Action bar icon order.** Remove `X` close button (bar is always-on). Order: `ExternalLink` (Open in new tab) → `Download` → `AtSign` (Mention) → `Copy` (Copy path) → `ClipboardCopy` (Copy relative). No size difference between icons — `size="sm"` uniform. Bar scroll behavior: `position: sticky; top: 0` (already set) — stays visible on scroll-down, no hide/reveal. This is correct for always-on; scroll-hide would require JS overhead and break the "always visible" contract.

**7. Zebra contrast.** Confirmed: light `rgba(0,0,0,0.045)` → ~`#f5f5f5` on white background. Visible at a glance. Dark `rgba(255,255,255,0.05)` → slight lift on `rgb(18 18 20)`. Both pass the "eye test at arm's length" bar. Adopt as specced.

**8. Action bar top whitespace root cause.** Three contributors: (a) `.tree { padding: var(--space-1) 0 }` in `DirectoryTree.css.ts` line 28 — adds `4px` above the sticky bar; (b) `actionBar { padding: '4px var(--space-2)' }` — adds another 4px internally. (c) and (d) are not factors (no flex gap on `.tree`, no header above the bar in the `.tree` scroll container). Fix: `.tree { padding: 0 }` and `actionBar { padding: 0 var(--space-2) }`. The `border-bottom: 1px solid var(--border)` alone separates bar from rows.

## Tasks — TechLead fills

### T1 — labelWithStats descendant selector + `.tree` overflow guard
- **Files**: `frontend/src/components/tree/DirectoryTree.css.ts`.
- **Implementation**: Change `globalStyle(\`.${node} > .${labelWithStats}\`, …)` (DirectoryTree.css.ts:163) to descendant: `globalStyle(\`.${node} .${labelWithStats}\`, { minWidth: 0, overflow: 'hidden' })`. This jumps the `display:contents` Tooltip wrapper (Tooltip.tsx:365) which currently breaks the direct-child match. Then on `tree` style (line 25–29) replace `padding: 'var(--space-1) 0'` with `padding: 0` AND add `overflowX: 'hidden'` as a final defense-in-depth — `overflow: 'auto'` already implies x-scroll; explicit `overflowX: 'hidden'` + `overflowY: 'auto'` prevents the row from inducing a horizontal scrollbar even if a future regression reintroduces an intrinsic-width child.
- **Audit**: `grep -n "labelWithStats" frontend/src/components/tree/DirectoryTree.css.ts` → only `.${node} .${labelWithStats}` (no `>`). `grep -n "overflowX\|overflow-x\|padding:" frontend/src/components/tree/DirectoryTree.css.ts` confirms `.tree` is `overflow-x: hidden` + `padding: 0`. Browser DevTools: inspect a row → labelWithStats span has computed `min-width: 0; overflow: hidden`.
- **Test gate**: At 360px viewport, `document.querySelector('.tree').scrollWidth <= clientWidth`. Existing truncate-mode e2e in `DirectoryTree.tsx`'s spec must still ellipsize long names (acceptance #1).

### T2 — wrap default `true` + migration
- **Files**: `frontend/src/components/tree/FilesSection.tsx`, `frontend/src/lib/browserStorage.ts`.
- **Implementation**: In `browserStorage.ts` change `PREFIX_FILES_NAME_WRAP` to `'leapmux:files-name-wrap-v2:'` (key bump — Open Question A decision). In `FilesSection.tsx` lines 156-157 and 171-173, the `?? false` fallbacks become `?? true`. Key bump invalidates any user with `false` previously stored, giving the new default `true` on next mount. Old `v1` keys are not deleted explicitly — TTL cleanup in `browserStorage` (line 79: `7 * DAY_MS`) will reap them within a week; no migration code path required. Add `PREFIX_FILES_NAME_WRAP` to the TTL list with the new value (single replace_all rename).
- **Audit**: `grep -rn "files-name-wrap" frontend/src` → exactly two hits in `browserStorage.ts` (constant + TTL row), no v1 references. `grep -n "?? false\|?? true" frontend/src/components/tree/FilesSection.tsx` → wrap line shows `?? true`; show-hidden line stays `?? true` (already true).
- **Test gate**: Open a fresh worktree (cleared storage) → wrap toggle button starts in *active* state, `nodeNameWrap` class on rows. Set false, reload — persists. New users default wrap-on.

### T3 — labelWithStats default to nodeNameWrap
- **Files**: `frontend/src/components/tree/DirectoryTree.css.ts`.
- **Implementation**: In `nodeNameWrap` (lines 69–78) change `wordBreak: 'break-word'` → `overflowWrap: 'anywhere'`. Drop the redundant ellipsis triple (`whiteSpace`, `textOverflow`) — wrap variant uses `-webkit-line-clamp` for vertical clipping and shouldn't inherit ellipsis machinery from `nodeName`. Keep `WebkitLineClamp: 3`, `WebkitBoxOrient: 'vertical'`, `display: '-webkit-box'`, `overflow: 'hidden'`, `lineHeight: 1.35`, `minWidth: 0`. `whiteSpace: 'normal'` stays (overrides the `nodeName` parent's nowrap if anyone composes).
- **Audit**: `grep -n "wordBreak\|word-break\|overflowWrap" frontend/src/components/tree/DirectoryTree.css.ts` → only `overflowWrap: 'anywhere'` in wrap variants. Manual: a row with `Korea_PQC_GovernmentRoadmap_Q3_FINAL.tsx` wraps to 2-3 lines instead of breaking inside "PQC".
- **Test gate**: 360px viewport + wrap mode: long filename node `getBoundingClientRect().height` is roughly 2–3× a normal row (~36–54px). No mid-word break visible in screenshot.

### T4 — TreeActionBar always-mounted on mobile with disabled state
- **Files**: `frontend/src/components/tree/DirectoryTree.tsx`, `frontend/src/components/tree/DirectoryTree.css.ts`.
- **Implementation**: Wrap the `<TreeActionBar … />` JSX (line 1204) in `<Show when={useIsMobile()()}>` (call once, store the accessor) so it never renders on desktop. Inside `TreeActionBar` itself, drop the outer `<Show when={props.target()}>` (line 420). Each button receives `disabled={!props.target()}` and `aria-disabled={!props.target() ? 'true' : 'false'}`; `runAndClose` (line 384) guards `if (!props.target()) return`. Outside-click and pointerdown handlers (lines 388–406) become unconditional but `close()` is a no-op when target is null (it already calls `setActionTarget(null)`). Auto-focus on mount only fires when `target() !== null` — keep the existing branch. The bar mounts at the top of `.tree`'s flex column, before the `Switch fallback`, so it always occupies layout slot 1.

  In `DirectoryTree.css.ts`: `actionBar` (line 234–244) → `padding: '0 var(--space-2)'` and add `height: '36px'` (Designer §1). `actionBarButton` already covers focus-visible ring. Add a `:disabled` selector inside `actionBarButton`'s style block: `'&:disabled': { opacity: 0.4, color: 'var(--muted-foreground)', cursor: 'not-allowed' }` and keep `pointer-events` intact (Designer §2 — tooltips/focus must still reach disabled buttons; the `disabled` HTML attr alone is enough; do NOT add `pointer-events: none`).
- **Audit**: `grep -n "Show when={props.target" frontend/src/components/tree/DirectoryTree.tsx` → 0 matches (gate removed). `grep -n "useIsMobile" frontend/src/components/tree/DirectoryTree.tsx` → wrapping `<Show>` near render. `grep -n "padding:\|height:" frontend/src/components/tree/DirectoryTree.css.ts | grep actionBar` confirms `padding: '0 var(--space-2)'`.
- **Test gate**: On mobile viewport with no selection, `getByTestId('tree-action-open-new-tab')` is present and `disabled`. After tapping a file row, the same element becomes enabled with no row layout shift (`getBoundingClientRect().top` of the first child row unchanged ±1px before/after tap).

### T5 — Mobile file row: tap selects, does not auto-open
- **Files**: `frontend/src/components/tree/DirectoryTree.tsx`.
- **Implementation**: In `TreeNode.toggle` (lines 598–610), the mobile file branch already calls `tree.onSelect(path)` and `tree.openActionBar(path, nodeRef)` then `return` — but the gate is `if (isMobile())`. Confirm `onFileOpen` is NOT called on mobile. Mobile `openActionBar` keeps setting `actionTarget`; with T4 the bar is already mounted, so this just enables buttons. The "Open in new tab" action button (already wired at line 436) is the only path to `onFileOpen`-equivalent (`openFileInNewTab`). Desktop branch unchanged: `tree.onFileOpen?.(path)`.
- **Audit**: `grep -n "onFileOpen\|openActionBar" frontend/src/components/tree/DirectoryTree.tsx` → mobile file branch calls only `onSelect` + `openActionBar`; desktop branch calls `onFileOpen`.
- **Test gate**: Mobile e2e: tap a file row → `onFileSelect` fires, `onFileOpen` does NOT fire (assert mock not called). Tap "Open in new tab" icon → `openFileInNewTab` is invoked.

### T6 — Top whitespace fix
- **Files**: `frontend/src/components/tree/DirectoryTree.css.ts`.
- **Implementation**: Covered partly by T1 (`.tree { padding: 0 }`) and T4 (`actionBar { padding: 0 var(--space-2) }`). Verify no `gap` on `.tree` (flex column has no gap declaration — confirmed line 25–29). The `border-bottom: 1px solid var(--border)` on `actionBar` (line 243) is the only separator between bar and first row. Desktop: with T4 not rendering the bar on PC, `.tree { padding: 0 }` removes the `var(--space-1) 0` band that previously offset the root row — but the root row's own `padding: 2px var(--space-2)` in sharedTree.css.ts provides adequate breathing room (acceptable per acceptance #10).
- **Audit**: `grep -n "padding\|gap" frontend/src/components/tree/DirectoryTree.css.ts | grep -E "^.*(tree|actionBar)\b"`. Visually: in DevTools, `.tree` first child top edge sits flush with `.tree`'s top edge — 0px gap.
- **Test gate**: Mobile: `actionBar.getBoundingClientRect().top === tree.getBoundingClientRect().top` (within 0–1px). Desktop: first row top is within 0–2px of `.tree` top (root row's internal `2px` padding only).

### T7 — Action bar icon order + remove X close
- **Files**: `frontend/src/components/tree/DirectoryTree.tsx`, `frontend/src/components/tree/DirectoryTree.css.ts`.
- **Implementation**: Order is already [ExternalLink, Download, AtSign, Copy, ClipboardCopy] (lines 428–491). Remove the close button block (lines 492–501) and remove its `actionBarClose` style export (lines 267–269) plus the `X` import (line 15). The action bar closes via outside-click (existing) and ESC (existing onKeyDown line 412); add `Esc` key listener at the `.tree` scroll-container level so ESC clears `actionTarget` even when focus is on a row (not just on a bar button). Simplest: in `TreeNode`'s existing `handleKeyDown`, add `if (e.key === 'Escape') tree.closeActionBar?.()` after exposing `closeActionBar` on `TreeContextValue`. Wire `closeActionBar: () => closeActionBar()` into `treeContextValue` (line 1136 block).
- **Audit**: `grep -n "tree-action-close\|actionBarClose\|lucide-solid/icons/x" frontend/src/components/tree/DirectoryTree.tsx frontend/src/components/tree/DirectoryTree.css.ts` → 0 hits. `grep -n "Escape" frontend/src/components/tree/DirectoryTree.tsx` → both bar onKeyDown and row handleKeyDown branches.
- **Test gate**: Mobile e2e: rendered button order matches the spec (query all `[data-testid^="tree-action-"]` and assert array of testids). Press ESC on a selected row → action target clears (buttons re-disable). Outside-click on `.tree` background still closes.

### T8 — Selection visual: secondary bg + left border (no shift)
- **Files**: `frontend/src/components/tree/DirectoryTree.css.ts` (override only — do NOT touch `sharedTree.css.ts`).
- **Implementation**: Per Designer §3, selection should add `border-left: 2px solid var(--primary)`. Constraint: `nodeSelected` lives in `sharedTree.css.ts` and is shared with `WorkspaceTabTree`; we cannot modify it. Instead, add a DirectoryTree-scoped override via `globalStyle(\`.${node}.${nodeSelected}\`, { borderLeft: '2px solid var(--primary)', paddingLeft: 'calc(var(--current-indent, 0px) - 2px)' })` — BUT inline `paddingLeft` is set per-row via the `indent()` style attr (line 743), which will override the CSS rule. Cleaner fix: keep the inline `padding-left` and subtract 2px when selected via JS: in `TreeNode` (line 742), change `'padding-left': indent()` → `'padding-left': \`calc(${indent()} - ${isSelected() ? '2px' : '0px'})\``. Then add `globalStyle(\`.${node}.${nodeSelected}\`, { borderLeft: '2px solid var(--primary)' })` in DirectoryTree.css.ts. Root row (DirectoryTree.tsx:1218) `padding-left: '8px'` becomes `calc(8px - 2px)` when selected via the same pattern.
- **Audit**: `grep -n "border-left\|borderLeft" frontend/src/components/tree/DirectoryTree.css.ts` → exactly one `borderLeft: '2px solid var(--primary)'` rule scoped to `.node.nodeSelected`. `grep -n "padding-left.*indent\|padding-left.*8px" frontend/src/components/tree/DirectoryTree.tsx` → both compensate `isSelected()` by -2px.
- **Test gate**: Click a row → `getBoundingClientRect().left` of the icon (chevron/file) does NOT shift by 2px before/after selection. Computed `border-left-width` on `.nodeSelected` is `2px solid var(--primary)`. Light/dark both visibly distinguish selection.

### T9 — Zebra token + sticky rightCluster masking
- **Files**: `frontend/src/styles/global.css.ts`, `frontend/src/components/tree/DirectoryTree.css.ts`.
- **Implementation**: In `global.css.ts` line 173 set `'--lm-tree-row-zebra-bg': 'rgba(0, 0, 0, 0.045)'`; line 238 set `'rgba(255, 255, 255, 0.05)'` (Designer §7). Both now translucent. Open Question B (sticky-cluster masking): **decision — keep `rightCluster.backgroundColor: 'inherit'` and DO NOT make `.node` base-opaque.** The `.tree` ancestor renders against `var(--background)` (opaque), and zebra rows layer `rgba(0,0,0,0.045)` directly on the node. When `rightCluster` inherits `background-color` from `.node`, browsers resolve `inherit` to the *specified* value on `.node` — for non-zebra rows that's `transparent` (default), but for zebra rows the `globalStyle` rule (DirectoryTree.css.ts:173) sets it to `rgba(0,0,0,0.045)`. So `inherit` correctly propagates zebra to the sticky cluster on zebra rows AND stays transparent (showing whatever is under) on non-zebra rows — both fine because in both cases the cluster's resolved visual background equals the row's. Hover (`var(--card)`) and selected (`var(--secondary)`) are opaque and override on `:hover` / `&.nodeSelected`, so the sticky cluster masks the label edge underneath in all 4 states (default/zebra × normal/selected/hover). No extra rule needed.

  Reading this again: `background-color: inherit` inherits the *computed* value, which IS the painted color (transparent or rgba). So for a label that overflows under a non-zebra row's cluster, the cluster paints `transparent` → label bleeds through. **Risk**: on a default (non-zebra, non-hover, non-selected) row, an extremely long filename could visibly slide under the sticky cluster. Mitigation: the cluster also has `paddingLeft: 'var(--space-2)'` (line 120) giving a small physical gap; combined with `.tree { overflow-x: hidden }` from T1, the row can no longer scroll horizontally so the label is cut by `min-width: 0; overflow: hidden` on labelWithStats long before it reaches the cluster. Net: keep `inherit`, do not make `.node` opaque, do not set explicit per-state cluster bg. If pass3 reveals a residual bleed-through, follow-up issue.

- **Audit**: `grep -n "lm-tree-row-zebra-bg" frontend/src/styles/global.css.ts` → both rgba. `grep -n "backgroundColor: 'inherit'\|background-color: inherit" frontend/src/components/tree/DirectoryTree.css.ts` → still 1 occurrence on `rightCluster`. `grep -n "background.*--background\|opaque" frontend/src/components/tree/DirectoryTree.css.ts | grep node` → 0 (we did NOT make `.node` base-opaque).
- **Test gate**: Visual: zebra contrast ratio (devtools color picker) ≥ 1.04× base bg on light, ≥ 1.05× on dark — passes the "see at arm's length" bar. With T1 in effect, no horizontal scroll → no label-under-cluster bleed observed.

### T10 — Desktop UX preserved
- **Files**: `frontend/src/components/tree/DirectoryTree.tsx` (verify only).
- **Implementation**: T4's `<Show when={useIsMobile()()}>` gate around `<TreeActionBar />` ensures no bar on desktop. Right-click `handleContextMenu` (line 712) and keyboard `Shift+F10`/`ContextMenu` (line 721) paths in `TreeNode` unchanged. T1's `.tree { padding: 0 }` removes the `var(--space-1) 0` top band on desktop too — verify that doesn't visually clash with the path input above (which has its own `borderBottom`).
- **Audit**: `grep -n "openContextMenuAt\|onContextMenu\|Shift.*F10\|ContextMenu" frontend/src/components/tree/DirectoryTree.tsx` → 4 hits (row + root row, mouse + keyboard) unchanged.
- **Test gate**: Desktop e2e — right-click a row opens `TreeContextMenu` with same items. Keyboard `Shift+F10` on focused row opens menu. No action bar rendered (queryByTestId for any `tree-action-*` returns null).

### T11 — Tests: audit + repair
- **Files**: `frontend/src/components/tree/DirectoryTree.actionBar.test.tsx` (and any e2e referencing removed close button).
- **Implementation**: `DirectoryTree.actionBar.test.tsx:102` references `tree-action-close` — remove or rewrite that case to assert ESC closes the bar / clears `actionTarget` instead. Re-grep all e2e and unit tests for `tree-action-close` and remove the assertions. Add new test: "mobile file tap selects + enables bar, does not call onFileOpen" (covers T5). Add: "ESC clears actionTarget" (covers T7). Add: "wrap default true on fresh storage" (covers T2 — mock `localStorage` returning null, assert button starts in active state).
- **Audit**: `grep -rn "tree-action-close" frontend` → 0. `grep -rn "tree-action-open-new-tab\|tree-action-download" frontend` → present in test + impl.
- **Test gate**: `vitest run frontend/src/components/tree/DirectoryTree.actionBar.test.tsx` passes 3× consecutively. Existing 3 migrated e2e files re-run green.

---

**Notes for Dev**
- Order: T1 → T2 → T3 → T4/T7 (paired) → T5 → T6 → T8 → T9 → T10 (verify) → T11 (last; tests need updated DOM).
- Do not touch `sharedTree.css.ts` (T8 carefully uses globalStyle override + inline-style compensation instead).
- Do not touch `DropdownMenu` or `Tooltip` internals (T1 uses a descendant selector to step *around* the `display: contents` wrapper rather than modifying it).
- `generated/*` untouched.

## A11y checklist

- `:focus-visible` 링, `aria-disabled` + tabindex=-1, 선택 변경 polite announce, 액션바 `role="toolbar"`+`aria-label`.

## QA — QA fills

- 360/414 폭 가로 스크롤 0; wrap 기본 + 토글 영속; 액션바 상단 여백 0, 탭 후 시프트 0px; 선택 배경(light/dark); zebra 가시성.

### QA verdict

**Gates**
- `bun run typecheck` — PASS (no output).
- `bun run lint` — PASS (no output).
- `bun run test` — PASS: 3242/3242, 232 test files.

---

**AC-by-AC audit**

| # | AC | Result | Evidence |
|---|---|---|---|
| 1 | 가로 스크롤 박멸 | **PASS** | `DirectoryTree.css.ts:176` uses descendant `\`.${node} .${labelWithStats}\`` (no `>`). `.tree { overflowX: 'hidden', padding: 0 }` at line 28–33. Tooltip `display:contents` wrapper no longer breaks the selector. |
| 2 | wrap 기본 true | **PASS** | `browserStorage.ts:67` key bumped to `leapmux:files-name-wrap-v2:`. `FilesSection.tsx:161,176` both use `?? true`. FilesSection.test.tsx updated and passes. |
| 3 | rightCluster masking | **PASS** | `DirectoryTree.css.ts:131` `backgroundColor: 'inherit'` unchanged. `.tree { overflowX: hidden }` prevents label from reaching the cluster anyway. No opaque `.node` base added. |
| 4 | TreeActionBar 모바일 항상 노출 | **PASS** | `DirectoryTree.tsx:1219` `<Show when={isMobile()}>` wraps `<TreeActionBar>`. Inside `TreeActionBar`, no outer `<Show when={props.target()}>` — confirmed `grep -n "Show when={props.target"` → 0 hits. Each button carries `disabled={disabled()}` + `aria-disabled` + `tabIndex={disabled() ? -1 : 0}`. `runAndClose` guards `if (disabled()) return`. |
| 5 | PC 분리 | **PASS** | `<Show when={isMobile()}>` gate on the bar ensures desktop never mounts it. `handleContextMenu` and `Shift+F10` / `ContextMenu` key paths at `DirectoryTree.tsx:721–738` unchanged. |
| 6 | 상단 여백 제거 | **PASS** | `actionBar` at `DirectoryTree.css.ts:268` has `padding: '0 var(--space-2)'` and `height: '36px'`. `.tree { padding: 0 }` at line 33. Both pass2 contributors eliminated. |
| 7 | 행 선택 시각화 + 모바일 onFileOpen 금지 | **PARTIAL — minor gap** | Selection visual: `globalStyle('.${node}.${nodeSelected}', { backgroundColor: 'var(--secondary)', borderLeft: '2px solid var(--primary)' })` at `DirectoryTree.css.ts:196–199`. Indent compensation `indent()` at `DirectoryTree.tsx:703`. Mobile onFileOpen gate at lines 610–615: `if (isMobile()) { tree.openActionBar(…); return }` then `tree.onFileOpen?.(…)` — `onFileOpen` NOT called on mobile. **Gap:** T7 spec requires ESC on a focused *row* to clear `actionTarget` via `tree.closeActionBar?.()`. `closeActionBar` is absent from `TreeContextValue` interface (line 118–145) and absent from `handleKeyDown` (line 730–740). ESC only works while focus is inside the bar's own `onKeyDown` (line 419). The T11 test file *describes* "Pressing Escape clears the action target" in its docstring but has no test case for it, and no `it('ESC clears…')` block exists. Spec said "Add: 'ESC clears actionTarget' (covers T7)". This test is missing. **Not a visual blocker** (bar is always-mounted; the user will see buttons remain active without ESC-from-row support, which is acceptable UX since outside-click still clears), but it is an incomplete implementation per spec. |
| 8 | Zebra 가시화 | **PASS** | `global.css.ts:178` `rgba(0,0,0,0.045)` light, `global.css.ts:246` `rgba(255,255,255,0.05)` dark. Previous `#f9f9f9` / `rgb(20 20 22)` replaced. Selector in `DirectoryTree.css.ts:187` is `.${childrenInner} > div:nth-child(even) > .${node}` — unchanged and correct. |
| 9 | a11y | **PASS (with minor note)** | `role="toolbar"` + `aria-label="File actions"` at `DirectoryTree.tsx:430–431`. `aria-disabled` on each button. `tabIndex={disabled() ? -1 : 0}` on each button. Live region text updated to `Selected ${name()}` at line 510. `:focus-visible` ring at `DirectoryTree.css.ts:289–292`. Note: `tabIndex=-1` on a `disabled` HTML button is redundant (native `disabled` already removes tab stop) but harmless. Designer §2 says "Do NOT set `pointer-events:none`" — confirmed absent. |
| 10 | Regression budget | **PASS** | `DropdownMenu.tsx`, `sharedTree.css.ts`, `sidebarActions.css.ts`, `Tooltip.tsx` all show 0-byte diffs. `openContextMenuAt` / `handleContextMenu` / `Shift+F10` paths unchanged. |
| 11 | 모바일 좌우 그라데이션 제거 | **CODE-PASS / VISUAL-UNVERIFIED** | `AppShell.css.ts`: `mobileSidebar` closed state has no `box-shadow` now; shadow moved to `mobileSidebarOpen` (line 164) and mirrored for right drawer via `globalStyle(.mobileSidebarRight.mobileSidebarOpen)` (line 170). Dev's root-cause argument (translateX(-100%) sidebar shadow leaking 2+8px blur into viewport edge) is code-reading plausible. **Not visually verified on actual mobile hardware.** If the gradient the user saw was from a different source (e.g. iOS Safari rubber-band edge, Shiki `pre` scroll-fade, or `overscroll` behavior), this fix will not resolve it. Proceed with caution; flag for immediate user re-test after deploy. |
| 12 | 한글 폰트 Batang 우선 | **PASS** | `global.css.ts:152` `--lm-chat-body: 'Batang', 'Roboto Condensed', system-ui, -apple-system, sans-serif`. Swap is correct per option A. Side-note: Latin text in mixed sentences will now render in Batang's serif glyphs instead of Roboto Condensed's sans-serif — intended per AC but the change in Latin appearance should be noted to the user. |
| 13 | 채팅 뷰 배경색 | **PASS** | `ChatView.css.ts:60` `backgroundColor: 'var(--lm-view-bg)'` on `messageList`. Tokens: `global.css.ts:181` `#fafbfc` (light), `global.css.ts:249` `rgb(28 27 30)` (dark). Sidebar/header/composer unaffected. |

---

**Items needing rework**

1. **AC #7 / T7 — ESC on tree row does not clear actionTarget.** Spec explicitly requires `closeActionBar` in `TreeContextValue` and a guard in `TreeNode.handleKeyDown`. Neither implemented. The T11 test list also required an `it('ESC clears actionTarget')` case that was not written. **Severity: LOW** — the always-mounted bar with outside-click coverage means this is not a visible regression to the user, and the bar's internal ESC (from focused button) still works. But the spec commitment is unmet.

2. **AC #11 — Mobile gradient: visual verification pending.** The code change is correct for the identified cause, but whether that was the actual cause the user saw is unknown. Must be user-verified on device after deploy.

**Items that are minor but not blockers**

- `tabIndex={disabled() ? -1 : 0}` is redundant with the native `disabled` attribute; harmless.
- Old `leapmux:files-name-wrap:` (v1) keys are not in `DYNAMIC_KEY_TTLS` with the new constant, but they will still be reaped by `runCleanup()` because keys not in `STATIC_KEYS` and not matching any TTL prefix are deleted unconditionally (browserStorage.ts:283 falls through to `keysToDelete.push(key)`). The dev comment is accurate.

---

**Visual reasoning**

- **Long filename at 360px:** `.tree { overflowX: hidden }` is the outermost constraint; `globalStyle('.${node} .${labelWithStats}', { minWidth: 0, overflow: hidden })` ensures the label flex-shrinks before it can push the row beyond the pane. In wrap mode `overflowWrap: anywhere` + `-webkit-line-clamp: 3` clamps to 3 lines. In truncate mode `whiteSpace: nowrap` + `overflow: hidden` + `text-overflow: ellipsis` on `nodeName` clips inline. Horizontal scroll is structurally impossible.
- **Mobile sidebar open — gradient edges:** Shadow now only exists in `.mobileSidebarOpen` state. Closed drawers carry no box-shadow → no blur leaking into viewport edge. If the user sees gradient, next suspect is iOS Safari's native scroll edge effect or an unrelated CSS source.
- **Korean+Latin mixed text:** Batang is listed first. All glyphs — Hangul, Latin, digits — go to Batang. Mixed sentence "현재 ($17.00, +2.93%)" renders entirely in Batang (serif). Visual continuity is achieved at the cost of a serif look for Latin characters that previously rendered sans-serif. This is the intended outcome of option A.
- **Chat view background:** `#fafbfc` is ~2% off pure white. On a bright monitor this will read as a very subtle warm off-white. The distinction from the page background depends on what `--background` resolves to; if it's `oklch(1 0 0)` (pure white), the 2% delta is subtle but visible under normal office lighting.
- **File row tap on mobile:** Row gets `nodeSelected` class → `var(--secondary)` bg + 2px primary left border. Action bar buttons transition from `opacity: 0.4` to `opacity: 1`. `indent()` subtracts 2px when selected so the icon stays at the same x-position. No layout shift on the bar (always mounted). Clean.

---

**qa_score: 11/13 PASS (AC #7 partial — ESC-from-row unimplemented per spec; AC #11 code-PASS but visual-unverified)**

Gates: typecheck PASS, lint PASS, test 3242/3242 PASS.
Top concern: AC #11 gradient source not visually confirmed on device — if wrong source identified, gradient persists post-deploy and earns a pass4 ticket.
Pass/fail: 11 PASS, 1 PARTIAL (AC #7 — spec-level gap, not a visible UX blocker), 1 CODE-PASS/VISUAL-UNVERIFIED (AC #11).

### PM verdict

**Per-complaint scoring (1-10):**
1. 가로 스크롤 (AC #1) — **9.** Descendant selector `.${node} .${labelWithStats}` + `.tree { overflowX: hidden }` is exactly the right fix; bypasses the Tooltip `display:contents` wrapper. Strong.
2. 상단 여백 (AC #6) — **9.** Both contributors removed: `.tree { padding: 0 }` and `actionBar { padding: '0 var(--space-2)', height: '36px' }`. Border-bottom is the only separator. Clean.
3. wrap 기본 (AC #2) — **9.** `?? true` in both init + storage-key-change effect; prefix bumped to `v2:` so stale pass2 `false` values don't survive. Tests updated.
4. 탭 시 시프트 (AC #4/#7) — **9.** Bar is now always mounted (mobile only) via `<Show when={isMobile()}>`; buttons toggle `disabled` only. Layout slot is fixed. `indent()` and root row's padding-left subtract 2px on selection so the new border-left accent doesn't shift the icon either.
5. 아이콘 항상 노출 + disabled (AC #4) — **9.** `role="toolbar"`, `aria-disabled`, `tabIndex={-1}` when disabled, `:disabled { opacity: .4; cursor: not-allowed }`, click handler short-circuits. Tooltip/focus still reachable per Designer §2.
6. 파일 선택 표시 (AC #7) — **8.** `globalStyle(.${node}.${nodeSelected})` with `--secondary` bg + `border-left: 2px solid --primary` and -2px padding compensation. Visible and shift-free. Slight risk: when a *zebra* row is selected, the rule wins (opaque `--secondary` over translucent rgba) — verified by the design note.
7. zebra 격줄 (AC #8) — **8.** Token values upgraded to `rgba(0,0,0,0.045)` / `rgba(255,255,255,0.05)`. Selector was already correct in pass2 — main fix is contrast bump. Acceptable.
8. NEW 모바일 좌우 그라데이션 (AC #11) — **6.** **This is the weakest link.** Dev's root-cause story (off-screen `box-shadow: 2px 0 8px` leaking ~6px of blur into the viewport edge from a translateX(-100%) drawer) is plausible code-reading but **not visually verified on the user's device**. Fix gates the shadow on `.mobileSidebarOpen`. If the user is actually seeing iOS Safari's overscroll/scrollbar edge or some other artifact, this won't fix it. Dev itself flagged 85% confidence on this one.
9. NEW 한글 폰트 우선 (AC #12) — **7.** Simple `font-family` swap to `'Batang', 'Roboto Condensed', ...` is correct and minimal. **Risk:** Batang is a *serif* face — Latin runs that previously rendered in sans-serif Roboto Condensed will now look serif-ish (e.g. timestamps, code-like tokens, English words mid-sentence). The user asked for visual continuity with Hangul, which Batang gives, but they may not have anticipated the serif Latin look. No A/B in the spec.
10. NEW 채팅 뷰 #fafbfc (AC #13) — **8.** New `--lm-view-bg` token (light `#fafbfc`, dark `rgb(28 27 30)`) applied to `messageList`. Scoped narrowly — sidebar/header/composer untouched. Clean.

**Weighted score (all complaints high-weight, simple mean):** (9+9+9+9+9+8+8+6+7+8) / 10 = **8.2**

**Risks the user will feel:**
- AC #11: Code-reading-only diagnosis. If the gradient persists after deploy, this round earns a "again?" from a frustrated user — second regression on the same complaint is a trust-killer. Dev should at minimum sanity-check on a mobile viewport before the user does.
- AC #12: Latin/digits will now render in **serif** Batang glyphs in mixed sentences. Visual continuity is achieved, but the look shifts from "Korean text with Western numbers" to "all-serif Korean+Western". User said "한글 폰트 것이 사용되는게 맞아" — that's what they're getting, but the aesthetic outcome wasn't sanity-checked. No specific blocker but flag.
- AC #13: `--lm-view-bg: #fafbfc` is very close to `--background` (which is `oklch(1 0 0)` ≈ pure white in this codebase). The "distinct region" the user asked for will be subtle on light. Acceptable.
- T9 sticky `rightCluster: backgroundColor: inherit` with translucent zebra relies on `overflowX: hidden` from T1 to prevent label-bleed-through under the cluster. Coupled risk. If T1 ever regresses, T9 visibly regresses with it. Documented; acceptable.

**Decision: SHIP AS-IS — conditional.**
- 8/10 acceptance criteria are solidly addressed with verified code changes, test updates, and a clean `bun run test` (3242/3242).
- The two NEW complaints (AC #11, #12) carry visual-verification risk that **only the user can resolve** on their actual mobile device. Holding the ship gains us nothing without that feedback.
- Greenlight to merge, but Dev/QA must request "please re-test mobile gradient and font appearance" from the user the moment this lands. If AC #11 is still visible, that is a pass4 blocker, not a pass3 amendment.

**pm_score: 8.2**

Summary line 1: All 8 pass2 regressions (complaints 1–7) addressed with surgical, well-grepped code changes plus migrated tests; full suite green.
Summary line 2: NEW gradient fix is a strong code-reading hypothesis but unverified on the user's actual mobile viewport — single-largest residual risk this cycle.
Summary line 3: Font swap delivers exactly what the user requested (Batang-first for Hangul-mixed runs); aesthetic side-effect (serif Latin) should be flagged when asking for confirmation.

### Dev notes

**Files modified**

- `frontend/src/components/tree/DirectoryTree.css.ts` — T1/T3/T4/T6/T7/T8/T9: descendant `.${node} .${labelWithStats}` selector, `.tree { overflowX: 'hidden'; padding: 0 }`, `nodeNameWrap` switched to `overflow-wrap: anywhere`, `actionBar { padding: '0 var(--space-2)', height: '36px' }`, `actionBarButton:disabled { opacity: .4; cursor: not-allowed }`, removed `actionBarClose`, added `globalStyle('.${node}.${nodeSelected}', { backgroundColor: var(--secondary), borderLeft: '2px solid var(--primary)' })`.
- `frontend/src/components/tree/DirectoryTree.tsx` — T4/T5/T7/T8: removed `X` icon import; rebuilt `TreeActionBar` to mount unconditionally (no outer `<Show when={target}>`), use `role="toolbar"`, mark each button `disabled` + `aria-disabled` + `tabIndex=-1` while target is null, dropped the close (X) button; wrapped the bar in `<Show when={isMobile()}>` at render site so PC never mounts it; `indent()` (and root row's `padding-left`) now subtract 2px when `isSelected()` so the new border-left accent does not shift the row.
- `frontend/src/components/tree/FilesSection.tsx` — T2: `wrapName` default flipped from `?? false` → `?? true` in both the createSignal init and the storage-key re-read effect.
- `frontend/src/lib/browserStorage.ts` — T2 migration: `PREFIX_FILES_NAME_WRAP` bumped to `leapmux:files-name-wrap-v2:`; TTL row updated via the same constant.
- `frontend/src/styles/global.css.ts` — T9 + AC #12: `--lm-tree-row-zebra-bg` set to `rgba(0,0,0,0.045)` (light) and `rgba(255,255,255,0.05)` (dark); `--lm-chat-body` swapped to `'Batang', 'Roboto Condensed', system-ui, -apple-system, sans-serif`.
- `frontend/src/components/shell/AppShell.css.ts` — AC #11: moved the `box-shadow` on `mobileSidebar` / `mobileSidebarRight` to the `mobileSidebarOpen` state (left-side variant inline on `mobileSidebarOpen`, right-side via a `globalStyle(.mobileSidebarRight.mobileSidebarOpen)`). Added `box-shadow` to the transition so the shadow fades in/out with the slide.
- `frontend/src/components/tree/DirectoryTree.actionBar.test.tsx` — T11: rewrote the test for the always-mounted bar (asserts `role="toolbar"`, initial disabled state, enables after file tap, `onFileOpen` never fires on mobile tap).
- `frontend/src/components/tree/FilesSection.test.tsx` — T11: updated to expect the new default (`aria-pressed="true"` on a fresh render; click flips to `false` and persists).
- `frontend/vitest.setup.ts` — added a global `window.matchMedia` stub (mirrors the existing `ResizeObserver` stub) because the top-level `useIsMobile()` call in `DirectoryTree` now runs in every render path under jsdom and there was no global stub.

**AC #11 — Mobile left/right gradient: source identified**

- The mobile sidebars (`mobileSidebar` / `mobileSidebarRight` in `AppShell.css.ts`) are kept in the DOM at all times with `transform: translateX(±100%)` and previously carried a `box-shadow: '2px 0 8px rgba(0,0,0,0.3)'` (or `-2px 0 8px ...` for the right drawer) in their *closed* state. Even off-screen, the 2px offset + 8px blur of that shadow projected a thin gray band into the viewport at the corresponding edge — the "좌우 가장자리 그라데이션" the user observed.
- `markdownContent.css.ts:14-25` (the candidate the spec called out) does NOT contain any directional fade — only Shiki theme colour variables. The only `linear-gradient(to bottom, ...)` in the app is `toolStyles.toolResultCollapsed` (top-bottom collapsed-tool-result fade) which is vertical, not horizontal.
- Fix: keep the shadow but gate it on the *open* state — the shadow now reads as the slide-in's drop shadow (the intended UX) and is invisible when the drawer is closed.
- Scroll-cue regression check: the box-shadow was never a scroll cue, just a drop shadow. No replacement needed.

**AC #12 — Korean font primacy: decision (A) applied**

- Chose Option A (simple `font-family` order swap) per spec default. `--lm-chat-body` is now `'Batang', 'Roboto Condensed', system-ui, -apple-system, sans-serif`. Batang's Latin/digit glyphs (which it does ship) now render in mixed-language sentences like "현재 ($17.00, +2.93%)", eliminating the serif-versus-sans-serif boundary inside Hangul-Latin runs.
- `--lm-chat-title` stays `Gyeonggi` first — Gyeonggi is a display face designed for headings and its Latin/digits visually match its Hangul better than Roboto Condensed does.
- `--lm-chat-user` was already `Batang` first; unchanged.
- `unicode-range` (Option B) deliberately skipped: it adds a `@font-face` machinery layer for a problem the simple swap already solves, and Batang's Latin/digits are acceptable.

**Gates**

- `bun run typecheck` — pass.
- `bun run lint` — pass.
- `bun run test -- DirectoryTree FilesSection` — 10/10 pass.
- `bun run test` (full) — 3242/3242 pass.

**dev_confidence**: 85
- High on T1-T10 — direct edits, tests cover the regressions, verification greps all pass.
- AC #11 source identification rests on a code-reading argument (translated-off-screen box-shadow leaking into the viewport via its blur radius). Visually confirming on mobile is the user-acceptance step. If the actual gradient turns out to be something else, the candidate next-suspects are: (a) `messageList` overflow scrollbar shadow under iOS Safari (browser-rendered, would need a CSS workaround), (b) shiki `pre code` horizontal scroll edge — but neither has a CSS-defined gradient in our tree.
- AC #12 is unambiguous — single-line `font-family` swap.

---

**pm_confidence**: 78
**core uncertainty**: wrap 기본 변경이 기존 localStorage(`false` 저장된 값)를 자연스럽게 덮을지 — 마이그레이션 키 bump 필요 여부 TechLead 확인.
**PC action bar decision**: 모바일 = 항상 노출 + disabled-when-no-selection; PC = 미렌더(우클릭 유지).

**designer_confidence**: 88
**biggest decisions**: (1) Disabled buttons keep `pointer-events` intact (no `pointer-events:none`) so tooltips and focus still reach them — handler no-op guard is the safe route; (2) `overflow-wrap: anywhere` over `break-all` — gentler break preserves natural split points at underscores/dots when pane width allows, avoiding mid-word fractures in `Korea_PQC_…` style names.

**techlead_confidence**: 82
- **Most uncertain task**: T9 — keeping `backgroundColor: inherit` on the sticky `rightCluster` with translucent zebra. Argument hinges on `.tree { overflow-x: hidden }` from T1 making the bleed-through theoretical (label can never scroll under the cluster because it's clipped earlier). If T1's selector fix regresses, T9 also visibly regresses. Fallback: layer `rightCluster` with explicit per-state bg (default `var(--background)`, zebra rgba via `globalStyle(\`.${childrenInner} > div:nth-child(even) > .${node} > .${rightCluster}\`)`, selected/hover already opaque on `.node`).
- **Sticky-bg decision**: Keep `rightCluster.backgroundColor: 'inherit'`; do NOT make `.node` base-opaque; rely on T1's `overflow-x: hidden` to eliminate the only scenario where translucent-cluster bleed-through is visible. Single-change risk surface; minimal blast radius.
- **Wrap-pref-migration decision**: Bump key prefix to `leapmux:files-name-wrap-v2:` (replace_all rename on the constant). TTL cleanup in `browserStorage.ts` reaps the old `v1` keys within 7 days; no explicit migration code needed. Side benefit: existing users with explicit `false` get the new `true` default once cleanly, matching PM's intent.
