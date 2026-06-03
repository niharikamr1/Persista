import { eventStore } from "@/db/event-store";
import { sessionStore } from "@/db/session-store";
import { authManager } from "@/auth/auth-manager";
import { apiClient } from "./api-client";
import { logger } from "@/utils/logger";
import type { StoredEvent } from "@/db/types";

const EVENT_BATCH_SIZE = 50;
const SESSION_BATCH_SIZE = 20;

type IngestResponseData = {
  data: {
    accepted: string[];
    duplicates: string[];
    rejected: string[];
    newCheckpoint: string | null;
    serverTimestamp: string;
  };
};

type BatchSessionsResponseData = {
  data: { syncedCount: number };
};

export type SyncRunResult = {
  synced: number;
  failed: number;
};

function classifyFailure(status: number): string {
  if (status === 0)   return "Network error — no connection";
  if (status === 401) return "401 Unauthorized";
  if (status === 403) return "403 Forbidden";
  if (status === 429) return "429 Rate limited";
  if (status >= 400 && status < 500) return `${status} Invalid payload`;
  if (status >= 500) return `${status} Backend unavailable`;
  return `Error (${status})`;
}

// Strip extension-only retry metadata before sending events to the backend
function toWireEvent(
  e: StoredEvent,
): Omit<StoredEvent, "retryCount" | "nextRetryAt" | "failedPermanently"> {
  const { retryCount: _, nextRetryAt: __, failedPermanently: ___, ...wire } = e;
  return wire;
}

export const syncService = {
  /**
   * Full sync cycle:
   *   1. Sessions first (FK constraint — events reference session IDs)
   *   2. Events second
   */
  async run(): Promise<SyncRunResult> {
    const isAuth = await authManager.isAuthenticated();
    if (!isAuth) {
      logger.warn("Sync skipped — not authenticated");
      return { synced: 0, failed: 0 };
    }

    // Sessions MUST be synced before events to satisfy the FK constraint
    await syncSessions();
    return syncEvents();
  },

  async pendingCount(): Promise<number> {
    return eventStore.countPending();
  },

  async failedCount(): Promise<number> {
    return eventStore.countFailedPermanently();
  },
};

async function syncEvents(): Promise<SyncRunResult> {
  const pending = await eventStore.getPending(EVENT_BATCH_SIZE);
  if (pending.length === 0) return { synced: 0, failed: 0 };

  const result = await apiClient.post<IngestResponseData>("/api/v1/events/ingest", {
    events: pending.map(toWireEvent),
  });

  if (!result.ok) {
    const reason = classifyFailure(result.status);
    logger.error("Event batch upload failed", { status: result.status, error: result.error });
    await eventStore.markFailed(pending.map((e) => e.id), reason);
    return { synced: 0, failed: pending.length };
  }

  const { accepted, duplicates, rejected } = result.data.data;

  // Both accepted and duplicates are safe to mark synced — duplicates already exist on server
  const syncedIds = [...accepted, ...duplicates];
  const failedIds = rejected;

  await Promise.all([
    syncedIds.length > 0 ? eventStore.markSynced(syncedIds) : Promise.resolve(),
    failedIds.length > 0 ? eventStore.markFailed(failedIds, "Rejected by server") : Promise.resolve(),
  ]);

  // Advance per-platform checkpoints from the accepted events
  const acceptedEvents = pending.filter((e) => accepted.includes(e.id));
  for (const platform of new Set(acceptedEvents.map((e) => e.platform))) {
    const forPlatform = acceptedEvents.filter((e) => e.platform === platform);
    const lastForPlatform = forPlatform[forPlatform.length - 1];
    if (lastForPlatform) {
      await eventStore.updateCheckpoint(platform, lastForPlatform.id);
    }
  }

  logger.info("Event sync complete", { accepted: accepted.length, duplicates: duplicates.length, failed: rejected.length });
  return { synced: syncedIds.length, failed: failedIds.length };
}

async function syncSessions(): Promise<void> {
  const pending = await sessionStore.getPendingSync(SESSION_BATCH_SIZE);
  if (pending.length === 0) return;

  const result = await apiClient.post<BatchSessionsResponseData>("/api/v1/sessions/batch", {
    sessions: pending,
  });

  if (result.ok) {
    await sessionStore.markSynced(pending.map((s) => s.id));
    logger.info("Session sync complete", { count: result.data.data.syncedCount });
  } else {
    logger.warn("Session batch sync failed", { status: result.status });
  }
}
