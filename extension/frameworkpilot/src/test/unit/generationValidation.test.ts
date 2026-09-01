import * as assert from 'assert/strict';
import {
    findAsyncViolations,
    findMissingFoundationRoles,
    findBrokenLocalImports,
    validateGeneratedProject,
} from '../../generationValidation';
import { ProposedFileChange } from '../../llmAgent';
import { FrameworkConfig } from '../../frameworkConfig';

const config: FrameworkConfig = {
    frameworkMode: 'new',
    language: 'python',
    automationTool: 'playwright',
    testRunner: 'pytest',
    architecture: 'page_object_model',
    testDataApproach: 'json',
};

function change(filePath: string, content: string, action: ProposedFileChange['action'] = 'create'): ProposedFileChange {
    return { filePath, action, content };
}

describe('generationValidation.findAsyncViolations', () => {
    it('flags a file using async def', () => {
        const warnings = findAsyncViolations([change('pages/login_page.py', 'async def login(self):\n    pass\n')]);
        assert.equal(warnings.length, 1);
        assert.equal(warnings[0].category, 'sync');
        assert.match(warnings[0].message, /pages\/login_page\.py/);
    });

    it('flags a file using await without async def', () => {
        const warnings = findAsyncViolations([change('pages/login_page.py', 'def login(self):\n    await self.page.click("#x")\n')]);
        assert.equal(warnings.length, 1);
    });

    it('does not flag genuinely sync code', () => {
        const warnings = findAsyncViolations([change('pages/login_page.py', 'def login(self):\n    self.page.click("#x")\n')]);
        assert.deepEqual(warnings, []);
    });

    it('ignores non-Python files and reuse_only entries', () => {
        const warnings = findAsyncViolations([
            change('README.md', 'await this is not python'),
            { filePath: 'pages/existing.py', action: 'reuse_only', reason: 'no change needed' },
        ]);
        assert.deepEqual(warnings, []);
    });
});

describe('generationValidation.findMissingFoundationRoles', () => {
    it('flags every structural role missing from the proposed changes', () => {
        const warnings = findMissingFoundationRoles([change('requirements.txt', 'pytest\n')], config);
        const labels = warnings.map((w) => w.message);
        assert.ok(labels.some((m) => /Page Object/.test(m)));
        assert.ok(labels.some((m) => /test file/.test(m)));
        assert.ok(labels.some((m) => /Base Page/.test(m)));
    });

    it('does not flag a role that is represented among proposed files', () => {
        const changes = [
            change('pages/login_page.py', 'class LoginPage:\n    pass\n'),
            change('tests/test_login.py', 'def test_login():\n    pass\n'),
        ];
        const warnings = findMissingFoundationRoles(changes, config);
        assert.ok(!warnings.some((w) => /Page Object/.test(w.message)));
        assert.ok(!warnings.some((w) => /test file/.test(w.message)));
    });
});

describe('generationValidation.findBrokenLocalImports', () => {
    it('flags an absolute local import that resolves to no known file', () => {
        const changes = [change('tests/test_login.py', 'from pages.checkout_page import CheckoutPage\n')];
        const warnings = findBrokenLocalImports(changes);
        assert.equal(warnings.length, 1);
        assert.match(warnings[0].message, /pages\.checkout_page/);
    });

    it('does not flag an absolute local import resolved among proposed changes', () => {
        const changes = [
            change('tests/test_login.py', 'from pages.login_page import LoginPage\n'),
            change('pages/login_page.py', 'class LoginPage:\n    pass\n'),
        ];
        assert.deepEqual(findBrokenLocalImports(changes), []);
    });

    it('resolves a relative import against the importing file\'s own directory', () => {
        const changes = [
            change('pages/login_page.py', 'from .base_page import BasePage\n'),
            change('pages/base_page.py', 'class BasePage:\n    pass\n'),
        ];
        assert.deepEqual(findBrokenLocalImports(changes), []);
    });

    it('flags an unresolved relative import', () => {
        const changes = [change('pages/login_page.py', 'from .base_page import BasePage\n')];
        const warnings = findBrokenLocalImports(changes);
        assert.equal(warnings.length, 1);
    });

    it('ignores stdlib and known third-party imports', () => {
        const changes = [change('tests/test_login.py', 'import pytest\nimport os\nfrom playwright.sync_api import Page\n')];
        assert.deepEqual(findBrokenLocalImports(changes), []);
    });

    it('resolves an import against an already-existing project file, not just proposed changes', () => {
        const changes = [change('tests/test_login.py', 'from pages.login_page import LoginPage\n')];
        const warnings = findBrokenLocalImports(changes, ['pages/login_page.py']);
        assert.deepEqual(warnings, []);
    });
});

describe('generationValidation.validateGeneratedProject', () => {
    it('only runs the foundation-completeness check when the project is empty', () => {
        const changes = [change('tests/test_login.py', 'def test_login():\n    pass\n')];

        const emptyWarnings = validateGeneratedProject(changes, config, { projectIsEmpty: true });
        const nonEmptyWarnings = validateGeneratedProject(changes, config, { projectIsEmpty: false });

        assert.ok(emptyWarnings.some((w) => w.category === 'foundation'));
        assert.ok(!nonEmptyWarnings.some((w) => w.category === 'foundation'));
    });

    it('combines async and import warnings regardless of project emptiness', () => {
        const changes = [change('tests/test_login.py', 'async def test_login():\n    from pages.missing import Missing\n')];
        const warnings = validateGeneratedProject(changes, config, { projectIsEmpty: false });
        assert.ok(warnings.some((w) => w.category === 'sync'));
        assert.ok(warnings.some((w) => w.category === 'import'));
    });
});
