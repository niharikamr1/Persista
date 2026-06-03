"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Clock, MessagesSquare, Trash2, X, Check, Search } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import type { Session } from "@/types/api";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const today     = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

function groupByDate(sessions: Session[]): { label: string; items: Session[] }[] {
  const map = new Map<string, Session[]>();
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    let label: string;
    if (d.toDateString() === today.toDateString())     label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(s);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
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

export default function SessionsPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput]   = useState("");
  const [debouncedQ,  setDebouncedQ]    = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // 300 ms debounce — avoids API call on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["sessions", debouncedQ],
    queryFn: () => {
      const url = debouncedQ
        ? `/api/v1/sessions?size=50&q=${encodeURIComponent(debouncedQ)}`
        : "/api/v1/sessions?size=50";
      return apiClient.getPaged<Session>(url, accessToken);
    },
    enabled: !!accessToken,
  });

  const deleteSession = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/sessions/${id}`, accessToken),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(["sessions", debouncedQ], (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter(s => s.id !== deletedId),
          page: { ...old.page, totalElements: old.page.totalElements - 1 },
        };
      });
      void queryClient.invalidateQueries({ queryKey: ["sessions-count"] });
      setConfirmDelete(null);
    },
  });

  const sessions = data?.items ?? [];
  const total    = data?.page.totalElements;
  const groups   = debouncedQ ? [] : groupByDate(sessions);

  return (
    <div style={{ maxWidth: "860px" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "28px", color: "#1A1208", margin: 0, marginBottom: "6px" }}>
          Your Thinking Timeline
        </h1>
        <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "15px", color: "#9A7050", margin: 0 }}>
          {total != null ? `${total} captured context${total === 1 ? "" : "s"} across all platforms.` : "Every AI conversation you've had, organized by continuity."}
        </p>
      </div>

      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: "28px" }}>
        <Search style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "15px", height: "15px", color: "#B08060", pointerEvents: "none" }} />
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search sessions by title…"
          style={{ width: "100%", boxSizing: "border-box", paddingLeft: "42px", paddingRight: searchInput ? "40px" : "16px", paddingTop: "11px", paddingBottom: "11px", borderRadius: "12px", border: "1px solid rgba(200,140,60,0.25)", background: "rgba(255,255,255,0.9)", color: "#1A1208", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s" }}
          className="sess-search"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput("")}
            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#B08060", display: "flex", alignItems: "center", padding: "2px" }}
          >
            <X style={{ width: "14px", height: "14px" }} />
          </button>
        )}
      </div>

      {isLoading && (
        <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#B08060", padding: "32px 0" }}>
          {debouncedQ ? `Searching for "${debouncedQ}"…` : "Reconstructing your timeline…"}
        </div>
      )}

      {!isLoading && sessions.length === 0 && (
        <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "18px", border: "1px solid rgba(200,140,60,0.15)", padding: "48px 32px", textAlign: "center" }}>
          <MessagesSquare style={{ width: "32px", height: "32px", color: "rgba(200,112,42,0.35)", margin: "0 auto 12px" }} />
          <p style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "18px", color: "#3A2010", margin: "0 0 8px" }}>
            {debouncedQ ? `No sessions matched "${debouncedQ}".` : "Your timeline is empty."}
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#9A7050", margin: 0 }}>
            {debouncedQ ? "Try a different keyword." : "Install the browser extension to start capturing AI sessions automatically."}
          </p>
        </div>
      )}

      {/* Search results — flat list */}
      {debouncedQ && sessions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", color: "#9A7050", margin: "0 0 4px" }}>
            {sessions.length} result{sessions.length !== 1 ? "s" : ""} for &ldquo;{debouncedQ}&rdquo;
          </p>
          {sessions.map(s => <SessionRow key={s.id} s={s} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} deleteSession={deleteSession} router={router} />)}
        </div>
      )}

      {/* Normal timeline — grouped by date */}
      {!debouncedQ && (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {groups.map(({ label, items }) => (
            <div key={label}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", fontWeight: 600, color: "#B08060", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {label}
                </span>
                <div style={{ flex: 1, height: "1px", background: "rgba(200,140,60,0.18)" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {items.map(s => <SessionRow key={s.id} s={s} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} deleteSession={deleteSession} router={router} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {total != null && total > 50 && (
        <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", color: "#B08060", marginTop: "24px", textAlign: "center" }}>
          Showing 50 of {total} sessions.
        </p>
      )}

      <style>{`
        .sess-search:focus { border-color: #C8702A !important; box-shadow: 0 0 0 3px rgba(200,112,42,0.12) !important; }
        .session-row:hover .delete-btn { opacity: 1 !important; }
        .delete-btn:hover { background: rgba(200,50,50,0.08) !important; border-color: rgba(200,50,50,0.2) !important; color: #C04040 !important; }
      `}</style>
    </div>
  );
}

// ── Extracted row so both grouped and flat lists share the same markup ────────
function SessionRow({ s, confirmDelete, setConfirmDelete, deleteSession, router }: {
  s: Session;
  confirmDelete: string | null;
  setConfirmDelete: (id: string | null) => void;
  deleteSession: { mutate: (id: string) => void; isPending: boolean };
  router: ReturnType<typeof import("next/navigation").useRouter>;
}) {
  const ps = getPlatform(s.platform);
  const isPending = confirmDelete === s.id;
  const isDeleting = deleteSession.isPending && isPending;

  return (
    <div
      style={{ background: isPending ? "rgba(200,50,50,0.04)" : "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", borderRadius: "14px", border: `1px solid ${isPending ? "rgba(200,50,50,0.25)" : "rgba(200,140,60,0.15)"}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", transition: "all 0.2s" }}
      className="session-row"
    >
      <div
        onClick={() => !isPending && router.push(`/sessions/${s.id}`)}
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", cursor: isPending ? "default" : "pointer", minWidth: 0 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "100px", background: ps.bg, color: ps.color, whiteSpace: "nowrap", flexShrink: 0 }}>
            {s.platform}
          </span>
          <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: isPending ? "#9A7050" : "#1A1208", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.title || "Untitled context"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {s.eventCount > 0 ? (
            <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px", background: "rgba(200,112,42,0.09)", color: "#C8702A", whiteSpace: "nowrap" }}>
              {s.eventCount} {s.eventCount === 1 ? "msg" : "msgs"}
            </span>
          ) : (
            <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", color: "#C0A080", whiteSpace: "nowrap" }}>
              No messages
            </span>
          )}
          <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#B08060", display: "flex", alignItems: "center", gap: "4px" }}>
            <Clock style={{ width: "11px", height: "11px" }} />{timeAgo(s.lastActiveAt)}
          </span>
          <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px", background: s.status === "ACTIVE" ? "rgba(16,163,127,0.1)" : "rgba(100,78,46,0.08)", color: s.status === "ACTIVE" ? "#10A37F" : "#9A7050" }}>
            {s.status === "ACTIVE" ? "live" : "ended"}
          </span>
        </div>
      </div>

      {isPending ? (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#C04040", marginRight: "4px" }}>Delete?</span>
          <button onClick={() => deleteSession.mutate(s.id)} disabled={isDeleting} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: "#C04040", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Check style={{ width: "12px", height: "12px" }} />
          </button>
          <button onClick={() => setConfirmDelete(null)} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1px solid rgba(200,140,60,0.25)", background: "rgba(255,255,255,0.8)", color: "#9A7050", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <X style={{ width: "12px", height: "12px" }} />
          </button>
        </div>
      ) : (
        <button onClick={e => { e.stopPropagation(); setConfirmDelete(s.id); }} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1px solid transparent", background: "transparent", color: "#C0A080", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, opacity: 0.6, transition: "all 0.15s" }} className="delete-btn">
          <Trash2 style={{ width: "13px", height: "13px" }} />
        </button>
      )}
    </div>
  );
}
