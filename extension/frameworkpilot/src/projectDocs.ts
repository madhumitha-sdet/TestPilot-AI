import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const DEFAULT_INSTRUCTIONS = `# Automation Instructions

- Language:
- Automation tool:
- Test runner:
- Architecture:
- Naming conventions:
- Locator rules:
- Test data rules:
- Reporting rules:
- Logging rules:
- Restrictions / things not to do:
`;

const DEFAULT_SKILL = `# Automation Engineer Skill

You are a senior SDET.

Before modifying a project:

1. Inspect the existing framework.
2. Understand its architecture.
3. Identify reusable components.
4. Follow existing naming conventions.
5. Reuse existing utilities.
6. Avoid unnecessary files.
7. Keep test logic separate from page objects.
8. Do not duplicate framework infrastructure.
9. Make the smallest appropriate change.
10. Validate the implementation.
`;

/**
 * instructions.md / skill.md belong to the ACTUAL project (Project Path),
 * never to .frameworkpilot metadata. Created with a starter template only
 * if missing — an existing file is never overwritten — then opened as a
 * normal, user-editable VS Code text editor.
 */
async function ensureAndOpen(projectPath: string, fileName: string, defaultContent: string): Promise<void> {
    const filePath = path.join(projectPath, fileName);
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(projectPath, { recursive: true });
        fs.writeFileSync(filePath, defaultContent, 'utf8');
    }
    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc, { preview: false });
}

export async function openInstructions(projectPath: string): Promise<void> {
    await ensureAndOpen(projectPath, 'instructions.md', DEFAULT_INSTRUCTIONS);
}

export async function openSkill(projectPath: string): Promise<void> {
    await ensureAndOpen(projectPath, 'skill.md', DEFAULT_SKILL);
}

export function readInstructions(projectPath: string): string | undefined {
    const filePath = path.join(projectPath, 'instructions.md');
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : undefined;
}

export function readSkill(projectPath: string): string | undefined {
    const filePath = path.join(projectPath, 'skill.md');
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : undefined;
}