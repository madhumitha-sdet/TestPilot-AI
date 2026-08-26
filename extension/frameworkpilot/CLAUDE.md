# CLAUDE.md — FrameworkPilot Project Context

> This file is a durable bridge between the Claude.ai conversation where
> FrameworkPilot was designed/built and Claude Code, which will now work
> directly in this repository. It documents the current state, accumulated
> decisions, and constraints as accurately as possible from that
> conversation. Where something could not be verified directly against the
> repository (no direct file access was available when this was written),
> it is explicitly marked **UNVERIFIED** rather than assumed.

---

## 1. Project Overview

**What FrameworkPilot is:** A VS Code extension (TypeScript) that acts as an
AI-assisted SDET automation platform. It is a **portfolio/resume project**
being built to demonstrate realistic, professional SDET tooling.

**Purpose / problem it solves:** Bridges the gap between (a) a test case
(from Azure DevOps, Excel, or a local Markdown file), (b) the real UI
locators needed to automate it, and (c) an actual Python + Playwright +
pytest automation framework — by capturing real locators from a live
browser, mapping them to test-case steps, and using an LLM (via VS Code's
native Language Model API) to generate/modify the real automation project
on disk, with native diff-based human review before anything is written.

**Current stage:** Actively under development. Core pipeline (capture →
mapping → test data → generation → review/apply) is implemented and has
been exercised end-to-end against a real OrangeHRM demo test case. The most
recent work was diagnosing and fixing gaps in what an **empty-project
bootstrap** actually produces (see Section 11, Known Issues).

**Separate, related project:** There is also a Python backend under
`backend/` (`backend/ado/client.py`, `backend/input/excel_reader.py`,
`backend/models/test_case.py`) built earlier in the same overall effort.
**This backend is NOT currently wired into the VS Code extension** — they
are separate processes with no bridge between them. The extension's own
Excel import (`src/excelTestCaseReader.ts`) and ADO config
(`src/adoConfig.ts`, connection-only, no data fetching) are independent,
TypeScript-only implementations. This gap is intentional and documented,
not an oversight — see Section 11.

---

## 2. Current Architecture

**Repository layout (UNVERIFIED against actual repo — reconstructed from
conversation history; file names should be confirmed on first inspection):**

