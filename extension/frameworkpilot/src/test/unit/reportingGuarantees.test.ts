import * as assert from 'assert/strict';
import { ensureScreenshotOnFailureHook, ensurePytestHtmlReporting } from '../../reportingGuarantees';
import { ProposedFileChange } from '../../llmAgent';

describe('reportingGuarantees.ensureScreenshotOnFailureHook', () => {
    it('creates a root conftest.py with the hook when none was proposed', () => {
        const changes: ProposedFileChange[] = [];
        ensureScreenshotOnFailureHook(changes);

        const conftest = changes.find((c) => c.filePath === 'conftest.py');
        assert.notEqual(conftest, undefined);
        assert.equal(conftest?.action, 'create');
        assert.match(conftest?.content || '', /def pytest_runtest_makereport/);
        assert.match(conftest?.content || '', /pytest_html import extras/);
    });

    it('appends the hook to an LLM-proposed conftest.py that lacks one', () => {
        const changes: ProposedFileChange[] = [
            { filePath: 'conftest.py', action: 'create', content: "import pytest\n\n@pytest.fixture\ndef page():\n    pass\n" },
        ];
        ensureScreenshotOnFailureHook(changes);

        assert.equal(changes.length, 1);
        assert.match(changes[0].content || '', /def page\(\):/);
        assert.match(changes[0].content || '', /def pytest_runtest_makereport/);
    });

    it('does not duplicate the hook if the LLM already defined its own', () => {
        const ownHook = "import pytest\n\ndef pytest_runtest_makereport(item, call):\n    pass\n";
        const changes: ProposedFileChange[] = [{ filePath: 'conftest.py', action: 'create', content: ownHook }];
        ensureScreenshotOnFailureHook(changes);

        assert.equal(changes[0].content, ownHook);
    });

    it('leaves a reuse_only conftest.py untouched and does not add a competing one', () => {
        const changes: ProposedFileChange[] = [
            { filePath: 'conftest.py', action: 'reuse_only', reason: 'already provides fixtures' },
        ];
        ensureScreenshotOnFailureHook(changes);

        assert.equal(changes.length, 1);
        assert.equal(changes[0].action, 'reuse_only');
        assert.equal(changes[0].content, undefined);
    });
});

describe('reportingGuarantees.ensurePytestHtmlReporting', () => {
    it('creates a minimal pytest.ini with --html when none was proposed', () => {
        const changes: ProposedFileChange[] = [];
        ensurePytestHtmlReporting(changes);

        const ini = changes.find((c) => c.filePath === 'pytest.ini');
        assert.notEqual(ini, undefined);
        assert.match(ini?.content || '', /\[pytest\]/);
        assert.match(ini?.content || '', /--html=reports\/report\.html/);
    });

    it('appends --html to an existing addopts line without discarding it', () => {
        const changes: ProposedFileChange[] = [
            { filePath: 'pytest.ini', action: 'create', content: '[pytest]\naddopts = -v --tb=short\n' },
        ];
        ensurePytestHtmlReporting(changes);

        assert.match(changes[0].content || '', /addopts = -v --tb=short --html=reports\/report\.html --self-contained-html/);
    });

    it('inserts an addopts line under [pytest] when none exists', () => {
        const changes: ProposedFileChange[] = [{ filePath: 'pytest.ini', action: 'create', content: '[pytest]\n' }];
        ensurePytestHtmlReporting(changes);

        assert.match(changes[0].content || '', /\[pytest\]\naddopts = --html=reports\/report\.html/);
    });

    it('does not duplicate --html if already present', () => {
        const original = '[pytest]\naddopts = --html=reports/report.html --self-contained-html\n';
        const changes: ProposedFileChange[] = [{ filePath: 'pytest.ini', action: 'create', content: original }];
        ensurePytestHtmlReporting(changes);

        assert.equal(changes[0].content, original);
    });

    it('skips entirely when the LLM configured pytest via pyproject.toml', () => {
        const changes: ProposedFileChange[] = [
            { filePath: 'pyproject.toml', action: 'create', content: '[tool.pytest.ini_options]\n' },
        ];
        ensurePytestHtmlReporting(changes);

        assert.equal(changes.some((c) => c.filePath === 'pytest.ini'), false);
    });

    it('leaves a reuse_only pytest.ini untouched', () => {
        const changes: ProposedFileChange[] = [
            { filePath: 'pytest.ini', action: 'reuse_only', reason: 'already configured' },
        ];
        ensurePytestHtmlReporting(changes);

        assert.equal(changes.length, 1);
        assert.equal(changes[0].content, undefined);
    });
});
