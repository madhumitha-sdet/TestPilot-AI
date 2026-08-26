import {
    SupportedLanguage,
    SupportedAutomationTool,
    SupportedTestRunner,
    SupportedArchitecture,
    SupportedTestDataApproach,
} from './frameworkConfig';

/**
 * Centralized dropdown option lists for Framework Configuration.
 * Add new technologies here only — dashboardView.ts consumes this list
 * and never hardcodes options.
 */

export interface OptionItem<T extends string> {
    value: T;
    label: string;
}

export const LANGUAGE_OPTIONS: OptionItem<SupportedLanguage>[] = [
    { value: 'python', label: 'Python' },
];

export const AUTOMATION_TOOL_OPTIONS: OptionItem<SupportedAutomationTool>[] = [
    { value: 'playwright', label: 'Playwright' },
];

export const TEST_RUNNER_OPTIONS: OptionItem<SupportedTestRunner>[] = [
    { value: 'pytest', label: 'Pytest' },
];

export const ARCHITECTURE_OPTIONS: OptionItem<SupportedArchitecture>[] = [
    { value: 'page_object_model', label: 'Page Object Model' },
];

export const TEST_DATA_APPROACH_OPTIONS: OptionItem<SupportedTestDataApproach>[] = [
    { value: 'json', label: 'JSON' },
];