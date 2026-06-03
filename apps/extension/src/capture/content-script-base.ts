import type { EventType } from "@aicc/shared-types";
import type { PlatformCapture } from "./types";
import type {
  EventCapturedMessage,
  NavUrlChangedMessage,
  SessionEndedMessage,
  SessionStartedMessage,
} from "@/messaging/messages";
import { generateSessionId } from "@/utils/id";
import { logger } from "@/utils/logger";

function send(msg: object): void {
  chrome.runtime.sendMessage(msg).catch(() => null);
}

async function sendWithRetry(msg: object, attempts = 4, delayMs = 300): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await chrome.runtime.sendMessage(msg);
      return;
    } catch {
      if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
}

/**
 * Runs the full capture lifecycle for a single platform content script.
 *
 * Handles:
 *   - Session start / end messaging to the background service worker
 *   - Event forwarding for prompts, responses, and file uploads
 *   - SPA navigation detection via history API interception and popstate
 */
export function runContentScript(capture: PlatformCapture): void {
  const platform = capture.platform;
  const sessionId = generateSessionId(platform);
  let currentUrl = location.href;

  // ── Session start ─────────────────────────────────────────────────────────
  const startMsg: SessionStartedMessage = {
    type: "SESSION_STARTED",
    platform,
    url: currentUrl,
    tabId: -1, // background uses sender.tab.id
  };
  // Retry because the SW may need a moment to wake up on first load
  void sendWithRetry(startMsg);

  capture.start(sessionId, (payload) => {
    const type: EventType =
      payload.kind === "prompt"
        ? "PROMPT_SENT"
        : payload.kind === "response"
          ? "RESPONSE_RECEIVED"
          : "FILE_UPLOADED";

    const msg: EventCapturedMessage = {
      type: "EVENT_CAPTURED",
      event: {
        sessionId,
        platform,
        type,
        timestamp: Date.now(),
        payload: payload as never,
      },
    };
    void sendWithRetry(msg);
    logger.debug("Event captured", { type, platform });
  });

  logger.info(`${platform} capture started`, { sessionId });

  // ── SPA navigation detection ──────────────────────────────────────────────
  function onNavigation(newUrl: string): void {
    if (newUrl === currentUrl) return;
    currentUrl = newUrl;
    const navMsg: NavUrlChangedMessage = {
      type: "NAV_URL_CHANGED",
      platform,
      sessionId,
      url: newUrl,
    };
    void sendWithRetry(navMsg); // retry in case SW is waking up
    logger.debug("SPA navigation detected", { platform, url: newUrl });
  }

  // Wrap history methods so SPA route changes are observable
  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    origPush(...args);
    onNavigation(location.href);
  };

  history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
    origReplace(...args);
    onNavigation(location.href);
  };

  window.addEventListener("popstate", () => onNavigation(location.href));

  // Also poll the URL every 2 s as a fallback for SPAs that bypass history API
  setInterval(() => onNavigation(location.href), 2000);

  // ── Session end ───────────────────────────────────────────────────────────
  window.addEventListener("beforeunload", () => {
    capture.stop();
    const endMsg: SessionEndedMessage = { type: "SESSION_ENDED", sessionId, platform };
    send(endMsg);
  });
}
