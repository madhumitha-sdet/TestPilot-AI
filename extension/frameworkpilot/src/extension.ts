import * as vscode from 'vscode';
import { getDashboardHtml } from './dashboardView';
import { saveAdoConfig, AdoConfigMessage } from './adoConfig';
import { FrameworkConfig, loadFrameworkConfig, saveFrameworkConfig } from './frameworkConfig';
import * as fs from 'fs';
import { listGeneratedTestCaseFiles, saveTestCaseMarkdown } from './testCaseMarkdown';
import { readLocalTestCaseFile } from './localTestCaseImport';
import { buildInitialMapping, loadTestCaseMapping, saveTestCaseMapping } from './testCaseMapping';
import { TestCaseData, TestDataField, loadTestCaseData, saveTestCaseData } from './testDataModel';
import { extractFieldNamesFromSteps } from './testDataExtraction';
import { isProjectEmpty } from './projectInspector';
import { openInstructions, openSkill, readInstructions, readSkill } from './projectDocs';
import { selectAgentModel, runGenerationRound, ProposedFileChange } from './llmAgent';
import { GenerationContext, trimMappingForContext } from './generationContext';
import { reviewAndApplyChanges, registerProposedContentProvider } from './changeReview';
import { readExcelWorkbook, readExcelTestCaseBySyntheticPath } from './excelTestCaseReader';
import { buildBoundedProjectContext } from './boundedContextBuilder';
import { getBootstrapCategories, getRequiredDependencies, getPostInstallSteps } from './frameworkFileConventions';
import { validateGeneratedProject } from './generationValidation';
import { ensureScreenshotOnFailureHook, ensurePytestHtmlReporting } from './reportingGuarantees';
import { ensureTestCaseContext, readUserSectionForGeneration } from './testCaseContext';
import { looksLikeSecretContent } from './secretsFilter';
import { CaptureController, CaptureStatusMessage, LocatorCandidatesMessage } from './captureController';


/**
 * For an empty-project bootstrap only: ensures requirements.txt lists the
 * stack's mechanically required packages. If the LLM already proposed a
 * requirements.txt, its content is preserved and only missing required
 * lines are appended. If it proposed none, a minimal one is added. Either
 * way this only adds an entry to `changes` — nothing is written until the
 * user explicitly applies it in the existing review flow.
 */
function ensureRequiredDependencies(changes: ProposedFileChange[], config: FrameworkConfig): void {
    const required = getRequiredDependencies(config);
    const existing = changes.find(
        (c) => c.filePath.toLowerCase() === 'requirements.txt' && c.action !== 'reuse_only'
    );

    if (existing) {
        const currentLines = (existing.content || '').split('\n').map((l) => l.trim());
        const missing = required.filter(
            (dep) => !currentLines.some((line) => line.toLowerCase() === dep.toLowerCase())
        );
        if (missing.length > 0) {
            const base = (existing.content || '').replace(/\n+$/, '');
            existing.content = (base ? base + '\n' : '') + missing.join('\n') + '\n';
        }
        return;
    }

    changes.push({
        filePath: 'requirements.txt',
        action: 'create',
        content: required.join('\n') + '\n',
        reason: 'Required packages for the configured stack (pytest, pytest-playwright, playwright).',
    });
}

/**
 * For an empty-project bootstrap only: guarantees a SETUP.md exists
 * documenting the post-install step(s) required for this stack (e.g.
 * `playwright install`), which pip alone does not perform. Does not
 * touch any README the LLM may have proposed, to avoid fragile
 * text-merging — this is a separate, dedicated file.
 */
function ensureSetupInstructions(changes: ProposedFileChange[], config: FrameworkConfig): void {
    const alreadyProposed = changes.some(
        (c) => c.filePath.toLowerCase() === 'setup.md' && c.action !== 'reuse_only'
    );
    if (alreadyProposed) {
        return;
    }

    const steps = getPostInstallSteps(config);
    const content =
        `# Setup\n\n` +
        `1. Install Python dependencies:\n\n` +
        `\`\`\`\npip install -r requirements.txt\n\`\`\`\n\n` +
        `2. Install required tooling for this stack:\n\n` +
        `\`\`\`\n${steps.join('\n')}\n\`\`\`\n`;

    changes.push({
        filePath: 'SETUP.md',
        action: 'create',
        content,
        reason: 'Documents the post-install step(s) required for this stack beyond `pip install`.',
    });
}

