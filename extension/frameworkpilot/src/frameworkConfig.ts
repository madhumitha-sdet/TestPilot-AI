import * as vscode from 'vscode';

/**
 * Framework Configuration.
 *
 * Stores/loads how the user wants FrameworkPilot to work with their
 * automation project. This module performs no discovery, analysis, or
 * code generation — those are later phases that will read this config
 * as an input.
 */

export type FrameworkMode = 'existing' | 'new';
export type SupportedLanguage = 'python';
export type SupportedAutomationTool = 'playwright';
export type SupportedTestRunner = 'pytest';
export type SupportedArchitecture = 'page_object_model';
export type SupportedTestDataApproach = 'json';

export interface FrameworkConfig {
    frameworkMode: FrameworkMode;
    language: SupportedLanguage;
    automationTool: SupportedAutomationTool;
    testRunner: SupportedTestRunner;
    architecture: SupportedArchitecture;
    testDataApproach: SupportedTestDataApproach;
    projectPath?: string;
    testCaseFile?: string;
    existingPomFile?: string;
    existingTestFile?: string;
}

const DEFAULT_CONFIG: FrameworkConfig = {
    frameworkMode: 'new',
    language: 'python',
    automationTool: 'playwright',
    testRunner: 'pytest',
    architecture: 'page_object_model',
    testDataApproach: 'json',
};

export async function saveFrameworkConfig(config: FrameworkConfig): Promise<void> {
    const target = vscode.workspace.getConfiguration('frameworkpilot.framework');

    await target.update('frameworkMode', config.frameworkMode, vscode.ConfigurationTarget.Global);
    await target.update('language', config.language, vscode.ConfigurationTarget.Global);
    await target.update('automationTool', config.automationTool, vscode.ConfigurationTarget.Global);
    await target.update('testRunner', config.testRunner, vscode.ConfigurationTarget.Global);
    await target.update('architecture', config.architecture, vscode.ConfigurationTarget.Global);
    await target.update('testDataApproach', config.testDataApproach, vscode.ConfigurationTarget.Global);
    await target.update('projectPath', config.projectPath || '', vscode.ConfigurationTarget.Global);
    await target.update('testCaseFile', config.testCaseFile || '', vscode.ConfigurationTarget.Global);
    await target.update('existingPomFile', config.existingPomFile || '', vscode.ConfigurationTarget.Global);
    await target.update('existingTestFile', config.existingTestFile || '', vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage('Framework configuration saved.');
}

export function loadFrameworkConfig(): FrameworkConfig {
    const source = vscode.workspace.getConfiguration('frameworkpilot.framework');

    return {
        frameworkMode: source.get<FrameworkMode>('frameworkMode', DEFAULT_CONFIG.frameworkMode),
        language: source.get<SupportedLanguage>('language', DEFAULT_CONFIG.language),
        automationTool: source.get<SupportedAutomationTool>('automationTool', DEFAULT_CONFIG.automationTool),
        testRunner: source.get<SupportedTestRunner>('testRunner', DEFAULT_CONFIG.testRunner),
        architecture: source.get<SupportedArchitecture>('architecture', DEFAULT_CONFIG.architecture),
        testDataApproach: source.get<SupportedTestDataApproach>('testDataApproach', DEFAULT_CONFIG.testDataApproach),
        projectPath: source.get<string>('projectPath', '') || undefined,
        testCaseFile: source.get<string>('testCaseFile', '') || undefined,
        existingPomFile: source.get<string>('existingPomFile', '') || undefined,
        existingTestFile: source.get<string>('existingTestFile', '') || undefined,
    };
}