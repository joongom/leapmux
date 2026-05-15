# File Viewer: GitHub-Style Renderable-vs-Download Fallback

- **id:** `file-viewer-github-style`
- **status:** draft v1
- **date:** 2026-05-14
- **owner:** PM (with UI/UX consultation)

## Problem

`FileViewer` tries to render every file: text-ish via `TextFileView`, images
via `ImageFileView`, anything else falls through to `HexView`. The hex dump
is hostile for `.zip` / `.docx`, and oversized files just show a terse
"Truncated at 256 KB" footer. We want GitHub's behavior: render what renders
cleanly, otherwise show a card with big actions.

## User stories

1. Click `README.md` or `*.ts` → inline, as today.
2. Click `.zip` / `.docx` / `.exe` / unknown binary → centered card with
   filename, size, big **Download** / **Open in new tab** buttons.
3. Click a 5 MB log → same card instead of silent truncation.
4. Mobile: card and buttons stay readable and tappable.
5. Power users can still reach raw bytes via an optional "View raw" link.

## Acceptance criteria

1. Renderable text-ish files (plain text, source, markdown, JSON / YAML /
   TOML / XML, SVG, etc. — exact list = Designer's call) render inline as
   today. No regression in `TextFileView`, `MarkdownFileView`, `ImageFileView`.
2. Non-renderable files (zip, docx, xlsx, pdf for v1, exe, anything
   `detectFileViewMode` returns `binary` for) render a new
   **`UnsupportedFileView`** card instead of `HexView`.
3. The card contains: file-type icon, basename, formatted size
   (`formatBytes`), and two large buttons — **Download** and **Open in new
   tab** (the latter reuses `openFileInNewTab`, which already falls back to
   download for non-inline MIMEs and blocked popups).
4. Renderable files over `MAX_FILE_SIZE` (256 KiB) show the same card instead
   of inline content; the current "Truncated at 256 KB" status hint is
   superseded for this case (Designer decides whether to keep it as a small
   note).
5. Over-cap images (today: "Image too large to preview") show the same card.
6. Card uses leapmux design tokens (`--card`, `--border`, `--space-*`) and is
   centered horizontally and vertically inside the viewer area.
7. Card is responsive: on viewports ≤ 480 px, buttons stack vertically and
   remain ≥ 44 px tall.
8. Viewer reuses **existing** `downloadFileFromWorker` and `openFileInNewTab`
   helpers from `DirectoryTree.tsx`. These are currently private; TechLead
   extracts them into a shared module (e.g. `lib/fileDownload.ts`) — no
   duplicated logic.
9. PDFs are treated as non-renderable in v1; inline iframe is deferred.

## Out of scope

- New inline renderers (PDF, notebook, docx, video, audio).
- Streaming or chunked reads beyond the 256 KiB cap.
- Diff view, ref view, file-tree changes.
- Replacing the hex view globally.

## UI notes

### Renderable extension allowlist (Q1)

`detectFileViewMode` already handles the split. Renderable = anything it returns `text`, `markdown`, or `image` for. The concrete lists:

- **Markdown**: `.md .markdown .mdx` → `MarkdownFileView`
- **Image**: `.png .jpg .jpeg .gif .webp .svg .bmp .ico .avif` → `ImageFileView` (SVG inline as `<img>`; no special treatment needed)
- **Text / source** (anything `detectFileViewMode` returns `text` for — binary probe passes): `.txt .log .csv .tsv .json .yaml .yml .toml .xml .html .htm .ini .conf .gitignore` plus all source extensions (`.ts .tsx .js .jsx .py .go .rs .c .cpp .h .hpp .java .rb .swift .kt .sh .bash .zsh .fish .lua .pl .php .sql .css .scss .sass .less`) → `TextFileView` with Shiki highlight
- **PDF**: non-renderable in v1 — card
- **Everything else** (`binary` mode or extension not in the above lists): `UnsupportedFileView` card

No MIME sniff needed; `isBinaryContent` byte-probe already covers ambiguous cases.

### Buttons (Q2)

**Two separate buttons: Download + Open in new tab.**

Rationale: the user explicitly described two distinct actions ("다운로드" and "다운로드 후 새 탭에서 열기"); keeping them separate makes intent unambiguous and matches GitHub's own two-button pattern.

- Primary: `<button>` styled `data-variant="primary"` — label `Download`
- Secondary: `<button>` styled `data-variant="secondary"` — label `Open in new tab`
- Both min-height `44px`, min-width `120px`, `border-radius: var(--radius-medium)`
- On viewports ≤ 480 px: `flex-direction: column`, full-width buttons

### Card visual (Q3)

GitHub-like card on `var(--background)` body. Spec:

```
max-width: 400px
width: calc(100% - var(--space-6) * 2)   /* 24px side margin each */
padding: var(--space-6) var(--space-5)
border: 1px solid var(--border)
border-radius: var(--radius-medium)
background-color: var(--card)
box-shadow: var(--shadow-small)
```

Card is centered in the viewer area via the same `display:flex; align-items:center; justify-content:center; height:100%` wrapper used by `loadingState` / `errorState` / `imageSizeError`.

Internal layout (column, centered, `gap: var(--space-4)`):

1. File-type icon (48 × 48 px, `color: var(--muted-foreground)`)
2. Filename — `font-weight: var(--font-bold); font-size: var(--text-5); color: var(--foreground); word-break: break-all`
3. File size — `font-size: var(--text-7); color: var(--muted-foreground)`
4. Button row — `display:flex; gap:var(--space-3); flex-wrap:wrap; justify-content:center`

### View raw / hex escape hatch (Q4)

**Drop "View raw" in v1.** Binary files have no useful raw-text view; oversized text files are already accessible via the filesystem. Adding a hex escape hatch increases scope without clear user value. Revisit if user feedback surfaces demand.

The existing `statusBar` (size badge + truncation warning) is also suppressed for the card paths — the card already shows formatted size inline.

### File-type icon

Use `lucide-solid/icons/file` (`File`) as the default for all non-renderable files. This icon is already used in `DirectoryTree.tsx` and `FilesSection.tsx` — no new dependency.

- Size: `48px` (set via `width`/`height` on the SVG)
- Color: `var(--muted-foreground)`

Category overrides (applied by `UnsupportedFileView` based on extension):

| Extension group | Icon |
|---|---|
| `.zip .tar .gz .7z .rar .bz2` | `lucide-solid/icons/file-archive` |
| Image extensions (over-cap) | `lucide-solid/icons/file-image` |
| Source code / text-ish (over-cap) | `lucide-solid/icons/file-text` |
| Everything else / unknown | `lucide-solid/icons/file` |

### Copy — language (Q6)

English only. Leapmux UI chrome (toolbar labels, status messages, error states) is in English. The chat layer mixes Korean for content but UI furniture stays English. Keeping the card copy English is consistent with `"Truncated at 256 KB"`, `"Loading..."`, `"Image too large to preview"` — all existing strings.

### Copy by path

| Path | Header | Subtext |
|---|---|---|
| Binary / non-renderable (any size) | `This file cannot be previewed.` | `Download it or open in a new tab.` |
| Text-ish file over 256 KB cap | `This file is too large to preview.` | `Only the first 256 KB can be loaded inline. Download for the full content.` |
| Image over 256 KB cap | `This image is too large to preview.` | `Download it or open in a new tab.` |

Header: `font-size: var(--text-6); font-weight: var(--font-bold); color: var(--foreground)`  
Subtext: `font-size: var(--text-7); color: var(--muted-foreground); text-align: center`

### Responsive (Q9)

- **≥ 481 px**: buttons side-by-side in a row, card `max-width: 400px`
- **≤ 480 px**: card `max-width: 100%; width: calc(100% - var(--space-4) * 2)`, buttons `flex-direction: column; width: 100%`, each button `min-height: 44px`

No new tokens required; all values use existing Oat/leapmux scale.

## Tasks (TechLead fills in)

> Decisions baked in:
> - **HexView is retired from the FileViewer dispatch.** GitHub doesn't show
>   hex by default, the spec resolves Q4 as "drop View raw in v1", and keeping
>   a dead branch wired through `<Show when={viewMode() === 'binary'}>` will
>   only invite drift. Leave `HexView.tsx` and `tests/unit/components/hexView.test.ts`
>   on disk untouched (still exported, still tested) so we can resurrect it
>   later without archaeology — but remove the import + render path from
>   `FileViewer.tsx`.
> - **Icon picked by extension** inside `UnsupportedFileView` per the
>   Designer's category table (archive / image / text-ish / default). The
>   over-cap branches pass an explicit hint (`'image' | 'text'`) so we don't
>   re-derive it from the extension when the dispatcher already knows.

### T1 — Extract worker file-download helpers into a shared module

- **Files to touch:**
  - `frontend/src/lib/fileDownload.ts` (new)
  - `frontend/src/components/tree/DirectoryTree.tsx` (replace local copies with imports)
- **Implementation note:** Move `fetchFileBlob`, `downloadFileFromWorker`, and
  `openFileInNewTab` plus the `INLINE_EXT_MIME` table, `getExt`, and
  `DOWNLOAD_CHUNK_SIZE` from `DirectoryTree.tsx` (L281–L423) into
  `lib/fileDownload.ts` verbatim. Export `downloadFileFromWorker` and
  `openFileInNewTab` as named exports; keep `fetchFileBlob` internal. The
  `PathFlavor` parameter and `basename(path, flavor)` call stay — that's the
  existing contract both callers (DirectoryTree and the new
  `UnsupportedFileView`) need. Delete the three call-site definitions in
  `DirectoryTree.tsx` and replace with `import { downloadFileFromWorker, openFileInNewTab } from '~/lib/fileDownload'`.
- **Audit step:** `rg -n "fetchFileBlob|downloadFileFromWorker|openFileInNewTab" frontend/src` → only one definition site (`lib/fileDownload.ts`), two consumers (`DirectoryTree.tsx`, `fileviewer/UnsupportedFileView.tsx`).
- **Test gate:**
  - `bun run typecheck`
  - `bun run lint`
  - `bun run test -- DirectoryTree` (existing tree tests still green — no behavior change for the right-click menu).

### T2 — Add `UnsupportedFileView` component and styles

- **Files to touch:**
  - `frontend/src/components/fileviewer/UnsupportedFileView.tsx` (new)
  - `frontend/src/components/fileviewer/FileViewer.css.ts` (new style blocks)
- **Implementation note:** New SolidJS component with props
  `{ workerId: string; filePath: string; flavor: PathFlavor; totalSize: number; reason: 'binary' | 'oversize-text' | 'oversize-image' }`.
  Pick the icon via a small `pickIcon(reason, ext)` helper: `oversize-image` →
  `FileImage`, `oversize-text` → `FileText`, archive extensions
  (`.zip .tar .gz .tgz .7z .rar .bz2`) → `FileArchive`, otherwise `File`. All
  four come from `lucide-solid/icons/*` — no new dependency. Render the
  Designer's centered card (wrapper reusing the existing
  `display:flex; align-items:center; justify-content:center; height:100%`
  pattern), filename via `basename(filePath, flavor)`, size via
  `formatBytes(totalSize)`, two `<button>`s wired to
  `downloadFileFromWorker(workerId, filePath, flavor)` and
  `openFileInNewTab(workerId, filePath, flavor)` with `void` to satisfy the
  promise. Header + subtext copy comes from the spec's "Copy by path" table,
  selected by `reason`. Apply ARIA per the A11y checklist: outer
  `role="region"` with `aria-labelledby` pointing at the filename node
  (`createUniqueId()` from Solid), `aria-label` on each button
  (`Download {file}`, `Open {file} in new tab`).
  Add CSS exports in `FileViewer.css.ts`: `unsupportedCard`, `unsupportedIcon`,
  `unsupportedFilename`, `unsupportedSize`, `unsupportedHeader`,
  `unsupportedSubtext`, `unsupportedButtonRow`, `unsupportedPrimaryButton`,
  `unsupportedSecondaryButton`. Use existing tokens
  (`--card`, `--border`, `--space-3/4/5/6`, `--radius-medium`, `--shadow-small`,
  `--text-5/6/7`, `--font-bold`, `--foreground`, `--muted-foreground`).
  Implement the ≤480 px breakpoint via `@media` in `style()` `'@media'` key
  (column buttons, full-width, `min-height: 44px`).
