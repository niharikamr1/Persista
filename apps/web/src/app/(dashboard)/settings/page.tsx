"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Zap, RefreshCw, Database, LogOut, Shield, Smartphone, Trash2, Lock } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "next/navigation";
import type { SyncStatusResponse } from "@/types/api";

function timeAgo(iso: string | null) {
  if (!iso) return "never synced";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const platformStyle: Record<string, { bg: string; color: string }> = {
  ChatGPT: { bg: "rgba(16,163,127,0.12)",  color: "#10A37F" },
  Claude:  { bg: "rgba(200,112,42,0.12)",  color: "#C8702A" },
  Copilot: { bg: "rgba(0,120,212,0.12)",   color: "#0078D4" },
  Gemini:  { bg: "rgba(66,133,244,0.12)",  color: "#4285F4" },
  default: { bg: "rgba(100,78,46,0.1)",    color: "#6A4E2E" },
};

function getPlatform(p: string): { bg: string; color: string } {
  return platformStyle[p] ?? platformStyle["default"] ?? { bg: "rgba(100,78,46,0.1)", color: "#6A4E2E" };
}

function getPlatformHealth(lastSyncedAt: string | null): { dot: string; label: string; color: string } {
  if (!lastSyncedAt) return { dot: "#C0A080", label: "never synced", color: "#B08060" };
  const ageMs = Date.now() - new Date(lastSyncedAt).getTime();
  if (ageMs < 2 * 3_600_000)  return { dot: "#10A37F", label: "healthy",     color: "#10A37F" };
  if (ageMs < 24 * 3_600_000) return { dot: "#E8951A", label: "idle",        color: "#C8702A" };
  return                              { dot: "#C04040", label: "stale",       color: "#C04040" };
}

const KNOWN_PLATFORMS = ["ChatGPT", "Claude", "Gemini"] as const;

export default function SettingsPage() {
  const { accessToken, email, userId, displayName, clearAuth } = useAuthStore();
  const router = useRouter();
  const [capturePaused, setCapturePaused] = useState(false);
  const [excludedPlatforms, setExcludedPlatforms] = useState<Set<string>>(new Set());

  const { data: syncStatus } = useQuery({
    queryKey: ["sync-status"],
    queryFn: () => apiClient.get<SyncStatusResponse>("/api/v1/sync/status", accessToken),
    enabled: !!accessToken,
  });

  function handleSignOut() {
    clearAuth();
    router.replace("/login");
  }

  function toggleExclude(platform: string) {
    setExcludedPlatforms(prev => {
      const next = new Set(prev);
      next.has(platform) ? next.delete(platform) : next.add(platform);
      return next;
    });
  }

  const checkpoints = syncStatus?.checkpoints ?? [];
  const checkpointMap = new Map(checkpoints.map(cp => [cp.platform, cp]));

  return (
    <div style={{ maxWidth: "760px" }}>

      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <h1 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "28px", color: "#1A1208", margin: 0, marginBottom: "6px" }}>
          Your Memory Profile
        </h1>
        <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "15px", color: "#9A7050", margin: 0 }}>
          Account settings, connected platforms, privacy controls, and sync status.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Account */}
        <section style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", borderRadius: "16px", border: "1px solid rgba(200,140,60,0.18)", overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(200,140,60,0.12)", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(200,112,42,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User style={{ width: "14px", height: "14px", color: "#C8702A" }} />
            </div>
            <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontWeight: 600, fontSize: "14px", color: "#1A1208" }}>Account</span>
          </div>
          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, color: "#B08060", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Name</p>
              <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#1A1208", margin: 0 }}>{displayName ?? "—"}</p>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, color: "#B08060", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Email</p>
              <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#1A1208", margin: 0 }}>{email ?? "—"}</p>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, color: "#B08060", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>User ID</p>
              <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#9A7050", margin: 0, fontVariantNumeric: "tabular-nums", wordBreak: "break-all" }}>{userId ?? "—"}</p>
            </div>
          </div>
        </section>

        {/* Platform Adapter Visibility */}
        <section style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", borderRadius: "16px", border: "1px solid rgba(200,140,60,0.18)", overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(200,140,60,0.12)", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(200,112,42,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap style={{ width: "14px", height: "14px", color: "#C8702A" }} />
            </div>
            <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontWeight: 600, fontSize: "14px", color: "#1A1208" }}>Connected Platforms</span>
            {checkpoints.length > 0 && (
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", fontWeight: 600, padding: "2px 9px", borderRadius: "100px", background: "rgba(16,163,127,0.1)", color: "#10A37F" }}>
                {checkpoints.length} active
              </span>
            )}
          </div>
          <div style={{ padding: "4px 22px 8px" }}>
            {KNOWN_PLATFORMS.map((platformName, i) => {
              const cp = checkpointMap.get(platformName);
              const ps = getPlatform(platformName);
              const health = getPlatformHealth(cp?.lastSyncedAt ?? null);
              const isConnected = !!cp;
              const isExcluded = excludedPlatforms.has(platformName);
              return (
                <div
                  key={platformName}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: i < KNOWN_PLATFORMS.length - 1 ? "1px solid rgba(200,140,60,0.1)" : "none", opacity: isExcluded ? 0.5 : 1, transition: "opacity 0.2s" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "100px", background: ps.bg, color: ps.color }}>
                      {platformName}
                    </span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: isConnected ? health.dot : "#C0A080" }} />
                        <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: isConnected ? health.color : "#B08060" }}>
                          {isConnected ? health.label : "not connected"}
                        </span>
                      </div>
                      {isConnected && (
                        <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", color: "#C0A080", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <RefreshCw style={{ width: "9px", height: "9px" }} />
                          Last sync: {timeAgo(cp.lastSyncedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleExclude(platformName)}
                    title={isExcluded ? "Enable capture" : "Pause capture for this platform"}
                    style={{ padding: "4px 10px", borderRadius: "100px", border: `1px solid ${isExcluded ? "rgba(200,50,50,0.3)" : "rgba(200,140,60,0.2)"}`, background: isExcluded ? "rgba(200,50,50,0.06)" : "rgba(255,255,255,0.6)", color: isExcluded ? "#C04040" : "#9A7050", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                  >
                    {isExcluded ? "excluded" : "active"}
                  </button>
                </div>
              );
            })}
            {checkpoints.length === 0 && (
              <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#9A7050", padding: "16px 0 8px" }}>
                No platforms synced yet. Install the browser extension to connect ChatGPT, Claude, and more.
              </p>
            )}
          </div>
        </section>

        {/* Privacy Controls */}
        <section style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", borderRadius: "16px", border: "1px solid rgba(200,140,60,0.18)", overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(200,140,60,0.12)", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(200,112,42,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield style={{ width: "14px", height: "14px", color: "#C8702A" }} />
            </div>
            <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontWeight: 600, fontSize: "14px", color: "#1A1208" }}>Privacy Controls</span>
          </div>
          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* Pause capture toggle */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
              <div>
                <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", fontWeight: 500, color: "#1A1208", margin: "0 0 3px" }}>Pause all capture</p>
                <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#9A7050", margin: 0 }}>
                  Stop the extension from capturing any new events. Existing data is preserved.
                </p>
              </div>
              <button
                onClick={() => setCapturePaused(v => !v)}
                style={{ flexShrink: 0, padding: "6px 14px", borderRadius: "100px", border: `1px solid ${capturePaused ? "rgba(200,50,50,0.3)" : "rgba(200,140,60,0.25)"}`, background: capturePaused ? "rgba(200,50,50,0.08)" : "rgba(16,163,127,0.08)", color: capturePaused ? "#C04040" : "#10A37F", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              >
                {capturePaused ? "Paused" : "Capturing"}
              </button>
            </div>

            {capturePaused && (
              <div style={{ background: "rgba(200,50,50,0.05)", border: "1px solid rgba(200,50,50,0.15)", borderRadius: "10px", padding: "12px 14px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#9A7050" }}>
                Capture is paused locally. To fully pause the extension, open the extension popup and toggle capture off there as well.
              </div>
            )}

            {/* Data privacy note */}
            <div style={{ borderTop: "1px solid rgba(200,140,60,0.1)", paddingTop: "16px" }}>
              <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, color: "#B08060", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Data Privacy</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  "Your conversations are captured locally in IndexedDB first.",
                  "Data is synced only to your private Persista backend instance.",
                  "No conversation data is shared with Anthropic or any third party.",
                  "Semantic embeddings are generated server-side from your conversations only.",
                ].map((line, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#10A37F", flexShrink: 0, marginTop: "6px" }} />
                    <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", color: "#9A7050", margin: 0 }}>{line}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Storage */}
        <section style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", borderRadius: "16px", border: "1px solid rgba(200,140,60,0.18)", overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(200,140,60,0.12)", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(200,112,42,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Database style={{ width: "14px", height: "14px", color: "#C8702A" }} />
            </div>
            <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontWeight: 600, fontSize: "14px", color: "#1A1208" }}>Storage</span>
          </div>
          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", fontWeight: 500, color: "#1A1208", margin: "0 0 2px" }}>Browser IndexedDB</p>
                <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#9A7050", margin: 0 }}>Captured events queue, session state, sync log</p>
              </div>
              <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px", background: "rgba(16,163,127,0.1)", color: "#10A37F" }}>local</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", fontWeight: 500, color: "#1A1208", margin: "0 0 2px" }}>Cloud (your Persista instance)</p>
                <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#9A7050", margin: 0 }}>Sessions, memories, events, semantic index</p>
              </div>
              <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px", background: "rgba(66,133,244,0.1)", color: "#4285F4" }}>private</span>
            </div>
            <div style={{ height: "5px", borderRadius: "100px", background: "rgba(200,140,60,0.12)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: "12%", borderRadius: "100px", background: "linear-gradient(90deg, #C8702A, #E8951A)" }} />
            </div>
            <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", color: "#C0A080", margin: 0 }}>
              Storage usage visible once indexing reaches threshold.
            </p>
            <div style={{ borderTop: "1px solid rgba(200,140,60,0.1)", paddingTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", fontWeight: 500, color: "#C04040", margin: "0 0 2px" }}>Delete local cache</p>
                <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#9A7050", margin: 0 }}>Clears extension IndexedDB. Cloud data is preserved.</p>
              </div>
              <button
                style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(200,50,50,0.25)", background: "rgba(200,50,50,0.05)", color: "#C04040", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}
                onClick={() => alert("Open the browser extension popup and use the Clear Cache option.")}
              >
                <Trash2 style={{ width: "12px", height: "12px" }} />
                Clear
              </button>
            </div>
          </div>
        </section>

        {/* Security */}
        <section style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", borderRadius: "16px", border: "1px solid rgba(200,140,60,0.18)", overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(200,140,60,0.12)", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(200,112,42,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Lock style={{ width: "14px", height: "14px", color: "#C8702A" }} />
            </div>
            <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontWeight: 600, fontSize: "14px", color: "#1A1208" }}>Security</span>
          </div>
          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(200,112,42,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Smartphone style={{ width: "14px", height: "14px", color: "#C8702A" }} />
                </div>
                <div>
                  <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", fontWeight: 500, color: "#1A1208", margin: "0 0 2px" }}>This device</p>
                  <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", color: "#B08060", margin: 0 }}>Current browser session · active now</p>
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px", background: "rgba(16,163,127,0.1)", color: "#10A37F" }}>
                active
              </span>
            </div>
            <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#B08060", margin: 0 }}>
              Access tokens expire automatically. If you suspect unauthorized access, sign out and sign in again to rotate your tokens.
            </p>
          </div>
        </section>

        {/* Session / Sign Out */}
        <section style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", borderRadius: "16px", border: "1px solid rgba(200,140,60,0.18)", overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(200,140,60,0.12)", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(200,50,50,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogOut style={{ width: "14px", height: "14px", color: "#C04040" }} />
            </div>
            <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontWeight: 600, fontSize: "14px", color: "#1A1208" }}>Session</span>
          </div>
          <div style={{ padding: "20px 22px" }}>
            <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#9A7050", margin: "0 0 16px" }}>
              Sign out from this device. Your memories and sessions are preserved.
            </p>
            <button
              onClick={handleSignOut}
              style={{ padding: "10px 20px", borderRadius: "10px", border: "1px solid rgba(200,50,50,0.3)", background: "rgba(200,50,50,0.06)", color: "#C04040", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}
              className="signout-btn"
            >
              Sign Out
            </button>
          </div>
        </section>

      </div>

      <style>{`
        .signout-btn:hover { background: rgba(200,50,50,0.12) !important; }
      `}</style>
    </div>
  );
}
