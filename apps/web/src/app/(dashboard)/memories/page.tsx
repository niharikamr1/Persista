"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, Search, X, Sparkles, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import type { SemanticMemory } from "@/types/api";

const typeStyle: Record<string, { bg: string; color: string; label: string }> = {
  DECISION:     { bg: "rgba(200,112,42,0.12)", color: "#C8702A",  label: "Decision"     },
  BUG:          { bg: "rgba(220,60,60,0.1)",   color: "#C04040",  label: "Bug"          },
  TODO:         { bg: "rgba(66,133,244,0.1)",  color: "#4285F4",  label: "To-do"        },
  INSIGHT:      { bg: "rgba(16,163,127,0.1)",  color: "#10A37F",  label: "Insight"      },
  ARCHITECTURE: { bg: "rgba(140,80,200,0.1)",  color: "#8C50C8",  label: "Architecture" },
  default:      { bg: "rgba(100,78,46,0.08)",  color: "#9A7050",  label: ""             },
};

function getType(t: string) {
  return typeStyle[t] ?? { ...typeStyle.default, label: t };
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

const UNRESOLVED_TYPES = ["BUG", "TODO", "ARCHITECTURE"];

const filterChips = [
  { key: null,          label: "All",          color: "#9A7050", bg: "rgba(100,78,46,0.08)" },
  { key: "UNRESOLVED",  label: "Unresolved",   color: "#C04040", bg: "rgba(220,60,60,0.08)" },
  { key: "DECISION",    label: "Decision",     color: "#C8702A", bg: "rgba(200,112,42,0.1)" },
  { key: "BUG",         label: "Bug",          color: "#C04040", bg: "rgba(220,60,60,0.1)"  },
  { key: "TODO",        label: "To-do",        color: "#4285F4", bg: "rgba(66,133,244,0.1)" },
  { key: "INSIGHT",     label: "Insight",      color: "#10A37F", bg: "rgba(16,163,127,0.1)" },
  { key: "ARCHITECTURE",label: "Architecture", color: "#8C50C8", bg: "rgba(140,80,200,0.1)" },
] as const;

type FilterKey = (typeof filterChips)[number]["key"];

export default function MemoriesPage() {
  const { accessToken } = useAuthStore();
  const [input, setInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [activeType, setActiveType] = useState<FilterKey>(null);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["memory-search", activeQuery],
    queryFn: () =>
      apiClient.post<SemanticMemory[]>("/api/v1/memory/search", { query: activeQuery, topK: 20 }, accessToken),
    enabled: !!accessToken && activeQuery.length > 0,
  });

  const { data: allMemories, isLoading: isLoadingAll } = useQuery({
    queryKey: ["memories"],
    queryFn: () => apiClient.getPaged<SemanticMemory>("/api/v1/memory?size=50", accessToken),
    enabled: !!accessToken && activeQuery.length === 0,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveQuery(input.trim());
  }

  function clearSearch() {
    setInput("");
    setActiveQuery("");
  }

  const rawMemories = activeQuery ? searchResults : allMemories?.items;
  const memories = activeType === "UNRESOLVED"
    ? rawMemories?.filter(m => UNRESOLVED_TYPES.includes(m.memoryType))
    : activeType
      ? rawMemories?.filter(m => m.memoryType === activeType)
      : rawMemories;

  const isLoading = activeQuery ? isSearching : isLoadingAll;
  const total = allMemories?.page.totalElements;
  const unresolvedCount = allMemories?.items.filter(m => UNRESOLVED_TYPES.includes(m.memoryType)).length ?? 0;

  return (
    <div style={{ maxWidth: "860px" }}>

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "28px", color: "#1A1208", margin: 0, marginBottom: "6px" }}>
          Your Second Brain
        </h1>
        <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "15px", color: "#9A7050", margin: 0 }}>
          {total != null ? `${total} semantic memor${total === 1 ? "y" : "ies"} indexed from your AI sessions.` : "Decisions, insights, and reasoning chains extracted from every conversation."}
        </p>
      </div>

      {/* Unresolved issues banner */}
      {unresolvedCount > 0 && !activeQuery && (
        <div
          onClick={() => setActiveType(activeType === "UNRESOLVED" ? null : "UNRESOLVED")}
          style={{ background: activeType === "UNRESOLVED" ? "rgba(220,60,60,0.1)" : "rgba(220,60,60,0.06)", border: `1px solid ${activeType === "UNRESOLVED" ? "rgba(200,50,50,0.3)" : "rgba(200,50,50,0.18)"}`, borderRadius: "12px", padding: "12px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", transition: "background 0.2s" }}
        >
          <AlertCircle style={{ width: "16px", height: "16px", color: "#C04040", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", fontWeight: 600, color: "#C04040" }}>
              {unresolvedCount} unresolved {unresolvedCount === 1 ? "issue" : "issues"}
            </span>
            <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", color: "#9A7050" }}>
              {" "}— bugs, to-dos, and pending architecture decisions
            </span>
          </div>
          <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px", background: "rgba(200,50,50,0.12)", color: "#C04040" }}>
            {activeType === "UNRESOLVED" ? "showing" : "view"}
          </span>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "15px", height: "15px", color: "#B08060", pointerEvents: "none" }} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search your memories semantically…"
            style={{ width: "100%", boxSizing: "border-box", paddingLeft: "42px", paddingRight: "16px", paddingTop: "11px", paddingBottom: "11px", borderRadius: "10px", border: "1px solid rgba(200,140,60,0.3)", background: "rgba(255,255,255,0.9)", color: "#1A1208", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s" }}
            className="mem-input"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim()}
          style={{ padding: "11px 20px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #C8702A 0%, #D4842A 100%)", color: "white", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", fontWeight: 600, cursor: input.trim() ? "pointer" : "not-allowed", opacity: input.trim() ? 1 : 0.55, transition: "opacity 0.2s, transform 0.2s", flexShrink: 0 }}
        >
          Recall
        </button>
        {activeQuery && (
          <button
            type="button"
            onClick={clearSearch}
            style={{ padding: "11px 14px", borderRadius: "10px", border: "1px solid rgba(200,140,60,0.3)", background: "rgba(255,255,255,0.8)", color: "#9A7050", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}
          >
            <X style={{ width: "14px", height: "14px" }} />
          </button>
        )}
      </form>

      {/* Type filter chips */}
      {!activeQuery && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
          {filterChips.map(chip => {
            const isActive = activeType === chip.key;
            return (
              <button
                key={String(chip.key)}
                onClick={() => setActiveType(isActive ? null : chip.key)}
                style={{ padding: "5px 12px", borderRadius: "100px", border: `1px solid ${isActive ? chip.color + "55" : "rgba(200,140,60,0.2)"}`, background: isActive ? chip.bg : "rgba(255,255,255,0.7)", color: isActive ? chip.color : "#9A7050", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", fontWeight: isActive ? 600 : 400, cursor: "pointer", transition: "all 0.15s" }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      {/* State: loading */}
      {isLoading && (
        <div style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#B08060", padding: "24px 0" }}>
          {activeQuery ? "Searching semantic space…" : "Loading your memory…"}
        </div>
      )}

      {/* State: empty */}
      {!isLoading && !memories?.length && (
        <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "18px", border: "1px solid rgba(200,140,60,0.15)", padding: "48px 32px", textAlign: "center" }}>
          <Brain style={{ width: "32px", height: "32px", color: "rgba(200,112,42,0.35)", margin: "0 auto 12px" }} />
          <p style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "18px", color: "#3A2010", margin: "0 0 8px" }}>
            {activeQuery
              ? `No memories matched "${activeQuery}".`
              : activeType === "UNRESOLVED"
                ? "No unresolved issues found."
                : activeType
                  ? `No ${activeType.toLowerCase()} memories yet.`
                  : "Nothing stored yet."}
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#9A7050", margin: 0 }}>
            {activeQuery ? "Try broader terms — memories are matched semantically." : "Memories are extracted automatically as you use AI platforms."}
          </p>
        </div>
      )}

      {/* Active query label */}
      {activeQuery && memories && memories.length > 0 && (
        <div style={{ marginBottom: "16px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", color: "#9A7050" }}>
          <Sparkles style={{ width: "12px", height: "12px", display: "inline", marginRight: "6px", verticalAlign: "middle" }} />
          Showing {memories.length} semantic match{memories.length === 1 ? "" : "es"} for <strong style={{ color: "#3A2010" }}>&ldquo;{activeQuery}&rdquo;</strong>
        </div>
      )}

      {/* Active type filter label */}
      {!activeQuery && activeType && memories && memories.length > 0 && (
        <div style={{ marginBottom: "16px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "13px", color: "#9A7050" }}>
          Showing {memories.length} {activeType === "UNRESOLVED" ? "unresolved" : activeType.toLowerCase()} {memories.length === 1 ? "memory" : "memories"}
        </div>
      )}

      {/* Memory cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {memories?.map((memory) => {
          const ts = getType(memory.memoryType);
          const isUnresolved = UNRESOLVED_TYPES.includes(memory.memoryType);
          return (
            <div
              key={memory.id}
              style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", borderRadius: "14px", border: `1px solid ${isUnresolved && activeType === "UNRESOLVED" ? "rgba(200,50,50,0.2)" : "rgba(200,140,60,0.15)"}`, padding: "18px 20px", display: "flex", gap: "16px", transition: "box-shadow 0.2s" }}
              className="mem-card"
            >
              {/* Icon */}
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: ts.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                <Brain style={{ width: "14px", height: "14px", color: ts.color }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: "#1A1208", margin: "0 0 6px", lineHeight: 1.55 }}>
                  {memory.content}
                </p>
                {memory.summary && (
                  <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: "#9A7050", margin: "0 0 10px", lineHeight: 1.5 }}>
                    {memory.summary}
                  </p>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px", background: ts.bg, color: ts.color }}>
                    {ts.label || memory.memoryType}
                  </span>
                  <span style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "11px", color: "#C0A080" }}>
                    {timeAgo(memory.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .mem-input:focus { border-color: #C8702A !important; box-shadow: 0 0 0 3px rgba(200,112,42,0.15) !important; }
        .mem-card:hover { box-shadow: 0 4px 20px rgba(200,112,42,0.1) !important; }
      `}</style>
    </div>
  );
}