```
frameworkpilot/                    (VS Code extension, TypeScript)
├── src/
│   ├── extension.ts                # activation, command registration,
│   │                                #   dashboard panel + webview message
│   │                                #   routing (the central hub)
│   ├── dashboardView.ts            # single large HTML/CSS/JS string
│   │                                #   returned as the webview's content
│   ├── adoConfig.ts                # ADO connection settings (org/project/
│   │                                #   PAT via Secret Storage) — save/load
│   │                                #   only, no API calls
│   ├── frameworkConfig.ts          # stack config (language/tool/runner/
│   │                                #   architecture/testDataApproach),
│   │                                #   project path, optional file paths
│   ├── frameworkOptions.ts         # centralized dropdown option lists for
│   │                                #   Framework Configuration UI
│   ├── testCaseModel.ts            # NormalizedTestCase interface (source-
│   │                                #   agnostic: 'ado'|'excel'|'local')
│   ├── testCaseMarkdown.ts         # deterministic MD generation/parsing,
│   │                                #   .frameworkpilot/testcases/ storage
│   ├── localTestCaseImport.ts      # reads a user-picked external .md file
│   ├── excelTestCaseReader.ts      # parses a configured .xlsx workbook
│   │                                #   (one sheet per test case) into
│   │                                #   NormalizedTestCase[]
│   ├── testCaseMapping.ts          # per-step locator mapping model +
│   │                                #   workspaceState persistence
│   ├── testDataModel.ts            # TestDataField/TestCaseData model +
│   │                                #   workspaceState persistence
│   ├── testDataExtraction.ts       # deterministic (non-LLM) keyword-based
│   │                                #   field-name extraction from steps
│   ├── locatorEngine.ts            # deterministic locator candidate
│   │                                #   generation + scoring (pure, no
│   │                                #   VS Code/Playwright imports)
│   ├── playwrightCapture.ts        # owns the Playwright browser session:
│   │                                #   launch, in-page hover/click capture
│   │                                #   script, area-selection, uniqueness
│   │                                #   checker
│   ├── captureController.ts        # orchestrates playwrightCapture +
│   │                                #   locatorEngine, posts results to
│   │                                #   the webview
│   ├── projectInspector.ts         # isProjectEmpty(), listProjectFiles()
│   │                                #   — real Project Path inspection
│   ├── secretsFilter.ts            # directory/filename/content-based
│   │                                #   exclusion (secrets, binaries, OS
│   │                                #   noise) for context-building
│   ├── frameworkFileConventions.ts # stack-keyed generic tooling facts:
│   │                                #   role patterns, bootstrap
│   │                                #   categories, required dependencies,
│   │                                #   post-install steps
│   ├── projectRelevance.ts         # keyword-overlap file relevance
│   │                                #   scoring for context building
│   ├── boundedContextBuilder.ts    # assembles a size-bounded, secret-safe
│   │                                #   view of the real project for the
│   │                                #   LLM
│   ├── generationContext.ts        # GenerationContext shape sent to the
│   │                                #   LLM; trims locator mapping to
│   │                                #   selected locators only
│   ├── llmAgent.ts                 # vscode.lm-based model selection +
│   │                                #   system prompt construction +
│   │                                #   request/response handling
│   ├── changeReview.ts             # native vscode.diff + non-modal
│   │                                #   Apply/Skip/Cancel review, writes
│   │                                #   only to the real Project Path
│   ├── projectDocs.ts              # instructions.md / skill.md read/
│   │                                #   create/open (project-root files,
│   │                                #   NOT .frameworkpilot/ metadata)
│   └── frameworkOptions.ts         # (see above)
├── package.json                    # commands, configuration schema,
│                                    #   dependencies (playwright, xlsx)
└── backend/                        # separate Python project, NOT wired
    ├── ado/client.py                #   into the extension (see Section 1)
    ├── input/excel_reader.py
    └── models/test_case.py
```

**Major components and how they interact:**

```
Dashboard Webview (dashboardView.ts)
      ↕ postMessage / onDidReceiveMessage
extension.ts  (central message router; owns per-panel state like
               CaptureController instances)
      ↓ delegates to feature modules:
      ├── Framework Configuration → frameworkConfig.ts, frameworkOptions.ts
      ├── ADO connection (settings only) → adoConfig.ts
      ├── Test Cases (import/select) → testCaseMarkdown.ts,
      │     localTestCaseImport.ts, excelTestCaseReader.ts, testCaseModel.ts
      ├── Capture UI Elements → captureController.ts → playwrightCapture.ts
      │     (real browser) + locatorEngine.ts (pure scoring)
      ├── Step mapping → testCaseMapping.ts
      ├── Test data → testDataModel.ts, testDataExtraction.ts
      └── Generate Automation → projectInspector.ts, secretsFilter.ts,
            frameworkFileConventions.ts, projectRelevance.ts,
            boundedContextBuilder.ts, generationContext.ts, llmAgent.ts,
            changeReview.ts
```

**Extension architecture pattern:** One dashboard command
(`frameworkpilot.openDashboard`) opens a single Webview panel with
client-side sidebar navigation (Dashboard / Framework Configuration / Test
Cases / Capture UI Elements / Settings). All pages' HTML/CSS/JS live in one
large template string in `dashboardView.ts`. A second, older command
(`frameworkpilot.configureAdo`) opens a separate, simpler Webview for ADO
connection settings and still works independently. Communication is
`vscode.postMessage`/`onDidReceiveMessage` in both directions, using an
`if/else if` command-string dispatch pattern in `extension.ts`.

**Existing tools/utilities:** No external test framework tooling in the
extension itself (this is the tool being built, not a consumer of one).
Uses VS Code's native `vscode.lm` API for LLM access (no separate API key,
no hardcoded model vendor).

