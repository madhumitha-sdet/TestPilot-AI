import { chromium, Browser, BrowserContext, Page, Locator } from 'playwright';
import { CapturedElementInfo, LocatorCandidate, UniquenessChecker } from './locatorEngine';

/**
 * Script injected into every page loaded during a capture session.
 * Runs entirely inside the browser tab (not Node). Highlights the
 * element under the cursor, and on click, prevents the element's
 * normal action and reports the element's DOM info back to Node via
 * window.__frameworkPilotElementCaptured (bound by exposeFunction).
 *
 * Kept as a single self-contained function (no outside references)
 * because Playwright serializes it with addInitScript() and runs it
 * as-is in the page context.
 */
function captureScript(): void {
    const HIGHLIGHT_OUTLINE = '2px solid #ff5f5f';
    let previousOutline = '';
    let previousElement: HTMLElement | null = null;

    function computeDomPath(el: Element): { tagName: string; nthOfType: number }[] {
        const path: { tagName: string; nthOfType: number }[] = [];
        let node: Element | null = el;

        while (node && node !== document.documentElement) {
            const tagName = node.tagName;
            let index = 1;
            let sibling = node.previousElementSibling;
            while (sibling) {
                if (sibling.tagName === tagName) {
                    index++;
                }
                sibling = sibling.previousElementSibling;
            }
            path.unshift({ tagName, nthOfType: index });
            node = node.parentElement;
        }

        path.unshift({ tagName: 'HTML', nthOfType: 1 });
        return path;
    }

    function computeAriaRole(el: Element): string | undefined {
        const explicit = el.getAttribute('role');
        if (explicit) {
            return explicit;
        }

        const tag = el.tagName.toLowerCase();
        const type = (el.getAttribute('type') || '').toLowerCase();

        // Basic implicit-role heuristic for common elements. Not a full
        // accessibility-tree computation — good enough for v1 candidate
        // generation, can be upgraded later via page.accessibility.snapshot().
        switch (tag) {
            case 'button':
                return 'button';
            case 'a':
                return el.hasAttribute('href') ? 'link' : undefined;
            case 'input':
                if (type === 'checkbox') return 'checkbox';
                if (type === 'radio') return 'radio';
                if (type === 'submit' || type === 'button') return 'button';
                return 'textbox';
            case 'textarea':
                return 'textbox';
            case 'select':
                return 'combobox';
            case 'img':
                return 'img';
            default:
                return undefined;
        }
    }

    function computeLabelText(el: Element): string | undefined {
        const id = (el as HTMLElement).id;
        if (id) {
            const forLabel = document.querySelector(`label[for="${CSS.escape(id)}"]`);
            if (forLabel && forLabel.textContent) {
                return forLabel.textContent.trim();
            }
        }
        const ancestorLabel = el.closest('label');
        if (ancestorLabel && ancestorLabel.textContent) {
            return ancestorLabel.textContent.trim();
        }
        return undefined;
    }

    function buildPayload(el: Element): CapturedElementInfo {
        const attributes: Record<string, string> = {};
        Array.from(el.attributes).forEach((attr) => {
            attributes[attr.name] = attr.value;
        });

        const classAttr = el.getAttribute('class') || '';

        return {
            tagName: el.tagName.toLowerCase(),
            id: (el as HTMLElement).id || undefined,
            classes: classAttr.split(/\s+/).filter(Boolean),
            attributes,
            textContent: (el.textContent || '').trim() || undefined,
            ariaRole: computeAriaRole(el),
            ariaLabel: el.getAttribute('aria-label') || undefined,
            labelText: computeLabelText(el),
            testId: el.getAttribute('data-testid') || undefined,
            domPath: computeDomPath(el),
        };
    }

    document.addEventListener(
        'mouseover',
        (event) => {
            const target = event.target as HTMLElement;
            if (!target || target === previousElement) {
                return;
            }
            if (previousElement) {
                previousElement.style.outline = previousOutline;
            }
            previousElement = target;
            previousOutline = target.style.outline;
            target.style.outline = HIGHLIGHT_OUTLINE;
        },
        true
    );

    document.addEventListener(
        'mouseout',
        (event) => {
            const target = event.target as HTMLElement;
            if (target === previousElement) {
                target.style.outline = previousOutline;
                previousElement = null;
            }
        },
        true
    );

    document.addEventListener(
        'click',
        (event) => {
            event.preventDefault();
            event.stopPropagation();

            const target = event.target as Element;
            const payload = buildPayload(target);

            (window as unknown as { __frameworkPilotElementCaptured: (p: CapturedElementInfo) => void })
                .__frameworkPilotElementCaptured(payload);
        },
        true
    );
}