- **Audit step:** `rg -n "lucide-solid/icons/(file|file-image|file-text|file-archive)" frontend/src/components/fileviewer` → only `UnsupportedFileView.tsx` references these.
- **Test gate:**
  - `bun run typecheck`
  - `bun run lint`

### T3 — Re-wire `FileViewer.tsx` dispatch through the card

- **Files to touch:**
  - `frontend/src/components/fileviewer/FileViewer.tsx`
- **Implementation note:** Three behavioral changes inside the
  "Working mode or no mode" `<Show>` block (L312–L355):
  1. **Over-cap image:** replace the `imageSizeError` div (L313–L317) with
     `<UnsupportedFileView ... reason="oversize-image" />`.
  2. **Truncated text-ish:** add a guard `isTruncated() && viewMode() !== 'image'`
     ahead of the `text` and `markdown` branches that renders
     `<UnsupportedFileView ... reason="oversize-text" />` and skips inline
     rendering. The current `MAX_FILE_SIZE = 256 * 1024` constant stays.
  3. **Binary:** replace the `<Show when={viewMode() === 'binary'}>` →
     `<HexView />` with `<UnsupportedFileView ... reason="binary" />`. Remove
     the `HexView` and `TOOLBAR_CLEARANCE_PX` imports if no longer used (grep
     before deleting — `TOOLBAR_CLEARANCE_PX` is still referenced by the
     `hasFloatingToolbar` styling? Check `FileViewer.css.ts` consumers).
  Also suppress the bottom `statusBar` when an unsupported card is showing —
  the card already shows size inline (per UI notes §"View raw / hex escape
  hatch"). A `showCard()` memo (`true` when oversize-text, oversize-image, or
  `viewMode() === 'binary'`) gates both the inline branches and the status
  bar. Flavor for the component comes from the existing tree context — but
  `FileViewer.tsx` doesn't take it as a prop today; pass via new optional prop
  `flavor?: PathFlavor` (defaulting to `detectFlavor(filePath)` from
  `~/lib/paths`) so callers don't need updating in v1.
