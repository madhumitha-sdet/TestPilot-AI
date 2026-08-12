import * as vscode from 'vscode';

/**
 * Shape of the message sent from any Webview when the user saves
 * Azure DevOps configuration.
 */
export interface AdoConfigMessage {
    organizationUrl: string;
    projectName: string;
    pat: string;
    planId?: string;
    suiteId?: string;
}

/**
 * Saves Azure DevOps configuration.
 *
 * The PAT is stored in VS Code Secret Storage (encrypted, never
 * written to settings files or Git). All other values are stored
 * as normal (non-sensitive) workspace configuration.
 *
 * This is the single source of truth for saving ADO config — every
 * Webview that offers a "Save Configuration" button should call this,
 * not reimplement the storage logic itself.
 */
export async function saveAdoConfig(
    context: vscode.ExtensionContext,
    message: AdoConfigMessage
): Promise<void> {

    await context.secrets.store('frameworkpilot.ado.pat', message.pat);

    const config = vscode.workspace.getConfiguration('frameworkpilot.ado');

    await config.update(
        'organizationUrl',
        message.organizationUrl,
        vscode.ConfigurationTarget.Global
    );

    await config.update(
        'projectName',
        message.projectName,
        vscode.ConfigurationTarget.Global
    );

    await config.update(
        'planId',
        message.planId || '',
        vscode.ConfigurationTarget.Global
    );

    await config.update(
        'suiteId',
        message.suiteId || '',
        vscode.ConfigurationTarget.Global
    );

    vscode.window.showInformationMessage('Azure DevOps configuration saved.');
}