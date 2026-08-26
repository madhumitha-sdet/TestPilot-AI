import * as path from 'path';
import { NormalizedTestCase } from './testCaseModel';
import { TestCaseMapping } from './testCaseMapping';
import { TestCaseData } from './testDataModel';
import { FrameworkConfig } from './frameworkConfig';
import { listProjectFiles, ProjectFileEntry } from './projectInspector';
import { classifyFileRole } from './frameworkFileConventions';
import { scoreFileRelevance } from './projectRelevance';
import { readIfSafe, isExcludedFilename } from './secretsFilter';

export interface IncludedFile {
    relativePath: string;
    role: string;
    content: string;
}

export interface StructureEntry {
    relativePath: string;
    role: string;
    isDirectory: boolean;
}

export interface BoundedProjectContext {
    structureSummary: StructureEntry[];
    includedFiles: IncludedFile[];
    excludedForSize: string[];
    excludedForSecrets: string[];
}

const PER_FILE_CHAR_CAP = 3000;
const TOTAL_CHAR_BUDGET = 20000;
const FOUNDATIONAL_RESERVED_BUDGET = 8000;

/**
 * Builds a bounded, secret-safe view of the real project for the LLM:
 * a full structural summary (paths + roles, always complete) plus file
 * contents only for a relevance-ranked, budget-capped subset.
 *
 * forceIncludePaths lets a round-2 request (after the model returns
 * filesNeeded) guarantee specific files are read in full, ahead of the
 * normal relevance ranking.
 */
export function buildBoundedProjectContext(
    projectPath: string,
    frameworkConfig: FrameworkConfig,
    testCase: NormalizedTestCase,
    mapping: TestCaseMapping,
    testData: TestCaseData,
    forceIncludePaths: string[] = []
): BoundedProjectContext {
    const allFiles: ProjectFileEntry[] = listProjectFiles(projectPath);

    const structureSummary: StructureEntry[] = allFiles.map((f) => ({
        relativePath: f.relativePath,
        role: f.isDirectory ? 'directory' : classifyFileRole(f.relativePath, frameworkConfig),
        isDirectory: f.isDirectory,
    }));

    const roleTagged = allFiles
        .filter((f) => !f.isDirectory)
        .map((f) => ({ relativePath: f.relativePath, role: classifyFileRole(f.relativePath, frameworkConfig) }));

    const scored = scoreFileRelevance(roleTagged, testCase, mapping, testData);
    scored.sort((a, b) => {
        if (a.isFoundational !== b.isFoundational) {
            return a.isFoundational ? -1 : 1;
        }
        return b.score - a.score;
    });

    const forceSet = new Set(forceIncludePaths);
    const orderedCandidates = [
        ...scored.filter((s) => forceSet.has(s.relativePath)),
        ...scored.filter((s) => !forceSet.has(s.relativePath)),
    ];

    const includedFiles: IncludedFile[] = [];
    const excludedForSize: string[] = [];
    const excludedForSecrets: string[] = [];

    let foundationalBudgetUsed = 0;
    let totalBudgetUsed = 0;

    for (const candidate of orderedCandidates) {
        const filename = path.basename(candidate.relativePath);
        const absolutePath = path.join(projectPath, candidate.relativePath);
        const isForced = forceSet.has(candidate.relativePath);

        if (isExcludedFilename(filename)) {
            excludedForSecrets.push(candidate.relativePath);
            continue;
        }

        const budgetForThis = isForced ? PER_FILE_CHAR_CAP * 2 : PER_FILE_CHAR_CAP;
        const remainingPool = candidate.isFoundational
            ? FOUNDATIONAL_RESERVED_BUDGET - foundationalBudgetUsed
            : TOTAL_CHAR_BUDGET - totalBudgetUsed;

        if (!isForced && remainingPool <= 0) {
            excludedForSize.push(candidate.relativePath);
            continue;
        }

        const raw = readIfSafe(absolutePath, filename);
        if (raw === undefined) {
            excludedForSecrets.push(candidate.relativePath);
            continue;
        }

        const capped = raw.length > budgetForThis ? raw.slice(0, budgetForThis) + '\n... (truncated)' : raw;
        includedFiles.push({ relativePath: candidate.relativePath, role: candidate.role, content: capped });

        if (candidate.isFoundational) {
            foundationalBudgetUsed += capped.length;
        } else {
            totalBudgetUsed += capped.length;
        }
    }

    return { structureSummary, includedFiles, excludedForSize, excludedForSecrets };
}