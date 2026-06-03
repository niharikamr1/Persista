"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FolderOpen, Plus, X, ArrowRight, Trash2, Check } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import type { Project } from "@/types/api";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ProjectsPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiClient.getPaged<Project>("/api/v1/projects?size=50", accessToken),
    enabled: !!accessToken,
  });

  const createProject = useMutation({
    mutationFn: () =>
      apiClient.post<Project>("/api/v1/projects", { name: name.trim(), description: description.trim() || null }, accessToken),
    onSuccess: (created) => {
      queryClient.setQueryData(["projects"], (old: typeof data) =>
        old ? { ...old, items: [created, ...old.items], page: { ...old.page, totalElements: old.page.totalElements + 1 } } : old
      );
      setName("");
      setDescription("");
      setShowForm(false);
      router.push(`/projects/${created.id}`);
    },
  });

  const deleteProject = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/projects/${id}`, accessToken),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(["projects"], (old: typeof data) =>
        old ? { ...old, items: old.items.filter(p => p.id !== deletedId), page: { ...old.page, totalElements: old.page.totalElements - 1 } } : old
      );
      setConfirmDelete(null);
    },
  });

  const projects = data?.items ?? [];
  const total = data?.page.totalElements;

  return (
    <div style={{ maxWidth: "860px" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "28px", color: "#1A1208", margin: 0, marginBottom: "6px" }}>
            Your Projects
          </h1>
          <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "15px", color: "#9A7050", margin: 0 }}>
            {total != null ? `${total} project${total === 1 ? "" : "s"} — group related sessions to reconstruct full context.` : "Group related AI sessions into projects for smarter context reconstruction."}
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px", borderRadius: "100px", border: "none", background: showForm ? "rgba(200,112,42,0.12)" : "linear-gradient(135deg, #C8702A, #E8903A)", color: showForm ? "#C8702A" : "#fff", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: showForm ? "none" : "0 2px 12px rgba(200,112,42,0.3)", transition: "all 0.2s" }}
        >
          {showForm ? <X style={{ width: "14px", height: "14px" }} /> : <Plus style={{ width: "14px", height: "14px" }} />}
          {showForm ? "Cancel" : "New Project"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderRadius: "16px", border: "2px solid rgba(200,112,42,0.25)", padding: "22px 24px", marginBottom: "28px" }}>
          <h2 style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontWeight: 600, fontSize: "15px", color: "#1A1208", margin: "0 0 16px" }}>
            Create a project
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && name.trim() && createProject.mutate()}
              placeholder="Project name  (e.g. React Todo App)"
              style={{ padding: "11px 14px", borderRadius: "10px", border: "1px solid rgba(200,140,60,0.3)", background: "rgba(250,245,238,0.8)", color: "#1A1208", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", outline: "none" }}
            />
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short description  (optional)"
              style={{ padding: "11px 14px", borderRadius: "10px", border: "1px solid rgba(200,140,60,0.2)", background: "rgba(250,245,238,0.6)", color: "#1A1208", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", outline: "none" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => createProject.mutate()}
                disabled={!name.trim() || createProject.isPending}
                style={{ padding: "10px 22px", borderRadius: "100px", border: "none", background: name.trim() ? "linear-gradient(135deg, #C8702A, #E8903A)" : "rgba(200,140,60,0.2)", color: name.trim() ? "#fff" : "#B08060", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", fontWeight: 600, cursor: name.trim() ? "pointer" : "not-allowed" }}
              >
                {createProject.isPending ? "Creating…" : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#B08060", padding: "24px 0" }}>
          Loading your projects…
        </p>
      )}

      {!isLoading && projects.length === 0 && (
        <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "18px", border: "1px solid rgba(200,140,60,0.15)", padding: "56px 32px", textAlign: "center" }}>
          <FolderOpen style={{ width: "36px", height: "36px", color: "rgba(200,112,42,0.35)", margin: "0 auto 14px" }} />
          <p style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "20px", color: "#3A2010", margin: "0 0 8px" }}>
            No projects yet.
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#9A7050", margin: 0 }}>
            Create a project to group related sessions and reconstruct context across an entire workstream.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {projects.map(project => {
          const isPendingDelete = confirmDelete === project.id;
          return (
            <div
              key={project.id}
              style={{ background: isPendingDelete ? "rgba(200,50,50,0.04)" : "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", borderRadius: "16px", border: `1px solid ${isPendingDelete ? "rgba(200,50,50,0.2)" : "rgba(200,140,60,0.15)"}`, padding: "18px 20px", display: "flex", alignItems: "center", gap: "16px", transition: "all 0.2s" }}
              className="project-row"
            >
              {/* Folder icon */}
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(200,112,42,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FolderOpen style={{ width: "18px", height: "18px", color: "#C8702A" }} />
              </div>

              {/* Info */}
              <div
                style={{ flex: 1, minWidth: 0, cursor: isPendingDelete ? "default" : "pointer" }}
                onClick={() => !isPendingDelete && router.push(`/projects/${project.id}`)}
              >
                <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "15px", fontWeight: 600, color: "#1A1208", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {project.name}
                </div>
                {project.description && (
                  <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#9A7050", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "3px" }}>
                    {project.description}
                  </div>
                )}
                <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", color: "#C0A080" }}>
                  Updated {timeAgo(project.updatedAt)}
                </div>
              </div>

              {/* Actions */}
              {isPendingDelete ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#C04040", marginRight: "4px" }}>Delete?</span>
                  <button
                    onClick={() => deleteProject.mutate(project.id)}
                    style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: "#C04040", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <Check style={{ width: "12px", height: "12px" }} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1px solid rgba(200,140,60,0.25)", background: "rgba(255,255,255,0.8)", color: "#9A7050", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <X style={{ width: "12px", height: "12px" }} />
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDelete(project.id); }}
                    style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1px solid transparent", background: "transparent", color: "#C0A080", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: 0.5, transition: "all 0.15s" }}
                    className="proj-delete-btn"
                  >
                    <Trash2 style={{ width: "13px", height: "13px" }} />
                  </button>
                  <button
                    onClick={() => router.push(`/projects/${project.id}`)}
                    style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 14px", borderRadius: "100px", border: "1px solid rgba(200,112,42,0.25)", background: "rgba(200,112,42,0.06)", color: "#C8702A", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "background 0.15s" }}
                  >
                    Open <ArrowRight style={{ width: "11px", height: "11px" }} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .project-row:hover .proj-delete-btn { opacity: 1 !important; }
        .proj-delete-btn:hover { background: rgba(200,50,50,0.08) !important; border-color: rgba(200,50,50,0.2) !important; color: #C04040 !important; }
      `}</style>
    </div>
  );
}
