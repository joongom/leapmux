# iOS Keyboard Composer Fix

- **id**: `ios-keyboard-fix`
- **status**: draft
- **date**: 2026-05-15
- **owner**: PM (dispatch: Mobile-FE specialist)
- **priority**: P0 — repeat regression, user frustrated

## Problem

> "모바일 뷰에서 보면 키보드가 올라올 때 우선 사용하지 않을 암호, 결제, 관련된 툴바가 하나 나오고, 그리고 빈공간이 잔뜩 들어간 상태로 스크롤이 되어버려."

iOS Safari에서 채팅 composer에 포커스하면 (1) **iOS AutoFill 툴바** (🔑 비밀번호 / 💳 카드 / 📍 위치 / ✓) 가 노출되고, (2) composer가 화면 **하단이 아니라 상단**에 위치하며 그 아래로 거대한 빈 공간이 생긴다. 이전 hotfix `5cb3da8` (`mobileTilePaneSlot` wrapper) 는 실제 iOS 기기에서 동작하지 않았다.

## User Stories

1. iOS Safari 사용자로서, 채팅 입력창을 탭했을 때 비밀번호/카드 AutoFill 툴바가 뜨지 않아야 한다 — 이건 채팅이지 결제 폼이 아니다.
2. iOS Safari 사용자로서, 키보드가 올라오면 composer는 키보드 바로 위에 붙어 있어야 하며, 그 사이에 빈 흰 공간이 없어야 한다.
3. 개발자로서, 빌드/HMR이 최신인지 화면에서 즉시 확인할 수 있어야 동일 증상을 디버깅할 수 있다.

## Acceptance Criteria

- **AC1 — AutoFill 억제**: contenteditable / wrapping form이 `autocomplete="off"`, `inputmode="text"` (or richer), `enterkeyhint="send"`, `name`/`type` 미설정 또는 의미적으로 비-credential. iOS Safari + iOS Chrome에서 password/credit-card/location chip이 **노출되지 않음**.
- **AC2 — Composer 하단 고정**: 키보드 open 상태에서 composer top이 visualViewport `height + offsetTop` 의 하단 근처 (composer height + AutoFill bar 영역 내) 에 위치.
- **AC3 — Empty space 제거**: composer 와 keyboard top 사이 빈 영역 ≤ AutoFill bar 높이.
- **AC4 — `--vvh` 검증**: 키보드 open 시 `getComputedStyle(document.documentElement).getPropertyValue('--vvh')` 값이 감소함이 실측 가능. Dev mode 한정 `?diag=vp` 쿼리 시 화면 코너에 `vvh / innerHeight / commit SHA` 오버레이.
- **AC5 — Build freshness**: `<html data-build="<gitShortSha>">` 주입. 사용자는 Safari 주소창에서 `document.documentElement.dataset.build` 로 확인 가능. 빌드 stale 가설을 즉시 reject/accept.
- **AC6 — No regression**: Desktop (≥768px) 레이아웃·desktop composer position·Tauri shell 변화 없음.
- **AC7 — Android baseline**: Android Chrome에서 composer가 키보드 위에 붙는 동작이 깨지지 않음 (정밀 튜닝은 별도).
- **AC8 — Scroll lock**: `body`/`html` 어디에서도 `overflow: auto` 가 mobile shell 내부로 cascade 되어 chat이 page-scroll로 빠지지 않음.

## Out of Scope

- Android-specific keyboard tuning (별도 사이클).
- Desktop / iPad split-view / Tauri.
- 메시지 리스트 스크롤 stickiness (commit `40dec76` 영역).
- 키보드 dismiss 시 애니메이션 정밀 동기화.

## UI Notes (Mobile-FE specialist fills)

- iOS AutoFill 억제 매트릭스 (iOS 17/18 × Safari/Chrome).
- composer `position: fixed; bottom: 0` vs flex bottom-of-column 중 iOS visualViewport와 안정적인 패턴.
- `--vvh` 대신 `100svh` / `interactive-widget=resizes-content` viewport meta 검토.

## Tasks (TechLead fills)

Investigation enumeration (PM-listed hypotheses):

