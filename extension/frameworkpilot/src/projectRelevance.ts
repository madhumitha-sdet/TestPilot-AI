import { NormalizedTestCase } from './testCaseModel';
import { TestCaseMapping } from './testCaseMapping';
import { TestCaseData } from './testDataModel';
import { FileRole } from './frameworkFileConventions';

export interface ScoredFile {
    relativePath: string;
    role: FileRole;
    score: number;
    /** Always included regardless of score — needed to understand the framework's conventions for every test case. */
    isFoundational: boolean;
}

const FOUNDATIONAL_ROLES: FileRole[] = ['base_class', 'fixture', 'config', 'dependency_manifest'];

function extractKeywords(testCase: NormalizedTestCase, mapping: TestCaseMapping, testData: TestCaseData): string[] {
    const words = new Set<string>();
    const addWords = (text: string) => {
        text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2).forEach((w) => words.add(w));
    };

    addWords(testCase.title);
    (testCase.steps || []).forEach(addWords);
    mapping.steps.forEach((s) => addWords(s.stepText));
    testData.fields.forEach((f) => addWords(f.name));

    return Array.from(words);
}

/**
 * Scores each file's relevance to the given test case via filename/path
 * keyword overlap — deterministic, no LLM call. Foundational-role files
 * (base classes, fixtures, config, dependency manifests) are always
 * marked included regardless of score.
 */
export function scoreFileRelevance(
    files: { relativePath: string; role: FileRole }[],
    testCase: NormalizedTestCase,
    mapping: TestCaseMapping,
    testData: TestCaseData
): ScoredFile[] {
    const keywords = extractKeywords(testCase, mapping, testData);

    return files.map((file) => {
        const isFoundational = FOUNDATIONAL_ROLES.includes(file.role);
        const lowerPath = file.relativePath.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
            if (lowerPath.includes(kw)) {
                score += 1;
            }
        }
        if (file.role === 'page_object' || file.role === 'test') {
            score += 1;
        }
        return { relativePath: file.relativePath, role: file.role, score, isFoundational };
    });
}