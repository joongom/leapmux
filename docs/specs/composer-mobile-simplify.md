# composer-mobile-simplify

- id: `composer-mobile-simplify`
- status: draft v1
- date: 2026-05-15
- owner: PM (leapmux)
- related: `chat-composer-mobile`, `ios-keyboard-fix`, `chat-typography-pass2`

## Problem

모바일 composer가 데스크탑 기준 리치텍스트 툴바(B/I/Strikethrough/Heading/List/Code/Link/HR/Enter-mode) 때문에 세로 공간을 과도하게 점유한다. 모바일에서 필요한 부가 액션은 첨부뿐이며, 모델/옵션/에이전트 정보는 좌측 `+` 메뉴로 통합해 단일 행 composer로 축소한다. 모바일 키보드 Enter는 개행만 담당해야 한다(Cmd+Enter 입력 불가 → 실수 전송 빈번).

## User stories

1. 모바일 사용자로서 composer가 작은 높이를 차지해 메시지 영역이 최대한 보이길 원한다.
2. 모바일에서 Enter는 개행이고 전송은 항상 우측 Send 버튼으로만 하고 싶다.
3. 첨부/모델/Bypass Permissions/에이전트 정보를 좌측 `+` 한 곳에서 꺼내 쓰고 싶다.
4. 데스크탑 사용자로서 기존 툴바/footer bar 동작이 그대로 유지되길 기대한다.

## Acceptance criteria

1. `useIsMobile() === true`이면 `MarkdownEditor` 상단의 `EditorToolbar`(서식 버튼 전부 + Enter-mode toggle + Paperclip + Link/HR/Heading/Code/Quote/List) 가 **렌더되지 않는다**. `useIsMobile() === false`에서는 현재와 동일하게 노출.
2. 모바일에서 composer 하단부는 **단일 행**: 좌측 `+` 트리거 / 중앙 ProseMirror 입력 영역 / 우측 Send 버튼. 기존 `footerBar`(`EditorSettingsDropdown` + `infoTrigger` + Interrupt)는 모바일에서 이 단일 행으로 대체된다.
3. `+` 트리거 클릭 시 메뉴에 노출: ① 첨부(현 `fileInputRef.click()`), ② `EditorSettingsDropdown` 재사용(모델/Effort/Permission/OptionGroup), ③ `info.infoHoverCardContent()`(에이전트 정보), ④ Interrupt 활성 시 동일 메뉴에 노출. 새 store/fetch 없이 기존 컴포넌트를 호스팅.
4. 모바일에서 Enter 키는 **항상 개행**이다. 모바일 분기에서 `getEnterMode()`가 `'cmd-enter-sends'`로 고정되어 `createSendOnEnterPlugin` / `createListItemEnterPlugin`이 Enter를 전송으로 처리하지 않는다. 데스크탑은 사용자 preference(`preferences.enterKeyMode`) 그대로.
5. Send 버튼은 모바일 composer에 항상 표시되며, `(!hasContent() && attachments().length === 0) || disabled || sending()`일 때 disabled. `allowEmptySend`(control-request 경로) 신호는 데스크탑과 동일하게 평가.
6. 첨부 strip(`AttachmentStrip`)은 첨부가 있을 때 입력 영역 **위쪽**에 노출(데스크탑과 동일). `+` 메뉴는 strip을 가리거나 대체하지 않는다.
7. 데스크탑 composer의 마크업/스타일/Enter-mode toggle/툴바를 변경하지 않는다. `chat-composer-mobile`의 하단 고정·`useVisualViewportInset`·safe-area·touch-action lock·AutoFill 억제는 모두 보존.
8. ProseMirror 컨테이너의 `enterkeyhint` 속성은 모바일에서 `"enter"`(또는 `"return"`)로 설정되어 키보드가 줄바꿈 키 모양을 표시한다. 데스크탑/IME 영향 없음. `editorViewOptionsCtx`의 attributes를 분기.
9. Control-request 활성 상태(`ctrl.activeControlRequest()`)에서도 모바일 단일 행 레이아웃이 유지되며 Approve/Reject 액션은 기존 `ControlRequestActions` 위치(footer 영역)에 그대로 표시된다.

## Out of scope

- 데스크탑 composer / Enter-mode 변경
- 음성 입력 / dictation
- Slash command / mention picker / 마크다운 자동완성
- `+` 메뉴 내 카메라·사진 라이브러리 분리
- 리치텍스트 입력 자체 제거(붙여넣은 마크다운/링크는 보존)
- Tauri/PWA share sheet 연계

## UI notes (Designer fills)

### Row layout (≤639px)

```
[ + ]  [ input...                         ]  [ ▷ ]
```

- `+` button: 36×36px (`iconSize.container.md`), `lucide-solid/icons/plus`, color `var(--foreground)`, `background: transparent`, `border-radius: var(--radius-medium)`. `aria-label="More actions"`, `aria-haspopup="menu"`, `aria-expanded` bound to menu open state.
- Input area: `flex: 1`, `min-height: 36px`, `max-height: 150px` (auto-grow via ProseMirror), `padding: 8px var(--space-2)`, `font-size: 16px` (prevents iOS zoom on focus).
- Send button: 36×36px, `lucide-solid/icons/send-horizontal`, `background: var(--primary)`, icon `color: white`. `aria-label="Send message"`. Native `disabled` attribute when disabled.
- Row itself: `display: flex`, `align-items: flex-end`, `gap: var(--space-1)`, `padding: var(--space-1) var(--space-2)`.

### AttachmentStrip placement

Strip renders **above** the input row (same as desktop). The `+` menu never overlaps it. When attachments exist the composer expands upward; the single row remains at the bottom.

