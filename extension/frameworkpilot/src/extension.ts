import * as vscode from 'vscode';
import { getDashboardHtml } from './dashboardView';
import { saveAdoConfig, AdoConfigMessage } from './adoConfig';
import { CaptureController, CaptureStatusMessage, LocatorCandidatesMessage } from './captureController';


export function activate(context: vscode.ExtensionContext) {

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