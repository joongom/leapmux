# chat-composer-mobile

- id: `chat-composer-mobile`
- status: draft v1
- date: 2026-05-14
- owner: PM (leapmux)
- related: `chat-typography-pass2`, `tree-row-ux-pass3`

## Problem

모바일 뷰에서 채팅 입력창(`AgentEditorPanel`)이 화면 상단 근처에 떠 있다. 정상이라면 메시지 리스트 아래, 화면 하단에 고정되어야 한다. 또한 가상 키보드 처리(키보드 위 노출 유지, 마지막 메시지 가림 방지, safe-area 반영)가 전혀 구현되어 있지 않다. 모바일 프론트엔드 전문가 관점으로 visualViewport API, `dvh` 단위, `env(safe-area-inset-*)`, sticky/fixed positioning을 종합 적용해 제대로 다시 잡는다.

## User stories

1. 모바일에서 채팅 화면을 열면, 입력창은 항상 화면 하단에 고정되어 보인다.
2. 입력창을 탭하여 키보드가 올라와도, 입력창은 키보드 바로 위에 가시 상태로 유지된다.
3. 키보드가 올라와도 마지막으로 보고 있던 메시지가 키보드/입력창 뒤로 숨지 않는다.
4. iPhone(노치/홈바)에서 입력창이 safe-area를 침범하지 않고 자연스럽게 배치된다.

## Acceptance criteria

1. `useIsMobile() === true`인 뷰포트에서 `AgentEditorPanel`은 chat tile 영역의 하단에 시각적으로 anchor된다. 메시지 리스트가 짧을 때도 상단으로 끌어올려지지 않는다.
2. 데스크탑(`useIsMobile() === false`)에서는 composer 위치/리사이즈 핸들/높이 동작이 현재와 동일하다(회귀 없음).
3. 입력창에 포커스를 주어 가상 키보드가 올라오면, composer 전체(특히 send 버튼)가 키보드에 가려지지 않는다. iOS Safari, Android Chrome 모두에서 검증.
4. 키보드가 올라온 뒤, 메시지 리스트의 마지막 메시지(또는 사용자가 마지막으로 본 메시지)가 composer 뒤로 가려지지 않도록 자동 스크롤되거나 리스트 viewport가 줄어든다.
5. 입력창 하단 padding/inset이 `env(safe-area-inset-bottom)`을 반영해, 홈 인디케이터 영역과 겹치지 않는다.
6. orientation change(세로↔가로) 발생 시 composer 위치/높이가 한 프레임 내에 재정렬되며 jitter가 없다.
7. 키보드가 닫히면 composer가 원래 하단 위치로 부드럽게 복귀하고 리스트 스크롤이 어긋나지 않는다.
8. 키보드가 올라와 있는 동안 좌우 sidebar drawer를 열어도 composer/키보드 상태가 깨지지 않는다(둘은 직교).
9. `100vh` 사용으로 인한 iOS Safari address bar 가림 이슈가 chat container 전체에서 발생하지 않는다(`100dvh` 또는 JS-driven `--app-height` 사용).

## Out of scope

- 데스크탑 composer 동작 변경, `editorResizeHandle` 동작 변경
- 키보드 위에 추가 toolbar(formatting bar, mention picker 등) 표시
- IME(한국어/일본어/중국어) 조합 입력 중의 send 차단 정책 수정 — 별도 cycle
- Tauri/PWA installable 환경에서의 system keyboard inset 처리 — 별도
- Attachment upload sheet(파일 picker)의 키보드 상호작용 — 별도
- pass3에서 도입된 action bar / view-bg / 바탕(`var(--lm-chat-body)`) 폰트 변경 — 보존만, 변경 금지

## UI notes (Designer fills)

### 1. Composer positioning: flex natural placement (chosen)

Reject `position: fixed` — it exits the `mobileCenter` stacking context and requires manually computing `padding-bottom` on `messageList` to prevent overlap, which creates a two-source-of-truth sizing problem that breaks on orientation change and when attachments or control-request banners expand the composer height.

Reject `position: sticky; bottom: 0` — sticky only works when the scroll container is an ancestor of the sticky element. `mobileCenter` has `overflow: hidden`, which clips stickiness; the composer would not anchor.

