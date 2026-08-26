import * as fs from 'fs';
import * as path from 'path';
import { NormalizedTestCase, TestCaseSource } from './testCaseModel';

/**
 * Deterministic Markdown generation/parsing for NormalizedTestCase, and
 * storage under <projectPath>/.frameworkpilot/testcases/. No LLM
 * involvement — this is a pure, deterministic data transform.
 */

const TESTCASES_SUBDIR = path.join('.frameworkpilot', 'testcases');

export function generateMarkdown(testCase: NormalizedTestCase): string {
    const steps = (testCase.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
    const expected = (testCase.expectedResults || []).map((s, i) => `${i + 1}. ${s}`).join('\n');

    return [
        `# ${testCase.id} - ${testCase.title}`,
        '',
        '## Description',
        '',
        testCase.description || '',
        '',
        '## Steps',
        '',
        steps,
        '',
        '## Expected Results',
        '',
        expected,
        '',
        `<!-- frameworkpilot:source=${testCase.source} -->`,
        '',
    ].join('\n');
}

/**
 * Parses Markdown (generated or compatible user-authored) back into a
 * NormalizedTestCase. Missing sections degrade gracefully rather than
 * throwing, so hand-written local files that don't match exactly still work.
 */
export function parseMarkdownToTestCase(
    rawMarkdown: string,
    fallbackId: string,
    fallbackTitle: string,
    defaultSource: TestCaseSource
): NormalizedTestCase {
    const titleMatch = rawMarkdown.match(/^#\s+(.+)$/m);
    let id = fallbackId;
    let title = fallbackTitle;

    if (titleMatch) {
        const headingText = titleMatch[1].trim();
        const separatorIndex = headingText.indexOf(' - ');
        if (separatorIndex !== -1) {
            id = headingText.slice(0, separatorIndex).trim();
            title = headingText.slice(separatorIndex + 3).trim();
        } else {
            title = headingText;
        }
    }

    const description = extractSection(rawMarkdown, 'Description');
    const stepsSection = extractSection(rawMarkdown, 'Steps');
    const expectedSection = extractSection(rawMarkdown, 'Expected Results');

    const sourceMatch = rawMarkdown.match(/<!--\s*frameworkpilot:source=(\w+)\s*-->/);
    const source = (sourceMatch ? sourceMatch[1] : defaultSource) as TestCaseSource;

    return {
        id,
        title,
        source,
        description: description || undefined,
        steps: extractListItems(stepsSection),
        expectedResults: extractListItems(expectedSection),
        rawMarkdown,
    };
}

function extractSection(markdown: string, heading: string): string {
    const pattern = new RegExp(`##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|<!--|$)`, 'i');
    const match = markdown.match(pattern);
    return match ? match[1].trim() : '';
}

function extractListItems(sectionText: string): string[] {
    if (!sectionText) {
        return [];
    }
    return sectionText
        .split('\n')
        .map((line) => line.replace(/^\s*\d+\.\s*/, '').trim())
        .filter((line) => line.length > 0);
}

function safeFilename(testCase: NormalizedTestCase): string {
    const safeId = testCase.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeTitle = testCase.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
    return `${safeId}_${safeTitle}.md`;
}

/**
 * Writes a normalized test case as Markdown under
 * <projectPath>/.frameworkpilot/testcases/. Only for FrameworkPilot
 * -generated test cases — never used for user-selected local Markdown
 * files, which stay untouched at their original path.
 *
 * Does not overwrite an existing file unless force is true, so a
 * previously generated file the user has hand-edited is preserved.
 */
export function saveTestCaseMarkdown(
    projectPath: string,
    testCase: NormalizedTestCase,
    force = false
): { filePath: string; written: boolean } {
    const dir = path.join(projectPath, TESTCASES_SUBDIR);
    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, safeFilename(testCase));

    if (fs.existsSync(filePath) && !force) {
        return { filePath, written: false };
    }

    fs.writeFileSync(filePath, generateMarkdown(testCase), 'utf8');
    return { filePath, written: true };
}

/**
 * Lists FrameworkPilot-generated test cases under
 * <projectPath>/.frameworkpilot/testcases/. Returns an empty list if
 * projectPath is unset or the directory doesn't exist yet — not an error.
 */
export function listGeneratedTestCaseFiles(projectPath?: string): NormalizedTestCase[] {
    if (!projectPath) {
        return [];
    }

    const dir = path.join(projectPath, TESTCASES_SUBDIR);
    if (!fs.existsSync(dir)) {
        return [];
    }

    return fs
        .readdirSync(dir)
        .filter((file) => file.endsWith('.md'))
        .map((file) => {
            const filePath = path.join(dir, file);
            const raw = fs.readFileSync(filePath, 'utf8');
            const fallback = file.replace('.md', '');
            const testCase = parseMarkdownToTestCase(raw, fallback, fallback, 'local');
            testCase.filePath = filePath;
            return testCase;
        });
}