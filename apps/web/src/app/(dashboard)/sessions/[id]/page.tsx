"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Clock, MessageSquare, Bot, Sparkles, Copy, Check, X, Pencil, FolderOpen } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import type { Session, CaptureEvent, ReconstructedContext, Project } from "@/types/api";

// ── Platform styles ────────────────────────────────────────────────────────────
const platformStyle: Record<string, { bg: string; color: string }> = {
  CHATGPT: { bg: "rgba(16,163,127,0.12)",  color: "#10A37F" },
  CLAUDE:  { bg: "rgba(200,112,42,0.12)",  color: "#C8702A" },
  GEMINI:  { bg: "rgba(66,133,244,0.12)",  color: "#4285F4" },
  default: { bg: "rgba(100,78,46,0.1)",    color: "#6A4E2E" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start: string, end: string | null) {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

type ParsedPayload = { content?: string };
function parsePayload(raw: string): ParsedPayload {
  try { return JSON.parse(raw) as ParsedPayload; } catch { return {}; }
}

// ── Classify reconstruction errors into actionable messages ───────────────────
type ReconstructErrorInfo = { headline: string; hint: string };

function resolveReconstructError(err: Error): ReconstructErrorInfo {
  const msg = err.message ?? "";

  // Network / backend unreachable
  if (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed") ||
    msg.includes("fetch")
  ) {
    return {
      headline: "Backend unreachable.",
      hint: "Make sure the Persista backend is running, then try again.",
    };
  }

  // No events captured yet (422 from backend)
  if (msg.toLowerCase().includes("no captured events")) {
    return {
      headline: "This session has no captured events yet.",
      hint: "Start a conversation on ChatGPT, Claude, or Gemini — the extension will capture it automatically.",
    };
  }

  // Session not found or access denied (404)
  if (msg.toLowerCase().includes("not found")) {
    return {
      headline: "Session not found.",
      hint: "This session may have been deleted or doesn't belong to your account.",
    };
  }

  // Rate limited (429)
  if (msg.includes("Rate limit") || msg.includes("429") || msg.includes("rate limit")) {
    return {
      headline: "Too many requests.",
      hint: "You've hit the reconstruction limit. Wait a moment, then try again.",
    };
  }

  // Service temporarily unavailable (503)
  if (
    msg.includes("unexpected error") ||
    msg.includes("unavailable") ||
    msg.includes("503")
  ) {
    return {
      headline: "Reconstruction service temporarily unavailable.",
      hint: "Please try again in a few seconds.",
    };
  }

  // Generic fallback
  return {
    headline: "Reconstruction failed.",
    hint: "An unexpected error occurred. Please try again.",
  };
}

// ── Detect sessions that were never given a meaningful title ───────────────────
function isUntitled(title: string | null | undefined): boolean {
  if (!title) return true;
  return title.trim() === "" || title.trim() === "New conversation";
}

// ── Format reconstructed context into a copy-paste prompt ─────────────────────
function buildPromptText(ctx: ReconstructedContext, sessionTitle: string, platform: string): string {
  const lines: string[] = [
    `You are resuming a previous AI conversation captured by Persista.`,
    ``,
    `━━━ SESSION CONTEXT ━━━`,
    `Platform : ${platform}`,
    `Title    : ${sessionTitle}`,
    `Captured : ${ctx.eventCount} message(s), ${ctx.memoryCount} insight(s)`,
    `Tokens   : ~${ctx.totalTokens}`,
    ``,
  ];

  const events  = ctx.segments.filter(s => s.segmentType === "EVENT");
  const memories = ctx.segments.filter(s => s.segmentType === "MEMORY");

  if (events.length > 0) {
    lines.push(`━━━ CONVERSATION HISTORY ━━━`);
    for (const seg of events) {
      const label = seg.summary.startsWith("PROMPT") ? "You" : platform;
      lines.push(`[${label}] ${seg.content}`);
      lines.push(``);
    }
  }

  if (memories.length > 0) {
    lines.push(`━━━ KEY INSIGHTS EXTRACTED ━━━`);
    for (const m of memories) {
      lines.push(`• ${m.content}`);
    }
    lines.push(``);
  }

  lines.push(`━━━ INSTRUCTIONS ━━━`);
  lines.push(`Please continue this conversation with full awareness of the context above.`);
  lines.push(`Ask me where I'd like to pick up, or summarize what we covered and suggest next steps.`);

  return lines.join("\n");
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [showContext, setShowContext] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [reconstructQuery, setReconstructQuery] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const autoTitlePrompted = useRef(false);

  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ["session", id],
    queryFn: () => apiClient.get<Session>(`/api/v1/sessions/${id}`, accessToken),
    enabled: !!accessToken && !!id,
  });

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ["session-events", id],
    queryFn: () => apiClient.get<CaptureEvent[]>(`/api/v1/sessions/${id}/events`, accessToken),
    enabled: !!accessToken && !!id,
  });

  const renameSession = useMutation({
    mutationFn: (title: string) =>
      apiClient.patch<Session>(`/api/v1/sessions/${id}/title`, { title }, accessToken),
    onSuccess: (updated) => {
      queryClient.setQueryData(["session", id], updated);
      setEditingTitle(false);
    },
  });

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  // Auto-open the rename input when the session loads with no meaningful title.
  // The ref prevents re-triggering if the user cancels and the query re-fetches.
  useEffect(() => {
    if (session && !autoTitlePrompted.current && isUntitled(session.title)) {
      autoTitlePrompted.current = true;
      setTitleDraft(""); // clear "New conversation" so the user types from a blank slate
      setEditingTitle(true);
    }
  }, [session]);

  function startEdit() {
    setTitleDraft(session?.title ?? "");
    setEditingTitle(true);
  }

  function commitRename() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== session?.title) {
      renameSession.mutate(trimmed);
    } else {
      setEditingTitle(false);
    }
  }

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiClient.getPaged<Project>("/api/v1/projects?size=50", accessToken),
    enabled: !!accessToken,
  });

  const assignProject = useMutation({
    mutationFn: (projectId: string | null) =>
      apiClient.patch<Session>(`/api/v1/sessions/${id}/project`, { projectId }, accessToken),
    onSuccess: (updated, newProjectId) => {
      const oldProjectId = (queryClient.getQueryData(["session", id]) as Session | undefined)?.projectId;
      queryClient.setQueryData(["session", id], updated);
      // Invalidate both old and new project's session list so the project page updates immediately
      if (oldProjectId) void queryClient.invalidateQueries({ queryKey: ["project-sessions", oldProjectId] });
      if (newProjectId) void queryClient.invalidateQueries({ queryKey: ["project-sessions", newProjectId] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const reconstruct = useMutation({
    mutationFn: () =>
      apiClient.post<ReconstructedContext>(
        "/api/v1/context/reconstruct",
        {
          sessionId: id,
          query: reconstructQuery.trim() || undefined,
          maxEvents: 50, maxMemories: 10, maxFiles: 5, tokenBudget: 8000, cache: false,
        },
        accessToken,
      ),
    onSuccess: () => setShowContext(true),
  });

  const isLoading = loadingSession || loadingEvents;
  const ps = platformStyle[session?.platform ?? ""] ?? platformStyle["default"]!;
  const reconstructErrorInfo = reconstruct.isError
    ? resolveReconstructError(reconstruct.error as Error)
    : null;

  const transcript = (events ?? []).filter(
    e => e.eventType === "PROMPT_SENT" || e.eventType === "RESPONSE_RECEIVED",
  );
  const promptCount = transcript.filter(e => e.eventType === "PROMPT_SENT").length;

  const promptText = reconstruct.data && session
    ? buildPromptText(reconstruct.data, session.title, session.platform)
    : "";

  function handleCopy() {
    void navigator.clipboard.writeText(promptText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ maxWidth: "760px" }}>

      {/* Back */}
      <button
        onClick={() => router.back()}
        style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", padding: "0 0 28px", cursor: "pointer", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", color: "#9A7050" }}
      >
        <ArrowLeft style={{ width: "14px", height: "14px" }} /> Back to sessions
      </button>

      {isLoading && (
        <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#B08060" }}>
          Loading conversation…
        </p>
      )}

      {session && (
        <>
          {/* Session header */}
          <div style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", borderRadius: "18px", border: "1px solid rgba(200,140,60,0.15)", padding: "24px 28px", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "12px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "100px", background: ps.bg, color: ps.color }}>
                  {session.platform}
                </span>
                <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px", background: session.status === "ACTIVE" ? "rgba(16,163,127,0.1)" : "rgba(100,78,46,0.08)", color: session.status === "ACTIVE" ? "#10A37F" : "#9A7050" }}>
                  {session.status === "ACTIVE" ? "live" : "ended"}
                </span>
              </div>
              <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#B08060", display: "flex", alignItems: "center", gap: "4px" }}>
                <Clock style={{ width: "11px", height: "11px" }} />
                {formatDuration(session.startedAt, session.endedAt)}
              </span>
            </div>

            {editingTitle ? (
              <>
                {isUntitled(session.title) && (
                  <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", fontWeight: 500, color: "#C8702A", margin: "0 0 5px" }}>
                    This session has no title. Add one?
                  </p>
                )}
                <input
                  ref={titleInputRef}
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  placeholder="Enter a title for this session…"
                  style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "22px", color: "#1A1208", margin: "0 0 6px", border: "none", borderBottom: "2px solid #C8702A", outline: "none", background: "transparent", width: "100%" }}
                />
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <h1 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "22px", color: "#1A1208", margin: 0 }}>
                  {session.title || "Untitled context"}
                </h1>
                <button
                  onClick={startEdit}
                  title="Rename"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "#B08060", display: "flex", alignItems: "center" }}
                >
                  <Pencil style={{ width: "13px", height: "13px" }} />
                </button>
              </div>
            )}
            <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#B08060", margin: "0 0 20px" }}>
              Started {new Date(session.startedAt).toLocaleString()} · {promptCount} message{promptCount !== 1 ? "s" : ""}
            </p>

            {/* Project assignment */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <FolderOpen style={{ width: "13px", height: "13px", color: "#B08060", flexShrink: 0 }} />
              {session.projectId ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", fontWeight: 600, padding: "3px 10px", borderRadius: "100px", background: "rgba(200,112,42,0.1)", color: "#C8702A" }}>
                    {projects?.items.find(p => p.id === session.projectId)?.name ?? "Project"}
                  </span>
                  <button
                    onClick={() => assignProject.mutate(null)}
                    title="Remove from project"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#B08060", display: "flex", alignItems: "center", padding: "2px" }}
                  >
                    <X style={{ width: "11px", height: "11px" }} />
                  </button>
                </div>
              ) : (
                <select
                  value=""
                  onChange={e => e.target.value && assignProject.mutate(e.target.value)}
                  style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#9A7050", background: "rgba(250,245,238,0.8)", border: "1px solid rgba(200,140,60,0.2)", borderRadius: "8px", padding: "4px 8px", outline: "none", cursor: "pointer" }}
                >
                  <option value="">Add to project…</option>
                  {projects?.items.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Optional focus query + reconstruct */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={reconstructQuery}
                onChange={e => setReconstructQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !reconstruct.isPending && reconstruct.mutate()}
                placeholder="Focus on… (e.g. React hooks, auth flow)"
                style={{ flex: 1, minWidth: "180px", padding: "9px 14px", borderRadius: "100px", border: "1px solid rgba(200,140,60,0.25)", background: "rgba(250,245,238,0.8)", color: "#1A1208", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", outline: "none" }}
                className="query-input"
              />
              <button
                onClick={() => reconstruct.mutate()}
                disabled={reconstruct.isPending}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "100px", border: "none", background: reconstruct.isPending ? "rgba(200,112,42,0.12)" : "linear-gradient(135deg, #C8702A, #E8903A)", color: reconstruct.isPending ? "#C8702A" : "#fff", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", fontWeight: 600, cursor: reconstruct.isPending ? "not-allowed" : "pointer", boxShadow: reconstruct.isPending ? "none" : "0 2px 12px rgba(200,112,42,0.3)", whiteSpace: "nowrap" }}
              >
                <Sparkles style={{ width: "14px", height: "14px" }} />
                {reconstruct.isPending ? "Reconstructing…" : "Reconstruct Context"}
              </button>
            </div>
            {reconstructErrorInfo && (
              <div style={{ marginTop: "10px", padding: "10px 14px", borderRadius: "10px", background: "rgba(192,64,64,0.06)", border: "1px solid rgba(192,64,64,0.18)" }}>
                <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", fontWeight: 600, color: "#C04040", margin: "0 0 3px" }}>
                  {reconstructErrorInfo.headline}
                </p>
                <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#9A4040", margin: 0, lineHeight: 1.5 }}>
                  {reconstructErrorInfo.hint}
                </p>
              </div>
            )}
          </div>

          {/* Reconstructed context panel */}
          {showContext && reconstruct.data && (
            <div style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderRadius: "18px", border: "2px solid rgba(200,112,42,0.3)", padding: "24px 28px", marginBottom: "24px" }}>
              {/* Panel header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "18px", color: "#1A1208", margin: "0 0 4px" }}>
                    Context Package Ready
                  </h2>
                  <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#9A7050", margin: 0 }}>
                    {reconstruct.data.eventCount} event{reconstruct.data.eventCount !== 1 ? "s" : ""} · {reconstruct.data.memoryCount} insight{reconstruct.data.memoryCount !== 1 ? "s" : ""} · ~{reconstruct.data.totalTokens} tokens
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleCopy}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "100px", border: "1px solid rgba(200,112,42,0.3)", background: copied ? "rgba(16,163,127,0.1)" : "rgba(200,112,42,0.08)", color: copied ? "#10A37F" : "#C8702A", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    {copied ? <Check style={{ width: "12px", height: "12px" }} /> : <Copy style={{ width: "12px", height: "12px" }} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={() => { setShowContext(false); setShowFullText(false); }}
                    style={{ display: "flex", alignItems: "center", padding: "8px", borderRadius: "100px", border: "1px solid rgba(200,140,60,0.2)", background: "transparent", color: "#B08060", cursor: "pointer" }}
                  >
                    <X style={{ width: "12px", height: "12px" }} />
                  </button>
                </div>
              </div>

              {/* Stats breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "16px" }}>
                {[
                  { label: "Events",   value: reconstruct.data.eventCount,            color: "#C8702A" },
                  { label: "Memories", value: reconstruct.data.memoryCount,           color: "#4285F4" },
                  { label: "Files",    value: reconstruct.data.fileCount,             color: "#10A37F" },
                  { label: "Tokens",   value: `~${reconstruct.data.totalTokens}`,     color: "#9A7050" },
                ].map(stat => (
                  <div key={stat.label} style={{ background: "rgba(250,245,238,0.8)", borderRadius: "10px", padding: "10px 14px", textAlign: "center", border: "1px solid rgba(200,140,60,0.12)" }}>
                    <div style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontSize: "20px", color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", color: "#B08060", marginTop: "4px" }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Instruction banner with show/hide toggle */}
              <div style={{ background: "rgba(200,112,42,0.06)", borderRadius: "10px", padding: "10px 14px", marginBottom: showFullText ? "14px" : "0", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#9A7050", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <span>Paste as your <strong style={{ color: "#C8702A" }}>first message</strong> in a new ChatGPT, Claude, or Gemini conversation to resume instantly.</span>
                <button
                  onClick={() => setShowFullText(v => !v)}
                  style={{ flexShrink: 0, padding: "5px 12px", borderRadius: "100px", border: "1px solid rgba(200,112,42,0.3)", background: showFullText ? "rgba(200,112,42,0.12)" : "rgba(200,112,42,0.06)", color: "#C8702A", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  {showFullText ? "Hide text" : "Show full text"}
                </button>
              </div>

              {/* Context text — shown on demand */}
              {showFullText && (
                <textarea
                  readOnly
                  value={promptText}
                  style={{ width: "100%", minHeight: "280px", background: "rgba(250,245,238,0.8)", border: "1px solid rgba(200,140,60,0.2)", borderRadius: "10px", padding: "14px", fontFamily: "ui-monospace, 'Cascadia Code', monospace", fontSize: "12px", color: "#1A1208", lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                  onClick={e => (e.target as HTMLTextAreaElement).select()}
                />
              )}
            </div>
          )}

          {/* Transcript */}
          {transcript.length === 0 && !isLoading && (
            <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "18px", border: "1px solid rgba(200,140,60,0.15)", padding: "48px 32px", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#9A7050", margin: 0 }}>
                No messages captured in this session yet.
              </p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {transcript.map((event) => {
              const payload = parsePayload(event.payload);
              const isPrompt = event.eventType === "PROMPT_SENT";
              return (
                <div key={event.id} style={{ display: "flex", gap: "12px", flexDirection: isPrompt ? "row-reverse" : "row" }}>
                  {/* Avatar */}
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isPrompt ? "rgba(200,112,42,0.12)" : ps.bg }}>
                    {isPrompt
                      ? <MessageSquare style={{ width: "14px", height: "14px", color: "#C8702A" }} />
                      : <Bot style={{ width: "14px", height: "14px", color: ps.color }} />
                    }
                  </div>
                  {/* Bubble */}
                  <div style={{ maxWidth: "80%", background: isPrompt ? "rgba(200,112,42,0.07)" : "rgba(255,255,255,0.9)", border: `1px solid ${isPrompt ? "rgba(200,112,42,0.18)" : "rgba(200,140,60,0.15)"}`, borderRadius: isPrompt ? "18px 4px 18px 18px" : "4px 18px 18px 18px", padding: "12px 16px", backdropFilter: "blur(8px)" }}>
                    <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#1A1208", margin: "0 0 6px", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {payload.content ?? "(no content)"}
                    </p>
                    <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", color: "#B08060" }}>
                      {formatTime(event.clientTimestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
