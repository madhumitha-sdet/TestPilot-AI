import * as path from 'path';
import { ProposedFileChange } from './llmAgent';
import { FrameworkConfig } from './frameworkConfig';
import { FileRole, classifyFileRole } from './frameworkFileConventions';

/**
 * Advisory-only checks run after LLM generation and before the existing
 * native diff review. Never blocks Apply/Skip/Cancel and never modifies a
 * proposed change — findings are surfaced as plain text alongside the
 * existing 'reviewing' generationStatus message. Deliberately bounded: no
 * cross-file method-call checking, no pytest/conftest fixture-graph
 * analysis — those would amount to a second generation/analysis engine,
 * which is out of scope. The human reviewing the diff remains authoritative.
 */

export interface ValidationWarning {
    category: 'sync' | 'foundation' | 'import';
    message: string;
}

const ASYNC_PATTERN = /\basync\s+def\b|\bawait\b/;

/** Common stdlib/third-party top-level module names, so absolute-import
 * resolution isn't attempted against them (they're never local files). */
const KNOWN_NON_LOCAL_MODULES = new Set([
    'os', 'sys', 'json', 're', 'typing', 'dataclasses', 'unittest', 'logging', 'time', 'datetime',
    'pathlib', 'collections', 'itertools', 'functools', 'abc', 'enum', 'io', 'csv', 'random',
    'math', 'subprocess', 'shutil', 'string', 'copy', 'traceback', 'contextlib', 'uuid',
    'pytest', 'playwright', 'requests', 'yaml', 'dotenv', 'setuptools', 'pip',
]);

function isPythonFile(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.py');
}

function hasContent(change: ProposedFileChange): boolean {
    return change.action !== 'reuse_only' && !!change.content;
}

/** Flags proposed Python files containing async/await, so a sync-only
 * convention documented in instructions.md/skill.md isn't silently violated. */
export function findAsyncViolations(changes: ProposedFileChange[]): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    for (const change of changes) {
        if (!hasContent(change) || !isPythonFile(change.filePath)) {
            continue;
        }
        if (ASYNC_PATTERN.test(change.content as string)) {
            warnings.push({
                category: 'sync',
                message: `${change.filePath} contains async/await — verify this matches the sync/async convention in instructions.md.`,
            });
        }
    }
    return warnings;
}

const FOUNDATION_ROLES: { role: FileRole; label: string }[] = [
    { role: 'page_object', label: 'a Page Object' },
    { role: 'test', label: 'a test file' },
    { role: 'base_class', label: 'a Base Page/Test class' },
    { role: 'fixture', label: 'pytest fixtures (conftest.py)' },
    { role: 'config', label: 'configuration/environment handling' },
    { role: 'test_data', label: 'a test data loading mechanism' },
    { role: 'utility', label: 'reusable utility helpers' },
];

/** For an empty-project bootstrap, checks which structural roles — each
 * corresponding to one of frameworkFileConventions.ts's
 * getBootstrapCategories() prose categories (page objects, tests, base
 * class, fixtures, config, test data, utilities) — are actually
 * represented among the proposed files. A reuse_only entry still counts as
 * covering its role: role classification is purely path-based, and a
 * reuse_only file means the model explicitly determined an existing file
 * already handles it — a legitimate "no gap" outcome, not a missing one. */
export function findMissingFoundationRoles(
    changes: ProposedFileChange[],
    config: FrameworkConfig
): ValidationWarning[] {
    const proposedRoles = new Set(changes.map((c) => classifyFileRole(c.filePath, config)));

    return FOUNDATION_ROLES.filter(({ role }) => !proposedRoles.has(role)).map(({ label }) => ({
        category: 'foundation' as const,
        message: `No proposed file was recognized as ${label} — the bootstrap foundation may be incomplete.`,
    }));
}

/** Checks the two getBootstrapCategories() items with no dedicated
 * FileRole to classify against — "Reporting setup" and "Screenshot-on-
 * failure capture mechanism" — since those are identified by content, not
 * file path. Reuses the exact markers reportingGuarantees.ts treats as
 * authoritative ('--html=' for pytest-html, 'pytest_runtest_makereport'
 * for the screenshot hook), so this stays a mechanical fact-check, not a
 * new convention. By the time this runs, ensurePytestHtmlReporting/
 * ensureScreenshotOnFailureHook have already mutated `changes` and
 * normally guarantee both — a warning here means either the LLM used
 * pyproject.toml (the one case those guarantees deliberately skip) or
 * something unexpected happened, both worth surfacing. A reuse_only
 * pytest.ini/conftest.py is trusted the same way findMissingFoundationRoles
 * trusts reuse_only — its content can't be scanned, so its mere presence
 * counts as coverage rather than being unfairly flagged missing. */
