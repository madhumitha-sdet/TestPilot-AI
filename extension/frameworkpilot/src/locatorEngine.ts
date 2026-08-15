/**
 * Deterministic locator generation and scoring.
 *
 * This module is intentionally isolated from VS Code and Playwright.
 * It knows nothing about how an element was captured or how uniqueness
 * is verified — both are supplied by the caller. This keeps the scoring
 * logic pure and unit-testable, and keeps it swappable/extendable when
 * AI-assisted ranking is added later (the AI layer can call this same
 * function and re-rank its output, rather than replacing it).
 */

/** One segment of the path from <html> down to the captured element. */
export interface DomPathSegment {
    tagName: string;
    /** 1-based position among sibling elements of the same tagName. */
    nthOfType: number;
}

/**
 * Raw information gathered from the live page about one clicked element.
 * Produced by the Playwright-side capture script — this module only reads it.
 */
export interface CapturedElementInfo {
    tagName: string;
    id?: string;
    classes: string[];
    /** All attributes present on the element, e.g. { type: 'submit', name: 'email' }. */
    attributes: Record<string, string>;
    textContent?: string;
    /** Accessible role, e.g. 'button', 'textbox'. */
    ariaRole?: string;
    /** Accessible name from aria-label, if present. */
    ariaLabel?: string;
    /** Text of an associated <label> (via for= or wrapping), if any. */
    labelText?: string;
    /** Value of the data-testid attribute, if present. */
    testId?: string;
    /** Structural path from <html> to this element, used for CSS/XPath fallback. */
    domPath: DomPathSegment[];
}

export type LocatorType = 'role' | 'label' | 'text' | 'testId' | 'css' | 'xpath';

export interface LocatorCandidate {
    type: LocatorType;
    /** Ready-to-use Playwright code, e.g. "page.getByRole('button', { name: 'Submit' })". */
    code: string;
    /** The raw selector/value this candidate resolves to; used for uniqueness checking. */
    selectorValue: string;
    score: number;
    rationale: string;
    isUnique: boolean;
    recommended: boolean;
}

/**
 * Given a candidate locator, returns how many elements on the live page
 * it currently matches. Supplied by the caller (Playwright-aware code),
 * never implemented in this file.
 */
export type UniquenessChecker = (candidate: LocatorCandidate) => Promise<number>;

/** Base score per type before penalties, reflecting general semantic stability. */
const BASE_SCORES: Record<LocatorType, number> = {
    testId: 95,
    role: 90,
    label: 85,
    text: 65,
    css: 55,
    xpath: 30,
};

/** Priority order used only to break ties between equally-scored candidates. */
const TYPE_PRIORITY: LocatorType[] = ['testId', 'role', 'label', 'text', 'css', 'xpath'];

/**
 * Heuristics for attribute values that look machine-generated rather than
 * author-chosen (hashes, UUIDs, numeric/random suffixes). Locators built on
 * these are penalized because they're likely to change on rebuild.
 */
function looksDynamic(value: string): boolean {
    const patterns = [
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, // UUID
        /^(?=.*\d)(?=.*[a-z])[a-z0-9]{10,}$/i, // long alphanumeric hash-like string
        /--?\d{3,}$/, // trailing numeric suffix like "-1029"
        /^css-[a-z0-9]+$/i, // CSS-in-JS generated classes
    ];
    return patterns.some((p) => p.test(value));
}

function buildRoleCandidate(el: CapturedElementInfo): LocatorCandidate | null {
    if (!el.ariaRole) {
        return null;
    }
    const name = el.ariaLabel || el.textContent?.trim();
    const code = name
        ? `page.getByRole('${el.ariaRole}', { name: '${name.replace(/'/g, "\\'")}' })`
        : `page.getByRole('${el.ariaRole}')`;

    return {
        type: 'role',
        code,
        selectorValue: `role=${el.ariaRole}${name ? `[name="${name}"]` : ''}`,
        score: BASE_SCORES.role - (name ? 0 : 15), // less specific without an accessible name
        rationale: name
            ? 'Matches on accessibility role and accessible name — resilient to markup/styling changes.'
            : 'Matches on accessibility role only; no accessible name was found, reducing specificity.',
        isUnique: false,
        recommended: false,
    };
}

function buildLabelCandidate(el: CapturedElementInfo): LocatorCandidate | null {
    if (!el.labelText) {
        return null;
    }
    const text = el.labelText.trim();
    return {
        type: 'label',
        code: `page.getByLabel('${text.replace(/'/g, "\\'")}')`,
        selectorValue: `label=${text}`,
        score: BASE_SCORES.label,
        rationale: 'Matches via an associated <label> — tied to user-facing text, resilient to structural changes.',
        isUnique: false,
        recommended: false,
    };
}

