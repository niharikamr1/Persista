"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, FolderOpen, LayoutDashboard, MessagesSquare, Settings, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home",     label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects",  icon: FolderOpen      },
  { href: "/sessions", label: "Sessions",  icon: MessagesSquare  },
  { href: "/memories", label: "Memories",  icon: Cpu             },
  { href: "/files",    label: "Files",     icon: FileText        },
  { href: "/settings", label: "Settings",  icon: Settings        },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: "220px",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      background: "rgba(255,253,249,0.95)",
      borderRight: "1px solid rgba(200,140,60,0.18)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
    }}>
      {/* Wordmark */}
      <div style={{
        height: "60px",
        display: "flex",
        alignItems: "center",
        paddingLeft: "20px",
        borderBottom: "1px solid rgba(200,140,60,0.15)",
      }}>
        <span style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontWeight: 700,
          fontStyle: "italic",
          fontSize: "22px",
          color: "#1A1208",
          lineHeight: 1,
          letterSpacing: "-0.01em",
        }}>
          Persista
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: "2px" }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 12px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: active ? 600 : 400,
                fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                color: active ? "#C8702A" : "#6A4E2E",
                background: active ? "rgba(200,112,42,0.1)" : "transparent",
                textDecoration: "none",
                transition: "background 0.15s, color 0.15s",
              }}
              className={cn("sidebar-link", active && "active")}
            >
              <Icon
                style={{
                  width: "15px",
                  height: "15px",
                  flexShrink: 0,
                  color: active ? "#C8702A" : "#9A7050",
                }}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <style>{`
        .sidebar-link:hover:not(.active) {
          background: rgba(200,112,42,0.06) !important;
          color: #3A2010 !important;
        }
      `}</style>
    </aside>
  );
}
