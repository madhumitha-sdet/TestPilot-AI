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

                .col-num, .col-type, .col-score, .col-select { white-space: nowrap; }

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
                        <select id="fwLanguage">
                            <option value="python">Python</option>
                        </select>

                        <label>Automation Tool</label>
                        <select id="fwAutomationTool">
                            <option value="playwright">Playwright</option>
                        </select>

                        <label>Test Runner</label>
                        <select id="fwTestRunner">
                            <option value="pytest">Pytest</option>
                        </select>

                        <label>Architecture</label>
                        <select id="fwArchitecture">
                            <option value="page_object_model">Page Object Model</option>
                        </select>

                        <label>Test Data Approach</label>
                        <select id="fwTestDataApproach">
                            <option value="json">JSON</option>
                        </select>

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

                        <button class="fw-save-btn" onclick="saveFrameworkConfiguration()">Save Configuration</button>
                    </div>

                    <div id="fwSavedSummary" class="fw-saved-summary"></div>
                </div>

                <div id="importAdo" class="page">
                    <h2>Import from ADO</h2>
                    <p>This module will import test cases from Azure DevOps.</p>
                    <p>Coming soon.</p>
                </div>

                <div id="testCases" class="page">
                    <h2>Test Cases</h2>
                    <p>This module will display imported and generated test cases.</p>
                    <p>Coming soon.</p>
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

                    <div class="capture-table-header">
                        <span id="capturedCount">Captured Elements (0)</span>
                        <button class="clear-all-btn" onclick="clearAllCaptured()">Clear All</button>
                    </div>

                    <table class="capture-table">
                        <thead>
                            <tr>
                                <th class="col-num">#</th>
                                <th>Element</th>
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
                        existingTestFile: document.getElementById('fwExistingTestFile').value
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

                    const summary = document.getElementById('fwSavedSummary');
                    summary.innerHTML =
                        '<div><span class="fw-summary-label">Mode:</span> ' + escapeHtml(config.frameworkMode) + '</div>' +
                        '<div><span class="fw-summary-label">Stack:</span> ' + escapeHtml(config.language) + ' / ' + escapeHtml(config.automationTool) + ' / ' + escapeHtml(config.testRunner) + ' / ' + escapeHtml(config.architecture) + '</div>' +
                        '<div><span class="fw-summary-label">Test Data:</span> ' + escapeHtml(config.testDataApproach) + '</div>' +
                        '<div><span class="fw-summary-label">Project Path:</span> ' + escapeHtml(config.projectPath || 'Not set') + '</div>' +
                        '<div><span class="fw-summary-label">Test Case File:</span> ' + escapeHtml(config.testCaseFile || 'Not set') + '</div>' +
                        '<div><span class="fw-summary-label">Existing POM File:</span> ' + escapeHtml(config.existingPomFile || 'Not set') + '</div>' +
                        '<div><span class="fw-summary-label">Existing Test File:</span> ' + escapeHtml(config.existingTestFile || 'Not set') + '</div>';
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
                    renderTable();
                }

                function copyCode(code) {
                    navigator.clipboard.writeText(code);
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
                        row.innerHTML =
                            '<td class="col-num">' + index + '</td>' +
                            '<td>' + escapeHtml(elementLabel(entry.element)) + '</td>' +
                            '<td><span class="row-locator-code">' + escapeHtml(active.code) + '</span>' +
                                (active === recommended ? '<span class="recommended-tag">Recommended</span>' : '') + '</td>' +
                            '<td class="col-type">' + escapeHtml(active.type) + '</td>' +
                            '<td class="col-score">' + escapeHtml(active.score) + '</td>' +
                            '<td class="col-select"><input type="checkbox" checked disabled /></td>';
                        row.onclick = function () { toggleExpand(index); };
                        tbody.appendChild(row);

                        if (entry.expanded) {
                            const detailRow = document.createElement('tr');
                            detailRow.className = 'detail-row';

                            let html = '<td colspan="6">';
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

                window.addEventListener('message', function (event) {
                    const message = event.data;

                    if (message.command === 'captureStatus') {
                        setCaptureStatus(message.status, message.message);
                    } else if (message.command === 'locatorCandidates') {
                        capturedElements.unshift({ element: message.element, candidates: message.candidates, selected: null, expanded: false });
                        renderTable();
                    } else if (message.command === 'frameworkConfigLoaded') {
                        renderFrameworkConfig(message.config);
                    } else if (message.command === 'filePicked') {
                        const fieldToInputId = {
                            projectPath: 'fwProjectPath',
                            testCaseFile: 'fwTestCaseFile',
                            existingPomFile: 'fwExistingPomFile',
                            existingTestFile: 'fwExistingTestFile'
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