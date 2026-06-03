export type SyncStatus = "PENDING" | "IN_PROGRESS" | "SYNCED" | "FAILED";

export type SyncCheckpoint = {
  lastSyncedEventId: string;
  lastSyncedAt: number;
  platform: string;
};

export type SyncResult = {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  checkpoint: SyncCheckpoint;
};
