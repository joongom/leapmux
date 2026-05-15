---
id: chat-typography-pass2
title: chat-typography-pass2
status: draft
date: 2026-05-14
owner: pm
---

# chat-typography-pass2

## Problem
사고 과정(thinking)·툴(tool) 영역이 본문 폰트(Batang 우선 `--lm-chat-body`)를 그대로 상속해 prose와 시각적으로 구분이 약하고, thinking 본문은 size가 본문과 동일해 비중이 과해 보인다. 또한 마크다운 GFM의 strikethrough(`~text~` / `~~text~~`)가 "7~11월", "6~12월" 같은 범위 표기를 취소선으로 잘못 렌더해 가독성을 해친다.

## User stories
- 사용자로서, 사고 과정 카드의 본문이 시스템 UI 폰트로 약간 작게 표시되어 메인 응답과 한눈에 구별되길 원한다.
- 사용자로서, 툴 카드 내부 라벨/메시지가 시스템 폰트로 통일되어 응답 prose와 분리되길 원한다.
- 사용자로서, "7~11월" 같은 한글 범위 표기가 취소선 없이 그대로 보이길 원한다.

## Acceptance criteria
1. `thinkingMessage` (및 그 prose 자식: p, li, blockquote 등) 본문이 시스템 기본 폰트 스택으로 렌더된다 — Batang/Roboto가 아님. 헤더("사고 과정" 토글 라벨)는 기존 그대로.
2. `thinkingMessage` 본문 사이즈가 현재(16px 상속)에서 약 10% 축소된다(예: `0.9em` 또는 토큰 기반 `var(--text-7)` 14px — TechLead가 확정). 행간(line-height)도 비례 유지.
3. `toolCard` 내부 라벨/요약 텍스트가 시스템 기본 폰트로 통일된다. 단, code/diff/pre는 `var(--font-mono)` 유지.
4. `MarkdownText`가 렌더하는 결과에서 `~`/`~~`로 둘러싼 구간이 시각적 취소선으로 보이지 않는다 — 즉 "7~11월"이 그대로 표시된다. 구현 방식은 TechLead/Designer 결정(아래 Open questions 참조). 사용자가 의도한 다른 GFM 기능(테이블·체크박스·자동링크)은 영향 없음.
5. 사용자 버블(`userMessage`)·assistant prose(`assistantMessage`)·헤더(`assistantName`, `assistantAvatar`)·시스템 메시지·plan 메시지는 폰트·사이즈 변동이 없다(직전 pass3에서 정해진 Batang-first + view-bg + thinking 카드 chrome 보존).
6. light/dark 양 테마, 모바일(≤640px) 및 데스크톱에서 동일하게 적용된다.
7. 마크다운 캐시(`markdownCache` in `renderMarkdown.ts`)가 strikethrough 처리 변경 후에도 stale 결과를 반환하지 않는다(번들 변경 시 자연 무효화 OK; 명시 invalidate는 불필요).

## Out of scope
- 툴 카드 내부 콘텐츠(diff/code/JSON) 폰트 — `var(--font-mono)` 유지.
- 사용자 버블 폰트 변경 — Batang stack 그대로.
- 마크다운 GFM의 나머지 기능(테이블, task list, autolink, footnote) — 동작·외관 변동 없음.
- thinking 카드의 색/패딩/border-radius — 직전 pass에서 픽스된 chrome 보존.
- 다른 영역(사이드바·헤더·diff viewer)의 폰트 시스템화 — 다음 cycle.

## UI notes

### 1. System font stack — final definition

```
system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
```

`system-ui` alone already resolves to the platform-native UI font on every modern engine (San Francisco on macOS/iOS, Segoe UI on Windows 11, Roboto on Android/ChromeOS). `-apple-system` and `BlinkMacSystemFont` are legacy Safari / older Chrome fallbacks that cost nothing. `Roboto` is kept as an explicit Android fallback for older WebViews that predate `system-ui` support.