- **Audit step:**
  - `rg -n "Truncated at|Image too large|HexView|binary mode|imageSizeError|truncationWarning" frontend/src/components/fileviewer` → `Truncated at` and `Image too large` strings remain only in the *.css.ts dead-style cleanup-or-leave decision (it's fine if `imageSizeError` / `truncationWarning` style exports stay; they're just unreferenced).
  - `rg -n "from '.*fileviewer/HexView'" frontend/src` → only test files and `HexView.tsx` itself; no production import.
- **Test gate:**
  - `bun run typecheck`
  - `bun run lint`
  - `bun run test -- fileviewer`

### T4 — Verify happy paths and existing renderers are untouched

- **Files to touch:** none (verification only).
- **Implementation note:** Confirm `TextFileView.tsx`, `ImageFileView.tsx`,
  and `MarkdownFileView.tsx` have zero diff. The dispatcher now skips them
  when `isTruncated()` or image-over-cap, but the *under-cap* paths must still
  pass identical props. Manually exercise: small `.ts`, `.md`, small `.png`,
  small `.svg`.
- **Audit step:**
  - `git diff --stat frontend/src/components/fileviewer/TextFileView.tsx frontend/src/components/fileviewer/ImageFileView.tsx frontend/src/components/fileviewer/MarkdownFileView.tsx` → empty.
  - `rg -n "TextFileView|MarkdownFileView|ImageFileView" frontend/src/components/fileviewer/FileViewer.tsx` → each still rendered for its `viewMode()` branch.
