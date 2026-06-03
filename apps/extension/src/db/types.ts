import type { AIPlatform, CaptureEvent } from "@aicc/shared-types";

export type StoredEvent = Omit<CaptureEvent, "synced"> & {
  synced: 0 | 1;
  retryCount: number;
  nextRetryAt: number | null;
  failedPermanently: boolean;
  failureReason?: string;
};

export type LocalSession = {
  id: string;
  platform: AIPlatform;
  conversationId: string;
  title: string;
  startedAt: number;
  lastActiveAt: number;
  endedAt: number | null;
  synced: 0 | 1;
};
