import * as fs from 'fs';
import * as path from 'path';
import { NormalizedTestCase } from './testCaseModel';
import { parseMarkdownToTestCase } from './testCaseMarkdown';

/**
 * Reads a user-selected local Markdown test case file and normalizes it.
 * This file is user-owned input — only ever read, never written or
 * moved by FrameworkPilot.
 */
export function readLocalTestCaseFile(filePath: string): NormalizedTestCase {
    const raw = fs.readFileSync(filePath, 'utf8');
    const fallbackTitle = path.basename(filePath, path.extname(filePath));

    const testCase = parseMarkdownToTestCase(raw, fallbackTitle, fallbackTitle, 'local');
    testCase.filePath = filePath;
    return testCase;
}