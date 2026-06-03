import type { AIPlatform, CaptureEvent } from "@aicc/shared-types";

// ── Content script → Background ───────────────────────────────────────────────

export type EventCapturedMessage = {
  type: "EVENT_CAPTURED";
  event: Omit<CaptureEvent, "id" | "synced">;
};

export type SessionStartedMessage = {
  type: "SESSION_STARTED";
  platform: AIPlatform;
  url: string;
  tabId: number;
};

export type SessionEndedMessage = {
  type: "SESSION_ENDED";
  sessionId: string;
  platform: AIPlatform;
};

// Fired by content script on SPA navigation (pushState / popState)
export type NavUrlChangedMessage = {
  type: "NAV_URL_CHANGED";
  platform: AIPlatform;
  sessionId: string;
  url: string;
};

// ── Popup → Background ────────────────────────────────────────────────────────

export type ForceSyncMessage = {
  type: "FORCE_SYNC";
};

export type GetStatusMessage = {
  type: "GET_STATUS";
};

export type RetryFailedMessage = {
  type: "RETRY_FAILED";
};

export type SetCaptureEnabledMessage = {
  type: "SET_CAPTURE_ENABLED";
  enabled: boolean;
};

// ── Background → Popup ────────────────────────────────────────────────────────

export type SyncStatusMessage = {
  type: "SYNC_STATUS";
  pendingCount: number;
  failedCount: number;
  failedReasons: { reason: string; count: number }[];
  lastSyncedAt: number | null;
  isOnline: boolean;
  isSyncing: boolean;
  isAuthenticated: boolean;
  captureEnabled: boolean;
};

// ── Auth ──────────────────────────────────────────────────────────────────────

export type AuthUpdatedMessage = {
  type: "AUTH_UPDATED";
  isAuthenticated: boolean;
};

// ── Union ─────────────────────────────────────────────────────────────────────

export type ExtensionMessage =
  | EventCapturedMessage
  | SessionStartedMessage
  | SessionEndedMessage
  | NavUrlChangedMessage
  | ForceSyncMessage
  | GetStatusMessage
  | RetryFailedMessage
  | SetCaptureEnabledMessage
  | SyncStatusMessage
  | AuthUpdatedMessage;

export type ExtensionMessageType = ExtensionMessage["type"];
