import { logger } from "@/utils/logger";
import type { OnEventCallback, PlatformCapture } from "./types";

/**
 * ChatGPT capture — resilient to UI updates.
 *
 * Strategy:
 *  1. Prompt  : keydown/click → read editor → emit PROMPT_SENT.
 *  2. Response: MutationObserver watches addedNodes for new assistant turns.
 *               A 2 s debounce + streaming-button guard ensures we only
 *               capture once the full response has rendered.
 *
 * Selector fallback chains mean this survives most ChatGPT redesigns without
 * a code change.
 */

// ── Selector chains (first match wins) ────────────────────────────────────────

const EDITOR_SELECTORS = [
  "#prompt-textarea",
  'div[contenteditable="true"][data-id]',
  'div[contenteditable="true"]',
  'textarea[data-id]',
  "form textarea",
];

const SEND_BTN_SELECTORS = [
  '[data-testid="send-button"]',
  '[data-testid="composer-submit"]',
  'button[aria-label*="Send" i]',
  'button[type="submit"]',
];

// Selectors for assistant message containers
const ASSISTANT_SELECTORS = [
  '[data-message-author-role="assistant"]',
  'article[data-testid*="conversation-turn"]:not([data-message-author-role="user"])',
  ".agent-turn",
  '[data-testid="bot-message"]',
];

// Selectors for user message containers (used to read actual sent text)
const USER_SELECTORS = [
  '[data-message-author-role="user"]',
  'article[data-testid*="conversation-turn"][data-message-author-role="user"]',
];

// Presence of any of these means ChatGPT is still generating
const STREAMING_SELECTORS = [
  '[data-testid="stop-button"]',
  'button[aria-label*="Stop" i]',
  ".result-streaming",
  "[data-is-streaming]",
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
  const asInput = el as HTMLInputElement;
  return (typeof asInput.value === "string" ? asInput.value : (el as HTMLElement).innerText)?.trim() ?? "";
}

function nodeContainsAny(node: Element, selectors: string[]): boolean {
  return selectors.some(s => node.matches(s) || node.querySelector(s) !== null);
}

function extractText(node: Element): string {
  // Prefer a matching child so we get the narrowest element's text
  for (const s of ASSISTANT_SELECTORS) {
    const match = node.matches(s) ? node : node.querySelector(s);
    if (match) return (match as HTMLElement).innerText?.trim() ?? "";
  }
  return (node as HTMLElement).innerText?.trim() ?? "";
}

// ── Main class ────────────────────────────────────────────────────────────────

export class ChatGPTCapture implements PlatformCapture {
  readonly platform = "chatgpt" as const;
  readonly matchUrl = /^https:\/\/(chat\.openai\.com|chatgpt\.com)\/.*/;

  private observer:          MutationObserver | null = null;
  private onEvent:           OnEventCallback | null  = null;
  private responseDebounce:  ReturnType<typeof setTimeout> | null = null;
  private lastPrompt =       "";
  private lastResponseText = "";
  private pendingResponseEl: Element | null = null;
  private promptSent =       false; // guard: only capture responses after a prompt

  start(sessionId: string, onEvent: OnEventCallback): void {
    this.onEvent = onEvent;
    document.addEventListener("keydown", this.onKeyDown, true);
    document.addEventListener("click",   this.onClick,   true);
    // Mark all existing assistant messages as already captured so we don't
    // pick up historical responses from a conversation opened mid-session.
    all(ASSISTANT_SELECTORS).forEach(el => el.setAttribute("data-aicc-captured", "true"));
    this.startObserver();
    logger.info("ChatGPT capture started", { sessionId });
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
    // Primary: read from editor before it clears
    let text = readEditorText();

    // Fallback: read the last user turn that just appeared in the DOM
    if (!text) {
      const userEls = all(USER_SELECTORS);
      text = userEls.length ? (userEls[userEls.length - 1] as HTMLElement).innerText?.trim() ?? "" : "";
    }

    if (!text || text === this.lastPrompt) return;
    this.lastPrompt = text;
    this.promptSent = true; // gate: allow next response capture
    setTimeout(() => { this.lastPrompt = ""; }, 3000);
    this.onEvent?.({ kind: "prompt", content: text, conversationId: this.convId() });
    logger.debug("ChatGPT: prompt captured", { chars: text.length });
  }

  // ── Response ─────────────────────────────────────────────────────────────────

  private startObserver(): void {
    const root = document.querySelector("main") ?? document.body;
    this.observer = new MutationObserver(records => this.onMutation(records));
    this.observer.observe(root, { childList: true, subtree: true, characterData: true });
  }

  private onMutation(records: MutationRecord[]): void {
    if (!this.promptSent) return; // ignore mutations until user has sent a prompt

    // Look for newly added assistant turn nodes only
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (nodeContainsAny(node, ASSISTANT_SELECTORS)) {
          this.pendingResponseEl = node;
        }
      }
    }

    if (!this.pendingResponseEl) return;

    // Debounce — wait for streaming to stop
    if (this.responseDebounce) clearTimeout(this.responseDebounce);
    this.responseDebounce = setTimeout(() => this.flushResponse(), 2000);
  }

  private flushResponse(): void {
    this.responseDebounce = null;

    // If still generating, wait a bit more
    if (isStreaming()) {
      this.responseDebounce = setTimeout(() => this.flushResponse(), 1500);
      return;
    }

    // Re-select the latest assistant message (pendingResponseEl may be stale)
    const candidates = all<Element>(ASSISTANT_SELECTORS);
    const target = candidates.find(el => el.getAttribute("data-aicc-captured") !== "true")
      ?? candidates[candidates.length - 1];

    if (!target) return;

    const text = extractText(target);
    if (!text || text === this.lastResponseText) return;

    target.setAttribute("data-aicc-captured", "true");
    this.lastResponseText = text;
    this.pendingResponseEl = null;
    this.promptSent = false; // reset: wait for next prompt before capturing again
    this.onEvent?.({ kind: "response", content: text, conversationId: this.convId(), promptEventId: "" });
    logger.debug("ChatGPT: response captured", { chars: text.length });
  }

  private convId(): string {
    return /\/c\/([\w-]+)/.exec(location.pathname)?.[1] ?? "unknown";
  }
}