**Korean fallback (`'Apple SD Gothic Neo'`, `'맑은 고딕'`) — omitted.** `system-ui` on Korean macOS/iOS already selects Apple SD Gothic Neo; on Windows it selects Malgun Gothic. Explicitly listing them adds noise and creates a cross-platform ordering hazard (Malgun Gothic before Roboto would activate on non-Korean Windows). Modern OS CJK coverage via `system-ui` is sufficient. Omit.

Token recommendation: define `--lm-chat-system` in the theme layer so TechLead and Dev reference one name rather than the inline stack. This scopes the change to thinking + tool only and leaves `--lm-chat-body` (Batang-first) untouched for pass3.

### 2. Thinking body font-size — `0.9em`

Use `font-size: 0.9em` (not `var(--text-7)`, i.e. 14px fixed).

Rationale: `0.9em` is parent-relative, so if `messageList` `font-size` changes in a future pass the thinking card scales with it — no drift. At current 16px parent, `0.9em` = 14.4px, which clears the A11y floor (≥13px). `var(--text-7)` is 14px fixed (0.875rem from Oat tokens) — nearly identical today but rigid. The 0.4px difference is imperceptible; parent-relativity wins. Apply to `thinkingContent` (the prose container inside the card) via `globalStyle` on `p, li, blockquote` children, not on the `thinkingMessage` card root itself, so the header row and actions row inherit normal 16px and vertical rhythm is preserved.

### 3. Strikethrough disable — option (b): rehype unwrap plugin

Add a small rehype plugin to `renderMarkdown.ts` alongside the existing `rehypeExternalLinks` pattern. The plugin visits `element` nodes where `tagName === 'del'` and splices their children in place (same splice pattern as the link-unwrap). This removes `<del>` from the DOM entirely — no semantic leakage to screen readers, no need for `color: inherit` overrides, and no coupling to CSS specificity. The user's wording "마크다운 렌더러에서 취소선을 사용하지 않도록" confirms renderer-level intent. Both `processor` and `plainProcessor` pipelines must receive the plugin. Cache invalidation: the bundle change naturally invalidates the in-memory `markdownCache` (new JS bundle = fresh runtime); no explicit flush needed.

### 4. Tool card font scope

Apply `fontFamily: var(--lm-chat-system)` to the `toolCard` style block. Scope: label/summary text only. Code blocks, `<pre>`, and `<code>` inside the card already inherit `var(--font-mono)` from the `globalStyle` rules on `messageBase code` and `messageBase pre` — those rules are higher in the cascade and must not be overridden here. No additional exclusion rule is needed; confirm with TechLead that `messageBase` mono globalStyles apply to `toolCard` children via class composition.

## Tasks

