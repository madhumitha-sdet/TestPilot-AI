export type TestCaseSource = 'ado' | 'excel' | 'local';

/**
 * Normalized representation of a test case, independent of its original
 * source. Later phases (framework discovery, step mapping, code
 * generation) consume this model rather than depending on ADO/Excel/local
 * specifics directly.
 *
 * ADO INTEGRATION BOUNDARY (design note, not yet implemented):
 * backend/ado/client.py's AzureDevOpsClient.get_test_cases() already
 * returns a Python TestCase per work item (test_case_id, title,
 * description, expected_result, test_data). The extension (TypeScript)
 * and that Python backend are currently separate processes with no
 * bridge between them. Connecting them will require either invoking the
 * Python backend as a subprocess/API and mapping its TestCase fields
 * 1:1 onto NormalizedTestCase (steps would need deriving from
 * description/expected_result, since ADO's flat model has no discrete
 * step list the way this model expects), or reimplementing the ADO call
 * in TypeScript. Neither is done here — this comment exists so the next
 * iteration doesn't have to rediscover this boundary.
 */
export interface NormalizedTestCase {
    id: string;
    title: string;
    source: TestCaseSource;
    description?: string;
    steps: string[];
    expectedResults?: string[];
    /** Original Markdown content, kept for display purposes. */
    rawMarkdown?: string;
    /** Populated when the test case is backed by a file on disk. */
    filePath?: string;
}