function buildTextCandidate(el: CapturedElementInfo): LocatorCandidate | null {
    const text = el.textContent?.trim();
    if (!text || text.length > 80) {
        return null; // skip empty or very long text — unreliable as a locator basis
    }
    return {
        type: 'text',
        code: `page.getByText('${text.replace(/'/g, "\\'")}')`,
        selectorValue: `text=${text}`,
        score: BASE_SCORES.text,
        rationale: 'Matches on visible text — readable, but breaks if copy changes or text isn\'t unique.',
        isUnique: false,
        recommended: false,
    };
}

function buildTestIdCandidate(el: CapturedElementInfo): LocatorCandidate | null {
    if (!el.testId) {
        return null;
    }
    return {
        type: 'testId',
        code: `page.getByTestId('${el.testId}')`,
        selectorValue: `[data-testid="${el.testId}"]`,
        score: BASE_SCORES.testId,
        rationale: 'Matches a dedicated data-testid attribute — explicitly intended for stable test automation.',
        isUnique: false,
        recommended: false,
    };
}

function buildCssCandidate(el: CapturedElementInfo): LocatorCandidate {
    if (el.id) {
        const dynamic = looksDynamic(el.id);
        return {
            type: 'css',
            code: `page.locator('#${el.id}')`,
            selectorValue: `#${el.id}`,
            score: BASE_SCORES.css - (dynamic ? 30 : 0),
            rationale: dynamic
                ? 'Uses element id, but the id looks auto-generated and may not survive a rebuild.'
                : 'Uses element id — short and direct, but ids are sometimes reused or reassigned.',
            isUnique: false,
            recommended: false,
        };
    }

    // Fallback: build a structural CSS path from domPath.
    const pathSelector = el.domPath
        .map((seg) => `${seg.tagName.toLowerCase()}:nth-of-type(${seg.nthOfType})`)
        .join(' > ');
    const depthPenalty = Math.min(35, el.domPath.length * 5);

    return {
        type: 'css',
        code: `page.locator('${pathSelector}')`,
        selectorValue: pathSelector,
        score: BASE_SCORES.css - 15 - depthPenalty, // no id available is already a weaker signal
        rationale: `No id available; built from DOM structure (${el.domPath.length} levels deep) — fragile to markup changes.`,
        isUnique: false,
        recommended: false,
    };
}

function buildXPathCandidate(el: CapturedElementInfo): LocatorCandidate {
    const xpath =
        '//' + el.domPath.map((seg) => `${seg.tagName.toLowerCase()}[${seg.nthOfType}]`).join('/');
    const depthPenalty = Math.min(40, el.domPath.length * 6);

    return {
        type: 'xpath',
        code: `page.locator('xpath=${xpath}')`,
        selectorValue: xpath,
        score: BASE_SCORES.xpath - depthPenalty,
        rationale: `Absolute structural path (${el.domPath.length} levels deep) — most fragile option, breaks on any layout change.`,
        isUnique: false,
        recommended: false,
    };
}

/**
 * Builds locator candidates for a captured element, verifies each one's
 * uniqueness against the live page via the supplied checker, and marks
 * exactly one candidate as recommended.
 *
 * Candidates that don't match exactly one element on the page are kept
 * in the result (so the user can still see and understand them) but are
 * disqualified from scoring/recommendation — score is floored to 0 and
 * isUnique is false.
 */
export async function buildLocatorCandidates(
    el: CapturedElementInfo,
    checkUniqueness: UniquenessChecker
): Promise<LocatorCandidate[]> {

    const candidates: LocatorCandidate[] = [
        buildRoleCandidate(el),
        buildLabelCandidate(el),
        buildTextCandidate(el),
        buildTestIdCandidate(el),
        buildCssCandidate(el),
        buildXPathCandidate(el),
    ].filter((c): c is LocatorCandidate => c !== null);

    for (const candidate of candidates) {
        const matchCount = await checkUniqueness(candidate);
        candidate.isUnique = matchCount === 1;
        if (!candidate.isUnique) {
            candidate.score = 0;
            candidate.rationale += ` (Disqualified: matched ${matchCount} elements on the page, not 1.)`;
        }
    }

    const uniqueCandidates = candidates.filter((c) => c.isUnique);
    if (uniqueCandidates.length > 0) {
        const best = uniqueCandidates.reduce((top, current) => {
            if (current.score !== top.score) {
                return current.score > top.score ? current : top;
            }
            // Tie-break by type priority.
            return TYPE_PRIORITY.indexOf(current.type) < TYPE_PRIORITY.indexOf(top.type)
                ? current
                : top;
        });
        best.recommended = true;
    }

    return candidates;
}