// ── Auth ──────────────────────────────────────────────────────────────────────
export type LoginRequest = { email: string; password: string };
export type RegisterRequest = { displayName: string; email: string; password: string };
export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
};
export type UserResponse = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
};

// ── Projects ──────────────────────────────────────────────────────────────────
export type Project = {
  id: string;
  name: string;
  description: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

// ── Sessions ──────────────────────────────────────────────────────────────────
export type Session = {
  id: string;
  userId: string;
  projectId: string | null;
  platform: string;
  title: string;
  conversationId: string | null;
  status: "ACTIVE" | "ENDED" | "EXPIRED";
  startedAt: string;
  lastActiveAt: string;
  endedAt: string | null;
  eventCount: number;
};

// ── Capture Events ────────────────────────────────────────────────────────────
export type CaptureEvent = {
  id: string;
  sessionId: string;
  eventType: "PROMPT_SENT" | "RESPONSE_RECEIVED" | "FILE_UPLOADED" | "SESSION_STARTED" | "SESSION_ENDED";
  platform: string;
  sequenceNumber: number;
  clientTimestamp: string;
  receivedAt: string;
  payload: string; // raw JSON string
};

// ── Context Reconstruction ────────────────────────────────────────────────────
export type ContextSegment = {
  segmentType: "SESSION" | "EVENT" | "MEMORY" | "FILE";
  sourceId: string;
  content: string;
  summary: string;
  relevanceScore: number;
  tokenCount: number;
  tracedAt: string;
};

export type ReconstructedContext = {
  packageId: string;
  sessionId: string | null;
  projectId: string | null;
  query: string | null;
  segments: ContextSegment[];
  totalTokens: number;
  eventCount: number;
  memoryCount: number;
  fileCount: number;
  reconstructedAt: string;
};

// ── Sync ──────────────────────────────────────────────────────────────────────
export type SyncCheckpointResponse = {
  platform: string;
  lastSyncedEventId: string | null;
  lastSyncedAt: string | null;
};

export type SyncStatusResponse = {
  checkpoints: SyncCheckpointResponse[];
  asOf: string;
};

// ── Files ─────────────────────────────────────────────────────────────────────
export type FileRecord = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadStatus: "PENDING" | "IN_PROGRESS" | "COMPLETE" | "FAILED";
  createdAt: string;
};

// ── Semantic Memory ───────────────────────────────────────────────────────────
export type SemanticMemory = {
  id: string;
  userId: string;
  sourceEventId: string | null;
  memoryType: string;
  content: string;
  summary: string | null;
  metadata: string;
  createdAt: string;
};
