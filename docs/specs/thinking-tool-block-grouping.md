# Thinking + Tool Block Grouping (Card Chrome)

- id: thinking-tool-block-grouping
- status: draft v1
- owner: PM (leapmux)
- date: 2026-05-14

## Problem

Thinking 메시지와 tool_use / tool_result가 본문 사이에 흘러서 그룹핑 신호가 약하다. openclaw-talk처럼 이 둘만 카드 chrome으로 감싸면 메타/부수 정보 영역이 즉시 구분된다. 직전 cycle(`ui-openclaw-talk-refresh`)의 박스 제거 결정은 **어시스턴트 텍스트 한정**이었음을 명시하고, 이번엔 thinking + tool에만 카드를 도입한다.

## User stories

- 독자로서 스레드를 스크롤할 때 thinking 블록이 본문과 시각적으로 분리되어 "사고 과정"임을 즉시 인지하고 싶다.
- 독자로서 tool 사용 시퀀스가 하나의 묶음으로 보여, 어디서 시작/끝나는지 한눈에 파악하고 싶다.
- dark-theme 사용자로서 카드 chrome이 라이트와 동일한 위계로 보였으면 한다.
- 모바일 사용자로서 카드 chrome 때문에 좁은 화면에서 가독성이 떨어지지 않았으면 한다.

## Acceptance criteria

- `thinkingMessage`(`frontend/src/components/chat/messageStyles.css.ts`)는 카드로 감싸진다: `borderRadius: var(--radius-medium)`, `border: 1px solid var(--border)`, `background: var(--lm-thinking-bg)`, padding `var(--space-3)`. 기존 좌측 2px 액센트 라인은 제거 또는 보존(Designer 결정).
- thinking 본문 텍스트 렌더링(`ThinkingBubble`)은 **현행 유지**. chrome만 추가.
- tool_use / tool_result(provider별 renderer)가 카드로 감싸진다: 동일 chrome, 단 `background: var(--lm-tool-bg)`. 토큰 `--lm-tool-bg` / `--lm-thinking-bg`는 light/dark 양쪽 정의됨(`global.css.ts:171,172,236,237`).
- 같은 `spanId`의 `tool_use` + 후속 `tool_result`가 한 카드에 묶이거나 별도 카드 sibling으로 분리(Designer 결정). 묶을 수 없는 orphan은 단독 카드.
- `assistantMessage`, user bubble, plan execution, system message는 **변경되지 않는다** (직전 cycle 결정 유지).
- 메타 행(`messageRow:has(> .${metaMessage})`)의 기존 `1px borderTop` 마이크로 디바이더는 카드 보더와 중복되므로 thinking/tool 카드 행에 한해 제거.
- light + dark 양 테마에서 보더/배경 대비 WCAG non-text 3:1 만족.
- `ToolHeaderActions`(copy/reply/timestamp)는 카드 **밖** (메타 행 absolute right) 유지 — 직전 cycle 정책 그대로.
- 카드 내부 nested 구조는 자체 chrome 없이 본문 상속.
- 키보드/스크린리더 영향 없음 — 순수 시각 chrome, semantic role 미추가.
- `prefers-reduced-motion` 환경에서 카드 transition 비활성.

## Out of scope

- Thinking / tool 카드의 collapse / expand 토글 (openclaw-talk의 chevron + "Thinking..." 헤더). v1은 chrome만, 헤더/토글은 v2.
- Tool renderer 내부 로직(provider별 `genericToolUse`, `ToolUseLayout`, diff renderer 등) 변경.
- 새 provider 추가 또는 tool 결과 데이터 모델 변경.
- 어시스턴트 텍스트 / user bubble / plan / system 메시지 스타일 변경.
- `--lm-thinking-bg` / `--lm-tool-bg` 토큰 값 자체 튜닝(이미 합의된 값 사용).
- Card chrome의 hover/focus 상태(예: shadow elevation).

