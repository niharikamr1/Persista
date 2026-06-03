/**
 * Background Service Worker — coordination hub for the AICC extension.
 *
 * Responsibilities:
 *   1. Persist every captured event to IndexedDB (crash-safe WAL)
 *   2. Manage per-tab session registry for event routing
 *   3. Handle SPA navigation — update active session's conversation context
 *   4. Run the sync queue on an alarm and respond to forced syncs
 *   5. Broadcast sync status to the popup on demand and after each sync
 *   6. Recover on browser startup — drain any queued events from previous sessions
 */

import type { AIPlatform, CaptureEvent, EventType } from "@aicc/shared-types";
import { eventStore } from "@/db/event-store";
import { sessionStore } from "@/db/session-store";
import { syncService } from "@/sync/sync-service";
import { authManager } from "@/auth/auth-manager";
import { logger } from "@/utils/logger";
import { generateId } from "@/utils/id";
import type { ExtensionMessage, SyncStatusMessage } from "@/messaging/messages";

console.log("[AICC] background.ts — SW started");

// ── Per-tab session registry ──────────────────────────────────────────────────
// In-memory map is fast but lost on SW restart.
// chrome.storage.session persists for the browser session and survives SW restarts.
type ActiveSession = { sessionId: string; platform: AIPlatform; conversationId: string; titled: boolean };
const activeSessions = new Map<number, ActiveSession>();

async function saveSession(tabId: number, session: ActiveSession): Promise<void> {
  activeSessions.set(tabId, session);
  await chrome.storage.session.set({ [`tab_${tabId}`]: session });
}

async function removeSession(tabId: number): Promise<void> {
  activeSessions.delete(tabId);
  await chrome.storage.session.remove(`tab_${tabId}`);
}

async function getOrRestoreSession(tabId: number): Promise<ActiveSession | undefined> {
  const cached = activeSessions.get(tabId);
  if (cached) return cached;
  // SW restarted — recover from chrome.storage.session instead of creating a new session
  const stored = await chrome.storage.session.get(`tab_${tabId}`);
  const session = stored[`tab_${tabId}`] as ActiveSession | undefined;
  if (session) activeSessions.set(tabId, session);
  return session;
}

// ── Capture + sync state ──────────────────────────────────────────────────────
let isSyncing      = false;
let lastSyncedAt:  number | null = null;
let captureEnabled = true;

// Load persisted capture toggle on startup
authManager.getCaptureEnabled().then(v => { captureEnabled = v; }).catch(() => null);

// ── Alarm: sync every 1 minute ────────────────────────────────────────────────
chrome.alarms.create("sync-queue", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "sync-queue") await runSync();
});

// ── First install ─────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    logger.info("AICC extension installed — opening options page");
    void chrome.runtime.openOptionsPage();
  }
});

// ── Browser startup: drain any offline queue from previous session ────────────
chrome.runtime.onStartup.addListener(() => {
  logger.info("Browser started — running recovery sync");
  void runSync();
});

// ── Tab removed: end the session associated with that tab ─────────────────────
chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const session = await getOrRestoreSession(tabId);
    if (!session) return;
    await removeSession(tabId);
    void sessionStore.end(session.sessionId);
    void persistEvent({
      sessionId: session.sessionId,
      platform: session.platform,
      type: "SESSION_ENDED",
      payload: JSON.stringify({ type: "SESSION_ENDED", url: "" }),
      timestamp: Date.now(),
    });
  })();
});

// ── Message listener ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    console.log("[AICC] message →", message.type);
    handleMessage(message, sender.tab?.id ?? -1)
      .then(sendResponse)
      .catch((err) => {
        logger.error("Message handler error", err);
        sendResponse({ ok: false });
      });
    return true; // keep port open for async response
  },
);

