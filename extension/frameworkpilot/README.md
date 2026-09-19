# FrameworkPilot

### AI-Assisted SDET Automation Platform for Visual Studio Code

FrameworkPilot is a TypeScript-based Visual Studio Code extension designed to streamline the SDET workflow from **test case → UI locator capture → test-data preparation → AI-assisted automation framework generation → human review → implementation**.

It combines deterministic automation engineering with LLM assistance while keeping generated code under explicit human review.

---

## Why FrameworkPilot?

Modern SDETs often work across multiple tools:

* Test management systems
* Excel / test-case documents
* VS Code
* Browser developer tools
* Automation frameworks
* Page Objects
* Test data
* AI coding assistants
* Test reports

FrameworkPilot brings key parts of that workflow into a single VS Code experience.

The goal is not to blindly generate test code with an LLM.

Instead, FrameworkPilot follows a controlled workflow:

```text
Test Case
   ↓
Test Case Analysis
   ↓
Live UI Element Capture
   ↓
Deterministic Locator Generation & Scoring
   ↓
Step-to-Locator Mapping
   ↓
Test Data Preparation
   ↓
LLM-Assisted Framework Generation
   ↓
Deterministic Output Validation
   ↓
Native VS Code Diff Review
   ↓
Apply / Skip / Cancel
   ↓
Real Automation Project
```

---

# Key Features

## 1. Framework Configuration

Configure the target automation project directly from the FrameworkPilot UI.

The configuration supports concepts such as:

* Programming language
* Automation tool
* Test runner
* Framework architecture
* Test-data approach
* Target project path

FrameworkPilot operates on a **separate target automation project** rather than modifying its own source code.

---

## 2. Test Case Import

FrameworkPilot provides a normalized test-case model so different sources can participate in the same workflow.

Supported sources include:

### Local Markdown

Import a test case from a Markdown file.

The imported test case is copied into FrameworkPilot's project metadata:

```text
.frameworkpilot/testcases/
```

The original external file is not modified.

### Excel

Import test cases from Excel workbooks using the `xlsx` library.

The current workflow supports one test case per worksheet.

### Azure DevOps

FrameworkPilot provides Azure DevOps connection configuration including:

* Organization URL
* Project
* Test Plan ID
* Test Suite ID
* Personal Access Token

The PAT is stored using VS Code Secret Storage.

> **Current limitation:** Azure DevOps configuration is implemented, but direct Azure DevOps test-case retrieval through the TypeScript extension is not currently implemented.

---

# 3. UI Element Capture

FrameworkPilot can launch a real browser using Playwright and capture elements from the application under test.

Two capture modes are available.

### Manual Capture

Hover over elements to identify them and click individual elements to capture their DOM information.

Captured information can include:

* Tag
* Text
* ID
* ARIA role
* Test ID
* DOM path
* Other relevant element attributes

Manual capture is observational and does not intentionally block normal browser navigation.

### Select Area

Select a rectangular area of the browser page.

FrameworkPilot identifies actionable elements inside the selected region and processes them through the same locator-generation pipeline.

This makes it possible to capture multiple elements efficiently from a page section.

---

# 4. Deterministic Locator Engineering

FrameworkPilot does not simply ask an LLM to invent selectors.

Captured elements are processed through a deterministic locator engine.

Candidate strategies can include:

* Role
* Text
* Test ID
* Label
* CSS
* XPath

Candidates are scored based on characteristics such as:

* Uniqueness
* Accessibility information
* Stability
* DOM characteristics
* Resilience

The UI presents a recommended locator while allowing the engineer to review and select alternatives.

Example:

```text
Element       Locator                         Type     Score
----------------------------------------------------------------
Google Search page.getByRole('button', ...)   ROLE       90
              page.locator(...)               CSS         5
              page.locator('xpath=...')       XPATH      -10
```

### Important principle

FrameworkPilot must never fabricate application-specific locators.

If application information is unavailable, the system should use available captured information or leave an explicit TODO rather than inventing a selector.

---

# 5. Test Case → Locator Mapping

Captured elements can be mapped to individual test-case steps.

FrameworkPilot can provide a deterministic suggestion using keyword overlap, but the mapping remains editable.

The engineer remains responsible for confirming the relationship between:

```text
Test Step
    ↓
Captured Element
    ↓
Selected Locator
```

Capture order is never assumed to be test-step order.

---

# 6. Test Data Handling

FrameworkPilot extracts potential test-data fields from test steps using deterministic logic.

The user can:

* Review extracted fields
* Edit values
* Review JSON representation
* Persist test-data state

Generated automation can then consume structured test data instead of unnecessarily embedding values directly into test methods.

Credentials are not intended to be hardcoded into generated automation.

---

# 7. AI-Assisted Automation Generation

FrameworkPilot uses the **VS Code Language Model API (`vscode.lm`)** for LLM-assisted automation generation.

The LLM receives structured context including:

* Selected test case
* Confirmed locator mappings
* Test data
* Framework configuration
* Project-specific instructions
* Project-specific skills/conventions
* Relevant files from the existing automation project

The goal is to generate automation that fits the **existing project's architecture and conventions**, rather than producing an isolated sample script.

---

# 8. Existing Project Awareness

FrameworkPilot can inspect the configured automation project and build a bounded context for generation.

Relevant project information can include:

* Page Objects
* Tests
* Fixtures
* Utilities
* Configuration
* Test data
* Framework conventions
* Existing implementation patterns

The context builder applies filtering and relevance logic so unnecessary project content is not blindly supplied to the LLM.

Sensitive files and secret-bearing content are filtered.

---

# 9. Empty Project Bootstrap

FrameworkPilot can distinguish between an existing automation project and a genuinely empty target project.

For an empty project, the generation workflow can bootstrap a framework foundation including categories such as:

```text
config/
fixtures/
pages/
tests/
testdata/
utils/
reporting/
```

For the current Python + Playwright + Pytest workflow, the generated framework is designed around:

* Python
* Playwright
* Pytest
* pytest-playwright
* Page Object Model
* Reusable fixtures
* External test data
* Configuration
* Reporting
* Failure screenshots
* Utilities

The exact project-specific conventions remain controlled through the target project's:

```text
instructions.md
skill.md
```

---

# 10. Deterministic AI Output Validation

LLM output is not automatically assumed to be complete or correct.

FrameworkPilot includes deterministic post-generation validation.

The validation layer can identify missing framework foundation categories such as:

* Configuration
* Fixtures
* Page Objects
* Tests
* Test Data
* Utilities
* Reporting

It can also detect prohibited asynchronous patterns when the configured automation convention requires synchronous Playwright.

For example:

```text
async def
await
```

can be flagged before the generated changes are accepted.

The validation layer is intentionally advisory rather than an automatic regeneration loop.

This keeps the engineer in control of the final implementation.

---

# 11. Human-in-the-Loop Code Review

Generated files are not silently written to the target project.

FrameworkPilot uses the native VS Code diff experience to allow the engineer to review proposed changes.

The review workflow supports:

```text
Apply
Skip
Cancel
```

This provides a human checkpoint between:

```text
AI-generated proposal
        ↓
Engineer review
        ↓
Real project
```

The engineer decides what gets written.

---

# 12. Reporting

The generated Python automation framework uses `pytest-html` for HTML reporting.

The reporting foundation includes:

* HTML test reports
* Failure screenshots
* Pytest reporting configuration
* Proper reporting-hook registration

The design deliberately avoids requiring a separate Extent Reports package for the current Python/Pytest implementation.

---

# Architecture

```text
                         FrameworkPilot
                              │
                              ▼
                     VS Code Webview UI
                       dashboardView.ts
                              │
                              ▼
                         extension.ts
                     Central message router
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
   Framework Config      Test Cases         UI Capture
          │                   │                   │
          │                   │                   ▼
          │                   │          captureController.ts
          │                   │                   │
          │                   │                   ▼
          │                   │          playwrightCapture.ts
          │                   │                   │
          │                   │                   ▼
          │                   │            locatorEngine.ts
          │
          ▼
   Generate Automation
          │
          ├── projectInspector.ts
          ├── secretsFilter.ts
          ├── boundedContextBuilder.ts
          ├── generationContext.ts
          ├── frameworkFileConventions.ts
          ├── llmAgent.ts
          ├── generationValidation.ts
          ├── reportingGuarantees.ts
          └── changeReview.ts
```

---

# Technology Stack

| Area                   | Technology                      |
| ---------------------- | ------------------------------- |
| Extension              | TypeScript                      |
| IDE Platform           | Visual Studio Code              |
| UI                     | VS Code Webview                 |
| Browser Automation     | Playwright                      |
| Generated Automation   | Python                          |
| Test Framework         | Pytest                          |
| Playwright Integration | pytest-playwright               |
| Architecture           | Page Object Model               |
| Test Data              | JSON / project-defined approach |
| Excel Import           | `xlsx`                          |
| AI Integration         | VS Code `vscode.lm` API         |
| Secrets                | VS Code Secret Storage          |
| Review                 | Native VS Code Diff             |
| Reporting              | pytest-html                     |
| Build                  | TypeScript / npm                |

---

# Project Structure