**T1 — Add `--lm-chat-system` token to theme (Dev)**
File: `frontend/src/styles/global.css.ts`.
- In the `:root` `vars` block (light theme, ~line 152, next to the existing `--lm-chat-body` / `--lm-chat-title` / `--lm-chat-user` block) add:
  ```ts
  '--lm-chat-system': `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  ```
- In the `[data-theme="dark"]` `vars` block (~line 186) add the same line with the same value. Dark theme currently does not redefine the chat font tokens, so adding it on both keeps the parallel structure obvious to future readers and ensures the token resolves even if a future refactor scopes light/dark differently. Same string in both blocks.
- Order: place immediately after the `--lm-chat-user` line so the three chat-font tokens stay grouped.
- No other tokens change.

**T2 — Apply system font to `thinkingMessage` (Dev)**
File: `frontend/src/components/chat/messageStyles.css.ts` (~line 69).
- In the `thinkingMessage = style([messageBase, { ... }])` object, add `'fontFamily': 'var(--lm-chat-system)'` as a new property. Insertion point: between `'color'` and `'alignSelf'` (alphabetical-ish ordering already broken, just keep it readable).
- Do NOT touch the header (`thinkingHeader`) — it lives outside `thinkingMessage` in the DOM and must keep inherited body font for the chevron + label rhythm.

**T3 — Apply system font to `toolCard` (Dev)**
Same file (~line 184).
- In the `toolCard = style([metaMessage, { ... }])` object, add `'fontFamily': 'var(--lm-chat-system)'` as a new property, first key inside the object literal.
- Verify in dev that `${messageBase} code` and `${messageBase} pre` globalStyle rules (lines 421–429) still win for code/pre children. They do — `metaMessage` does NOT compose `messageBase`, so those mono rules currently don't apply to `toolCard` children at all. If Dev finds Shiki blocks inside tool cards rendering in system font, file a follow-up — out of scope for this pass (Designer note §4 only requires label/summary to be system; code blocks already use Shiki's own `<pre class="shiki">` which carries inline `font-family` from the shiki theme, overriding inherit).

**T4 — Shrink `thinkingMessage` prose children by 10% (Dev)**
Same file. Add new `globalStyle` block immediately after the `thinkingMessage` style export (~line 84), targeting only prose-bearing descendants so the header/actions row stay at 16px:
```ts
globalStyle(`${thinkingMessage} p, ${thinkingMessage} li, ${thinkingMessage} blockquote, ${thinkingMessage} td, ${thinkingMessage} th`, {
  fontSize: '0.9em',
})
```
Rationale for selector set: `p` covers paragraph prose, `li` covers bullet/ordered lists, `blockquote` covers quoted blocks (note Oat resets italic on bq globally), `td`/`th` covers GFM tables. Headings (`h1..h6`) are intentionally excluded — they already use Oat's heading scale and a 10% shrink there compounds awkwardly. Code/pre intentionally excluded — they use mono and have their own size via shiki output.

**T5 — Add rehype `<del>` unwrap plugin (Dev)**
File: `frontend/src/lib/renderMarkdown.ts`.
- Below the existing `rehypeExternalLinks` function (~line 92), define a sibling plugin `rehypeUnwrapDel`:
  ```ts
  /** Rehype plugin that unwraps <del> nodes — disables GFM strikethrough rendering. */
  function rehypeUnwrapDel() {
    return (tree: Root) => {
      visit(tree, 'element', (node, index, parent) => {
        if (node.tagName !== 'del')
          return
        if (parent && typeof index === 'number') {
          parent.children.splice(index, 1, ...node.children)
          return index
        }
      })
    }
  }
  ```
- Insert into the main `processor` pipeline (~line 94) BEFORE `rehypeStringify` and AFTER `rehypeExternalLinks` (order vs. external-links is independent; placing after keeps the link-handling pass earlier and the unwrap purely about `<del>`).
- Insert into the `plainProcessor` pipeline (~line 106) at the equivalent position (after `rehypeExternalLinks`, before `rehypeStringify`).
- No new imports needed: `visit` and `Root` are already imported at the top of the file.
- The in-memory `markdownCache` is module-scoped and is freshly created per JS bundle load — code changes invalidate naturally on next page load. No explicit `clear()` call is required (AC #7).

**T6 — Add `renderMarkdown` regression tests (Dev)**
New file: `frontend/src/lib/renderMarkdown.test.ts`.
- Import `renderMarkdown` from `./renderMarkdown` and `describe/it/expect` from `vitest` (matches sibling test file conventions, see `renderAnsi.test.ts` for layout).
- Pass `skipCache = true` on each call so tests don't pollute the module-scoped cache or get false hits from prior tests.
- Cases:
  1. `renderMarkdown('~text~', true)` — assert the returned string does NOT contain `<del>` and does NOT contain `text-decoration:` (defense-in-depth in case shiki theme injects something). Assert it DOES contain the literal `text`.
  2. `renderMarkdown('~~text~~', true)` — same three assertions, covers GFM double-tilde form.
  3. `renderMarkdown('7~11월', true)` — assert no `<del>`, and assert the literal substring `7~11월` (or `7~11월` with possible HTML escaping — use `.toContain('7')` and `.toContain('11월')` if exact-match flakes) appears intact in output.
  4. `renderMarkdown('6~12월 범위는 1~5입니다', true)` — same expectations as case 3 for both ranges.
  5. Positive control: `renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |', true)` — assert output contains `<table>` so we know the GFM plugin itself is still active (we only stripped `<del>`, not all of GFM).
