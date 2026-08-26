import * as vscode from 'vscode';

/**
 * Test data required by a test case's steps, independent of where each
 * value ultimately comes from. This model is intentionally source-agnostic:
 *
 * - 'testcase'          — field name detected from step text, no value yet.
 * - 'user'               — value entered manually in the FrameworkPilot UI.
 * - 'existing_framework' — reserved for a future phase that discovers
 *                          existing testdata files in the user's project
 *                          and reuses their values instead of asking again.
 *
 * A future SQL/database-driven source can be added as another union member
 * (e.g. 'database') without changing this shape or any UI that renders it —
 * code generation will simply read `fields[].value` regardless of source.
 */

export type TestDataSource = 'testcase' | 'user' | 'existing_framework';

export interface TestDataField {
    name: string;
    value?: string;
    source?: TestDataSource;
    required: boolean;
}

export interface TestCaseData {
    testCaseId: string;
    testCasePath: string;
    fields: TestDataField[];
}

const TEST_DATA_KEY_PREFIX = 'frameworkpilot.testData::';

export function loadTestCaseData(
    context: vscode.ExtensionContext,
    testCasePath: string
): TestCaseData | undefined {
    return context.workspaceState.get<TestCaseData>(TEST_DATA_KEY_PREFIX + testCasePath);
}

export function saveTestCaseData(context: vscode.ExtensionContext, data: TestCaseData): void {
    context.workspaceState.update(TEST_DATA_KEY_PREFIX + data.testCasePath, data);
}

/**
 * FUTURE SEAM (not implemented in this phase):
 * Once a Project Path represents a real automation framework, finalized
 * TestCaseData should be written to <ProjectPath>/testdata/<testCaseId>.json
 * as a deterministic export step — separate from FrameworkPilot's own
 * workspaceState copy, and only triggered explicitly by the user (not on
 * every edit), to avoid file churn. That function is intentionally not
 * added yet — this comment documents where it will go.
 */