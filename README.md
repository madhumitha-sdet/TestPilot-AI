

````markdown
# FrameworkPilot

### AI-Assisted SDET Automation inside VS Code

FrameworkPilot is a TypeScript-based VS Code extension I built to reduce the manual effort involved in converting test cases and real UI elements into maintainable test automation.

Rather than treating automation as a simple **"prompt → code"** problem, FrameworkPilot combines test-case handling, real UI element capture, deterministic locator engineering, project-context inspection, LLM-assisted generation, validation, and human review.

---

## 🚀 What FrameworkPilot Does

FrameworkPilot supports an end-to-end automation generation workflow:

```text
Test Case
   ↓
UI Element Capture
   ↓
Locator Generation & Scoring
   ↓
Test-Step → Locator Mapping
   ↓
Test Data
   ↓
Project Context
   ↓
LLM-Assisted Automation Generation
   ↓
Validation
   ↓
Human Review
   ↓
Real Automation Project
````

The goal is to help SDETs spend less time on repetitive automation setup while keeping engineers in control of the generated changes.

---

## 🏗️ Architecture

```text
                    ┌──────────────┐
                    │     User     │
                    └──────┬───────┘
                           ↓
              ┌─────────────────────────┐
              │ FrameworkPilot          │
              │ VS Code Extension       │
              └───────────┬─────────────┘
                          ↓
             ┌──────────────────────────┐
             │ Test Case + UI Capture   │
             │ + Test Data              │
             └────────────┬─────────────┘
                          ↓
             ┌──────────────────────────┐
             │ Deterministic Locator    │
             │ Generation & Scoring      │
             └────────────┬─────────────┘
                          ↓
             ┌──────────────────────────┐
             │ Project Context Builder  │
             └────────────┬─────────────┘
                          ↓
             ┌──────────────────────────┐
             │ VS Code Language Model   │
             │ API (vscode.lm)          │
             └────────────┬─────────────┘
                          ↓
             ┌──────────────────────────┐
             │ Automation Generation    │
             └────────────┬─────────────┘
                          ↓
                    ┌────────────┐
                    │ Validation │
                    └─────┬──────┘
                          ↓
             ┌──────────────────────────┐
             │ Native VS Code Diff      │
             │ Review                   │
             └────────────┬─────────────┘
                          ↓
                  Apply / Skip / Cancel
```

---

## ✨ Key Capabilities

* Framework configuration
* Local Markdown test-case import
* Excel test-case import
* Azure DevOps connection configuration
* Manual browser element capture
* Select Area browser capture
* Deterministic locator candidate generation
* Locator scoring and recommendation
* Test-step to locator mapping
* Test-data extraction and review
* LLM-assisted automation generation
* Existing-project context inspection
* Empty-project framework bootstrapping
* Generation validation
* Reporting guarantees
* Native VS Code diff review
* Apply / Skip / Cancel workflow

---

## 🧰 Technology Stack

| Area                | Technology                               |
| ------------------- | ---------------------------------------- |
| Extension           | TypeScript                               |
| IDE                 | Visual Studio Code Extension API         |
| UI                  | VS Code Webview                          |
| Browser Automation  | Playwright                               |
| Automation Language | Python                                   |
| Test Framework      | Pytest / pytest-playwright               |
| Design Pattern      | Page Object Model                        |
| AI                  | VS Code Language Model API (`vscode.lm`) |
| Data                | `xlsx`                                   |
| Secrets             | VS Code Secret Storage                   |
| Reporting           | `pytest-html`                            |
| Review              | Native VS Code Diff                      |

---

## 🤖 Role of AI / LLM

FrameworkPilot uses the VS Code Language Model API to assist with automation generation.

The LLM is not responsible for the entire automation workflow.

Deterministic engineering components handle areas such as:

* UI element capture
* Locator candidate generation
* Locator scoring
* Test-step-to-locator mapping
* Test-data handling
* Project-context inspection
* Generation validation

The LLM then assists with generating automation that is informed by the available test and project context.

---

## 🔍 Why This Is More Than "Prompt → Code"

A simple AI code generator can produce automation code from a textual prompt.

FrameworkPilot instead brings together:

**Real application context**

*

**Deterministic locator engineering**

*

**Project-aware LLM generation**

*

**Validation**

*

**Human review**

This provides a more structured workflow for generating automation changes.

---

## 🛡️ Human-in-the-Loop Review

Generated changes are not treated as automatically trusted output.

FrameworkPilot provides a review checkpoint through the native VS Code diff experience:

```text
Generate
   ↓
Validate
   ↓
Review Diff
   ↓
Apply / Skip / Cancel
```

This allows an engineer to inspect proposed changes before applying them to the automation project.

---

## 🧩 Engineering Challenges

### Locator reliability

Generating a locator is straightforward; generating useful candidates and determining which candidate should be preferred is an automation-engineering problem.

FrameworkPilot addresses this through deterministic locator generation and scoring.

### Project-aware generation

Generated automation needs to fit the structure and conventions of the target automation project.

FrameworkPilot therefore inspects existing project context before generation.

### Controlled AI generation

The LLM is used as part of a structured workflow rather than as the entire automation system.

### Safe application of generated changes

Native VS Code diff review provides an explicit human checkpoint before changes are applied.

---

## 🧪 Generated Automation Example

FrameworkPilot can bootstrap or generate automation within a configured Playwright + Pytest project context.

The [`frameworkpilot-test-automation`](https://github.com/madhumitha-sdet/frameworkpilot-test-automation) project is an example automation framework generated and developed using FrameworkPilot.

It demonstrates the type of Playwright/Pytest automation project that FrameworkPilot is designed to produce and structure.

> FrameworkPilot assists with generation and validation; generated automation remains subject to engineer review before changes are applied.

## 📋 Example Workflow

A typical automation workflow can look like:

```text
1. Import test case
2. Capture application UI elements
3. Generate locator candidates
4. Score and review locators
5. Map locators to test steps
6. Prepare test data
7. Inspect project context
8. Generate automation
9. Validate generated output
10. Review VS Code diff
11. Apply / Skip / Cancel changes
```

---

## ⚠️ Current Limitations

FrameworkPilot is an evolving engineering project.

* Direct Azure DevOps test-case retrieval is not currently implemented in the TypeScript extension.
* The separate Python ADO backend is not currently bridged to the extension.
* Advanced autonomous multi-turn/tool-calling agent behavior is not implemented.
* FrameworkPilot should not be represented as executing the complete automation lifecycle directly inside the extension.

These boundaries are intentionally documented to distinguish implemented functionality from future possibilities.

---

## 👩‍💻 My Contribution

I designed and developed FrameworkPilot as a TypeScript-based VS Code extension, including the automation workflow, test-case handling, UI capture workflow, locator engineering, project-context inspection, LLM integration, generation validation, and human-review flow.

The project applies software test automation engineering principles to an AI-assisted development workflow.

---

## 📁 Project Structure

```text
backend/
extension/frameworkpilot/
PROJECT_SPEC.md
.gitignore
```

The primary extension implementation is located under:

```text
extension/frameworkpilot/
```

---

## 🎯 Project Goal

FrameworkPilot was built to explore how AI can be integrated into practical SDET workflows while preserving deterministic automation engineering and human control over generated changes.

**The objective is not autonomous test generation. The objective is engineer-assisted automation acceleration.**

