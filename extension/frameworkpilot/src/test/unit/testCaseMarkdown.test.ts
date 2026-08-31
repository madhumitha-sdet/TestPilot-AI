import * as assert from 'assert/strict';
import { generateMarkdown, parseMarkdownToTestCase } from '../../testCaseMarkdown';
import { NormalizedTestCase } from '../../testCaseModel';

describe('testCaseMarkdown', () => {
    it('round-trips a test case through generateMarkdown and parseMarkdownToTestCase', () => {
        const original: NormalizedTestCase = {
            id: 'TC001',
            title: 'Login with valid credentials',
            source: 'local',
            description: 'Verify a user can log in.',
            steps: ['Navigate to the login page', 'Enter username "jdoe"', 'Click Login'],
            expectedResults: ['The user lands on the dashboard'],
        };

        const markdown = generateMarkdown(original);
        const parsed = parseMarkdownToTestCase(markdown, 'fallback-id', 'fallback-title', 'ado');

        assert.equal(parsed.id, original.id);
        assert.equal(parsed.title, original.title);
        assert.equal(parsed.source, original.source);
        assert.equal(parsed.description, original.description);
        assert.deepEqual(parsed.steps, original.steps);
        assert.deepEqual(parsed.expectedResults, original.expectedResults);
    });

    it('degrades gracefully when Steps and Expected Results sections are missing', () => {
        const minimalMarkdown = '# TC002 - Bare test case\n\n## Description\n\nJust a description, nothing else.\n';

        const parsed = parseMarkdownToTestCase(minimalMarkdown, 'fallback-id', 'fallback-title', 'local');

        assert.equal(parsed.id, 'TC002');
        assert.equal(parsed.title, 'Bare test case');
        assert.equal(parsed.description, 'Just a description, nothing else.');
        assert.deepEqual(parsed.steps, []);
        assert.deepEqual(parsed.expectedResults, []);
    });
});
