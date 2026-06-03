import { Storage } from "@plasmohq/storage";
import { logger } from "@/utils/logger";

const storage = new Storage();

const KEYS = {
  accessToken:     "accessToken",
  refreshToken:    "refreshToken",
  tokenExpiry:     "tokenExpiry",  // epoch ms when access token expires
  apiBase:         "apiBaseUrl",
  captureEnabled:  "captureEnabled",
} as const;

// Refresh proactively if < 60 s remain on the access token
const EXPIRY_BUFFER_MS = 60_000;

type AuthResponse = {
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

export const authManager = {
  async getApiBase(): Promise<string> {
    return (await storage.get<string>(KEYS.apiBase)) ?? "http://localhost:8080";
  },

  async setApiBase(url: string): Promise<void> {
    await storage.set(KEYS.apiBase, url);
  },

  // Returns the raw access token only if it is still valid (not near expiry)
  async getAccessToken(): Promise<string | null> {
    const [token, expiry] = await Promise.all([
      storage.get<string>(KEYS.accessToken),
      storage.get<number>(KEYS.tokenExpiry),
    ]);
    if (!token || !expiry) return null;
    if (Date.now() >= expiry - EXPIRY_BUFFER_MS) return null;
    return token;
  },

  async setTokens(access: string, refresh: string, expiresInMs: number): Promise<void> {
    await Promise.all([
      storage.set(KEYS.accessToken, access),
      storage.set(KEYS.refreshToken, refresh),
      storage.set(KEYS.tokenExpiry, Date.now() + expiresInMs),
    ]);
  },

  async getCaptureEnabled(): Promise<boolean> {
    const val = await storage.get<boolean>(KEYS.captureEnabled);
    return val ?? true; // default ON
  },

  async setCaptureEnabled(enabled: boolean): Promise<void> {
    await storage.set(KEYS.captureEnabled, enabled);
  },

  async clearTokens(): Promise<void> {
    await Promise.all([
      storage.remove(KEYS.accessToken),
      storage.remove(KEYS.refreshToken),
      storage.remove(KEYS.tokenExpiry),
    ]);
  },

  async isAuthenticated(): Promise<boolean> {
    return (await this.getValidAccessToken()) !== null;
  },

  // Returns a valid access token, refreshing first if the current one is expired.
  async getValidAccessToken(): Promise<string | null> {
    const existing = await this.getAccessToken();
    if (existing) return existing;

    const refreshed = await this.tryRefresh();
    if (!refreshed) return null;
    return this.getAccessToken();
  },

  async login(
    email: string,
    password: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const apiBase = await this.getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { message?: string };
        return { ok: false, error: j.message ?? "Login failed." };
      }
      const body = (await res.json()) as AuthResponse;
      const { accessToken, refreshToken, expiresIn } = body.data;
      await this.setTokens(accessToken, refreshToken, expiresIn * 1000);
      return { ok: true };
    } catch {
      return { ok: false, error: "Cannot reach backend. Check the URL." };
    }
  },

  async tryRefresh(): Promise<boolean> {
    const [refreshToken, apiBase] = await Promise.all([
      storage.get<string>(KEYS.refreshToken),
      this.getApiBase(),
    ]);
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${apiBase}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        logger.warn("Token refresh rejected by server", { status: res.status });
        if (res.status === 401) await this.clearTokens();
        return false;
      }
      const body = (await res.json()) as AuthResponse;
      const { accessToken, refreshToken: newRefresh, expiresIn } = body.data;
      await this.setTokens(accessToken, newRefresh, expiresIn * 1000);
      logger.info("Access token refreshed");
      return true;
    } catch (err) {
      logger.error("Token refresh network error", err);
      return false;
    }
  },
};