/**
 * Owns a single Playwright Chromium browser session used for UI element
 * capture. Only one session is allowed at a time — calling launch()
 * while a session is already open closes the old one first.
 *
 * This class knows nothing about locator scoring or the VS Code Webview;
 * it only launches the browser, reports captured elements, and verifies
 * locator uniqueness against the live page.
 */
export class PlaywrightCaptureSession {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private onElementCapturedCallback: ((element: CapturedElementInfo) => void) | null = null;

    /**
     * Launches Chromium, navigates to the given URL, and starts listening
     * for element clicks. Closes any existing session first.
     */
    async launch(url: string): Promise<void> {
        await this.close();

        this.browser = await chromium.launch({ headless: false });
        this.context = await this.browser.newContext();
        this.page = await this.context.newPage();

        await this.page.exposeFunction(
            '__frameworkPilotElementCaptured',
            (element: CapturedElementInfo) => {
                if (this.onElementCapturedCallback) {
                    this.onElementCapturedCallback(element);
                }
            }
        );

        // addInitScript re-runs the capture script on every navigation
        // within this page, not just the first load.
        await this.page.addInitScript(captureScript);

        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    }

    /**
     * Registers a callback that fires each time the user captures an
     * element in the browser. Replaces any previously registered callback.
     */
    onElementCaptured(callback: (element: CapturedElementInfo) => void): void {
        this.onElementCapturedCallback = callback;
    }

    /**
     * Returns a uniqueness-checking function suitable for
     * locatorEngine.ts's buildLocatorCandidates(). Backed by real
     * page.locator(...).count() calls against the live page.
     */
    getUniquenessChecker(): UniquenessChecker {
        return async (candidate: LocatorCandidate): Promise<number> => {
            if (!this.page) {
                return 0;
            }
            try {
                const locator = this.resolveLocator(this.page, candidate);
                return await locator.count();
            } catch {
                // An unresolvable/invalid selector counts as zero matches
                // rather than throwing, so one bad candidate doesn't abort
                // scoring for the rest.
                return 0;
            }
        };
    }

    /**
     * Converts a LocatorCandidate back into a live Playwright Locator.
     *
     * Note: this re-parses the formatted selectorValue strings produced
     * by locatorEngine.ts. That's a fragile string contract between the
     * two files — a future improvement would have locatorEngine.ts carry
     * raw structured values (role, name, text) instead of only formatted
     * strings, so this parsing step could be removed.
     */
    private resolveLocator(page: Page, candidate: LocatorCandidate): Locator {
        switch (candidate.type) {
            case 'testId':
            case 'css':
                return page.locator(candidate.selectorValue);

            case 'xpath':
                return page.locator(`xpath=${candidate.selectorValue}`);

            case 'role': {
                const match = candidate.selectorValue.match(/^role=([a-zA-Z]+)(?:\[name="(.*)"\])?$/);
                if (match) {
                    const [, role, name] = match;
                    return name
                        ? page.getByRole(role as Parameters<Page['getByRole']>[0], { name })
                        : page.getByRole(role as Parameters<Page['getByRole']>[0]);
                }
                return page.locator(candidate.selectorValue);
            }

            case 'label': {
                const match = candidate.selectorValue.match(/^label=(.*)$/);
                return page.getByLabel(match ? match[1] : candidate.selectorValue);
            }

            case 'text': {
                const match = candidate.selectorValue.match(/^text=(.*)$/);
                return page.getByText(match ? match[1] : candidate.selectorValue);
            }
        }
    }

    /** Returns true if a browser session is currently open. */
    isActive(): boolean {
        return this.browser !== null;
    }

    /**
     * Closes the page, context, and browser if open. Safe to call
     * multiple times or when no session is active.
     */
    async close(): Promise<void> {
        if (this.page) {
            await this.page.close().catch(() => {});
            this.page = null;
        }
        if (this.context) {
            await this.context.close().catch(() => {});
            this.context = null;
        }
        if (this.browser) {
            await this.browser.close().catch(() => {});
            this.browser = null;
        }
    }
}