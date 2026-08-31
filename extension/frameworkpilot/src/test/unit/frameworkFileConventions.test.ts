import * as assert from 'assert/strict';
import { classifyFileRole } from '../../frameworkFileConventions';
import { FrameworkConfig } from '../../frameworkConfig';

const config: FrameworkConfig = {
    frameworkMode: 'new',
    language: 'python',
    automationTool: 'playwright',
    testRunner: 'pytest',
    architecture: 'page_object_model',
    testDataApproach: 'json',
};

describe('frameworkFileConventions.classifyFileRole', () => {
    it('classifies representative Python/Playwright/pytest project files by role', () => {
        const cases: [string, string][] = [
            ['pages/login_page.py', 'page_object'],
            ['tests/test_login.py', 'test'],
            ['conftest.py', 'fixture'],
            ['pytest.ini', 'config'],
            ['requirements.txt', 'dependency_manifest'],
            ['instructions.md', 'documentation'],
        ];

        for (const [relativePath, expectedRole] of cases) {
            assert.equal(classifyFileRole(relativePath, config), expectedRole, relativePath);
        }
    });

    it('falls back to "other" for a file matching no known convention', () => {
        assert.equal(classifyFileRole('random_notes.xyz', config), 'other');
    });
});
