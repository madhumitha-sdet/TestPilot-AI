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
                
                .capture-controls {
                    max-width: 500px;
                }

                .capture-controls label {
                    display: block;
                    margin-top: 14px;
                    margin-bottom: 6px;
                    font-size: 13px;
                }

                .capture-controls input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                }

                .capture-buttons {
                    margin-top: 14px;
                    display: flex;
                    gap: 10px;
                }

                .capture-buttons button {
                    padding: 8px 18px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    cursor: pointer;
                }

                .capture-buttons button:hover:not(:disabled) {
                    background: var(--vscode-button-hoverBackground);
                }

                .capture-buttons button:disabled {
                    opacity: 0.5;
                    cursor: default;
                }

                .capture-status {
                    margin-top: 18px;
                    padding: 10px 14px;
                    border-left: 3px solid var(--vscode-input-border);
                    font-size: 13px;
                    max-width: 500px;
                }

                .status-idle {
                    border-left-color: var(--vscode-input-border);
                }

                .status-launching, .status-capturing {
                    border-left-color: var(--vscode-button-background);
                }

                .status-ready, .status-stopped {
                    border-left-color: var(--vscode-testing-iconPassed, #4caf50);
                }

                .status-error {
                    border-left-color: var(--vscode-testing-iconFailed, #f44336);
                    color: var(--vscode-errorForeground, inherit);
                }

                .capture-results {
                    margin-top: 24px;
                    max-width: 700px;
                }

                .candidate-card {
                    border: 1px solid var(--vscode-input-border);
                    padding: 12px 16px;
                    margin-bottom: 10px;
                }

                .candidate-card.recommended {
                    border-color: var(--vscode-button-background);
                    border-width: 2px;
                }

                .candidate-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .candidate-type {
                    font-weight: bold;
                    text-transform: uppercase;
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                }

                .candidate-score {
                    font-size: 13px;
                }

                .candidate-badge {
                    display: inline-block;
                    margin-left: 8px;
                    padding: 2px 8px;
                    font-size: 11px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }

                .candidate-code {
                    display: block;
                    margin-top: 8px;
                    padding: 6px 8px;
                    background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.15));
                    font-family: var(--vscode-editor-font-family, monospace);
                    font-size: 12px;
                    white-space: pre-wrap;
                    word-break: break-all;
                }

                .candidate-rationale {
                    margin-top: 8px;
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }

                .candidate-unresolved {
                    opacity: 0.6;
                }
            </style>
        </head>
        <body>

            <div class="sidebar">
                <h1>FrameworkPilot</h1>
                <button class="nav-item active" data-page="dashboard" onclick="showPage('dashboard')">Dashboard</button>
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

                    <div id="captureResults" class="capture-results"></div>
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

                function startCapture() {
                    const url = document.getElementById('captureUrl').value;

                    document.getElementById('startCaptureBtn').disabled = true;
                    document.getElementById('stopCaptureBtn').disabled = false;
                    document.getElementById('captureResults').innerHTML = '';

                    vscode.postMessage({ command: 'startCapture', url: url });
                }

                function stopCapture() {
                    vscode.postMessage({ command: 'stopCapture' });
                }

                function setCaptureStatus(status, message) {
                    const el = document.getElementById('captureStatus');
                    el.className = 'capture-status status-' + status;
                    el.textContent = message || status;

                    if (status === 'stopped' || status === 'error') {
                        document.getElementById('startCaptureBtn').disabled = false;
                        document.getElementById('stopCaptureBtn').disabled = true;
                    }
                }

                function escapeHtml(value) {
                    const div = document.createElement('div');
                    div.textContent = value == null ? '' : String(value);
                    return div.innerHTML;
                }

                function renderCandidates(candidates) {
                    const container = document.getElementById('captureResults');
                    container.innerHTML = '';

                    if (!candidates || candidates.length === 0) {
                        container.innerHTML = '<p>No locator candidates were generated for this element.</p>';
                        return;
                    }

                    candidates
                        .slice()
                        .sort(function (a, b) { return b.score - a.score; })
                        .forEach(function (candidate) {
                            const card = document.createElement('div');
                            card.className = 'candidate-card' + (candidate.recommended ? ' recommended' : '') +
                                (!candidate.isUnique ? ' candidate-unresolved' : '');

                            card.innerHTML =
                                '<div class="candidate-header">' +
                                    '<span class="candidate-type">' + escapeHtml(candidate.type) + '</span>' +
                                    '<span class="candidate-score">Score: ' + escapeHtml(candidate.score) +
                                        (candidate.recommended ? '<span class="candidate-badge">Recommended</span>' : '') +
                                    '</span>' +
                                '</div>' +
                                '<code class="candidate-code">' + escapeHtml(candidate.code) + '</code>' +
                                '<div class="candidate-rationale">' + escapeHtml(candidate.rationale) + '</div>';

                            card.onclick = function () {
                                vscode.postMessage({ command: 'selectLocator', locator: candidate });
                                document.querySelectorAll('.candidate-card').forEach(function (c) {
                                    c.style.outline = 'none';
                                });
                                card.style.outline = '2px solid var(--vscode-button-background)';
                            };

                            container.appendChild(card);
                        });
                }

                window.addEventListener('message', function (event) {
                    const message = event.data;

                    if (message.command === 'captureStatus') {
                        setCaptureStatus(message.status, message.message);
                    } else if (message.command === 'locatorCandidates') {
                        renderCandidates(message.candidates);
                    }
                });
            </script>

        </body>
        </html>
    `;
}