- **Test gate:** `bun run test -- "fileviewer|ViewToggle|imageToolbar"` (all pre-existing tests pass).

### T5 — Tests for the new dispatch + `UnsupportedFileView`

- **Files to touch:**
  - `frontend/tests/unit/components/UnsupportedFileView.test.tsx` (new)
  - `frontend/tests/unit/components/FileViewer.test.tsx` (new — there is no
    existing FileViewer test file per `find`; create one focused on the
    branch matrix)
- **Implementation note:** Use the existing testing harness (`@solidjs/testing-library` + `vitest`, matching `ViewToggle.test.tsx`). For `UnsupportedFileView`:
  - Renders filename, formatted size, both buttons.
  - Clicking Download calls the mocked `downloadFileFromWorker` once with `(workerId, filePath, flavor)`.
  - Clicking Open in new tab calls `openFileInNewTab` once.
  - Icon swaps per `reason` (`oversize-image` → `FileImage` test-id check, etc.). Either snapshot the SVG `data-lucide` attribute or assert on a `data-testid` we expose for the icon slot.
  - Mock `~/lib/fileDownload` at the test boundary; no real `workerRpc`.
  For `FileViewer.test.tsx`: mock `workerRpc.statFile` / `workerRpc.readFile` and assert on rendered output for four cases: small text → `TextFileView`, oversize text → card with "too large to preview" header, binary bytes (forced via probe) → card with "cannot be previewed" header, oversize image → card with "image is too large" header.
- **Audit step:** `rg -n "UnsupportedFileView" frontend` → component + two tests + spec.
- **Test gate:**
  - `bun run test -- UnsupportedFileView`
  - `bun run test -- FileViewer`
  - `bun run typecheck`

### T6 — Full repo sweep before handing off to QA

- **Files to touch:** none.
- **Implementation note:** Final sanity pass to catch stragglers — dangling
  imports, leftover dead CSS, accidental string regressions.
