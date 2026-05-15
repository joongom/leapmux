# UI Refresh: openclaw-talk Look & Feel

- id: ui-openclaw-talk-refresh
- status: draft v1
- owner: PM (leapmux)
- date: 2026-05-13

## Problem

leapmux's chat UI wraps every agent message in a card-style bubble and docks tool actions in the right gutter, competing with content and eating horizontal space. We want to adopt `openclaw-talk`'s white-based palette, condensed typography, and document-style assistant messages while preserving leapmux's SolidJS + Vanilla Extract (Oat) architecture.

## User stories

- As a reader, I want the assistant body to read like flat markdown (no card frame) so prose and code feel like a document.
- As a reader, I want assistant text to flow nearly to the right edge so wide tables / diffs / code stay readable.
- As a user, I want my own messages to stay as distinct bubbles so the thread stays scannable.
- As a user, I want copy / reply / diff-toggle / timestamp on a row beneath the message (hover-revealed), not in the right gutter.
- As a dark-theme user, I want the new palette and no-box layout to feel equally polished.

## Acceptance criteria

- Light + dark token sets in `frontend/src/styles/global.css.ts` adopt an openclaw-talk-aligned palette: white-based light bg (`#ffffff`-derived), accent `#2563eb`, thinking `#7c3aed`, tool `#0891b2`. Existing leapmux var names (`--background`, `--primary`, `--accent`, `--card`, `--border`, `--muted-foreground`, etc.) stay as the public API — values change. Dark theme gets a parallel mapping.
- White text on the new `#2563eb` accent passes WCAG AA in both themes; user bubble remains legible.
- `assistantMessage` and `thinkingMessage` in `frontend/src/components/chat/messageStyles.css.ts` render with no background, no border, no bubble padding — flat markdown blocks. `userMessage` keeps its current bubble shape and accent fill.
- `messageBubble`'s `maxWidth: '85%'` no longer constrains assistant/thinking rows — agent content uses the full chat-column width. The 85% cap (or near-equivalent) is retained for user bubbles only.
- `ToolHeaderActions` (copy / reply / diff toggle / timestamp / raw JSON) for assistant + thinking rows renders as a horizontal row directly below the message body, not in the right gutter. Hover-to-reveal (`opacity: 0 → 1` on row hover/focus) is preserved.
- Body font stack: `'Roboto Condensed', 'Batang', system-ui, -apple-system, sans-serif`; title stack: `'Gyeonggi', 'Roboto Condensed', system-ui, sans-serif`; mono unchanged. No WOFF files added — OS fallbacks must look acceptable.
- All existing chat unit/visual tests keep passing; any Playwright snapshot rebaseline gets a visual review.
- Spec affects only chat message presentation — sidebar, composer, settings panels stay untouched in v1.

## Out of scope

- Downloading / self-hosting Roboto Condensed, Gyeonggi, or Batang WOFF2 — fallback stacks only.
- Mobile-specific layout tweaks below 640px (must not regress, but no new behavior).
- User-bubble shape, padding, or color change.
- Tool-use / tool-result internal layout (`ToolUseLayout`, span lines, diff renderer internals).
- Composer, sidebar, header, settings UI.
- Highlight.js / Shiki theme swap.

## UI notes

### Color token mapping

| leapmux var | light value | dark value |
|---|---|---|
| `--background` | `#ffffff` | `rgb(18 18 20)` |
| `--foreground` | `#111827` | `rgb(225 223 219)` |
| `--card` | `#fafbfc` | `rgb(28 27 30)` |
| `--card-foreground` | `#111827` | `rgb(225 223 219)` |
| `--primary` | `#2563eb` | `#3b82f6` |
| `--primary-foreground` | `#ffffff` | `#ffffff` |
| `--secondary` | `#f3f4f6` | `rgb(38 37 42)` |
| `--muted` | `#f3f4f6` | `rgb(38 37 42)` |
| `--muted-foreground` | `#6b7280` | `rgb(120 116 112)` |
| `--accent` | `rgba(37,99,235,0.12)` | `rgba(59,130,246,0.15)` |
| `--accent-foreground` | `#111827` | `rgb(225 223 219)` |
| `--border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` |
| `--input` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.06)` |
| `--ring` | `#2563eb` | `#3b82f6` |
| `--lm-thinking` | `#7c3aed` | `#a78bfa` |
| `--lm-tool` | `#0891b2` | `#22d3ee` |
| `--lm-thinking-bg` | `rgba(124,58,237,0.03)` | `rgba(124,58,237,0.08)` |
| `--lm-tool-bg` | `rgba(8,145,178,0.03)` | `rgba(8,145,178,0.08)` |

### User bubble decision

Keep `#2563eb` (bright blue). White text on it achieves 4.7:1 contrast (AA pass), and the saturated fill is the primary visual anchor that keeps user turns scannable in a thread full of flat assistant rows — softening it would blur that distinction. Bubble: `background #2563eb`, `color #ffffff`.

### Vertical rhythm between assistant and tool rows

Without a card frame, consecutive flat rows risk fusing. Solution: assistant/thinking rows get `margin-bottom: var(--space-4)` (1rem); tool_use/tool_result rows get `margin-bottom: var(--space-2)` (0.5rem) plus a `1px solid var(--border)` top hairline on each tool row. This gives 16px breathing room after prose blocks and a visible micro-divider between document and tool sections without a full card border.

### Font stacks

- Body: `'Roboto Condensed', 'Batang', system-ui, -apple-system, sans-serif`
- Title (h1–h6, avatar name): `'Gyeonggi', 'Roboto Condensed', system-ui, sans-serif`
- Mono: `"Hack NF", Hack, "SF Mono", Consolas, monospace` (unchanged)

### Action row design

Left-aligned flush under message body; no centering. Icons 14px (`var(--text-7)`), gap `var(--space-2)` (0.5rem) between items. Opacity transition: `opacity 0 → 1` over `150ms ease` on `messageRow:hover` and `messageRow:focus-within` (keyboard-accessible). Trigger is hover + focus-within on the row wrapper; pointer-only is not acceptable per A11y checklist.