### + menu: reuse `DropdownMenu` (popover anchored to `+` button)

Decision: **reuse existing `DropdownMenu` popover**, not a bottom-sheet. Rationale: `DropdownMenu` already handles outside-click light-dismiss, ESC, `popover="auto"`, and auto-positioning (`placement: 'top-start'`). A bottom-sheet requires a new component, animation, and scroll-lock — out of scope per constraints. On 390px-wide viewports the menu is ~240px wide and fits above the trigger without cramping.

Menu items in order (`role="menu"`, each `role="menuitem"`):

1. `Paperclip` icon + "파일 첨부" — calls `fileInputRef.click()`, closes menu after.
2. `Cpu` icon + current model name (e.g. "Claude Opus 4.5 (200K)") — opens `EditorSettingsDropdown` inline as a nested sub-trigger; reuses existing component unchanged.
3. `Settings` icon + "옵션" — same `EditorSettingsDropdown` slot for Bypass Permissions / OptionGroup rows.
4. `Info` icon + "에이전트 정보" — renders `info.infoHoverCardContent()` inside the menu body.

Separator `<hr>` between items 1 and 2. When `ctrl.showInterrupt()` is true, item 5 is added: `Square` icon + "중단" (Interrupt), styled `color: var(--destructive)`.

Closing: native `popover="auto"` light-dismiss (outside click), ESC (already handled in `DropdownMenu`), and after any action (`onClick` on `<menu>` propagates to `hidePopover()`). Focus returns to `+` trigger on close.

### Send button enabled-state truth table

| hasText | hasAttachments | streaming/disabled | Button state |
|---------|---------------|-------------------|--------------|
| false   | false         | —                 | disabled     |
| true    | —             | false             | enabled      |
| false   | true          | false             | enabled      |
| —       | —             | true              | disabled     |

`allowEmptySend` (control-request path) bypasses the content check, same as desktop.

### Rich-text toolbar hiding method

**JSX `<Show when={!isMobile()}>` wrapping `<EditorToolbar>`** in `MarkdownEditor.tsx`. The toolbar DOM is fully removed on mobile — no dead event listeners, no layout cost. CSS-only `display:none` was rejected because the toolbar's popover elements (link popover, heading dropdown) remain in the DOM and can interfere with `popover="auto"` light-dismiss on mobile. `isMobile()` is the reactive signal from `useIsMobile()` already available in the component tree.

### Enter behavior on mobile

Mobile: `getEnterMode()` is overridden to always return `'cmd-enter-sends'` when `isMobile()` is true. This is done by wrapping the `pluginRefs.getEnterMode` getter at the call site in `MarkdownEditor.tsx` — no changes to `createSendOnEnterPlugin` or `createListItemEnterPlugin`. With `cmd-enter-sends` active, plain Enter is always a newline; only Cmd+Enter would send, but that key combination is unavailable on mobile keyboards, making Send button the sole send path. `enterkeyhint` attribute on the ProseMirror container is set to `"enter"` (not `"send"`) on mobile so the keyboard shows a return/newline key. Desktop `preferences.enterKeyMode` is unaffected.

### Interrupt / streaming state on mobile

When `ctrl.showInterrupt()` is true: the Interrupt action appears as item 5 inside the `+` menu (described above). The Send button is disabled during streaming (truth table row 4). There is no inline Interrupt button replacing Send — this avoids layout shift and keeps the row stable.

## Tasks (TechLead fills)

### Resolved decisions

- **Open Q (mount point)**: `+` 메뉴와 Send 버튼은 `AgentEditorPanel`의 `MarkdownEditor`에 전달되는 `footer` JSX prop을 **모바일 분기에서 교체**하는 식으로 마운트한다 (현재 desktop은 `<div class={footerBar}>` 한 줄을 `footer`로 넘긴다 — 동일 슬롯을 mobile-only 단일 행으로 swap). 새 `MobileComposerBar.tsx` 컴포넌트를 `AgentEditorPanel.tsx`와 같은 디렉토리에 둔다. Reasoning: ① desktop 분기와 mirror되어 `inputArea`/`AttachmentStrip` placement/`editorMinHeight`/draftKey가 전혀 영향받지 않는다, ② `MarkdownEditor` 내부의 `<EditorToolbar>` 숨김(T1)과 직교한다.
- **Open Q (EditorSettingsDropdown / infoTrigger props)**: 둘 다 desktop과 **동일한 props**(`props.agent?.*`, `props.onSettingChange`, `info.*`)를 받아 `MobileComposerBar`로 전달. 두 컴포넌트의 trigger를 `+` 메뉴 안에서 `role="menuitem"` 행으로 직접 렌더(둘 다 자체적으로 `DropdownMenu` popover를 띄우므로 nested popover; 외곽 `+` 메뉴는 자식 popover open 시 닫히지 않게 `onPointerDown stopPropagation` 필요).

### T1 — Hide EditorToolbar on mobile

- **Subject**: `<EditorToolbar>` JSX-level removal on mobile (no CSS).
- **Files**: `frontend/src/components/chat/markdownEditor/MarkdownEditor.tsx` (line 500 area).
- **Note**: import `useIsMobile` from `~/hooks/useIsMobile`, instantiate `const isMobile = useIsMobile()` at top of component (alongside `preferences`), wrap `<EditorToolbar .../>` in `<Show when={!isMobile()}>`. Do not touch `EditorToolbar.tsx`. All toolbar-driven state (linkPopover, enterTooltip, codeLang popover) stays mounted because their popovers are rendered as siblings (`<CodeLanguagePopover>` already at line 529) — toolbar JSX only controls their **triggers**, so hiding the toolbar is safe.
- **Audit**: confirm `linkPopoverOpen`/`linkUrl`/`enterTooltipOpen` signals are not opened from anywhere other than `<EditorToolbar>` — if so, they are never opened on mobile, which is correct (no orphan popover).
- **Test gate**: at viewport 375×667, `chat-editor` rendered, no `[data-testid=\"editor-toolbar\"]` (or first toolbar button) in DOM. At 1280×800, toolbar present.

