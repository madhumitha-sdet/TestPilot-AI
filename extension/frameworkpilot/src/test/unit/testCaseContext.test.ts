import * as assert from 'assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    generateAutoSection,
    parseUserSection,
    isBlankUserSection,
    buildContextFileContent,
    ensureTestCaseContext,
    readUserSectionForGeneration,
} from '../../testCaseContext';
import { NormalizedTestCase } from '../../testCaseModel';

const testCase: NormalizedTestCase = {
    id: 'TC001',
    title: 'Successful Login',
    source: 'local',
    description: 'Verify a user can log in with valid credentials.',
    steps: ['Navigate to the login page', 'Enter username and password', 'Click Login'],
    expectedResults: ['The user lands on the dashboard'],
    filePath: '.frameworkpilot/testcases/TC001_Successful_Login.md',
};

describe('testCaseContext.generateAutoSection', () => {
    it('includes the id, title, description, steps, and expected results', () => {
        const section = generateAutoSection(testCase);
        assert.match(section, /# TC001 — Successful Login/);
        assert.match(section, /Verify a user can log in with valid credentials\./);
        assert.match(section, /1\. Navigate to the login page/);
        assert.match(section, /3\. Click Login/);
        assert.match(section, /1\. The user lands on the dashboard/);
    });

    it('falls back to placeholder text for missing steps/expected results', () => {
        const bare: NormalizedTestCase = { id: 'TC002', title: 'Bare case', source: 'local', steps: [] };
        const section = generateAutoSection(bare);
        assert.match(section, /No steps provided/);
        assert.match(section, /No expected result provided/);
    });
});

describe('testCaseContext.parseUserSection / isBlankUserSection', () => {
    it('returns undefined when the sentinel is missing', () => {
        assert.equal(parseUserSection('# Some file\n\nNo sentinel here.\n'), undefined);
    });

    it('returns everything after the sentinel when present', () => {
        const raw = buildContextFileContent(testCase);
        const userSection = parseUserSection(raw);
        assert.notEqual(userSection, undefined);
        assert.match(userSection as string, /Automation Implementation Notes/);
    });

    it('treats the untouched default skeleton as blank', () => {
        const raw = buildContextFileContent(testCase);
        const userSection = parseUserSection(raw) as string;
        assert.equal(isBlankUserSection(userSection), true);
    });

    it('treats a user-edited section as non-blank', () => {
        const edited = 'Existing test file: tests/test_login.py';
        assert.equal(isBlankUserSection(edited), false);
    });
});

describe('testCaseContext.buildContextFileContent', () => {
    it('preserves a supplied user section verbatim', () => {
        const content = buildContextFileContent(testCase, 'Existing test file: tests/test_login.py');
        assert.match(content, /Existing test file: tests\/test_login\.py/);
        assert.doesNotMatch(content, /Automation Implementation Notes/);
    });

    it('falls back to the default skeleton when no user section is supplied', () => {
        const content = buildContextFileContent(testCase, undefined);
        assert.match(content, /Automation Implementation Notes/);
        assert.match(content, /Database Validation/);
    });
});

describe('testCaseContext.ensureTestCaseContext', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-testcase-context-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('creates a populated file on first call', () => {
        const result = ensureTestCaseContext(tmpDir, testCase);
        assert.equal(result.created, true);
        assert.equal(result.unmanaged, false);
        assert.equal(fs.existsSync(result.filePath), true);
        const content = fs.readFileSync(result.filePath, 'utf8');
        assert.match(content, /# TC001 — Successful Login/);
        assert.match(content, /Automation Implementation Notes/);
    });

    it('preserves user-edited content on a second call after the source test case changes', () => {
        const first = ensureTestCaseContext(tmpDir, testCase);
        let content = fs.readFileSync(first.filePath, 'utf8');
        content = content.replace('- Existing test file:', '- Existing test file: tests/test_login.py');
        fs.writeFileSync(first.filePath, content, 'utf8');

        const changedTestCase: NormalizedTestCase = { ...testCase, title: 'Successful Login (updated)' };
        const second = ensureTestCaseContext(tmpDir, changedTestCase);

        assert.equal(second.created, false);
        assert.equal(second.unmanaged, false);
        const finalContent = fs.readFileSync(second.filePath, 'utf8');
        assert.match(finalContent, /Successful Login \(updated\)/);
        assert.match(finalContent, /tests\/test_login\.py/);
    });

    it('does not rewrite the file when nothing changed', () => {
        const first = ensureTestCaseContext(tmpDir, testCase);
        const mtimeBefore = fs.statSync(first.filePath).mtimeMs;
        ensureTestCaseContext(tmpDir, testCase);
        const mtimeAfter = fs.statSync(first.filePath).mtimeMs;
        assert.equal(mtimeAfter, mtimeBefore);
    });

    it('leaves a file with no sentinel untouched and reports it as unmanaged', () => {
        const dir = path.join(tmpDir, '.frameworkpilot', 'testcase-context');
        fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(dir, 'TC001.md');
        fs.writeFileSync(filePath, '# Hand-written file with no marker\n', 'utf8');

        const result = ensureTestCaseContext(tmpDir, testCase);
        assert.equal(result.unmanaged, true);
        assert.equal(fs.readFileSync(filePath, 'utf8'), '# Hand-written file with no marker\n');
    });
});

describe('testCaseContext.readUserSectionForGeneration', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-testcase-context-read-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns undefined when no context file exists', () => {
        assert.equal(readUserSectionForGeneration(tmpDir, testCase), undefined);
    });

    it('returns undefined when the user section is still the untouched default', () => {
        ensureTestCaseContext(tmpDir, testCase);
        assert.equal(readUserSectionForGeneration(tmpDir, testCase), undefined);
    });

    it('returns the user section when it has been edited', () => {
        const result = ensureTestCaseContext(tmpDir, testCase);
        const edited = fs.readFileSync(result.filePath, 'utf8').replace(
            '- Existing test file:',
            '- Existing test file: tests/test_login.py'
        );
        fs.writeFileSync(result.filePath, edited, 'utf8');

        const userContent = readUserSectionForGeneration(tmpDir, testCase);
        assert.notEqual(userContent, undefined);
        assert.match(userContent as string, /tests\/test_login\.py/);
        assert.doesNotMatch(userContent as string, /# TC001 — Successful Login/);
    });

    it('falls back to the whole file for an unmanaged (no-sentinel) file', () => {
        const dir = path.join(tmpDir, '.frameworkpilot', 'testcase-context');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'TC001.md'), 'Hand-written notes, no marker.\n', 'utf8');

        assert.equal(readUserSectionForGeneration(tmpDir, testCase), 'Hand-written notes, no marker.');
    });
});
