"use client";

import { useQuery } from "@tanstack/react-query";
import { Brain, Layers, Sparkles, Zap, ArrowRight, Clock, Activity } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import type { SyncStatusResponse, Session } from "@/types/api";
import Link from "next/link";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const platformStyle: Record<string, { bg: string; color: string }> = {
  ChatGPT:  { bg: "rgba(16,163,127,0.12)",  color: "#10A37F" },
  Claude:   { bg: "rgba(200,112,42,0.12)",  color: "#C8702A" },
  Copilot:  { bg: "rgba(0,120,212,0.12)",   color: "#0078D4" },
  Gemini:   { bg: "rgba(66,133,244,0.12)",  color: "#4285F4" },
  default:  { bg: "rgba(100,78,46,0.1)",    color: "#6A4E2E" },
};

function getPlatform(p: string): { bg: string; color: string } {
  return platformStyle[p] ?? platformStyle["default"] ?? { bg: "rgba(100,78,46,0.1)", color: "#6A4E2E" };
}

export default function DashboardPage() {
  const { accessToken, displayName, email } = useAuthStore();
  const firstName = displayName?.split(" ")[0] ?? (email?.split("@")[0] ?? "there").replace(/[._-]/g, " ").split(" ")[0];

  const { data: memoriesPage } = useQuery({
    queryKey: ["memories-count"],
    queryFn: () => apiClient.getPaged("/api/v1/memory?size=1", accessToken),
    enabled: !!accessToken,
  });
  const { data: filesPage } = useQuery({
    queryKey: ["files-count"],
    queryFn: () => apiClient.getPaged("/api/v1/files?size=1", accessToken),
    enabled: !!accessToken,
  });
  const { data: syncStatus } = useQuery({
    queryKey: ["sync-status"],
    queryFn: () => apiClient.get<SyncStatusResponse>("/api/v1/sync/status", accessToken),
    enabled: !!accessToken,
    refetchInterval: 15_000,   // poll every 15 s so capture status updates quickly
    refetchIntervalInBackground: false,
  });
  const { data: sessionsPage } = useQuery({
    queryKey: ["sessions-count"],
    queryFn: () => apiClient.getPaged<Session>("/api/v1/sessions?size=4", accessToken),
    enabled: !!accessToken,
  });

  // ── Continuity status computation ─────────────────────────────────────────────
  const lastSyncTime = syncStatus?.checkpoints.reduce<string | null>((best, cp) => {
    if (!cp.lastSyncedAt) return best;
    if (!best) return cp.lastSyncedAt;
    return new Date(cp.lastSyncedAt) > new Date(best) ? cp.lastSyncedAt : best;
  }, null);

  const syncAgeMs = lastSyncTime ? Date.now() - new Date(lastSyncTime).getTime() : null;
  const overallStatus = (
    !lastSyncTime      ? "offline"  :
    syncAgeMs! < 7_200_000  ? "healthy"  :
    syncAgeMs! < 86_400_000 ? "idle"     :
                               "stale"
  ) as "healthy" | "idle" | "stale" | "offline";

  const statusMeta: Record<typeof overallStatus, { color: string; dot: string; label: string }> = {
    healthy: { color: "#10A37F", dot: "#10A37F", label: "All systems operational" },
    idle:    { color: "#C8702A", dot: "#E8951A", label: "Last seen today"         },
    stale:   { color: "#C04040", dot: "#C04040", label: "Sync needed"             },
    offline: { color: "#9A7050", dot: "#C0A080", label: "No device connected"     },
  };
  const status = statusMeta[overallStatus];

  const memCount = memoriesPage?.page.totalElements ?? 0;

  // Extension alarm fires every 1 min. Threshold = 90 s (1.5× alarm period) to absorb jitter.
  // Dashboard re-polls every 15 s, so disconnect is detected within ~105 s at most.
  const captureActive = syncAgeMs !== null && syncAgeMs < 90_000;
  const captureRecentlyActive = syncAgeMs !== null && syncAgeMs < 5 * 60_000;
  const everSynced = (syncStatus?.checkpoints.length ?? 0) > 0;

  const continuityItems = [
    {
      label: "Capture Status",
      value: captureActive
        ? "Capturing now"
        : captureRecentlyActive
          ? "Recently active"
          : everSynced
            ? "Disconnected"
            : "Install extension",
      color: captureActive ? "#10A37F" : captureRecentlyActive ? "#C8702A" : "#9A7050",
      dot:   captureActive ? "#10A37F" : captureRecentlyActive ? "#E8951A" : "#C0A080",
    },
    {
      label: "Sync Status",
      value: lastSyncTime ? "Synced" : "Not synced",
      color: lastSyncTime ? "#10A37F" : "#9A7050",
      dot:   lastSyncTime ? "#10A37F" : "#C0A080",
    },
    {
      label: "Last Sync",
      value: lastSyncTime ? timeAgo(lastSyncTime) : "Never",
      color: "#9A7050",
      dot:   lastSyncTime ? "#E8951A" : "#C0A080",
    },
    {
      label: "Semantic Index",
      value: memCount > 0 ? `${memCount} memories` : "Empty",
      color: memCount > 0 ? "#4285F4" : "#9A7050",
      dot:   memCount > 0 ? "#4285F4" : "#C0A080",
    },
  ];

  const stats = [
    { label: "AI Contexts",        value: sessionsPage?.page.totalElements,  icon: Layers,   desc: "captured sessions" },
    { label: "Restored Memories",  value: memoriesPage?.page.totalElements,  icon: Brain,    desc: "semantic recalls" },
    { label: "Context Artifacts",  value: filesPage?.page.totalElements,     icon: Sparkles, desc: "linked files" },
    { label: "Active Integrations",value: syncStatus?.checkpoints.length,    icon: Zap,      desc: "sync checkpoints" },
  ];

  const recentSessions = sessionsPage?.items ?? [];

  return (
    <div style={{ maxWidth: "900px" }}>

      {/* Greeting */}
      <div style={{ marginBottom: "36px" }}>
        <h1 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "28px", color: "#1A1208", margin: 0, marginBottom: "6px" }}>
          Welcome back, {firstName}.
        </h1>
        <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "15px", color: "#9A7050", margin: 0 }}>
          Your AI context is intact and ready to continue.
        </p>
      </div>

      {/* Semantic stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map(({ label, value, icon: Icon, desc }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", borderRadius: "16px", border: "1px solid rgba(200,140,60,0.18)", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(200,112,42,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon style={{ width: "18px", height: "18px", color: "#C8702A" }} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontSize: "28px", color: "#1A1208", lineHeight: 1 }}>
                {value ?? "—"}
              </div>
              <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", fontWeight: 600, color: "#3A2010", marginTop: "4px" }}>{label}</div>
              <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", color: "#B08060", marginTop: "2px" }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Continuity Status Panel */}
      <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", borderRadius: "16px", border: "1px solid rgba(200,140,60,0.18)", padding: "16px 20px", marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity style={{ width: "14px", height: "14px", color: "#C8702A" }} />
            <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontWeight: 600, fontSize: "13px", color: "#1A1208" }}>Continuity Status</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: status.dot, boxShadow: `0 0 0 3px ${status.dot}44` }} />
            <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", color: status.color }}>{status.label}</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {continuityItems.map(item => (
            <div key={item.label}>
              <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", color: "#B08060", margin: "0 0 5px", letterSpacing: "0.03em" }}>{item.label}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: item.dot, flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", fontWeight: 500, color: item.color }}>{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Continue Your Thinking */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontWeight: 600, fontSize: "16px", color: "#1A1208", margin: 0 }}>
            Continue Your Thinking
          </h2>
          <Link href="/sessions" style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", color: "#C8702A", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
            View all <ArrowRight style={{ width: "13px", height: "13px" }} />
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "16px", border: "1px solid rgba(200,140,60,0.15)", padding: "32px", textAlign: "center" }}>
            <Brain style={{ width: "28px", height: "28px", color: "rgba(200,112,42,0.4)", margin: "0 auto 10px" }} />
            <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#9A7050", margin: 0 }}>
              No AI sessions captured yet. Install the browser extension to start building your memory.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {recentSessions.map((s) => {
              const ps = getPlatform(s.platform);
              return (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  style={{ textDecoration: "none", background: "rgba(255,255,255,0.8)", borderRadius: "14px", border: "1px solid rgba(200,140,60,0.15)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", transition: "box-shadow 0.2s" }}
                  className="session-card"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
                    <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, padding: "3px 9px", borderRadius: "100px", background: ps.bg, color: ps.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {s.platform}
                    </span>
                    <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#1A1208", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.title || "Untitled context"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                    <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#B08060", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock style={{ width: "11px", height: "11px" }} />{timeAgo(s.lastActiveAt)}
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px", background: s.status === "ACTIVE" ? "rgba(16,163,127,0.1)" : "rgba(100,78,46,0.08)", color: s.status === "ACTIVE" ? "#10A37F" : "#9A7050" }}>
                      {s.status === "ACTIVE" ? "live" : "ended"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .session-card:hover { box-shadow: 0 4px 20px rgba(200,112,42,0.1) !important; }
      `}</style>
    </div>
  );
}