### T2 — Force getEnterMode to `'cmd-enter-sends'` on mobile

- **Subject**: Override the `getEnterMode` getter passed to `buildEditor` so plain Enter is never `'enter-sends'` on mobile.
- **Files**: `frontend/src/components/chat/markdownEditor/MarkdownEditor.tsx` (the `pluginRefs: { getEnterMode: () => enterModeRef }` block at line 271; and the `enterModeRef` effect at line 193-195).
- **Note**: Two-line change. Update the effect at line 193 so when `isMobile()` is true `enterModeRef = 'cmd-enter-sends'` regardless of `enterMode()`. This single source-of-truth approach keeps `createSendOnEnterPlugin` / `createListItemEnterPlugin` (in `~/lib/editor/keyboardPlugins.ts`) untouched. Desktop preference path unchanged. Do **not** also pass `isMobile` into `editorSetup.ts` (T3 covers attribute-only).
- **Audit**: search `enterModeRef` (must remain only one writer); `createSendOnEnterPlugin` consumers (none other than `editorSetup.ts`).
- **Test gate**: mobile viewport, type "hi" + press Enter → second line inserted, no `onSend` call. Desktop, with `enterKeyMode='enter-sends'`, Enter sends.

### T3 — `enterkeyhint='enter'` on mobile attributes

- **Subject**: Branch the static `enterkeyhint` value in editorView attributes.
- **Files**: `frontend/src/components/chat/markdownEditor/editorSetup.ts` (line 119-138 attribute block); call site `MarkdownEditor.tsx` line 266 (`buildEditor({ ... })`).
- **Note**: Extend `EditorSetupOptions` with `isMobile: boolean` (plain boolean, snapshotted at editor build time — keyboard hint is set once and the editor lives only while mounted; no need for reactivity since mobile/desktop switches remount Chat). Inside `editorViewOptionsCtx.update`, set `'enterkeyhint': opts.isMobile ? 'enter' : 'send'`. Pass `isMobile: isMobile()` from `MarkdownEditor.tsx` build call.
- **Audit**: grep `enterkeyhint` — only this one occurrence expected.
- **Test gate**: mobile DOM inspector shows `enterkeyhint=\"enter\"` on `.ProseMirror`; desktop shows `\"send\"`.

### T4 — Mobile single-row layout in AgentEditorPanel

- **Subject**: Swap the desktop `<div class={footerBar}>` for a mobile single-row composer inside the `footer={...}` prop of `<MarkdownEditor>`.
- **Files**: `frontend/src/components/chat/AgentEditorPanel.tsx` (lines 316-461 — the `footer={...}` ternary), and a new `frontend/src/components/chat/MobileComposerBar.tsx`.
- **Note**:
  - Inside the existing `: ( ... )` branch (the non-control-request footer, currently the `<div class={footerBar}>` block at line 378), wrap with `<Show when={isMobile()} fallback={<DesktopFooterBar/>}>`. Either extract the existing footerBar JSX into a local function (`renderDesktopFooter`) or keep inline and use `<Show>`. Inline `<Show>` is fine — both branches share `info`, `props.agent`, `ctrl`, `interruptLoading`, `sending`, `hasContent`, `attachments`, `triggerSend`.
  - Mobile branch returns `<MobileComposerBar>` with the following props (purely lifted from desktop branch state — no new store/fetch):
    - `disabled`, `settingsLoading`, `agent` (model/effort/permissionMode/extraSettings/availableModels/availableOptionGroups/agentProvider), `onSettingChange` → for `EditorSettingsDropdown`.
    - `info` accessors (`showInfoTrigger`, `infoHoverCardContent`, `urgentRateLimit`), `agentSessionInfo`, `modelContextWindow()`, `agentProvider` → for the agent-info menuitem.
    - `showInterrupt: ctrl.showInterrupt`, `interruptLoading`, `onInterrupt: props.onInterrupt` → Interrupt menuitem.
    - `hasContent`, `attachments`, `sending`, `streaming: props.agentWorking`, `triggerSend: () => triggerSend?.()`, `startSending`.
    - `onOpenFilePicker: () => fileInputRef?.click()` → Paperclip menuitem.
  - The control-request branch (line 317 `<ControlRequestActions>`) is NOT mobile-specialized in this scope (AC9: control-request layout preserved). Only the non-control-request footer gets the mobile swap.
- **Audit**: confirm `props.triggerSendRef`/`registerPanelSend` wiring still triggers the same `handleSend` regardless of footer variant (the `imperative.sendRef` is on `<MarkdownEditor>` itself, not on the footer button — so unaffected).
- **Test gate**: mobile viewport, non-control-request: single row visible, `[data-testid=\"send-button\"]` present, no `[class*=\"footerBar\"]`. Desktop unchanged.

### T5 — `+` menu contents in MobileComposerBar

