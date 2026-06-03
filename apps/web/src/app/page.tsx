"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  function handleSignIn() {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => router.push("/login"), 820);
  }

  return (
    <>
      <style>{`
        @keyframes floatA {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(16px, -22px) scale(1.03); }
          66%       { transform: translate(-12px, 12px) scale(0.97); }
        }
        @keyframes floatB {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40%       { transform: translate(-22px, 18px) scale(1.04); }
          70%       { transform: translate(14px, -12px) scale(0.96); }
        }
        @keyframes floatC {
          0%, 100% { transform: translate(0, 0) scale(1); }
          30%       { transform: translate(12px, 24px) scale(0.97); }
          70%       { transform: translate(-16px, -14px) scale(1.03); }
        }
        @keyframes navDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes slideLeft {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(-50px); opacity: 0; }
        }
        @keyframes slideRight {
          from { transform: translateX(0);   opacity: 1; }
          to   { transform: translateX(50px); opacity: 0; }
        }
        @keyframes fadeDown {
          from { transform: translateY(0);   opacity: 1; }
          to   { transform: translateY(20px); opacity: 0; }
        }
        @keyframes fadeOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .blob-1 {
          animation: floatA 9s ease-in-out infinite;
        }
        .blob-2 {
          animation: floatB 11s ease-in-out infinite;
        }
        .blob-3 {
          animation: floatC 10s ease-in-out infinite;
        }
        .nav-bar {
          animation: navDown 0.7s cubic-bezier(0.22,1,0.36,1) 0.7s both;
        }
        .headline-1 {
          animation: ${exiting ? "slideLeft 0.55s cubic-bezier(0.4,0,1,1) forwards" : "none"};
        }
        .headline-2 {
          animation: ${exiting ? "slideRight 0.55s cubic-bezier(0.4,0,1,1) 0.05s forwards" : "none"};
        }
        .sub-fade {
          animation: ${exiting ? "fadeDown 0.45s ease-in 0.1s forwards" : "none"};
        }
        .btn-fade {
          animation: ${exiting ? "fadeDown 0.45s ease-in 0.15s forwards" : "none"};
        }
        .overlay {
          animation: ${exiting ? "fadeOverlay 0.55s ease-in 0.25s forwards" : "none"};
        }
        .logo-hover { transition: opacity 0.2s; }
        .logo-hover:hover { opacity: 0.75; }
        .sign-btn {
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .sign-btn:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.75);
          box-shadow: 0 8px 32px rgba(180,100,20,0.13);
        }
        .sign-btn:hover .btn-arrow {
          transform: translateX(4px);
        }
        .btn-arrow {
          transition: transform 0.2s ease;
          color: #C8702A;
        }
        .word-slide-left {
          display: inline-block;
          animation: none;
        }
        .word-slide-right {
          display: inline-block;
          animation: none;
        }
        @keyframes enterLeft {
          from { transform: translateX(-60px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        @keyframes enterRight {
          from { transform: translateX(60px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes enterUp {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .enter-left  { animation: enterLeft  0.75s cubic-bezier(0.22,1,0.36,1) 0.7s  both; }
        .enter-right { animation: enterRight 0.75s cubic-bezier(0.22,1,0.36,1) 0.85s both; }
        .enter-up-1  { animation: enterUp    0.7s  cubic-bezier(0.22,1,0.36,1) 1.05s both; }
        .enter-up-2  { animation: enterUp    0.7s  cubic-bezier(0.22,1,0.36,1) 1.25s both; }
      `}</style>

      {/* Page container */}
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse at 60% 0%, #FDEAC0 0%, #FDF4E7 30%, #FFF9F3 60%, #FFFDF9 100%)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Ambient blobs */}
        <div
          className="blob-1"
          style={{
            position: "absolute",
            top: "-80px",
            left: "-60px",
            width: "440px",
            height: "440px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(240,180,80,0.35) 0%, rgba(255,220,130,0.15) 60%, transparent 80%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />
        <div
          className="blob-2"
          style={{
            position: "absolute",
            top: "-40px",
            right: "-80px",
            width: "360px",
            height: "360px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(220,150,60,0.28) 0%, rgba(255,200,100,0.12) 60%, transparent 80%)",
            filter: "blur(70px)",
            pointerEvents: "none",
          }}
        />
        <div
          className="blob-3"
          style={{
            position: "absolute",
            bottom: "-60px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,190,90,0.22) 0%, rgba(255,210,120,0.1) 60%, transparent 80%)",
            filter: "blur(65px)",
            pointerEvents: "none",
          }}
        />

        {/* Navbar */}
        <nav
          className="nav-bar"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "60px",
            display: "flex",
            alignItems: "center",
            paddingLeft: "32px",
            paddingRight: "32px",
            background: "rgba(255,252,248,0.72)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderBottom: "1px solid rgba(200,140,60,0.2)",
            zIndex: 50,
          }}
        >
          <button
            className="logo-hover"
            onClick={handleSignIn}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-playfair), Georgia, serif",
                fontWeight: 700,
                fontStyle: "italic",
                fontSize: "24px",
                color: "#1A1208",
                lineHeight: 1,
              }}
            >
              Persista
            </span>
          </button>
        </nav>

        {/* Hero content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "0 24px",
            maxWidth: "760px",
            width: "100%",
          }}
        >
          {/* Headline */}
          <h1
            style={{
              fontSize: "clamp(36px, 5.5vw, 70px)",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              fontWeight: 300,
              color: "#1A1208",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: 0,
              marginBottom: "20px",
            }}
          >
            <span
              className={`enter-left headline-1`}
              style={{ display: "block" }}
            >
              Continue Where Your
            </span>
            <span
              className={`enter-right headline-2`}
              style={{ display: "block", fontWeight: 700 }}
            >
              Conversations Left Off.
            </span>
          </h1>

          {/* Subtext */}
          <p
            className={`enter-up-1 sub-fade`}
            style={{
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              fontWeight: 300,
              fontSize: "clamp(15px, 1.8vw, 18px)",
              color: "#6A4E2E",
              maxWidth: "480px",
              lineHeight: 1.65,
              margin: 0,
              marginBottom: "40px",
            }}
          >
            Persista preserves AI context across{" "}
            <strong style={{ fontWeight: 500, color: "#3A2010" }}>
              sessions, workflows, and platforms
            </strong>{" "}
            — so intelligence never resets.
          </p>

          {/* Sign In button */}
          <button
            className={`sign-btn enter-up-2 btn-fade`}
            onClick={handleSignIn}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "14px 28px",
              borderRadius: "100px",
              border: "1px solid rgba(200,140,60,0.25)",
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              cursor: "pointer",
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontWeight: 700,
              fontStyle: "italic",
              fontSize: "16px",
              color: "#1A1208",
              boxShadow: "0 2px 16px rgba(180,100,20,0.08)",
              outline: "none",
            }}
          >
            Sign in to Persista
            <span className="btn-arrow" style={{ fontSize: "18px", lineHeight: 1 }}>→</span>
          </button>
        </div>

        {/* Exit overlay */}
        {exiting && (
          <div
            className="overlay"
            style={{
              position: "fixed",
              inset: 0,
              background: "#fff",
              opacity: 0,
              zIndex: 100,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </>
  );
}
