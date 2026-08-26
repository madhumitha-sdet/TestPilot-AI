import * as fs from 'fs';

const EXCLUDED_DIR_NAMES = new Set([
    '.git', '.frameworkpilot', 'node_modules', '__pycache__', '.venv', 'venv',
    'reports', 'screenshots', 'logs', 'dist', 'build', '.pytest_cache',
]);

const EXCLUDED_FILENAME_PATTERNS: RegExp[] = [
    /^\.env(\..+)?$/i,
    /\.pem$/i,
    /\.key$/i,
    /secret/i,
    /credential/i,
    /^id_rsa/i,
    /^id_ed25519/i,
];

const ALLOWED_FILENAME_EXCEPTIONS: RegExp[] = [
    /^\.env\.example$/i,
    /^\.env\.sample$/i,
];

const TEXT_FILE_EXTENSIONS = new Set([
    '.py', '.ts', '.js', '.json', '.yaml', '.yml', '.ini', '.cfg', '.toml',
    '.md', '.txt', '.cs', '.java', '.feature', '.robot',
]);

const SECRET_CONTENT_PATTERN = /(api[_-]?key|password|secret|token)\s*[:=]\s*['"]?[A-Za-z0-9_\-.]{6,}['"]?/i;

export function isExcludedDirectory(name: string): boolean {
    return EXCLUDED_DIR_NAMES.has(name);
}

export function isExcludedFilename(name: string): boolean {
    if (ALLOWED_FILENAME_EXCEPTIONS.some((p) => p.test(name))) {
        return false;
    }
    return EXCLUDED_FILENAME_PATTERNS.some((p) => p.test(name));
}

export function isTextFile(name: string): boolean {
    const dot = name.lastIndexOf('.');
    if (dot === -1) {
        return false;
    }
    return TEXT_FILE_EXTENSIONS.has(name.slice(dot).toLowerCase());
}

/**
 * Reads a file's content only if it passes filename/extension checks and
 * doesn't appear to contain an inline secret-like value. Returns
 * undefined (content withheld) rather than throwing, so callers can still
 * list the file by path/role without exposing its content.
 */
export function readIfSafe(absolutePath: string, filename: string): string | undefined {
    if (isExcludedFilename(filename) || !isTextFile(filename)) {
        return undefined;
    }
    let content: string;
    try {
        content = fs.readFileSync(absolutePath, 'utf8');
    } catch {
        return undefined;
    }
    if (SECRET_CONTENT_PATTERN.test(content)) {
        return undefined;
    }
    return content;
}