1. Vinxi/HMR stale build 확인 — `data-build` SHA 주입 + 사용자 hard refresh 절차.
2. `useVisualViewportInset` 가 iOS에서 실제로 fire 하는지 확인 (Dev overlay).
3. `AppShell.tsx`의 `fullWindow` wrapper (`overflow: auto`) 가 mobile branch에 cascade 되는지 점검.
4. `MobileLayout` JSX 순서 / `flex-direction` regression 확인.
5. `AgentEditorPanel` / `MarkdownEditor` root에 `position: sticky|fixed|absolute` 또는 inline style 누수 점검.
6. Viewport meta — `viewport-fit=cover, interactive-widget=resizes-content` 누락 시 추가.
7. ProseMirror attrs (`editorSetup.ts:115`) 에 `autocomplete: 'off'` 추가, contenteditable wrapper form 제거 또는 `role="none"` form 처리.
8. Patch → 실기기 (사용자 iPhone, Tailscale URL) 검증 plan.

Heavy diagnostic component (Dev only) 필수: `<MobileViewportDiag />` — 화면 우상단 fixed, `vvh / innerHeight / scrollY / activeElement tag / build SHA`.

## A11y Checklist

- `autocomplete="off"` 가 스크린리더 라벨링을 깨지 않음.
- 키보드 open 시 composer가 포커스 유지, visualViewport 변경 후에도 caret 위치 보존.
- `enterkeyhint="send"` 가 VoiceOver 안내와 충돌 없는지.
- 색 대비·터치 타겟 44pt 유지.

## QA (Mobile-FE specialist fills)

- Devices: iPhone (iOS 17, iOS 18) Safari + Chrome / Android Chrome baseline.
- Scenarios: cold load → focus / blur → focus / orientation change / AutoFill bar dismiss / 긴 메시지 입력 (composer height 증가).
- Network path: Tailscale (`mac-studio.tail5b796b.ts.net:4327`) — 사용자 실제 환경.
- Build SHA 일치 확인 절차 1-line.

### Dev notes (cycle on `740b15a`)

Files touched in this cycle:

- `frontend/app.config.ts` — bake `__BUILD_SHA__` into the client bundle via Vite `define`. Read from `git rev-parse --short HEAD` at config load (override with `LEAPMUX_BUILD_SHA` env var). Falls back to `'unknown'` outside a git checkout.
- `frontend/src/global.d.ts` — declare the `__BUILD_SHA__` global so TS sees it.
- `frontend/src/entry-server.tsx` — emit `<html data-build="<sha>">` so the user can verify the live build via Safari DevTools → Elements OR `document.documentElement.dataset.build` in the JS console.
- `frontend/src/components/shell/AppShell.css.ts` —
  - `fullWindow`: added `@media (max-width: 639px) { overflow: hidden }` so the non-workspace-route fallback (dashboard, login, etc.) cannot become page-scrollable on mobile and let a focused contenteditable inside drag the layout viewport.
  - new `mobileViewportDiag` / `mobileViewportDiagDvhProbe` styles used by the dev diagnostic.
- `frontend/src/components/shell/MobileLayout.tsx` — mount `<MobileViewportDiag>` behind `?diag=mobile` OR `import.meta.env.DEV`. Tagged `mobileCenter` with `data-mobile-center` so the diagnostic can pick it up without coupling to the vanilla-extract class hash.
- `frontend/src/components/shell/MobileViewportDiag.tsx` (new) — top-right HUD: `build SHA / --vvh / vv.height / window.innerHeight / 100dvh (probe) / mobileCenter rect / editor rect / activeElement.tagName`. rAF-coalesced, samples on `visualViewport` resize+scroll, `window.resize`, `focusin`/`focusout`, plus 1Hz heartbeat. Cleaned up on unmount.
- `frontend/src/components/chat/markdownEditor/editorSetup.ts` — extended ProseMirror `attributes` with the AutoFill-suppression matrix: `autocomplete=off`, `inputmode=text`, `enterkeyhint=send`, `data-1p-ignore`, `data-lpignore`, `data-form-type=other`, `data-bwignore`. Targets iOS Safari's password/credit-card/location chips AND 1Password/LastPass/Bitwarden browser extensions.
- `frontend/src/hooks/useVisualViewportInset.ts` — when `window.visualViewport` IS available, also listen to `window.resize` (some iOS Chrome builds and WebView wrappers go silent on `visualViewport.resize` for the keyboard but still emit `window.resize`). rAF dedupes the redundant trigger when both fire.

Verdicts for the 8 PM hypotheses:

A. **iOS AutoFill suppression** — addressed. ProseMirror contenteditable now carries the full AutoFill-off attribute matrix. We deliberately did NOT wrap the editor in a `<form autocomplete="off">`: contenteditable is not a form control, the wrapper would have no effect on the password manager heuristic (they key off the editable element itself), and it would introduce default form-submit semantics on Enter that could fight the existing send-on-enter plugin. AC1.
B. **Visual viewport hook firing** — addressed. The hook IS mounted in `AppShell.tsx:186` (top-level, runs once per app session). Added `window.resize` as a parallel listener so we no longer rely solely on `visualViewport.resize`. The diagnostic overlay is the ground truth here — Stage 1 will tell us if `--vvh` is being written at all on the user's device.
C. **`fullWindow` overflow cascade** — re-verified the code path. `fullWindow` is only used by the **fallback** branch of the workspace-route `<Show>` at `AppShell.tsx:1091` — non-workspace routes (dashboard, login, etc.). It does NOT wrap `MobileLayout` (which is rendered inside the workspace `<Show>` branch and uses `mobileShell` → `overflow: hidden`). So the original hypothesis was wrong for the chat case. BUT to be safe on dashboard pages on mobile we added a `@media (max-width: 639px) { overflow: hidden }` override anyway. AC8.
D. **`100dvh` fallback** — already present. `mobileCenter` uses `height: var(--vvh, 100dvh)` so the CSS-only fallback kicks in if the hook never writes (or before it writes). No change needed; diagnostic surfaces the resolved `100dvh` value for verification.
E. **Visible `data-build` attribute** — addressed. Bakes via `__BUILD_SHA__` at config-load (`app.config.ts`) and emits on `<html>` (`entry-server.tsx`). AC5.
F. **Composer wrapper position** — verified. `editorPanelWrapper` in `ChatView.css.ts` has only `flexShrink: 0` + mobile `paddingBottom` / `borderTop` / `backgroundColor` / `boxShadow`. No `position: sticky/fixed/absolute`. No regression risk from rule cascade.
G. **AgentEditorPanel inner positioning** — verified. The wrapper renders `editorResizeHandle` + `inputArea`. Neither sets `position`. `MarkdownEditor` root is `container` (`display: flex; flex-direction: column; height: 100%; min-height: 0`). No internal positioning that would push content above the wrapper bound.
H. **Auto-scroll on focus** — verified. `AgentEditorPanel` line 225 emits `on:focusin={() => props.onEditorFocus?.()}`, `TileRenderer.tsx:868` wires `onEditorFocus` to `handler.forceScrollToBottom()` (only when `isAtBottomFresh()` — leaves history-reading users alone). `messageListContent` lives inside `messageList` which has overflow-y auto + content. Correct.

Additional decisions:

- **Diagnostic gating**: `?diag=mobile` works in prod builds (user can flip it on remotely without redeploy); dev builds always show it. This is intentional — we expect the user to share a screenshot via Tailscale and need a remote on-switch.
- **Why no viewport-meta `interactive-widget=resizes-content`**: the existing `viewport-fit=cover` meta is correct, and `interactive-widget` is iOS 18+ only with mixed support. We rely on the `useVisualViewportInset` JS path instead, which works on iOS 17 and 18 uniformly.
- **Why both `visualViewport.resize` and `window.resize`**: cost is negligible (rAF dedupe), benefit is robustness against silent-event WebViews. Belt and braces.

User verification message: load `https://mac-studio.tail5b796b.ts.net:4327/?diag=mobile` on the iPhone after the new build is up, focus the composer, then send a screenshot. The HUD's top line must read `build <new-sha>` (not `740b15a` or older) — if not, hard-refresh; the `--vvh` value should drop sharply when the keyboard opens (e.g. 844 → 400-ish); the `editor` rect's `b=…` (bottom) should sit at the bottom of the visible area, not float in the middle.

---

**pm_confidence**: 0.55
**core uncertainty**: 진짜 원인이 (a) stale build인지 (b) `useVisualViewportInset` 미발화인지 (c) 상위 `fullWindow` wrapper의 `overflow:auto` cascade인지 — 실기기 진단 오버레이 없이는 셋 중 어느 것인지 단정 불가. Mobile-FE specialist가 진단 컴포넌트부터 박아야 함.

**dev_confidence**: 0.65
**dev uncertainty**: AutoFill suppression matrix는 attribute-level로는 모두 적용했지만 iOS Safari의 키보드 위 password chip은 contenteditable 한정 attribute 무시 사례가 보고되어 있어 (특히 PWA 모드 `apple-mobile-web-app-capable=yes`), 실기기 결과를 보기 전에는 100% 단언 불가. C 가설은 코드 경로상 chat에는 cascade되지 않는 것이 확정 — 다른 두 가설(B: hook 미발화, A: AutoFill attr)의 어느 쪽이 진짜 원인인지가 diag HUD 한 장으로 결정됨.