**Decision: flex natural placement with explicit height chain.** Give `mobileCenter` `height: 100dvh` (replacing the current `height: 100%` which inherits from `mobileShell`'s own `height: 100%` — see below). Within `mobileCenter`, `tileContent` receives `flex: 1; min-height: 0; overflow: hidden` and `editorPanelWrapper` stays `flex-shrink: 0`. The composer sits at the natural bottom of the column; `messageList` fills remaining space via its own `flex: 1`.

### 2. Viewport height: 100dvh + JS visualViewport fallback

`100dvh` is correct for the root chat container (`mobileCenter`). It accounts for the collapsing/expanding browser chrome on iOS Safari 15.4+ and Chrome Android 108+, avoiding the classic `100vh` address-bar overlap bug confirmed in the current build output (`content="width=device-width, initial-scale=1"` — no dvh in place yet).

**Virtual keyboard avoidance: Option C (JS visualViewport) as primary, dvh as static fallback.** iOS Safari does not shrink the visual viewport on keyboard show when using `dvh` alone (the keyboard overlays without triggering a layout resize). Android Chrome's `interactive-widget=resizes-content` helps on Chrome only and can break modal/popover z-index stacking across the app. Therefore: a new `useVisualViewportInset` hook listens to `window.visualViewport` `resize` and `scroll` events and writes `--vvh: <visualViewport.height>px` onto `:root`. `mobileCenter` switches to `height: var(--vvh, 100dvh)` — the `100dvh` fallback is used on first paint before JS runs and on browsers without `visualViewport` support (negligible but safe). The hook fires on `resize` (keyboard appears/disappears, orientation change) and on `scroll` (iOS Safari translates the viewport on partial scroll while the keyboard is visible, changing `visualViewport.pageTop`). Use `requestAnimationFrame` debouncing inside the handler — not `setTimeout` — to stay frame-synchronous and avoid jitter.

### 3. Safe area

`editorPanelWrapper` adds `padding-bottom: env(safe-area-inset-bottom)` unconditionally on mobile. This pads the home indicator gap whether the keyboard is up or not. When the keyboard is visible, iOS/Android zero out `safe-area-inset-bottom` automatically (the inset is measured from the visible bottom, which is now above the keyboard), so no double-padding occurs. Skip `constant()` — minimum iOS 15.4 is required for `dvh` anyway.

### 4. Auto-scroll on textarea focus

Wire `textarea onfocus` → `forceScrollToBottom()` from `useChatScroll` **only when `isAtBottomFresh()` returns true** at the moment of focus. This matches user expectation: if the user has scrolled up to read history and then taps the textarea, do not yank them back to bottom. If they were already at the bottom (reading latest messages), scroll instantly so the keyboard reveal does not obscure the last message.

### 5. Overscroll containment

`messageList` gets `overscroll-behavior: contain`. This prevents the iOS rubber-band bounce from propagating to the `mobileCenter` column and triggering layout jitter on the composer. The bouncing stays local to the message list.

### 6. Composer visual style on mobile

- **Top border**: `border-top: 1px solid var(--border)` on `editorPanelWrapper` (mobile only, via `@media (max-width: 639px)`). This replaces the resize handle divider that is suppressed on mobile; it gives a clear visual separation between the message list and the input zone.
- **Background**: `background-color: var(--background)` on `editorPanelWrapper` (already inherited from the page, but must be explicit so the composer is opaque when the list scrolls behind it).
- **Shadow**: `box-shadow: 0 -2px 8px rgba(0,0,0,0.06)` on `editorPanelWrapper`, mobile only. Subtle upward shadow to lift the composer visually above the message list. Use the lightest viable value — the existing `--shadow-large` token is too heavy for this context.
- No new color tokens required; all values use `var(--border)`, `var(--background)`.

### 7. Empty state layout

When the message list is empty, `messageList` still fills `flex: 1` and the existing `emptyChat` style (centered placeholder) works correctly. The composer anchors at the natural bottom of `mobileCenter`. The empty state occupies the full space above the composer — no special-casing needed.

### 8. Orientation change

The `visualViewport` `resize` event fires on orientation change, updating `--vvh` within one rAF. `dvh` also recalculates. No additional handler required.

### 9. Resize handle suppression on mobile

`editorResizeHandle` must be hidden on mobile (`display: none` within `@media (max-width: 639px)`). The handle is a desktop-only affordance; on mobile the composer height is determined by content. The desktop resize and max-height logic in `useEditorMinHeight` is untouched.

## Tasks (TechLead breaks down)

전제: Designer 결정 사항(JS-driven `--vvh`, flex natural placement, `env(safe-area-inset-bottom)`, focus 시 `isAtBottomFresh()` 가드 scroll, mobile-only border+shadow)을 그대로 구현한다. 데스크탑 회귀 없음 / `useChatScroll` invariants 보존 / shared sidebar·DropdownMenu 무수정.

작업 순서: T1 → T2 → T3 → (T4·T5·T6·T7·T9·T10 병렬, 모두 CSS only) → T8 → T11(audit) → T12(test).

### T1 — viewport meta 태그에 `viewport-fit=cover` 추가

- **Files**: `frontend/src/entry-server.tsx`
- **Impl**: 현재 `<meta name="viewport" content="width=device-width, initial-scale=1" />`를 `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`로 교체. `viewport-fit=cover`만 추가하면 iOS Safari가 `env(safe-area-inset-*)` 값을 0이 아닌 실측 값으로 노출한다. `index.html`은 SolidStart에서 사용하지 않음 — 모든 meta는 `entry-server.tsx`에서 주입.
- **Audit**: `grep -rn "name=\"viewport\"" frontend/src` → 단 한 곳(entry-server.tsx)만 매칭되어야 함.
- **Test gate**: `cd frontend && bun run typecheck && bun run lint`. SSR 결과 확인은 수동(서버 기동 후 `<head>` view-source).

### T2 — `useVisualViewportInset` 훅 신설

- **Files**: `frontend/src/hooks/useVisualViewportInset.ts` (신규)
- **Impl**:
  1. SSR 안전: `typeof window === 'undefined'`면 no-op로 즉시 return.
  2. `onMount`에서 단일 rAF coalescer (`let rafId: number | null = null`) 두고 핸들러는 항상 `requestAnimationFrame`으로 묶어 `document.documentElement.style.setProperty('--vvh', \`${h}px\`)` 수행.
  3. `window.visualViewport`가 있으면: `visualViewport.resize`, `visualViewport.scroll` 두 이벤트 listen, h = `visualViewport.height`.
  4. fallback: `visualViewport` 없으면 `window.resize` listen, h = `window.innerHeight`.
  5. 초기 1회 동기적으로 setProperty (첫 paint 시 `--vvh`가 비어 있어 `var(--vvh, 100dvh)` fallback이 잠깐 동작하는 것은 의도).
  6. `onCleanup`에서 listener 제거 + rAF cancel + `documentElement.style.removeProperty('--vvh')` (test 격리용; production에서는 unmount 시점이 곧 unload라 무해).
- **Audit**: `grep -rn "visualViewport" frontend/src` → 신규 훅 외 매칭 없어야 함.
- **Test gate**: T12에서 단위 테스트 도입. 이 시점에는 `cd frontend && bun run typecheck`.

### T3 — `useVisualViewportInset()`을 `AppShell`에서 호출

- **Files**: `frontend/src/components/shell/AppShell.tsx`
- **Impl**: `AppShell` 최상단(`useIsMobile()` 옆)에서 `useVisualViewportInset()` 무조건 호출. 데스크탑에서 `visualViewport`는 변하지 않으므로 `--vvh = window.innerHeight`로 한 번 set되고 끝 — 부작용 없음. `MobileLayout` 안이 아닌 `AppShell` 레벨에서 호출해 모바일↔데스크탑 전환 시 unmount/remount race를 피한다.
- **Audit**: `grep -n "useVisualViewportInset" frontend/src/components/shell/AppShell.tsx` → 1 hit.
- **Test gate**: `cd frontend && bun run typecheck && bun run lint`.

### T4 — `mobileCenter` 높이를 `var(--vvh, 100dvh)`로 변경

- **Files**: `frontend/src/components/shell/AppShell.css.ts` (`mobileCenter`)
- **Impl**: `height: '100%'` → `height: 'var(--vvh, 100dvh)'`로 교체, `minHeight: 0` 추가. `mobileShell`은 `height: 100%` 유지(부모 #app이 `height: 100%`라 변경 불요). `--vvh`가 미정의일 때 `100dvh`가 fallback으로 적용 — 첫 paint 한 프레임에서만 발생.
- **Audit**: 해당 스타일 블록만 변경. `mobileCenter` 외 다른 `height: '100%'` 건드리지 않음.
- **Test gate**: `cd frontend && bun run typecheck && bun run lint`.

### T5 — flex chain 정합: composer가 자연 bottom에 앉도록

- **Files**: `frontend/src/components/shell/AppShell.css.ts` (`mobileCenter`), `frontend/src/components/shell/Tile.css.ts` (`tileContent`), `frontend/src/components/chat/ChatView.css.ts` (`container`, `editorPanelWrapper`)
- **Impl**: 현재 chain은 거의 정합 (`mobileCenter: flex column`, `tileContent: flex 1 + overflow hidden`, `editorPanelWrapper: flexShrink 0`). 누락된 invariant 두 가지만 추가:
  - `tileContent`(Tile.css.ts)에 `minHeight: 0` 추가 — column flex에서 `flex: 1` 자식이 부모를 넘기지 않도록 보장(현재 없음, 모바일에서 가상 키보드로 부모가 줄면 overflow되어 composer가 화면 밖으로 밀려나는 원인).
  - `ChatView.css.ts`의 `container`에 `minHeight: 0` 추가(동일 이유, agent tile 안쪽 flex chain).
  - `editorPanelWrapper`의 `flexShrink: 0` 그대로 유지.
- **Audit**: `grep -n "minHeight\|flexShrink\|flex:" frontend/src/components/shell/Tile.css.ts frontend/src/components/chat/ChatView.css.ts | grep -E "tileContent|container|editorPanelWrapper"`.
- **Test gate**: `cd frontend && bun run typecheck && bun run lint`. 데스크탑 회귀 확인: `bun run test -- MobileLayout` + 기존 chat/tile 테스트.

### T6 — composer wrapper에 `padding-bottom: env(safe-area-inset-bottom)`

- **Files**: `frontend/src/components/chat/ChatView.css.ts` (`editorPanelWrapper`)
- **Impl**: `editorPanelWrapper`에 `paddingBottom: 'env(safe-area-inset-bottom)'`를 모바일 미디어 쿼리(`@media (max-width: 639px)`) 안에서만 추가. 데스크탑에는 적용 금지(데스크탑 composer는 inset이 없고 padding이 들어가면 footerBar 위치 어긋남). `messageList`에는 padding을 넣지 않음 — Designer 노트 #3 명시.
- **Audit**: `grep -n "safe-area-inset" frontend/src` → `editorPanelWrapper`에서만 등장.
- **Test gate**: `cd frontend && bun run typecheck && bun run lint`.

### T7 — `messageList`에 `overscroll-behavior: contain`

- **Files**: `frontend/src/components/chat/ChatView.css.ts` (`messageList`)
- **Impl**: `messageList` 스타일에 `overscrollBehavior: 'contain'` 한 줄 추가. 데스크탑에서도 안전(스크롤 체인 격리, 부작용 없음). iOS rubber-band가 `mobileCenter`로 전파되어 composer가 떨리는 현상 차단.
- **Audit**: `grep -n "overscrollBehavior\|overscroll-behavior" frontend/src` → 신규 1줄.
- **Test gate**: `cd frontend && bun run typecheck && bun run lint`.

### T8 — editor focus → `isAtBottomFresh()`면 `forceScrollToBottom()`

- **Files**: `frontend/src/components/chat/ChatView.tsx`, `frontend/src/components/chat/AgentEditorPanel.tsx`
- **Impl**:
  - `ChatView`에서 이미 `useChatScroll` 반환의 `isAtBottomFresh`, `forceScrollToBottom`을 `onScrollApiReady` 콜백으로 노출하지만, panel은 별도 트리(공통 부모는 `Tile`)이라 직접 호출이 어려움. 두 가지 옵션 중 단순한 쪽 선택:
    - **(택1)** `ChatView.tsx`의 `onScrollApiReady` payload(`ChatScrollApi`)에 `isAtBottomFresh: () => boolean`을 추가 노출하고, host(`TileRenderer`)가 이미 `ChatScrollApi`를 보관하므로 `AgentEditorPanel`로 새 prop `onEditorFocus?: () => void`를 받아 host가 wiring한다.
    - **(택2)** 더 가볍게: `AgentEditorPanel`에 신규 prop `chatScrollApi?: () => ChatScrollApi | undefined` 또는 `onEditorFocus?: () => void`를 추가하고, MarkdownEditor의 ProseMirror DOM(`view.dom`)에 `focus` 리스너를 직접 부착 — 단, MarkdownEditor 내부 API 노출이 필요해 결합도 증가.
  - **결정: 택1**. `ChatScrollApi`에 `isAtBottomFresh` 추가 → `TileRenderer`가 chat agent tab에 한해 `AgentEditorPanel`의 새 `onEditorFocus` prop을 wiring(`() => { if (api.isAtBottomFresh()) api.forceScrollToBottom() }`). `AgentEditorPanel`은 ProseMirror DOM 노출이 깔끔하지 않으므로 `panelRef`(`editorPanelWrapper`)에 `on:focusin` capture 리스너 부착으로 처리 — textarea/codemirror/prosemirror 어느 것이든 focus가 wrapper 안에서 발생하면 발화.
  - 디바운싱 불필요(focus는 사용자 의도 1회).
- **Audit**: `grep -n "isAtBottomFresh\|onEditorFocus\|focusin" frontend/src/components/chat frontend/src/components/shell`.
- **Test gate**: `cd frontend && bun run typecheck && bun run lint && bun run test -- useChatScroll`.

### T9 — 모바일 한정 composer 상단 보더 + 위쪽 그림자

- **Files**: `frontend/src/components/chat/ChatView.css.ts` (`editorPanelWrapper`)
- **Impl**: `editorPanelWrapper`의 `@media (max-width: 639px)` 블록에 다음 세 줄을 추가: `borderTop: '1px solid var(--border)'`, `backgroundColor: 'var(--background)'`, `boxShadow: '0 -2px 8px rgba(0,0,0,0.06)'`. Designer 스펙은 `0.06` — 본 요청 본문의 `0.04`보다 디자이너 결정을 우선. spec PM/Designer 본문도 `639px` breakpoint를 사용 — 본 요청의 `768px`이 아닌 `639px`로 통일(`breakpoints.mobile` = 640과 일치).
- **Audit**: `grep -n "max-width: 639px" frontend/src/components/chat/ChatView.css.ts` → 신규 1 block.
- **Test gate**: `cd frontend && bun run lint`.

### T10 — `editorResizeHandle` 모바일에서 숨김

- **Files**: `frontend/src/components/chat/ChatView.css.ts` (`editorResizeHandle`)
- **Impl**: `editorResizeHandle` 스타일에 `@media (max-width: 639px) { display: 'none' }` 추가. handle을 숨기면 데스크탑 `useEditorMinHeight` resize/maxHeight 경로는 모바일에서 도달 불가 — 의도된 결과(모바일은 content-driven 높이).
- **Audit**: `grep -n "editorResizeHandle" frontend/src/components/chat`.
- **Test gate**: `cd frontend && bun run typecheck && bun run lint`.

### T11 — `100vh` / `position: fixed|sticky` audit & 정리

- **Files**: 전체 chat/shell 스코프
- **Impl**: 다음 grep 결과를 검토하고 chat/shell 경로의 `100vh`(height 의도)는 `100dvh`로 교체. 단 popover/modal max-height용 `calc(100vh - …)`는 viewport 고정 측정값이라 그대로 둔다(키보드 표시 시에도 popover 높이가 줄어들 필요 없음 — popover는 보통 키보드와 공존하지 않음). 발견된 단일 매칭: `ChatView.css.ts:181` `settingsMenu` `maxHeight: 'calc(100vh - var(--space-6) * 2)'` — modal/popover 컨텍스트라 **변경 없음**(주석으로 의도 기록 권장). composer 영역에 stray `position: fixed|sticky` 없음 확인.
- **Audit**:
  - `grep -rn "100vh" frontend/src/components/chat frontend/src/components/shell`
  - `grep -rn "position: 'fixed'\|position: 'sticky'\|position:fixed\|position:sticky" frontend/src/components/chat frontend/src/components/shell`
  - 결과를 PR 본문에 첨부.
- **Test gate**: `cd frontend && bun run typecheck && bun run lint`.

### T12 — `useVisualViewportInset` 단위 테스트

- **Files**: `frontend/src/hooks/useVisualViewportInset.test.ts` (신규)
- **Impl**: vitest + `solid-js/testing` 또는 manual mount 패턴 사용. 케이스:
  1. `visualViewport`가 mock된 환경에서 hook을 mount → `documentElement.style.getPropertyValue('--vvh')`가 mock된 `height + 'px'`와 같은지 확인.
  2. mock `visualViewport.dispatchEvent(new Event('resize'))` 후 rAF flush → `--vvh` 업데이트 확인 (`requestAnimationFrame` mock 또는 `vi.advanceTimersByTime` 후 flush).
  3. `visualViewport` undefined 환경에서 `window.innerHeight` 기반 fallback이 동작하고 `window.resize`에 반응함.
  4. unmount 후 listener 해제 — 추가 event dispatch가 `--vvh`를 변경하지 않음.
- **Audit**: `grep -n "useVisualViewportInset" frontend/src/hooks frontend/src/components/shell` → hook 정의 + AppShell 호출 + 본 테스트, 도합 3 hits.
- **Test gate**: `cd frontend && bun run test -- useVisualViewportInset`. 시각적 확인은 user가 iPhone Safari / Android Chrome 실기 검증(QA stub 항목과 일치).

### Defer-if-pinched

- **T9**(border+shadow) — 기능 정확성에는 영향 없는 시각 디테일. 시간 압박 시 PR 후속으로 미룬다.
- **T12**(unit test) — 훅 자체는 단순. 시간 압박 시 manual QA(실기) 결과만 첨부하고 테스트는 follow-up issue로 남긴다.

techlead_confidence: 0.83
- Most uncertain: **T8** — focus wiring 경로(`onScrollApiReady` 확장 + `TileRenderer`가 `AgentEditorPanel`로 콜백 주입). chat이 아닌 tile(터미널 등) 컨텍스트에서 `AgentEditorPanel`이 어떻게 마운트되는지에 따라 wiring 지점이 1군데 더 늘 수 있음. 구현 시 `TileRenderer.tsx`에서 chat tab path를 다시 정독해 확정.
- Defer-if-pinched: **T9** (mobile-only composer border+shadow — 시각 디테일, 핵심 acceptance에 영향 없음).

## A11y checklist

1. composer가 키보드 위에서 항상 보이며 send 버튼이 도달 가능(VoiceOver/TalkBack 포커스).
2. 키보드 표시/숨김 동안 focus가 textarea에서 떠나지 않는다.
3. `prefers-reduced-motion`에서 composer 위치 transition이 즉시 적용된다.
4. textarea의 visible label/aria-label이 유지되고 키보드 표시로 가려지지 않는다.
5. 스크롤-점프(자동 scrollToBottom) 시 screen reader announcement가 폭주하지 않는다.
6. iOS VoiceOver 회전자(rotor)로 메시지 리스트와 composer 간 이동이 가능하다.

## QA stub

- iPhone Safari(iOS 17+/18+), Android Chrome 실기 검증
- 회전, 키보드 토글, drawer 동시 동작, 짧은/긴 리스트, empty chat
- 회귀: 데스크탑 composer height/resize, attachments, control banner

## Open questions

- composer anchoring: `sticky` vs flex 자연 배치 — iOS Safari jitter 실측 필요.
- CSS-only(`100dvh` + sticky)만으로 충분한지 vs visualViewport JS 추적 병행 필요한지.
- 키보드 노출 시 auto-scrollToBottom 트리거 조건(`isAtBottomFresh()`만 vs 항상).
- viewport meta `interactive-widget=resizes-content`의 다른 모달/popover 부작용.
- attachments strip, control-request banner의 키보드 대응 동일 wrapper 자동 포함 여부 확인.

pm_confidence: 0.78 — 핵심 불확실성: iOS Safari에서 CSS-only(`100dvh` + sticky)만으로 모든 케이스를 잡을 수 있을지, 아니면 visualViewport API JS 추적이 반드시 필요한지는 Dev가 실기 검증해야 확정 가능.

designer_confidence: 0.88 — Biggest decisions: (1) **Keyboard handling**: JS-driven `visualViewport` → `--vvh` CSS variable is the primary path; `100dvh` is the static fallback. CSS-only `dvh` + sticky is insufficient because iOS Safari overlays the keyboard without shrinking the layout viewport, so the composer would stay hidden behind the keyboard without the JS correction. (2) **Composer positioning**: flex natural placement (`tileContent: flex 1; min-height 0` + `editorPanelWrapper: flex-shrink 0`) inside `mobileCenter`. `position: sticky` is not viable because `mobileCenter` uses `overflow: hidden`, which collapses the sticky scroll container; `position: fixed` creates a two-source-of-truth height problem that breaks when the composer grows (attachments, control-request banner).

## QA

### Dev notes

**Files modified**:
- `frontend/src/entry-server.tsx` — viewport meta now includes `viewport-fit=cover` (T1).
- `frontend/src/hooks/useVisualViewportInset.ts` *(new)* — publishes `--vvh` on `:root` from `visualViewport.height`, rAF-coalesced, with `window.innerHeight` fallback (T2).
- `frontend/src/hooks/useVisualViewportInset.test.ts` *(new)* — 4 cases: initial write, resize update, fallback path, cleanup detaches listeners + clears `--vvh` (T12).
- `frontend/src/components/shell/AppShell.tsx` — imports and calls `useVisualViewportInset()` unconditionally at the top of `AppShell` (T3).
- `frontend/src/components/shell/AppShell.css.ts` — `mobileCenter`: `height: var(--vvh, 100dvh)`, added `minHeight: 0` (T4/T5).
- `frontend/src/components/shell/Tile.css.ts` — `tileContent`: added `minHeight: 0` so column flex children can shrink (T4).
- `frontend/src/components/chat/ChatView.css.ts` — `container` gets `minHeight: 0` (T5); `messageList` gets `overscrollBehavior: contain` (T7); `editorPanelWrapper` mobile media query adds `padding-bottom: env(safe-area-inset-bottom)`, `border-top`, opaque `background-color`, and the subtle `0 -2px 8px rgba(0,0,0,0.06)` shadow (T6/T9); `editorResizeHandle` gets `display: none` under `@media (max-width: 639px)` (T10); `settingsMenu` `100vh` left as-is with an inline comment explaining the popover rationale (T11).
- `frontend/src/components/chat/ChatView.tsx` — `ChatScrollApi` now exposes `isAtBottomFresh` (T8).
- `frontend/src/components/chat/AgentEditorPanel.tsx` — new optional `onEditorFocus` prop; wrapper has `on:focusin` fired on focus entering any descendant (ProseMirror contenteditable, attachment <input>, settings <button>) (T8).
- `frontend/src/components/shell/TileRenderer.tsx` — `chatHandlers` map extended with `isAtBottomFresh` + `forceScrollToBottom` per agent; `FocusedAgentEditorPanel` wires `onEditorFocus` to `chatHandlers.get(agentId).forceScrollToBottom()` guarded by `isAtBottomFresh()` (T8).

**Audit results** (T11):
- `grep -rn "100vh" frontend/src/components/{chat,shell}` → single match `ChatView.css.ts settingsMenu` (popover — intentionally left, commented).
- `grep -rEn "position: ['\\\"](fixed|sticky)['\\\"]" frontend/src/components/{chat,shell}` → matches are `AppShell.css.ts mobileSidebar/mobileOverlay` (drawer/overlay — correct), `MarkdownEditor.css.ts:76` (mention dropdown — unrelated to composer anchoring), `GridSizePopover.css.ts` (popover), `UserMenuItems.tsx` (theme transition overlay). No stray composer-area fixed/sticky.

**Key decisions / iOS Safari quirks**:
- Chose `var(--vvh, 100dvh)` (not `100dvh` alone, not `100%`): `100dvh` alone does not shrink under the iOS keyboard overlay, so the composer would sit behind the keyboard. The CSS fallback is still important — it covers the first paint window before hydration runs, and any browser without `visualViewport` support. The hook does an initial synchronous write inside `onMount` so the gap is one frame at most.
- rAF-coalesced listener (single pending callback, cancelled on cleanup). iOS Safari emits `resize` + `scroll` rapidly as the keyboard animates; coalescing keeps writes at one per frame and avoids jitter.
- `safe-area-inset-bottom` is applied unconditionally on mobile (no separate "keyboard up" branch). iOS/Android both zero the inset out automatically while the keyboard is visible (the inset is measured from the visible bottom, which is now above the keyboard), so there is no double-padding.
- Focus auto-scroll uses `on:focusin` on the panel wrapper rather than reaching into ProseMirror's `view.dom`. ProseMirror's mount lifecycle is async (Milkdown editor view creation), and `focusin` bubbles from any descendant, so we get coverage of textarea-like and contenteditable surfaces uniformly. Guard: `isAtBottomFresh()` checks the live DOM, not the stale `atBottom` signal, so the decision is correct even at the moment of focus.
- `editorResizeHandle` suppressed only via media query (`display: none`). Desktop `useEditorMinHeight` behaviour is untouched; on mobile, the handle still mounts but is unreachable. No additional JS gating needed.
- jsdom **does** expose `window.visualViewport` as `undefined` and the test mocks it via `Object.defineProperty(window, 'visualViewport', { value: ..., configurable: true })`. `onMount` semantics require a real render — `renderHook` from `@solidjs/testing-library` handles this; bare `createRoot` does not flush the mount queue.
- Did **not** touch `interactive-widget` viewport meta. Designer note flagged it can break modal/popover z-index — verified by leaving it out.

**Test gates**: `bun run typecheck`, `bun run lint`, scoped `bun run test -- ChatView Tile AppShell` (126/126), scoped `bun run test -- useVisualViewportInset` (4/4), full `bun run test` (3251/3251) — all pass.

**Manual QA scope (user)**: iOS Safari (iPhone, iOS 17+/18+) and Android Chrome on a real device. Acceptance criteria 3, 4, 6, 7 are inherently device-only; jsdom cannot model `visualViewport.height` changes triggered by the system keyboard.

dev_confidence: 0.87 — Implementation matches the TechLead plan with no deviation in scope. Remaining uncertainty is purely the iOS Safari empirical surface (focus-vs-scroll race ordering on a real device, `safe-area-inset-bottom` value during landscape rotation while keyboard is up), which can only be confirmed on hardware.

### QA verdict

**Gates**: typecheck — PASS, lint — PASS, full test suite 3251/3251 — PASS (including all 4 `useVisualViewportInset` unit tests).

**ACs (code-verifiable)**:

| AC | Location | Result |
|---|---|---|
| viewport meta `viewport-fit=cover` | `entry-server.tsx:9` | PASS — single match, correct value |
| `useVisualViewportInset` writes `--vvh` on resize, rAF-coalesced, rAF cancel on cleanup | `hooks/useVisualViewportInset.ts:21-69` | PASS |
| Fallback to `window.innerHeight` when `visualViewport` undefined | `hooks/useVisualViewportInset.ts:30`, test case 3 | PASS |
| Cleanup: listeners removed, `--vvh` cleared | `hooks/useVisualViewportInset.ts:47-66`, test case 4 | PASS |
| Hook called once in `AppShell` (unconditionally) | `AppShell.tsx:186` | PASS — 1 hit |
| `mobileCenter` height `var(--vvh, 100dvh)` | `AppShell.css.ts:138` | PASS |
| `tileContent` has `min-height: 0` | `Tile.css.ts:38` | PASS |
| `editorPanelWrapper @media (max-width: 639px)`: `padding-bottom: env(safe-area-inset-bottom)` | `ChatView.css.ts:477-478` | PASS |
| `editorPanelWrapper @media (max-width: 639px)`: `borderTop: 1px solid var(--border)` | `ChatView.css.ts:479` | PASS |
| `editorPanelWrapper @media (max-width: 639px)`: `boxShadow: 0 -2px 8px rgba(0,0,0,0.06)` | `ChatView.css.ts:481` | PASS |
| `messageList` has `overscrollBehavior: contain` | `ChatView.css.ts:69` | PASS |
| Textarea focus → `forceScrollToBottom()` guarded by `isAtBottomFresh()` | `TileRenderer.tsx:868-876`, `AgentEditorPanel.tsx:225` | PASS |
| `editorResizeHandle @media (max-width: 639px) { display: none }` | `ChatView.css.ts:17-19` | PASS |
| `100vh` only in `settingsMenu` (popover, intentional) | grep scan | PASS — single match, commented |
| DropdownMenu.tsx + sharedTree.css.ts regression | `git diff HEAD` — empty | PASS |
| Desktop layout (`mobileCenter` only, no desktop style touched) | `AppShell.css.ts` diff scope | PASS |
| No stray `position: fixed/sticky` in composer path | `MarkdownEditor.css.ts:76` (link popover) unrelated | PASS |

**Out-of-spec changes** (observed in diff, not part of this spec): `messageStyles.css.ts` (thinking card font + font-size), `global.css.ts` (new `--lm-chat-system` token), `renderMarkdown.ts` (GFM strikethrough unwrap plugin). These are cosmetic/typography changes unrelated to composer-mobile mechanics; no regression observed in test suite.

**iOS Safari concerns (code-only review)**:
- rAF coalescing: `schedule()` guards with `if (rafId !== null) return` — at most one pending write per frame. Correct; prevents listener thrash during keyboard animation burst.
- Cleanup on unmount: two `onCleanup` blocks — first removes `visualViewport` (or `window`) listeners; second cancels any pending rAF and removes `--vvh`. Correct.
- `window.innerHeight` fallback: line 30 uses `window.visualViewport?.height ?? window.innerHeight`. Correct; no hard dependency on `visualViewport`.

**Top concern**: ACs 3, 4, 6, 7 (keyboard avoidance, auto-scroll, orientation change, keyboard dismiss) require hardware verification on iPhone Safari (iOS 17+/18+) and Android Chrome — jsdom cannot model system keyboard height changes via `visualViewport`. Specifically, the timing of `focusin` vs. keyboard animation completion on iOS (the keyboard animates after focus, meaning `visualViewport.height` may still reflect the pre-keyboard value at the moment `forceScrollToBottom()` fires) is the most likely real-device edge case. This is inherent to the async nature of the iOS system keyboard and cannot be caught in unit tests.

qa_score: 96/100 — All code-verifiable ACs pass with zero test failures. Deduction: hardware-only ACs (iOS/Android real-device keyboard flow) are unverifiable in this environment and constitute the remaining risk.

### PM verdict

pm_score: 95/100

- (a) composer bottom anchoring: PASS — flex chain (`mobileCenter` flex column + `tileContent`/`container` `min-height:0` + `editorPanelWrapper` `flex-shrink:0`) cleanly seats composer at natural bottom; sticky/fixed pitfalls correctly rejected per Designer note.
- (b) keyboard + safe-area handling: PASS — JS-driven `--vvh` via `visualViewport` (rAF-coalesced, with `innerHeight` fallback) plus `env(safe-area-inset-bottom)`, `viewport-fit=cover`, and `isAtBottomFresh()`-guarded auto-scroll cover all 9 ACs at code level; mobile-FE best practices (overscroll-behavior contain, `100dvh` fallback, resize-handle suppression, focusin bubbling instead of ProseMirror coupling) are applied correctly.
- Risk: ACs 3/4/6/7 still require iPhone Safari (iOS 17+/18+) and Android Chrome real-device verification — focusin-vs-keyboard-animation race on iOS is the most likely edge case; orientation+keyboard combo and home-indicator landscape inset are also empirical. Out-of-spec cosmetics (thinking-card font, `--lm-chat-system`, GFM strikethrough unwrap) are non-blocking but should be tracked in a follow-up note.
