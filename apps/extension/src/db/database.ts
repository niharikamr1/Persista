import Dexie, { type Table } from "dexie";
import type { SyncCheckpoint } from "@aicc/shared-types";
import type { LocalSession, StoredEvent } from "./types";

export class AiccDatabase extends Dexie {
  events!: Table<StoredEvent>;
  sessions!: Table<LocalSession>;
  checkpoints!: Table<SyncCheckpoint & { platform: string }>;

  constructor() {
    super("aicc-v1");

    // v1 — original schema (events + checkpoints only)
    this.version(1).stores({
      events: "id, sessionId, platform, type, timestamp, synced",
      checkpoints: "platform",
    });

    // v2 — adds sessions table; adds nextRetryAt index for retry scheduling
    this.version(2)
      .stores({
        events: "id, sessionId, platform, type, timestamp, synced, nextRetryAt",
        sessions: "id, platform, conversationId, startedAt, synced",
        checkpoints: "platform",
      })
      .upgrade((tx) => {
        return tx
          .table<StoredEvent>("events")
          .toCollection()
          .modify((event) => {
            event.retryCount = 0;
            event.nextRetryAt = null;
            event.failedPermanently = false;
          });
      });
  }
}

export const db = new AiccDatabase();