export function findMissingReportingSetup(changes: ProposedFileChange[]): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    const htmlReportCovered = changes.some((c) =>
        c.action === 'reuse_only'
            ? /(^|\/)(pytest\.ini|pyproject\.toml)$/i.test(c.filePath)
            : (c.content || '').includes('--html=')
    );
    if (!htmlReportCovered) {
        warnings.push({
            category: 'foundation',
            message: 'No proposed file appears to configure pytest-html (--html=) reporting — reporting setup may be incomplete.',
        });
    }

    const screenshotHookCovered = changes.some((c) =>
        c.action === 'reuse_only'
            ? /conftest\.py$/i.test(c.filePath)
            : (c.content || '').includes('pytest_runtest_makereport')
    );
    if (!screenshotHookCovered) {
        warnings.push({
            category: 'foundation',
            message: 'No proposed file appears to implement a screenshot-on-failure hook (pytest_runtest_makereport) — failure evidence capture may be incomplete.',
        });
    }

    return warnings;
}

function extractImportedModules(content: string): string[] {
    const modules: string[] = [];
    const fromImportRe = /^\s*from\s+([.\w]+)\s+import\b/gm;
    const importRe = /^\s*import\s+([.\w]+)/gm;
    let m: RegExpExecArray | null;
    while ((m = fromImportRe.exec(content))) {
        modules.push(m[1]);
    }
    while ((m = importRe.exec(content))) {
        modules.push(m[1]);
    }
    return modules;
}

/** Resolves a dotted Python import (absolute or relative) to a project-root
 * relative module path, given the importing file's own path. Returns null
 * if the import isn't a local-looking module. */
function resolveModulePath(moduleDotted: string, importingFilePath: string): string | null {
    const dotMatch = moduleDotted.match(/^(\.+)(.*)$/);

    if (!dotMatch) {
        const topLevel = moduleDotted.split('.')[0];
        if (!topLevel || KNOWN_NON_LOCAL_MODULES.has(topLevel)) {
            return null;
        }
        return moduleDotted.replace(/\./g, '/');
    }

    const dots = dotMatch[1].length;
    const rest = dotMatch[2].replace(/\./g, '/');
    let base = path.posix.dirname(importingFilePath);
    for (let i = 1; i < dots; i++) {
        base = path.posix.dirname(base);
    }
    return rest ? path.posix.join(base, rest) : base;
}

/** Checks that local-looking imports in proposed Python files resolve to
 * some file among the proposed changes or the already-existing project —
 * catches the common failure mode of a test/page-object importing a module
 * the model never actually created. */
export function findBrokenLocalImports(
    changes: ProposedFileChange[],
    existingProjectPaths: string[] = []
): ValidationWarning[] {
    const knownPaths = new Set([...changes.map((c) => c.filePath), ...existingProjectPaths]);
    const warnings: ValidationWarning[] = [];

    for (const change of changes) {
        if (!hasContent(change) || !isPythonFile(change.filePath)) {
            continue;
        }

        for (const moduleDotted of extractImportedModules(change.content as string)) {
            const modulePath = resolveModulePath(moduleDotted, change.filePath);
            if (!modulePath) {
                continue;
            }

            const resolved = knownPaths.has(`${modulePath}.py`) || knownPaths.has(`${modulePath}/__init__.py`);
            if (!resolved) {
                warnings.push({
                    category: 'import',
                    message: `${change.filePath} imports '${moduleDotted}', which was not found among proposed or existing project files.`,
                });
            }
        }
    }

    return warnings;
}

export function validateGeneratedProject(
    changes: ProposedFileChange[],
    config: FrameworkConfig,
    opts: { projectIsEmpty: boolean; existingProjectPaths?: string[] }
): ValidationWarning[] {
    const warnings: ValidationWarning[] = [
        ...findAsyncViolations(changes),
        ...findBrokenLocalImports(changes, opts.existingProjectPaths || []),
    ];

    if (opts.projectIsEmpty) {
        warnings.push(...findMissingFoundationRoles(changes, config));
        warnings.push(...findMissingReportingSetup(changes));
    }

    return warnings;
}
