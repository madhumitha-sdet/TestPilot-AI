# AutoSDET AI

## Project Vision

AutoSDET AI is an AI-powered VS Code extension that converts Azure DevOps manual test cases into executable Python Playwright automation.

The tool analyzes an existing Playwright automation framework, intelligently updates or creates Page Objects and test scripts, validates generated locators, executes the automation, and generates an execution report.

The primary goal of this project is to reduce the manual effort involved in converting manual test cases into maintainable automation scripts while following clean automation design principles.

---

## Problem Statement

Automation engineers spend a significant amount of time performing repetitive tasks such as:

- Reading manual test cases from Azure DevOps
- Creating Page Objects
- Writing Playwright test scripts
- Identifying application locators
- Updating existing automation code
- Executing tests
- Verifying generated scripts

Most of these tasks are repetitive and can be partially automated with AI while still allowing engineers to review and control the generated code.

---

## Project Goal

Develop a professional developer tool that enables an automation engineer to:

1. Connect to Azure DevOps.
2. Read manual test cases.
3. Generate Python Playwright automation using AI.
4. Update an existing Playwright automation framework.
5. Validate generated locators.
6. Execute generated tests.
7. Generate execution reports.

---

## Target Users

- QA Engineers
- Automation Engineers
- SDETs
- Software Test Teams

---

## Technology Stack

- Python
- Playwright (Python)
- Visual Studio Code Extension
- TypeScript
- Azure DevOps REST API
- OpenAI API (or compatible LLM API)
- Git
- GitHub
- JSON
