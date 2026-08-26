/**
 * Deterministic (non-LLM) extraction of likely test-data field names from
 * test case step text. Pure pattern matching — no natural-language
 * understanding. Intended to catch common phrasings only; anything it
 * misses, the user adds manually in the Test Data panel.
 */

const KNOWN_FIELD_PATTERNS: { pattern: RegExp; fieldName: string }[] = [
    { pattern: /enter\s+username/i, fieldName: 'username' },
    { pattern: /enter\s+password/i, fieldName: 'password' },
    { pattern: /enter\s+email/i, fieldName: 'email' },
];

/** Matches phrasing like "Search for <value>" or "Enter <value> in ..." to extract a generic field name. */
const GENERIC_ENTER_PATTERN = /(?:enter|type|input)\s+(?:the\s+)?([a-zA-Z][a-zA-Z0-9 _-]{1,30}?)(?:\s+in\b|\s*$)/i;
const SEARCH_FOR_PATTERN = /search\s+for\s+([a-zA-Z0-9][a-zA-Z0-9 _-]{1,30}?)\s*$/i;

function toFieldName(rawText: string): string {
    return rawText.trim().toLowerCase().replace(/\s+/g, '_');
}

export function extractFieldNamesFromSteps(steps: string[]): string[] {
    const found = new Set<string>();

    for (const step of steps) {
        let matchedKnown = false;

        for (const { pattern, fieldName } of KNOWN_FIELD_PATTERNS) {
            if (pattern.test(step)) {
                found.add(fieldName);
                matchedKnown = true;
            }
        }

        if (matchedKnown) {
            continue;
        }

        const searchMatch = step.match(SEARCH_FOR_PATTERN);
        if (searchMatch) {
            found.add('search_term');
            continue;
        }

        const genericMatch = step.match(GENERIC_ENTER_PATTERN);
        if (genericMatch) {
            found.add(toFieldName(genericMatch[1]));
        }
    }

    return Array.from(found);
}