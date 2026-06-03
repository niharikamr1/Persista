"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, FolderOpen, MessagesSquare, Pencil, Sparkles, Copy, Check, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import type { Project, Session, ReconstructedContext } from "@/types/api";

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
  CHATGPT: { bg: "rgba(16,163,127,0.12)",  color: "#10A37F" },
  CLAUDE:  { bg: "rgba(200,112,42,0.12)",  color: "#C8702A" },
  GEMINI:  { bg: "rgba(66,133,244,0.12)",  color: "#4285F4" },
  default: { bg: "rgba(100,78,46,0.1)",    color: "#6A4E2E" },
};

function buildProjectPrompt(ctx: ReconstructedContext, projectName: string): string {
  const lines = [
    `You are resuming a multi-session project captured by Persista.`,
    ``,
    `━━━ PROJECT CONTEXT ━━━`,
    `Project  : ${projectName}`,
    `Captured : ${ctx.eventCount} message(s), ${ctx.memoryCount} insight(s)`,
    `Tokens   : ~${ctx.totalTokens}`,
    ``,
  ];
  const events  = ctx.segments.filter(s => s.segmentType === "EVENT");
  const memories = ctx.segments.filter(s => s.segmentType === "MEMORY");
  if (events.length > 0) {
    lines.push(`━━━ CONVERSATION HISTORY ━━━`);
    for (const seg of events) {
      lines.push(`[${seg.summary.startsWith("PROMPT") ? "You" : "AI"}] ${seg.content}`);
      lines.push(``);
    }
  }
  if (memories.length > 0) {
    lines.push(`━━━ KEY INSIGHTS ━━━`);
    for (const m of memories) lines.push(`• ${m.content}`);
    lines.push(``);
  }
  lines.push(`━━━ INSTRUCTIONS ━━━`);
  lines.push(`Please continue this project with full awareness of the context above.`);
  return lines.join("\n");
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [showContext, setShowContext] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reconstructQuery, setReconstructQuery] = useState("");

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ["project", id],
    queryFn: () => apiClient.get<Project>(`/api/v1/projects/${id}`, accessToken),
    enabled: !!accessToken && !!id,
  });

  const { data: sessionsPage, isLoading: loadingSessions } = useQuery({
    queryKey: ["project-sessions", id],
    queryFn: () => apiClient.getPaged<Session>(`/api/v1/projects/${id}/sessions?size=50`, accessToken),
    enabled: !!accessToken && !!id,
  });

  const renameProject = useMutation({
    mutationFn: (name: string) =>
      apiClient.patch<Project>(`/api/v1/projects/${id}`, { name }, accessToken),
    onSuccess: (updated) => {
      queryClient.setQueryData(["project", id], updated);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditingName(false);
    },
  });

  const reconstruct = useMutation({
    mutationFn: () =>
      apiClient.post<ReconstructedContext>("/api/v1/context/reconstruct", {
        projectId: id,
        query: reconstructQuery.trim() || undefined,
        maxEvents: 100,
        maxMemories: 20,
        maxFiles: 10,
        tokenBudget: 12000,
        cache: false,
      }, accessToken),
    onSuccess: () => { setShowContext(true); setShowFullText(false); },
  });

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  function startEdit() {
    setNameDraft(project?.name ?? "");
    setEditingName(true);
  }

  function commitRename() {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== project?.name) renameProject.mutate(trimmed);
    else setEditingName(false);
  }

  const sessions = sessionsPage?.items ?? [];
  const promptText = reconstruct.data && project
    ? buildProjectPrompt(reconstruct.data, project.name)
    : "";

  function handleCopy() {
    void navigator.clipboard.writeText(promptText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ maxWidth: "860px" }}>

      {/* Back */}
      <button
        onClick={() => router.push("/projects")}
        style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", padding: "0 0 24px", cursor: "pointer", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", color: "#9A7050" }}
      >
        <ArrowLeft style={{ width: "14px", height: "14px" }} /> All projects
      </button>

      {loadingProject && (
        <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#B08060" }}>Loading…</p>
      )}

      {project && (
        <>
          {/* Project header */}
          <div style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", borderRadius: "18px", border: "1px solid rgba(200,140,60,0.18)", padding: "24px 28px", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "rgba(200,112,42,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FolderOpen style={{ width: "20px", height: "20px", color: "#C8702A" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingName ? (
                  <input
                    ref={nameInputRef}
                    value={nameDraft}
                    onChange={e => setNameDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingName(false); }}
                    style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "22px", color: "#1A1208", border: "none", borderBottom: "2px solid #C8702A", outline: "none", background: "transparent", width: "100%" }}
                  />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h1 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "22px", color: "#1A1208", margin: 0 }}>
                      {project.name}
                    </h1>
                    <button onClick={startEdit} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "#B08060" }}>
                      <Pencil style={{ width: "13px", height: "13px" }} />
                    </button>
                  </div>
                )}
                {project.description && (
                  <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", color: "#9A7050", margin: "4px 0 0" }}>
                    {project.description}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#B08060", flexShrink: 0 }}>
                <MessagesSquare style={{ width: "11px", height: "11px", display: "inline", marginRight: "4px", verticalAlign: "middle" }} />
                {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              </span>
              <input
                value={reconstructQuery}
                onChange={e => setReconstructQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !reconstruct.isPending && sessions.length > 0 && reconstruct.mutate()}
                placeholder="Focus on… (optional)"
                style={{ flex: 1, minWidth: "160px", padding: "7px 14px", borderRadius: "100px", border: "1px solid rgba(200,140,60,0.25)", background: "rgba(250,245,238,0.8)", color: "#1A1208", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", outline: "none" }}
                className="proj-query-input"
              />
              <button
                onClick={() => reconstruct.mutate()}
                disabled={reconstruct.isPending || sessions.length === 0}
                style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 18px", borderRadius: "100px", border: "none", background: reconstruct.isPending || sessions.length === 0 ? "rgba(200,112,42,0.12)" : "linear-gradient(135deg, #C8702A, #E8903A)", color: reconstruct.isPending || sessions.length === 0 ? "#C8702A" : "#fff", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", fontWeight: 600, cursor: reconstruct.isPending || sessions.length === 0 ? "not-allowed" : "pointer", boxShadow: reconstruct.isPending || sessions.length === 0 ? "none" : "0 2px 12px rgba(200,112,42,0.3)", whiteSpace: "nowrap", flexShrink: 0 }}
              >
                <Sparkles style={{ width: "13px", height: "13px" }} />
                {reconstruct.isPending ? "Reconstructing…" : "Reconstruct Full Project"}
              </button>
              {reconstruct.isError && (
                <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#C04040" }}>
                  Failed — is the backend running?
                </span>
              )}
            </div>
          </div>

          {/* Reconstructed context panel */}
          {showContext && reconstruct.data && (
            <div style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderRadius: "18px", border: "2px solid rgba(200,112,42,0.3)", padding: "24px 28px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "18px", color: "#1A1208", margin: "0 0 4px" }}>
                    Project Context Ready
                  </h2>
                  <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#9A7050", margin: 0 }}>
                    {reconstruct.data.eventCount} events · {reconstruct.data.memoryCount} insights · ~{reconstruct.data.totalTokens} tokens
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

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "16px" }}>
                {[
                  { label: "Events",   value: reconstruct.data.eventCount,        color: "#C8702A" },
                  { label: "Memories", value: reconstruct.data.memoryCount,       color: "#4285F4" },
                  { label: "Files",    value: reconstruct.data.fileCount,         color: "#10A37F" },
                  { label: "Tokens",   value: `~${reconstruct.data.totalTokens}`, color: "#9A7050" },
                ].map(stat => (
                  <div key={stat.label} style={{ background: "rgba(250,245,238,0.8)", borderRadius: "10px", padding: "10px 14px", textAlign: "center", border: "1px solid rgba(200,140,60,0.12)" }}>
                    <div style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontSize: "20px", color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", color: "#B08060", marginTop: "4px" }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(200,112,42,0.06)", borderRadius: "10px", padding: "10px 14px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#9A7050", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: showFullText ? "14px" : "0" }}>
                <span>Paste as your <strong style={{ color: "#C8702A" }}>first message</strong> in a new AI conversation to resume this project.</span>
                <button
                  onClick={() => setShowFullText(v => !v)}
                  style={{ flexShrink: 0, padding: "5px 12px", borderRadius: "100px", border: "1px solid rgba(200,112,42,0.3)", background: showFullText ? "rgba(200,112,42,0.12)" : "rgba(200,112,42,0.06)", color: "#C8702A", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                >
                  {showFullText ? "Hide text" : "Show full text"}
                </button>
              </div>
              {showFullText && (
                <textarea
                  readOnly
                  value={promptText}
                  style={{ width: "100%", minHeight: "280px", background: "rgba(250,245,238,0.8)", border: "1px solid rgba(200,140,60,0.2)", borderRadius: "10px", padding: "14px", fontFamily: "ui-monospace, monospace", fontSize: "12px", color: "#1A1208", lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                  onClick={e => (e.target as HTMLTextAreaElement).select()}
                />
              )}
            </div>
          )}

          {/* Sessions in this project */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontWeight: 600, fontSize: "15px", color: "#1A1208", margin: 0 }}>
                Sessions in this project
              </h2>
              <button
                onClick={() => router.push("/sessions")}
                style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#C8702A" }}
              >
                Add sessions <ArrowLeft style={{ width: "11px", height: "11px", transform: "rotate(180deg)" }} />
              </button>
            </div>

            {loadingSessions && (
              <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#B08060" }}>Loading sessions…</p>
            )}

            {!loadingSessions && sessions.length === 0 && (
              <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "16px", border: "1px solid rgba(200,140,60,0.15)", padding: "40px 32px", textAlign: "center" }}>
                <MessagesSquare style={{ width: "28px", height: "28px", color: "rgba(200,112,42,0.3)", margin: "0 auto 10px" }} />
                <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#9A7050", margin: 0 }}>
                  No sessions yet. Go to a session and assign it to this project.
                </p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {sessions.map(s => {
                const ps = platformStyle[s.platform] ?? platformStyle["default"]!;
                return (
                  <div
                    key={s.id}
                    onClick={() => router.push(`/sessions/${s.id}`)}
                    style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", borderRadius: "14px", border: "1px solid rgba(200,140,60,0.15)", padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", transition: "box-shadow 0.2s" }}
                    className="sess-row"
                  >
                    <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "100px", background: ps.bg, color: ps.color, flexShrink: 0 }}>
                      {s.platform}
                    </span>
                    <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#1A1208", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.title || "Untitled context"}
                    </span>
                    <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#B08060", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                      <Clock style={{ width: "11px", height: "11px" }} />{timeAgo(s.lastActiveAt)}
                    </span>
                    <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px", background: s.status === "ACTIVE" ? "rgba(16,163,127,0.1)" : "rgba(100,78,46,0.08)", color: s.status === "ACTIVE" ? "#10A37F" : "#9A7050", flexShrink: 0 }}>
                      {s.status === "ACTIVE" ? "live" : "ended"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <style>{`
        .sess-row:hover { box-shadow: 0 4px 20px rgba(200,112,42,0.1) !important; }
      `}</style>
    </div>
  );
}