async function handleMessage(
  message: ExtensionMessage,
  tabId: number,
): Promise<{ ok: boolean }> {
  switch (message.type) {
    case "SESSION_STARTED": {
      if (!captureEnabled) return { ok: true };
      const convId = extractConversationId(message.platform, message.url);
      const session = await sessionStore.create(
        message.platform,
        convId,
        extractTitle(),
      );
      await saveSession(tabId, { sessionId: session.id, platform: message.platform, conversationId: convId, titled: false });
      await persistEvent({
        sessionId: session.id,
        platform: message.platform,
        type: "SESSION_STARTED",
        payload: JSON.stringify({ type: "SESSION_STARTED", url: message.url }),
        timestamp: Date.now(),
      });
      logger.info("Session started", { sessionId: session.id, platform: message.platform });
      return { ok: true };
    }

    case "SESSION_ENDED": {
      const session = await getOrRestoreSession(tabId);
      if (session) {
        await removeSession(tabId);
        await sessionStore.end(session.sessionId);
        await persistEvent({
          sessionId: session.sessionId,
          platform: session.platform,
          type: "SESSION_ENDED",
          payload: JSON.stringify({ type: "SESSION_ENDED", url: "" }),
          timestamp: Date.now(),
        });
      }
      return { ok: true };
    }

    case "EVENT_CAPTURED": {
      if (!captureEnabled) return { ok: true };
      let session = await getOrRestoreSession(tabId);
      if (!session) {
        // No session in storage either — SW was restarted after a full browser restart
        const url = tabId > 0
          ? await chrome.tabs.get(tabId).then(t => t.url ?? "").catch(() => "")
          : "";
        const convId = extractConversationId(message.event.platform, url);
        const recovered = await sessionStore.create(
          message.event.platform,
          convId,
          extractTitle(),
        );
        session = { sessionId: recovered.id, platform: message.event.platform, conversationId: convId, titled: false };
        await saveSession(tabId, session);
        logger.info("Session recovered after full browser restart", { sessionId: recovered.id });
      }
      const { event } = message;

      // Set title from first prompt if not yet titled
      if (!session.titled && event.type === "PROMPT_SENT") {
        const content = (event.payload as { content?: string }).content ?? "";
        if (content.length > 0) {
          const title = content.length > 60 ? content.slice(0, 57).trim() + "…" : content.trim();
          await sessionStore.updateTitle(session.sessionId, title);
          session.titled = true;
          await saveSession(tabId, session);
        }
      }

      await persistEvent({
        sessionId: session.sessionId,
        platform: session.platform,
        type: event.type,
        payload: JSON.stringify(event.payload),
        timestamp: event.timestamp,
      });
      await sessionStore.touch(session.sessionId);
      return { ok: true };
    }

    case "NAV_URL_CHANGED": {
      const session = await getOrRestoreSession(tabId);
      if (!session) return { ok: true };
      const newConvId = extractConversationId(message.platform, message.url);
      const oldConvId = session.conversationId;

      if (oldConvId !== "unknown" && newConvId !== oldConvId) {
        // User navigated to a different conversation — end current session and start fresh
        await removeSession(tabId);
        await sessionStore.end(session.sessionId);
        const newSession = await sessionStore.create(message.platform, newConvId, extractTitle());
        await saveSession(tabId, { sessionId: newSession.id, platform: session.platform, conversationId: newConvId, titled: false });
        await persistEvent({
          sessionId: newSession.id,
          platform: session.platform,
          type: "SESSION_STARTED",
          payload: JSON.stringify({ type: "SESSION_STARTED", url: message.url }),
          timestamp: Date.now(),
        });
        logger.info("New conversation detected — session rotated", { from: oldConvId, to: newConvId });
      } else {
        // First navigation in a new chat: unknown → real conv id, just update
        session.conversationId = newConvId;
        await saveSession(tabId, session);
        await sessionStore.updateConversationId(session.sessionId, newConvId);
      }
      return { ok: true };
    }

    case "SET_CAPTURE_ENABLED": {
      captureEnabled = message.enabled;
      await authManager.setCaptureEnabled(captureEnabled);
      logger.info(captureEnabled ? "Capture resumed" : "Capture paused");
      await broadcastStatus();
      return { ok: true };
    }

    case "FORCE_SYNC": {
      await eventStore.resetBackoff();   // clear retry delay so all pending events are eligible
      void runSync();
      return { ok: true };
    }

    case "RETRY_FAILED": {
      await eventStore.resetFailed();
      void runSync();
      return { ok: true };
    }

    case "GET_STATUS": {
      const status = await buildStatus();
      return status as unknown as { ok: boolean };
    }

    default:
      return { ok: false };
  }
}

// ── Sync runner ───────────────────────────────────────────────────────────────
async function runSync(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;
  await broadcastStatus();

  try {
    const result = await syncService.run();
    if (result.synced > 0) lastSyncedAt = Date.now();
  } finally {
    isSyncing = false;
    await broadcastStatus();
  }
}

// ── Status broadcast ──────────────────────────────────────────────────────────
async function buildStatus(): Promise<SyncStatusMessage> {
  const [pendingCount, failedCount, failedReasons, isAuthenticated] = await Promise.all([
    syncService.pendingCount(),
    syncService.failedCount(),
    eventStore.getFailedReasonsSummary(),
    authManager.isAuthenticated(),
  ]);
  return {
    type: "SYNC_STATUS",
    pendingCount,
    failedCount,
    failedReasons,
    lastSyncedAt,
    isOnline: true,
    isSyncing,
    isAuthenticated,
    captureEnabled,
  };
}

async function broadcastStatus(): Promise<void> {
  const status = await buildStatus();
  chrome.runtime.sendMessage(status).catch(() => null);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function persistEvent(partial: {
  sessionId: string;
  platform: AIPlatform;
  type: EventType;
  payload: string;
  timestamp: number;
}): Promise<void> {
  const event: CaptureEvent = {
    id: generateId(),
    sessionId: partial.sessionId,
    platform: partial.platform,
    type: partial.type,
    timestamp: partial.timestamp,
    payload: JSON.parse(partial.payload) as CaptureEvent["payload"],
    synced: false,
  };
  await eventStore.append(event);
}

function extractConversationId(platform: AIPlatform, url: string): string {
  try {
    const path = new URL(url).pathname;
    switch (platform) {
      case "chatgpt": return /\/c\/([a-z0-9-]+)/.exec(path)?.[1] ?? "unknown";
      case "claude":  return /\/chat\/([a-z0-9-]+)/.exec(path)?.[1] ?? "unknown";
      case "gemini":  return /\/app\/([a-z0-9]+)/.exec(path)?.[1] ?? "unknown";
    }
  } catch {
    return "unknown";
  }
}

function extractTitle(): string {
  return "New conversation";
}

// Drain the offline queue on service worker activation (handles SW restarts)
void runSync();

export {};
