"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .err-card  { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .err-btn   { transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease; }
        .err-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(180,100,20,0.14);
        }
        .err-btn-ghost:hover { background: rgba(200,112,42,0.08) !important; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse at 60% 0%, #FDEAC0 0%, #FDF4E7 30%, #FFF9F3 60%, #FFFDF9 100%)",
          padding: "24px",
        }}
      >
        <div
          className="err-card"
          style={{
            maxWidth: "440px",
            width: "100%",
            background: "rgba(255,253,249,0.92)",
            border: "1px solid rgba(200,140,60,0.2)",
            borderRadius: "20px",
            padding: "48px 40px",
            boxShadow: "0 4px 40px rgba(180,100,20,0.09)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            textAlign: "center",
          }}
        >
          {/* Brand */}
          <span
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontWeight: 700,
              fontStyle: "italic",
              fontSize: "22px",
              color: "#1A1208",
              display: "block",
              marginBottom: "32px",
            }}
          >
            Persista
          </span>

          {/* Icon */}
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(200,112,42,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: "26px",
            }}
          >
            ⚠
          </div>

          <h1
            style={{
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              fontWeight: 600,
              fontSize: "20px",
              color: "#1A1208",
              margin: "0 0 10px",
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              color: "#6A4E2E",
              lineHeight: 1.6,
              margin: "0 0 32px",
            }}
          >
            An unexpected error occurred. Your sessions and memories are safe —
            refreshing the page should get you back on track.
          </p>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              className="err-btn"
              onClick={reset}
              style={{
                width: "100%",
                padding: "12px 20px",
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
              className="err-btn err-btn-ghost"
              onClick={() => router.push("/")}
              style={{
                width: "100%",
                padding: "12px 20px",
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
              Return to home
            </button>
          </div>

          {/* Digest for support */}
          {error.digest && (
            <p
              style={{
                fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                fontSize: "11px",
                color: "#9A7050",
                marginTop: "24px",
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