- **Audit step (all four must pass):**
  - `rg -n "Truncated at 256|Image too large to preview" frontend/src` → zero hits in `.tsx`; matches only allowed in `.test.*` if the test asserts the *old* text was removed (otherwise also zero).
  - `rg -n "HexView" frontend/src/components/fileviewer/FileViewer.tsx` → zero hits.
  - `rg -n "from '.*tree/DirectoryTree'" frontend/src` → unchanged set (no new accidental imports).
  - `rg -n "imageSizeError|truncationWarning" frontend/src/components/fileviewer/FileViewer.tsx` → zero hits (CSS exports may remain unused; that's acceptable for v1, flag for cleanup if lint complains).
- **Test gate:**
  - `bun run typecheck`
  - `bun run lint`
  - `bun run test`

## A11y checklist

1. Card is `role="region"` with `aria-labelledby` on filename.
2. Real `<button>` with descriptive labels ("Download {file}", "Open {file}
   in new tab").
3. Focus order: filename → Download → Open in new tab → View raw.
4. 44×44 px touch hit-target.
5. Muted text contrast ≥ 4.5:1 on card.
6. Respects `prefers-reduced-motion`.

## QA (QA fills in)

- Renderable (txt, ts, md, json, svg, small png) still inline.
- Non-renderable (zip, docx, exe, binary) show card; both buttons work in
  Chrome / Firefox / Safari (desktop + iOS).
- Over-cap text and image both show card.
- Popup-blocked path falls back to download.

### QA verdict

**Gates (verbatim runs):**

| Gate | Result |
|---|---|
| `cd frontend && bun run typecheck` | PASS — zero errors |
| `cd frontend && bun run lint` | PASS — zero warnings |
| `cd frontend && bun run test -- UnsupportedFileView` | PASS — 8/8 |
| `cd frontend && bun run test -- FileViewer` | PASS — 4/4 |
| `cd frontend && bun run test` (full suite) | PASS — 232 files / 3242 tests (one flaky vanilla-extract CSS hash collision on first run disappeared on second run; unrelated to this feature) |

**Acceptance criteria audit:**

| AC | Status | Note |
|---|---|---|
| AC1 — Renderable files inline; no regression in TextFileView / MarkdownFileView / ImageFileView | PASS | Zero diff on the three view files; each `<Show>` still wired with `!showCard()` guard |
| AC2 — Non-renderable (binary) → `UnsupportedFileView` card, not HexView | PASS | `HexView` import + dispatch branch deleted from `FileViewer.tsx`; zero hits of `HexView` in production src |
| AC3 — Card: file-type icon, basename, formatted size, Download + Open buttons | PASS | `UnsupportedFileView.tsx` L94-127; test asserts all elements present |
| AC4 — Over-cap text-ish → card, "Truncated at" string removed | PASS | `isTruncated() && viewMode() !== 'image'` branch in `showCard()`; `truncationWarning` chip gone from `FileViewer.tsx` |
| AC5 — Over-cap image → card (was "Image too large to preview") | PASS | `imageTooLarge()` branch in `showCard()`; `imageSizeError` div removed |
| AC6 — Card uses design tokens (`--card`, `--border`, `--radius-medium`, `--shadow-small`, max-width 400px) | PASS | `FileViewer.css.ts` L372-390; all five tokens present verbatim |
| AC7 — Responsive ≤480px: buttons stack vertically, ≥44px tall | PASS | `unsupportedButtonRow` @media column + `unsupportedPrimaryButton`/`Secondary` minHeight 44px; wrapper padding `var(--space-4)` provides side margin (see minor issue below) |
| AC8 — Shared helpers from `lib/fileDownload.ts`; no duplicate logic | PASS | Single definition in `fileDownload.ts`; two consumers (`DirectoryTree.tsx`, `UnsupportedFileView.tsx`); `fetchFileBlob` unexported |
| AC9 — PDF treated as non-renderable | PASS — by extension | `detectFileViewMode` returns `binary` for PDF; no special-casing needed; covered by AC2 |

**Specific concern checks:**

- `fileDownload.ts` exports: `downloadFileFromWorker` (exported L55), `openFileInNewTab` (exported L118), `fetchFileBlob` stays internal (L21, no `export`) — PASS.
- DirectoryTree no longer declares helpers locally; imports from `~/lib/fileDownload` — PASS (`DirectoryTree.tsx` diff shows 150-line block deleted, import added at L24).
- Three dispatch branches (image-too-large, oversize-text, binary) all route to `UnsupportedFileView` — PASS (`showCard()` memo covers all three; single `<Show when={showCard() && cardReason() !== null}>` block).
- `HexView` not reachable through `FileViewer.tsx` — PASS (zero grep hits in `FileViewer.tsx`; only `HexView.tsx` itself and `hexView.test.ts` reference it).
- `UnsupportedFileView` renders 3 reason variants with correct headers — PASS (`headerFor()` L51-58: binary→"cannot be displayed", oversize-text→"too large to preview", oversize-image→"image too large").
- Icon per variant — PASS (`pickIcon()` L41-49: oversize-image→FileImage, oversize-text→FileText, archive exts→FileArchive, default→FileIcon).
- Buttons trigger `downloadFileFromWorker` / `openFileInNewTab` with `(workerId, filePath, flavor)` — PASS (L80-85; tests assert exact call args).
- Card tokens: `var(--card)`, `var(--border)`, `var(--radius-medium)`, `var(--shadow-small)`, `max-width: 400px` — PASS.
- Mobile ≤480px: buttons stack — PASS (`flexDirection: 'column'` in `@media`).
- ARIA: `role="region"` on card div, `aria-labelledby` pointing at filename node, per-button `aria-label` — PASS (L91-92, L111, L121).

**Regression scan:**

- `git diff HEAD -- TextFileView.tsx ImageFileView.tsx MarkdownFileView.tsx` — empty (PASS).
- `git diff HEAD -- DropdownMenu.tsx sharedTree.css.ts sidebarActions.css.ts` — empty (PASS).
- `grep -rn "Truncated at|Image too large|HexView" frontend/src` — only `HexView.tsx` itself; no hits in `FileViewer.tsx` (PASS).
- `DirectoryTree.tsx` imports `~/lib/fileDownload` correctly (PASS).

**Minor issues (non-blocking):**

1. **Copy deviation (binary subtext):** Spec "Copy by path" table says subtext `"Download it or open in a new tab."` for binary; implementation uses `"It's a binary file."`. Dev notes document this as deliberate per Designer's later work-order directive. Acceptable but spec table is now stale — flagged for PM to update the copy table if this direction is confirmed.
2. **Copy deviation (oversize-image subtext):** Spec says `"Download it or open in a new tab."` for image-over-cap; implementation uses `"This image is too large to preview inline (over 256 KB)."`. More informative; consistent with Dev's stated rationale.
3. **Binary header word choice:** Spec says `"This file cannot be previewed."`, implementation uses `"This file cannot be displayed."`. Meaning-equivalent; documented by Dev as Designer override. Low risk.
4. **Card side margin token:** Spec calls for `width: calc(100% - var(--space-6) * 2)` (24px side margins). Implementation uses `unsupportedWrapper` with `padding: var(--space-4)` (16px). The card gets margins through the flex wrapper's padding but uses `--space-4` instead of `--space-6`. Visual difference is minor and responsive behavior is correct; flag for Designer sign-off.
5. **DOM/focus order:** Spec A11y §3 lists focus order as "filename → Download → Open in new tab → View raw". Actual DOM order is icon → header → subtext → filename → size → buttons. Filename comes before buttons in tab order (correct), but after icon/header/subtext. Since "View raw" is dropped in v1 this is fine. The `aria-labelledby` pointing to the filename div is correctly implemented.
6. **`messageClassification` test flake:** Full-suite first run showed 1 failing test (`messageClassification.test.ts`) with a CSS class hash collision. On second run all 3242 tests passed. Root cause is likely vitest worker ordering affecting vanilla-extract's deterministic hash; unrelated to this feature. Pre-existing condition confirmed by stashing feature changes and reproducing in isolation.

**Overall:** Implementation is complete, correct, and well-tested. All functional ACs pass. The three copy-text deviations are documented by Dev as Designer-directed and are the only open items needing PM/Designer sign-off.

### PM verdict

**User requirement (verbatim):** "깃헙처럼 보여줄수 있는 텍스트 파일만 즉시 뷰에서 보여주고, 그게 아닌 파일들은 뷰 화면에서 다운로드, 다운로드 후 새 탭에서 열기 같은 버튼을 크게 제공하는게 어떨까? 유아이 유엑스 팀이랑 한번 얘기해봐."

**Per-requirement satisfaction (weighted):**

| # | Requirement | Weight | Score | Weighted | Notes |
|---|---|---|---|---|---|
| a | Renderable text/markdown/image inline preserved | 30% | 100 | 30.0 | Zero diff in `TextFileView` / `MarkdownFileView` / `ImageFileView`; under-cap paths gated by `!showCard()`; verified via `bun run test -- FileViewer UnsupportedFileView` (12/12) |
| b | Non-renderable shows big Download + "Open in new tab" buttons in-view | 50% | 92 | 46.0 | Two-button card with 44 px min-height / 120 px min-width; shared helpers via `lib/fileDownload.ts`; mobile stack at ≤480 px. Minor demerit: subtext copy ("It's a binary file.") drops the action hint the user explicitly wanted echoed |
| c | UI/UX team consulted | 20% | 95 | 19.0 | Designer authored UI notes (card visual, copy table, responsive, icon map); `designer_confidence: 88`. Demerit: Dev deviated from spec's "Copy by path" table on three strings without re-confirmation in the spec body |
| **Total** | | **100%** | | **95.0** | |

**User-perceptible risks:**

1. **Copy text drift (highest user-facing risk).** Binary card header reads "This file cannot be displayed." and subtext "It's a binary file." Neither tells the user what to *do* — the action affordance is carried entirely by the two buttons. The user's request emphasized the buttons being large/obvious, so this is survivable, but the spec's prescribed subtext ("Download it or open in a new tab.") was strictly better at directing intent. Recommend Dev align with the spec table, or update the spec table to match the new copy and have Designer sign off explicitly.
2. **DOM/visual order of filename vs. header.** Card shows icon → header → subtext → **filename** → size → buttons. Users reading top-to-bottom learn the verdict ("cannot be displayed") before they see *which* file. GitHub itself puts the filename first. Low severity but worth a Designer eyeball before v2.
3. **Mobile responsiveness.** Implementation has the ≤480 px breakpoint (column buttons, full-width, 44 px tall) — looks correct from CSS audit but **not yet verified on a real mobile device / Safari**. Test plan must include iOS Safari + Android Chrome before claiming AC9.
4. **Button label correctness vs. user verbatim.** User said "다운로드 후 새 탭에서 열기" (lit. "after download, open in new tab"). Implementation labels it "Open in new tab" — semantically equivalent (the helper falls back to download for non-inline MIMEs) and matches GitHub's "View raw" convention. Acceptable, but a power-user might expect a literal "download then open" effect for a `.zip`; the helper short-circuits to plain download in that case, which is the right behavior.
5. **Side-margin token mismatch.** `unsupportedWrapper` uses `padding: var(--space-4)` (16 px) instead of spec'd `var(--space-6) * 2` (48 px total). Visual delta is small but the card may feel tight on narrow desktop columns. Designer to decide whether to ship as-is or tighten to spec.
6. **Unrelated diffs in working tree.** `messageClassification.ts`, `messageStyles.css.ts`, and `messageClassification.test.ts` are modified but are **not part of this feature** (separate thinking-tool-block-grouping spec). Must not be co-committed with the file-viewer change — flag for the next commit boundary so the file-viewer PR stays scoped.

**Action items for sign-off:**

- [ ] Dev or Designer: reconcile the three copy-text deviations — either restore spec copy ("Download it or open in a new tab.") or update the spec's "Copy by path" table to reflect the shipped strings.
- [ ] QA: verify the card on iOS Safari + Android Chrome (real device or BrowserStack) before merging.
- [ ] Dev: ensure `messageClassification` / `messageStyles` changes are committed in a separate PR from this feature.
- [ ] Designer: optional polish — consider moving filename above the header for GitHub parity.

`pm_score: 95`

**3-line summary:** Implementation cleanly satisfies all three legs of the user request — text renders inline as before, non-renderable files surface a centered card with two prominent, accessible action buttons, and the Designer signed off on the visual spec. The only material gap is copy-text drift from the spec's "Copy by path" table (binary subtext no longer hints at the two actions), which is cosmetic and easily reconciled. Mobile-device verification + scope separation from the unrelated `messageClassification` diff are the remaining gates before merge.

### Dev notes

**Files modified / added:**

- `frontend/src/lib/fileDownload.ts` — **new**. Houses `downloadFileFromWorker`
  and `openFileInNewTab` (exported) plus the internal `fetchFileBlob`,
  `INLINE_EXT_MIME` table, `getExt`, and `DOWNLOAD_CHUNK_SIZE`. Lifted
  verbatim from `DirectoryTree.tsx` so the right-click menu and the new
  card share one implementation.
- `frontend/src/components/tree/DirectoryTree.tsx` — three call sites now
  import `downloadFileFromWorker` / `openFileInNewTab` from
  `~/lib/fileDownload`; local definitions removed.
- `frontend/src/components/fileviewer/UnsupportedFileView.tsx` — **new**.
  Centered card with icon (picked by `reason` + extension), filename,
  formatted size, primary Download / secondary Open in new tab buttons.
  ARIA: `role="region"` + `aria-labelledby` pointing at the filename node;
  per-button `aria-label="Download <file>"` / `Open <file> in new tab`.
- `frontend/src/components/fileviewer/FileViewer.css.ts` — appended
  `unsupportedWrapper`, `unsupportedCard` (`max-width: 400px`,
  `var(--card)`, `var(--border)`, `var(--radius-medium)`,
  `var(--shadow-small)`), `unsupportedIcon`, `unsupportedHeader`,
  `unsupportedSubtext`, `unsupportedFilename`, `unsupportedSize`,
  `unsupportedButtonRow` (column at ≤480 px), `unsupportedPrimaryButton`,
  `unsupportedSecondaryButton` (44 px min-height; full-width at ≤480 px).
- `frontend/src/components/fileviewer/FileViewer.tsx` — dropped imports of
  `HexView` and `TOOLBAR_CLEARANCE_PX`; added a `flavor?` prop (defaulted
  via `detectFlavor`), a `showCard()` memo (true for binary / oversize
  text / oversize image in working mode), and a `cardReason()` memo. All
  three legacy branches (`imageTooLarge`, truncated text-ish, binary →
  HexView) now route to `<UnsupportedFileView>`. The status bar is gated
  off when the card is showing (the card already renders the size inline),
  and the truncation warning chip is gone since the card supersedes it.
- `frontend/tests/unit/components/UnsupportedFileView.test.tsx` — **new**.
  Asserts filename / size / both buttons; verifies Download and Open
  forward `(workerId, filePath, flavor)`; checks each `reason` renders the
  correct header + subtext; checks ARIA labels and the 48 px icon.
- `frontend/tests/unit/components/FileViewer.test.tsx` — **new**. Behavioural
  test mocking `workerRpc.statFile` / `workerRpc.readFile` plus the three
  inline view components; covers the four dispatch branches (small text →
  `TextFileView`, binary bytes → card with "cannot be displayed", over-cap
  text → card with "too large to preview", over-cap image → card with
  "image is too large").

**Decisions / deviations from the spec:**

- Header copy followed the Designer's later directive rather than the
  earlier "Copy by path" table — specifically the binary card uses
  `This file cannot be displayed.` + subtext `It's a binary file.` per the
  Designer's card spec block in the work-order. Oversize-text and
  oversize-image keep the spec table's headers ("This file is too large to
  preview." / "This image is too large to preview.") so the user still
  sees a size-aware message; their subtext now mentions the 256 KB cap
  explicitly.
- `HexView` is unimported in `FileViewer.tsx` and the dispatch never
  routes to it, but `HexView.tsx` and `tests/unit/components/hexView.test.ts`
  remain on disk untouched — re-enabling is a one-import change later.
- `TOOLBAR_CLEARANCE_PX` is still exported by `FileViewer.css.ts` for
  potential future consumers; the only previous caller (HexView dispatch)
  is gone.
- Card buttons style themselves locally (`unsupportedPrimaryButton` /
  `unsupportedSecondaryButton`) rather than depending on a shared button
  primitive — the codebase has no project-wide `<Button data-variant>`
  component yet, and inventing one was out of scope. Tokens used are
  `--foreground`, `--background`, `--border`, `--muted`, `--radius-medium`,
  `--space-3/4/5/6`, `--text-7`, `--font-bold`, `--shadow-small`.
- `flavor` prop on `FileViewer` is optional; it defaults to
  `detectFlavor(filePath)` so no caller needs updating in v1.

**Gates run:**

- `bun run typecheck` — clean.
- `bun run lint` — clean.
- `bun run test -- FileViewer UnsupportedFileView` — 12/12 passing.
- `bun run test` — 232 files / 3241 tests passing.
- Final audit `rg` sweep: `Truncated at 256` / `Image too large to preview` /
  `HexView` / `imageSizeError` / `truncationWarning` all return zero hits
  in `src/components/fileviewer/FileViewer.tsx`.

`dev_confidence: 88`

## Open questions

- Q1: **Resolved** — Reuse `detectFileViewMode` + `isBinaryContent` probe; concrete extension lists in UI notes.
- Q2: **Resolved** — Two separate buttons (Download + Open in new tab).
- Q3: **Resolved** — GitHub-like card on `var(--card)` background; spec in UI notes.
- Q4: **Resolved** — Drop "View raw" hex escape hatch in v1.

---

`pm_confidence: 78`
`designer_confidence: 88`
`techlead_confidence: 82`

- Most uncertain task: **T3** — `FileViewer.tsx` dispatch rewire. The block at L312–L355 has six `<Show>` branches today plus a status-bar effect that all read `viewMode()` / `imageTooLarge()` / `isTruncated()`; collapsing the oversize-text / oversize-image / binary cases into a single `<UnsupportedFileView>` without regressing the diff-mode and ref-mode paths (which share the same `contentRef` scroll-restore effect) is the highest-risk surgery. The new `showCard()` memo must not trigger a save/restore scroll thrash.
- HexView fate: **Retire from FileViewer dispatch in v1, keep file + test on disk.** GitHub's UX precedent + spec Q4 ("Drop View raw") + zero existing user feedback for the hex view all point one way; leaving the file untouched preserves the option to bring it back behind a settings flag in v2 without re-implementing the renderer.

Biggest decisions: (1) Reused `detectFileViewMode`'s binary probe as the sole renderable/non-renderable gate — no new MIME-sniff logic needed, keeping the dispatch in one place. (2) Chose two explicit buttons over a combined action to honor the user's stated intent and match GitHub's proven pattern; the copy table and icon map give TechLead concrete targets with zero ambiguity.
