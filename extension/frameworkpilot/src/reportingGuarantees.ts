import { ProposedFileChange } from './llmAgent';

/**
 * Empty-project-only deterministic guarantees for HTML reporting and
 * screenshot-on-failure evidence, mirroring extension.ts's existing
 * ensureRequiredDependencies/ensureSetupInstructions pattern: fill a gap
 * only if the LLM didn't already handle it, never clobber what it did
 * propose, and never touch a file explicitly marked reuse_only. The exact
 * hook implementation below is the proven, working, synchronous pattern
 * already validated in the reference TestAutomationFramework project —
 * reused here, not reinvented.
 */

const HTML_REPORT_FLAGS = '--html=reports/report.html --self-contained-html';

const SCREENSHOT_HOOK_MARKER = 'def pytest_runtest_makereport';

const SCREENSHOT_HOOK_BLOCK = [
    'import os',
    'import pytest',
    '',
    "SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reports', 'screenshots')",
    '',
    '',
    '@pytest.hookimpl(tryfirst=True, hookwrapper=True)',
    'def pytest_runtest_makereport(item, call):',
    '    outcome = yield',
    '    report = outcome.get_result()',
    "    extra = getattr(report, 'extra', [])",
    '',
    "    if report.when == 'call' and report.failed:",
    "        page = item.funcargs.get('page')",
    '        if page is not None:',
    '            os.makedirs(SCREENSHOT_DIR, exist_ok=True)',
    "            screenshot_path = os.path.join(SCREENSHOT_DIR, f'{item.name}.png')",
    '            page.screenshot(path=screenshot_path)',
    '',
    '            try:',
    '                from pytest_html import extras',
    '                extra.append(extras.image(screenshot_path))',
    '            except ImportError:',
    '                pass',
    '',
    '    report.extra = extra',
].join('\n');

/**
 * Guarantees a screenshot is captured on test failure and attached to the
 * pytest-html report. Appends to an LLM-proposed conftest.py only if it
 * doesn't already define its own pytest_runtest_makereport; creates a
 * root-level conftest.py (auto-discovered by pytest, no plugin
 * registration needed) if none was proposed; does nothing if conftest.py
 * is present as reuse_only (an explicit "no change needed" decision).
 */
export function ensureScreenshotOnFailureHook(changes: ProposedFileChange[]): void {
    const existing = changes.find((c) => c.filePath.toLowerCase() === 'conftest.py');

    if (!existing) {
        changes.push({
            filePath: 'conftest.py',
            action: 'create',
            content: `${SCREENSHOT_HOOK_BLOCK}\n`,
            reason: 'Guarantees a screenshot is captured on test failure and attached to the pytest-html report, matching the proven working pattern.',
        });
        return;
    }

    if (existing.action === 'reuse_only') {
        return;
    }

    if ((existing.content || '').includes(SCREENSHOT_HOOK_MARKER)) {
        return;
    }

    const base = (existing.content || '').replace(/\n+$/, '');
    existing.content = `${base}\n\n\n${SCREENSHOT_HOOK_BLOCK}\n`;
}

function mergeHtmlAddopts(content: string): string {
    const addoptsLineRe = /^([ \t]*addopts[ \t]*=[ \t]*)(.*)$/m;
    const match = content.match(addoptsLineRe);

    if (match) {
        const [fullLine, prefix, existingValue] = match;
        const mergedLine = `${prefix}${existingValue.trim()} ${HTML_REPORT_FLAGS}`.trim();
        return content.replace(fullLine, mergedLine);
    }

    if (/^[ \t]*\[pytest\][ \t]*$/m.test(content)) {
        return content.replace(/^([ \t]*\[pytest\][ \t]*)$/m, `$1\naddopts = ${HTML_REPORT_FLAGS}`);
    }

    const base = content.replace(/\n+$/, '');
    return `${base}\n\n[pytest]\naddopts = ${HTML_REPORT_FLAGS}\n`;
}

/**
 * Guarantees an HTML report is produced on every test run. Skips entirely
 * if the LLM configured pytest via pyproject.toml instead — a different
 * format this doesn't attempt to merge into. Merges into an LLM-proposed
 * pytest.ini that's missing --html, or creates a minimal one matching the
 * reference project exactly. Does nothing if pytest.ini is reuse_only.
 */
export function ensurePytestHtmlReporting(changes: ProposedFileChange[]): void {
    const tomlProposed = changes.some(
        (c) => c.filePath.toLowerCase() === 'pyproject.toml' && c.action !== 'reuse_only'
    );
    if (tomlProposed) {
        return;
    }

    const existing = changes.find((c) => c.filePath.toLowerCase() === 'pytest.ini');

    if (!existing) {
        changes.push({
            filePath: 'pytest.ini',
            action: 'create',
            content: `[pytest]\naddopts = ${HTML_REPORT_FLAGS}\n`,
            reason: 'Guarantees an HTML report (pytest-html) is produced on every test run.',
        });
        return;
    }

    if (existing.action === 'reuse_only') {
        return;
    }

    const content = existing.content || '';
    if (content.includes('--html=')) {
        return;
    }

    existing.content = mergeHtmlAddopts(content);
}