**Configuration and test-data approach (for the extension itself, not the
generated frameworks):** `frameworkpilot.ado.*` and
`frameworkpilot.framework.*` settings via `vscode.workspace.getConfiguration`
(non-secret values) + `context.secrets` (PAT only). Test-case mapping and
test-data review state persist via `context.workspaceState`, keyed by each
test case's `filePath` (a real path for local/generated Markdown, or a
synthetic `excel::<sheetName>` identifier for Excel-sourced test cases).

---

## 3. Current Implementation Status

**Already implemented:**
- Dashboard UI shell, sidebar navigation, Framework Configuration page
  (stack dropdowns, project path, optional file pickers, native file/folder
  pickers).
- ADO connection settings (save/load + PAT in Secret Storage) — **no ADO
  API calls implemented**, connection-config only.
- Local Markdown test-case import, with automatic copy into
  `.frameworkpilot/testcases/` (original external file is never modified).
- Excel workbook import (multi-sheet, one test case per sheet), merged into
  the same Test Cases list, source-tagged.
- Test Cases page: list, select, view steps/description/test data,
  persisted selection.
- Capture UI Elements: Manual Capture and Select Area modes, one
  continuous Playwright session per test case (does not require
  stop/restart between elements), deterministic locator candidate
  generation + scoring + recommended-locator logic, per-row "Map to Step"
  dropdown (editable, keyword-suggested, never auto-committed), full
  recompute-on-change mapping logic.
- Test Data panel: deterministic field extraction from step text, editable
  values, JSON preview, persistence.
- Generate Automation: two-round (filesNeeded) LLM generation flow, bounded
  real-project context building with secret/size filtering, empty-vs-
  existing-project prompt branching, deterministic `requirements.txt`/
  `SETUP.md` guarantee for empty-project bootstraps, native diff review
  with non-modal Apply/Skip/Cancel (Cancel aborts all remaining files, not
  just the current one).
- Project-level `instructions.md`/`skill.md`: openable/editable via the
  extension, read into generation context, explicitly treated by the
  system prompt as authoritative-but-additive (not a replacement for
  bootstrap requirements).

**Partially implemented:**
- Empty-project bootstrap completeness: the deterministic guarantee only
  covers `requirements.txt` and `SETUP.md`. Everything else expected in a
  "complete framework foundation" (conftest.py, config, base page, page
  objects, test data file, utilities, logging, reporting, screenshots) is
  entirely LLM-discretionary, governed only by prompt instructions — **not
  deterministically guaranteed or validated**. Real-world testing has shown
  this is unreliable (see Section 11).
- `isProjectEmpty()` correctly excludes `.frameworkpilot/`,
  `instructions.md`, `skill.md`, and common ignored directories, but has
  **no OS-noise-file exclusion** (e.g. `.DS_Store` on macOS) — suspected
  but not yet confirmed root cause of one empty-project misdetection
  incident (see Section 11).

**Planned / discussed but not implemented:**
- ADO API calls (`get_test_cases()` equivalent in TypeScript, or a bridge
  to the existing Python `backend/ado/client.py`) — explicitly deferred,
  documented as a design-note comment in `testCaseModel.ts`, not stubbed.
- Multi-turn/tool-calling LLM agent (beyond the current 2-round
  `filesNeeded` mechanism) — deliberately deferred; the 2-round mechanism
  was built specifically so it can generalize into an N-round loop later
  without an architecture change.
- Automated post-generation validation (import resolution, no-async
  check, BASE_URL-usage check, etc. against the actual proposed files) —
  discussed extensively as a requirement, **not implemented**. Currently
  enforced only via prompt instructions in instructions.md/skill.md, which
  has proven insufficient in at least one real test (see Section 11).
- Chat Participant (`@frameworkpilot`) entry point — deliberately not
  built; Generate Automation is triggered by a dashboard button, not a
  chat mention.

**Not yet implemented:**
- Any code-generation-time enforcement (deterministic linting/validation)
  of instructions.md rules — currently 100% LLM-compliance-dependent.
- Locator reconciliation UI improvements beyond the current Map-to-Step
  dropdown (e.g. bulk operations).