- Do NOT snapshot full HTML — shiki theme tokens shift across versions; assertions on substrings are stable.

**T7 — Audit pass (Dev)**
- Run `grep -rn "<del>\|<del " frontend/src` (note: literal `</del>` would also indicate residual output). Expected: zero matches in source code. Any fixture files containing `<del>` for testing the unwrap behavior are acceptable only if they live under `*.test.ts` and document the expected post-unwrap output.
- Manually trigger `renderMarkdown` in the dev server with the test strings from T6 and visually confirm no strikethrough renders in either theme.

**T8 — QA verification (QA)**
Covered by spec's existing QA section. No new task items needed; QA executes against AC 1–7 once T1–T7 land. Confirm matrix: {light, dark} × {desktop, ≤640px} × {thinking card body, tool card label, range-text `7~11월`}.

techlead_confidence: 0.88 — Pipeline integration (T5) is the only step that touches runtime behavior beyond CSS; rest is mechanical. The `unist-util-visit` dep is already a direct import in `renderMarkdown.ts`, and the existing `rehypeExternalLinks` plugin gives a verified splice template to copy.
- Most uncertain: **T5** — confirming that GFM `~text~` produces `<del>` (vs. some other tagName) in the rehype phase. Mitigated by T6 case 1: if remark-gfm emits something other than `<del>`, the test fails loudly and Dev pivots to inspecting the hast tree. Fallback path: add a remark-phase plugin removing `delete` mdast nodes (one extra import: `unist-util-visit` already loaded; the visitor would skip the `'delete'` node type from mdast).
- Defer-if-pinched: **T8 audit + grep sweep** (mostly mechanical confirmation already covered by T6 unit tests). T1–T6 are the load-bearing changes and must ship together.

## A11y checklist
- [ ] thinking 본문 축소 후에도 최소 가독 크기(≥13px) 충족.
- [ ] 시스템 폰트 전환 후 한글·영문 line-height 깨짐 없음.
- [ ] `<del>` 처리 변경이 스크린리더 해석에 끼치는 영향 평가(의도된 취소선이 의미를 잃지 않는지).
- [ ] light/dark contrast 유지 — thinking muted-foreground 텍스트가 카드 배경 대비 WCAG AA.
- [ ] 키보드 포커스·hover actions row 동작 보존.
- [ ] 모바일 ≤640px에서 thinking 카드 패딩(`--space-2`)과 축소된 본문이 잘림 없이 wrap.

## QA
- 시각: thinking/tool 폰트 시스템화, thinking 본문 약 10% 축소 확인.
- 콘텐츠: "7~11월", "6~12월", "범위는 1~5입니다" → 취소선 없음.
- 회귀: "~~정말 취소선~~" 의도 사용 케이스가 더 이상 취소선이 아님을 사용자가 수용 가능한지 확인(요구사항상 OK).
- 테마/뷰포트 매트릭스: {light, dark} × {desktop, ≤640px}.

### QA verdict

**qa_score: 97/100 — PASS**

All 5 acceptance criteria verified against code and test output. Gates: `typecheck` clean, `lint` clean, full test suite 3251/3251 passed (234 files). Three line summary:

1. **ACs 1–3 (fonts)**: `thinkingMessage` has `fontFamily: 'var(--lm-chat-system)'` at `messageStyles.css.ts:71`; `toolCard` has the same at `messageStyles.css.ts:194`; `--lm-chat-system` defined in both `:root` and `[data-theme="dark"]` blocks of `global.css.ts:161,224` with the correct system stack — Batang-first `--lm-chat-body` and `--lm-chat-user` are untouched.
2. **AC 4 (strikethrough)**: `rehypeUnwrapDel` plugin wired into both `processor` and `plainProcessor` pipelines in `renderMarkdown.ts:122,131`; all 5 vitest cases pass — `~text~`, `~~text~~`, `7~11월`, `6~12월 범위는 1~5입니다` emit no `<del>`, GFM table positive control still renders `<table>`.
3. **AC 5 & 7 (regression + cache)**: `assistantMessage` has no explicit `fontFamily` — inherits `--lm-chat-body` from `ChatView.css.ts:78` (unchanged); `userMessage` keeps `--lm-chat-user`; `markdownCache` is module-scoped and naturally invalidated by the new bundle — no stale results possible; zero `<del>` tags found in `frontend/src/components/` source.

Minor deduction (−3): `renderMarkdown.test.ts` is untracked (not yet committed/staged) so the test file is not part of the committed diff — needs to be staged before commit. No functional defect; all other changes are correctly committed on the branch.

qa_verdict: APPROVED for commit (stage `renderMarkdown.test.ts` before committing).

### PM verdict

**pm_score: 96/100 — PASS**

1. **Req 1 (thinking 시스템 폰트 + ~10% 축소)**: `messageStyles.css.ts` `thinkingMessage` gets `fontFamily: var(--lm-chat-system)` and a `globalStyle` shrinks prose children (`p, li, blockquote, td, th`) to `0.9em` (~10%, ≈14.4px above 13px A11y floor). Header row keeps inherited 16px — matches "본문만 축소" intent precisely.
2. **Req 2 (tool 시스템 폰트 통일)**: `toolCard` style gets `fontFamily: var(--lm-chat-system)`; Shiki-rendered code keeps its own inline `font-family` so mono code is preserved. Token (`--lm-chat-system`) is defined in both `:root` and `[data-theme="dark"]` in `global.css.ts`, korean fallback intentionally omitted (well-justified — `system-ui` already maps to Apple SD Gothic Neo / Malgun Gothic on Korean OS).
3. **Req 3 (마크다운 취소선 비활성)**: New `rehypeUnwrapDel` plugin wired into both `processor` and `plainProcessor` in `renderMarkdown.ts`, AST-level unwrap (option b) — clean DOM, no screen-reader leakage, no CSS specificity coupling. 5 vitest cases lock in `~text~`, `~~text~~`, `7~11월`, `6~12월 범위는 1~5입니다`, plus a GFM-table positive control to prove only `<del>` was removed, not all of GFM.

