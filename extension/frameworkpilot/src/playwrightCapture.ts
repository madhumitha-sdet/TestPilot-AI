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

    (window as unknown as { __frameworkPilotMode: string }).__frameworkPilotMode = 'manual';
    let areaSelectionStart: { x: number; y: number } | null = null;
    let overlayEl: HTMLDivElement | null = null;

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

    function ensureOverlay(): HTMLDivElement {
        if (!overlayEl) {
            overlayEl = document.createElement('div');
            overlayEl.style.position = 'fixed';
            overlayEl.style.border = '2px dashed #ff5f5f';
            overlayEl.style.background = 'rgba(255,95,95,0.15)';
            overlayEl.style.zIndex = '2147483647';
            overlayEl.style.pointerEvents = 'none';
            overlayEl.style.display = 'none';
            document.body.appendChild(overlayEl);
        }
        return overlayEl;
    }

    function isActionable(el: Element): boolean {
        const tag = el.tagName.toLowerCase();
        if (['button', 'a', 'input', 'textarea', 'select'].includes(tag)) {
            return true;
        }
        const role = el.getAttribute('role');
        const actionableRoles = ['button', 'link', 'checkbox', 'radio', 'combobox', 'textbox', 'menuitem', 'tab', 'switch'];
        return !!role && actionableRoles.includes(role);
    }

    function collectElementsInRect(rect: { left: number; top: number; right: number; bottom: number }): Element[] {
        const candidates = Array.from(document.querySelectorAll('button, a, input, textarea, select, [role]'));
        const matched = candidates.filter((el) => {
            if (!isActionable(el)) {
                return false;
            }
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) {
                return false;
            }
            return !(r.right < rect.left || r.left > rect.right || r.bottom < rect.top || r.top > rect.bottom);
        });
        return matched.filter((el) => !matched.some((other) => other !== el && el.contains(other)));
    }

    document.addEventListener(
        'mouseover',
        (event) => {
            const mode = (window as unknown as { __frameworkPilotMode: string }).__frameworkPilotMode;
            if (mode === 'area') {
                return;
            }

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
            const mode = (window as unknown as { __frameworkPilotMode: string }).__frameworkPilotMode;
            if (mode === 'area') {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const target = event.target as Element;
            const payload = buildPayload(target);

            (window as unknown as { __frameworkPilotElementCaptured: (p: CapturedElementInfo) => void })
                .__frameworkPilotElementCaptured(payload);
        },
        true
    );

    document.addEventListener(
        'mousedown',
        (event) => {
            const mode = (window as unknown as { __frameworkPilotMode: string }).__frameworkPilotMode;
            if (mode !== 'area') {
                return;
            }
            event.preventDefault();
            areaSelectionStart = { x: event.clientX, y: event.clientY };
            const overlay = ensureOverlay();
            overlay.style.display = 'block';
            overlay.style.left = areaSelectionStart.x + 'px';
            overlay.style.top = areaSelectionStart.y + 'px';
            overlay.style.width = '0px';
            overlay.style.height = '0px';
        },
        true
    );

    document.addEventListener(
        'mousemove',
        (event) => {
            if (!areaSelectionStart) {
                return;
            }
            event.preventDefault();
            const overlay = ensureOverlay();
            const left = Math.min(areaSelectionStart.x, event.clientX);
            const top = Math.min(areaSelectionStart.y, event.clientY);
            overlay.style.left = left + 'px';
            overlay.style.top = top + 'px';
            overlay.style.width = Math.abs(event.clientX - areaSelectionStart.x) + 'px';
            overlay.style.height = Math.abs(event.clientY - areaSelectionStart.y) + 'px';
        },
        true
    );

    document.addEventListener(
        'mouseup',
        (event) => {
            if (!areaSelectionStart) {
                return;
            }
            event.preventDefault();

            const rect = {
                left: Math.min(areaSelectionStart.x, event.clientX),
                top: Math.min(areaSelectionStart.y, event.clientY),
                right: Math.max(areaSelectionStart.x, event.clientX),
                bottom: Math.max(areaSelectionStart.y, event.clientY),
            };
            areaSelectionStart = null;
            if (overlayEl) {
                overlayEl.style.display = 'none';
            }

            const elements = collectElementsInRect(rect).map(buildPayload);

            (window as unknown as { __frameworkPilotAreaCaptured: (els: CapturedElementInfo[]) => void })
                .__frameworkPilotAreaCaptured(elements);
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
    private onAreaCapturedCallback: ((elements: CapturedElementInfo[]) => void) | null = null;

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

        await this.page.exposeFunction(
            '__frameworkPilotAreaCaptured',
            (elements: CapturedElementInfo[]) => {
                if (this.onAreaCapturedCallback) {
                    this.onAreaCapturedCallback(elements);
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

    onAreaCaptured(callback: (elements: CapturedElementInfo[]) => void): void {
        this.onAreaCapturedCallback = callback;
    }

    async setMode(mode: 'manual' | 'area'): Promise<void> {
        if (!this.page) {
            return;
        }
        await this.page.evaluate((m) => {
            (window as unknown as { __frameworkPilotMode: string }).__frameworkPilotMode = m;
        }, mode);
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