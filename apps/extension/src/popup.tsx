import { useEffect, useState, useCallback } from "react";
import type { SyncStatusMessage } from "@/messaging/messages";

import "./popup.css";

type Status = Omit<SyncStatusMessage, "type">;

const DEFAULT_STATUS: Status = {
  pendingCount:    0,
  failedCount:     0,
  failedReasons:   [],
  lastSyncedAt:    null,
  isOnline:        navigator.onLine,
  isSyncing:       false,
  isAuthenticated: false,
  captureEnabled:  true,
};

function timeAgo(epoch: number | null): string {
  if (!epoch) return "Never";
  const diff = Math.floor((Date.now() - epoch) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return new Date(epoch).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Popup(): React.ReactElement {
  const [status,       setStatus]      = useState<Status>(DEFAULT_STATUS);
  const [forcingSync,  setForcingSync]  = useState(false);
  const [retrying,     setRetrying]     = useState(false);

  useEffect(() => {
    function requestStatus() {
      chrome.runtime.sendMessage({ type: "GET_STATUS" })
        .then((s: SyncStatusMessage) => { if (s?.type === "SYNC_STATUS") setStatus(s); })
        .catch(() => null);
    }

    requestStatus();
    const id = setInterval(requestStatus, 3000);

    function onMessage(msg: unknown) {
      const m = msg as SyncStatusMessage;
      if (m?.type === "SYNC_STATUS") setStatus(m);
    }
    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      clearInterval(id);
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  const forceSync = useCallback(async () => {
    setForcingSync(true);
    await chrome.runtime.sendMessage({ type: "FORCE_SYNC" }).catch(() => null);
    setTimeout(() => setForcingSync(false), 2000);
  }, []);

  const retryFailed = useCallback(async () => {
    setRetrying(true);
    await chrome.runtime.sendMessage({ type: "RETRY_FAILED" }).catch(() => null);
    setTimeout(() => setRetrying(false), 2000);
  }, []);

  const openOptions = () => chrome.runtime.openOptionsPage();

  const toggleCapture = useCallback(async () => {
    const next = !status.captureEnabled;
    await chrome.runtime.sendMessage({ type: "SET_CAPTURE_ENABLED", enabled: next }).catch(() => null);
    setStatus(s => ({ ...s, captureEnabled: next }));
  }, [status.captureEnabled]);

  const isBusy = status.isSyncing || forcingSync;

  return (
    <div className="pp-root">
      {/* Header */}
      <header className="pp-header">
        <span className="pp-wordmark">Persista</span>
        <div className="pp-status">
          <span className={`pp-dot ${status.isAuthenticated ? (status.isOnline ? "online" : "offline") : "noauth"}`} />
          <span className="pp-status-text">
            {!status.isAuthenticated ? "Not connected" : status.isSyncing ? "Syncing…" : status.isOnline ? "Active" : "Offline"}
          </span>
        </div>
      </header>

      {/* Body */}
      <main className="pp-body">

        {/* Capture toggle — always visible */}
        <div className="pp-toggle-row">
          <div>
            <span className="pp-toggle-label">Capture conversations</span>
            {!status.captureEnabled && (
              <span className="pp-toggle-paused">Paused</span>
            )}
          </div>
          <button
            role="switch"
            aria-checked={status.captureEnabled}
            onClick={toggleCapture}
            className={`pp-toggle ${status.captureEnabled ? "on" : "off"}`}
          >
            <span className="pp-toggle-thumb" />
          </button>
        </div>

        {!status.captureEnabled && (
          <p className="pp-paused-notice">
            Conversations are not being recorded while capture is paused.
          </p>
        )}

        {!status.isAuthenticated ? (
          /* ── Unauthenticated ── */
          <div className="pp-auth-prompt">
            <p className="pp-auth-msg">
              Sign in to start capturing AI conversations automatically.
            </p>
            <button className="pp-btn-primary" onClick={openOptions}>
              Connect account
            </button>
          </div>
        ) : (
          /* ── Authenticated ── */
          <>
            <div className="pp-stat">
              <span className="pp-stat-label">Pending sync</span>
              <span className="pp-stat-value">{status.pendingCount}</span>
            </div>

            {status.failedCount > 0 && (
              <>
                <div className="pp-stat">
                  <span className="pp-stat-label">Failed</span>
                  <span className="pp-stat-value pp-stat-err">{status.failedCount}</span>
                </div>

                {status.failedReasons.length > 0 && (
                  <div className="pp-fail-panel">
                    {status.failedReasons.map(({ reason, count }) => (
                      <div key={reason} className="pp-fail-row">
                        <span className="pp-fail-reason">{reason}</span>
                        <span className="pp-fail-count">×{count}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className={`pp-retry-btn ${retrying ? "retrying" : ""}`}
                  onClick={retryFailed}
                  disabled={retrying || isBusy}
                >
                  {retrying ? "Requeuing…" : "Retry Failed"}
                </button>
              </>
            )}

            <div className="pp-stat">
              <span className="pp-stat-label">Last synced</span>
              <span className="pp-stat-dim">{timeAgo(status.lastSyncedAt)}</span>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="pp-footer">
        <div className="pp-links">
          <button className="pp-link" onClick={openOptions}>Settings</button>
          <a className="pp-link" href="http://localhost:3000" target="_blank" rel="noreferrer">
            Dashboard ↗
          </a>
        </div>
        {status.isAuthenticated && (
          <button
            className={`pp-sync-btn ${isBusy ? "syncing" : ""}`}
            onClick={forceSync}
            disabled={isBusy}
          >
            {isBusy ? "Syncing…" : "Sync now"}
          </button>
        )}
      </footer>
    </div>
  );
}
