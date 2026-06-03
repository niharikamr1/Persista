"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dash-err-card { animation: fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .dash-err-btn  { transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease; }
        .dash-err-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(180,100,20,0.12);
        }
        .dash-err-btn-ghost:hover { background: rgba(200,112,42,0.07) !important; }
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: "320px",
          padding: "40px 24px",
        }}
      >
        <div
          className="dash-err-card"
          style={{
            maxWidth: "400px",
            width: "100%",
            background: "rgba(255,253,249,0.95)",
            border: "1px solid rgba(200,140,60,0.2)",
            borderRadius: "18px",
            padding: "40px 36px",
            boxShadow: "0 2px 28px rgba(180,100,20,0.07)",
            textAlign: "center",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(200,112,42,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: "22px",
            }}
          >
            ⚠
          </div>

          <h2
            style={{
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              fontWeight: 600,
              fontSize: "18px",
              color: "#1A1208",
              margin: "0 0 8px",
            }}
          >
            This view couldn't load
          </h2>

          <p
            style={{
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              color: "#6A4E2E",
              lineHeight: 1.6,
              margin: "0 0 28px",
            }}
          >
            An unexpected error occurred in this section. The rest of Persista is
            unaffected — try again or return to the dashboard.
          </p>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              className="dash-err-btn"
              onClick={reset}
              style={{
                width: "100%",
                padding: "11px 20px",
                borderRadius: "100px",
                border: "1px solid rgba(200,140,60,0.28)",
                background: "rgba(200,112,42,0.12)",
                cursor: "pointer",
                fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                fontWeight: 600,
                fontSize: "14px",
                color: "#C8702A",
              }}
            >
              Try again
            </button>

            <button
              className="dash-err-btn dash-err-btn-ghost"
              onClick={() => router.push("/home")}
              style={{
                width: "100%",
                padding: "11px 20px",
                borderRadius: "100px",
                border: "1px solid rgba(200,140,60,0.15)",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                fontWeight: 400,
                fontSize: "14px",
                color: "#6A4E2E",
              }}
            >
              Go to Dashboard
            </button>
          </div>

          {/* Digest for support */}
          {error.digest && (
            <p
              style={{
                fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                fontSize: "11px",
                color: "#9A7050",
                marginTop: "20px",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