Risk flags:
- Branch (`feat/ui-openclaw-talk-refresh`) carries 9 other modified files (AppShell, Tile, TileRenderer, AgentEditorPanel, ChatView, entry-server, mprocs-solo, useVisualViewportInset) plus untracked `chat-composer-mobile.md` spec — unrelated to typography-pass2. **Recommend committing typography-pass2 files separately** (`messageStyles.css.ts`, `global.css.ts`, `renderMarkdown.ts`, `renderMarkdown.test.ts`, spec md) so the diff is reviewable in isolation.
- Untracked `renderMarkdown.test.ts` must be staged (QA already flagged — −3 deduction echoed here as −1 since it's a known action item).
- Behavior change: legitimate strikethrough usage (`~~deprecated~~` in docs/changelogs rendered through chat) now renders plain — spec explicitly accepts this in QA section.

Three line summary: All 3 user requirements implemented exactly as worded with token-driven font swap, parent-relative 0.9em shrink, and AST-level `<del>` unwrap. Test coverage is tight (5 cases incl. range expressions + GFM positive control), and gates pass (typecheck/lint/3251 tests). Only friction: typography-pass2 changes are co-mingled with unrelated UI work on the branch — split the commit and stage the new test file before landing.

pm_verdict: APPROVED — split-commit + stage `renderMarkdown.test.ts` before commit.

## Open questions
- 시스템 폰트 스택의 exact 정의: `system-ui` 단독 / `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` / 한글 fallback 포함 여부 — Designer 결정.
- 10% 축소 구현: `font-size: 0.9em`(parent-relative) vs `var(--text-7)`(14px token) — TechLead 결정.
- Strikethrough 비활성 옵션: (a) CSS `del { text-decoration: none }`, (b) rehype plugin으로 `<del>` unwrap, (c) `remark-gfm` 옵션에서 strikethrough 비활성(가능성 확인), (d) custom micromark extension — TechLead 결정.

pm_confidence: 0.85 — 핵심 불확실성: "시스템 기본 폰트"의 정확한 스택과 strikethrough 비활성 방식(CSS-only vs AST-level) 선택이 Designer/TechLead 판단에 달려 있음.

designer_confidence: 0.92 — All five open questions resolved with direct evidence from source files. Biggest decisions: (1) Korean fallback omitted from system stack — `system-ui` already picks the correct CJK font on every target OS, explicit names add cross-platform risk; (2) strikethrough disabled via rehype `<del>` unwrap plugin (option b) — matches user intent of renderer-level removal, follows the existing `rehypeExternalLinks` splice pattern in `renderMarkdown.ts`, and eliminates all DOM semantic and CSS specificity concerns.

### Dev notes

Files modified:
- `frontend/src/styles/global.css.ts` — added `--lm-chat-system` token to both `:root` (light) and `[data-theme="dark"]` vars blocks. Light placement is immediately after `--lm-chat-user` per spec; dark placement is grouped under "Chat-scoped typography" comment since dark didn't previously redefine the chat font tokens. Same string value in both blocks.
- `frontend/src/components/chat/messageStyles.css.ts` — (T2) added `fontFamily: 'var(--lm-chat-system)'` to `thinkingMessage` between `color` and `alignSelf`. (T3) added the same property as the first key inside the `toolCard` style object. (T4) appended a new `globalStyle` block targeting `${thinkingMessage} p, li, blockquote, td, th` with `fontSize: '0.9em'` — headings and code/pre intentionally excluded.
- `frontend/src/lib/renderMarkdown.ts` — defined `rehypeUnwrapDel()` sibling to `rehypeExternalLinks()`. Wired into both `processor` and `plainProcessor` pipelines after `rehypeExternalLinks` and before `rehypeStringify`. No new imports needed (`Root` from hast and `visit` from unist-util-visit were already imported).
- `frontend/src/lib/renderMarkdown.test.ts` — new file with 5 tests covering `~text~`, `~~text~~`, `7~11월`, `6~12월 범위는 1~5입니다`, and a positive GFM-table control. All calls use `skipCache=true`.

Decisions:
- Followed the splice pattern from `rehypeExternalLinks` verbatim — `visit` returns the new index so subsequent siblings are not skipped after children are spliced in.
- T7 audit: `grep -rn "<del>\|<del \|</del>\|>del<" frontend/src/components` returns empty. Source-wide hits are limited to: doc-comment + tests in `renderMarkdown.{ts,test.ts}` (intentional) and unrelated `quoteUtils.test.ts` (out of scope — HTML→markdown conversion, not the chat renderer).
- Lint: vitest test names must start lowercase per `test/prefer-lowercase-title` — switched "GFM table…" to "gFM table…". Other titles already complied.

Gates:
- `bun run typecheck` — pass.
- `bun run lint` — pass.
- `bun run test -- renderMarkdown messageStyles` — 11/11 pass (2 files).
- `bun run test` (full) — 3247/3247 pass (233 files).

dev_confidence: 0.93 — TechLead's plan landed mechanically; the only deviation was placing the dark-theme token under a fresh "Chat-scoped typography" sub-comment (dark vars block doesn't currently carry the other chat-font tokens, so there was no `--lm-chat-user` anchor) and one lint fix for vitest casing. Tests confirm `~text~` / `~~text~~` / Korean range expressions render without `<del>` and GFM tables remain intact.
