import * as assert from 'assert/strict';
import { buildLocatorCandidates, CapturedElementInfo, LocatorCandidate } from '../../locatorEngine';

function baseElement(overrides: Partial<CapturedElementInfo> = {}): CapturedElementInfo {
    return {
        tagName: 'input',
        classes: [],
        attributes: {},
        domPath: [{ tagName: 'body', nthOfType: 1 }, { tagName: 'input', nthOfType: 1 }],
        ...overrides,
    };
}

const alwaysUnique = async (_c: LocatorCandidate) => 1;

describe('locatorEngine', () => {
    it('scores a role candidate with an accessible name higher than one without', async () => {
        const withName = await buildLocatorCandidates(
            baseElement({ ariaRole: 'button', textContent: 'Submit' }),
            alwaysUnique
        );
        const roleCandidate = withName.find((c) => c.type === 'role')!;
        assert.equal(roleCandidate.score, 90);

        const withoutName = await buildLocatorCandidates(
            baseElement({ ariaRole: 'button' }),
            alwaysUnique
        );
        const roleCandidateNoName = withoutName.find((c) => c.type === 'role')!;
        assert.equal(roleCandidateNoName.score, 75);
    });

    it('penalizes a CSS id that looks machine-generated', async () => {
        const dynamic = await buildLocatorCandidates(
            baseElement({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }),
            alwaysUnique
        );
        const stable = await buildLocatorCandidates(
            baseElement({ id: 'login-submit-button' }),
            alwaysUnique
        );

        const dynamicCss = dynamic.find((c) => c.type === 'css')!;
        const stableCss = stable.find((c) => c.type === 'css')!;

        assert.equal(dynamicCss.score, 25); // 55 - 30
        assert.equal(stableCss.score, 55);
        assert.match(dynamicCss.rationale, /auto-generated/);
    });

    it('disqualifies a candidate that does not match exactly one element on the page', async () => {
        const checkUniqueness = async (c: LocatorCandidate) => (c.type === 'testId' ? 3 : 1);
        const candidates = await buildLocatorCandidates(
            baseElement({ testId: 'username-input', id: 'username' }),
            checkUniqueness
        );

        const testIdCandidate = candidates.find((c) => c.type === 'testId')!;
        assert.equal(testIdCandidate.isUnique, false);
        assert.equal(testIdCandidate.score, 0);
        assert.match(testIdCandidate.rationale, /Disqualified: matched 3 elements/);
    });

    it('recommends exactly one unique candidate, preferring the highest score', async () => {
        const candidates = await buildLocatorCandidates(
            baseElement({
                testId: 'email-input',
                ariaRole: 'textbox',
                ariaLabel: 'Email',
                id: 'email',
            }),
            alwaysUnique
        );

        const recommended = candidates.filter((c) => c.recommended);
        assert.equal(recommended.length, 1);
        assert.equal(recommended[0].type, 'testId'); // 95 beats role's 90
    });

    it('recommends nothing when no candidate is unique', async () => {
        const neverUnique = async (_c: LocatorCandidate) => 0;
        const candidates = await buildLocatorCandidates(
            baseElement({ ariaRole: 'button', textContent: 'Submit' }),
            neverUnique
        );

        assert.equal(candidates.some((c) => c.recommended), false);
    });
});
