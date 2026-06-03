"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Image, FileCode, File, Upload, Paperclip, X, Check, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import type { FileRecord } from "@/types/api";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getFileIcon(mime: string) {
  if (mime.startsWith("image/")) return Image;
  if (mime === "application/pdf" || mime.startsWith("text/")) return FileText;
  if (mime.includes("json") || mime.includes("javascript") || mime.includes("typescript")) return FileCode;
  return File;
}

function getStatusStyle(status: string): { bg: string; color: string; label: string } {
  switch (status) {
    case "COMPLETE":    return { bg: "rgba(16,163,127,0.1)",  color: "#10A37F", label: "ready"      };
    case "IN_PROGRESS": return { bg: "rgba(200,112,42,0.1)",  color: "#C8702A", label: "processing" };
    case "PENDING":     return { bg: "rgba(100,78,46,0.08)",  color: "#9A7050", label: "pending"    };
    case "FAILED":      return { bg: "rgba(200,50,50,0.1)",   color: "#C04040", label: "failed"     };
    default:            return { bg: "rgba(100,78,46,0.08)",  color: "#9A7050", label: status       };
  }
}

export default function FilesPage() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["files"],
    queryFn: () => apiClient.getPaged<FileRecord>("/api/v1/files?size=50", accessToken),
    enabled: !!accessToken,
  });

  // 2-step upload: initiate → upload bytes
  const upload = useMutation({
    mutationFn: async (file: File) => {
      setUploadError(null);
      // Step 1: register the file record
      const record = await apiClient.post<FileRecord>("/api/v1/files", {
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      }, accessToken);
      // Step 2: stream the raw bytes
      await apiClient.uploadFile<FileRecord>(`/api/v1/files/${record.id}/content`, file, accessToken);
      return record;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["files"] });
      void queryClient.invalidateQueries({ queryKey: ["files-count"] });
    },
    onError: (err: Error) => setUploadError(err.message),
  });

  const deleteFile = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/files/${id}`, accessToken),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(["files"], (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter(f => f.id !== deletedId),
          page: { ...old.page, totalElements: old.page.totalElements - 1 },
        };
      });
      void queryClient.invalidateQueries({ queryKey: ["files-count"] });
      setConfirmDelete(null);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
    e.target.value = ""; // reset so same file can be re-uploaded
  }

  const total = data?.page.totalElements;

  return (
    <div style={{ maxWidth: "860px" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "28px", color: "#1A1208", margin: 0, marginBottom: "6px" }}>
            Context Artifacts
          </h1>
          <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "15px", color: "#9A7050", margin: 0 }}>
            {total != null ? `${total} file${total === 1 ? "" : "s"} captured from your AI sessions.` : "Screenshots, PDFs, and documents attached to your AI conversations."}
          </p>
        </div>

        {/* Upload button */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileChange} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={upload.isPending}
            style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px", borderRadius: "100px", border: "none", background: upload.isPending ? "rgba(200,112,42,0.12)" : "linear-gradient(135deg, #C8702A, #E8903A)", color: upload.isPending ? "#C8702A" : "#fff", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", fontWeight: 600, cursor: upload.isPending ? "not-allowed" : "pointer", boxShadow: upload.isPending ? "none" : "0 2px 12px rgba(200,112,42,0.3)", transition: "all 0.2s" }}
          >
            {upload.isPending
              ? <><span style={{ width: "14px", height: "14px", border: "2px solid #C8702A", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Uploading…</>
              : <><Upload style={{ width: "14px", height: "14px" }} /> Upload File</>
            }
          </button>
          {uploadError && (
            <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#C04040" }}>
              {uploadError}
            </span>
          )}
        </div>
      </div>

      {isLoading && (
        <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#B08060", padding: "24px 0" }}>
          Retrieving your artifacts…
        </div>
      )}

      {!isLoading && !data?.items.length && (
        <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "18px", border: "1px solid rgba(200,140,60,0.15)", padding: "48px 32px", textAlign: "center" }}>
          <Upload style={{ width: "32px", height: "32px", color: "rgba(200,112,42,0.35)", margin: "0 auto 12px" }} />
          <p style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "18px", color: "#3A2010", margin: "0 0 8px" }}>
            No artifacts yet.
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#9A7050", margin: 0 }}>
            Upload a file or attach documents during AI conversations via the extension.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {data?.items.map((file) => {
          const Icon = getFileIcon(file.mimeType);
          const ss = getStatusStyle(file.uploadStatus);
          const isPending = confirmDelete === file.id;
          const isDeleting = deleteFile.isPending && deleteFile.variables === file.id;

          return (
            <div
              key={file.id}
              style={{ background: isPending ? "rgba(200,50,50,0.04)" : "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", borderRadius: "14px", border: `1px solid ${isPending ? "rgba(200,50,50,0.2)" : "rgba(200,140,60,0.15)"}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", transition: "box-shadow 0.2s" }}
              className="file-row"
            >
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(200,112,42,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon style={{ width: "16px", height: "16px", color: "#C8702A" }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", fontWeight: 500, color: "#1A1208", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "3px" }}>
                  {file.originalName}
                </div>
                <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#B08060", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Paperclip style={{ width: "10px", height: "10px" }} />
                  <span>{formatBytes(file.sizeBytes)}</span>
                  <span style={{ color: "rgba(200,140,60,0.4)" }}>·</span>
                  <span>{timeAgo(file.createdAt)}</span>
                </div>
              </div>

              <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "100px", background: ss.bg, color: ss.color, flexShrink: 0 }}>
                {ss.label}
              </span>

              {isPending ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#C04040" }}>Delete?</span>
                  <button onClick={() => deleteFile.mutate(file.id)} disabled={isDeleting} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "none", background: "#C04040", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Check style={{ width: "11px", height: "11px" }} />
                  </button>
                  <button onClick={() => setConfirmDelete(null)} style={{ width: "26px", height: "26px", borderRadius: "7px", border: "1px solid rgba(200,140,60,0.25)", background: "rgba(255,255,255,0.8)", color: "#9A7050", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <X style={{ width: "11px", height: "11px" }} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(file.id)} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1px solid transparent", background: "transparent", color: "#C0A080", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, opacity: 0.5, transition: "all 0.15s" }} className="file-del-btn">
                  <Trash2 style={{ width: "13px", height: "13px" }} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {total != null && total > 50 && (
        <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", color: "#B08060", marginTop: "24px", textAlign: "center" }}>
          Showing 50 of {total} artifacts.
        </p>
      )}

      <style>{`
        .file-row:hover { box-shadow: 0 4px 20px rgba(200,112,42,0.1) !important; }
        .file-row:hover .file-del-btn { opacity: 1 !important; }
        .file-del-btn:hover { background: rgba(200,50,50,0.08) !important; border-color: rgba(200,50,50,0.2) !important; color: #C04040 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
