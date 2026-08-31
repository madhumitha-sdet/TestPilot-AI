import * as assert from 'assert/strict';
import { scoreFileRelevance } from '../../projectRelevance';
import { NormalizedTestCase } from '../../testCaseModel';
import { TestCaseMapping } from '../../testCaseMapping';
import { TestCaseData } from '../../testDataModel';

const testCase: NormalizedTestCase = {
    id: 'TC001',
    title: 'Login with valid credentials',
    source: 'local',
    steps: ['Enter username', 'Enter password', 'Click Login'],
};

const mapping: TestCaseMapping = {
    testCaseId: 'TC001',
    testCasePath: 'TC001.md',
    activeStepIndex: null,
    steps: [],
};

const testData: TestCaseData = {
    testCaseId: 'TC001',
    testCasePath: 'TC001.md',
    fields: [{ name: 'username', required: true }, { name: 'password', required: true }],
};

describe('projectRelevance.scoreFileRelevance', () => {
    it('scores files higher when their path overlaps with test case/step/field keywords', () => {
        const scored = scoreFileRelevance(
            [
                { relativePath: 'pages/login_page.py', role: 'page_object' },
                { relativePath: 'pages/checkout_page.py', role: 'page_object' },
            ],
            testCase,
            mapping,
            testData
        );

        const login = scored.find((f) => f.relativePath === 'pages/login_page.py')!;
        const checkout = scored.find((f) => f.relativePath === 'pages/checkout_page.py')!;

        assert.ok(login.score > checkout.score);
    });

    it('always marks foundational-role files as included regardless of keyword score', () => {
        const scored = scoreFileRelevance(
            [{ relativePath: 'conftest.py', role: 'fixture' }],
            testCase,
            mapping,
            testData
        );

        assert.equal(scored[0].isFoundational, true);
        assert.equal(scored[0].score, 0); // no keyword overlap, and fixture gets no role bonus
    });
});