### Avatar + name header for assistant

Introduce the header (matches openclaw-talk `Message.tsx` lines 129–143). Avatar: 20×20px circle, positioned to the left of the name. Name: title font stack, `var(--text-7)` (13px), `--font-bold`, color `var(--foreground)`. Timestamp: `var(--text-8)` (11px), `color var(--muted-foreground)`, same row. Row gap `var(--space-2)`, `margin-bottom var(--space-2)` before body. This makes flat rows feel attributed, not anonymous.

designer_confidence: 82

## Tasks

**Scope decision for tool-row actions:** tool_use / tool_result rows keep their current right-edge absolute position (the `metaMessage` + absolute `toolHeaderActions` path in `messageStyles.css.ts` and the `toolUseHeader`'s `marginLeft: auto` slot in `toolStyles.css.ts`). Designer's "actions below body" move applies only to `assistant_text` and `assistant_thinking` rows — i.e. rows whose bubble class is `assistantMessage` or `thinkingMessage`. Rationale: tool rows are already document-style (no card), their actions are tied to the header line via `toolUseHeader`, and pushing them below would (a) require a structural rewrite of `ToolUseLayout` and (b) double the vertical noise on dense tool sequences. Out of scope for v1; revisit if QA flags it.

### T1. Swap light + dark token values in `global.css.ts`

- **Files:** `frontend/src/styles/global.css.ts`
- **What:** Replace the warm-sand light palette and warm-charcoal dark palette with the openclaw-talk-aligned values from the spec table. Keep all existing var names (`--background`, `--foreground`, `--card`, `--primary`, `--primary-foreground`, `--secondary`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--border`, `--input`, `--ring`, `--danger*`, `--success*`, `--warning*`, `--faint*`, scrollbar tokens, `--lm-*`). Add new tokens `--lm-thinking`, `--lm-tool`, `--lm-thinking-bg`, `--lm-tool-bg`. Do not rename, do not touch font/scrollbar/focus-ring blocks below the `:root` and `[data-theme="dark"]` declarations.
- **Audit:** `grep -rn "rgb(253 252 250)\|rgb(13 148 136)\|rgb(20 184 166)\|rgb(26 25 23)" frontend/src` — any hit outside `global.css.ts` is a hardcoded leak that needs to move to a var.
- **Test gate:** `cd frontend && bun run typecheck && bun run lint`.

### T2. Wire title + body font stacks

- **Files:** `frontend/src/styles/global.css.ts`
- **What:** Set `--font-sans` to `'Roboto Condensed', 'Batang', system-ui, -apple-system, sans-serif` (replacing the current `--ui-font-family` indirection's default) and introduce `--font-title: 'Gyeonggi', 'Roboto Condensed', system-ui, sans-serif`. Add a `globalStyle('h1, h2, h3, h4, h5, h6', { fontFamily: 'var(--font-title)' })` block. Mono stack stays untouched.
- **Audit:** `grep -rn "font-family\|fontFamily" frontend/src/components/chat | grep -v "font-mono\|font-sans\|font-title"` — anything that hardcodes a family string is a leak.
- **Test gate:** `cd frontend && bun run typecheck`.

### T3. Split `messageBubble` into a shared base and a bubble-shape mixin

- **Files:** `frontend/src/components/chat/messageStyles.css.ts`
- **What:** `messageBubble` currently encodes both shared content rules (line-height, word-break, position) and bubble chrome (padding, border-radius, maxWidth). Split into (a) `messageBase` (position/line-height/word-break only) and (b) `bubbleChrome` (padding, border-radius, `maxWidth: 85%`). Keep `messageBubble` as a back-compat alias that composes both, so existing `globalStyle(\`${messageBubble} code\`, ...)` selectors keep targeting both flat and bubble messages. Update `userMessage` / `userMessagePending` / `planExecutionMessage` / `systemMessage` to compose `[messageBase, bubbleChrome, …]`. Leave `assistantMessage` and `thinkingMessage` for T4.
- **Audit:** `grep -rn "messageBubble" frontend/src` — every consumer must still resolve. Verify `code` / `pre` global selectors at the bottom of the file still apply to both user and assistant content.
- **Test gate:** `cd frontend && bun run typecheck && bun run test -- messageStyles messageClassification`.

### T4. Flatten `assistantMessage` and `thinkingMessage`

- **Files:** `frontend/src/components/chat/messageStyles.css.ts`
- **What:** Recompose `assistantMessage` to `[messageBase, { color: 'var(--foreground)', alignSelf: 'stretch', maxWidth: '100%' }]` — no `backgroundColor`, no `border`, no `padding`, no `borderRadius`. Same for `thinkingMessage`, plus a left-edge accent (`borderLeft: '2px solid var(--lm-thinking)'`, `paddingLeft: var(--space-3)`, muted `color` set to `--lm-thinking`) so thinking blocks still read as distinct without a card. Add `marginBottom: var(--space-4)` to both. Keep `planExecutionMessage` as a bubble (user-aligned plan card).
- **Audit:** Run the rendered chat with a long assistant message and confirm prose flows full-width; `grep -rn "assistantMessage\|thinkingMessage" frontend/src` for any consumer that depended on bubble chrome (e.g. measuring `padding`).
- **Test gate:** `cd frontend && bun run typecheck && bun run test -- MessageBubble messageRenderers`.

### T5. Add assistant avatar + name header

- **Files:** `frontend/src/components/chat/MessageBubble.tsx`, `frontend/src/components/chat/messageStyles.css.ts`
- **What:** In `messageStyles.css.ts`, add `assistantHeader` (flex row, gap `var(--space-2)`, marginBottom `var(--space-2)`), `assistantAvatar` (20×20 circle, `background var(--accent)`, initial letter centered), `assistantName` (font-family `var(--font-title)`, `var(--text-7)`, `var(--font-bold)`, `color var(--foreground)`), `assistantTimestamp` (`var(--text-8)`, `var(--muted-foreground)`). In `MessageBubble.tsx`, when `category().kind === 'assistant_text' || 'assistant_thinking'`, render the header above the content `<div ref={contentRef}>`. Name comes from a new `props.agentName` (fed by ChatView) with a fallback to `sourceLabel(props.message.source)`; timestamp uses `RelativeTime` on `props.message.createdAt`.
- **Audit:** `grep -rn "RelativeTime\|sourceLabel" frontend/src/components/chat` to confirm there isn't an existing avatar/name component being duplicated. Check `ChatView.tsx` to plumb `agentName` through if a name is already known there.
- **Test gate:** `cd frontend && bun run typecheck && bun run test -- MessageBubble`.

### T6. Move assistant/thinking `ToolHeaderActions` below body

- **Files:** `frontend/src/components/chat/messageStyles.css.ts`, `frontend/src/components/chat/MessageBubble.tsx` (only if a wrapper is needed)
- **What:** Replace the existing `messageRow:has(> .${assistantMessage}) > .${toolHeaderActions}` grid rule (lines ~265–275) with rules that make the row a flex column: `${messageRow}:has(> .${assistantMessage}), ${messageRow}:has(> .${thinkingMessage}) { flexDirection: 'column'; alignItems: 'stretch' }`. Style `${messageRow}:has(> .${assistantMessage}) > .${toolHeaderActions}, ${messageRow}:has(> .${thinkingMessage}) > .${toolHeaderActions}` with `marginTop: var(--space-1)`, `marginLeft: 0`, `paddingLeft: 0`, single-row flex (drop the 2-col grid), opacity already inherits from `toolHeaderActions` base. Preserve the existing hover/focus reveal rule and extend it with `:focus-within` (currently only `:hover`). Confirm `messageRowEnd` (user) and `messageRow:has(> .${metaMessage})` (tool) branches are untouched.
- **Audit:** `grep -rn "toolHeaderActions\|metaMessage" frontend/src/components/chat` — verify user/tool branches still resolve to the old layout; visual-check that the timestamp-alignment padding rules for `toolHeaderTimestamp` (lines ~273–280) still make sense (probably drop the assistant-grid padding rule).
- **Test gate:** `cd frontend && bun run typecheck && bun run test -- MessageBubble messageRenderers`.

### T7. Vertical rhythm + tool row hairline

- **Files:** `frontend/src/components/chat/messageStyles.css.ts`, `frontend/src/components/chat/toolStyles.css.ts`
- **What:** Replace the catch-all `marginTop/marginBottom: var(--space-1)` on `${messageRow}:has(...)` with the spec's targeted spacing: assistant/thinking rows get `marginBottom: var(--space-4)`; `messageRow:has(> .${metaMessage})` (tool rows) get `marginBottom: var(--space-2)` and a `borderTop: 1px solid var(--border)` + `paddingTop: var(--space-2)`. `messageRowEnd` (user) keeps `var(--space-1)` to preserve current density. Add `@media (prefers-reduced-motion: reduce)` guard on the `toolHeaderActions` `transition: opacity` (in `toolStyles.css.ts`).
- **Audit:** `grep -rn "marginTop\|marginBottom\|--space-" frontend/src/components/chat/messageStyles.css.ts frontend/src/components/chat/toolStyles.css.ts` — confirm no stale `var(--space-1)` block contradicts the new rhythm.
- **Test gate:** `cd frontend && bun run typecheck && bun run test -- messageStyles`.

### T8. Verify dark theme contrast + WCAG AA

- **Files:** (no code change unless contrast fails) — `frontend/src/styles/global.css.ts`
- **What:** Manually compute (or use an accessibility extension) contrast for: (1) `#ffffff` on `#2563eb` (user bubble light), (2) `#ffffff` on `#3b82f6` (user bubble dark), (3) `--foreground` on `--background` both themes, (4) `--muted-foreground` on `--background` both themes, (5) thinking accent `--lm-thinking` on `--background`. All must hit AA (4.5:1 for body, 3:1 for large/non-text). If any fails, nudge the value within the spec's hue and re-document in the spec table.
- **Audit:** Open the running dev server with `data-theme="dark"` set on `<html>`, page through a chat with assistant + thinking + tool + user messages.
- **Test gate:** `cd frontend && bun run typecheck && bun run lint`.

### T9. Audit pass — hardcoded bubble-style assumptions

- **Files:** `frontend/src/components/chat/**/*` (especially `providers/claude`, `providers/codex`, `providers/acp`, `providers/opencode`, `providers/pi`, `widgets/*`, `results/*`, `controls/*`)
- **What:** Exhaustive grep for bubble assumptions and hardcoded colors that bypass tokens. Fix any hit by routing through a token or composing the new `bubbleChrome` mixin from T3.
  - `grep -rn "padding.*var(--space-3) var(--space-4)\|borderRadius.*radius-medium\|maxWidth.*'85%'\|maxWidth: '85" frontend/src/components/chat`
  - `grep -rEn "#[0-9a-fA-F]{3,8}\b" frontend/src/components/chat | grep -vE "shiki|tests?/|\.test\."` — flag any hex colors not in test fixtures.
  - `grep -rEn "rgb\(|rgba\(" frontend/src/components/chat | grep -v "var(--" | grep -vE "tests?/|\.test\."` — flag any rgb literals.
  - `grep -rn "backgroundColor.*var(--card)\|border:.*var(--border)" frontend/src/components/chat` — review each: still valid for tool body / hidden JSON / system message; should NOT appear on assistant body wrappers anymore.
  - `grep -rn "PiAssistantMessage\|PiAssistantThinking" frontend/src/components/chat/providers/pi` — pi has its own assistant renderer; verify it isn't re-introducing card chrome and apply the same flat treatment if needed.
- **Audit:** Re-run all four greps after fixes; expected hits are limited to (a) `userMessage`/`planExecutionMessage` (intentional bubbles), (b) tool body indent borders, (c) `hiddenMessageJson`, (d) `systemMessage`.
- **Test gate:** `cd frontend && bun run typecheck && bun run lint && bun run test`.

### T10. Visual + snapshot sweep

- **Files:** test snapshots if any need rebaseline
- **What:** Run the full vitest suite. For any failed snapshot, diff manually and rebaseline only if the change is the intended visual refresh (flat assistant, action row below, new colors). Document the rebaselined files in the QA section.
- **Audit:** `grep -rn "__snapshots__\|toMatchSnapshot" frontend/src/components/chat` to find affected suites up front.
- **Test gate:** `cd frontend && bun run test` must be green; `cd frontend && bun run typecheck && bun run lint` must be green.

techlead_confidence: 76

## A11y checklist

- [ ] Color contrast (body text + accent-on-accent) meets WCAG AA in both themes.
- [ ] Keyboard navigation: copy / reply / diff-toggle reachable via Tab in their new below-body position.
- [ ] Focus rings stay visible on the new lighter background; verify `:focus-visible` outlines.
- [ ] Hover-revealed actions remain operable via keyboard (focus reveals, not pointer-only).
- [ ] Screen-reader order: avatar+name → body → action row reads logically.
- [ ] `prefers-reduced-motion` honored for any new action-row transitions.

## QA

> Filled after Dev. Will include: light/dark visual diff, contrast check, hover + focus reveal of action row, long-message right-edge flow, tool message regression, mobile sanity pass.

### Dev notes

- **Contrast nudges (T8).** Two spec-table values failed WCAG AA against the new
  dark background and were nudged:
  - Dark `--primary` was set to `#3b82f6` in the spec table; `#ffffff` on
    `#3b82f6` scores 3.68:1, below AA body's 4.5:1. Nudged to `#2563eb` (same
    as light theme) → 5.17:1 (per QA's independent recomputation). Dark
    `--ring` followed suit so focus rings stay consistent with the user
    bubble fill.
  - Dark `--muted-foreground` was `rgb(120 116 112)`; on `rgb(18 18 20)` that
    scored ~4.04:1. Nudged to `rgb(150 146 142)` → 6.06:1.
  - Verified passes (QA-independent values): `#ffffff` on `#2563eb` 5.17:1
    (light + dark user bubble); `--foreground` on `--background` both themes
    >14:1; light `--muted-foreground` `#6b7280` on `#ffffff` 4.83:1; `#7c3aed`
    on `#ffffff` 5.70:1 (light thinking); `#a78bfa` on `rgb(18 18 20)` 6.88:1
    (dark thinking).
- **Avatar / name plumbing (T5).** No per-agent `agentName` is available at
  ChatView yet, so `MessageBubble` falls back to a capitalised
  `sourceLabel(message.source)` ("Agent" / "Leapmux"). Avatar renders a colored
  `var(--accent)` circle with the first letter of that name. TODO for a
  follow-up: plumb a real display name through `ChatView` → `MessageBubble`
  props.
- **Snapshot rebaselines (T10).** None. There are no `__snapshots__`/
  `toMatchSnapshot` calls under `frontend/src/components/chat`. Full vitest
  suite (228 files / 3226 tests) is green.

pm_confidence: 78

### QA verdict

**Date:** 2026-05-13  
**Branch:** `feat/ui-openclaw-talk-refresh`  
**Files audited:** `frontend/src/styles/global.css.ts`, `frontend/src/components/chat/messageStyles.css.ts`, `frontend/src/components/chat/toolStyles.css.ts`, `frontend/src/components/chat/MessageBubble.tsx`

---

#### Gate results

| Gate | Command | Result |
|---|---|---|
| TypeScript | `cd frontend && bun run typecheck` | PASS — no errors |
| Lint | `cd frontend && bun run lint` | PASS — no errors |
| Tests | `cd frontend && bun run test` | PASS — 228 files, 3226 tests, all green |

---

#### Acceptance criteria

| # | Criterion (abbreviated) | Result | Notes |
|---|---|---|---|
| AC1 | Light + dark token sets adopt openclaw-talk palette; existing var names unchanged | PASS | All 18 vars in spec table present in both `:root` and `[data-theme="dark"]`. New `--lm-thinking`, `--lm-tool`, `--lm-thinking-bg`, `--lm-tool-bg` added. No vars renamed. |
| AC2 | White text on `#2563eb` passes WCAG AA in both themes | PASS | Independent calc: 5.17:1 ≥ 4.5:1. Dev notes claim 5.22:1; minor rounding diff — both comfortably above AA. |
| AC3 | `assistantMessage` / `thinkingMessage` flat (no bg, no border, no bubble padding) | PASS | `assistantMessage`: no `backgroundColor`, no `border`, no padding from bubble chrome. `thinkingMessage`: same, plus intentional left-border accent. Both compose `messageBase` not `bubbleChrome`. |
| AC4 | `messageBubble` 85% cap removed from assistant/thinking; full width used | PASS | `assistantMessage` and `thinkingMessage` both set `maxWidth: '100%'`, `alignSelf: 'stretch'`. `bubbleChrome` with 85% retained only for user/plan/system variants. |
| AC5 | `ToolHeaderActions` for assistant/thinking renders below message body, hover-revealed | PASS | `messageRow` becomes `flexDirection: column` for assistant/thinking rows; action row override sets `display: flex`, `alignSelf: flex-start`. `:focus-within` added alongside `:hover` for keyboard reveal. |
| AC6 | Body font stack set; title stack added; mono unchanged | PASS | `--font-sans` set to `'Roboto Condensed', 'Batang', system-ui, -apple-system, sans-serif`; `--font-title` added; `globalStyle('h1–h6')` block added; `--font-mono` unchanged. |
| AC7 | Existing chat unit tests keep passing; no snapshot rebaselines needed | PASS | All 3226 tests green; no `__snapshots__` or `toMatchSnapshot` calls found in chat. |
| AC8 | Only chat message presentation affected; sidebar/composer/settings untouched | PASS | No changes to `ChatView.css.ts`, sidebar, composer, or settings files. Only 4 chat-presentation files modified. |

---

#### Independent contrast check

Computed via WCAG 2.1 relative luminance formula (verified with `node`).

| Pair | Light / Dark | Ratio | AA (4.5:1 body / 3:1 non-text) | Note |
|---|---|---|---|---|
| `#ffffff` on `#2563eb` (user bubble) | Light | 5.17:1 | PASS body | Dev notes said 5.22:1; rounding difference, both clear AA |
| `#ffffff` on `#2563eb` (user bubble, dark nudged) | Dark | 5.17:1 | PASS body | Same hue used in both themes |
| `#ffffff` on `#3b82f6` (spec-table original, rejected) | — | 3.68:1 | FAIL body | Correctly rejected by Dev; dark `--primary` was nudged |
| `--foreground` (`#111827`) on `--background` (`#ffffff`) | Light | 17.74:1 | PASS | |
| `--foreground` (`rgb(225,223,219)`) on `--background` (`rgb(18,18,20)`) | Dark | 14.06:1 | PASS | |
| `--muted-foreground` (`#6b7280`) on `--background` (`#ffffff`) | Light | 4.83:1 | PASS body | |
| `--muted-foreground` (`rgb(150,146,142)`, nudged) on `--background` (`rgb(18,18,20)`) | Dark | 6.06:1 | PASS body | Dev notes said ~6.2:1; rounding difference |
| `--muted-foreground` (`rgb(120,116,112)`, spec-table original) on `--background` | Dark | 4.04:1 | FAIL body | Correctly rejected; dark muted-fg was nudged |
| `--lm-thinking` (`#7c3aed`) on `--background` (`#ffffff`) | Light | 5.70:1 | PASS both | Left border + muted text — exceeds 3:1 non-text |
| `--lm-thinking` (`#a78bfa`) on `--background` (`rgb(18,18,20)`) | Dark | 6.88:1 | PASS both | |

**Discrepancy note:** Dev notes quote 5.22:1 for white-on-`#2563eb`; QA independently calculated 5.17:1. Both exceed WCAG AA. Dev notes quote `#6b7280` on `#ffffff` as 4.75:1; QA calculated 4.83:1. Dev notes quote dark muted-fg as ~6.2:1; QA calculated 6.06:1. These are all sub-0.2 rounding differences with no material impact — all comfortably pass.

---

#### Regression scan

**1. `assistantMessage` / `thinkingMessage` consumers outside modified files:**

- `frontend/src/components/chat/ChatView.tsx:371` — uses `assistantMessage` directly on a raw `<div>` for the streaming-text intermediate state (while a message is still streaming, before it becomes a full `MessageBubble`). This div has no `messageRow` wrapper and no `ToolHeaderActions`, so it is unaffected by the T6 flex-column layout rule. There is also no assistant avatar/name header on this streaming path. This is **pre-existing architecture** (ChatView.tsx has no diff). However, this means the avatar header and below-body action row do not appear during streaming — only after the message is committed and wrapped in `MessageBubble`. This creates a momentary visual discontinuity (raw flat div → attributed message with header after commit). Flagged as a low-severity UX gap, not a regression.
- `frontend/src/components/chat/messageClassification.ts:118,186` — routes to `assistantMessage` / `thinkingMessage` for `MessageSource.AGENT` and `assistant_thinking`. No padding/border assumptions. PASS.
- `frontend/src/components/chat/providers/pi/renderers/index.ts:1` — exports `PiAssistantMessage`, `PiAssistantThinking`. These components use `MarkdownText` and `ThinkingMessage` (shared renderers) without any card chrome. No regression.

**2. `messageBubble` consumers:**

- Only `messageStyles.css.ts:23` (the export itself) and `messageClassification.ts` (via `messageBubbleClass`). `messageBubble` is now a composed `[messageBase, bubbleChrome]` alias — the back-compat alias is valid. No consumers break.
- `MessageBubble.tsx:335` uses `messageBubbleClass()` which now correctly routes assistant/thinking to their flat styles, and user/plan/system to their bubble styles. PASS.

**3. Provider plugin layout assumptions:**

- `providers/claude` — no padding/background/card chrome in plugin files; `genericToolUse.tsx` has a comment about a bordered area but uses `ToolUseLayout` (out of scope per Tasks). PASS.
- `providers/codex`, `providers/acp`, `providers/opencode` — no assistant-specific layout CSS found. PASS.
- `providers/pi/renderers/assistantMessage.tsx` — `PiAssistantMessage` uses `MarkdownText`, no card chrome. `PiAssistantThinking` uses shared `ThinkingMessage`. PASS. T9 spec concern ("verify it isn't re-introducing card chrome") is confirmed PASS.

**4. `ChatView.css.ts` max-width / padding conflicts:**

- `ChatView.css.ts:messageRow` (line 405) is a separate `style()` export used only in `ChatView.tsx` for the SpanLines wrapper. `messageStyles.css.ts:messageRow` is the component-level row used by `MessageBubble`. They are distinct classes applied to different DOM elements. No conflict. PASS.
- No `maxWidth` constraints found in `ChatView.css.ts` that would clip assistant content. The `'(max-width: 639px)'` media queries at lines 160/171 are responsive breakpoints for the layout container, not message-width caps. PASS.

**5. User bubble chrome preserved:**

- `userMessage` (line 25): `[messageBase, bubbleChrome, { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', alignSelf: 'flex-end' }]` — bubble chrome intact, now fills with `--primary` blue (`#2563eb`) instead of old `--accent` sage green. White-on-primary is 5.17:1 (AA pass). Note: the old `border: '1px solid var(--border)'` was removed — the solid fill provides sufficient visual distinction and the spec explicitly chose this appearance. PASS.
- `userMessagePending`: same composition, adds pulse animation. PASS.
- `planExecutionMessage`: `[messageBase, bubbleChrome, {...}]` — bubble chrome intact. PASS.

**6. `systemMessage` and `hiddenMessageJson`:**

- `systemMessage` (line 146): `[messageBase, bubbleChrome, { backgroundColor: 'transparent', border: '1px dashed var(--border)', ... }]` — chrome retained. PASS.
- `hiddenMessageJson` (line 199): has its own `backgroundColor: 'var(--card)'` and `border: '1px dashed var(--border)'` — these are on the JSON pre block, not an assistant body wrapper. PASS.

**7. Vertical rhythm / T7 spacing:**

- `messageRow:has(> .assistantMessage)` row gets `marginBottom: var(--space-4)`. The `assistantMessage` child style ALSO has `marginBottom: var(--space-4)`. In flex column layout, the child's `marginBottom` creates space between the message body div and the action row (within the row), while the row's `marginBottom` creates inter-row spacing. This is intentional: 16px between body and action row, 16px after the row. However, if `assistantMessage` has no `ToolHeaderActions` sibling (e.g., the streaming path), the bottom margin of `assistantMessage` is still 16px but is contained within whatever wrapper the caller uses. **Not a bug, but a potential over-spacing concern** in the streaming path where both the child and the parent would contribute to the same visual gap. Low severity.
- Tool rows (`metaMessage`): `marginBottom: var(--space-2)`, `borderTop: 1px solid var(--border)`, `paddingTop: var(--space-2)`. Matches spec. PASS.
- User/notification rows (`messageRowEnd`, `messageRowCenter`): `marginBottom: var(--space-1)`. Matches spec. PASS.

**8. `prefers-reduced-motion` guard:**

- Added in `toolStyles.css.ts` on `toolHeaderActions.transition`. Matches A11y checklist requirement. PASS.

**9. Hardcoded color audit (T9 greps):**

- No hex color literals found in `frontend/src/components/chat` (outside test files). PASS.
- No raw `rgb()`/`rgba()` literals found without `var(--` in chat components. PASS.
- `backgroundColor: 'var(--card)'` and `border: 'var(--border)'` hits verified: all are in `hiddenMessageJson`, `AttachmentStrip`, `ChatView.css.ts` (non-message elements), `MarkdownEditor`, `diffStyles`. None are on assistant body wrappers. PASS.
- Old warm-sand hardcoded values (`rgb(253 252 250)`, `rgb(13 148 136)`, `rgb(20 184 166)`, `rgb(26 25 23)`) — no hits anywhere in `frontend/src`. PASS.

**10. Font-family audit (T2):**

- No hardcoded font-family strings (not using `var(--font-*)`) found in `frontend/src/components/chat`. All non-mono, non-inherit font references use tokens. PASS.

---

#### Items needing rework

The following are flagged for Dev to review/patch in a follow-up — none are hard blockers against merging, but items 1 and 3 affect spec fidelity:

1. **[LOW] Streaming-text path lacks assistant avatar header (ChatView.tsx:371).** The raw `<div class={assistantMessage}>` used during streaming does not wrap in `MessageBubble`, so the avatar/name header (T5) does not appear while a message is being streamed. After streaming completes and the message is committed into the list as a real `MessageBubble`, the header appears. This momentary visual flash (headerless → headered) may confuse users. Spec says "when `category().kind === 'assistant_text'`" — the streaming div is logically assistant text. Recommend Dev either add a static header above the streaming div in `ChatView.tsx`, or accept as a known limitation and document in spec.

2. **[LOW] Potential double-`marginBottom` on assistant rows in edge cases.** `assistantMessage` style (line 55) has `marginBottom: var(--space-4)`, and `messageRow:has(> .${assistantMessage})` (line 286) also has `marginBottom: var(--space-4)`. In the normal case (flex column with action row inside), the child marginBottom separates body from action row and the row marginBottom separates rows — both are semantically correct. In edge cases where `ToolHeaderActions` is absent (e.g. stripped layouts or tests), the child marginBottom would add visual whitespace inside the row boundary. Not a regression in practice; confirm intent is correct.

3. **[INFO] Action-row item gap remains 2px, not `var(--space-2)`.** Spec's "Action row design" section specifies `gap var(--space-2) (0.5rem) between items`. The `toolHeaderActions` base style in `toolStyles.css.ts` retains `gap: '2px'` (hardcoded). The `messageRow:has(> .assistantMessage) > .toolHeaderActions` override in `messageStyles.css.ts` does not override this gap. This predates this PR and appears intentional for the icon-button density, but it does not match the spec's literal value. If the spec was aspirational here, update the spec; if actionable, override `gap` in the assistant-specific rule.

4. **[INFO] Dev notes' contrast figure for white-on-`#2563eb` (5.22:1) differs from QA calculation (5.17:1).** Both are above AA. The spec QA notes table should use the independently verified 5.17:1 value. No code change needed.

---

**qa_score: 87**

**Justification:** All three test gates are green (typecheck, lint, 3226 tests). All 8 acceptance criteria pass. All WCAG contrast checks pass in both themes. The regression scan finds no broken consumers of `assistantMessage`, `thinkingMessage`, or `messageBubble`. The implementation correctly flattens assistant rows, preserves user/system bubble chrome, adds the avatar header, moves actions below body with focus-within reveal, adds the reduced-motion guard, and updates font tokens. Score is not 100 due to: the streaming-path avatar gap (spec-observable behavioral gap, low severity), the minor gap-value discrepancy vs the action-row design spec, and one minor double-margin pattern that warrants explicit confirmation.

---

#### Patch round 1 — Dev follow-up (2026-05-13)

Addresses the four QA items above. Files touched: `frontend/src/components/chat/MessageBubble.tsx`, `frontend/src/components/chat/ChatView.tsx`, `frontend/src/components/chat/messageStyles.css.ts`, `docs/specs/ui-openclaw-talk-refresh.md`.

1. **Streaming-text path now renders the avatar header (Item 1, LOW).** Extracted a small `AssistantHeader` component in `MessageBubble.tsx` (also exported `sourceLabel`) and reused it both inside `MessageBubble` and inside the `ChatView` streaming-text branch (around line 371). The streaming `<div class={assistantMessage}>` now wraps `<AssistantHeader name="Agent" />` above the markdown body, eliminating the headerless-flash-into-headered transition when streaming completes. `AssistantHeader`'s `createdAt` prop is optional — when omitted, `RelativeTime` renders nothing (timestamp slot is empty while still streaming, by design).

2. **Double `marginBottom` confirmed correct (Item 2, LOW).** Verified intent: the child `assistantMessage`'s `marginBottom: var(--space-4)` sits *inside* the flex-column row and separates the body from the below-body action row; the row wrapper's own `marginBottom: var(--space-4)` is *outside* the row and separates rows. Flex items don't collapse margins across siblings, so the two are additive-but-separate. Added a one-line comment near `assistantMessage`'s `marginBottom` in `messageStyles.css.ts` documenting this contract. No code change.

3. **Action-row item gap set to `var(--space-2)` for assistant rows (Item 3, INFO).** Added `gap: 'var(--space-2)'` to the `messageRow:has(> .assistantMessage) > .toolHeaderActions, messageRow:has(> .thinkingMessage) > .toolHeaderActions` rule in `messageStyles.css.ts`. Tool-row right-gutter actions keep the tighter 2px default (the global `toolHeaderActions.gap` in `toolStyles.css.ts` is unchanged).

4. **Dev-notes contrast figures aligned to QA's independent calculations (Item 4, INFO).** Updated this spec's "Dev notes" → "Contrast nudges (T8)" block: white-on-`#2563eb` is now stated as 5.17:1, light `--muted-foreground` `#6b7280` on `#ffffff` as 4.83:1, nudged dark muted-fg as 6.06:1, and the originally-rejected dark-`#3b82f6` / dark-`rgb(120 116 112)` ratios were corrected to QA's 3.68:1 / 4.04:1. All values still pass WCAG AA; this is purely a documentation correction.

**Gate results (Patch round 1):**

| Gate | Command | Result |
|---|---|---|
| TypeScript | `cd frontend && bun run typecheck` | PASS — no errors |
| Lint | `cd frontend && bun run lint` | PASS — no errors |
| Tests | `cd frontend && bun run test` | PASS — 228 files, 3226 tests, all green |

dev_confidence_patch: 92

---

#### QA re-verification — Patch round 1 (2026-05-13)

**Verifier:** QA (leapmux)  
**Basis:** `git diff HEAD` on the four patched files; fresh gate runs.

---

##### Item-by-item pass/fail

| Item | Summary | Verdict | Evidence |
|---|---|---|---|
| 1 | Streaming-text path renders avatar header | **PASS** | `ChatView.tsx:372` wraps `<AssistantHeader name={sourceLabel(MessageSource.AGENT).replace(...)} />` above the markdown body inside the streaming `<div class={assistantMessage}>`. `AssistantHeader` is exported from `MessageBubble.tsx` (line 82), imported at `ChatView.tsx:24`, and `createdAt` is omitted — `RelativeTime` correctly short-circuits when `timestamp === ''` (confirmed in `RelativeTime.tsx:63`). Header renders cleanly without `createdAt`. |
| 2 | Doc comment added; double-marginBottom intent confirmed | **PASS** | `messageStyles.css.ts:55–58` contains the multi-line comment: "Spacing between body and the below-body action row (inside flex row). The parent `messageRow:has(> .assistantMessage)` carries its own marginBottom for inter-row gap; flex items don't collapse margins so the two are additive-but-separate (inside vs. outside the row)." Semantics are correct: child `marginBottom` separates body from action row within the flex column; row `marginBottom` creates inter-row breathing room. No code change needed — confirmed intent is correct. |
| 3 | `gap: var(--space-2)` overridden in assistant-specific toolHeaderActions rule | **PASS** | `messageStyles.css.ts:358` has `gap: 'var(--space-2)'` inside the `messageRow:has(> .assistantMessage) > .toolHeaderActions, messageRow:has(> .thinkingMessage) > .toolHeaderActions` rule. Tool-row right-gutter actions retain `gap: '2px'` in `toolStyles.css.ts:203` — the global `toolHeaderActions` base is unchanged. Comment at lines 346–351 explicitly documents the override rationale and the unchanged tool-row default. |
| 4 | Spec contrast figures updated to QA-verified values | **PASS** | "Dev notes → Contrast nudges (T8)" now reads: `#ffffff` on `#3b82f6` = 3.68:1, dark muted-fg nudged value = 6.06:1, `#6b7280` on `#ffffff` = 4.83:1, white-on-`#2563eb` = 5.17:1. All match QA's round-1 independent calculations exactly. |

---

##### Gate results (QA re-verification)

| Gate | Command | Result |
|---|---|---|
| TypeScript | `cd frontend && bun run typecheck` | **PASS** — no errors |
| Lint | `cd frontend && bun run lint` | **PASS** — no errors |
| Tests | `cd frontend && bun run test` | **PASS** — 228 files, 3226 tests, all green |

---

##### Regression scan (new edit surface)

- `grep -rn "AssistantHeader\|sourceLabel" frontend/src` — exactly two callers: `ChatView.tsx` (import + one usage at streaming path) and `MessageBubble.tsx` (definition + internal usages). No unexpected consumers.
- `AssistantHeader` is exported correctly from `MessageBubble.tsx` and imported correctly into `ChatView.tsx`. TypeScript confirms signature match (`name: string`, optional `createdAt?: string`).
- No new TypeScript or lint warnings on patched code.
- `RelativeTime` handles empty `createdAt` safely: `isValid()` returns false when `timestamp === ''`, component renders nothing for the timestamp slot.

##### New items

- **[TRIVIAL] Capitalize logic duplicated at streaming call site.** `ChatView.tsx:372` applies `.replace(/^./, c => c.toUpperCase())` inline because the private `displayName()` helper in `MessageBubble.tsx` is not exported. Both paths produce identical output ("Agent"). Not a bug; acceptable for a streaming-only static fallback. Recommend exporting `displayName` or calling `AssistantHeader` with a pre-capitalized constant in a follow-up cleanup. No score impact.

---

**qa_score_round2: 95**

**Justification:** All four patched items verified correct at code level. All three gates pass (typecheck, lint, 3226 tests). `AssistantHeader` is exported, imported, and used correctly in both the committed-message path (`MessageBubble`) and the streaming path (`ChatView`). `createdAt` optionality is handled safely. The `gap: var(--space-2)` override is in the right selector with tool-row gap unchanged. Spec contrast figures now match QA's verified values. The only new item is a trivial capitalize-duplication at the streaming call site — not a functional defect, no score impact. Score reaches 95 (not 100) because the original low-severity architectural gap — no per-agent display name plumbed through yet — remains a known TODO, and the minor DRY nit on capitalize logic is noted for follow-up.

### PM verdict

**Date:** 2026-05-13
**Reviewer:** PM (leapmux)
**Method:** Read user's verbatim 5-point Korean requirement, diffed each of the 5 changed files, evaluated whether a user opening the dev server would say "그래, 내가 원했던 게 이거야."

---

#### Per-requirement satisfaction (1–5 scale)

| # | User intent (Korean original) | Score (1–5) | Justification |
|---|---|---|---|
| 1 | 색상 — 화이트(#ffffff) + #2563eb 액센트, 보라(thinking)/시안(tool), light/dark 모두 | 5 | `global.css.ts`에 light `#ffffff` / `#2563eb`, dark `rgb(18 18 20)` / `#2563eb`, 보라 `#7c3aed`, 시안 `#0891b2` 모두 토큰화. WCAG AA도 통과. 사용자가 본 openclaw-talk와 거의 동일한 색감. |
| 2 | 폰트 — 'Roboto Condensed', 'Batang' / 'Gyeonggi' / Geist Mono | 4 | `--font-sans` 본문 스택과 `--font-title` 타이틀 스택, `h1–h6` globalStyle 모두 적용. 단 사용자가 명시한 "Geist Mono"는 미적용 — 기존 Hack/SF Mono 유지(스펙은 "mono unchanged"로 의도적 결정). 사용자 원문 그대로 따지면 -1점. |
| 3 | 에이전트 메시지 박스 제거 (assistant/thinking 배경+테두리 평면) | 5 | `assistantMessage`는 `bubbleChrome` 미컴포즈 → `backgroundColor`/`border`/`padding`/`borderRadius` 전부 제거. `thinkingMessage`도 평면(왼쪽 2px 액센트 라인만 남김 — 합리적 디자인 판단). 스트리밍 경로(`ChatView.tsx:371`)도 평면 div를 사용해 일관됨. |
| 4 | 우측 여백 제거 (max-width 제한 + 우측 액션 컬럼 빈공간 제거) | 4 | assistant/thinking은 `alignSelf: stretch` + `maxWidth: 100%`로 채팅 컬럼 전체를 사용. 우측 액션 컬럼(2-col grid)을 단일 flex column으로 교체 → 우측 거터 사라짐. 단 user bubble은 의도적으로 `bubbleChrome`의 `maxWidth: 85%` 유지 → 사용자 메시지 행에는 여전히 우측 빈 공간. 사용자가 "user 메시지 포함"으로 보면 감점. (스펙/디자이너는 user bubble은 식별성 위해 유지하기로 결정함.) |
| 5 | 우측 아이콘/설명을 대화 하단으로 (ToolHeaderActions 행 하단 이동) | 5 | assistant/thinking 행에 한해 `flexDirection: column`, 액션 행을 body 아래로, `:hover` + `:focus-within` 리빌 유지, `gap: var(--space-2)`. 정확히 사용자가 요구한 위치. (Tool 행은 스코프 결정으로 우측 유지 — 별도 설명 필요.) |

#### Weighted score

Weights — req3: 25, req5: 25, req4: 20, req1: 15, req2: 10, baseline structural correctness: 5.

`(5×25 + 5×25 + 4×20 + 5×15 + 4×10 + 5×5) / 5 = (125 + 125 + 80 + 75 + 40 + 25) / 5 = 94`

Then apply -3 for the two user-perspective concerns below (user bubble still has right margin; mono font diverges from "Geist Mono" wording) → **91**.

#### Open-question rulings

- **"박스 없음 = 스트리밍 중에도?"** Patch round 1이 이미 스트리밍 div에 같은 평면 스타일 + `AssistantHeader`를 적용함. 아바타 헤더는 사용자 원문에는 없지만 디자이너 추가분이며, 사용자가 명시적으로 "헤더 빼라"고 하지 않았으므로 박스-없음 의도 위반은 아님. PASS.
- **"우측 여백 제거 = 어시스턴트만? user 포함?"** 어시스턴트 측에서는 완벽히 해결. user bubble의 `maxWidth: 85%`는 보존 — 스펙 작성자(Designer/PM)의 의도된 결정이지만 사용자 원문 4번을 직역하면 user 메시지도 우측 끝까지 가야 한다고 읽힐 수 있음. **사용자 검증 필요 항목** — 직접 보고 OK 하면 그대로, NG면 user bubble도 `maxWidth: 100%` + `alignSelf: stretch` 또는 단순 `display: inline-block`으로 추가 패치.
- **"폰트 — Geist Mono"** 사용자 원문은 "Geist Mono 코드"라 명시했으나 구현은 기존 Hack NF/SF Mono 유지. 스펙에 "mono unchanged"로 합의됐지만 사용자 원문에서 벗어남. **사용자 검증 필요** — Geist Mono 적용을 원하면 `--font-mono` 토큰을 `'Geist Mono', 'Hack NF', ...` 로 prepend하는 1줄 패치로 해결 가능.

#### Top concerns from the user's perspective

1. **User bubble 우측 여백 유지** — 사용자가 "우측 여백 제거"라고 했을 때 user 메시지까지 의도했다면 미해결로 느낄 수 있음. 디자이너의 식별성 논거가 강력하지만 사용자 검증이 필요.
2. **Geist Mono 미적용** — 사용자 원문에 명시된 코드 폰트가 반영되지 않음. 한 줄 패치로 해결 가능한 사소한 갭.

#### Ship decision

**Ship as-is, with 2 follow-up confirmations from user.** 5개 요구사항 중 핵심 3개(박스 제거, 우측 아이콘 하단 이동, 색상)는 완벽 충족. 나머지 2개는 사용자 시연 후 추가 패치 여부 결정 권장. QA 게이트(3226 tests green) + WCAG AA + 회귀 없음으로 머지에는 안전.

**pm_score: 91**