- **Subject**: Build `<MobileComposerBar>` JSX with the `+` button hosting a `DropdownMenu` (placement `top-start`).
- **Files**: `frontend/src/components/chat/MobileComposerBar.tsx` (new).
- **Note**:
  - Layout: `<div class={styles.mobileComposerRow}>` with three children: `+` `DropdownMenu` trigger button (lucide `Plus`), `<div class={styles.mobileEditorSlot}/>` **NO — the MarkdownEditor is the parent (we are inside the `footer` slot)**. Reconsider: since `MobileComposerBar` is rendered as `footer={...}` of `<MarkdownEditor>`, the ProseMirror editor is above this footer, not flanking it. To get the visual `[+] [input] [Send]` row, we move from `footer` mount to **replacing the entire desktop footer + editor structure on mobile inside the inputArea**. Adjust: keep the `footer` slot but make the row contain just `[+] [Send]` placed visually adjacent to the editor via CSS (`flex-direction: row` on the parent `container`). **However** the editor and footer are children of `<div class={styles.container}>` inside `MarkdownEditor` (line 498), not configurable from outside.
  - **Final mount strategy (overrides Resolved decision above)**: Render `MobileComposerBar` in `AgentEditorPanel.tsx` **inside `inputArea` next to `<MarkdownEditor>`**, by branching the `<MarkdownEditor>` invocation: on mobile, pass `footer={undefined}` and render `<MobileComposerBar>` as a **sibling under `inputArea`** alongside an editor configured with no banner/footer chrome. Layout via CSS: `inputArea` becomes `display: flex; flex-direction: column` (existing) but we wrap `MarkdownEditor + MobileComposerBar` in an inner `<div class={mobileComposerRow}>` using `display: flex; flex-direction: row`. The MarkdownEditor's internal `<div class={styles.container}>` already accepts flex children — it will sit naturally inside a row flex container.
  - Concrete change in `AgentEditorPanel.tsx`: wrap `<MarkdownEditor>` with `<Show when={isMobile() && !ctrl.activeControlRequest()} fallback={<MarkdownEditor .../>}>` and render `<div class={mobileComposerRow}><PlusButton/><MarkdownEditor footer={undefined} .../><SendButton/></div>`. The `+` and Send buttons live in `MobileComposerBar` exported pieces, or inlined directly — prefer inline JSX inside AgentEditorPanel to avoid prop-drilling for `info`, `ctrl`, `triggerSend`. **Recommended: inline, no new file.** (Cancel new `MobileComposerBar.tsx` creation; instead inline the JSX block.)
  - `+` button JSX: `<DropdownMenu placement={{ placement: 'top-start' }} trigger={(p) => <button {...p} class={styles.plusButton} aria-label=\"More actions\" aria-haspopup=\"menu\"><Icon icon={Plus} size=\"sm\"/></button>} class=\"card\">` … `<menu>` children below.
  - Menu items (each as `<li role=\"menuitem\">` with `onClick`):
    1. Paperclip + "파일 첨부" → `onClick={() => fileInputRef?.click()}` (closes popover by default light-dismiss; can call `hidePopover()` via `popoverRef` if needed).
    2. Slot containing `<EditorSettingsDropdown ...>` — identical prop set to desktop branch. Renders the dropdown's own trigger button inline (nested popover). Note: `EditorSettingsDropdown` internally uses `DropdownMenu` — nested `popover=auto` light-dismiss means opening it closes the outer `+` menu. Acceptable per Designer ("regular menuitem"), and consistent with native overflow menus.
    3. Agent info slot — extract the `<DropdownMenu>` block currently at AgentEditorPanel lines 392-425 into a tiny inline JSX, reused; render its trigger as menuitem.
    4. Interrupt menuitem inside `<Show when={ctrl.showInterrupt()}>`, lucide `Square` + "중단", `class={styles.interruptMenuItem}` (destructive color), `onClick` mirrors current Interrupt button logic at lines 429-442 (interruptLoading.start + props.onInterrupt).
  - Send button (sibling of `+` button, outside menu): inline JSX in the row, lucide `SendHorizontal`, `disabled={(!hasContent() && attachments().length === 0) || props.disabled || sending()}`, `onClick={() => { startSending(); triggerSend?.() }}`. `aria-label=\"Send message\"`. `data-testid=\"send-button\"`.
- **Audit**: `EditorSettingsDropdown` and the agent-info `DropdownMenu` are now rendered twice in the component tree only when desktop is hidden (mobile branch); confirm no global singleton assumption (none — both are stateless re-render).
- **Test gate**: mobile, click `+` → menu opens with 4 items (5 with Interrupt during streaming). Click "파일 첨부" → file picker opens. Click model row → `EditorSettingsDropdown` popover shows model list.

### T6 — AttachmentStrip placement (no change)

- **Subject**: Verify strip stays above the composer row.
- **Files**: `frontend/src/components/chat/AgentEditorPanel.tsx` line 234-236.
- **Note**: `AttachmentStrip` is rendered before `<MarkdownEditor>` inside `inputArea`. When T5 wraps `<MarkdownEditor>` in `<div class={mobileComposerRow}>`, the strip remains a sibling above the row — exactly the desktop behavior.
- **Audit**: none.
- **Test gate**: with one attachment, mobile composer shows strip ABOVE the `[+][input][Send]` row.

### T7 — Styles

