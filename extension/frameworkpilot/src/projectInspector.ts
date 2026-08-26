import * as fs from 'fs';
import * as path from 'path';
import { isExcludedDirectory } from './secretsFilter';

export interface ProjectFileEntry {
    relativePath: string;
    isDirectory: boolean;
}

const MAX_ENTRIES = 300;

// FrameworkPilot configuration files, not part of the automation framework
// itself. Their presence must not make an otherwise-empty project count
// as "already has a framework" for bootstrap-detection purposes. This
// exclusion is scoped to isProjectEmpty() only — listProjectFiles() still
// reports these files normally as real project context.
const IGNORED_FILES_FOR_EMPTY_CHECK = new Set(['instructions.md', 'skill.md', '.ds_store', 'thumbs.db', 'desktop.ini']);

/** True if projectPath doesn't exist yet, or has no files/dirs besides ignored metadata. */
export function isProjectEmpty(projectPath: string): boolean {
    if (!fs.existsSync(projectPath)) {
        return true;
    }
    const entries = fs
        .readdirSync(projectPath)
        .filter((e) => !isExcludedDirectory(e))
        .filter((e) => !IGNORED_FILES_FOR_EMPTY_CHECK.has(e.toLowerCase()));
    return entries.length === 0;
}

/**
 * Deterministic, bounded listing of the real project's files, skipping
 * FrameworkPilot metadata and common noise directories. Gives the LLM real
 * project structure without requiring a tool-calling loop yet.
 */
export function listProjectFiles(projectPath: string): ProjectFileEntry[] {
    const results: ProjectFileEntry[] = [];

    function walk(dir: string, relBase: string): void {
        if (results.length >= MAX_ENTRIES || !fs.existsSync(dir)) {
            return;
        }
        for (const entry of fs.readdirSync(dir)) {
            if (isExcludedDirectory(entry)) {
                continue;
            }
            const fullPath = path.join(dir, entry);
            const relPath = path.join(relBase, entry);
            const stat = fs.statSync(fullPath);
            results.push({ relativePath: relPath, isDirectory: stat.isDirectory() });
            if (results.length >= MAX_ENTRIES) {
                return;
            }
            if (stat.isDirectory()) {
                walk(fullPath, relPath);
            }
        }
    }

    walk(projectPath, '');
    return results;
}