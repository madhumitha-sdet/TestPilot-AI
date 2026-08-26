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
 * This is UI-only: the sidebar navigation swaps visible content
 * entirely inside the Webview using plain JavaScript. No messages
 * are sent back to the extension host yet, because none of these
 * pages perform real work (no ADO calls, no AI, no Python) at this stage.
 */
export function getDashboardHtml(): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
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
                    padding: 20px 0;
                    box-sizing: border-box;
                }

                .sidebar h1 {
                    font-size: 15px;
                    margin: 0 20px 20px 20px;
                }

                .nav-item {
                    display: block;
                    width: 100%;
                    padding: 10px 20px;
                    background: none;
                    border: none;
                    text-align: left;
                    color: var(--vscode-foreground);
                    cursor: pointer;
                    font-size: 13px;
                }

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
                }

                .page p {
                    color: var(--vscode-descriptionForeground);
                    line-height: 1.5;
                }

                .fw-config-form {
                    max-width: 500px;
                }

                .fw-config-form label {
                    display: block;
                    margin-top: 14px;
                    margin-bottom: 6px;
                    font-size: 13px;
                }

                .fw-config-form select,
                .fw-config-form input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                }

                .fw-path-row {
                    display: flex;
                    gap: 8px;
                }

                .fw-path-row input { flex: 1; }

                .fw-path-row button {
                    padding: 8px 12px;
                    background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
                    color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
                    border: none;
                    cursor: pointer;
                    white-space: nowrap;
                }

                .fw-save-btn {
                    margin-top: 20px;
                    padding: 8px 18px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    cursor: pointer;
                }

                .fw-save-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                .fw-saved-summary {
                    margin-top: 24px;
                    max-width: 500px;
                    padding: 12px 16px;
                    border: 1px solid var(--vscode-input-border);
                    font-size: 12px;
                    line-height: 1.6;
                }

                .fw-saved-summary .fw-summary-label {
                    color: var(--vscode-descriptionForeground);
                }

                .fw-project-actions {
                    margin-top: 20px;
                    max-width: 500px;
                }

                .fw-project-actions h3 {
                    font-size: 13px;
                    margin-bottom: 6px;
                }

                .fw-project-readiness {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 10px;
                }

                .fw-project-btn {
                    padding: 6px 12px;
                    margin-right: 8px;
                    margin-bottom: 6px;
                    background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
                    color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
                    border: none;
                    cursor: pointer;
                    font-size: 12px;
                }

                .tc-generate {
                    margin-top: 16px;
                }

                .tc-generate h3 {
                    font-size: 13px;
                    margin-bottom: 8px;
                }

                .tc-gen-checklist {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 10px;
                }

                .tc-gen-btn {
                    padding: 8px 16px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    cursor: pointer;
                }

                .tc-gen-status {
                    margin-top: 10px;
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    max-width: 500px;
                }

                .tc-import-btn {
                    margin-top: 10px;
                    padding: 8px 16px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    cursor: pointer;
                }

                .tc-layout {
                    display: flex;
                    gap: 20px;
                    margin-top: 20px;
                    max-width: 900px;
                }

                .tc-list, .tc-detail {
                    flex: 1;
                    border: 1px solid var(--vscode-input-border);
                    padding: 12px 16px;
                }

                .tc-list h3, .tc-detail h3 {
                    margin-top: 0;
                    font-size: 13px;
                }

                .tc-empty {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }

                .tc-list-item {
                    padding: 8px;
                    font-size: 12px;
                    cursor: pointer;
                    border-bottom: 1px solid var(--vscode-input-border);
                }

                .tc-list-item:hover {
                    background: var(--vscode-list-hoverBackground);
                }

                .tc-list-item.selected {
                    background: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                }

                .tc-detail-meta {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 10px;
                }

                .tc-use-btn {
                    margin-top: 10px;
                    padding: 6px 14px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    cursor: pointer;
                }

                .tc-raw-markdown {
                    margin-top: 12px;
                    padding: 10px;
                    background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.15));
                    font-family: var(--vscode-editor-font-family, monospace);
                    font-size: 11px;
                    white-space: pre-wrap;
                    max-height: 300px;
                    overflow-y: auto;
                }

                .tc-steps {
                    margin-top: 14px;
                }

                .tc-step-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 8px;
                    font-size: 12px;
                    border-left: 3px solid var(--vscode-input-border);
                    cursor: pointer;
                    margin-bottom: 4px;
                }

                .tc-step-row:hover {
                    background: var(--vscode-list-hoverBackground);
                }

                .tc-step-row.active {
                    border-left-color: var(--vscode-button-background);
                    background: var(--vscode-list-hoverBackground);
                }

                .tc-step-num {
                    color: var(--vscode-descriptionForeground);
                }

                .tc-step-text {
                    flex: 1;
                }

                .tc-step-status {
                    font-size: 10px;
                    padding: 2px 8px;
                    white-space: nowrap;
                }

                .status-not_captured { background: var(--vscode-input-border); }
                .status-captured { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
                .status-mapped { background: var(--vscode-testing-iconPassed, #4caf50); color: #fff; }

                .tc-step-locator {
                    font-family: var(--vscode-editor-font-family, monospace);
                    font-size: 10px;
                    max-width: 200px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .tc-capture-btn {
                    margin-top: 12px;
                    padding: 8px 16px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    cursor: pointer;
                }

                .active-step-banner {
                    margin-top: 12px;
                    padding: 8px 14px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    font-size: 12px;
                    max-width: 700px;
                }

                .tc-testdata {
                    margin-top: 16px;
                }

                .tc-testdata h3 {
                    font-size: 13px;
                    margin-bottom: 8px;
                }

                .tc-td-table {
                    width: 100%;
                    max-width: 500px;
                    border-collapse: collapse;
                    font-size: 12px;
                }

                .tc-td-table th {
                    text-align: left;
                    padding: 4px 8px;
                    border-bottom: 1px solid var(--vscode-input-border);
                    color: var(--vscode-descriptionForeground);
                    font-weight: normal;
                }

                .tc-td-table td {
                    padding: 4px 8px;
                    border-bottom: 1px solid var(--vscode-input-border);
                }

                .tc-td-input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 4px 6px;
                    border: 1px solid var(--vscode-input-border);
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-size: 12px;
                }

                .tc-td-status {
                    font-size: 10px;
                    color: var(--vscode-descriptionForeground);
                }

                .tc-td-missing {
                    color: var(--vscode-errorForeground, #f44336);
                }

                .tc-td-json-label {
                    font-size: 11px;
                    font-weight: bold;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 12px;
                }

                .tc-td-json {
                    margin-top: 6px;
                    padding: 8px;
                    background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.15));
                    font-family: var(--vscode-editor-font-family, monospace);
                    font-size: 11px;
                    max-width: 400px;
                }

                #adoConfig label {
                display: block;
                margin-top: 14px;
                margin-bottom: 6px;
                font-size: 13px;
                }

                #adoConfig input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                }

                #adoConfig button {
                    margin-top: 20px;
                    padding: 8px 18px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    cursor: pointer;
                }

                #adoConfig button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .capture-toolbar {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    max-width: 700px;
                }

                .capture-toolbar input {
                    flex: 1;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                }

                .capture-toolbar button {
                    padding: 8px 16px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    cursor: pointer;
                    white-space: nowrap;
                }

                .capture-toolbar button:disabled { opacity: 0.5; cursor: default; }

                .status-pill {
                    padding: 4px 10px;
                    border-radius: 10px;
                    font-size: 11px;
                    white-space: nowrap;
                }
                .status-idle, .status-stopped { background: var(--vscode-input-border); }
                .status-launching, .status-capturing { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
                .status-ready { background: var(--vscode-testing-iconPassed, #4caf50); color: #fff; }
                .status-error { background: var(--vscode-testing-iconFailed, #f44336); color: #fff; }

                .capture-mode-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 12px;
                }

                .mode-label {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }

                .mode-btn {
                    padding: 5px 12px;
                    font-size: 12px;
                    background: none;
                    border: 1px solid var(--vscode-input-border);
                    color: var(--vscode-foreground);
                    cursor: pointer;
                }

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
                    margin-top: 20px;
                    max-width: 900px;
                    font-size: 13px;
                }

                .clear-all-btn {
                    padding: 4px 10px;
                    font-size: 12px;
                    background: none;
                    border: 1px solid var(--vscode-input-border);
                    color: var(--vscode-foreground);
                    cursor: pointer;
                }

                .capture-table {
                    width: 100%;
                    max-width: 900px;
                    margin-top: 8px;
                    border-collapse: collapse;
                    font-size: 12px;
                }

                .capture-table th {
                    text-align: left;
                    padding: 6px 8px;
                    border-bottom: 1px solid var(--vscode-input-border);
                    color: var(--vscode-descriptionForeground);
                    font-weight: normal;
                }

                .capture-table td {
                    padding: 6px 8px;
                    border-bottom: 1px solid var(--vscode-input-border);
                    vertical-align: middle;
                }

                .capture-table tbody tr.data-row { cursor: pointer; }
                .capture-table tbody tr.data-row:hover { background: var(--vscode-list-hoverBackground); }

                .col-num, .col-type, .col-score, .col-select, .col-step { white-space: nowrap; }

                .row-step-select {
                    font-size: 11px;
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

                .recommended-tag {
                    font-size: 10px;
                    margin-left: 6px;
                    padding: 1px 6px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }

                .detail-row td {
                    background: var(--vscode-editor-background);
                    border-bottom: 1px solid var(--vscode-input-border);
                    padding: 12px 16px;
                }

                .detail-section-label {
                    font-size: 11px;
                    font-weight: bold;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 8px;
                }

                .detail-section-label:first-child { margin-top: 0; }

                .detail-code {
                    display: block;
                    margin: 4px 0;
                    padding: 6px 8px;
                    background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.15));
                    font-family: var(--vscode-editor-font-family, monospace);
                    font-size: 12px;
                    word-break: break-all;
                }

                .detail-rationale {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                }

                .copy-btn {
                    font-size: 11px;
                    margin-left: 8px;
                    cursor: pointer;
                    color: var(--vscode-textLink-foreground, #3794ff);
                }

                .alt-item {
                    padding: 4px 10px;
                    border-left: 3px solid var(--vscode-input-border);
                    margin-top: 6px;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>

            <div class="sidebar">
                <h1>FrameworkPilot</h1>
                <button class="nav-item active" data-page="dashboard" onclick="showPage('dashboard')">Dashboard</button>
                <button class="nav-item" data-page="frameworkConfig" onclick="showPage('frameworkConfig')">Framework Configuration</button>
                <button class="nav-item" data-page="importAdo" onclick="showPage('importAdo')">Import from ADO</button>
                <button class="nav-item" data-page="testCases" onclick="showPage('testCases')">Test Cases</button>
                <button class="nav-item" data-page="generateScripts" onclick="showPage('generateScripts')">Generate Test Scripts</button>
                <button class="nav-item" data-page="captureElements" onclick="showPage('captureElements')">Capture UI Elements</button>
                <button class="nav-item" data-page="updatePom" onclick="showPage('updatePom')">Update POM &amp; Run Tests</button>
                <button class="nav-item" data-page="settings" onclick="showPage('settings')">Settings</button>
            </div>

            <div class="content">
                <div id="dashboard" class="page active">
                    <h2>Dashboard</h2>
                    <p>Welcome to FrameworkPilot. Use the navigation on the left to import test cases, generate automation scripts, and manage your framework.</p>
                </div>

                <div id="frameworkConfig" class="page">
                    <h2>Framework Configuration</h2>
                    <p>Define how FrameworkPilot should work with your automation project. This does not generate or modify any code yet.</p>

                    <div class="fw-config-form">
                        <label>Framework Source</label>
                        <select id="fwMode">
                            <option value="existing">Use an existing framework/project</option>
                            <option value="new">Create a new framework</option>
                        </select>

                        <label>Language</label>
                        <select id="fwLanguage"></select>

                        <label>Automation Tool</label>
                        <select id="fwAutomationTool"></select>

                        <label>Test Runner</label>
                        <select id="fwTestRunner"></select>

                        <label>Architecture</label>
                        <select id="fwArchitecture"></select>

                        <label>Test Data Approach</label>
                        <select id="fwTestDataApproach"></select>

                        <label>Project Path (optional)</label>
                        <div class="fw-path-row">
                            <input id="fwProjectPath" placeholder="Path to your automation project folder" />
                            <button onclick="pickPath('projectPath')">Browse...</button>
                        </div>

                        <label>Test Case File (optional)</label>
                        <div class="fw-path-row">
                            <input id="fwTestCaseFile" placeholder="Path to a test case file (e.g. login_test_case.md)" />
                            <button onclick="pickPath('testCaseFile')">Browse...</button>
                        </div>

                        <label>Existing POM File (optional)</label>
                        <div class="fw-path-row">
                            <input id="fwExistingPomFile" placeholder="Path to an existing Page Object file" />
                            <button onclick="pickPath('existingPomFile')">Browse...</button>
                        </div>

                        <label>Existing Test File (optional)</label>
                        <div class="fw-path-row">
                            <input id="fwExistingTestFile" placeholder="Path to an existing test file" />
                            <button onclick="pickPath('existingTestFile')">Browse...</button>
                        </div>

                        <label>Test Case Excel Workbook (optional)</label>
                        <div class="fw-path-row">
                            <input id="fwTestCaseExcelPath" placeholder="Path to an .xlsx workbook (one sheet per test case)" />
                            <button onclick="pickPath('testCaseExcelPath')">Browse...</button>
                        </div>

                        <button class="fw-save-btn" onclick="saveFrameworkConfiguration()">Save Configuration</button>
                    </div>

                    <div id="fwSavedSummary" class="fw-saved-summary"></div>

                    <div class="fw-project-actions">
                        <h3>Project</h3>
                        <div id="fwProjectReadiness" class="fw-project-readiness"></div>
                        <button class="fw-project-btn" onclick="openProjectInVSCode()">Open Project in VS Code</button>
                        <button class="fw-project-btn" onclick="openInstructionsFile()">Open instructions.md</button>
                        <button class="fw-project-btn" onclick="openSkillFile()">Open skill.md</button>
                    </div>
                </div>

                <div id="importAdo" class="page">
                    <h2>Import from ADO</h2>
                    <p>This module will import test cases from Azure DevOps.</p>
                    <p>Coming soon.</p>
                </div>

                <div id="testCases" class="page">
                    <h2>Test Cases</h2>
                    <p>Select a normalized test case to work with, or import a local Markdown test case file.</p>

                    <button class="tc-import-btn" onclick="importLocalTestCase()">Import Local Markdown Test Case</button>

                    <div class="tc-layout">
                        <div class="tc-list">
                            <h3>Available Test Cases</h3>
                            <div id="tcGeneratedList" class="tc-list-items"><p class="tc-empty">None yet.</p></div>
                        </div>

                        <div class="tc-detail">
                            <h3>Selected Test Case</h3>
                            <div id="tcDetail" class="tc-detail-body"><p class="tc-empty">No test case selected.</p></div>
                        </div>
                    </div>
                </div>

                <div id="generateScripts" class="page">
                    <h2>Generate Test Scripts</h2>
                    <p>This module will allow FrameworkPilot to generate automation scripts from Azure DevOps test cases.</p>
                    <p>Coming soon.</p>
                </div>

                <div id="captureElements" class="page">
                    <h2>Capture UI Elements</h2>

                    <div class="capture-toolbar">
                        <input id="captureUrl" placeholder="https://example.com" />
                        <button id="startCaptureBtn" onclick="startCapture()">Start Capture</button>
                        <button id="stopCaptureBtn" onclick="stopCapture()" disabled>Stop Capture</button>
                        <span id="captureStatus" class="status-pill status-idle">Idle</span>
                    </div>

                    <div class="capture-mode-row">
                        <span class="mode-label">Capture Mode:</span>
                        <button id="manualModeBtn" class="mode-btn active" onclick="setCaptureMode('manual')" disabled>Manual Capture</button>
                        <button id="areaModeBtn" class="mode-btn" onclick="setCaptureMode('area')" disabled>Select Area</button>
                    </div>

                    <div id="activeStepBanner" class="active-step-banner" style="display:none;"></div>

                    <div class="capture-table-header">
                        <span id="capturedCount">Captured Elements (0)</span>
                        <button class="clear-all-btn" onclick="clearAllCaptured()">Clear All</button>
                    </div>

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
                </div>

                <div id="updatePom" class="page">
                    <h2>Update POM &amp; Run Tests</h2>
                    <p>This module will update Page Object files and run tests.</p>
                    <p>Coming soon.</p>
                </div>

                <div id="settings" class="page">
                <h2>Settings</h2>

                <div id="settingsMenu">
                    <button class="nav-item" onclick="showSettingsSection('adoConfig')" style="border: 1px solid var(--vscode-input-border); width: auto; margin-bottom: 10px;">
                        Azure DevOps Configuration
                    </button>
                </div>

                <div id="adoConfig" style="display:none; max-width: 500px; margin-top: 20px;">

                    <label>Organization URL</label>
                    <input id="organizationUrl" placeholder="https://dev.azure.com/your-organization" />

                    <label>Project Name</label>
                    <input id="projectName" placeholder="TestFrameworkPilot" />

                    <label>Personal Access Token</label>
                    <input id="pat" type="password" placeholder="Enter Azure DevOps PAT" />

                    <label>Test Plan ID (optional)</label>
                    <input id="planId" placeholder="Test Plan ID" />

                    <label>Test Suite ID (optional)</label>
                    <input id="suiteId" placeholder="Test Suite ID" />

                    <button onclick="saveAdoConfiguration()">Save Configuration</button>
                </div>
            </div>
                        </div>

            <script>
                const vscode = acquireVsCodeApi();

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

                populateAllFwSelects();

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
                        '<div><span class="fw-summary-label">Mode:</span> ' + escapeHtml(config.frameworkMode) + '</div>' +
                        '<div><span class="fw-summary-label">Stack:</span> ' + escapeHtml(config.language) + ' / ' + escapeHtml(config.automationTool) + ' / ' + escapeHtml(config.testRunner) + ' / ' + escapeHtml(config.architecture) + '</div>' +
                        '<div><span class="fw-summary-label">Test Data:</span> ' + escapeHtml(config.testDataApproach) + '</div>' +
                        '<div><span class="fw-summary-label">Project Path:</span> ' + escapeHtml(config.projectPath || 'Not set') + '</div>' +
                        '<div><span class="fw-summary-label">Test Case File:</span> ' + escapeHtml(config.testCaseFile || 'Not set') + '</div>' +
                        '<div><span class="fw-summary-label">Existing POM File:</span> ' + escapeHtml(config.existingPomFile || 'Not set') + '</div>' +
                        '<div><span class="fw-summary-label">Existing Test File:</span> ' + escapeHtml(config.existingTestFile || 'Not set') + '</div>' +
                        '<div><span class="fw-summary-label">Test Case Excel:</span> ' + escapeHtml(config.testCaseExcelPath || 'Not set') + '</div>';
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

                function setCaptureStatus(status, message) {
                    const el = document.getElementById('captureStatus');
                    el.className = 'status-pill status-' + status;
                    el.textContent = status.charAt(0).toUpperCase() + status.slice(1);
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
                    tbody.innerHTML = '';

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
                            '<td class="col-num">' + index + '</td>' +
                            '<td>' + escapeHtml(elementLabel(entry.element)) + '</td>' +
                            '<td class="col-step">' + stepCellHtml + '</td>' +
                            '<td><span class="row-locator-code">' + escapeHtml(active.code) + '</span>' +
                                (active === recommended ? '<span class="recommended-tag">Recommended</span>' : '') + '</td>' +
                            '<td class="col-type">' + escapeHtml(active.type) + '</td>' +
                            '<td class="col-score">' + escapeHtml(active.score) + '</td>' +
                            '<td class="col-select"><input type="checkbox" checked disabled /></td>';
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
                            html += '<div class="detail-section-label">RECOMMENDED LOCATOR</div>';
                            html += '<code class="detail-code">' + escapeHtml(recommended.code) +
                                '<span class="copy-btn" data-copy-recommended="' + index + '">Copy</span></code>';
                            html += '<div class="detail-rationale">' + escapeHtml(recommended.rationale) + '</div>';

                            if (alternatives.length > 0) {
                                html += '<div class="detail-section-label">ALTERNATIVE CANDIDATES</div>';
                                alternatives.forEach(function (candidate, altIndex) {
                                    html += '<div class="alt-item" data-idx="' + index + '" data-alt="' + altIndex + '">' +
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
                                el.onclick = function (e) {
                                    e.stopPropagation();
                                    selectCandidate(index, alternatives[+el.getAttribute('data-alt')]);
                                };
                            });
                        }
                    });
                }

                let selectedTestCasePath = null;

                function importLocalTestCase() {
                    vscode.postMessage({ command: 'pickLocalTestCaseFile' });
                }

                function selectTestCase(filePath) {
                    vscode.postMessage({ command: 'selectTestCase', path: filePath });
                }

                function renderTestCaseList(testCases) {
                    const container = document.getElementById('tcGeneratedList');
                    if (!testCases || testCases.length === 0) {
                        container.innerHTML = '<p class="tc-empty">None yet.</p>';
                        return;
                    }
                    container.innerHTML = '';
                    testCases.forEach(function (tc) {
                        const item = document.createElement('div');
                        item.className = 'tc-list-item' + (tc.filePath === selectedTestCasePath ? ' selected' : '');
                        item.textContent = tc.id + ' - ' + tc.title + '  [' + tc.source + ']';
                        item.onclick = function () { selectTestCase(tc.filePath); };
                        container.appendChild(item);
                    });
                }

                let activeMapping = null;

                function renderTestCaseDetail(testCase, showUseButton) {
                    selectedTestCasePath = showUseButton ? selectedTestCasePath : testCase.filePath;
                    const container = document.getElementById('tcDetail');

                    container.innerHTML =
                        '<div class="tc-detail-meta">' +
                            'ID: ' + escapeHtml(testCase.id) + ' &middot; ' +
                            'Source: ' + escapeHtml(testCase.source) + ' &middot; ' +
                            'Steps: ' + escapeHtml((testCase.steps || []).length) +
                        '</div>' +
                        '<div><strong>' + escapeHtml(testCase.title) + '</strong></div>' +
                        (showUseButton ? '<button class="tc-use-btn" id="tcUseBtn">Use This Test Case</button>' : '') +
                        '<div id="tcSteps" class="tc-steps"></div>' +
                        (showUseButton ? '' : '<div id="tcTestData" class="tc-testdata"></div>') +
                        (showUseButton ? '' : '<button class="tc-capture-btn" onclick="startCaptureForTestCase()">Start Capture for This Test Case</button>') +
                        (showUseButton ? '' : '<div id="tcGenerate" class="tc-generate"></div>') +
                        '<pre class="tc-raw-markdown">' + escapeHtml(testCase.rawMarkdown || '') + '</pre>';

                    if (showUseButton) {
                        document.getElementById('tcUseBtn').onclick = function () {
                            selectTestCase(testCase.filePath);
                        };
                    } else {
                        vscode.postMessage({ command: 'requestTestCaseMapping', testCase: testCase });
                        vscode.postMessage({ command: 'requestTestCaseData', testCase: testCase });
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
                        banner.style.display = 'block';
                        banner.textContent = 'Capturing for test case ' + activeMapping.testCaseId + ' (' + activeMapping.steps.length + ' step(s)) \u2014 assign each captured element to a step in the table below.';
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
                        row.innerHTML =
                            '<span class="tc-step-num">' + (index + 1) + '</span>' +
                            '<span class="tc-step-text">' + escapeHtml(step.stepText) + '</span>' +
                            '<span class="tc-step-status status-' + step.status + '">' + stepStatusLabel(step.status) + '</span>' +
                            (step.selectedLocator ? '<code class="tc-step-locator">' + escapeHtml(step.selectedLocator.code) + '</code>' : '');
                        row.onclick = function () { setActiveStep(index); };
                        container.appendChild(row);
                    });
                    renderGenerateSection();
                }

                let activeTestData = null;

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
                        cell.textContent = field.value ? '' : 'Required value';
                        cell.className = field.value ? 'tc-td-status' : 'tc-td-status tc-td-missing';
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
                            '<td id="tdStatus-' + index + '" class="' + (field.value ? 'tc-td-status' : 'tc-td-status tc-td-missing') + '">' +
                                (field.value ? '' : 'Required value') +
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
                    document.getElementById('tcGenStatus').textContent = 'Starting...';
                    vscode.postMessage({ command: 'generateAutomation', testCasePath: selectedTestCasePath });
                }

                function renderGenerateSection() {
                    const container = document.getElementById('tcGenerate');
                    if (!container) { return; }
                    const readiness = computeReadiness();
                    container.innerHTML =
                        '<h3>Generate Automation</h3>' +
                        '<div class="tc-gen-checklist">' +
                            '<div>' + (readiness.hasMapping ? '\u2713' : '\u25CB') + ' Locator Mapping</div>' +
                            '<div>' + (readiness.hasTestData ? '\u2713' : '\u25CB') + ' Test Data</div>' +
                        '</div>' +
                        '<button class="tc-gen-btn" onclick="generateAutomation()">Generate Automation</button>' +
                        '<div id="tcGenStatus" class="tc-gen-status"></div>';
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
                        el.textContent = 'Set and save a Project Path above to enable project actions.';
                    } else if (isExisting) {
                        el.textContent = 'Project status: existing files detected — FrameworkPilot will inspect and reuse them.';
                    } else {
                        el.textContent = 'Project status: empty — FrameworkPilot will bootstrap a new framework here.';
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
                        renderTestCaseDetail(message.testCase, false);
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
                        const statusEl = document.getElementById('tcGenStatus');
                        if (statusEl) {
                            statusEl.textContent = message.message;
                        }
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