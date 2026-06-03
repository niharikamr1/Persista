"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPass, setShowPass] = useState(false);

  function handleEmailChange(val: string) {
    setEmail(val);
    setShowPassword(val.length > 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  const d = isDark;

  return (
    <>
      <style>{`
        @keyframes spinRing {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes floatA {
          0%, 100% { transform: translate(0,0) scale(1); }
          33%       { transform: translate(16px,-22px) scale(1.03); }
          66%       { transform: translate(-12px,12px) scale(0.97); }
        }
        @keyframes floatB {
          0%, 100% { transform: translate(0,0) scale(1); }
          40%       { transform: translate(-22px,18px) scale(1.04); }
          70%       { transform: translate(14px,-12px) scale(0.96); }
        }
        @keyframes floatC {
          0%, 100% { transform: translate(0,0) scale(1); }
          30%       { transform: translate(12px,24px) scale(0.97); }
          70%       { transform: translate(-16px,-14px) scale(1.03); }
        }
        @keyframes navDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes cardUp {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        .lp-spin  { animation: spinRing 4s linear infinite; }
        .lp-nav   { animation: navDown 0.7s cubic-bezier(0.22,1,0.36,1) both; }
        .lp-card  { animation: cardUp  0.7s cubic-bezier(0.22,1,0.36,1) 0.15s both; }
        .lp-reveal{ animation: cardUp  0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .lp-logo  { transition: opacity 0.2s; background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; gap: 9px; }
        .lp-logo:hover { opacity: 0.75; }
        .lp-blob-a { position: absolute; top: -80px; left: -60px; width: 440px; height: 440px; border-radius: 50%; background: radial-gradient(circle, rgba(240,180,80,0.35) 0%, rgba(255,220,130,0.15) 60%, transparent 80%); filter: blur(60px); pointer-events: none; animation: floatA 9s ease-in-out infinite; }
        .lp-blob-b { position: absolute; top: -40px; right: -80px; width: 360px; height: 360px; border-radius: 50%; background: radial-gradient(circle, rgba(220,150,60,0.28) 0%, rgba(255,200,100,0.12) 60%, transparent 80%); filter: blur(70px); pointer-events: none; animation: floatB 11s ease-in-out infinite; }
        .lp-blob-c { position: absolute; bottom: -60px; left: 50%; transform: translateX(-50%); width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, rgba(255,190,90,0.22) 0%, rgba(255,210,120,0.1) 60%, transparent 80%); filter: blur(65px); pointer-events: none; animation: floatC 10s ease-in-out infinite; }
        .lp-input {
          width: 100%; box-sizing: border-box;
          padding: 12px 16px; border-radius: 10px;
          border: 1px solid ${d ? "rgba(200,140,60,0.28)" : "rgba(200,140,60,0.35)"};
          background: ${d ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.9)"};
          color: ${d ? "#F0DFC0" : "#1A1208"};
          font-family: var(--font-dm-sans), system-ui, sans-serif;
          font-size: 15px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .lp-input::placeholder { color: ${d ? "rgba(240,220,190,0.35)" : "rgba(100,70,40,0.45)"}; }
        .lp-input:focus { border-color: #C8702A; box-shadow: 0 0 0 3px rgba(200,112,42,0.15); }
        .lp-sign {
          width: 100%; padding: 13px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #C8702A 0%, #D4842A 100%);
          color: white; font-family: var(--font-dm-sans), system-ui, sans-serif;
          font-size: 15px; font-weight: 600; cursor: pointer;
          box-shadow: 0 4px 16px rgba(200,112,42,0.35);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .lp-sign:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(200,112,42,0.45); }
        .lp-sign:disabled { opacity: 0.7; cursor: not-allowed; }
        .lp-oauth {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 11px 16px; border-radius: 10px;
          border: 1px solid ${d ? "rgba(200,140,60,0.2)" : "rgba(200,140,60,0.22)"};
          background: ${d ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)"};
          color: ${d ? "#F0DFC0" : "#1A1208"};
          font-family: var(--font-dm-sans), system-ui, sans-serif;
          font-size: 14px; font-weight: 500; cursor: pointer;
          transition: background 0.2s, transform 0.15s;
          backdrop-filter: blur(8px);
        }
        .lp-oauth:hover { background: ${d ? "rgba(255,255,255,0.11)" : "rgba(255,255,255,0.95)"}; transform: translateY(-1px); }
        .lp-forgot { color: #C8702A; font-size: 12px; text-decoration: none; opacity: 0.85; transition: opacity 0.2s; font-family: var(--font-dm-sans), system-ui, sans-serif; }
        .lp-forgot:hover { opacity: 1; }
      `}</style>

      {/* Page */}
      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 60% 0%, #FDEAC0 0%, #FDF4E7 30%, #FFF9F3 60%, #FFFDF9 100%)",
        position: "relative", overflowX: "clip",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
        paddingTop: "80px", paddingBottom: "48px",
      }}>
        <div className="lp-blob-a" />
        <div className="lp-blob-b" />
        <div className="lp-blob-c" />

        {/* Nav */}
        <nav className="lp-nav" style={{
          position: "fixed", top: 0, left: 0, right: 0, height: "60px",
          display: "flex", alignItems: "center", paddingLeft: "32px", paddingRight: "32px",
          background: d ? "rgba(30,20,10,0.8)" : "rgba(255,252,248,0.72)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(200,140,60,0.2)", zIndex: 50,
        }}>
          <button className="lp-logo" onClick={() => router.push("/")}>
            <span style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 700, fontStyle: "italic", fontSize: "24px", color: d ? "#F0DFC0" : "#1A1208", lineHeight: 1 }}>
              Persista
            </span>
          </button>
        </nav>

        {/* Card */}
        <div className="lp-card" style={{
          width: "100%", maxWidth: "400px", margin: "0 24px",
          padding: "36px 32px",
          background: d ? "#2A1F14" : "rgba(255,255,255,0.85)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderRadius: "20px",
          border: "1px solid rgba(200,140,60,0.2)",
          boxShadow: d ? "0 20px 60px rgba(0,0,0,0.45)" : "0 8px 40px rgba(180,100,20,0.1)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "24px",
        }}>

          {/* Spinning ring logomark */}
          <div style={{ position: "relative", width: "60px", height: "60px", filter: "drop-shadow(0 4px 16px rgba(200,112,42,0.3))" }}>
            <div className="lp-spin" style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "conic-gradient(from 0deg, #C8702A, #E8951A, #F5C87A, #FDEAC0, #C8702A)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: "calc(100% - 6px)", height: "calc(100% - 6px)", borderRadius: "50%", background: d ? "#2A1F14" : "white" }} />
            </div>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="8" stroke="#C8702A" strokeWidth="1.4" fill="none" opacity="0.35" />
                <circle cx="14" cy="14" r="4.5" stroke="#C8702A" strokeWidth="1.8" fill="none" />
                <circle cx="14" cy="14" r="2" fill="#C8702A" />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontWeight: 700, fontSize: "24px",
            color: d ? "#F0DFC0" : "#1A1208",
            textAlign: "center", lineHeight: 1.35, margin: 0,
          }}>
            Your AI memory<br />is waiting for you.
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              className="lp-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              required
              autoComplete="email"
            />

            {showPassword && (
              <div className="lp-reveal" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ position: "relative" }}>
                  <input
                    className="lp-input"
                    type={showPass ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    style={{
                      position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", padding: "4px",
                      color: d ? "rgba(240,220,190,0.5)" : "rgba(100,70,40,0.45)",
                      display: "flex", alignItems: "center",
                    }}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <a href="#" className="lp-forgot">Forgot password?</a>
                </div>
              </div>
            )}

            {error && (
              <p style={{ color: "#D04040", fontSize: "13px", margin: 0, textAlign: "center", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                {error}
              </p>
            )}

            <button type="submit" className="lp-sign" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {/* OR divider */}
          <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1, height: "1px", background: d ? "rgba(200,140,60,0.2)" : "rgba(200,140,60,0.3)" }} />
            <span style={{ fontSize: "12px", letterSpacing: "0.06em", color: d ? "rgba(200,140,60,0.55)" : "rgba(160,100,40,0.7)", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
              OR
            </span>
            <div style={{ flex: 1, height: "1px", background: d ? "rgba(200,140,60,0.2)" : "rgba(200,140,60,0.3)" }} />
          </div>

          {/* OAuth buttons */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
            <button className="lp-oauth" type="button">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button className="lp-oauth" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill={d ? "#F0DFC0" : "#1A1208"}>
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>
          </div>

          {/* Sync caption */}
          <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "12px", color: d ? "rgba(240,220,190,0.55)" : "#6A4E2E", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
            Your conversations and memories stay synchronized across platforms.
          </p>

          {/* Footer */}
          <p style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "14px", color: d ? "rgba(240,220,190,0.65)" : "#6A4E2E", margin: 0 }}>
            New to Persista?{" "}
            <Link href="/register" style={{ color: "#C8702A", fontWeight: 600, textDecoration: "none" }}>
              Sign Up
            </Link>
          </p>
        </div>

        {/* Theme toggle */}
        <div style={{ marginTop: "28px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <div style={{
            display: "flex", alignItems: "center", padding: "4px",
            borderRadius: "100px",
            border: `1px solid ${d ? "rgba(200,140,60,0.25)" : "rgba(200,140,60,0.22)"}`,
            background: d ? "rgba(255,255,255,0.08)" : "rgba(200,140,60,0.1)",
            gap: "2px",
          }}>
            {/* Sun */}
            <button
              type="button"
              onClick={() => setIsDark(false)}
              style={{
                width: "32px", height: "28px", borderRadius: "100px", border: "none",
                background: !d ? "rgba(200,112,42,0.15)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "background 0.2s",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={d ? "rgba(240,220,190,0.6)" : "#C8702A"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </button>
            {/* Moon */}
            <button
              type="button"
              onClick={() => setIsDark(true)}
              style={{
                width: "32px", height: "28px", borderRadius: "100px", border: "none",
                background: d ? "rgba(200,140,60,0.28)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "background 0.2s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={d ? "#E8951A" : "rgba(160,100,40,0.6)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>
          </div>
          <span style={{ fontSize: "11px", color: d ? "rgba(240,220,190,0.4)" : "rgba(100,70,40,0.45)", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
            Light and dark modes supported.
          </span>
        </div>
      </div>
    </>
  );
}