---

## 4. Extension Tool Context

**Purpose:** Let an SDET go from "here's a test case" to "here's a locator-
mapped, data-backed, generated automation implementation in my real
project" without leaving VS Code, with human review at the write step.

**Expected workflow:**
```
Framework Configuration (stack, project path)
      ↓
Import test case (ADO config exists but unused / Excel / local Markdown)
      ↓
Select ONE test case
      ↓
Start Capture (once) → perform the whole test flow in a real browser →
capture all relevant elements → assign each to a step (editable, never
auto-locked) → select/confirm locator per step
      ↓
Review/edit extracted Test Data
      ↓
Generate Automation → LLM inspects real project (bounded, secret-filtered)
→ proposes changes → native diff review → explicit Apply/Skip/Cancel per
file → real Project Path is modified only on Apply
```

**Inputs:** selected `NormalizedTestCase`, its `TestCaseMapping` (selected
locators only), its `TestCaseData`, `FrameworkConfig`, `instructions.md`/
`skill.md` content, a bounded view of the real target project's files.

**Outputs:** proposed file changes (`create`/`modify`/`reuse_only`)
reviewed and applied directly to the user's real, separate automation
project at the configured Project Path — never to the extension's own
source, never to `.frameworkpilot/` metadata.

**Integration points:** VS Code's `vscode.lm` API (model-agnostic — works
with whatever chat model provider is available, e.g. Copilot), Playwright
(via `playwright` npm package, launched by the extension itself for
capture), `xlsx` (SheetJS) for Excel import, VS Code's native diff/
Secret Storage/workspaceState/configuration APIs.

**Key constraints/design decisions already agreed upon:** see Section 5.

---

## 5. Important Design Decisions (and why)

1. **FrameworkPilot is not the automation framework.** The configured
   Project Path is the real, separate target project. `.frameworkpilot/`
   is FrameworkPilot's own working metadata (test case copies, mapping,
   test data state) and must never be confused with, or leak into, the
   generated framework. *Why:* stated as the core product boundary
   multiple times; violating it was explicitly flagged as an architecture
   error in earlier drafts.

2. **Project-specific conventions live in `instructions.md`/`skill.md`
   (in the target project), never hardcoded in TypeScript source.**
   Sync-vs-async, naming conventions, Page Object rules, fixture design,
   reporting choice, etc. all belong there. *Why:* explicitly corrected
   after an early mistake where the sync-Playwright rule was hardcoded
   into `frameworkFileConventions.ts`/`llmAgent.ts` — reverted, and the
   principle was reinforced repeatedly afterward.

