import React from "react";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "radial-gradient(ellipse at 70% 0%, #FDEAC0 0%, #FDF4E7 25%, #FFF9F3 55%, #FFFDF9 100%)",
      }}>
        <Sidebar />
        <div style={{ display: "flex", flex: 1, flexDirection: "column", overflow: "hidden" }}>
          <Header />
          <main style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 32px",
            scrollBehavior: "smooth",
          }}>
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
