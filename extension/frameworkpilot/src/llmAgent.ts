import * as vscode from 'vscode';
import { GenerationContext } from './generationContext';

export type ChangeAction = 'create' | 'modify' | 'reuse_only';

export interface ProposedFileChange {
    filePath: string;
    action: ChangeAction;
    content?: string;
    reason?: string;
}

export interface AgentResult {
    summary: string;
    changes: ProposedFileChange[];
    /** Relative paths the model wants to see in full before finalizing. */
    filesNeeded?: string[];
}

function buildSystemPrompt(isEmptyProject: boolean, bootstrapCategories: string[] | undefined): string {
    const base = `You are a senior SDET / automation engineer operating inside a VS Code extension called FrameworkPilot.

You are given: the real automation project's file structure, contents of relevant existing files (bounded — not the entire project), project-level instructions.md and skill.md (if present), a test case with its steps, a locator mapping using ALREADY CAPTURED real UI locators, required test data, and the configured technology stack.

CRITICAL RULES:
- Never propose changes outside the project you were given context for.
- Never invent a duplicate Page Object, base class, fixture, or utility if the file listing/content shows an equivalent already exists — reuse or modify it instead.
- If you genuinely cannot tell whether something needed already exists because its content wasn't included, list its exact relative path in "filesNeeded" INSTEAD OF guessing or duplicating it, and still return your best partial "changes" for anything you ARE confident about.
- For anything you deliberately decide not to change because it can be reused as-is, include it in "changes" with action "reuse_only" and no content, explaining why in "reason".
- Respond with STRICT JSON ONLY. No markdown fences, no prose outside the JSON.
- Shape exactly:
{
  "summary": "one paragraph explaining the plan",
  "filesNeeded": ["relative/path/if/needed.py"],
  "changes": [
    { "filePath": "relative/path.py", "action": "create", "content": "...", "reason": "why" },
    { "filePath": "relative/existing.py", "action": "modify", "content": "...", "reason": "why" },
    { "filePath": "relative/reused.py", "action": "reuse_only", "reason": "already provides X, no change needed" }
  ]
}
- filePath must be relative to the project root, using forward slashes.
- Omit "filesNeeded" entirely (or use an empty array) once you have everything you need.`;

    if (isEmptyProject) {
        return (
            base +
            `\n\nThis project is currently EMPTY. Your task is NOT to create a single test file. You must establish a COMPLETE, PRODUCTION-QUALITY, REUSABLE automation framework foundation in this project, matching the configured technology stack, and then implement the given test case on top of that foundation. The foundation must include, at minimum, the following categories (translate each into files/structure appropriate to the configured stack — do not use placeholder/empty files):\n` +
            (bootstrapCategories || []).map((c) => `- ${c}`).join('\n') +
            `\n\nEvery future test case will be built on this same foundation, so it must be genuinely complete and idiomatic for the stack — not a minimal stub.`
        );
    }

    return (
        base +
        `\n\nThis project ALREADY CONTAINS an automation framework. You must adapt to its existing architecture, naming conventions, and patterns rather than imposing a new structure. Inspect the provided file structure and contents carefully before proposing anything.`
    );
}

export async function selectAgentModel(): Promise<vscode.LanguageModelChat> {
    let models = await vscode.lm.selectChatModels({});
    if (models.length === 0) {
        models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    }
    if (models.length === 0) {
        throw new Error(
            'No language model is available. Sign in to GitHub Copilot (or another VS Code language model provider) and try again.'
        );
    }
    return models[0];
}

/**
 * Runs one generation round. The caller decides whether a second round is
 * needed based on filesNeeded, and rebuilds the context (with those files
 * force-included) before calling this again — orchestration lives outside
 * this module so it can later generalize into an N-round tool-calling loop
 * without changing this function's contract.
 */
export async function runGenerationRound(
    context: GenerationContext,
    model: vscode.LanguageModelChat,
    token: vscode.CancellationToken
): Promise<AgentResult> {
    const systemPrompt = buildSystemPrompt(context.projectIsEmpty, context.bootstrapCategories);

    const messages = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
        vscode.LanguageModelChatMessage.User(JSON.stringify(context, null, 2)),
    ];

    const response = await model.sendRequest(messages, {}, token);

    let raw = '';
    for await (const fragment of response.text) {
        raw += fragment;
    }

    const cleaned = raw.replace(/```json|```/g, '').trim();

    let parsed: AgentResult;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error(`Model did not return valid JSON. Raw response:\n${raw.slice(0, 500)}`);
    }

    if (!parsed.changes || !Array.isArray(parsed.changes)) {
        throw new Error('Model response did not include a "changes" array.');
    }

    return parsed;
}