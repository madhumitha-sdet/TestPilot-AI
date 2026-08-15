import { PlaywrightCaptureSession } from './playwrightCapture';
import { buildLocatorCandidates, CapturedElementInfo, LocatorCandidate } from './locatorEngine';

export type CaptureStatus = 'launching' | 'ready' | 'capturing' | 'stopped' | 'error';

export interface CaptureStatusMessage {
    command: 'captureStatus';
    status: CaptureStatus;
    message?: string;
}

export interface LocatorCandidatesMessage {
    command: 'locatorCandidates';
    candidates: LocatorCandidate[];
}

type OutgoingMessage = CaptureStatusMessage | LocatorCandidatesMessage;

/**
 * Orchestrates one browser-based UI element capture session for a single
 * dashboard panel. Bridges PlaywrightCaptureSession (browser control) and
 * locatorEngine (scoring) to the webview via postMessage.
 *
 * Contains no capture logic (that's playwrightCapture.ts) and no scoring
 * logic (that's locatorEngine.ts) — it only sequences calls between them
 * and reports progress/results/errors back to the webview.
 *
 * One instance is created per dashboard panel and disposed when the panel
 * closes, so the underlying Playwright browser never outlives its panel.
 */
export class CaptureController {
    private readonly session: PlaywrightCaptureSession;
    private readonly postMessage: (message: OutgoingMessage) => void;

    constructor(postMessage: (message: OutgoingMessage) => void) {
        this.postMessage = postMessage;
        this.session = new PlaywrightCaptureSession();
        this.session.onElementCaptured((element) => this.handleElementCaptured(element));
    }

    /**
     * Starts (or restarts, since PlaywrightCaptureSession enforces one
     * session at a time) a capture session at the given URL.
     */
    async startCapture(url: string): Promise<void> {
        const trimmedUrl = (url || '').trim();
        if (!trimmedUrl) {
            this.postMessage({ command: 'captureStatus', status: 'error', message: 'Application URL is required.' });
            return;
        }

        try {
            this.postMessage({
                command: 'captureStatus',
                status: 'launching',
                message: `Launching browser for ${trimmedUrl}...`,
            });

            await this.session.launch(trimmedUrl);

            this.postMessage({
                command: 'captureStatus',
                status: 'ready',
                message: 'Browser launched. Click any element in the browser window to capture it.',
            });
        } catch (err) {
            this.postMessage({
                command: 'captureStatus',
                status: 'error',
                message: `Failed to launch browser: ${this.describeError(err)}`,
            });
        }
    }

    /**
     * Fired by PlaywrightCaptureSession each time the user captures an
     * element. Builds and scores locator candidates, verifying uniqueness
     * against the live page, then sends the results to the webview.
     *
     * Runs as a fire-and-forget handler off the session's callback, so
     * errors here are caught and reported rather than thrown into
     * Playwright's event pipeline.
     */
    private async handleElementCaptured(element: CapturedElementInfo): Promise<void> {
        try {
            this.postMessage({
                command: 'captureStatus',
                status: 'capturing',
                message: 'Element captured. Scoring locator candidates...',
            });

            const candidates = await buildLocatorCandidates(element, this.session.getUniquenessChecker());

            this.postMessage({ command: 'locatorCandidates', candidates });
        } catch (err) {
            this.postMessage({
                command: 'captureStatus',
                status: 'error',
                message: `Failed to process captured element: ${this.describeError(err)}`,
            });
        }
    }

    /**
     * Stops the current capture session and closes the browser, if open.
     */
    async stopCapture(): Promise<void> {
        await this.session.close();
        this.postMessage({ command: 'captureStatus', status: 'stopped', message: 'Capture session stopped.' });
    }

    /**
     * Closes the browser without posting any status message. Intended for
     * when the panel itself is being disposed — there's no webview left
     * to receive messages at that point.
     */
    async dispose(): Promise<void> {
        await this.session.close();
    }

    private describeError(err: unknown): string {
        return err instanceof Error ? err.message : String(err);
    }
}