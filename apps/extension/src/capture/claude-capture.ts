import { logger } from "@/utils/logger";
import type { OnEventCallback, PlatformCapture } from "./types";

/**
 * Claude capture — resilient to UI updates.
 *
 * Same strategy as ChatGPT:
 *  1. Prompt  : keydown/click → read ProseMirror editor → emit PROMPT_SENT.
 *  2. Response: MutationObserver addedNodes detects new AI turns; 2 s debounce
 *               + Stop-button guard ensures the full response is captured.
 */

// ── Selector chains ───────────────────────────────────────────────────────────

const EDITOR_SELECTORS = [
  ".ProseMirror[contenteditable='true']",
  '[contenteditable="true"][data-placeholder]',
  'div[contenteditable="true"]',
];

const SEND_BTN_SELECTORS = [
  'button[aria-label*="Send" i]',
  '[data-testid="send-button"]',
  'button[type="submit"]',
];

const ASSISTANT_SELECTORS = [
  '[data-testid="ai-turn"]',
  ".font-claude-message",
  '[data-is-streaming]',
  '[data-testid="assistant-message"]',
  ".claude-message",
];

const USER_SELECTORS = [
  '[data-testid="human-turn"]',
  ".human-turn",
  '[data-testid="user-message"]',
];

const STREAMING_SELECTORS = [
  'button[aria-label*="Stop" i]',
  '[data-testid="stop-button"]',
  "[data-is-streaming='true']",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function first<T extends Element>(selectors: string[]): T | null {
  for (const s of selectors) {
    const el = document.querySelector<T>(s);
    if (el) return el;
  }
  return null;
}

function all<T extends Element>(selectors: string[]): T[] {
  for (const s of selectors) {
    const els = Array.from(document.querySelectorAll<T>(s));
    if (els.length) return els;
  }
  return [];
}

function isStreaming(): boolean {
  return STREAMING_SELECTORS.some(s => !!document.querySelector(s));
}

function readEditorText(): string {
  const el = first(EDITOR_SELECTORS);
  if (!el) return "";
  return (el as HTMLElement).innerText?.trim() ?? "";
}

function nodeContainsAny(node: Element, selectors: string[]): boolean {
  return selectors.some(s => node.matches(s) || node.querySelector(s) !== null);
}

function extractText(node: Element): string {
  for (const s of ASSISTANT_SELECTORS) {
    const match = node.matches(s) ? node : node.querySelector(s);
    if (match) return (match as HTMLElement).innerText?.trim() ?? "";
  }
  return (node as HTMLElement).innerText?.trim() ?? "";
}

// ── Main class ────────────────────────────────────────────────────────────────

export class ClaudeCapture implements PlatformCapture {
  readonly platform = "claude" as const;
  readonly matchUrl = /^https:\/\/claude\.ai\/.*/;

  private observer:          MutationObserver | null = null;
  private onEvent:           OnEventCallback | null  = null;
  private responseDebounce:  ReturnType<typeof setTimeout> | null = null;
  private lastPrompt =       "";
  private lastResponseText = "";
  private pendingResponseEl: Element | null = null;
  private promptSent =       false;

  start(sessionId: string, onEvent: OnEventCallback): void {
    this.onEvent = onEvent;
    document.addEventListener("keydown", this.onKeyDown, true);
    document.addEventListener("click",   this.onClick,   true);
    // Mark existing assistant messages so page-load DOM changes don't trigger capture
    all(ASSISTANT_SELECTORS).forEach(el => el.setAttribute("data-aicc-captured", "true"));
    this.startObserver();
    logger.info("Claude capture started", { sessionId });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.onEvent  = null;
    if (this.responseDebounce) clearTimeout(this.responseDebounce);
    document.removeEventListener("keydown", this.onKeyDown, true);
    document.removeEventListener("click",   this.onClick,   true);
  }

  // ── Prompt ──────────────────────────────────────────────────────────────────

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== "Enter" || e.shiftKey) return;
    this.capturePromptNow();
  };

  private readonly onClick = (e: MouseEvent): void => {
    if (SEND_BTN_SELECTORS.some(s => (e.target as Element).closest(s))) {
      this.capturePromptNow();
    }
  };

  private capturePromptNow(): void {
    // Primary: read from editor before ProseMirror clears it
    let text = readEditorText();

    // Fallback: read the last human turn that just appeared
    if (!text) {
      const userEls = all(USER_SELECTORS);
      text = userEls.length ? (userEls[userEls.length - 1] as HTMLElement).innerText?.trim() ?? "" : "";
    }

    if (!text || text === this.lastPrompt) return;
    this.lastPrompt = text;
    this.promptSent = true;
    setTimeout(() => { this.lastPrompt = ""; }, 3000);
    this.onEvent?.({ kind: "prompt", content: text, conversationId: this.convId() });
    logger.debug("Claude: prompt captured", { chars: text.length });
  }

  // ── Response ─────────────────────────────────────────────────────────────────

  private startObserver(): void {
    const root = document.querySelector("main") ?? document.body;
    this.observer = new MutationObserver(records => this.onMutation(records));
    this.observer.observe(root, { childList: true, subtree: true, characterData: true });
  }

  private onMutation(records: MutationRecord[]): void {
    if (!this.promptSent) return;

    const editor = first(EDITOR_SELECTORS);

    for (const record of records) {
      // childList: new nodes added
      for (const node of record.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (editor && editor.contains(node)) continue; // skip editor internals
        if (node.closest?.('[contenteditable="true"]')) continue;

        // Try specific selectors
        if (nodeContainsAny(node, ASSISTANT_SELECTORS)) {
          this.pendingResponseEl = node;
          break;
        }
        // Generic fallback: any new block with more than 20 chars outside the editor
        // After a prompt, the next substantial text block added is the AI response
        const text = node.innerText?.trim() ?? "";
        if (text.length > 20) {
          this.pendingResponseEl = node;
        }
      }

      // characterData: text streamed into an existing element
      if (record.type === "characterData" && record.target instanceof Text) {
        const parent = record.target.parentElement;
        if (parent && !(editor && editor.contains(parent))) {
          this.pendingResponseEl = this.pendingResponseEl ?? parent;
        }
      }
    }

    if (!this.pendingResponseEl) return;

    if (this.responseDebounce) clearTimeout(this.responseDebounce);
    this.responseDebounce = setTimeout(() => this.flushResponse(), 2000);
  }

  private flushResponse(): void {
    this.responseDebounce = null;

    if (isStreaming()) {
      this.responseDebounce = setTimeout(() => this.flushResponse(), 1500);
      return;
    }

    // Try specific selectors first
    const candidates = all<Element>(ASSISTANT_SELECTORS);
    let target: Element | null =
      candidates.find(el => el.getAttribute("data-aicc-captured") !== "true") ?? null;

    // Fallback: use the last node we detected in onMutation
    if (!target && this.pendingResponseEl) {
      target = this.pendingResponseEl;
    }

    // Last-resort: walk up from pendingResponseEl to find a good capture boundary
    if (target) {
      // Try to walk UP to a parent that contains more complete text but isn't <body>/<main>
      let parent = target.parentElement;
      while (parent && parent !== document.body && parent.tagName !== "MAIN") {
        const t = (parent as HTMLElement).innerText?.trim() ?? "";
        // Stop walking up if the parent contains user messages too (would capture everything)
        const hasUserContent = all(USER_SELECTORS).some(u => parent!.contains(u));
        if (hasUserContent) break;
        if (t.length > 0) target = parent;
        parent = parent.parentElement;
      }
    }

    if (!target) return;

    const text = (target as HTMLElement).innerText?.trim() ?? "";
    if (!text || text === this.lastResponseText || text.length < 5) return;

    (target as HTMLElement).setAttribute("data-aicc-captured", "true");
    this.lastResponseText = text;
    this.pendingResponseEl = null;
    this.promptSent = false;
    this.onEvent?.({ kind: "response", content: text, conversationId: this.convId(), promptEventId: "" });
    logger.debug("Claude: response captured", { chars: text.length });
  }

  private convId(): string {
    return /\/chat\/([a-z0-9-]+)/i.exec(location.pathname)?.[1] ?? "unknown";
  }
}
