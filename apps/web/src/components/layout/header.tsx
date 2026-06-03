"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth.store";

export function Header() {
  const router = useRouter();
  const { logout } = useAuth();
  const { email } = useAuthStore();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header style={{
      height: "60px",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      paddingLeft: "24px",
      paddingRight: "24px",
      background: "rgba(255,253,249,0.9)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(200,140,60,0.15)",
      flexShrink: 0,
      gap: "12px",
    }}>
      {email && (
        <span style={{
          fontSize: "13px",
          color: "#9A7050",
          fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
        }}>
          {email}
        </span>
      )}

      <button
        aria-label="Profile"
        style={{
          width: "32px", height: "32px",
          borderRadius: "50%",
          border: "1px solid rgba(200,140,60,0.25)",
          background: "rgba(200,112,42,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", transition: "background 0.15s",
          color: "#C8702A",
        }}
      >
        <User style={{ width: "14px", height: "14px" }} />
      </button>

      <button
        aria-label="Sign out"
        onClick={handleLogout}
        style={{
          width: "32px", height: "32px",
          borderRadius: "50%",
          border: "1px solid rgba(200,140,60,0.25)",
          background: "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", transition: "background 0.15s",
          color: "#9A7050",
        }}
      >
        <LogOut style={{ width: "14px", height: "14px" }} />
      </button>
    </header>
  );
}
