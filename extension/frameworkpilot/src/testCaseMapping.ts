import * as vscode from 'vscode';
import { NormalizedTestCase } from './testCaseModel';
import { LocatorCandidate } from './locatorEngine';

/**
 * Working mapping between a test case's steps and captured UI elements.
 * Entirely separate from the source Markdown — the original test case
 * file is never modified when a mapping is created or updated.
 */

export type StepStatus = 'not_captured' | 'captured' | 'mapped';

export interface StepElementInfo {
    tagName: string;
    ariaRole?: string;
    textContent?: string;
    id?: string;
    testId?: string;
}

export interface TestStepMapping {
    stepIndex: number;
    stepText: string;
    status: StepStatus;
    capturedElement?: StepElementInfo;
    candidates?: LocatorCandidate[];
    selectedLocator?: LocatorCandidate;
    /** Deterministic best-guess only (tag/role based) — never LLM-inferred. */
    actionType?: string;
}

export interface TestCaseMapping {
    testCaseId: string;
    testCasePath: string;
    activeStepIndex: number | null;
    steps: TestStepMapping[];
}

const MAPPING_KEY_PREFIX = 'frameworkpilot.testCaseMapping::';

export function buildInitialMapping(testCase: NormalizedTestCase): TestCaseMapping {
    return {
        testCaseId: testCase.id,
        testCasePath: testCase.filePath || testCase.id,
        activeStepIndex: null,
        steps: (testCase.steps || []).map((stepText, index) => ({
            stepIndex: index,
            stepText,
            status: 'not_captured' as StepStatus,
        })),
    };
}

export function loadTestCaseMapping(
    context: vscode.ExtensionContext,
    testCasePath: string
): TestCaseMapping | undefined {
    return context.workspaceState.get<TestCaseMapping>(MAPPING_KEY_PREFIX + testCasePath);
}

export function saveTestCaseMapping(context: vscode.ExtensionContext, mapping: TestCaseMapping): void {
    context.workspaceState.update(MAPPING_KEY_PREFIX + mapping.testCasePath, mapping);
}