3. **Only genuinely stack-mechanical facts may be deterministic in
   TypeScript.** E.g. "this stack requires pytest, pytest-playwright,
   playwright" and "playwright install is required after pip install" are
   facts about the tooling, not conventions — these are the only two
   items given a deterministic guarantee (`ensureRequiredDependencies`,
   `ensureSetupInstructions` in `extension.ts`, sourced from
   `frameworkFileConventions.ts`). *Why:* explicitly distinguished from
   category-2 decisions across several turns (labeled "Category A vs B vs
   C" in the design conversation).

4. **`instructions.md` is additive, not exhaustive.** A short
   instructions.md must not cause the LLM to under-deliver on the
   framework bootstrap. *Why:* directly caused a real regression — adding
   a short sync-Playwright-only instructions.md caused the LLM to generate
   only a page object + test, apparently treating the file as a complete
   spec. Fixed via explicit prompt wording stating instructions.md
   supplements but never replaces bootstrap requirements.

5. **`isProjectEmpty()` must exclude FrameworkPilot's own config files.**
   `instructions.md`/`skill.md` presence must not make an otherwise-empty
   project register as "already has a framework." *Why:* caused a second
   real regression (empty-project detection returning false-positive
   "non-empty" due to these two files' mere presence) — fixed in
   `projectInspector.ts`.

6. **Native VS Code diff + non-modal Apply/Skip/Cancel is the accepted
   review mechanism, not Copilot's internal per-hunk Keep/Undo UI.**
   *Why:* Copilot's inline edit-review UI requires the proposed (non-
   stable) `chatParticipantAdditions` API, not shippable in a normally
   published extension — this was researched and documented as a real
   API limitation, not a workaround avoided for convenience. The review
   prompt was later fixed from modal (which blocked reading the diff and
   made Cancel behave like Skip) to non-modal with explicit Cancel-aborts-
   remaining semantics.

7. **Locators must never be invented.** If application information isn't
   available from capture/mapping data, the generator must leave a
   TODO/placeholder rather than fabricate a plausible-looking selector or
   URL (e.g. `example.com`, guessed CSS). *Why:* explicitly named as a
   recurring generation failure (invented `example.com` URLs, invented
   dashboard text/selectors) and written into instructions.md as a rule.

8. **One-shot bounded-context generation now; explicit two-round seam for
   future multi-turn agent work.** Not a full tool-calling loop yet, by
   design — deferred deliberately, not from oversight.

9. **Capture is observational, not blocking.** Manual Capture must not
   prevent real navigation/interaction in the target application (an
   earlier version wrongly called `preventDefault()`/`stopPropagation()`
   unconditionally on every click — corrected).

10. **Step assignment for captured elements is a suggestion, never an
    automatic/locked assignment.** Capture-order does not equal step
    order; a deterministic keyword-overlap heuristic suggests a step but
    the user must confirm/correct via an editable per-row dropdown.

---

## 6. Coding Rules (extension's own TypeScript)

- Small, targeted `FIND → REPLACE`-style changes preferred throughout
  development (the human building this reviews/pastes changes manually
  via chat, not via an automated agent loop — this may change now that
  Claude Code is being introduced).
- New functionality typically added as a new, focused module (e.g.
  `secretsFilter.ts`, `projectRelevance.ts`) rather than growing an
  existing file indefinitely — but `dashboardView.ts` is a known exception
  (all webview HTML/CSS/JS lives in one large template string; this has
  been treated as acceptable so far, not yet reconsidered).
- Deterministic logic (scoring, extraction, filtering) is kept in pure
  modules with no VS Code/Playwright imports where possible (see
  `locatorEngine.ts`) — enables future unit testing and keeps LLM-
  dependent code clearly separated from deterministic code.
- No hardcoded API keys/vendors — always go through `vscode.lm`.

---

## 7. Testing Strategy

**For the extension itself:** No formal automated test suite is confirmed
to exist beyond whatever VS Code extension scaffold defaults were present
(`.vscode-test.mjs` was referenced in early file listings — **UNVERIFIED**
whether it contains real tests). Validation has been done manually:
`npm run compile` for type-checking, then F5 (Extension Development Host)
for functional testing, described step-by-step after nearly every change
in this conversation.

**For generated automation frameworks (the target projects):** pytest +
pytest-playwright (synchronous API), run via
`python -m pytest tests/test_*.py -v`. Reporting: `pytest-html`
(`--html=reports/report.html --self-contained-html` via `pytest.ini`) —
chosen over an actual Extent Reports Python package for simpler, more
standard pytest integration; the human's original ask was "Extent-style,"
this was explicitly discussed and approved as the practical substitute.
Failure screenshots captured via a `pytest_runtest_makereport` hook,
registered through `pytest_plugins` in `conftest.py` (a hook file alone,
not registered, silently never runs — this was a real bug found and fixed).

---

## 8. Configuration and Test Data

**Extension-side:** see Section 2's "Configuration and test-data approach."

**Generated-framework-side (current, real, working pattern as of last
verified test run):**
- `config/config.py` — `BASE_URL` constant, plus a `TEST_DATA_PATH`
  helper.
- `tests/testdata/test_data.json` — keyed by test case ID (e.g. `TC_001`),
  loaded via a small `utils/test_data_loader.py` helper — **not** inline
  `@pytest.mark.parametrize` literals.

**Known future improvement (explicitly recorded, NOT yet generalized):**
Generated tests/fixtures must never hardcode credentials — this rule is
already in `instructions.md` and was verified working in the one test case
exercised so far (TC001, OrangeHRM). It has not yet been proven to hold
reliably across a fresh empty-project bootstrap without manual
intervention (see Section 11).

---

## 9. Playwright / Generated Test Requirements

- Synchronous pytest-playwright API only — `def test_...(page):`, no
  `async def`, no `await`, no pytest-asyncio/anyio/asyncio_mode anywhere.
- Reliable, specific post-login (and generally post-action) assertions —
  prefer `page.wait_for_url(...)` + URL-state assertions over arbitrary
  visible-text checks. Verified working for the dashboard-URL assertion in
  the one real test case exercised; a supporting nav-menu-visibility
  assertion failed in the last real run because its selector
  (`NAV_MENU_SELECTOR = 'i'`) was a placeholder guess, not a captured
  locator — **this is flagged as needing a real Capture UI Elements
  session to resolve, not a code fix.**
- Page Object Model: tests contain intent + assertions; Page Objects
  contain locators + actions; `BasePage` holds generic reusable operations.
- No invented application details (URLs, selectors, UI text) — use
  captured/mapping data, or leave an explicit TODO.

---

## 10. Reporting

**Current decision: `pytest-html`**, not a literal Extent Reports package.
Configured via `pytest.ini`'s `addopts` so `python -m pytest ...` alone
produces `reports/report.html` with no extra flags required. Failure
screenshots saved to `reports/screenshots/<test_name>.png` and (where the
`pytest_html` extras API is available) embedded into the report. This was
an explicit substitution the human approved after a direct question about
Extent vs. pytest-html trade-offs — not a unilateral change.

---

## 11. Known Issues / Technical Debt

1. **Empty-project bootstrap reliability is the single biggest open gap.**
   Real end-to-end testing against a fresh empty project (only
   `instructions.md`/`skill.md` present) produced only a page object + one
   test file — missing `config/`, `fixtures/conftest.py`,
   `tests/testdata/`, `utils/`, working reporting, and screenshot capture,
   despite instructions.md explicitly requiring a complete foundation. Two
   suspected/partially-confirmed causes:
   - `isProjectEmpty()` may have evaluated `false` due to an OS metadata
     file (e.g. `.DS_Store`) not being in the exclusion list — **not yet
     confirmed via `ls -la` output**, was the open question at the point
     this file was written.
   - Even when `projectIsEmpty` correctly triggers the bootstrap prompt
     path, the "complete foundation" requirement is entirely
     LLM-discretionary/prompt-based with **no deterministic guarantee or
     post-generation validation** beyond the two files
     (`requirements.txt`, `SETUP.md`) — everything else can be silently
     under-delivered.

2. **A generated `pytest_runtest_makereport` hook does nothing if placed
   only in `utils/reporting.py` without being registered.** Must be
   registered via `pytest_plugins = ['utils.reporting']` in `conftest.py`
   (or written directly in `conftest.py`). This was generated incorrectly
   once already (stub hook, never wired) — worth checking that
   instructions.md/skill.md's language on this is strong enough to prevent
   recurrence; it was reinforced but not re-verified against a fresh
   generation at the time this file was written.

3. **Manually-applied fixes have not been fed back through the actual
   Generate Automation pipeline.** The most recent working fix (real
   config/fixtures/reporting/test-data-loader wiring for TC001) was
   applied by hand-pasting complete file contents in chat, because Claude
   (via claude.ai) has no filesystem access to the real
   `TestAutomationFramework` project. **This means the extension itself
   has not yet been proven to produce this corrected output on a fresh
   empty-project run** — that verification is still pending.

4. **ADO integration is config-only.** `adoConfig.ts` stores connection
   settings; no code anywhere calls the Azure DevOps REST API from
   TypeScript. The working Python equivalent
   (`backend/ado/client.py:get_test_cases()`) is not bridged in.

5. **`NAV_MENU_SELECTOR = 'i'`** in the one real generated `LoginPage` is a
   known-bad placeholder selector, left deliberately un-guessed rather
   than fabricated further — needs a real Capture UI Elements session
   against the live app to resolve.

6. **No automated test suite confirmed for the extension itself** — all
   validation has been manual (compile + F5 + manual click-through).

---

## 12. Future Work

- Confirm/fix the `isProjectEmpty()` OS-noise-file gap (`.DS_Store` etc.).
- Add deterministic post-generation validation for empty-project bootstrap
  completeness (does `conftest.py` exist and register reporting? does a
  test-data loader exist and get imported? is BASE_URL actually
  referenced?) rather than relying on prompt compliance alone.
- Re-run a full empty-project Generate Automation end-to-end after the
  above fixes, without manual chat-based patching, to confirm the pipeline
  itself (not a human editing files by hand) produces a correct result.
- Capture a real nav-menu locator for the OrangeHRM `LoginPage` via
  Capture UI Elements and replace the placeholder selector.
- Decide whether/how to bridge the Python `backend/ado/client.py` into the
  TypeScript extension, or reimplement ADO test-case fetching natively.
- Consider extending the multi-round `filesNeeded` mechanism toward a real
  tool-calling loop (explicitly deferred, not started).
- Consider whether `dashboardView.ts`'s single-large-template-string
  pattern needs to be split up as the UI grows further.

---

## 13. Critical "Do Not" Rules for Claude Code

- Do not make architectural changes without approval — this project has an
  established pattern (deterministic vs. LLM-discretionary logic
  separation, instructions.md/skill.md as the home for project-specific
  rules, native diff review) that has been deliberately built up over many
  iterations. Propose changes; do not silently redesign.
- Do not rewrite working code unnecessarily. Several past mistakes in this
  project came from over-broad changes; the working pattern has been
  small, targeted, explained changes.
- Do not delete existing functionality (Manual Capture, Select Area,
  locator scoring/recommendation, ADO config, ADO's separate Webview
  command, ADO PAT Secret Storage, ExcelTestCaseReader, etc.) without an
  explicit request.
- Do not introduce new dependencies without explaining why, and check
  `package.json` first — the project has explicitly avoided adding
  dependencies "just in case" (e.g. `xlsx` was only added once local
  Markdown parsing genuinely couldn't cover it; `pytest-html` was chosen
  deliberately over Extent Reports after a direct trade-off discussion).
- Do not change established project conventions (see Section 5) without
  approval — especially the instructions.md/skill.md vs. TypeScript-source
  boundary; this was violated once already and had to be reverted.
- Before making significant changes, explain what will be changed and why,
  and identify the smallest set of files that need to change — this has
  been the working pattern throughout.
- Preserve existing behavior unless the requested change explicitly
  requires otherwise. When in doubt about scope, ask rather than assume a
  larger scope is wanted.
- When uncertain about an existing design decision or file's current
  actual content, **inspect the repository directly first** rather than
  reconstructing from this document — this document was written without
  direct filesystem access and may be incomplete or slightly stale in
  places explicitly marked UNVERIFIED above.
- Do not hardcode project-specific automation conventions (sync/async,
  naming, POM rules, reporting choice, etc.) into extension TypeScript
  source — these belong in the *target* project's `instructions.md`/
  `skill.md`, never in FrameworkPilot's own `src/`.
- Do not write generated automation output into `.frameworkpilot/` — that
  directory is FrameworkPilot's own metadata only.

---

## 14. Working Method for Claude Code

1. Inspect the repository first — do not assume this document is a
   complete or perfectly current substitute for reading the actual code.
2. Read this CLAUDE.md fully before making changes.
3. Cross-check anything marked UNVERIFIED or "as of last verified test
   run" against the actual current files before relying on it.
4. Explain your understanding of the relevant area before making
   significant changes.
5. Identify the exact files affected before modifying them.
6. Make the smallest appropriate change that satisfies the request.
7. Run `npm run compile` (extension) and/or the relevant pytest command
   (generated framework work) as applicable, and report the actual result
   — do not claim success without having run something that can verify it.
8. Report exactly what changed, what was validated, and flag anything
   that remains unverified or was assumed.
