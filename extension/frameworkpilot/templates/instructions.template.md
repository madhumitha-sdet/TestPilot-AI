# Automation Framework Instructions

> **What this file is:** project-level guidance FrameworkPilot reads before proposing any code in this repository. It defines how automation should be written for *this* project — conventions, structure, and standards — on top of FrameworkPilot's own framework/bootstrap requirements for the configured stack.
>
> **What this file is not:** a complete specification of every file FrameworkPilot must generate. Silence on a topic here is not permission to omit it. If the configured stack requires a base class, fixtures, configuration handling, test data loading, logging, reporting, or screenshot-on-failure support, FrameworkPilot must still provide it — whether or not this document repeats that requirement — unless a section below explicitly says otherwise for this project.
>
> **How to use this template:** copy it into your automation project as `instructions.md`, then replace every `[BRACKETED PLACEHOLDER]` with real information about your project. Sections describing FrameworkPilot's standard engineering conventions can be left as-is, trimmed, or tightened — but do not delete them expecting the underlying requirement to disappear; delete a convention here only if your team has deliberately decided to override it, and say so explicitly.

---

## 1. Purpose and Scope

This document governs how automated tests are designed, generated, and maintained in **[PROJECT NAME]**, an automation project built with FrameworkPilot on the Python + Playwright + pytest stack.

It applies to every file FrameworkPilot creates or modifies in this repository: page objects, tests, fixtures, configuration, test data, and supporting utilities. It does not apply to the application under test itself.

## 2. Technology Stack

- **Language:** Python 3
- **Browser automation:** Playwright for Python
- **Test runner:** pytest, with `pytest-playwright`
- **Architecture:** Page Object Model
- **Test data:** JSON-based fixtures/files (see §9)
- **Reporting:** pytest-html (see §14)

This stack is fixed for this project. Do not introduce an alternate automation library, test runner, or architecture without an explicit decision recorded in this document.

## 3. Execution Model — Synchronous Only

All Playwright usage in this project is **synchronous** (`playwright.sync_api`), not the async API.

- Never write `async def` in a page object, test, or fixture.
- Never use `await`.
- Never mix `playwright.async_api` imports with the rest of the codebase.

This is a hard project convention, not a stylistic preference — a single async function silently breaks pytest's default synchronous execution and every fixture built on top of it.

## 4. Python / pytest Conventions

- Follow PEP 8 for naming, layout, and imports.
- One test file per feature/flow area, named `test_<feature>.py`.
- One test function per scenario; avoid bundling multiple unrelated assertions from different scenarios into a single test.
- Use pytest fixtures for setup/teardown (browser, page, authenticated session, seeded data) rather than duplicating setup code in every test.
- Prefer explicit, readable assertions over clever one-liners — this codebase is read far more often than it is written.
- Type hints are encouraged on page object methods and shared utilities.

## 5. Page Object Model Rules

- Every distinct page or logical UI area gets its own page object class.
- Page objects own locators and UI interactions only. They never contain test assertions or test-flow logic (branching based on expected test outcomes, etc.).
- Test files call page object methods; they do not call `page.locator(...)` or similar directly except in narrow, justified cases (documented inline when they occur).
- Shared interaction patterns (e.g. a common navigation bar, a shared modal) belong in their own page object or in the base page class (§17), not duplicated across page objects.
- Page object methods should read like the user action they represent (`login(username, password)`, `add_item_to_cart(item_name)`) rather than exposing low-level Playwright calls to callers.

## 6. Locator Strategy

Prefer locators in this order, matching FrameworkPilot's own locator scoring:

1. `data-testid` / dedicated test attributes, where present.
2. Accessible role + accessible name (`get_by_role`).
3. Associated label text (`get_by_label`).
4. Visible text (`get_by_text`), when unique and stable.
5. CSS selector on a stable, non-generated `id`.
6. XPath / structural selectors — last resort only, and only when nothing above is viable.

Never hand-author a locator that wasn't verified against the real application (via FrameworkPilot's capture flow or direct inspection). Do not guess selector names, ids, or class names that "look plausible" — an unverified locator is worse than an honest gap, because it fails silently until run.

## 7. Test Design Conventions

