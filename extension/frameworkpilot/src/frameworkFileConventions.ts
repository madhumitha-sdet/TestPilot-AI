import { FrameworkConfig } from './frameworkConfig';

export type FileRole =
    | 'page_object'
    | 'test'
    | 'base_class'
    | 'fixture'
    | 'config'
    | 'test_data'
    | 'utility'
    | 'dependency_manifest'
    | 'documentation'
    | 'other';

export interface RolePattern {
    role: FileRole;
    pathPattern: RegExp;
}

/**
 * Stack-specific conventions used to (a) classify existing files by role
 * and (b) describe what a COMPLETE bootstrap framework should include.
 * Keyed by "language:automationTool:testRunner:architecture" so new
 * stacks can be added here without touching the rest of the pipeline.
 */
const CONVENTIONS: Record<string, { rolePatterns: RolePattern[]; bootstrapCategories: string[]; requiredDependencies: string[]; postInstallSteps: string[] }> = {
    'python:playwright:pytest:page_object_model': {
        rolePatterns: [
            { role: 'page_object', pathPattern: /(^|\/)(pages|page_objects)\/.*\.py$/i },
            { role: 'page_object', pathPattern: /page\.py$/i },
            { role: 'test', pathPattern: /(^|\/)tests?\/.*test_.*\.py$/i },
            { role: 'test', pathPattern: /^test_.*\.py$/i },
            { role: 'base_class', pathPattern: /base_(page|test)\.py$/i },
            { role: 'fixture', pathPattern: /conftest\.py$/i },
            { role: 'fixture', pathPattern: /(^|\/)fixtures\/.*\.py$/i },
            { role: 'config', pathPattern: /(pytest\.ini|pyproject\.toml|setup\.cfg|\.env\.example)$/i },
            { role: 'config', pathPattern: /(^|\/)config\/.*\.(py|json|yaml|yml|ini)$/i },
            { role: 'test_data', pathPattern: /(^|\/)testdata\/.*\.(json|yaml|yml|csv)$/i },
            { role: 'utility', pathPattern: /(^|\/)utils?\/.*\.py$/i },
            { role: 'dependency_manifest', pathPattern: /requirements.*\.txt$/i },
            { role: 'documentation', pathPattern: /(instructions|skill|readme)\.md$/i },
        ],
        bootstrapCategories: [
            'Project structure (pages/, tests/, testdata/, fixtures/, utils/, config/ directories)',
            'Base Page class providing shared Playwright page interaction helpers',
            'Base Test class or pytest fixtures providing browser/page setup and teardown',
            'pytest fixtures for browser lifecycle (conftest.py)',
            'Configuration/environment handling (e.g. base URL, environment selection)',
            'Test data loading mechanism (JSON-based, per the configured test data approach)',
            'Logging setup',
            'Reporting setup appropriate to the stack (e.g. pytest-html or equivalent)',
            'Screenshot-on-failure capture mechanism',
            'Reusable utility helpers as needed',
            'requirements.txt with the dependencies actually used',
            'The first test file implementing the given test case, built on top of the above',
        ],
        // Generic mechanical facts about this stack's tooling — not
        // project conventions. Project-specific behavior (sync/async,
        // Page Object design, naming, fixtures, logging, reporting,
        // etc.) must never be added here; that belongs in the target
        // project's own instructions.md / skill.md.
        requiredDependencies: ['pytest', 'pytest-playwright', 'playwright'],
        postInstallSteps: ['playwright install'],
    },
};

const DEFAULT_KEY = 'python:playwright:pytest:page_object_model';

function conventionKey(config: FrameworkConfig): string {
    return `${config.language}:${config.automationTool}:${config.testRunner}:${config.architecture}`;
}

export function getRolePatterns(config: FrameworkConfig): RolePattern[] {
    const key = conventionKey(config);
    return (CONVENTIONS[key] || CONVENTIONS[DEFAULT_KEY]).rolePatterns;
}

export function getBootstrapCategories(config: FrameworkConfig): string[] {
    const key = conventionKey(config);
    return (CONVENTIONS[key] || CONVENTIONS[DEFAULT_KEY]).bootstrapCategories;
}

export function getRequiredDependencies(config: FrameworkConfig): string[] {
    const key = conventionKey(config);
    return (CONVENTIONS[key] || CONVENTIONS[DEFAULT_KEY]).requiredDependencies;
}

export function getPostInstallSteps(config: FrameworkConfig): string[] {
    const key = conventionKey(config);
    return (CONVENTIONS[key] || CONVENTIONS[DEFAULT_KEY]).postInstallSteps;
}

export function classifyFileRole(relativePath: string, config: FrameworkConfig): FileRole {
    for (const { role, pathPattern } of getRolePatterns(config)) {
        if (pathPattern.test(relativePath)) {
            return role;
        }
    }
    return 'other';
}