import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ProposedFileChange } from './llmAgent';

const PROPOSED_SCHEME = 'frameworkpilot-proposed';
const contentStore = new Map<string, string>();

class ProposedContentProvider implements vscode.TextDocumentContentProvider {
    provideTextDocumentContent(uri: vscode.Uri): string {
        return contentStore.get(uri.toString()) || '';
    }
}

let providerRegistered = false;

/**
 * Registers the read-only virtual document provider used to render
 * proposed content for diffing, without creating dirty/untitled buffers
 * that require save-or-discard handling. Call once during activate().
 */
export function registerProposedContentProvider(context: vscode.ExtensionContext): void {
    if (providerRegistered) {
        return;
    }
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider(PROPOSED_SCHEME, new ProposedContentProvider())
    );
    providerRegistered = true;
}

async function closeTabForUri(uri: vscode.Uri): Promise<void> {
    for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
            const input = tab.input as { uri?: vscode.Uri; modified?: vscode.Uri } | undefined;
            const matches =
                (input?.uri && input.uri.toString() === uri.toString()) ||
                (input?.modified && input.modified.toString() === uri.toString());
            if (matches) {
                await vscode.window.tabGroups.close(tab);
                return;
            }
        }
    }
}

/**
 * Reviews proposed file changes against the REAL Project Path using VS
 * Code's native diff editor, applying only what the user explicitly
 * accepts.
 *
 * - 'reuse_only' entries (no content) are counted informationally only —
 *   no diff, no prompt, nothing written.
 * - A 'create' whose target already exists on disk is treated as 'modify'
 *   in the prompt shown to the user, regardless of the model's label.
 * - Proposed content is served from a read-only virtual document
 *   (frameworkpilot-proposed: scheme) rather than an untitled/dirty
 *   buffer, so there's no save-prompt and no leaked scratch buffers
 *   across repeated runs — each entry is explicitly removed from the
 *   in-memory content store and its tab closed after review.
 * - The Apply/Skip/Cancel prompt is intentionally NON-modal: a modal
 *   dialog blocks/covers the editor, preventing the user from reading or
 *   scrolling the proposed diff before deciding. A non-modal notification
 *   lets the diff stay fully interactive while the prompt is visible.
 * - Cancel (explicit button OR the notification being dismissed) aborts
 *   the ENTIRE remaining review — it is never treated as Skip. Everything
 *   not yet reviewed at that point is reported in cancelledRemaining and
 *   left untouched on disk.
 *
 * LIMITATION (documented, not worked around): the inline per-hunk
 * Keep/Undo review UI used by Copilot Chat's agent mode requires the
 * proposed (non-stable) chatParticipantAdditions API and is not available
 * to normally published extensions. This uses the stable vscode.diff
 * command plus an explicit non-modal Apply/Skip/Cancel choice per file
 * instead.
 */
export async function reviewAndApplyChanges(
    projectPath: string,
    changes: ProposedFileChange[]
): Promise<{ applied: string[]; skipped: string[]; reused: string[]; cancelledRemaining: string[] }> {
    const applied: string[] = [];
    const skipped: string[] = [];
    const reused: string[] = [];
    const cancelledRemaining: string[] = [];

    for (let i = 0; i < changes.length; i++) {
        const change = changes[i];

        if (change.action === 'reuse_only' || !change.content) {
            reused.push(change.filePath);
            continue;
        }

        const absolutePath = path.join(projectPath, change.filePath);
        const exists = fs.existsSync(absolutePath);

        const proposedUri = vscode.Uri.parse(
            `${PROPOSED_SCHEME}:/${encodeURIComponent(change.filePath)}?t=${Date.now()}`
        );
        contentStore.set(proposedUri.toString(), change.content);

        if (exists) {
            await vscode.commands.executeCommand(
                'vscode.diff',
                vscode.Uri.file(absolutePath),
                proposedUri,
                `${change.filePath} (current \u2194 proposed)`
            );
        } else {
            const doc = await vscode.workspace.openTextDocument(proposedUri);
            await vscode.window.showTextDocument(doc, { preview: false });
        }

        const effectiveAction = exists ? 'modify' : 'create';

        // Non-modal: does not block or cover the editor, so the user can
        // freely read/scroll the open diff while this is visible.
        const choice = await vscode.window.showInformationMessage(
            `${effectiveAction === 'create' ? 'Create' : 'Modify'} ${change.filePath}? ${change.reason || ''}`,
            'Apply',
            'Skip',
            'Cancel Review'
        );

        await closeTabForUri(proposedUri);
        contentStore.delete(proposedUri.toString());

        if (choice === 'Apply') {
            fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
            fs.writeFileSync(absolutePath, change.content, 'utf8');
            applied.push(change.filePath);
        } else if (choice === 'Skip') {
            skipped.push(change.filePath);
        } else {
            // 'Cancel Review' or the notification was dismissed without a
            // choice — treat both as an explicit abort of the whole
            // review, not as a skip of just this one file.
            for (let j = i; j < changes.length; j++) {
                if (changes[j].action !== 'reuse_only' && changes[j].content) {
                    cancelledRemaining.push(changes[j].filePath);
                }
            }
            break;
        }
    }

    return { applied, skipped, reused, cancelledRemaining };
}