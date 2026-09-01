import { NormalizedTestCase } from './testCaseModel';
import { TestCaseMapping, TestStepMapping } from './testCaseMapping';
import { TestCaseData } from './testDataModel';
import { FrameworkConfig } from './frameworkConfig';
import { BoundedProjectContext } from './boundedContextBuilder';

/** Only the selected locator per step, not every candidate that was scored. */
export interface TrimmedStepInfo {
    stepIndex: number;
    stepText: string;
    status: string;
    actionType?: string;
    selectedLocator?: { code: string; type: string };
    capturedElement?: { tagName: string; ariaRole?: string; textContent?: string };
}

export interface GenerationContext {
    testCase: NormalizedTestCase;
    steps: TrimmedStepInfo[];
    testData: TestCaseData;
    frameworkConfig: FrameworkConfig;
    instructions?: string;
    skill?: string;
    /** Optional, per-test-case human-authored guidance from the Automation
     * Context file — never the auto-generated Test Case section, which
     * would duplicate `testCase`/`steps` above. Additive only. */
    testCaseContext?: string;
    projectIsEmpty: boolean;
    bootstrapCategories?: string[];
    project: BoundedProjectContext;
}

export function trimMappingForContext(mapping: TestCaseMapping): TrimmedStepInfo[] {
    return mapping.steps.map((step: TestStepMapping) => ({
        stepIndex: step.stepIndex,
        stepText: step.stepText,
        status: step.status,
        actionType: step.actionType,
        selectedLocator: step.selectedLocator
            ? { code: step.selectedLocator.code, type: step.selectedLocator.type }
            : undefined,
        capturedElement: step.capturedElement
            ? {
                  tagName: step.capturedElement.tagName,
                  ariaRole: step.capturedElement.ariaRole,
                  textContent: step.capturedElement.textContent,
              }
            : undefined,
    }));
}