```text
frameworkpilot/
│
├── src/
│   ├── extension.ts
│   ├── dashboardView.ts
│   ├── frameworkConfig.ts
│   ├── frameworkOptions.ts
│   ├── adoConfig.ts
│   ├── testCaseModel.ts
│   ├── testCaseMarkdown.ts
│   ├── localTestCaseImport.ts
│   ├── excelTestCaseReader.ts
│   ├── testCaseMapping.ts
│   ├── testDataModel.ts
│   ├── testDataExtraction.ts
│   ├── locatorEngine.ts
│   ├── playwrightCapture.ts
│   ├── captureController.ts
│   ├── projectInspector.ts
│   ├── secretsFilter.ts
│   ├── frameworkFileConventions.ts
│   ├── projectRelevance.ts
│   ├── boundedContextBuilder.ts
│   ├── generationContext.ts
│   ├── llmAgent.ts
│   ├── generationValidation.ts
│   ├── reportingGuarantees.ts
│   ├── changeReview.ts
│   └── projectDocs.ts
│
├── templates/
├── .frameworkpilot/
├── instructions.md
├── skill.md
├── CLAUDE.md
├── CHANGELOG.md
├── package.json
└── tsconfig.json
```

---

# Design Principles

### Deterministic where possible

Important engineering logic such as locator scoring, test-data extraction,
file filtering, project inspection and output validation is implemented
deterministically rather than delegated to an LLM.

### AI where it adds value

The LLM is used for tasks requiring interpretation and code-generation
reasoning, particularly understanding project context and producing framework
changes.

### Human control

AI-generated changes are reviewed before being applied.

### No invented application information

FrameworkPilot does not intentionally fabricate selectors, URLs, UI text,
test data or application behavior.

### Project conventions remain project-owned

Project-specific conventions live in:

```text
instructions.md
skill.md
```

rather than being unnecessarily hardcoded into FrameworkPilot.

### Security-conscious context

Project context is bounded and filtered before being provided to the LLM.

Secrets should never be hardcoded into source code or committed to Git.

---

# Security

FrameworkPilot follows several security principles:

* Azure DevOps PAT is stored using VS Code Secret Storage.
* API keys must not be hardcoded.
* Secrets must not be written to logs.
* Sensitive files are filtered from LLM context.
* Project context is bounded before LLM processing.
* Generated automation is written only after explicit human review.
* Generated automation is kept separate from FrameworkPilot's own source.

---

# Development

Clone the repository and install dependencies:

```bash
npm install
```

Compile the extension:

```bash
npm run compile
```

Launch the Extension Development Host from VS Code:

```text
F5
```

Then open:

```text
FrameworkPilot: Open FrameworkPilot
```

The extension can then be exercised through its dashboard.

---

# Validation

For TypeScript changes:

```bash
npm run compile
```

For generated Python automation:

```bash
python -m pytest tests/test_*.py -v
```

Functional extension testing is performed through the VS Code Extension
Development Host.

---

# Current Scope

FrameworkPilot currently provides a working foundation for:

* Framework configuration
* Local Markdown test-case import
* Excel test-case import
* Azure DevOps connection configuration
* Manual browser element capture
* Area-based browser element capture
* Deterministic locator candidate generation
* Locator scoring and recommendation
* Alternative locator selection
* Test-step mapping
* Test-data extraction and review
* LLM-assisted automation generation
* Existing-project context inspection
* Empty-project framework bootstrapping
* Generated-output validation
* Reporting guarantees
* Native VS Code diff review
* Apply / Skip / Cancel workflow

---

# Current Limitations

FrameworkPilot is intentionally not positioned as a fully integrated enterprise
test-management replacement.

Current limitations include:

* Direct Azure DevOps test-case retrieval is not yet implemented in the
  TypeScript extension.
* The separate Python ADO backend is not currently bridged into the
  extension.
* Advanced autonomous multi-turn/tool-calling generation is not currently
  implemented.
* Extension-level automated test coverage can be expanded further.
* Additional framework stacks can be added in future versions.

These are planned evolution areas rather than dependencies for the core
capture and AI-assisted generation workflow.

---

# What This Project Demonstrates

FrameworkPilot was built to demonstrate practical SDET engineering rather
than simply LLM prompting.

The project brings together:

* Test automation architecture
* Browser automation
* Playwright
* Pytest
* Python
* TypeScript
* VS Code extension development
* DOM inspection
* Locator engineering
* Locator scoring
* Test-case modeling
* Test-data handling
* Project introspection
* LLM-assisted code generation
* Deterministic AI-output validation
* Secret-safe context construction
* Human-in-the-loop code review
* Automation framework bootstrapping

The core engineering concept is:

```text
Automation Engineering
        +
Browser Intelligence
        +
AI Assistance
        +
Deterministic Validation
        +
Human Review
```

---

# Roadmap

Potential future enhancements include:

* Direct Azure DevOps test-case retrieval
* Additional locator strategies
* Improved bulk locator mapping
* More framework templates
* Automated generated-test execution and feedback
* AI-assisted failure analysis and repair
* CI/CD integration
* Advanced multi-turn agent workflows
* VS Code Marketplace packaging

---

# Author

**Madhumitha Krishnasamy**

Senior SDET / Software Development Engineer in Test

FrameworkPilot was developed as a hands-on engineering project exploring the
intersection of **SDET automation, browser intelligence, developer tooling,
and AI-assisted software engineering**.

