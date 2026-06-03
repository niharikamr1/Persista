import type { AIPlatform } from "@aicc/shared-types";

/**
 * Each platform capture module must implement this interface.
 * The content script calls start() on page load and stop() on unload.
 */
export interface PlatformCapture {
  readonly platform: AIPlatform;
  /** CSS selector or other signal that confirms we're on this platform's chat page */
  readonly matchUrl: RegExp;
  start(sessionId: string, onEvent: OnEventCallback): void;
  stop(): void;
}

export type CapturedPrompt = {
  kind: "prompt";
  content: string;
  conversationId: string;
};

export type CapturedResponse = {
  kind: "response";
  content: string;
  conversationId: string;
  promptEventId: string;
};

export type CapturedFile = {
  kind: "file";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  conversationId: string;
};

export type CapturedPayload = CapturedPrompt | CapturedResponse | CapturedFile;

export type OnEventCallback = (payload: CapturedPayload) => void;
