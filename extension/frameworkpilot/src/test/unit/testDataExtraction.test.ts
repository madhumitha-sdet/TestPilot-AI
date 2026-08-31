import * as assert from 'assert/strict';
import { extractFieldNamesFromSteps } from '../../testDataExtraction';

describe('testDataExtraction', () => {
    it('extracts username, password, and email from known phrasings', () => {
        const fields = extractFieldNamesFromSteps([
            'Enter username "jdoe"',
            'Enter password "hunter2"',
            'Enter email "jdoe@example.com"',
        ]);
        assert.deepEqual(fields.sort(), ['email', 'password', 'username']);
    });

    it('falls back to the generic "enter X" pattern for unrecognized fields', () => {
        const fields = extractFieldNamesFromSteps(['Enter the phone number in the field']);
        assert.deepEqual(fields, ['phone_number']);
    });

    it('recognizes the "search for X" pattern as a search_term field', () => {
        const fields = extractFieldNamesFromSteps(['Search for wireless headphones']);
        assert.deepEqual(fields, ['search_term']);
    });

    it('returns no fields for steps with no matching pattern', () => {
        const fields = extractFieldNamesFromSteps(['Click the login button', 'Verify the page loads']);
        assert.deepEqual(fields, []);
    });
});