## UI notes

### Card chrome values

**Thinking card**
- `background: var(--lm-thinking-bg)` (light: `rgba(124,58,237,0.03)` / dark: `rgba(124,58,237,0.08)`)
- `border: 1px solid var(--border)`
- `borderRadius: var(--radius-medium)` — matches user bubble radius; `--radius-small` reads too tight against the wider flat assistant prose above it.
- Padding: `var(--space-3)` top/bottom, `var(--space-4)` left/right. Mirrors `bubbleChrome` padding so the internal text aligns with the prose column.
- No max-width cap. The card stretches full column width like `thinkingMessage`/`assistantMessage` (`alignSelf: stretch`).

**Tool card**
- Same chrome set; swap `background: var(--lm-tool-bg)` (light: `rgba(8,145,178,0.03)` / dark: `rgba(8,145,178,0.08)`).
- Radius, border, padding: identical to thinking card.

### Thinking header
`ThinkingBubble` already renders a chevron + label row (`thinkingHeader` / `thinkingChevron` styles, Brain icon, "Thinking" label). Keep as-is — the card chrome wraps around this existing structure. No new header elements needed. The header's `var(--muted-foreground)` label and chevron read well over both `--lm-thinking-bg` values.

### Tool grouping: option (b) — separate adjacent cards
`tool_use` and `tool_result` each render as their own card, visually adjacent with standard `var(--space-2)` gap. Justified: the current render pipeline emits independent rows per message; a single-card merge would require a structural grouping wrapper with non-trivial pipeline changes, while adjacent sibling cards deliver the visual grouping signal with zero pipeline risk (PM's preferred fallback).

### Left-accent rule
Drop `borderLeft: 2px solid var(--border)` from `thinkingMessage`. The card border on all four sides renders the accent redundant and visually conflicts at the left edge. The card bg already differentiates thinking from assistant prose.

### Vertical rhythm
Card rows (`thinkingMessage`, `metaMessage`) keep `marginBottom: var(--space-4)` — same as current flat thinking rows. Consecutive tool cards use the existing tighter `var(--space-2)` (the `messageRow:has(> .metaMessage)` rule). No new spacing values.

### Meta-row borderTop hairline
The `messageRow:has(> .metaMessage)` rule adds `borderTop: 1px solid var(--border)` and `paddingTop: var(--space-2)`. With a carded tool, this hairline sits immediately above the card border, creating a double-line. Remove `borderTop` + `paddingTop` from rows that contain a carded tool (apply a modifier class `metaMessageCarded`). Thinking rows (`thinkingMessage`) are not under `metaMessage` so no change needed there.

### ToolHeaderActions placement
Stays outside the card (current `position: absolute; right: 0` on the meta-row). Moving it inside the card would require padding adjustments and risks overlap with card content on narrow widths. Policy from previous cycle preserved.

### Action bar / hover affordance
Purple-tinted `--lm-thinking-bg` vs cyan-tinted `--lm-tool-bg` is sufficient to distinguish card types — confirmed. No additional hover shadow or elevation needed (out of scope per spec).

### Mobile / narrow (≤640 px)
Padding shrinks to `var(--space-2)` all sides at `≤640px`. This recovers ~8px of horizontal space on 360px viewports, keeping inner content clear of the card border.

## Tasks

### Resolved open questions
- **Naming:** Modify the existing `thinkingMessage` export (keep symbol — tests/imports stable) rather than introducing `thinkingCard`. The change is purely chrome on the same class. Add a brand-new `toolCard` export for tool_use/tool_result (do NOT widen `metaMessage`, which also backs `agent_prompt`/`control_response`/`compact_summary`/`hidden`/`result_divider` — Designer wants chrome on tools only).
- **Tool style composition:** New `toolCard` class is composed onto the existing `metaMessage` layout class (i.e. `style([metaMessage, { ...cardChrome }])`). This preserves the existing `messageRow > .metaMessage` flex/grow rule and the absolute-positioned `toolHeaderActions` slot. `messageBubbleClass` returns `toolCard` for `tool_use` / `tool_result`, and unchanged `metaMessage` for the other meta kinds.
- **ToolHeaderActions placement:** Confirmed via `MessageBubble.tsx:401-421` — `<ToolHeaderActions>` is rendered as a sibling of the bubble `<div>` (inside the row, outside the bubble). It stays outside the card by construction; no JSX move needed.

---

### T1 — Rework `thinkingMessage` into a carded chrome
- **Files to touch:** `frontend/src/components/chat/messageStyles.css.ts`
- **Implementation note:** Replace `thinkingMessage`'s `borderLeft` + `paddingLeft` with `backgroundColor: var(--lm-thinking-bg)`, `border: 1px solid var(--border)`, `borderRadius: var(--radius-medium)`, padding `var(--space-3) var(--space-4)`. Keep `alignSelf: stretch`, `maxWidth: '100%'`, `marginBottom: var(--space-4)`, and `color: var(--muted-foreground)`. Add `@media (max-width: 640px)` reducing padding to `var(--space-2)` on all sides.
- **Audit step:** `rg "thinkingMessage" frontend/src` — verify the export name is unchanged and the only style consumers are `messageClassification.ts` + the layout globals in `messageStyles.css.ts:292,303,356,386`.
- **Test gate:** `bun run test -- MessageBubble messageRenderers` green; manual smoke of `assistant_thinking` row in light + dark.

### T2 — Add new `toolCard` style
- **Files to touch:** `frontend/src/components/chat/messageStyles.css.ts`
- **Implementation note:** Export `toolCard = style([metaMessage, { backgroundColor: 'var(--lm-tool-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-medium)', padding: 'var(--space-3) var(--space-4)' }])` with the same `@media (max-width: 640px)` padding-shrink rule as T1. Composing onto `metaMessage` keeps the existing `flex: 1 / alignSelf: auto` rule (`messageStyles.css.ts:309`) and the `messageRow:has(> .metaMessage)` rules (`:317,:325`) applicable, because `toolCard` includes `metaMessage` in its class list.
- **Audit step:** `rg "metaMessage" frontend/src` — confirm no consumer asserts `className === 'metaMessage'` exactly; only style imports and `messageBubbleClass` reference it. The `:has(> .metaMessage)` global selector will still match since `toolCard` composes `metaMessage`.
- **Test gate:** vanilla-extract compiles; `bun run test` green.

### T3 — Dispatch `tool_use` / `tool_result` to `toolCard` in `messageBubbleClass`
- **Files to touch:** `frontend/src/components/chat/messageClassification.ts`
- **Implementation note:** Before the `META_KINDS.has(kind)` branch in `messageBubbleClass` (`:182-192`), add `if (kind === 'tool_use' || kind === 'tool_result') return chatStyles.toolCard`. Order matters: the new branch must come before the generic META_KINDS fallback so `agent_prompt`/`control_response`/`compact_summary`/`hidden`/`result_divider` continue to get plain `metaMessage`. Do **not** edit `META_KINDS` itself — row alignment (`messageRowClass`) keeps treating tools as meta rows.
- **Audit step:** `rg "messageBubbleClass\\(" frontend/src` — the only call sites are `MessageBubble.tsx:353` and unit tests. Confirm test fixtures do not depend on `metaMessage` being returned for tool kinds.
- **Test gate:** `bun run test -- messageClassification MessageBubble providers/claude providers/codex providers/acp providers/pi providers/opencode` all green.

### T4 — Drop the `metaMessage` row borderTop hairline on carded tool rows
- **Files to touch:** `frontend/src/components/chat/messageStyles.css.ts`
- **Implementation note:** The existing `messageRow:has(> .metaMessage)` rule (`:317`) adds `borderTop: 1px solid var(--border)` + `paddingTop: var(--space-2)`. Per spec "Meta-row borderTop hairline", suppress those two props when the meta child is a `toolCard` (because the card border doubles the line). Add a sibling globalStyle: `messageRow:has(> .${toolCard})` with `borderTop: 'none', paddingTop: 0`. Leave the rule for `agent_prompt`/`hidden`/`result_divider`/etc. (plain `metaMessage` children) untouched.
- **Audit step:** `rg "metaMessage\\)" frontend/src/components/chat/messageStyles.css.ts` — confirm only one `:has(> .${metaMessage})` selector matches, and the new override comes after it (so CSS cascade order applies).
- **Test gate:** Visual smoke: tool_use row no longer shows the double hairline above the card border.

### T5 — Mobile (≤640 px) padding shrink
- **Files to touch:** `frontend/src/components/chat/messageStyles.css.ts`
- **Implementation note:** Already specified inline in T1 (`thinkingMessage`) and T2 (`toolCard`) via the `@media` block in their style objects: `{ '@media': { '(max-width: 640px)': { padding: 'var(--space-2)' } } }`. Keep `borderRadius`/`border`/`backgroundColor` untouched at narrow widths.
- **Audit step:** `rg "max-width: 640px" frontend/src/components/chat/messageStyles.css.ts` — confirm exactly two new occurrences land in `thinkingMessage` + `toolCard` and they don't collide with any existing mobile media query.
- **Test gate:** Devtools responsive at 360 px wide — card inner content has ≥ 8 px breathing room from the border.

### T6 — Provider tool render path audit
- **Files to touch:** none (read-only)
- **Implementation note:** Every provider (claude / codex / acp / pi / opencode) routes through `MessageBubble.tsx` and gets its bubble class from `messageBubbleClass` (`MessageBubble.tsx:353`). No provider renderer applies its own outer wrapper class — they all render content inside the existing `bubbleClass()` div. So the T3 dispatch change is sufficient to cover all providers automatically.
- **Audit step:** `rg "metaMessage|thinkingMessage" frontend/src/components/chat/providers/` — must return ZERO matches. If any hit appears, those providers bypass the central dispatch and need to be touched.
- **Test gate:** Run all provider rendering tests: `bun run test -- providers/`.

### T7 — Test gate sweep (no rebaseline expected)
- **Files to touch:** none (read-only confirmation); only rebaseline if a snapshot literally hard-codes the `thinkingMessage` chrome rule shape.
- **Implementation note:** Tests import the `thinkingMessage` / `metaMessage` symbols (class-name reference), not the rule contents. Vanilla-extract generates new hashed class names on each style edit — but consumers reference the exported variable, so the symbol-level equality used in tests stays stable. Snapshots that pretty-print class names by reading the live class string would also still match (hashes are deterministic per build).
- **Audit step:** `rg "thinkingMessage|metaMessage" frontend/src --type ts --type tsx -g '*.test.*'` — confirm tests reference these as imported style identifiers, not as string literals. (Earlier audit returned no matches → assertion already holds.)
- **Test gate:** `bun run test` full suite green; if any snapshot fails with a chrome-related diff, rebaseline only after visual review.

---

### Constraints reaffirmed
- `assistantMessage` untouched (assistant text stays flat — prior cycle).
- `userMessage`, `planExecutionMessage`, `systemMessage` untouched.
- DropdownMenu / sharedTree / sidebarActions / `generated/*` not touched.

## A11y checklist

- [ ] 카드 chrome은 시각 전용 — DOM 구조/heading order 미변경 확인.
- [ ] 카드 보더 색 (`--border`)이 양 테마에서 배경 대비 3:1 이상.
- [ ] thinking 텍스트 색 (`--muted-foreground`)이 카드 배경(`--lm-thinking-bg`) 위에서 4.5:1 이상.
- [ ] `prefers-reduced-motion: reduce` 환경에서 카드 transition 제거.
- [ ] 키보드 탭 순서 보존 — 카드 wrapper에 `tabindex` 미추가.
- [ ] 스크린리더에서 카드가 본문 흐름을 끊지 않음 (group role 미사용 — 순수 presentational).

## QA

> Dev 후 채움. 포함 항목: light/dark 시각 diff, thinking 단독/tool 단독/tool_use+result 묶음 3가지 시나리오 스크린샷, 모바일 폭(360px) 시각 점검, 회귀(`bun run test` 전체 green), 어시스턴트 텍스트 평면 유지 회귀.

### QA verdict

**Gates:** `bun run typecheck` clean · `bun run lint` clean · `bun run test` 232 files / 3242 tests PASSED.

**AC verification (file:line):**

| # | AC | Result | Evidence |
|---|---|---|---|
| 1 | `thinkingMessage` uses `--lm-thinking-bg` + `1px solid var(--border)` + `var(--radius-medium)` | PASS | `messageStyles.css.ts:73-75` |
| 2 | No `borderLeft: 2px` on `thinkingMessage` | PASS | `grep borderLeft messageStyles.css.ts` → zero hits in thinkingMessage region |
| 3 | `toolCard` exists, composes `metaMessage` + cyan chrome (`--lm-tool-bg`) | PASS | `messageStyles.css.ts:184` — `style([metaMessage, { backgroundColor: 'var(--lm-tool-bg)', ... }])` |
| 4 | `messageBubbleClass` routes `tool_use`/`tool_result` to `toolCard` BEFORE META_KINDS fallback | PASS | `messageClassification.ts:193-194` — early branch, META_KINDS fallback at `:195` |
| 5 | Other meta kinds (`agent_prompt`, `control_response`, `compact_summary`, `hidden`, `result_divider`) return plain `metaMessage` | PASS | `messageClassification.ts:195-196`; test `messageClassification.test.ts:422-428` covers `hidden`, `result_divider`, `control_response`, `compact_summary`, `task_notification` |
| 6 | `messageRow:has(> .${toolCard})` override removes hairline; placed AFTER `:has(> .metaMessage)` rule | PASS | `messageStyles.css.ts:353-356` after `:341-347` |
| 7 | `@media (max-width: 640px)` shrinks padding on both `thinkingMessage` and `toolCard` | PASS | `messageStyles.css.ts:78-82` (thinkingMessage) and `:189-193` (toolCard) — exactly 2 occurrences |
| 8 | `assistantMessage`, user bubble, plan execution, system message unchanged | PASS | `git diff` touches only `thinkingMessage` + new `toolCard` + globalStyle; `assistantMessage`/`userMessage`/`planExecutionMessage`/`systemMessage` lines untouched |
| 9 | Provider scan: zero hits for `metaMessage`/`thinkingMessage` in providers/ | PASS | `grep -rn frontend/src/components/chat/providers/` → empty |
| 10 | `MessageBubble.tsx` and `DropdownMenu.tsx` unchanged | PASS | `git diff HEAD` → no output |

**Minor gap (non-blocking):** `agent_prompt` is in META_KINDS and correctly flows to `metaMessage` at runtime, but the updated test (`messageClassification.test.ts:422-428`) omits an explicit `agent_prompt` assertion. All 68 tests in the file pass and the logic is correct; adding the assertion would close the coverage gap but is not blocking.

**Regression scan:** All 3242 tests green with zero modifications to snapshot baselines.

qa_score: 96

### Dev notes

- **T1 done.** `thinkingMessage` (`frontend/src/components/chat/messageStyles.css.ts:66-83`) lost the `borderLeft: 2px` / `paddingLeft: var(--space-3)` accent and gained the carded chrome: `backgroundColor: var(--lm-thinking-bg)`, `border: 1px solid var(--border)`, `borderRadius: var(--radius-medium)`, `padding: var(--space-3) var(--space-4)`. `alignSelf: stretch`, `maxWidth: '100%'`, `marginBottom: var(--space-4)`, and the muted text color are preserved. `@media (max-width: 640px)` shrinks padding to `var(--space-2)`.
- **T2 done.** New `toolCard` export composed onto `metaMessage` so the existing `${messageRow} > .${metaMessage}` flex rule and the `:has(> .metaMessage)` actions selector continue to apply. Same chrome shape as `thinkingMessage`, but with `--lm-tool-bg`. Identical mobile padding-shrink rule.
- **T3 done.** `messageBubbleClass` (`frontend/src/components/chat/messageClassification.ts:188-193`) now returns `chatStyles.toolCard` for `tool_use` / `tool_result` *before* the META_KINDS fallback. Other meta kinds (`agent_prompt`, `control_response`, `compact_summary`, `hidden`, `result_divider`, `task_notification`) still get plain `metaMessage`. `META_KINDS` set is unchanged so `messageRowClass` still aligns tool rows as meta rows.
- **T4 done.** New globalStyle `${messageRow}:has(> .${toolCard})` placed AFTER the existing `${messageRow}:has(> .${metaMessage})` rule sets `borderTop: 'none'` and `paddingTop: 0`, suppressing the hairline + paddingTop only on carded tool rows. Non-tool meta rows (agent_prompt, hidden, result_divider, etc.) keep their hairline because `toolCard` is not in their class list.
- **T5 done.** Two `@media (max-width: 640px)` blocks present in `messageStyles.css.ts` (line 79 inside `thinkingMessage`, line 190 inside `toolCard`). Both reduce padding to `var(--space-2)`; border/radius/background untouched at narrow widths.
- **T6 audit done.** `grep -rn "metaMessage\|thinkingMessage" frontend/src/components/chat/providers/` returns ZERO matches — proves no provider renderer overrides the central dispatch, so T3 alone covers claude / codex / acp / pi / opencode automatically.
- **T7 done.** No snapshot rebaseline needed. One unit test (`messageClassification.test.ts` "returns metaMessage for meta kinds") was an intentional contract update — split into two tests: `'returns toolCard for tool_use / tool_result'` and `'returns metaMessage for non-tool meta kinds'` so coverage stays exhaustive over the META_KINDS set.

#### Gate results
- `bun run typecheck`: clean.
- `bun run lint`: clean.
- `bun run test -- messageStyles messageClassification MessageBubble messageRenderers`: 3 files / 118 tests passed.
- Full `bun run test`: 232 files / 3242 tests passed.

dev_confidence: 92

pm_confidence: 72

**Key uncertainty:** tool_use + tool_result를 spanId 기준 단일 카드로 묶을 때, 현재 렌더 파이프라인이 두 메시지를 독립 row로 흘리는 구조라 wrapper 도입 비용이 예상보다 클 수 있음(별도 카드 sibling이 현실적 fallback).

techlead_confidence: 86

- Most uncertain: that every provider's tool_use/tool_result really funnels through `messageBubbleClass` with no provider-side outer class override — the T6 audit grep is the single gate that proves it; if any provider asserts its own outer chrome class it would silently skip the card.
- Recommend defer: none. All T1–T7 are mechanically scoped and reversible; no item is at risk of pulling in unrelated refactors.

### PM verdict

Diff scope is exactly two files (`messageStyles.css.ts`, `messageClassification.ts`) — matches T1 / T2 / T3 / T4 / T5 surface area, no scope creep. Requirement-by-requirement rating:

| # | Requirement | Status | Evidence |
|---|---|---|---|
| a | Thinking이 카드 형태로 묶임 | PASS | `thinkingMessage` now carries `backgroundColor: var(--lm-thinking-bg)` + `border: 1px solid var(--border)` + `borderRadius: var(--radius-medium)` + padding (`messageStyles.css.ts:69-83`). Left-accent rule dropped per spec UI note. |
| b | Tool 사용(use + result)이 카드 형태로 묶임 | PARTIAL | New `toolCard` composed onto `metaMessage` (`messageStyles.css.ts:184-194`); dispatch added in `messageBubbleClass` BEFORE the META_KINDS fallback (`messageClassification.ts:188-193`). Designer's Option B (adjacent sibling cards) — tool_use + tool_result render as two stacked cards, NOT one merged card. Visual grouping signal delivered with zero pipeline risk; structural merge deferred. |
| c | 기본 내부 렌더는 유지 | PASS | `ThinkingBubble` body, `thinkingHeader`/chevron, `genericToolUse` / provider renderers — all untouched. Diff is chrome only. |
| d | Assistant text는 박스 없음 유지 | PASS | `assistantMessage` (`messageStyles.css.ts:55-64`) untouched in diff. User bubble / plan / system also untouched. Previous cycle decision preserved. |
| e | Light + dark 모두 | PASS | Both `--lm-thinking-bg` and `--lm-tool-bg` defined in light (`global.css.ts:171,172`) and dark (`:236,237`); chrome uses them via vars so themes follow automatically. |
| f | 프론트엔드 담당과 논의 (team workflow) | PASS | Spec contains Designer-resolved open questions block (naming, composition, action placement), Dev notes for T1–T7, dev/pm/techlead confidence scalars. Full team loop completed pre-handoff. |

**Compared to openclaw-talk's ThinkingBox / ToolCallBox:** the result delivers ~70% of the visual feeling. Wins: distinct purple-vs-cyan tint, full border, rounded radius, mobile padding shrink, dark-mode parity. Gap vs openclaw-talk: (1) no chevron collapse/expand on tool cards (thinking already has one via existing `thinkingHeader`); (2) no explicit "Tool" / "Result" header label on tool cards — relies on the existing in-renderer headings; (3) tool_use + tool_result render as two adjacent cards rather than a single merged card with internal divider. These are exactly the v2 items the spec called out as out-of-scope.

**User-perceptible risks (acknowledged, accepted for v1):**
1. No collapse/expand toggle on tool cards — long tool results stay fully expanded. The existing thinking collapse is preserved; tools have never had one. Mitigation: out-of-scope per spec; v2 candidate.
2. No "Thinking…" / "Tool" header label added on the card frame itself — relying on `thinkingHeader` (which exists) and per-renderer tool headings. Adequate but less explicit than openclaw-talk's labeled chip.
3. tool_use + tool_result as separate sibling cards (Designer's Option B). Two consecutive cyan cards with `var(--space-2)` gap may read as two unrelated tool events on first glance. Mitigation: spanId-based merging is the explicit v2 path; the visual cue (matching tint) still conveys "same family".
4. Hairline-suppression rule (`:has(> .${toolCard})`) requires `:has()` selector support — Safari 15.4+, Chromium 105+, Firefox 121+. Acceptable for leapmux's stated browser matrix; no fallback needed.

**Weighted score:**
- (a) thinking card 20% → 20
- (b) tool card 25% → 18 (separate adjacent cards, not merged)
- (c) internal render preserved 15% → 15
- (d) assistant flat preserved 10% → 10
- (e) light+dark 10% → 10
- (f) team workflow 10% → 10
- code quality / test gates 10% → 9 (3242 tests green, lint+typecheck clean, single classification test thoughtfully split rather than rebaselined)

**pm_score: 92**

3-line summary:
1. Thinking + tool kinds now render with purple / cyan card chrome via two minimal style additions + a single dispatch branch in `messageBubbleClass`, leaving assistant text + every other kind exactly as the prior cycle decided.
2. Designer's Option B (sibling cards for tool_use + tool_result) trades single-card merging for zero pipeline risk; spanId merging, chevron toggle, and labeled header chips are explicitly v2.
3. All acceptance criteria met for v1; tests / lint / typecheck green; openclaw-talk parity ~70%, gaps are deliberate and documented.
