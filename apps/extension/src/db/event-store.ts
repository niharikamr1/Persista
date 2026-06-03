import type { AIPlatform, CaptureEvent } from "@aicc/shared-types";
import type { StoredEvent } from "./types";
import { db } from "./database";

const MAX_RETRIES = 5;
// Exponential backoff: 1m → 2m → 4m → 8m → 16m
const BACKOFF_MS = [60_000, 120_000, 240_000, 480_000, 960_000] as const;

export const eventStore = {
  async append(event: CaptureEvent): Promise<void> {
    const stored: StoredEvent = {
      ...event,
      synced: 0,
      retryCount: 0,
      nextRetryAt: null,
      failedPermanently: false,
    };
    await db.events.put(stored);
  },

  async appendBatch(events: CaptureEvent[]): Promise<void> {
    const stored: StoredEvent[] = events.map((e) => ({
      ...e,
      synced: 0,
      retryCount: 0,
      nextRetryAt: null,
      failedPermanently: false,
    }));
    await db.events.bulkPut(stored);
  },

  // Returns events that are ready to retry right now (not permanently failed, backoff elapsed)
  async getPending(limit = 100): Promise<StoredEvent[]> {
    const now = Date.now();
    return db.events
      .where("synced")
      .equals(0)
      .and((e) => !e.failedPermanently && (e.nextRetryAt === null || e.nextRetryAt <= now))
      .limit(limit)
      .toArray();
  },

  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.events.where("id").anyOf(ids).modify({ synced: 1 });
  },

  // Increments retry count and schedules next retry with exponential backoff.
  // Permanently fails the event after MAX_RETRIES.
  async markFailed(ids: string[], reason?: string): Promise<void> {
    if (ids.length === 0) return;
    const now = Date.now();
    await db.events.where("id").anyOf(ids).modify((event: StoredEvent) => {
      const count = (event.retryCount ?? 0) + 1;
      event.retryCount = count;
      if (reason) event.failureReason = reason;
      if (count >= MAX_RETRIES) {
        event.failedPermanently = true;
        event.nextRetryAt = null;
      } else {
        event.nextRetryAt = now + (BACKOFF_MS[count - 1] ?? 960_000);
      }
    });
  },

  async getBySession(sessionId: string): Promise<StoredEvent[]> {
    return db.events.where("sessionId").equals(sessionId).sortBy("timestamp");
  },

  async countPending(): Promise<number> {
    const now = Date.now();
    return db.events
      .where("synced")
      .equals(0)
      .and((e) => !e.failedPermanently && (e.nextRetryAt === null || e.nextRetryAt <= now))
      .count();
  },

  async countFailedPermanently(): Promise<number> {
    return db.events
      .where("synced")
      .equals(0)
      .and((e) => e.failedPermanently === true)
      .count();
  },

  // Returns each distinct failure reason with how many events share it.
  async getFailedReasonsSummary(): Promise<{ reason: string; count: number }[]> {
    const failed = await db.events
      .where("synced")
      .equals(0)
      .and((e) => e.failedPermanently === true)
      .toArray();
    const tally = new Map<string, number>();
    for (const e of failed) {
      const r = e.failureReason ?? "Unknown error";
      tally.set(r, (tally.get(r) ?? 0) + 1);
    }
    return Array.from(tally.entries()).map(([reason, count]) => ({ reason, count }));
  },

  // Clears nextRetryAt backoff on non-permanently-failed events so they retry immediately.
  async resetBackoff(): Promise<void> {
    await db.events
      .where("synced")
      .equals(0)
      .and((e) => !e.failedPermanently && e.nextRetryAt !== null)
      .modify((event: StoredEvent) => {
        event.nextRetryAt = null;
      });
  },

  // Requeues all permanently-failed events back into the pending pipeline.
  async resetFailed(): Promise<void> {
    await db.events
      .where("synced")
      .equals(0)
      .and((e) => e.failedPermanently === true)
      .modify((event: StoredEvent) => {
        event.failedPermanently = false;
        event.retryCount = 0;
        event.nextRetryAt = null;
        delete event.failureReason;
      });
  },

  async getCheckpoint(platform: AIPlatform): Promise<string | null> {
    const row = await db.checkpoints.get(platform);
    return row?.lastSyncedEventId ?? null;
  },

  async updateCheckpoint(platform: AIPlatform, lastSyncedEventId: string): Promise<void> {
    await db.checkpoints.put({ platform, lastSyncedEventId, lastSyncedAt: Date.now() });
  },
};