- Each test should be independently runnable — no test should depend on execution order or leftover state from another test.
- Prefer explicit waits/assertions (Playwright's built-in auto-waiting, `expect(...)`) over fixed `time.sleep()` calls.
- Keep test bodies focused on: arrange (via fixtures/page objects) → act (via page object methods) → assert (via `expect`). Avoid embedding complex logic directly in test bodies.
- Negative/edge-case tests are welcome but should be clearly named and separated from the primary happy-path scenario.

## 8. Assertions

- Use Playwright's `expect()` API (web-first assertions with built-in retry/auto-waiting) rather than plain `assert` on manually-read values, wherever the check involves the live page.
- Plain `assert` is acceptable for pure Python values (computed test data, response payloads already retrieved, etc.).
- Each test should assert the behavior described in its test case's expected result(s) — not incidental implementation details.

## 9. Test Data Management

- Test data lives under `testdata/`, one JSON file per test case or logical group, matching FrameworkPilot's configured JSON test data approach.
- Do not hardcode test data values inside test files or page objects — load them from `testdata/`.
- **[TEST DATA LOCATION]** — describe here if this project sources any test data from somewhere other than the default `testdata/` directory (e.g. a shared fixtures service, a database seed script).

## 10. Configuration & Environment Handling

- Base URL and environment-specific values are read from configuration, never hardcoded in a page object or test.
- **[APPLICATION URL]** — the base URL(s) for this project's environment(s).
- **[ENVIRONMENT DETAILS]** — describe the environments this project targets (e.g. local, staging, production), how to select one, and any environment-specific behavior automation needs to account for.

## 11. Credentials & Secrets Handling

- Never commit real credentials, API keys, or tokens into this repository — including inside test data files, config files, or comments.
- **[AUTHENTICATION APPROACH]** — describe how this project authenticates for test purposes (e.g. a dedicated test account, an auth token fixture, environment variables, a secrets manager). Reference where the actual secret values are stored (e.g. `.env`, a secrets vault) without embedding the values themselves here.
- `.env` (and equivalents) must be excluded from version control; `.env.example` should document required variable names without real values.

## 12. Logging

- Use Python's standard `logging` module, configured once (e.g. in a shared utility or `conftest.py`) rather than ad hoc `print()` statements.
- Log meaningful automation-level events (test start/end, key page object actions, failures) at appropriate levels — avoid noisy per-locator logging that drowns out real signal.

## 13. HTML Reporting

- Test runs produce a pytest-html report so results and evidence are reviewable without re-running tests.
- Reports should be written to a consistent, gitignored output location (e.g. `reports/`).

## 14. Screenshot / Evidence Expectations

- On test failure, capture a screenshot (and, where practical, a trace) and attach or link it from the HTML report, so a failure can be understood without re-running the suite.
- Screenshots are written to a consistent, gitignored output location (e.g. `screenshots/`), named to be traceable back to the failing test.

## 15. Project Structure

```
[PROJECT NAME]/
├── pages/            # Page Object classes
├── tests/            # test_*.py files
├── testdata/          # JSON test data
├── config/            # environment/configuration handling
├── utils/             # shared helpers (logging, etc.)
├── conftest.py         # pytest fixtures (browser/page lifecycle, etc.)
├── requirements.txt
├── pytest.ini (or pyproject.toml)
├── instructions.md      # this file
└── skill.md            # AI working-behavior guidance
```

Adjust directory names only if this project has an established structure that predates FrameworkPilot — see §18.

## 16. Naming Conventions

- Test files: `test_<feature_or_flow>.py`
- Test functions: `test_<scenario_in_snake_case>`
- Page object classes: `<PageName>Page` (e.g. `LoginPage`, `CheckoutPage`)
- Page object files: `<page_name>_page.py`
- Fixtures: descriptive snake_case names reflecting what they provide, not how (`authenticated_page`, not `fixture_1`)

## 17. Maintainability & Reusability

- Prefer extending an existing page object or base class over duplicating similar logic in a new one.
- Shared, cross-page behavior belongs in a base page class that concrete page objects inherit from.
- Favor small, composable page object methods over large multi-step methods that are hard to reuse partially.
- Every test case built after the initial bootstrap should be able to reuse the foundation established here without modification.

## 18. Existing-Project Modification Rules

When this project already contains automation code:

- Inspect existing page objects, fixtures, and conventions before writing anything new.
- Reuse or extend what already exists rather than creating a parallel/duplicate structure.
- Match this project's established naming and structural conventions, even where they differ from §15/§16 above — an existing, working convention takes precedence over the template default.
- **[PROJECT-SPECIFIC CONVENTIONS]** — document here any established pattern in this project that differs from FrameworkPilot's defaults, so it's followed consistently rather than rediscovered file-by-file.

## 19. Empty-Project Expectations

When this project is empty (no prior automation code), FrameworkPilot is expected to establish a **complete, production-quality foundation** in one pass — not a single test file in isolation. That foundation includes, at minimum, the structure in §15, a base page class, pytest fixtures for browser/page lifecycle, configuration handling, a test data loading mechanism, logging, HTML reporting, screenshot-on-failure capture, and the first test case implemented on top of all of it. This requirement is independent of anything else stated in this document.

## 20. Dependencies & Setup Expectations

- `requirements.txt` must list every package actually imported by the generated code, at minimum `pytest`, `pytest-playwright`, and `playwright`.
- Setup steps beyond `pip install -r requirements.txt` (see §21) must be documented, not assumed.

## 21. Browser Installation

Playwright requires a separate browser install step after `pip install`:

```
playwright install
```

This must be documented (e.g. in `SETUP.md`) for anyone setting up this project fresh — `pip install` alone does not provide the browser binaries.

## 22. Project-Specific Customization

The placeholders below are this project's responsibility to fill in — FrameworkPilot's generic engineering standards above do not change project to project, but these do:

| Placeholder | What to provide |
|---|---|
| `[PROJECT NAME]` | The name of this automation project / application under test. |
| `[APPLICATION URL]` | Base URL(s) for the application, per environment. |
| `[ENVIRONMENT DETAILS]` | Environments targeted (local/staging/prod/etc.) and how to select one. |
| `[AUTHENTICATION APPROACH]` | How tests authenticate, and where real secret values actually live. |
| `[TEST DATA LOCATION]` | Where test data comes from, if not the default `testdata/` directory. |
| `[PROJECT-SPECIFIC CONVENTIONS]` | Any established pattern in an existing project that overrides a template default. |

---

*This document supplements FrameworkPilot's framework/bootstrap requirements for the configured stack. It does not replace them, and it is not exhaustive by design — a topic not mentioned here still falls back to FrameworkPilot's standard behavior for this stack.*
