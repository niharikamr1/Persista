import { useEffect, useState } from "react";
import { Storage } from "@plasmohq/storage";
import { authManager } from "@/auth/auth-manager";

import "./options.css";

const storage = new Storage();

export default function OptionsPage(): React.ReactElement {
  const [apiUrl,          setApiUrl]          = useState("http://localhost:8080");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [urlSaved,        setUrlSaved]        = useState(false);

  useEffect(() => {
    void Promise.all([
      storage.get<string>("apiBaseUrl"),
      authManager.isAuthenticated(),
    ]).then(([url, auth]) => {
      if (url) setApiUrl(url);
      setIsAuthenticated(auth);
    });
  }, []);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    // Persist URL before login so auth-manager uses it
    await storage.set("apiBaseUrl", apiUrl.trim().replace(/\/+$/, ""));
    await authManager.setApiBase(apiUrl.trim().replace(/\/+$/, ""));
    const res = await authManager.login(email.trim(), password);
    setLoading(false);
    if (res.ok) {
      setIsAuthenticated(true);
      setEmail("");
      setPassword("");
    } else {
      setError(res.error ?? "Login failed.");
    }
  };

  const handleLogout = async () => {
    await authManager.clearTokens();
    setIsAuthenticated(false);
  };

  const handleSaveUrl = async () => {
    await storage.set("apiBaseUrl", apiUrl.trim().replace(/\/+$/, ""));
    await authManager.setApiBase(apiUrl.trim().replace(/\/+$/, ""));
    setUrlSaved(true);
    setTimeout(() => setUrlSaved(false), 2000);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void handleLogin();
  };

  return (
    <div className="opt-root">
      <header className="opt-header">
        <span className="opt-wordmark">Persista</span>
        <span className="opt-tagline">AI Memory Extension</span>
      </header>

      <main className="opt-body">

        {/* ── Backend URL ── */}
        <section className="opt-section">
          <h2 className="opt-section-title">Backend</h2>
          <label className="opt-label" htmlFor="inp-url">API URL</label>
          <div className="opt-row">
            <input
              id="inp-url"
              className="opt-input"
              type="url"
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
              placeholder="http://localhost:8080"
              spellCheck={false}
            />
            <button className="opt-btn-secondary" onClick={handleSaveUrl}>
              {urlSaved ? "Saved ✓" : "Save"}
            </button>
          </div>
          <p className="opt-hint">URL of your running Persista backend.</p>
        </section>

        {/* ── Auth ── */}
        <section className="opt-section">
          <h2 className="opt-section-title">Account</h2>

          {isAuthenticated ? (
            <div className="opt-connected">
              <div className="opt-connected-inner">
                <span className="opt-dot-green" />
                <span className="opt-connected-text">Connected to Persista</span>
              </div>
              <button className="opt-btn-danger" onClick={handleLogout}>Sign out</button>
            </div>
          ) : (
            <div className="opt-form">
              <div>
                <label className="opt-label" htmlFor="inp-email">Email</label>
                <input
                  id="inp-email"
                  className="opt-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="opt-label" htmlFor="inp-pass">Password</label>
                <input
                  id="inp-pass"
                  className="opt-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="opt-error">{error}</p>}
              <button className="opt-btn-primary" onClick={handleLogin} disabled={loading}>
                {loading ? "Connecting…" : "Connect to Persista"}
              </button>
              <p className="opt-hint">Use the same account you created on the Persista dashboard.</p>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