- **Subject**: Add three CSS rules in `ChatView.css.ts` (do not introduce a new module; existing file already owns chat-input styles).
- **Files**: `frontend/src/components/chat/ChatView.css.ts`.
- **Note**: New exports:
  - `mobileComposerRow`: `display: flex; alignItems: flex-end; gap: var(--space-2); padding: var(--space-2)`. The middle `<MarkdownEditor>` container gets `flex: 1; minWidth: 0` via a selector or via injecting `style` on its outer `<div class={styles.container}>` — easier: add a nested selector `'& > [data-testid=\"chat-editor-shell\"]': { flex: 1, minWidth: 0 }` (add `data-testid` to MarkdownEditor's container; or wrap `MarkdownEditor` in a `<div style={{flex:1,minWidth:0}}>` in the row — **prefer the wrapper** to avoid touching MarkdownEditor markup beyond T1).
  - `plusButton`: `width: 36px; height: 36px; padding: 0; background: transparent; color: var(--foreground); borderRadius: var(--radius-medium); display: inline-flex; alignItems: center; justifyContent: center; border: 'none'`.
  - `sendButtonMobile`: same dimensions, `background: var(--primary)`, `color: white`. `:disabled` selector `opacity: 0.5; cursor: not-allowed`.
  - Editor sizing: `mobileEditorSlot` wrapper enforces `minHeight: 36px; maxHeight: 150px; overflowY: auto; flex: 1; minWidth: 0`. Apply via the wrapper `<div>` around `<MarkdownEditor>` in mobile branch.
- **Audit**: no overrides to existing `footerBar`, `infoTrigger`, `inputArea`. Grep `mobileComposerRow` after — only this file and `AgentEditorPanel.tsx`.
- **Test gate**: visual sanity — row sits at bottom 36px tall when empty.

### T8 — A11y

- **Subject**: ARIA attributes on `+` trigger and Send.
- **Files**: `frontend/src/components/chat/AgentEditorPanel.tsx` (mobile branch JSX from T5).
- **Note**:
  - `+` button: `aria-label=\"More actions\"`, `aria-haspopup=\"menu\"`, `aria-expanded` already provided by `DropdownMenu` trigger props.
  - Send: `aria-label=\"Send message\"`, native `disabled`.
  - Menu items: `role=\"menuitem\"` on each `<li>` (the `<menu>` element itself is the popover container — `DropdownMenu` with `as=\"menu\"` default).
  - Focus return on close: rely on native popover `popover=\"auto\"` light-dismiss; verify `DropdownMenu` returns focus to trigger (existing behavior — no code needed).
- **Audit**: grep for "aria-haspopup" elsewhere — consistent values.
- **Test gate**: keyboard Tab into `+`, Enter opens, Esc closes, focus on `+`.

### T9 — Audit

- **Subject**: Verify no other consumers break.
- **Files**: search-only.
- **Note**:
  - `EditorToolbar` import: only `MarkdownEditor.tsx` — safe.
  - `EditorSettingsDropdown` import: only `AgentEditorPanel.tsx` — safe (we add one more usage in same file).
  - `infoTrigger` (CSS export and `ControlRequestActionsProps.infoTrigger` prop in `controls/types.ts:53`): control-request path consumes `infoTrigger` via JSX prop — keep desktop & mobile behavior identical for control-request (no mobile branch in control-request footer per AC9). Confirmed unaffected.
  - `getEnterMode`/`enterModeRef`: only `MarkdownEditor.tsx` writes — safe.
  - `enterkeyhint`: only `editorSetup.ts:133` — safe.
- **Audit**: run `pnpm typecheck` after edits. Run `pnpm test:e2e:mobile` (if exists) or new Playwright case from T1/T2/T5 test gates.
- **Test gate**: full `pnpm typecheck` clean; existing chat e2e (`chat-composer-mobile`) still green.

techlead_confidence: 0.72
- Most uncertain: T5 mount-strategy churn — original spec said `+` menu lives "inside `editorPanelWrapper`"; final resolution is to wrap `<MarkdownEditor>` in a flex row sibling pair, which requires a wrapper `<div>` around `<MarkdownEditor>` to give it `flex:1`. Risk of layout regression at the `editorMinHeight`/resize-handle interaction (existing `useEditorMinHeight` reads `panelRef`'s height, not the inner row — should be OK, but verify on resize-handle drag in mobile).
- Defer recommendation: defer the control-request mobile single-row treatment entirely (AC9 already says control-request preserves desktop layout). If QA finds the control-request footer cramped on mobile, file a follow-up — out of scope here.

## A11y checklist

- `+` 트리거: `aria-label="More actions"`, `aria-haspopup="menu"`, `aria-expanded` 동기화.
- Send 버튼: `aria-label="Send message"`, native `disabled` 사용.
- 메뉴는 `role="menu"`/`menuitem`, 포커스 트랩.
- ESC 닫힘 후 포커스는 `+` 트리거로 복귀.
- 첨부 strip 제거 버튼 키보드 reachable.
- `enterkeyhint`로 SR/IME에 개행 신호.

## QA

### Dev notes

T1–T9 implemented. Files modified:

- `frontend/src/components/chat/markdownEditor/MarkdownEditor.tsx`
  - Imported `useIsMobile` + `Show`; instantiated `const isMobile = useIsMobile()` next to `preferences`.
  - **T1**: wrapped `<EditorToolbar .../>` in `<Show when={!isMobile()}>` — JSX-level removal, toolbar DOM does not render on mobile. `<CodeLanguagePopover>` (sibling, line 545) and link popover state remain mounted; they're only opened via toolbar triggers, so on mobile they are never opened (no orphan popovers).
  - **T2**: updated the `enterModeRef` effect to `isMobile() ? 'cmd-enter-sends' : enterMode()`. Single writer preserved; `createSendOnEnterPlugin` / `createListItemEnterPlugin` untouched. Desktop `preferences.enterKeyMode` flow unchanged.
  - **T3**: passed `isMobile: isMobile()` (boolean snapshot) into `buildEditor({...})` per the spec's no-reactivity-needed rationale (mobile↔desktop transitions remount Chat).

- `frontend/src/components/chat/markdownEditor/editorSetup.ts`
  - **T3**: extended `EditorSetupOptions` with `isMobile: boolean`; set `'enterkeyhint': opts.isMobile ? 'enter' : 'send'` inside the `editorViewOptionsCtx.update` attributes block. AutoFill suppression attrs (`data-1p-ignore` etc.) and other iOS guards preserved verbatim.

- `frontend/src/components/chat/AgentEditorPanel.tsx`
  - Imported `Info`, `Paperclip`, `Plus` lucide icons + `useIsMobile`.
  - Added `isMobile`, `useMobileComposer = () => isMobile() && !ctrl.activeControlRequest()`, `sendDisabled`, `handleSendClick`, `handleInterruptClick`, and `renderAgentInfoTrigger()` helpers near the bottom of the component, before `return`.
  - **T4/T5**: wrapped the `<MarkdownEditor>` invocation in `<Show when={useMobileComposer()} fallback={<MarkdownEditor … />}>`. Mobile branch renders `<div class={mobileComposerRow}>` containing:
    1. `+` `DropdownMenu` (placement `'above'`) with trigger `<button class={mobilePlusButton}><Icon icon={Plus}/></button>`, `aria-label="More actions"`, `aria-haspopup="menu"`, `data-testid="mobile-plus-button"`.
    2. Menu children, in spec-prescribed order: `파일 첨부` (`Paperclip` + `onClick={() => fileInputRef?.click()}`), `<hr>`, `EditorSettingsDropdown` slot (with `onPointerDown/onClick stopPropagation` to prevent outer-menu light-dismiss before nested popover opens), agent-info slot (lucide `Info`, also stop-propagation), Interrupt menuitem (lucide `Square`, `class={mobilePlusMenuItemDestructive}`, mirrors desktop interrupt handler).
    3. `<div class={mobileEditorSlot}>` wrapping `<MarkdownEditor>` with `footer={undefined}`, `banner` omitted, `onSend={ctrl.handleSend}` (control-request flows never reach this branch per AC9), and `allowEmptySend={attachments().length > 0}`.
    4. Send button `<button class={mobileSendButton}>` with lucide `SendHorizontal`, `aria-label="Send message"`, `data-testid="send-button"`, `disabled={sendDisabled()}` matching the truth table.
  - Fallback branch (desktop OR mobile-with-control-request) keeps the existing `<MarkdownEditor>` markup with footer ternary unchanged, but deduplicated the agent-info popover via `renderAgentInfoTrigger()`. `data-testid="send-button"` and `data-testid="interrupt-button"` preserved.

- `frontend/src/components/chat/ChatView.css.ts`
  - **T7**: appended `mobileComposerRow`, `mobileEditorSlot`, `mobilePlusButton`, `mobileSendButton`, `mobilePlusMenu`, `mobilePlusMenuItem`, `mobilePlusMenuItemDestructive`, `mobilePlusMenuSeparator`, `mobilePlusMenuSlot`. Vanilla Extract `style({...})` exports per project convention. Did not touch `footerBar`, `inputArea`, `editorPanelWrapper`, `editorResizeHandle`, or the `globalStyle(*)` `touch-action: none` cascade — all preserved.

### Decisions

- **`+` menu placement**: used `placement: 'above'` (the only allowed value besides `'auto'` in `popoverPosition.ts`; `'top-start'` from the spec is not in the union type). The popover already anchors to the trigger and flips when there is insufficient space, so the effective behavior matches the Designer's intent.
- **Mount strategy**: followed T5's "Final mount strategy (overrides Resolved decision above)" — inlined the mobile JSX in `AgentEditorPanel.tsx`, did **not** create a new `MobileComposerBar.tsx` file. The desktop and mobile `<MarkdownEditor>` invocations both live inside `<Show when={useMobileComposer()}>` so prop-drilling is local and `triggerSend`/draft persistence wiring is identical across branches.
- **Nested popover light-dismiss**: wrapped the `EditorSettingsDropdown` and agent-info slots in `<div class={mobilePlusMenuSlot} onPointerDown={stop} onClick={stop}>`. Without this the outer `<menu popover="auto">`'s `onClick={hidePopover()}` fires before the nested DropdownMenu's `togglePopover()` runs, snapping both popovers closed. Spec called this out under the "Resolved decisions (Open Q EditorSettingsDropdown / infoTrigger props)" bullet.
- **Control-request preservation**: mobile + control-request still uses the desktop footer (`<ControlRequestActions>` with `infoTrigger={renderAgentInfoTrigger()}`). AC9 satisfied.
- **AttachmentStrip (T6)**: no code change — strip is already rendered as a sibling of the editor inside `inputArea`, before the mobile row, so it sits above the `[+][input][Send]` row automatically.

### Gates

- `bun run typecheck`: PASS (no errors).
- `bun run lint`: PASS (no warnings).
- `bun run test -- AgentEditorPanel MarkdownEditor editorSetup`: PASS (8/8; no test files specifically target these names — vitest matched zero files literally, but the run reports a default suite of 1 file/8 tests with no failures).
- `bun run test`: PASS (234 files, 3251/3251 tests).

### Audit (T9)

- `EditorToolbar`: only consumer is `MarkdownEditor.tsx`.
- `EditorSettingsDropdown`: only `AgentEditorPanel.tsx` (now used twice in the same file — desktop footer and mobile `+` menu slot).
- `enterModeRef`: single writer (the `createEffect` at line 199 of `MarkdownEditor.tsx`).
- `enterkeyhint`: single occurrence in `editorSetup.ts:141`.
- `getEnterMode`: passed only to `buildEditor({ pluginRefs })`; no other consumers.
- `infoTrigger` prop of `ControlRequestActionsProps`: control-request path unchanged in behavior — `<Show when={info.showInfoTrigger()}>` renders nothing when the trigger should not be shown (equivalent to the previous `undefined` value).
- Recent fixes preserved: `editorPanelWrapper` mobile rules (paddingBottom safe-area, borderTop, touchAction: none cascade), `mobileTilePaneSlot` (not in this file's scope, untouched), body `fixed` positioning (untouched), AutoFill suppression attrs (`data-1p-ignore` etc., untouched). Resize handle hidden on mobile via existing media query — still works.

dev_confidence: 0.84
- Lower-risk areas: T1/T2/T3 (small, surgical), T7 (additive CSS).
- Highest residual risk: T5 `EditorSettingsDropdown` opening inside the outer `+` menu. Nested `popover="auto"` propagation is browser-quirk-prone; the `stopPropagation` on the slot wrapper should handle the documented case, but interaction with iOS Safari's virtual-keyboard light-dismiss heuristics is not unit-tested here. QA should validate the model picker open/close round-trip on real iOS Safari.
- One spec-vs-implementation deviation: spec asked for `placement: 'top-start'`; only `'above' | 'auto'` exist in the project's `PopoverPositionOptions` union. Used `'above'` (equivalent vertical intent).

## QA (QA fills)

- iOS Safari 17/18, Android Chrome 최신: toolbar 부재, Enter=개행, Send 동작, `+` 메뉴 4항목.
- 데스크탑 회귀: 툴바·Enter-mode·footer bar 동일.
- 첨부만 있는 상태에서 Send 활성화.
- Control-request 진입/탈출 시 모바일 레이아웃 유지.

### QA + PM verdict

**Gates** — `typecheck` PASS / `lint` PASS / `test` PASS (234 files, 3251/3251 tests).

**Requirement checks**

| # | Requirement | Result | Evidence |
|---|---|---|---|
| 1 | 모바일에서 EditorToolbar DOM 제거 | PASS | `MarkdownEditor.tsx:506` — `<Show when={!isMobile()}>` wraps `<EditorToolbar>`. JSX-level removal, not CSS. |
| 2 | `+` 메뉴: 파일첨부 / EditorSettingsDropdown / 에이전트 정보 / Interrupt | PASS | `AgentEditorPanel.tsx:470–545` — 파일 첨부(Paperclip), `EditorSettingsDropdown` slot(stopPropagation), 에이전트 정보(Info DropdownMenu), `<Show when={ctrl.showInterrupt()}>` 중단 item. |
| 3 | 단일 행 `[+][editor][Send]` flex 레이아웃 | PASS | `AgentEditorPanel.tsx:449` `mobileComposerRow`; `ChatView.css.ts` — `display:flex, alignItems:flex-end, gap`. `mobileEditorSlot` `flex:1`. |
| 4 | 모바일 Enter=개행 + `enterkeyhint:'enter'` | PASS | `MarkdownEditor.tsx:199` — `enterModeRef = isMobile() ? 'cmd-enter-sends' : enterMode()`. `editorSetup.ts:141` — `opts.isMobile ? 'enter' : 'send'`. |
| 5 | Send는 버튼으로만, disabled 조건 정확 | PASS | `AgentEditorPanel.tsx:224` — `sendDisabled = () => (!hasContent() && attachments().length === 0) \|\| props.disabled \|\| sending()`. 모바일 `data-testid="send-button"` 전용 (`:608`). |

**Regression checks**

| Item | Result | Evidence |
|---|---|---|
| 데스크탑 footer bar 유지 (`footerBar`, `EditorSettingsDropdown`, `infoTrigger`, Interrupt, Send) | PASS | Fallback branch `AgentEditorPanel.tsx:401–444` intact; `renderAgentInfoTrigger()` 재사용으로 더 깔끔해짐. |
| touch-action lock / safe-area / body fixed | PASS | `ChatView.css.ts` 기존 globalStyle `touchAction` 블록 (L70, L488, L491, L504) 미변경. |
| AutoFill 억제 (`data-1p-ignore` 등) | PASS | `editorSetup.ts:142–144` 그대로. |
| `DropdownMenu.tsx`, `sharedTree.css.ts` 미변경 | PASS | `git diff` 출력 없음. |
| Control-request 경로 (AC9) | PASS | `useMobileComposer = () => isMobile() && !ctrl.activeControlRequest()` — control-request 상태엔 desktop footer 유지. |

**Minor deviations (not blocking)**

- `placement: 'top-start'` → `'above'`: 프로젝트 `PopoverPositionOptions` 유니온에 `'top-start'` 없음. `'above'` 사용 — 의미적으로 동등, spec에 명시됨.
- 데스크탑 footer Send 버튼 레이블: 기존 "Send" 텍스트 유지(spec은 icon-only 언급 없음) — 문제 없음.
- `EditorSettingsDropdown` 모바일 `+` 메뉴 슬롯에서 nested popover 동작은 실기기(iOS Safari 17/18) 검증 필요 (stopPropagation 처리됨, 브라우저 quirk 단위테스트 불가).

qa_score: 97/100
pm_score: 95/100
모든 5개 사용자 요구사항 및 AC 충족, 게이트 전부 통과. `+` 메뉴 중첩 popover의 iOS Safari 실기기 검증이 유일한 잔여 리스크.

## Open questions

- Q1 `+` 메뉴 표시 형식: popover(데스크탑 동일 UX) vs 모바일 전용 bottom-sheet — Designer 결정.
- Q2 Send 버튼 활성화 임계: 텍스트만 / 첨부만 / 둘 다 — 위 AC5 안 채택 가정.
- Q3 툴바 제거 방식: JSX skip(권장) vs CSS-only hide(작은 변경) — TechLead 결정.
- Q4 Enter 분기 구현 위치: `getEnterMode` override vs ProseMirror keymap 직접 패치.

pm_confidence: 0.78 — 핵심 불확실성은 `+` 메뉴를 popover로 둘지 bottom-sheet 신규 컴포넌트로 만들지(Designer Q1)에 따른 구현 범위 차이.

## QA

### Dev notes

**Follow-up: KakaoTalk-style refinement (2026-05-15)**

사용자 요구: "카카오톡처럼 디자인. 노란색은 우리식(teal). 입력창 안 개행 간격 너무 큼."

Changes (모바일 < 640px 전용, 데스크탑 무영향):

1. **`ChatView.css.ts` — `mobileComposerRow`**
   - `padding`: `var(--space-1) var(--space-2)` → `var(--space-2)` (균일 컴팩트).
   - `gap`: `var(--space-1)` → `var(--space-2)`.
   - `alignItems: flex-end` 유지 (editor 자라도 [+]/[Send] 하단 정렬).

2. **`ChatView.css.ts` — `mobileEditorSlot`** (pill-shape 컨테이너로 승격)
   - `backgroundColor: var(--lm-view-bg)` (off-white surface).
   - `border: 1px solid var(--border)`, `borderRadius: 20px` (pill).
   - `overflow: hidden` (자식 ProseMirror 모서리 클리핑).
   - `&:focus-within { borderColor: var(--muted-foreground) }` — 하드 blue ring 대신 미묘한 border darken.

3. **`ChatView.css.ts` — `mobilePlusButton`**
   - `color: var(--foreground)` → `var(--muted-foreground)` (line-icon 톤).
   - Hover/active: `backgroundColor: var(--card)` + `color: var(--foreground)` (subtle tint).
   - 36×36, no border 유지 (이미 KakaoTalk 사양).

4. **`ChatView.css.ts` — `mobileSendButton`**
   - `borderRadius: var(--radius-medium)` → `50%` (circular).
   - `backgroundColor: var(--primary)` (teal — 노란색 X). 36×36, white icon.

5. **`MarkdownEditor.css.ts` — `container`**
   - 모바일 `@media (max-width: 639px)`: `border: none`, `borderRadius: 0`, `backgroundColor: transparent`. 외부 `mobileEditorSlot` pill이 chrome을 제공하므로 이중 border 방지.
   - 데스크탑 동작 변경 없음 (`'&:focus-within'`의 `var(--ring)`은 `border: none` 모바일에서 자연스레 no-op).

6. **`MarkdownEditor.css.ts` — `editorWrapper .ProseMirror`** (line-height 핵심 수정)
   - 별도 `globalStyle` 블록 추가: `@media (max-width: 639px)`에서 `lineHeight: 1.3`, `fontSize: 16px` (iOS zoom 방지), `padding: 8px 14px` (pill 내부 caret 여백).
   - **Root cause**: `messageList`의 `lineHeight: 1.75`는 composer에 cascade되지 않음. ProseMirror 자체 기본값(`normal` ≈ 1.2~1.5, OAT theme tokens 따라 다름)이 모바일에서 시각적으로 크게 느껴짐 → 명시적 1.3으로 고정.
   - `body` / OAT `--leading-normal` 글로벌 line-height에 영향받지 않도록 ProseMirror 셀렉터 자체에 직접 선언.

7. **`AgentEditorPanel.tsx` — 모바일 Send 아이콘 swap**
   - `ArrowUp` import 추가 (`lucide-solid/icons/arrow-up`).
   - 모바일 `mobileSendButton` 내부 `<Icon icon={SendHorizontal}>` → `<Icon icon={ArrowUp}>`.
   - 데스크탑 footer Send (line 438)는 `SendHorizontal` 유지 — import도 그대로 유지.

**Constraints 준수**
- `DropdownMenu.tsx`, `sharedTree.css.ts`, `sidebarActions*`, `generated/*` 미변경.
- 기존 mobile 사양(touch-action lock `${editorPanelWrapper} *`, safe-area, body fixed, JSX-skip 툴바) 그대로 유지.
- 데스크탑 composer (`editorPanelWrapper` desktop branch, footer bar, EditorToolbar) 시각/동작 무변경.
- 토큰 사용: `--primary` (teal), `--border`, `--muted-foreground`, `--card`, `--lm-view-bg`, `--foreground`. 하드코드 색상 없음.
- Lucide-solid 아이콘만 사용 (`ArrowUp`).

**Gates** — `typecheck` PASS / `lint` PASS / `test` PASS (234 files, 3251/3251).

**Files modified**
- `frontend/src/components/chat/ChatView.css.ts`
- `frontend/src/components/chat/markdownEditor/MarkdownEditor.css.ts`
- `frontend/src/components/chat/AgentEditorPanel.tsx`

**Residual risks**
- iOS Safari 17/18 실기기에서 pill `border` + ProseMirror caret 정렬 마진 확인 필요. `overflow: hidden` + `border-radius: 20px`이 가끔 텍스트 베이스라인을 미세하게 자르는 케이스 존재 (jsdom에서는 reproduce 불가).
- 다크 모드: `--lm-view-bg`가 다크에서 `--card`와 동일(`rgb(28 27 30)`)이라 pill이 배경 대비 매우 약함 — 디자인 의도(전체 채팅 영역이 어두운 톤)면 OK, 명확한 layering이 필요하면 다크 전용 `backgroundColor` 분기 필요. 현재 spec은 layering 강조 없음.
- ProseMirror 코드 블록(`pre`)는 별도 `lineHeight: 1.5` 유지 (markdownContent.css.ts:98) — 모바일 composer 안에서 코드 블록 입력 시 단락보다 약간 넓은 줄간격이지만 가독성 측면에서 정상.

dev_confidence: 0.92 — 5개 요구사항(pill / no blue ring / circular send / teal / line-height) 모두 토큰 기반으로 처리, 게이트 전부 그린. 잔여 0.08은 iOS 실기기 caret/베이스라인 미세 정렬 및 다크 모드 layering 판단(Designer 후속 검토)에 대한 일반적 불확실성.

