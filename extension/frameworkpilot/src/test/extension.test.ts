import * as vscode from 'vscode';

const PAT_SECRET_KEY = 'frameworkpilot.ado.pat';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(
        'frameworkpilot.configureAdo',
        async () => {
            const organizationUrl = await vscode.window.showInputBox({
                prompt: 'Enter Azure DevOps Organization URL',
                placeHolder: 'https://dev.azure.com/your-organization',
                ignoreFocusOut: true,
            });

            if (!organizationUrl) {
                return;
            }

            const projectName = await vscode.window.showInputBox({
                prompt: 'Enter Azure DevOps Project name',
                placeHolder: 'TestFrameworkPilot',
                ignoreFocusOut: true,
            });

            if (!projectName) {
                return;
            }

            const pat = await vscode.window.showInputBox({
                prompt: 'Enter Azure DevOps Personal Access Token',
                password: true,
                ignoreFocusOut: true,
            });

            if (!pat) {
                return;
            }

            const planId = await vscode.window.showInputBox({
                prompt: 'Enter Test Plan ID (optional)',
                placeHolder: '123',
                ignoreFocusOut: true,
            });

            const suiteId = await vscode.window.showInputBox({
                prompt: 'Enter Test Suite ID (optional)',
                placeHolder: '456',
                ignoreFocusOut: true,
            });

            await context.secrets.store(PAT_SECRET_KEY, pat);

            await vscode.workspace
                .getConfiguration('frameworkpilot.ado')
                .update(
                    'organizationUrl',
                    organizationUrl,
                    vscode.ConfigurationTarget.Global
                );

            await vscode.workspace
                .getConfiguration('frameworkpilot.ado')
                .update(
                    'projectName',
                    projectName,
                    vscode.ConfigurationTarget.Global
                );

            await vscode.workspace
                .getConfiguration('frameworkpilot.ado')
                .update(
                    'planId',
                    planId || '',
                    vscode.ConfigurationTarget.Global
                );

            await vscode.workspace
                .getConfiguration('frameworkpilot.ado')
                .update(
                    'suiteId',
                    suiteId || '',
                    vscode.ConfigurationTarget.Global
                );

            vscode.window.showInformationMessage(
                'Azure DevOps configuration saved.'
            );
        }
    );

    context.subscriptions.push(disposable);
}

export function deactivate() {}