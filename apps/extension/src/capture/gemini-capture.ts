import { logger } from "@/utils/logger";
import type { OnEventCallback, PlatformCapture } from "./types";

/**
 * Captures prompts and responses from Google Gemini (gemini.google.com).
 *
 * Strategy:
 *   - Prompt: intercept send button click or Enter keydown on rich input
 *   - Response: MutationObserver on the response container with debounce
 */
export class GeminiCapture implements PlatformCapture {
  readonly platform = "gemini" as const;
  readonly matchUrl = /^https:\/\/gemini\.google\.com\/.*/;

  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private onEvent: OnEventCallback | null = null;
  private lastPrompt = "";

  start(sessionId: string, onEvent: OnEventCallback): void {
    this.onEvent = onEvent;
    document.addEventListener("keydown", this.handleKeyDown, true);
    document.addEventListener("click",   this.handleClick,   true);
    this.attachResponseObserver();
    logger.info("Gemini capture started", { sessionId });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    document.removeEventListener("keydown", this.handleKeyDown, true);
    document.removeEventListener("click",   this.handleClick,   true);
    this.onEvent = null;
  }

  private getInput(): HTMLElement | null {
    return document.querySelector<HTMLElement>("rich-textarea .ql-editor");
  }

  private readonly handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== "Enter" || e.shiftKey) return;
    const input = this.getInput();
    if (!input) return;
    this.capturePrompt(input.innerText?.trim() ?? "");
  };

  private readonly handleClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    const isSendBtn = !!target.closest(
      'button[aria-label*="Send" i], button[aria-label*="send" i], [data-testid="send-button"], .send-button',
    );
    if (!isSendBtn) return;
    const input = this.getInput();
    if (!input) return;
    this.capturePrompt(input.innerText?.trim() ?? "");
  };

  private capturePrompt(content: string): void {
    if (!content || content === this.lastPrompt) return;
    this.lastPrompt = content;
    setTimeout(() => { this.lastPrompt = ""; }, 3000);
    this.onEvent?.({ kind: "prompt", content, conversationId: this.extractConversationId() });
  };

  private attachResponseObserver(): void {
    const target = document.querySelector("infinite-scroller") ?? document.body;
    this.observer = new MutationObserver(() => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.captureLastResponse(), 1000);
    });
    this.observer.observe(target, { childList: true, subtree: true, characterData: true });
  }

  private captureLastResponse(): void {
    const responses = document.querySelectorAll<HTMLElement>("model-response .markdown");
    const last = responses[responses.length - 1];
    if (!last || last.dataset.aiccCaptured) return;

    const content = last.innerText?.trim();
    if (!content) return;

    last.dataset.aiccCaptured = "true";
    this.onEvent?.({
      kind: "response",
      content,
      conversationId: this.extractConversationId(),
      promptEventId: "",
    });
  }

  private extractConversationId(): string {
    const match = /\/app\/([a-z0-9]+)/.exec(location.pathname);
    return match?.[1] ?? "unknown";
  }
}
