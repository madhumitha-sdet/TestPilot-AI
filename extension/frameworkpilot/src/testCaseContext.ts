import * as fs from 'fs';
import * as path from 'path';
import { NormalizedTestCase } from './testCaseModel';

/**
 * Per-test-case Automation Context (.frameworkpilot/testcase-context/<id>.md).
 *
 * Two parts, separated by a fixed sentinel line: an auto-generated "Test
 * Case" section (regenerated from NormalizedTestCase every time the test
 * case is selected) and a user-authored "Automation Implementation Notes"
 * section (existing test/page-object pointers, business logic, test data
 * notes, optional database validation intent) that is always preserved
 * across regeneration.
 *
 * This is additive human guidance layered on top of the normalized test
 * case, the real project's own inspected context, and instructions.md/
 * skill.md — never a replacement for any of them, and never itself sent to
 * the LLM in its auto-generated form (see readUserSectionForGeneration).
 */

const CONTEXT_SUBDIR = path.join('.frameworkpilot', 'testcase-context');
const SENTINEL = '<!-- frameworkpilot:end-generated-section -->';

const DEFAULT_USER_SECTION = [
    '---',
    '',
    '# Automation Implementation Notes',
    '',
    '_This entire section is optional. Leave everything below blank if the original test case already contains enough information — FrameworkPilot proceeds normally either way._',
    '',
    '## Existing Automation',
    '',
    '<!-- Optional. Point FrameworkPilot at automation that already exists for this flow, so it is reused instead of duplicated. -->',
    '',
    '- Existing test file:',
    '- Existing Page Object:',
    '- Existing fixture/utility to reuse:',
    '',
    '## Additional Business / Automation Logic',
    '',
    '<!-- Optional. Anything true about this flow that the original test case does not say. -->',
    '',
    '## Test Data Notes',
    '',
    '<!-- Optional. Additional test data requirements beyond what the test case already specifies. -->',
    '',
    '## Database Validation',
    '',
    '<!-- Optional. Leave "Required: No" (or delete this section) if this test needs no database validation. -->',
    '',
    '- Required: No',
    '- Database Type:',
    '- Purpose:',
    '- Query:',
    '',
    '  ```sql',
    "  -- Read-only validation query. Reference test data by name, e.g. '<username>' —",
    '  -- never paste real connection strings, passwords, or API keys/tokens here.',
    '  ```',
    '',
    '- Expected Result:',
    '- Execution Point: <!-- before action / after action / after test -->',
    '- Test Data Parameters Used:',
    '- Existing DB Utility to Reuse:',
    '',
    '## Additional Notes',
    '',
    "<!-- Optional. Anything else FrameworkPilot's generation should know. -->",
].join('\n');

function numberedList(items: string[] | undefined, fallback: string): string {
    if (!items || items.length === 0) {
        return fallback;
    }
    return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
}

/** Pure. The regenerate-every-time "Test Case" section, from NormalizedTestCase alone. */
export function generateAutoSection(testCase: NormalizedTestCase): string {
    return [
        `# ${testCase.id} — ${testCase.title}`,
        '',
        '<!-- frameworkpilot:context-version=1 -->',
        `<!-- frameworkpilot:source-test-case-path=${testCase.filePath || testCase.id} -->`,
        '',
        '## Test Case',
        '',
        '### Description',
        '',
        testCase.description || '_No description provided in the source test case._',
        '',
        '### Steps',
        '',
        numberedList(testCase.steps, '_No steps provided in the source test case._'),
        '',
        '### Expected Result',
        '',
        numberedList(testCase.expectedResults, '_No expected result provided in the source test case._'),
    ].join('\n');
}

/**
 * Splits an existing context file on the sentinel line and returns
 * everything after it (the user-owned part), trimmed of the sentinel's own
 * trailing blank line. Returns undefined if the sentinel isn't present —
 * callers must treat that as "unmanaged", never as "empty".
 */
export function parseUserSection(rawMarkdown: string): string | undefined {
    const idx = rawMarkdown.indexOf(SENTINEL);
    if (idx === -1) {
        return undefined;
    }
    return rawMarkdown.slice(idx + SENTINEL.length).replace(/^\n+/, '');
}

/** True if a user section is exactly the untouched default skeleton. */
export function isBlankUserSection(userSection: string): boolean {
    return userSection.trim() === DEFAULT_USER_SECTION.trim();
}

/** Pure. Auto section + sentinel + (preserved or default) user section. */
export function buildContextFileContent(testCase: NormalizedTestCase, existingUserSection?: string): string {
    const auto = generateAutoSection(testCase);
    const hasCustomUserSection = existingUserSection !== undefined && existingUserSection.trim().length > 0;
    const userPart = hasCustomUserSection ? (existingUserSection as string).trim() : DEFAULT_USER_SECTION.trim();
    return `${auto}\n${SENTINEL}\n\n${userPart}\n`;
}

function contextFilePath(projectPath: string, testCase: NormalizedTestCase): string {
    const safeId = testCase.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(projectPath, CONTEXT_SUBDIR, `${safeId}.md`);
}

export interface EnsureContextResult {
    filePath: string;
    created: boolean;
    /** True if an existing file's sentinel line was missing/mangled — left untouched rather than risk destroying user content. */
    unmanaged: boolean;
}

/**
 * Creates the context file on first selection, or re-syncs its
 * auto-generated section on every later selection while preserving
 * whatever the user wrote below the sentinel. Never overwrites a file
 * whose sentinel can't be found. Only writes to disk when content actually
 * changed, to avoid noisy mtime/git-diff churn on repeated selection.
 */
export function ensureTestCaseContext(projectPath: string, testCase: NormalizedTestCase): EnsureContextResult {
    const filePath = contextFilePath(projectPath, testCase);

    if (fs.existsSync(filePath)) {
        const existingRaw = fs.readFileSync(filePath, 'utf8');
        const userSection = parseUserSection(existingRaw);

        if (userSection === undefined) {
            return { filePath, created: false, unmanaged: true };
        }

        const newContent = buildContextFileContent(testCase, userSection);
        if (newContent !== existingRaw) {
            fs.writeFileSync(filePath, newContent, 'utf8');
        }
        return { filePath, created: false, unmanaged: false };
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buildContextFileContent(testCase, undefined), 'utf8');
    return { filePath, created: true, unmanaged: false };
}

/**
 * Returns only the user-authored section for GenerationContext — never
 * the auto-generated "Test Case" block, since NormalizedTestCase already
 * carries that in structured form. Returns undefined when there's no
 * context file, the user section is still the untouched default skeleton,
 * or it's blank — so a test case with nothing added costs zero extra
 * prompt tokens. Falls back to the whole file for an "unmanaged" file
 * (missing sentinel) so nothing the user wrote is silently dropped.
 */
export function readUserSectionForGeneration(projectPath: string, testCase: NormalizedTestCase): string | undefined {
    const filePath = contextFilePath(projectPath, testCase);
    if (!fs.existsSync(filePath)) {
        return undefined;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const userSection = parseUserSection(raw);

    if (userSection === undefined) {
        const trimmed = raw.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    return isBlankUserSection(userSection) ? undefined : userSection.trim();
}
