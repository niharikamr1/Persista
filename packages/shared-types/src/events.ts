import type { AIPlatform } from "./platform";

export type EventType =
  | "PROMPT_SENT"
  | "RESPONSE_RECEIVED"
  | "FILE_UPLOADED"
  | "SESSION_STARTED"
  | "SESSION_ENDED";

export type CaptureEvent = {
  readonly id: string;
  readonly sessionId: string;
  readonly platform: AIPlatform;
  readonly type: EventType;
  readonly timestamp: number;
  readonly payload: EventPayload;
  readonly synced: boolean;
};

export type EventPayload =
  | PromptPayload
  | ResponsePayload
  | FileUploadPayload
  | SessionPayload;

export type PromptPayload = {
  type: "PROMPT_SENT";
  content: string;
  conversationId: string;
};

export type ResponsePayload = {
  type: "RESPONSE_RECEIVED";
  content: string;
  conversationId: string;
  promptEventId: string;
};

export type FileUploadPayload = {
  type: "FILE_UPLOADED";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  conversationId: string;
};

export type SessionPayload = {
  type: "SESSION_STARTED" | "SESSION_ENDED";
  url: string;
};