export function activate(context: vscode.ExtensionContext) {

    registerProposedContentProvider(context);

    const disposable = vscode.commands.registerCommand(
        'frameworkpilot.configureAdo',
        () => {

            const panel = vscode.window.createWebviewPanel(
                'frameworkpilotAdo',
                'FrameworkPilot - Azure DevOps',
                vscode.ViewColumn.One,
                {
                    enableScripts: true
                }
            );

            panel.webview.html = getWebviewContent();

            panel.webview.onDidReceiveMessage(
                async message => {

                    if (message.command === 'saveAdoConfig') 
                        {
                            await saveAdoConfig(context, message as AdoConfigMessage);
                        }
                },
                undefined,
                context.subscriptions
            );
        }
    );

    context.subscriptions.push(disposable);

    const dashboardDisposable = vscode.commands.registerCommand(
    'frameworkpilot.openDashboard',
    () => {

        const panel = vscode.window.createWebviewPanel(
            'frameworkpilotDashboard',
            'FrameworkPilot',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        panel.webview.html = getDashboardHtml();
        const captureController = new CaptureController((message: CaptureStatusMessage | LocatorCandidatesMessage) => {
            panel.webview.postMessage(message);
        });
        panel.webview.onDidReceiveMessage(
            async message => {
                if (message.command === 'saveAdoConfig') {
                    await saveAdoConfig(context, message as AdoConfigMessage);
                } else if (message.command === 'startCapture') {
                    await captureController.startCapture(message.url);
                } else if (message.command === 'stopCapture') {
                    await captureController.stopCapture();
                } else if (message.command === 'setCaptureMode') {
            await captureController.setMode(message.mode);
                } else if (message.command === 'saveFrameworkConfig') {
                    await saveFrameworkConfig(message.config as FrameworkConfig);
                    panel.webview.postMessage({ command: 'frameworkConfigLoaded', config: loadFrameworkConfig() });
                } else if (message.command === 'requestFrameworkConfig') {
                    panel.webview.postMessage({ command: 'frameworkConfigLoaded', config: loadFrameworkConfig() });
                } else if (message.command === 'pickFile') {
                    const isFolder = message.field === 'projectPath';
                    const isExcel = message.field === 'testCaseExcelPath';
                    const uris = await vscode.window.showOpenDialog({
                        canSelectFiles: !isFolder,
                        canSelectFolders: isFolder,
                        canSelectMany: false,
                        filters: isExcel ? { Excel: ['xlsx'] } : undefined,
                        openLabel: isFolder ? 'Select Project Folder' : 'Select File',
                    });
                    if (uris && uris.length > 0) {
                        panel.webview.postMessage({ command: 'filePicked', field: message.field, path: uris[0].fsPath });
                    }
                } else if (message.command === 'listTestCases') {
                    const config = loadFrameworkConfig();
                    const localTestCases = listGeneratedTestCaseFiles(config.projectPath);

                    const excelResult = config.testCaseExcelPath
                        ? readExcelWorkbook(config.testCaseExcelPath)
                        : { testCases: [], errors: [] };

                    if (excelResult.errors.length > 0) {
                        vscode.window.showWarningMessage(
                            `Excel import: ${excelResult.errors.length} sheet(s) skipped. ${excelResult.errors[0]}`
                        );
                    }

                    panel.webview.postMessage({
                        command: 'testCasesListed',
                        testCases: [...localTestCases, ...excelResult.testCases],
                    });
                } else if (message.command === 'pickLocalTestCaseFile') {
            const uris = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: { Markdown: ['md'] },
                openLabel: 'Select Test Case Markdown',
            });
            if (uris && uris.length > 0) {
                try {
                    // Read the user's external file. This file is never written to.
                    const externalTestCase = readLocalTestCaseFile(uris[0].fsPath);

                    const config = loadFrameworkConfig();
                    if (!config.projectPath) {
                        vscode.window.showErrorMessage(
                            'Set and Save a Project Path in Framework Configuration before importing a test case.'
                        );
                        return;
                    }

                    // Create/reuse the FrameworkPilot-owned working copy.
                    const { filePath, written } = saveTestCaseMarkdown(config.projectPath, externalTestCase);
                    const ownedTestCase = readLocalTestCaseFile(filePath);

                    vscode.window.showInformationMessage(
                        (written ? 'Created FrameworkPilot test case: ' : 'Reusing existing FrameworkPilot test case: ') + filePath
                    );

                    panel.webview.postMessage({ command: 'localTestCaseLoaded', testCase: ownedTestCase });
                    panel.webview.postMessage({
                        command: 'testCasesListed',
                        testCases: listGeneratedTestCaseFiles(config.projectPath),
                    });
                } catch (err) {
                    vscode.window.showErrorMessage(
                        `Failed to import test case file: ${err instanceof Error ? err.message : String(err)}`
                    );
                }
            }
                } else if (message.command === 'selectTestCase') {
                    try {
                        const config = loadFrameworkConfig();
                        const testCase = message.path.startsWith('excel::')
                            ? readExcelTestCaseBySyntheticPath(config.testCaseExcelPath || '', message.path)
                            : readLocalTestCaseFile(message.path);
                        await context.workspaceState.update('frameworkpilot.selectedTestCasePath', message.path);

                        let hasAutomationContext = false;
                        if (config.projectPath) {
                            const contextResult = ensureTestCaseContext(config.projectPath, testCase);
                            hasAutomationContext = true;
                            if (contextResult.unmanaged) {
                                vscode.window.showWarningMessage(
                                    `${testCase.id}'s Automation Context file is missing its generated-section marker, so FrameworkPilot left it untouched. See .frameworkpilot/testcase-context/${testCase.id}.md.`
                                );
                            }
                        }

                        panel.webview.postMessage({ command: 'testCaseSelected', testCase, hasAutomationContext });
                    } catch (err) {
                        vscode.window.showErrorMessage(
                            `Failed to select test case: ${err instanceof Error ? err.message : String(err)}`
                        );
                    }
                } else if (message.command === 'openTestCaseContext') {
                    const config = loadFrameworkConfig();
                    if (!config.projectPath) {
                        vscode.window.showErrorMessage('Set a Project Path in Framework Configuration first.');
                        return;
                    }
                    const { filePath } = ensureTestCaseContext(config.projectPath, message.testCase);
                    const doc = await vscode.workspace.openTextDocument(filePath);
                    await vscode.window.showTextDocument(doc, { preview: false });
                } else if (message.command === 'requestTestCaseMapping') {
                    const existing = loadTestCaseMapping(context, message.testCase.filePath);
                    const mapping = existing || buildInitialMapping(message.testCase);
                    panel.webview.postMessage({ command: 'testCaseMappingLoaded', mapping });
                } else if (message.command === 'saveTestCaseMapping') {
                    saveTestCaseMapping(context, message.mapping);
                } else if (message.command === 'requestTestCaseData') {
                    const existing = loadTestCaseData(context, message.testCase.filePath);
                    if (existing) {
                        panel.webview.postMessage({ command: 'testCaseDataLoaded', data: existing });
                    } else {
                        const fieldNames = extractFieldNamesFromSteps(message.testCase.steps || []);
                        const fields: TestDataField[] = fieldNames.map((name) => ({
                            name,
                            required: true,
                            source: 'testcase',
                        }));
                        const data: TestCaseData = {
                            testCaseId: message.testCase.id,
                            testCasePath: message.testCase.filePath,
                            fields,
                        };
                        panel.webview.postMessage({ command: 'testCaseDataLoaded', data });
                    }
                } else if (message.command === 'saveTestCaseData') {
                    saveTestCaseData(context, message.data);
                } else if (message.command === 'openProjectInVSCode') {
                    const config = loadFrameworkConfig();
                    if (!config.projectPath) {
                        vscode.window.showErrorMessage('Set a Project Path in Framework Configuration first.');
                        return;
                    }
                    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(config.projectPath), { forceNewWindow: true });
                } else if (message.command === 'openInstructions') {
                    const config = loadFrameworkConfig();
                    if (!config.projectPath) {
                        vscode.window.showErrorMessage('Set a Project Path in Framework Configuration first.');
                        return;
                    }
                    await openInstructions(config.projectPath);
                } else if (message.command === 'openSkill') {
                    const config = loadFrameworkConfig();
                    if (!config.projectPath) {
                        vscode.window.showErrorMessage('Set a Project Path in Framework Configuration first.');
                        return;
                    }
                    await openSkill(config.projectPath);
                } else if (message.command === 'requestProjectReadiness') {
                    const config = loadFrameworkConfig();
                    const hasPath = !!config.projectPath;
                    const isExisting = hasPath ? !isProjectEmpty(config.projectPath as string) : false;
                    panel.webview.postMessage({ command: 'projectReadinessLoaded', hasPath, isExisting });
                } else if (message.command === 'generateAutomation') {
                        try {
                const config = loadFrameworkConfig();
                if (!config.projectPath) {
                    vscode.window.showErrorMessage('Set a Project Path in Framework Configuration first.');
                    return;
                }

                const testCase = message.testCasePath.startsWith('excel::')
                    ? readExcelTestCaseBySyntheticPath(config.testCaseExcelPath || '', message.testCasePath)
                    : readLocalTestCaseFile(message.testCasePath);
                const mapping = loadTestCaseMapping(context, message.testCasePath) || buildInitialMapping(testCase);
                const testData: TestCaseData =
                    loadTestCaseData(context, message.testCasePath) ||
                    { testCaseId: testCase.id, testCasePath: message.testCasePath, fields: [] };

                const projectIsEmpty = isProjectEmpty(config.projectPath);
                const model = await selectAgentModel();
                const tokenSource = new vscode.CancellationTokenSource();

                panel.webview.postMessage({
                    command: 'generationStatus',
                    status: 'inspecting',
                    message: 'Inspecting the real project before proposing changes...',
                });

                let project = buildBoundedProjectContext(config.projectPath, config, testCase, mapping, testData);

                let testCaseContext = readUserSectionForGeneration(config.projectPath, testCase);
                if (testCaseContext && looksLikeSecretContent(testCaseContext)) {
                    testCaseContext = undefined;
                    vscode.window.showWarningMessage(
                        `${testCase.id}'s Automation Context looks like it may contain a secret and was excluded from generation. Please remove it from the context file.`
                    );
                }

                const generationContext: GenerationContext = {
                    testCase,
                    steps: trimMappingForContext(mapping),
                    testData,
                    frameworkConfig: config,
                    instructions: readInstructions(config.projectPath),
                    skill: readSkill(config.projectPath),
                    testCaseContext,
                    projectIsEmpty,
                    bootstrapCategories: projectIsEmpty ? getBootstrapCategories(config) : undefined,
                    project,
                };

                panel.webview.postMessage({
                    command: 'generationStatus',
                    status: 'calling_model',
                    message: 'Sending context to the language model (round 1)...',
                });

                let result = await runGenerationRound(generationContext, model, tokenSource.token);

                if (result.filesNeeded && result.filesNeeded.length > 0) {
                    panel.webview.postMessage({
                        command: 'generationStatus',
                        status: 'calling_model',
                        message: `Model requested ${result.filesNeeded.length} additional file(s): ${result.filesNeeded.join(', ')}. Sending round 2...`,
                    });

                    project = buildBoundedProjectContext(
                        config.projectPath,
                        config,
                        testCase,
                        mapping,
                        testData,
                        result.filesNeeded
                    );
                    generationContext.project = project;

                    result = await runGenerationRound(generationContext, model, tokenSource.token);
                }

                if (projectIsEmpty) {
                    ensureRequiredDependencies(result.changes, config);
                    ensureSetupInstructions(result.changes, config);
                    ensureScreenshotOnFailureHook(result.changes);
                    ensurePytestHtmlReporting(result.changes);
                }

                const advisoryWarnings = validateGeneratedProject(result.changes, config, {
                    projectIsEmpty,
                    existingProjectPaths: project.structureSummary
                        .filter((f) => !f.isDirectory)
                        .map((f) => f.relativePath),
                });

                const advisoryNote = advisoryWarnings.length > 0
                    ? ` Advisory checks flagged ${advisoryWarnings.length} item(s) for your review: ` +
                      advisoryWarnings.map((w) => w.message).join(' | ')
                    : '';

                panel.webview.postMessage({
                    command: 'generationStatus',
                    status: 'reviewing',
                    message: `Proposed ${result.changes.length} item(s). Review each diff/editor that opens in VS Code.${advisoryNote}`,
                });

                const { applied, skipped, reused, cancelledRemaining } = await reviewAndApplyChanges(config.projectPath, result.changes);

                const cancelledNote = cancelledRemaining.length > 0
                    ? ` Review was cancelled — ${cancelledRemaining.length} remaining file(s) were left untouched.`
                    : '';

                panel.webview.postMessage({
                    command: 'generationStatus',
                    status: cancelledRemaining.length > 0 ? 'cancelled' : 'done',
                    message: `Applied ${applied.length} file(s), skipped ${skipped.length}, reused ${reused.length} without changes.${cancelledNote} ${result.summary}`,
                });
            } catch (err) {
                panel.webview.postMessage({
                    command: 'generationStatus',
                    status: 'error',
                    message: err instanceof Error ? err.message : String(err),
                });
            }
        }
            },
            undefined,
            context.subscriptions
        );
        panel.onDidDispose(() => {
            captureController.dispose().catch((err) => {
                console.error('Failed to dispose capture controller:', err);
            });
        });
    }
);

