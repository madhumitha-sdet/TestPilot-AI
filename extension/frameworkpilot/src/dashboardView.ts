import {
    LANGUAGE_OPTIONS,
    AUTOMATION_TOOL_OPTIONS,
    TEST_RUNNER_OPTIONS,
    ARCHITECTURE_OPTIONS,
    TEST_DATA_APPROACH_OPTIONS,
} from './frameworkOptions';

/**
 * Returns the HTML for the main FrameworkPilot dashboard Webview.
 *
 * The sidebar navigation swaps visible content entirely inside the
 * Webview using plain JavaScript. Pages that perform real work (capture,
 * mapping, test data, generation) communicate with the extension host via
 * acquireVsCodeApi().postMessage.
 */
export function getDashboardHtml(): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                :root {
                    --space-1: 4px;
                    --space-2: 8px;
                    --space-3: 12px;
                    --space-4: 16px;
                    --space-5: 24px;
                    --space-6: 32px;
                    --space-7: 48px;

                    --font-xs: 11px;
                    --font-sm: 12px;
                    --font-base: 13px;
                    --font-md: 15px;
                    --font-lg: 20px;
                    --font-xl: 26px;
                }

                body {
                    margin: 0;
                    display: flex;
                    height: 100vh;
                    font-family: sans-serif;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }

                /* Sidebar */
                .sidebar {
                    width: 220px;
                    flex-shrink: 0;
                    border-right: 1px solid var(--vscode-input-border);
                    padding: var(--space-5) 0;
                    box-sizing: border-box;
                }

                .sidebar-brand {
                    margin: 0 20px var(--space-6) 20px;
                }

                .sidebar-brand h1 {
                    font-size: var(--font-md);
                    margin: 0;
                }

                .sidebar-tagline {
                    font-size: var(--font-xs);
                    color: var(--vscode-descriptionForeground);
                    margin-top: 2px;
                }

                .nav-item {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    padding: 10px 20px;
                    background: none;
                    border: none;
                    text-align: left;
                    color: var(--vscode-foreground);
                    cursor: pointer;
                    font-size: var(--font-base);
                    box-sizing: border-box;
                }

                .nav-icon {
                    display: inline-flex;
                    margin-right: 10px;
                    opacity: 0.85;
                    flex-shrink: 0;
                }

                .nav-icon svg { width: 15px; height: 15px; }

                .nav-item:hover {
                    background: var(--vscode-list-hoverBackground);
                }

                .nav-item.active {
                    background: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                    border-left: 3px solid var(--vscode-button-background);
                }

                /* Content area */
                .content {
                    flex-grow: 1;
                    padding: 30px 40px;
                    overflow-y: auto;
                }

                .page {
                    display: none;
                }

                .page.active {
                    display: block;
                }

                .page h2 {
                    margin-top: 0;
                    font-size: var(--font-lg);
                }

                .page p {
                    color: var(--vscode-descriptionForeground);
                    line-height: 1.5;
                }

                /* Shared design system */
                .card {
                    border: 1px solid var(--vscode-panel-border, var(--vscode-input-border));
                    border-radius: 6px;
                    padding: var(--space-5);
                    background: transparent;
                    box-sizing: border-box;
                }

                .btn-primary, .btn-secondary, .btn-ghost {
                    font-size: var(--font-base);
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 500;
                    border: none;
                }

                .btn-primary svg, .btn-secondary svg, .btn-ghost svg { width: 14px; height: 14px; flex-shrink: 0; }

                .btn-primary {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }

                .btn-primary:hover { background: var(--vscode-button-hoverBackground); }

                .btn-secondary {
                    background: var(--vscode-button-secondaryBackground, transparent);
                    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
                    border: 1px solid var(--vscode-input-border);
                }

                .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground)); }

                .btn-ghost {
                    background: none;
                    color: var(--vscode-textLink-foreground, #3794ff);
                    padding: 4px 6px;
                }

                .btn-ghost:hover { text-decoration: underline; }

                button:disabled { opacity: 0.5; cursor: default; }

                button:focus-visible, input:focus-visible, select:focus-visible, [tabindex]:focus-visible {
                    outline: 1px solid var(--vscode-focusBorder);
                    outline-offset: 2px;
                }

                /* Badges */
                .badge {
                    padding: 2px 10px;
                    border-radius: 10px;
                    font-size: var(--font-xs);
                    white-space: nowrap;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }

                .badge svg { width: 12px; height: 12px; flex-shrink: 0; }

                .badge-neutral { background: var(--vscode-badge-background, var(--vscode-input-border)); color: var(--vscode-badge-foreground, var(--vscode-foreground)); }
                .badge-progress { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
                .badge-success { background: var(--vscode-testing-iconPassed, #4caf50); color: #fff; }
                .badge-error { background: var(--vscode-testing-iconFailed, var(--vscode-errorForeground, #f44336)); color: #fff; }
                .badge-warning {
                    background: var(--vscode-inputValidation-warningBackground, #cca700);
                    color: var(--vscode-inputValidation-warningForeground, #000);
                    border: 1px solid var(--vscode-inputValidation-warningBorder, transparent);
                }

                /* Chips / callouts / key-value rows */
                .chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 5px 12px;
                    border-radius: 14px;
                    border: 1px solid var(--vscode-input-border);
                    font-size: var(--font-xs);
                    background: var(--vscode-badge-background, transparent);
                    color: var(--vscode-foreground);
                }

                .chip svg { width: 13px; height: 13px; }

                .callout {
                    display: flex;
                    gap: var(--space-2);
                    align-items: flex-start;
                    padding: var(--space-3) var(--space-4);
                    border: 1px solid var(--vscode-input-border);
                    border-left: 3px solid var(--vscode-textLink-foreground, #3794ff);
                    border-radius: 4px;
                    font-size: var(--font-xs);
                    color: var(--vscode-descriptionForeground);
                    background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.08));
                    box-sizing: border-box;
                }

                .callout svg { width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px; color: var(--vscode-textLink-foreground, #3794ff); }

                .kv-row {
                    display: flex;
                    justify-content: space-between;
                    gap: var(--space-3);
                    padding: 4px 0;
                    font-size: var(--font-xs);
                    border-bottom: 1px solid var(--vscode-input-border);
                }

                .kv-row:last-child { border-bottom: none; }
                .kv-label { color: var(--vscode-descriptionForeground); }
                .kv-value { text-align: right; word-break: break-all; }

                .visually-hidden {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0,0,0,0);
                    white-space: nowrap;
                    border: 0;
                }

                .empty-state {
                    text-align: center;
                    padding: var(--space-6) var(--space-4);
                    color: var(--vscode-descriptionForeground);
                }

                .empty-state svg { width: 28px; height: 28px; opacity: 0.5; margin-bottom: var(--space-2); }
                .empty-state-title { font-size: var(--font-base); color: var(--vscode-foreground); margin-bottom: 4px; }
                .empty-state-hint { font-size: var(--font-xs); }

                /* Dashboard */
                .dash-hero { max-width: 720px; margin-bottom: var(--space-6); }
                .dash-eyebrow {
                    font-size: var(--font-xs);
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: var(--space-2);
                }
                .dash-hero h1 { font-size: var(--font-xl); margin: 0 0 var(--space-2) 0; font-weight: 600; }
                .dash-hero p { font-size: var(--font-base); max-width: 560px; }

                .dash-quicknav {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: var(--space-3);
                    margin-bottom: var(--space-6);
                    max-width: 900px;
                }

                .quicknav-card {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    cursor: pointer;
                    text-align: left;
                    background: none;
                    color: var(--vscode-foreground);
                    font-family: inherit;
                }

                .quicknav-card:hover { background: var(--vscode-list-hoverBackground); }

                .quicknav-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    flex-shrink: 0;
                }

                .quicknav-icon svg { width: 16px; height: 16px; }

                .quicknav-title { font-size: var(--font-base); font-weight: 500; }
                .quicknav-desc { font-size: var(--font-xs); color: var(--vscode-descriptionForeground); margin-top: 2px; }

                .dash-section-title { font-size: var(--font-md); margin: 0 0 var(--space-3) 0; }

                .dash-capabilities {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: var(--space-3);
                    max-width: 1100px;
                    margin-bottom: var(--space-5);
                }

                .capability-icon { color: var(--vscode-textLink-foreground, #3794ff); margin-bottom: var(--space-2); }
                .capability-icon svg { width: 20px; height: 20px; }
                .capability-title { font-size: var(--font-base); font-weight: 500; margin-bottom: 4px; }
                .capability-desc { font-size: var(--font-xs); color: var(--vscode-descriptionForeground); line-height: 1.5; }

                .dash-stack-note {
                    font-size: var(--font-xs);
                    color: var(--vscode-descriptionForeground);
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                }

                .dash-stack-note svg { width: 14px; height: 14px; flex-shrink: 0; }

                /* Workflow / generation steppers */
                .wf-card { margin-bottom: var(--space-5); }

                .workflow-stepper { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }

                .wf-step {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 14px;
                    font-size: var(--font-xs);
                    border: 1px solid var(--vscode-input-border);
                    color: var(--vscode-descriptionForeground);
                    white-space: nowrap;
                }

                .wf-step svg { width: 13px; height: 13px; }
                .wf-step-pending { opacity: 0.55; }
                .wf-step-active { border-color: var(--vscode-button-background); color: var(--vscode-foreground); }
                .wf-step-done { background: var(--vscode-testing-iconPassed, #4caf50); color: #fff; border-color: transparent; }

                .wf-step-arrow { color: var(--vscode-descriptionForeground); display: inline-flex; opacity: 0.6; }
                .wf-step-arrow svg { width: 12px; height: 12px; }

                .gen-stepper { display: flex; gap: var(--space-2); margin-top: var(--space-3); flex-wrap: wrap; }

                .gen-step {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: var(--font-xs);
                    border: 1px solid var(--vscode-input-border);
                    color: var(--vscode-descriptionForeground);
                }

                .gen-step svg { width: 12px; height: 12px; }
                .gen-step-pending { opacity: 0.6; }
                .gen-step-active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-color: var(--vscode-button-background); }
                .gen-step-done { background: var(--vscode-testing-iconPassed, #4caf50); color: #fff; border-color: transparent; }
                .gen-step-warning { background: var(--vscode-inputValidation-warningBackground, #cca700); color: var(--vscode-inputValidation-warningForeground, #000); border-color: transparent; }
                .gen-step-error { background: var(--vscode-testing-iconFailed, var(--vscode-errorForeground, #f44336)); color: #fff; border-color: transparent; }

                .gen-check-item { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
                .gen-check-item svg { width: 13px; height: 13px; }

                /* Framework Configuration */
                .fw-page-cards { max-width: 560px; display: flex; flex-direction: column; gap: var(--space-4); }

                .fw-page-cards label {
                    display: block;
                    margin-top: 14px;
                    margin-bottom: 6px;
                    font-size: var(--font-base);
                }

                .fw-page-cards select,
                .fw-page-cards input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                }

                .fw-stack-row { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); }
                .fw-stack-caption { font-size: var(--font-xs); color: var(--vscode-descriptionForeground); margin-top: var(--space-2); }

                .fw-path-row { display: flex; gap: 8px; }
                .fw-path-row input { flex: 1; }
                .fw-path-row button { white-space: nowrap; }

                .fw-save-btn { margin-top: var(--space-5); }

                .fw-saved-summary { max-width: 560px; font-size: var(--font-xs); }

                .fw-project-actions { margin-top: var(--space-5); max-width: 560px; }
                .fw-project-actions h3 { font-size: var(--font-base); margin-bottom: var(--space-2); }

                .fw-project-readiness {
                    font-size: var(--font-xs);
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: var(--space-3);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .fw-project-readiness svg { width: 14px; height: 14px; flex-shrink: 0; }

                .fw-project-btn { margin-right: var(--space-2); margin-bottom: var(--space-2); }

                /* Test Cases */
                .tc-generate { margin-top: var(--space-4); }
                .tc-generate h3 { font-size: var(--font-base); margin-bottom: var(--space-2); }

                .tc-automation-context { margin-top: var(--space-4); }
                .tc-automation-context h3 { font-size: var(--font-base); margin-bottom: var(--space-2); }
                .tc-ac-status { margin-bottom: var(--space-2); }

                .tc-gen-checklist { font-size: var(--font-xs); color: var(--vscode-descriptionForeground); margin-bottom: var(--space-3); }

                .tc-gen-status { margin-top: var(--space-2); font-size: var(--font-xs); color: var(--vscode-descriptionForeground); max-width: 500px; }

                .tc-import-btn { margin-top: var(--space-3); margin-bottom: var(--space-4); }

                .tc-layout { display: flex; gap: var(--space-4); max-width: 900px; }

                .tc-list, .tc-detail { flex: 1; box-sizing: border-box; }
                .tc-list h3, .tc-detail h3 { margin-top: 0; font-size: var(--font-base); }

                .tc-search-input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 6px 8px;
                    margin-bottom: var(--space-2);
                    border: 1px solid var(--vscode-input-border);
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-size: var(--font-sm);
                }

                .tc-list-count { font-size: var(--font-xs); color: var(--vscode-descriptionForeground); margin-bottom: var(--space-2); }

                .tc-list-items { display: flex; flex-direction: column; gap: 2px; }

                .tc-show-more-btn { width: 100%; margin-top: var(--space-2); }

                .tc-list-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--space-2);
                    padding: var(--space-2);
                    font-size: var(--font-sm);
                    cursor: pointer;
                    border-bottom: 1px solid var(--vscode-input-border);
                }

                .tc-list-item:last-child { border-bottom: none; }
                .tc-list-item:hover { background: var(--vscode-list-hoverBackground); }

                .tc-list-item.selected {
                    background: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                }

                .tc-item-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

                .tc-detail-meta {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    font-size: var(--font-xs);
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: var(--space-2);
                }

                .tc-detail-title { font-size: var(--font-md); font-weight: 600; margin-bottom: var(--space-3); }

                .tc-use-btn { margin-top: var(--space-2); margin-bottom: var(--space-3); }

                .tc-raw-markdown-wrap { margin-top: var(--space-4); }

                .tc-raw-markdown {
                    margin-top: var(--space-2);
                    padding: var(--space-2);
                    background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.15));
                    font-family: var(--vscode-editor-font-family, monospace);
                    font-size: var(--font-xs);
                    white-space: pre-wrap;
                    max-height: 300px;
                    overflow-y: auto;
                }

                .tc-steps { margin-top: var(--space-4); }

                .tc-step-row {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    padding: 6px 8px;
                    font-size: var(--font-sm);
                    border-left: 3px solid var(--vscode-input-border);
                    cursor: pointer;
                    margin-bottom: 4px;
                }

                .tc-step-row:hover { background: var(--vscode-list-hoverBackground); }

                .tc-step-row.active {
                    border-left-color: var(--vscode-button-background);
                    background: var(--vscode-list-hoverBackground);
                }

                .tc-step-num { color: var(--vscode-descriptionForeground); }
                .tc-step-text { flex: 1; }

                .tc-step-locator {
                    font-family: var(--vscode-editor-font-family, monospace);
                    font-size: var(--font-xs);
                    max-width: 200px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .tc-capture-btn { margin-top: var(--space-3); }

                .tc-testdata { margin-top: var(--space-4); }
                .tc-testdata h3 { font-size: var(--font-base); margin-bottom: var(--space-2); }

                .tc-td-table { width: 100%; max-width: 500px; border-collapse: collapse; font-size: var(--font-sm); }

                .tc-td-table th {
                    text-align: left;
                    padding: 4px 8px;
                    border-bottom: 1px solid var(--vscode-input-border);
                    color: var(--vscode-descriptionForeground);
                    font-weight: normal;
                }

                .tc-td-table td { padding: 4px 8px; border-bottom: 1px solid var(--vscode-input-border); }

                .tc-td-input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 4px 6px;
                    border: 1px solid var(--vscode-input-border);
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-size: var(--font-sm);
                }

                .tc-td-json-label { font-size: var(--font-xs); font-weight: bold; color: var(--vscode-descriptionForeground); margin-top: var(--space-3); }

                .tc-td-json {
                    margin-top: var(--space-2);
                    padding: var(--space-2);
                    background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.15));
                    font-family: var(--vscode-editor-font-family, monospace);
                    font-size: var(--font-xs);
                    max-width: 400px;
                }

                #adoConfig label {
                    display: block;
                    margin-top: 14px;
                    margin-bottom: 6px;
                    font-size: var(--font-base);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                #adoConfig label svg { width: 13px; height: 13px; }

                #adoConfig input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                }

                .settings-menu-item { display: inline-flex; align-items: center; gap: 8px; margin-bottom: var(--space-3); }

                /* Capture UI Elements */
                .capture-toolbar-card { margin-bottom: var(--space-4); }

                .capture-toolbar { display: flex; align-items: center; gap: 10px; max-width: 700px; }

                .capture-toolbar input {
                    flex: 1;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                }

                .capture-mode-row { display: flex; align-items: center; gap: var(--space-2); margin-top: var(--space-3); }

                .mode-label { font-size: var(--font-sm); color: var(--vscode-descriptionForeground); }

                .mode-btn {
                    padding: 5px 12px;
                    font-size: var(--font-sm);
                    background: none;
                    border: 1px solid var(--vscode-input-border);
                    color: var(--vscode-foreground);
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }

                .mode-btn svg { width: 13px; height: 13px; }
                .mode-btn:disabled { opacity: 0.5; cursor: default; }

                .mode-btn.active {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border-color: var(--vscode-button-background);
                }

                .capture-table-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: var(--space-5);
                    max-width: 900px;
                    font-size: var(--font-base);
                }

                .capture-table-card { max-width: 900px; }

                .capture-table { width: 100%; margin-top: var(--space-2); border-collapse: collapse; font-size: var(--font-sm); }

                .capture-table th {
                    text-align: left;
                    padding: 6px 8px;
                    border-bottom: 1px solid var(--vscode-input-border);
                    color: var(--vscode-descriptionForeground);
                    font-weight: normal;
                }

                .capture-table td { padding: 6px 8px; border-bottom: 1px solid var(--vscode-input-border); vertical-align: middle; }

                .capture-table tbody tr.data-row { cursor: pointer; }
                .capture-table tbody tr.data-row:hover { background: var(--vscode-list-hoverBackground); }

                .col-num, .col-type, .col-score, .col-select, .col-step { white-space: nowrap; }

                .expand-chevron { display: inline-flex; margin-right: 6px; }
                .expand-chevron svg { width: 10px; height: 10px; }
                .expand-chevron.expanded svg { transform: rotate(90deg); }

                .row-step-select {
                    font-size: var(--font-xs);
                    padding: 2px 4px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                }

                .row-locator-code {
                    display: inline-block;
                    max-width: 260px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    vertical-align: middle;
                    font-family: var(--vscode-editor-font-family, monospace);
                }

                .score-badge {
                    font-family: var(--vscode-editor-font-family, monospace);
                    font-size: var(--font-xs);
                    padding: 2px 6px;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 3px;
                }

                .select-check { color: var(--vscode-testing-iconPassed, #4caf50); display: inline-flex; }
                .select-check svg { width: 14px; height: 14px; }

                .detail-row td { background: var(--vscode-editor-background); border-bottom: 1px solid var(--vscode-input-border); padding: var(--space-3) var(--space-4); }

                .detail-section-label {
                    font-size: var(--font-xs);
                    font-weight: bold;
                    color: var(--vscode-descriptionForeground);
                    margin-top: var(--space-2);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .detail-section-label svg { width: 12px; height: 12px; }
                .detail-section-label:first-child { margin-top: 0; }

                .detail-code {
                    display: block;
                    margin: 4px 0;
                    padding: 6px 8px;
                    background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.15));
                    font-family: var(--vscode-editor-font-family, monospace);
                    font-size: var(--font-sm);
                    word-break: break-all;
                }

                .detail-rationale { font-size: var(--font-xs); color: var(--vscode-descriptionForeground); }

                .copy-btn { font-size: var(--font-xs); margin-left: var(--space-2); cursor: pointer; color: var(--vscode-textLink-foreground, #3794ff); }

                .alt-item { padding: 4px 10px; border-left: 3px solid var(--vscode-input-border); margin-top: 6px; cursor: pointer; }
            </style>
        </head>
        <body>

            <div class="sidebar">
                <div class="sidebar-brand">
                    <h1>FrameworkPilot</h1>
                    <div class="sidebar-tagline">AI Test Automation</div>
                </div>
                <button class="nav-item active" data-page="dashboard" onclick="showPage('dashboard')"><span class="nav-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 7.5 8 2l6 5.5"/><path d="M3.5 6.5V13a.5.5 0 0 0 .5.5h3V10h2v3.5h3a.5.5 0 0 0 .5-.5V6.5"/></svg></span>Dashboard</button>
                <button class="nav-item" data-page="frameworkConfig" onclick="showPage('frameworkConfig')"><span class="nav-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="2.2"/><path d="M8 2v1.4M8 12.6V14M14 8h-1.4M3.4 8H2M12.1 3.9l-1 1M4.9 11.1l-1 1M12.1 12.1l-1-1M4.9 4.9l-1-1"/></svg></span>Framework Configuration</button>
                <button class="nav-item" data-page="testCases" onclick="showPage('testCases')"><span class="nav-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M6 2h4M6.5 2v3.5L3.5 12a1 1 0 0 0 .9 1.5h7.2a1 1 0 0 0 .9-1.5L9.5 5.5V2"/><path d="M5 10h6"/></svg></span>Test Cases</button>
                <button class="nav-item" data-page="captureElements" onclick="showPage('captureElements')"><span class="nav-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M5 2l7 3-3 1.2L11 9l-1.5 1L7 7l-2 2z"/></svg></span>Capture UI Elements</button>
                <button class="nav-item" data-page="settings" onclick="showPage('settings')"><span class="nav-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M8 5.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z"/><path d="M8 1.5v1.3M8 13.2v1.3M14.5 8h-1.3M2.8 8H1.5M12.5 3.5l-.9.9M4.4 11.6l-.9.9M12.5 12.5l-.9-.9M4.4 4.4l-.9-.9"/></svg></span>Settings</button>
            </div>

            <div class="content">
                <div id="dashboard" class="page active">
                    <div class="dash-hero">
                        <div class="dash-eyebrow">FrameworkPilot</div>
                        <h1>AI-assisted test automation engineering, inside VS Code.</h1>
                        <p>Go from a test case to a reviewed, applied Playwright/pytest implementation &mdash; with a human confirming every change before it lands.</p>
                    </div>

                    <div class="dash-quicknav">
                        <button class="card quicknav-card" onclick="showPage('frameworkConfig')">
                            <span class="quicknav-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="2.2"/><path d="M8 2v1.4M8 12.6V14M14 8h-1.4M3.4 8H2M12.1 3.9l-1 1M4.9 11.1l-1 1M12.1 12.1l-1-1M4.9 4.9l-1-1"/></svg></span>
                            <span>
                                <div class="quicknav-title">Framework Configuration</div>
                                <div class="quicknav-desc">Set your project path and review the supported stack.</div>
                            </span>
                        </button>
                        <button class="card quicknav-card" onclick="showPage('testCases')">
                            <span class="quicknav-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M6 2h4M6.5 2v3.5L3.5 12a1 1 0 0 0 .9 1.5h7.2a1 1 0 0 0 .9-1.5L9.5 5.5V2"/><path d="M5 10h6"/></svg></span>
                            <span>
                                <div class="quicknav-title">Test Cases</div>
                                <div class="quicknav-desc">Select a test case and drive it through generation.</div>
                            </span>
                        </button>
                        <button class="card quicknav-card" onclick="showPage('captureElements')">
                            <span class="quicknav-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M5 2l7 3-3 1.2L11 9l-1.5 1L7 7l-2 2z"/></svg></span>
                            <span>
                                <div class="quicknav-title">Capture UI Elements</div>
                                <div class="quicknav-desc">Capture real elements and score locator candidates.</div>
                            </span>
                        </button>
                    </div>

                    <h3 class="dash-section-title">What FrameworkPilot does today</h3>
                    <div class="dash-capabilities">
                        <div class="card capability-card">
                            <div class="capability-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M6 2h4M6.5 2v3.5L3.5 12a1 1 0 0 0 .9 1.5h7.2a1 1 0 0 0 .9-1.5L9.5 5.5V2"/><path d="M5 10h6"/></svg></div>
                            <div class="capability-title">Test Case &rarr; Automation</div>
                            <div class="capability-desc">Import a test case from Markdown or Excel, then drive it through capture, mapping, and AI generation in one workflow.</div>
                        </div>
                        <div class="card capability-card">
                            <div class="capability-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M5 2l7 3-3 1.2L11 9l-1.5 1L7 7l-2 2z"/></svg></div>
                            <div class="capability-title">Playwright UI Capture</div>
                            <div class="capability-desc">Launch a real Playwright session and capture elements from the live page in Manual or Select-Area mode.</div>
                        </div>
                        <div class="card capability-card">
                            <div class="capability-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r="0.6" fill="currentColor"/></svg></div>
                            <div class="capability-title">Intelligent Locator Recommendation</div>
                            <div class="capability-desc">Every captured element gets scored candidate locators (role, label, text, testId, CSS, XPath), with uniqueness verified against the live page.</div>
                        </div>
                        <div class="card capability-card">
                            <div class="capability-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M6.5 9.5l3-3M6 4.5H4.5A2.5 2.5 0 0 0 2 7v0a2.5 2.5 0 0 0 2.5 2.5H6M10 11.5h1.5A2.5 2.5 0 0 0 14 9v0a2.5 2.5 0 0 0-2.5-2.5H10"/></svg></div>
                            <div class="capability-title">Step &harr; UI Element Mapping</div>
                            <div class="capability-desc">Assign captured elements to test case steps, with keyword-based suggestions you can always override.</div>
                        </div>
                        <div class="card capability-card">
                            <div class="capability-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 1.5h5.5L12 4v10a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5z"/><path d="M9.5 1.5V4H12M5.5 8h5M5.5 10.5h5"/></svg></div>
                            <div class="capability-title">AI-generated Page Objects &amp; Tests</div>
                            <div class="capability-desc">The language model proposes Page Objects, tests, and framework files based on your real project and instructions.md/skill.md.</div>
                        </div>
                        <div class="card capability-card">
                            <div class="capability-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 2v12M4 2l2.5 2.5M4 2L1.5 4.5M12 14V2M12 14l2.5-2.5M12 14l-2.5-2.5"/></svg></div>
                            <div class="capability-title">Human-in-the-loop Review</div>
                            <div class="capability-desc">Every proposed change opens in VS Code's native diff view before anything touches your project.</div>
                        </div>
                        <div class="card capability-card">
                            <div class="capability-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M8 1.5l5 2v4c0 3.5-2.2 5.8-5 7-2.8-1.2-5-3.5-5-7v-4z"/><path d="M5.8 8l1.6 1.6 2.8-3"/></svg></div>
                            <div class="capability-title">Safe Apply / Skip / Cancel</div>
                            <div class="capability-desc">Apply changes file by file, skip individual files, or cancel the remaining review at any point.</div>
                        </div>
                        <div class="card capability-card">
                            <div class="capability-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1.5 4a1 1 0 0 1 1-1H6l1.3 1.5h6.2a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1z"/></svg></div>
                            <div class="capability-title">Reusable Framework Bootstrap</div>
                            <div class="capability-desc">Empty projects get deterministic dependency and setup scaffolding (requirements.txt, SETUP.md) alongside the AI-proposed foundation.</div>
                        </div>
                    </div>

                    <div class="dash-stack-note">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6.5"/><path d="M8 7.2v3.6M8 5v.1"/></svg>
                        <span>Supported stack today: Python &middot; Playwright &middot; pytest &middot; Page Object Model &middot; JSON test data.</span>
                    </div>
                </div>

                <div id="frameworkConfig" class="page">
                    <h2>Framework Configuration</h2>
                    <p>Define how FrameworkPilot should work with your automation project. This does not generate or modify any code yet.</p>

                    <div class="fw-page-cards">
                        <div class="card fw-stack-card">
                            <label for="fwMode">Framework Source</label>
                            <select id="fwMode">
                                <option value="existing">Use an existing framework/project</option>
                                <option value="new">Create a new framework</option>
                            </select>

                            <div class="fw-stack-caption" style="margin-top: var(--space-4);">Supported Stack</div>
                            <div class="fw-stack-row" id="fwStackChips"></div>
                            <div class="fw-stack-caption">FrameworkPilot currently supports exactly one stack end-to-end. More stacks may be added later.</div>

                            <label for="fwLanguage" class="visually-hidden">Language</label>
                            <select id="fwLanguage" class="visually-hidden"></select>
                            <label for="fwAutomationTool" class="visually-hidden">Automation Tool</label>
                            <select id="fwAutomationTool" class="visually-hidden"></select>
                            <label for="fwTestRunner" class="visually-hidden">Test Runner</label>
                            <select id="fwTestRunner" class="visually-hidden"></select>
                            <label for="fwArchitecture" class="visually-hidden">Architecture</label>
                            <select id="fwArchitecture" class="visually-hidden"></select>
                            <label for="fwTestDataApproach" class="visually-hidden">Test Data Approach</label>
                            <select id="fwTestDataApproach" class="visually-hidden"></select>
                        </div>

                        <div class="card fw-paths-card">
                            <label for="fwProjectPath">Project Path (optional)</label>
                            <div class="fw-path-row">
                                <input id="fwProjectPath" placeholder="Path to your automation project folder" />
                                <button class="btn-secondary" onclick="pickPath('projectPath')">Browse...</button>
                            </div>

                            <label for="fwTestCaseFile">Test Case File (optional)</label>
                            <div class="fw-path-row">
                                <input id="fwTestCaseFile" placeholder="Path to a test case file (e.g. login_test_case.md)" />
                                <button class="btn-secondary" onclick="pickPath('testCaseFile')">Browse...</button>
                            </div>

                            <label for="fwExistingPomFile">Existing POM File (optional)</label>
                            <div class="fw-path-row">
                                <input id="fwExistingPomFile" placeholder="Path to an existing Page Object file" />
                                <button class="btn-secondary" onclick="pickPath('existingPomFile')">Browse...</button>
                            </div>

                            <label for="fwExistingTestFile">Existing Test File (optional)</label>
                            <div class="fw-path-row">
                                <input id="fwExistingTestFile" placeholder="Path to an existing test file" />
                                <button class="btn-secondary" onclick="pickPath('existingTestFile')">Browse...</button>
                            </div>

                            <label for="fwTestCaseExcelPath">Test Case Excel Workbook (optional)</label>
                            <div class="fw-path-row">
                                <input id="fwTestCaseExcelPath" placeholder="Path to an .xlsx workbook (one sheet per test case)" />
                                <button class="btn-secondary" onclick="pickPath('testCaseExcelPath')">Browse...</button>
                            </div>

                            <button class="btn-primary fw-save-btn" onclick="saveFrameworkConfiguration()">Save Configuration</button>
                        </div>

                        <div id="fwSavedSummary" class="card fw-saved-summary"></div>

                        <div class="fw-project-actions">
                            <h3>Project</h3>
                            <div id="fwProjectReadiness" class="fw-project-readiness"></div>
                            <button class="btn-secondary fw-project-btn" onclick="openProjectInVSCode()">Open Project in VS Code</button>
                            <button class="btn-secondary fw-project-btn" onclick="openInstructionsFile()">Open instructions.md</button>
                            <button class="btn-secondary fw-project-btn" onclick="openSkillFile()">Open skill.md</button>
                        </div>
                    </div>
                </div>

                <div id="testCases" class="page">
                    <h2>Test Cases</h2>
                    <p>Select a normalized test case to work with, or import a local Markdown test case file.</p>

                    <div class="card wf-card">
                        <div id="tcWorkflowStepper" class="workflow-stepper"></div>
                    </div>

                    <button class="btn-primary tc-import-btn" onclick="importLocalTestCase()">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M8 11V3M5 6l3-3 3 3M2.5 13h11"/></svg>
                        Import Local Markdown Test Case
                    </button>

                    <div class="tc-layout">
                        <div class="card tc-list">
                            <h3>Available Test Cases</h3>
                            <input id="tcSearchInput" class="tc-search-input" type="text" placeholder="Search by ID or title..." oninput="onTestCaseSearchInput(this.value)" />
                            <div id="tcListCount" class="tc-list-count"></div>
                            <div id="tcGeneratedList" class="tc-list-items">
                                <div class="empty-state">
                                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 1.5h5.5L12 4v10a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5z"/><path d="M9.5 1.5V4H12M5.5 8h5M5.5 10.5h5"/></svg>
                                    <div class="empty-state-title">No test cases yet</div>
                                    <div class="empty-state-hint">Import a local Markdown test case to get started.</div>
                                </div>
                            </div>
                            <button id="tcShowMoreBtn" class="btn-secondary tc-show-more-btn" onclick="showMoreTestCases()" style="display:none;">Show more</button>
                        </div>

                        <div class="card tc-detail">
                            <h3>Selected Test Case</h3>
                            <div id="tcDetail" class="tc-detail-body">
                                <div class="empty-state">
                                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r="0.6" fill="currentColor"/></svg>
                                    <div class="empty-state-title">No test case selected</div>
                                    <div class="empty-state-hint">Choose a test case from the list, or import one above.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="captureElements" class="page">
                    <h2>Capture UI Elements</h2>

                    <div class="card capture-toolbar-card">
                        <div class="capture-toolbar">
                            <input id="captureUrl" placeholder="https://example.com" />
                            <button id="startCaptureBtn" class="btn-primary" onclick="startCapture()">
                                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M5 2l7 3-3 1.2L11 9l-1.5 1L7 7l-2 2z"/></svg>
                                Start Capture
                            </button>
                            <button id="stopCaptureBtn" class="btn-secondary" onclick="stopCapture()" disabled>Stop Capture</button>
                            <span id="captureStatus" class="badge badge-neutral">Idle</span>
                        </div>

                        <div class="capture-mode-row" role="group" aria-label="Capture mode">
                            <span class="mode-label">Capture Mode:</span>
                            <button id="manualModeBtn" class="mode-btn active" onclick="setCaptureMode('manual')" disabled>
                                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M5 2l7 3-3 1.2L11 9l-1.5 1L7 7l-2 2z"/></svg>
                                Manual Capture
                            </button>
                            <button id="areaModeBtn" class="mode-btn" onclick="setCaptureMode('area')" disabled>
                                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 2"><rect x="2.5" y="2.5" width="11" height="11" rx="1"/></svg>
                                Select Area
                            </button>
                        </div>
                    </div>

                    <div id="activeStepBanner" class="callout" style="display:none;"></div>

                    <div class="capture-table-header">
                        <span id="capturedCount">Captured Elements (0)</span>
                        <button class="btn-secondary clear-all-btn" onclick="clearAllCaptured()">Clear All</button>
                    </div>

                    <div class="card capture-table-card">
                        <table class="capture-table">
                            <thead>
                                <tr>
                                    <th class="col-num">#</th>
                                    <th>Element</th>
                                    <th class="col-step">Map to Step</th>
                                    <th>Locator</th>
                                    <th class="col-type">Type</th>
                                    <th class="col-score">Score</th>
                                    <th class="col-select">Select</th>
                                </tr>
                            </thead>
                            <tbody id="captureTableBody"></tbody>
                        </table>
                        <div id="captureEmptyState" class="empty-state">
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M5 2l7 3-3 1.2L11 9l-1.5 1L7 7l-2 2z"/></svg>
                            <div class="empty-state-title">No elements captured yet</div>
                            <div class="empty-state-hint">Start a capture session above, then click elements on the live page.</div>
                        </div>
                    </div>
                </div>

                <div id="settings" class="page">
                    <h2>Settings</h2>

                    <div id="settingsMenu">
                        <button class="btn-secondary settings-menu-item" onclick="showSettingsSection('adoConfig')">
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M6 2v3M10 2v3M4.5 5h7v2.5A3.5 3.5 0 0 1 8 11v0a3.5 3.5 0 0 1-3.5-3.5V5z"/><path d="M8 11v3"/></svg>
                            Azure DevOps Configuration
                        </button>
                    </div>

                    <div id="adoConfig" class="card" style="display:none; max-width: 500px; margin-top: var(--space-4);">
                        <div class="callout">
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6.5"/><path d="M8 7.2v3.6M8 5v.1"/></svg>
                            <span>This saves connection settings only. No Azure DevOps API calls are made yet.</span>
                        </div>

                        <label for="organizationUrl">Organization URL</label>
                        <input id="organizationUrl" placeholder="https://dev.azure.com/your-organization" />

                        <label for="projectName">Project Name</label>
                        <input id="projectName" placeholder="TestFrameworkPilot" />

                        <label for="pat"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.5 7V4.8a2.5 2.5 0 0 1 5 0V7"/></svg>Personal Access Token</label>
                        <input id="pat" type="password" placeholder="Enter Azure DevOps PAT" />
                        <div class="fw-stack-caption">Stored securely in VS Code Secret Storage &mdash; never shown in plain text.</div>

                        <label for="planId">Test Plan ID (optional)</label>
                        <input id="planId" placeholder="Test Plan ID" />

                        <label for="suiteId">Test Suite ID (optional)</label>
                        <input id="suiteId" placeholder="Test Suite ID" />

                        <button class="btn-primary" style="margin-top: var(--space-4);" onclick="saveAdoConfiguration()">Save Configuration</button>
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                const ICONS = {
                    checkCircle: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M5.5 8.5l1.8 1.8L11 6.5"/></svg>',
                    circle: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.5"/></svg>',
                    flask: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M6 2h4M6.5 2v3.5L3.5 12a1 1 0 0 0 .9 1.5h7.2a1 1 0 0 0 .9-1.5L9.5 5.5V2"/><path d="M5 10h6"/></svg>',
                    cursorClick: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M5 2l7 3-3 1.2L11 9l-1.5 1L7 7l-2 2z"/></svg>',
                    link: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M6.5 9.5l3-3M6 4.5H4.5A2.5 2.5 0 0 0 2 7v0a2.5 2.5 0 0 0 2.5 2.5H6M10 11.5h1.5A2.5 2.5 0 0 0 14 9v0a2.5 2.5 0 0 0-2.5-2.5H10"/></svg>',
                    fileText: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 1.5h5.5L12 4v10a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5z"/><path d="M9.5 1.5V4H12M5.5 8h5M5.5 10.5h5"/></svg>',
                    chevron: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 3.5L10 8l-5 4.5"/></svg>',
                    alertTriangle: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M8 2 1.5 13.5h13z"/><path d="M8 6.3v3.2M8 11.5v.1"/></svg>',
                    info: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6.5"/><path d="M8 7.2v3.6M8 5v.1"/></svg>',
                    folder: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1.5 4a1 1 0 0 1 1-1H6l1.3 1.5h6.2a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1z"/></svg>'
                };

                function icon(name) { return ICONS[name] || ''; }

                const FW_OPTIONS = ${JSON.stringify({
                    languages: LANGUAGE_OPTIONS,
                    automationTools: AUTOMATION_TOOL_OPTIONS,
                    testRunners: TEST_RUNNER_OPTIONS,
                    architectures: ARCHITECTURE_OPTIONS,
                    testDataApproaches: TEST_DATA_APPROACH_OPTIONS,
                })};

                function populateSelect(selectId, options) {
                    const select = document.getElementById(selectId);
                    select.innerHTML = '';
                    options.forEach(function (opt) {
                        const el = document.createElement('option');
                        el.value = opt.value;
                        el.textContent = opt.label;
                        select.appendChild(el);
                    });
                }

                function populateAllFwSelects() {
                    populateSelect('fwLanguage', FW_OPTIONS.languages);
                    populateSelect('fwAutomationTool', FW_OPTIONS.automationTools);
                    populateSelect('fwTestRunner', FW_OPTIONS.testRunners);
                    populateSelect('fwArchitecture', FW_OPTIONS.architectures);
                    populateSelect('fwTestDataApproach', FW_OPTIONS.testDataApproaches);
                }

                function renderStackChips() {
                    const container = document.getElementById('fwStackChips');
                    if (!container) { return; }
                    const items = [
                        { icon: 'flask', label: FW_OPTIONS.languages[0] ? FW_OPTIONS.languages[0].label : null },
                        { icon: 'cursorClick', label: FW_OPTIONS.automationTools[0] ? FW_OPTIONS.automationTools[0].label : null },
                        { icon: 'checkCircle', label: FW_OPTIONS.testRunners[0] ? FW_OPTIONS.testRunners[0].label : null },
                        { icon: 'link', label: FW_OPTIONS.architectures[0] ? FW_OPTIONS.architectures[0].label : null },
                        { icon: 'fileText', label: FW_OPTIONS.testDataApproaches[0] ? FW_OPTIONS.testDataApproaches[0].label : null }
                    ];
                    container.innerHTML = items.filter(function (i) { return i.label; }).map(function (i) {
                        return '<span class="chip">' + icon(i.icon) + escapeHtml(i.label) + '</span>';
                    }).join('');
                }

                populateAllFwSelects();
                renderStackChips();

                function showPage(pageId) {
                    document.querySelectorAll('.page').forEach(function (el) {
                        el.classList.remove('active');
                    });
                    document.querySelectorAll('.nav-item').forEach(function (el) {
                        el.classList.remove('active');
                    });

                    document.getElementById(pageId).classList.add('active');
                    document.querySelector('[data-page="' + pageId + '"]').classList.add('active');

                    if (pageId === 'frameworkConfig') {
                        vscode.postMessage({ command: 'requestFrameworkConfig' });
                        vscode.postMessage({ command: 'requestProjectReadiness' });
                    } else if (pageId === 'testCases') {
                        vscode.postMessage({ command: 'listTestCases' });
                        renderWorkflowStepper();
                    }
                }

                function showSettingsSection(sectionId) {
                    document.getElementById(sectionId).style.display = 'block';
                }

                function saveAdoConfiguration() {
                    const organizationUrl = document.getElementById('organizationUrl').value;
                    const projectName = document.getElementById('projectName').value;
                    const pat = document.getElementById('pat').value;
                    const planId = document.getElementById('planId').value;
                    const suiteId = document.getElementById('suiteId').value;

                    vscode.postMessage({
                        command: 'saveAdoConfig',
                        organizationUrl: organizationUrl,
                        projectName: projectName,
                        pat: pat,
                        planId: planId,
                        suiteId: suiteId
                    });
                }

                function pickPath(field) {
                    vscode.postMessage({ command: 'pickFile', field: field });
                }

                function saveFrameworkConfiguration() {
                    const config = {
                        frameworkMode: document.getElementById('fwMode').value,
                        language: document.getElementById('fwLanguage').value,
                        automationTool: document.getElementById('fwAutomationTool').value,
                        testRunner: document.getElementById('fwTestRunner').value,
                        architecture: document.getElementById('fwArchitecture').value,
                        testDataApproach: document.getElementById('fwTestDataApproach').value,
                        projectPath: document.getElementById('fwProjectPath').value,
                        testCaseFile: document.getElementById('fwTestCaseFile').value,
                        existingPomFile: document.getElementById('fwExistingPomFile').value,
                        existingTestFile: document.getElementById('fwExistingTestFile').value,
                        testCaseExcelPath: document.getElementById('fwTestCaseExcelPath').value
                    };

                    vscode.postMessage({ command: 'saveFrameworkConfig', config: config });
                }

                function renderFrameworkConfig(config) {
                    document.getElementById('fwMode').value = config.frameworkMode;
                    document.getElementById('fwLanguage').value = config.language;
                    document.getElementById('fwAutomationTool').value = config.automationTool;
                    document.getElementById('fwTestRunner').value = config.testRunner;
                    document.getElementById('fwArchitecture').value = config.architecture;
                    document.getElementById('fwTestDataApproach').value = config.testDataApproach;
                    document.getElementById('fwProjectPath').value = config.projectPath || '';
                    document.getElementById('fwTestCaseFile').value = config.testCaseFile || '';
                    document.getElementById('fwExistingPomFile').value = config.existingPomFile || '';
                    document.getElementById('fwExistingTestFile').value = config.existingTestFile || '';
                    document.getElementById('fwTestCaseExcelPath').value = config.testCaseExcelPath || '';

                    const summary = document.getElementById('fwSavedSummary');
                    summary.innerHTML =
                        '<div class="kv-row"><span class="kv-label">Mode</span><span class="kv-value">' + escapeHtml(config.frameworkMode) + '</span></div>' +
                        '<div class="kv-row"><span class="kv-label">Stack</span><span class="kv-value">' + escapeHtml(config.language) + ' / ' + escapeHtml(config.automationTool) + ' / ' + escapeHtml(config.testRunner) + ' / ' + escapeHtml(config.architecture) + '</span></div>' +
                        '<div class="kv-row"><span class="kv-label">Test Data</span><span class="kv-value">' + escapeHtml(config.testDataApproach) + '</span></div>' +
                        '<div class="kv-row"><span class="kv-label">Project Path</span><span class="kv-value">' + escapeHtml(config.projectPath || 'Not set') + '</span></div>' +
                        '<div class="kv-row"><span class="kv-label">Test Case File</span><span class="kv-value">' + escapeHtml(config.testCaseFile || 'Not set') + '</span></div>' +
                        '<div class="kv-row"><span class="kv-label">Existing POM File</span><span class="kv-value">' + escapeHtml(config.existingPomFile || 'Not set') + '</span></div>' +
                        '<div class="kv-row"><span class="kv-label">Existing Test File</span><span class="kv-value">' + escapeHtml(config.existingTestFile || 'Not set') + '</span></div>' +
                        '<div class="kv-row"><span class="kv-label">Test Case Excel</span><span class="kv-value">' + escapeHtml(config.testCaseExcelPath || 'Not set') + '</span></div>';
                }

                let capturedElements = [];
                let captureReady = false;
                let currentMode = 'manual';

                function startCapture() {
                    const url = document.getElementById('captureUrl').value;
                    document.getElementById('startCaptureBtn').disabled = true;
                    document.getElementById('stopCaptureBtn').disabled = false;
                    vscode.postMessage({ command: 'startCapture', url: url });
                }

                function stopCapture() {
                    vscode.postMessage({ command: 'stopCapture' });
                    captureReady = false;
                    document.getElementById('manualModeBtn').disabled = true;
                    document.getElementById('areaModeBtn').disabled = true;
                }

                function setCaptureMode(mode) {
                    if (!captureReady) { return; }
                    currentMode = mode;
                    document.getElementById('manualModeBtn').classList.toggle('active', mode === 'manual');
                    document.getElementById('areaModeBtn').classList.toggle('active', mode === 'area');
                    vscode.postMessage({ command: 'setCaptureMode', mode: mode });
                }

                function clearAllCaptured() {
                    capturedElements = [];
                    renderTable();
                }

                function captureStatusBadgeClass(status) {
                    if (status === 'ready') { return 'badge-success'; }
                    if (status === 'error') { return 'badge-error'; }
                    if (status === 'idle' || status === 'stopped') { return 'badge-neutral'; }
                    return 'badge-progress'; // launching, capturing, area-select
                }

                function captureStatusLabel(status) {
                    const labels = { idle: 'Idle', launching: 'Launching', capturing: 'Capturing', ready: 'Ready', stopped: 'Stopped', error: 'Error', 'area-select': 'Selecting Area' };
                    return labels[status] || status;
                }

                function setCaptureStatus(status, message) {
                    const el = document.getElementById('captureStatus');
                    el.className = 'badge ' + captureStatusBadgeClass(status);
                    el.textContent = captureStatusLabel(status);
                    el.title = message || '';

                    if (status === 'ready') {
                        captureReady = true;
                        document.getElementById('manualModeBtn').disabled = false;
                        document.getElementById('areaModeBtn').disabled = false;
                    }

                    if (status === 'stopped' || status === 'error') {
                        document.getElementById('startCaptureBtn').disabled = false;
                        document.getElementById('stopCaptureBtn').disabled = true;
                        document.getElementById('manualModeBtn').disabled = true;
                        document.getElementById('areaModeBtn').disabled = true;
                    }
                }

                function escapeHtml(value) {
                    const div = document.createElement('div');
                    div.textContent = value == null ? '' : String(value);
                    return div.innerHTML;
                }

                function elementLabel(element) {
                    return element.textContent ? element.textContent.slice(0, 40) : (element.id || element.ariaRole || element.tagName);
                }

                function selectCandidate(entryIndex, candidate) {
                    capturedElements[entryIndex].selected = candidate;
                    vscode.postMessage({ command: 'selectLocator', locator: candidate });

                    if (activeMapping) {
                        recomputeMappingFromCapturedElements();
                    }

                    renderTable();
                }

                function copyCode(code) {
                    navigator.clipboard.writeText(code);
                }

                function suggestStepForElement(element, steps) {
                    function keywords(text) {
                        return (text || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length > 2; });
                    }
                    const elementWords = keywords(
                        [element.tagName, element.ariaRole, element.textContent, element.id, element.testId].join(' ')
                    );
                    if (elementWords.length === 0) { return null; }

                    let bestIndex = null;
                    let bestScore = 0;
                    steps.forEach(function (step, index) {
                        const stepWords = keywords(step.stepText);
                        let score = 0;
                        elementWords.forEach(function (w) {
                            if (stepWords.indexOf(w) !== -1) { score++; }
                        });
                        if (score > bestScore) {
                            bestScore = score;
                            bestIndex = index;
                        }
                    });

                    // Require at least one real keyword overlap before suggesting a
                    // step — otherwise leave it Unassigned rather than guess.
                    return bestScore > 0 ? bestIndex : null;
                }

                function recomputeMappingFromCapturedElements() {
                    if (!activeMapping) { return; }

                    activeMapping.steps.forEach(function (step) {
                        step.capturedElement = undefined;
                        step.candidates = undefined;
                        step.selectedLocator = undefined;
                        step.actionType = undefined;
                        step.status = 'not_captured';
                    });

                    // capturedElements is newest-first (unshift). Iterate oldest to
                    // newest so that if two rows are ever assigned to the same step,
                    // the most recent assignment/capture wins rather than being
                    // silently overwritten by an older one, and no stale data survives.
                    for (let i = capturedElements.length - 1; i >= 0; i--) {
                        const entry = capturedElements[i];
                        if (entry.forStepIndex === null || entry.forStepIndex === undefined) { continue; }
                        const step = activeMapping.steps[entry.forStepIndex];
                        if (!step) { continue; }

                        step.capturedElement = entry.element;
                        step.candidates = entry.candidates;
                        step.actionType = inferActionType(entry.element.tagName, entry.element.ariaRole);

                        if (entry.selected) {
                            step.selectedLocator = entry.selected;
                            step.status = 'mapped';
                        } else {
                            step.status = 'captured';
                        }
                    }

                    persistMapping();
                    renderSteps();
                }

                function changeStepAssignment(entryIndex, newValue) {
                    capturedElements[entryIndex].forStepIndex = newValue === '' ? null : parseInt(newValue, 10);
                    recomputeMappingFromCapturedElements();
                    renderTable();
                }

                function toggleExpand(index) {
                    capturedElements[index].expanded = !capturedElements[index].expanded;
                    renderTable();
                }

                function renderTable() {
                    document.getElementById('capturedCount').textContent = 'Captured Elements (' + capturedElements.length + ')';
                    const tbody = document.getElementById('captureTableBody');
                    const emptyState = document.getElementById('captureEmptyState');
                    tbody.innerHTML = '';

                    if (capturedElements.length === 0) {
                        if (emptyState) { emptyState.style.display = 'block'; }
                        return;
                    }
                    if (emptyState) { emptyState.style.display = 'none'; }

                    capturedElements.forEach(function (entry, index) {
                        const sorted = entry.candidates.slice().sort(function (a, b) { return b.score - a.score; });
                        const recommended = sorted.find(function (c) { return c.recommended; }) || sorted[0];
                        const alternatives = sorted.filter(function (c) { return c !== recommended; });
                        const active = entry.selected || recommended;

                        const row = document.createElement('tr');
                        row.className = 'data-row';

                        let stepCellHtml = '<span class="tc-empty">-</span>';
                        if (activeMapping) {
                            stepCellHtml = '<select class="row-step-select" data-idx="' + index + '"><option value="">Unassigned</option>';
                            activeMapping.steps.forEach(function (step, stepIdx) {
                                const label = (stepIdx + 1) + '. ' + step.stepText.slice(0, 30);
                                const isSelected = entry.forStepIndex === stepIdx;
                                stepCellHtml += '<option value="' + stepIdx + '"' + (isSelected ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
                            });
                            stepCellHtml += '</select>';
                        }

                        row.innerHTML =
                            '<td class="col-num"><span class="expand-chevron' + (entry.expanded ? ' expanded' : '') + '">' + icon('chevron') + '</span>' + index + '</td>' +
                            '<td>' + escapeHtml(elementLabel(entry.element)) + '</td>' +
                            '<td class="col-step">' + stepCellHtml + '</td>' +
                            '<td><span class="row-locator-code">' + escapeHtml(active.code) + '</span>' +
                                (active === recommended ? '<span class="badge badge-success">Recommended</span>' : '') + '</td>' +
                            '<td class="col-type">' + escapeHtml(active.type) + '</td>' +
                            '<td class="col-score"><span class="score-badge">' + escapeHtml(active.score) + '</span></td>' +
                            '<td class="col-select"><span class="select-check" title="Recommended locator applied">' + icon('checkCircle') + '</span></td>';
                        row.onclick = function () { toggleExpand(index); };
                        tbody.appendChild(row);

                        const stepSelect = row.querySelector('.row-step-select');
                        if (stepSelect) {
                            stepSelect.onclick = function (e) { e.stopPropagation(); };
                            stepSelect.onchange = function (e) {
                                e.stopPropagation();
                                changeStepAssignment(index, e.target.value);
                            };
                        }

                        if (entry.expanded) {
                            const detailRow = document.createElement('tr');
                            detailRow.className = 'detail-row';

                            let html = '<td colspan="7">';
                            html += '<div class="detail-section-label">' + icon('checkCircle') + 'RECOMMENDED LOCATOR</div>';
                            html += '<code class="detail-code">' + escapeHtml(recommended.code) +
                                '<span class="copy-btn" data-copy-recommended="' + index + '">Copy</span></code>';
                            html += '<div class="detail-rationale">' + escapeHtml(recommended.rationale) + '</div>';

                            if (alternatives.length > 0) {
                                html += '<div class="detail-section-label">' + icon('link') + 'ALTERNATIVE CANDIDATES</div>';
                                alternatives.forEach(function (candidate, altIndex) {
                                    html += '<div class="alt-item" tabindex="0" role="button" data-idx="' + index + '" data-alt="' + altIndex + '">' +
                                        escapeHtml(candidate.type) + ' &middot; score ' + escapeHtml(candidate.score) +
                                        '<code class="detail-code">' + escapeHtml(candidate.code) + '</code>' +
                                        '<div class="detail-rationale">' + escapeHtml(candidate.rationale) + '</div>' +
                                        '</div>';
                                });
                            }

                            html += '</td>';
                            detailRow.innerHTML = html;
                            tbody.appendChild(detailRow);

                            detailRow.querySelector('[data-copy-recommended]').onclick = function (e) {
                                e.stopPropagation();
                                copyCode(recommended.code);
                            };
                            detailRow.querySelectorAll('.alt-item').forEach(function (el) {
                                const handler = function (e) {
                                    e.stopPropagation();
                                    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') { return; }
                                    if (e.type === 'keydown') { e.preventDefault(); }
                                    selectCandidate(index, alternatives[+el.getAttribute('data-alt')]);
                                };
                                el.onclick = handler;
                                el.onkeydown = handler;
                            });
                        }
                    });
                }

                let selectedTestCasePath = null;
                let lastGenerationStage = null;
                let generationOutcome = null;

                function importLocalTestCase() {
                    vscode.postMessage({ command: 'pickLocalTestCaseFile' });
                }

                function selectTestCase(filePath) {
                    vscode.postMessage({ command: 'selectTestCase', path: filePath });
                }

                let allTestCasesForList = [];
                let tcSearchQuery = '';
                const TC_PAGE_SIZE = 50;
                let tcVisibleCount = TC_PAGE_SIZE;

                function renderTestCaseList(testCases) {
                    // Store the latest full set but deliberately do NOT reset
                    // tcSearchQuery/tcVisibleCount here: this is re-invoked after
                    // every selectTestCase (to refresh the "selected" highlight),
                    // and clearing an active search on every selection would break
                    // the very workflow this feature exists to support.
                    allTestCasesForList = testCases || [];
                    renderFilteredTestCaseList();
                }

                function onTestCaseSearchInput(value) {
                    tcSearchQuery = value;
                    tcVisibleCount = TC_PAGE_SIZE;
                    renderFilteredTestCaseList();
                }

                function showMoreTestCases() {
                    tcVisibleCount += TC_PAGE_SIZE;
                    renderFilteredTestCaseList();
                }

                function matchesTestCaseSearch(tc, query) {
                    if (!query) { return true; }
                    const q = query.trim().toLowerCase();
                    if (!q) { return true; }
                    return (tc.id || '').toLowerCase().indexOf(q) !== -1 ||
                        (tc.title || '').toLowerCase().indexOf(q) !== -1;
                }

                function renderFilteredTestCaseList() {
                    const container = document.getElementById('tcGeneratedList');
                    const countEl = document.getElementById('tcListCount');
                    const showMoreBtn = document.getElementById('tcShowMoreBtn');

                    if (!allTestCasesForList || allTestCasesForList.length === 0) {
                        countEl.textContent = '';
                        showMoreBtn.style.display = 'none';
                        container.innerHTML = '<div class="empty-state">' + icon('fileText') +
                            '<div class="empty-state-title">No test cases yet</div>' +
                            '<div class="empty-state-hint">Import a local Markdown test case to get started.</div></div>';
                        return;
                    }

                    const matches = allTestCasesForList.filter(function (tc) { return matchesTestCaseSearch(tc, tcSearchQuery); });

                    if (matches.length === 0) {
                        countEl.textContent = '';
                        showMoreBtn.style.display = 'none';
                        container.innerHTML = '<div class="empty-state">' + icon('fileText') +
                            '<div class="empty-state-title">No matching test cases</div>' +
                            '<div class="empty-state-hint">Try a different search term.</div></div>';
                        return;
                    }

                    const visible = matches.slice(0, tcVisibleCount);
                    countEl.textContent = 'Showing ' + visible.length + ' of ' + matches.length + ' test case(s)' +
                        (matches.length !== allTestCasesForList.length ? ' (' + allTestCasesForList.length + ' total)' : '');

                    container.innerHTML = '';
                    visible.forEach(function (tc) {
                        const item = document.createElement('div');
                        item.className = 'tc-list-item' + (tc.filePath === selectedTestCasePath ? ' selected' : '');
                        item.tabIndex = 0;
                        item.setAttribute('role', 'button');
                        item.innerHTML = '<span class="tc-item-title">' + escapeHtml(tc.id + ' - ' + tc.title) + '</span>' +
                            '<span class="badge badge-neutral">' + escapeHtml(tc.source) + '</span>';
                        const handler = function (e) {
                            if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') { return; }
                            if (e.type === 'keydown') { e.preventDefault(); }
                            selectTestCase(tc.filePath);
                        };
                        item.onclick = handler;
                        item.onkeydown = handler;
                        container.appendChild(item);
                    });

                    showMoreBtn.style.display = matches.length > visible.length ? 'block' : 'none';
                }

                let activeMapping = null;
                let activeTestData = null;
                let currentTestCase = null;

                function renderTestCaseDetail(testCase, showUseButton, hasAutomationContext) {
                    selectedTestCasePath = showUseButton ? selectedTestCasePath : testCase.filePath;
                    const container = document.getElementById('tcDetail');

                    container.innerHTML =
                        '<div class="tc-detail-meta">' +
                            '<span class="badge badge-neutral">' + escapeHtml(testCase.source) + '</span>' +
                            '<span>' + escapeHtml(testCase.id) + '</span>' +
                            '<span>' + escapeHtml((testCase.steps || []).length) + ' step(s)</span>' +
                        '</div>' +
                        '<div class="tc-detail-title">' + escapeHtml(testCase.title) + '</div>' +
                        (showUseButton ? '<button class="btn-primary tc-use-btn" id="tcUseBtn">Use This Test Case</button>' : '') +
                        '<div id="tcSteps" class="tc-steps"></div>' +
                        (showUseButton ? '' : '<div id="tcTestData" class="tc-testdata"></div>') +
                        (showUseButton ? '' : '<button class="btn-secondary tc-capture-btn" onclick="startCaptureForTestCase()">' + icon('cursorClick') + 'Start Capture for This Test Case</button>') +
                        (showUseButton ? '' : '<div id="tcAutomationContext" class="tc-automation-context"></div>') +
                        (showUseButton ? '' : '<div id="tcGenerate" class="tc-generate"></div>') +
                        '<div class="tc-raw-markdown-wrap"><div class="detail-section-label">RAW MARKDOWN</div><pre class="tc-raw-markdown">' + escapeHtml(testCase.rawMarkdown || '') + '</pre></div>';

                    if (showUseButton) {
                        document.getElementById('tcUseBtn').onclick = function () {
                            selectTestCase(testCase.filePath);
                        };
                    } else {
                        vscode.postMessage({ command: 'requestTestCaseMapping', testCase: testCase });
                        vscode.postMessage({ command: 'requestTestCaseData', testCase: testCase });
                        currentTestCase = testCase;
                        renderAutomationContext(!!hasAutomationContext);
                        renderWorkflowStepper();
                    }
                }

                function persistMapping() {
                    if (activeMapping) {
                        vscode.postMessage({ command: 'saveTestCaseMapping', mapping: activeMapping });
                    }
                }

                function stepStatusLabel(status) {
                    if (status === 'mapped') { return 'Mapped'; }
                    if (status === 'captured') { return 'Captured'; }
                    return 'Not captured';
                }

                function setActiveStep(index) {
                    if (!activeMapping) { return; }
                    activeMapping.activeStepIndex = index;
                    persistMapping();
                    renderSteps();
                    renderActiveStepBanner();
                }

                function startCaptureForTestCase() {
                    // Capture is no longer scoped to a single step — one session stays
                    // open for the entire test case. activeStepIndex is intentionally
                    // left untouched here; it no longer controls capture.
                    showPage('captureElements');
                    renderActiveStepBanner();
                }

                function renderActiveStepBanner() {
                    const banner = document.getElementById('activeStepBanner');
                    if (!banner) { return; }
                    if (activeMapping) {
                        banner.style.display = 'flex';
                        banner.innerHTML = icon('info') + '<span>Capturing for test case ' + escapeHtml(activeMapping.testCaseId) + ' (' + activeMapping.steps.length + ' step(s)) — assign each captured element to a step in the table below.</span>';
                    } else {
                        banner.style.display = 'none';
                    }
                }

                function renderSteps() {
                    const container = document.getElementById('tcSteps');
                    if (!container || !activeMapping) { return; }
                    container.innerHTML = '';
                    activeMapping.steps.forEach(function (step, index) {
                        const row = document.createElement('div');
                        row.className = 'tc-step-row' + (activeMapping.activeStepIndex === index ? ' active' : '');
                        const badgeClass = step.status === 'mapped' ? 'badge-success' : (step.status === 'captured' ? 'badge-progress' : 'badge-neutral');
                        const badgeIcon = step.status === 'mapped' ? 'checkCircle' : 'circle';
                        row.innerHTML =
                            '<span class="tc-step-num">' + (index + 1) + '</span>' +
                            '<span class="tc-step-text">' + escapeHtml(step.stepText) + '</span>' +
                            '<span class="badge ' + badgeClass + '">' + icon(badgeIcon) + stepStatusLabel(step.status) + '</span>' +
                            (step.selectedLocator ? '<code class="tc-step-locator">' + escapeHtml(step.selectedLocator.code) + '</code>' : '');
                        row.onclick = function () { setActiveStep(index); };
                        container.appendChild(row);
                    });
                    renderGenerateSection();
                }

                function persistTestData() {
                    if (activeTestData) {
                        vscode.postMessage({ command: 'saveTestCaseData', data: activeTestData });
                    }
                }

                function updateTestDataValue(index, value) {
                    if (!activeTestData) { return; }
                    activeTestData.fields[index].value = value;
                    activeTestData.fields[index].source = value ? 'user' : 'testcase';
                    persistTestData();
                    renderTestDataJsonPreview();
                    renderStatusCells();
                }

                function renderStatusCells() {
                    activeTestData.fields.forEach(function (field, index) {
                        const cell = document.getElementById('tdStatus-' + index);
                        if (!cell) { return; }
                        cell.innerHTML = field.value ? '' : '<span class="badge badge-warning">' + icon('alertTriangle') + 'Required</span>';
                    });
                }

                function testDataSourceLabel(source) {
                    if (source === 'user') { return 'User'; }
                    if (source === 'existing_framework') { return 'Framework'; }
                    return 'Test Case';
                }

                function renderTestDataJsonPreview() {
                    const preview = document.getElementById('tdJsonPreview');
                    if (!preview || !activeTestData) { return; }
                    const obj = {};
                    activeTestData.fields.forEach(function (field) {
                        obj[field.name] = field.value || '';
                    });
                    preview.textContent = JSON.stringify(obj, null, 2);
                }

                function renderTestData() {
                    const container = document.getElementById('tcTestData');
                    if (!container || !activeTestData) { return; }

                    if (activeTestData.fields.length === 0) {
                        container.innerHTML = '<h3>Test Data</h3><p class="tc-empty">No data fields detected in this test case.</p>';
                        renderGenerateSection();
                        return;
                    }

                    let html = '<h3>Test Data</h3><table class="tc-td-table"><thead><tr>' +
                        '<th>Field</th><th>Value</th><th>Source</th><th></th></tr></thead><tbody>';

                    activeTestData.fields.forEach(function (field, index) {
                        html += '<tr>' +
                            '<td>' + escapeHtml(field.name) + '</td>' +
                            '<td><input type="text" class="tc-td-input" id="tdInput-' + index + '" value="' + escapeHtml(field.value || '') + '" /></td>' +
                            '<td>' + escapeHtml(testDataSourceLabel(field.source)) + '</td>' +
                            '<td id="tdStatus-' + index + '">' +
                                (field.value ? '' : '<span class="badge badge-warning">' + icon('alertTriangle') + 'Required</span>') +
                            '</td>' +
                            '</tr>';
                    });

                    html += '</tbody></table>' +
                        '<div class="tc-td-json-label">JSON Preview</div>' +
                        '<pre id="tdJsonPreview" class="tc-td-json"></pre>';

                    container.innerHTML = html;

                    activeTestData.fields.forEach(function (field, index) {
                        document.getElementById('tdInput-' + index).onchange = function (e) {
                            updateTestDataValue(index, e.target.value);
                        };
                    });

                    renderTestDataJsonPreview();
                    renderGenerateSection();
                }

                function inferActionType(tagName, ariaRole) {
                    const tag = (tagName || '').toLowerCase();
                    if (tag === 'input' || tag === 'textarea') { return 'fill'; }
                    if (tag === 'select') { return 'select'; }
                    if (tag === 'button' || ariaRole === 'button') { return 'click'; }
                    if (tag === 'a' || ariaRole === 'link') { return 'click'; }
                    return 'click';
                }

                function computeReadiness() {
                    const hasMapping = !!(activeMapping && activeMapping.steps.some(function (s) { return s.status === 'mapped'; }));
                    const hasTestData = !!(activeTestData && activeTestData.fields.length > 0 && activeTestData.fields.every(function (f) { return !!f.value; }));
                    return { hasMapping: hasMapping, hasTestData: hasTestData };
                }

                function generateAutomation() {
                    if (!selectedTestCasePath) { return; }
                    lastGenerationStage = null;
                    generationOutcome = null;
                    const statusEl = document.getElementById('tcGenStatus');
                    if (statusEl) { statusEl.textContent = 'Starting...'; }
                    renderGenerationStepper();
                    vscode.postMessage({ command: 'generateAutomation', testCasePath: selectedTestCasePath });
                }

                function generationStepperHtml() {
                    const stages = [
                        { key: 'inspecting', label: 'Inspecting Project' },
                        { key: 'calling_model', label: 'AI Generation' },
                        { key: 'reviewing', label: 'Review Changes' },
                        { key: 'done', label: 'Done' }
                    ];
                    const order = ['inspecting', 'calling_model', 'reviewing', 'done'];
                    const currentIdx = lastGenerationStage ? order.indexOf(lastGenerationStage) : -1;

                    let html = '<div class="gen-stepper">';
                    stages.forEach(function (stage, idx) {
                        let state = 'pending';
                        if (generationOutcome === 'error' && idx === currentIdx) {
                            state = 'error';
                        } else if (generationOutcome === 'cancelled' && idx === currentIdx) {
                            state = 'warning';
                        } else if (idx < currentIdx || (idx === currentIdx && stage.key === 'done')) {
                            state = 'done';
                        } else if (idx === currentIdx) {
                            state = 'active';
                        }

                        const label = (stage.key === 'done' && generationOutcome === 'cancelled') ? 'Cancelled' : stage.label;
                        const iconName = state === 'done' ? 'checkCircle' : ((state === 'error' || state === 'warning') ? 'alertTriangle' : 'circle');
                        html += '<div class="gen-step gen-step-' + state + '">' +
                            '<span class="gen-step-icon">' + icon(iconName) + '</span>' +
                            '<span class="gen-step-label">' + escapeHtml(label) + '</span>' +
                            '</div>';
                    });
                    html += '</div>';
                    return html;
                }

                function renderGenerationStepper() {
                    const container = document.getElementById('tcGenStepper');
                    if (container) { container.innerHTML = generationStepperHtml(); }
                }

                function renderWorkflowStepper() {
                    const container = document.getElementById('tcWorkflowStepper');
                    if (!container) { return; }

                    const hasTestCase = !!selectedTestCasePath;
                    const readiness = computeReadiness();
                    const generationStarted = !!lastGenerationStage;
                    const generationDone = lastGenerationStage === 'done' && !generationOutcome;

                    const nodes = [
                        { label: 'Select Test Case', done: hasTestCase },
                        { label: 'Map UI to Steps', done: readiness.hasMapping },
                        { label: 'Test Data', done: readiness.hasTestData },
                        { label: 'Generate Automation', done: generationStarted },
                        { label: 'Review & Apply', done: generationDone }
                    ];

                    let html = '';
                    nodes.forEach(function (node, idx) {
                        const state = node.done ? 'done' : ((idx === 0 || nodes[idx - 1].done) ? 'active' : 'pending');
                        html += '<div class="wf-step wf-step-' + state + '">' +
                            icon(node.done ? 'checkCircle' : 'circle') +
                            '<span>' + escapeHtml(node.label) + '</span>' +
                            '</div>';
                        if (idx < nodes.length - 1) {
                            html += '<span class="wf-step-arrow">' + icon('chevron') + '</span>';
                        }
                    });
                    container.innerHTML = html;
                }

                function renderGenerateSection() {
                    const container = document.getElementById('tcGenerate');
                    if (!container) { return; }
                    const readiness = computeReadiness();
                    container.innerHTML =
                        '<h3>Generate Automation</h3>' +
                        '<div class="tc-gen-checklist">' +
                            '<div class="gen-check-item">' + icon(readiness.hasMapping ? 'checkCircle' : 'circle') + '<span>Locator Mapping</span></div>' +
                            '<div class="gen-check-item">' + icon(readiness.hasTestData ? 'checkCircle' : 'circle') + '<span>Test Data</span></div>' +
                        '</div>' +
                        '<button class="btn-primary tc-gen-btn" onclick="generateAutomation()">' + icon('flask') + 'Generate Automation</button>' +
                        '<div id="tcGenStepper"></div>' +
                        '<div id="tcGenStatus" class="tc-gen-status"></div>';
                    renderGenerationStepper();
                    renderWorkflowStepper();
                }

                function renderAutomationContext(hasContext) {
                    const container = document.getElementById('tcAutomationContext');
                    if (!container) { return; }
                    container.innerHTML =
                        '<h3>Automation Context</h3>' +
                        '<div class="tc-ac-status"><span class="badge ' + (hasContext ? 'badge-success' : 'badge-neutral') + '">' +
                            icon(hasContext ? 'checkCircle' : 'circle') + (hasContext ? 'Available' : 'Not created yet') +
                        '</span></div>' +
                        '<p>Optional. Add existing test/Page Object pointers, business logic, test data notes, or database validation intent for this test case here — or leave it blank and FrameworkPilot proceeds normally.</p>' +
                        '<button class="btn-secondary" onclick="openAutomationContext()">' + icon('fileText') +
                            (hasContext ? 'Open / Edit Context' : 'Create / Open Context') +
                        '</button>';
                }

                function openAutomationContext() {
                    if (!currentTestCase) { return; }
                    vscode.postMessage({ command: 'openTestCaseContext', testCase: currentTestCase });
                }

                function openProjectInVSCode() {
                    vscode.postMessage({ command: 'openProjectInVSCode' });
                }

                function openInstructionsFile() {
                    vscode.postMessage({ command: 'openInstructions' });
                }

                function openSkillFile() {
                    vscode.postMessage({ command: 'openSkill' });
                }

                function renderProjectReadiness(hasPath, isExisting) {
                    const el = document.getElementById('fwProjectReadiness');
                    if (!el) { return; }
                    if (!hasPath) {
                        el.innerHTML = icon('info') + '<span>Set and save a Project Path above to enable project actions.</span>';
                    } else if (isExisting) {
                        el.innerHTML = icon('folder') + '<span>Project status: existing files detected &mdash; FrameworkPilot will inspect and reuse them.</span>';
                    } else {
                        el.innerHTML = icon('folder') + '<span>Project status: empty &mdash; FrameworkPilot will bootstrap a new framework here.</span>';
                    }
                }

                window.addEventListener('message', function (event) {
                    const message = event.data;

                    if (message.command === 'testCasesListed') {
                        renderTestCaseList(message.testCases);
                    } else if (message.command === 'localTestCaseLoaded') {
                        renderTestCaseDetail(message.testCase, true);
                    } else if (message.command === 'testCaseSelected') {
                        selectedTestCasePath = message.testCase.filePath;
                        lastGenerationStage = null;
                        generationOutcome = null;
                        renderTestCaseDetail(message.testCase, false, message.hasAutomationContext);
                        vscode.postMessage({ command: 'listTestCases' });
                    } else if (message.command === 'testCaseMappingLoaded') {
                        activeMapping = message.mapping;
                        renderSteps();
                        renderActiveStepBanner();
                    } else if (message.command === 'testCaseDataLoaded') {
                        activeTestData = message.data;
                        renderTestData();
                    } else if (message.command === 'projectReadinessLoaded') {
                        renderProjectReadiness(message.hasPath, message.isExisting);
                    } else if (message.command === 'generationStatus') {
                        if (message.status === 'cancelled' || message.status === 'error') {
                            generationOutcome = message.status;
                        } else {
                            lastGenerationStage = message.status;
                            generationOutcome = null;
                        }
                        const statusEl = document.getElementById('tcGenStatus');
                        if (statusEl) {
                            statusEl.textContent = message.message;
                        }
                        renderGenerationStepper();
                        renderWorkflowStepper();
                    } else if (message.command === 'captureStatus') {
                        setCaptureStatus(message.status, message.message);
                    } else if (message.command === 'locatorCandidates') {
                        const suggestedStepIndex = activeMapping ? suggestStepForElement(message.element, activeMapping.steps) : null;
                        capturedElements.unshift({ element: message.element, candidates: message.candidates, selected: null, expanded: false, forStepIndex: suggestedStepIndex });
                        renderTable();

                        if (activeMapping) {
                            recomputeMappingFromCapturedElements();
                        }
                    } else if (message.command === 'frameworkConfigLoaded') {
                        renderFrameworkConfig(message.config);
                    } else if (message.command === 'filePicked') {
                        const fieldToInputId = {
                            projectPath: 'fwProjectPath',
                            testCaseFile: 'fwTestCaseFile',
                            existingPomFile: 'fwExistingPomFile',
                            existingTestFile: 'fwExistingTestFile',
                            testCaseExcelPath: 'fwTestCaseExcelPath'
                        };
                        const inputId = fieldToInputId[message.field];
                        if (inputId) {
                            document.getElementById(inputId).value = message.path;
                        }
                    }
                });
            </script>

        </body>
        </html>
    `;
}
