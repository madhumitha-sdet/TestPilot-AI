import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { NormalizedTestCase } from './testCaseModel';
import { generateMarkdown } from './testCaseMarkdown';

export interface ExcelReadResult {
    testCases: NormalizedTestCase[];
    errors: string[];
}

function normalizeLabel(v: unknown): string {
    return String(v ?? '').trim().toLowerCase();
}

/**
 * Parses one worksheet into a NormalizedTestCase. Structure is DISCOVERED,
 * not hardcoded to fixed cell positions: metadata rows are found by
 * matching their label in column A, and the step table is located by
 * finding the row whose first cell reads "Step". Columns within that
 * table are located by header text, not fixed letters. This tolerates
 * sheets with a shifted layout or extra/blank rows.
 */
function parseSheet(sheetName: string, rows: unknown[][]): { testCase?: NormalizedTestCase; error?: string } {
    let id: string | undefined;
    let title: string | undefined;
    let description: string | undefined;
    let precondition: string | undefined;
    let headerRowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i] || [];
        const label = normalizeLabel(row[0]);
        const value = row[1] !== undefined && row[1] !== null ? String(row[1]).trim() : undefined;

        if (label === 'test case id' && value) { id = value; }
        else if (label === 'test case title' && value) { title = value; }
        else if (label === 'description' && value) { description = value; }
        else if (label === 'precondition' && value) { precondition = value; }
        else if (label === 'step') { headerRowIndex = i; break; }
    }

    if (!id) {
        return { error: `Sheet "${sheetName}": missing "Test Case ID" — skipped.` };
    }
    if (!title) {
        return { error: `Sheet "${sheetName}": missing "Test Case Title" — skipped.` };
    }
    if (headerRowIndex === -1) {
        return { error: `Sheet "${sheetName}": could not find the step table (a row starting with "Step") — skipped.` };
    }

    const headerRow = (rows[headerRowIndex] || []).map((c) => normalizeLabel(c));
    const stepTextCol = headerRow.indexOf('test step');
    const expectedCol = headerRow.indexOf('expected result');
    const testDataCol = headerRow.indexOf('test data');

    if (stepTextCol === -1) {
        return { error: `Sheet "${sheetName}": step table found but has no "Test Step" column — skipped.` };
    }

    const steps: string[] = [];
    const expectedResults: string[] = [];

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const stepText = row[stepTextCol] !== undefined && row[stepTextCol] !== null ? String(row[stepTextCol]).trim() : '';
        if (!stepText) {
            continue; // tolerate blank/trailing rows rather than failing the whole sheet
        }

        const testData = testDataCol !== -1 && row[testDataCol] !== undefined && row[testDataCol] !== null
            ? String(row[testDataCol]).trim()
            : '';
        steps.push(testData ? `${stepText} (Test Data: ${testData})` : stepText);

        const expected = expectedCol !== -1 && row[expectedCol] !== undefined && row[expectedCol] !== null
            ? String(row[expectedCol]).trim()
            : '';
        expectedResults.push(expected);
    }

    if (steps.length === 0) {
        return { error: `Sheet "${sheetName}": step table has no populated steps — skipped.` };
    }

    const fullDescription = precondition
        ? `${description || ''}${description ? '\n\n' : ''}Precondition: ${precondition}`
        : description;

    const testCase: NormalizedTestCase = {
        id,
        title,
        source: 'excel',
        description: fullDescription || undefined,
        steps,
        expectedResults: expectedResults.some((e) => e) ? expectedResults : undefined,
        // Synthetic identifier — no file on disk backs this. Reused as the
        // key for mapping/test-data workspaceState persistence, same as a
        // real filePath would be.
        filePath: `excel::${sheetName}`,
    };

    // In-memory preview only (never written to disk) — reuses the
    // existing deterministic Markdown generator so the Test Cases UI can
    // render Excel-derived test cases the same way as local ones, without
    // this being a second competing generator.
    testCase.rawMarkdown = generateMarkdown(testCase);

    return { testCase };
}

export function readExcelWorkbook(excelPath: string): ExcelReadResult {
    if (!excelPath) {
        return { testCases: [], errors: [] };
    }
    if (!fs.existsSync(excelPath)) {
        return { testCases: [], errors: [`Excel file not found: ${excelPath}`] };
    }

    let workbook: XLSX.WorkBook;
    try {
        workbook = XLSX.readFile(excelPath);
    } catch (err) {
        return { testCases: [], errors: [`Could not open workbook: ${err instanceof Error ? err.message : String(err)}`] };
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return { testCases: [], errors: ['Workbook contains no sheets.'] };
    }

    const testCases: NormalizedTestCase[] = [];
    const errors: string[] = [];

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];

        const { testCase, error } = parseSheet(sheetName, rows);
        if (testCase) { testCases.push(testCase); }
        if (error) { errors.push(error); }
    }

    return { testCases, errors };
}

/** Re-reads a single sheet on demand by its "excel::<sheetName>" identifier — used when a user selects an Excel-sourced test case. */
export function readExcelTestCaseBySyntheticPath(excelPath: string, syntheticPath: string): NormalizedTestCase {
    const prefix = 'excel::';
    if (!syntheticPath.startsWith(prefix)) {
        throw new Error(`Not an Excel test case identifier: ${syntheticPath}`);
    }
    const sheetName = syntheticPath.slice(prefix.length);

    if (!excelPath) {
        throw new Error('No Test Case Excel Workbook is configured.');
    }
    if (!fs.existsSync(excelPath)) {
        throw new Error(`Excel file not found: ${excelPath}`);
    }

    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found in workbook.`);
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
    const { testCase, error } = parseSheet(sheetName, rows);
    if (!testCase) {
        throw new Error(error || `Failed to parse sheet "${sheetName}".`);
    }
    return testCase;
}