context.subscriptions.push(dashboardDisposable);
}


function getWebviewContent(): string {

    return `
        <!DOCTYPE html>

        <html>

        <head>

            <style>

                body {
                    font-family: sans-serif;
                    padding: 30px;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }

                h1 {
                    margin-bottom: 5px;
                }

                .subtitle {
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 30px;
                }

                label {
                    display: block;
                    margin-top: 18px;
                    margin-bottom: 6px;
                }

                input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 10px;
                    border: 1px solid var(--vscode-input-border);
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                }

                button {
                    margin-top: 25px;
                    padding: 10px 20px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    cursor: pointer;
                }

                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }

            </style>

        </head>

        <body>

            <h1>FrameworkPilot</h1>

            <div class="subtitle">
                Azure DevOps Configuration
            </div>

            <label>Organization URL</label>

            <input
                id="organizationUrl"
                placeholder="https://dev.azure.com/your-organization"
            />

            <label>Project Name</label>

            <input
                id="projectName"
                placeholder="TestFrameworkPilot"
            />

            <label>Personal Access Token</label>

            <input
                id="pat"
                type="password"
                placeholder="Enter Azure DevOps PAT"
            />

            <label>Test Plan ID (optional)</label>

            <input
                id="planId"
                placeholder="Test Plan ID"
            />

            <label>Test Suite ID (optional)</label>

            <input
                id="suiteId"
                placeholder="Test Suite ID"
            />

            <button onclick="saveConfiguration()">
                Save Configuration
            </button>

            <script>

                const vscode = acquireVsCodeApi();

                function saveConfiguration() {

                    const organizationUrl =
                        document.getElementById('organizationUrl').value;

                    const projectName =
                        document.getElementById('projectName').value;

                    const pat =
                        document.getElementById('pat').value;

                    const planId =
                        document.getElementById('planId').value;

                    const suiteId =
                        document.getElementById('suiteId').value;

                    vscode.postMessage({

                        command: 'saveAdoConfig',

                        organizationUrl: organizationUrl,

                        projectName: projectName,

                        pat: pat,

                        planId: planId,

                        suiteId: suiteId

                    });
                }

            </script>

        </body>

        </html>
    `;
}


export function deactivate() {}