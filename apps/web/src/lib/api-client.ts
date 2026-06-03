import { useAuthStore } from "@/stores/auth.store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type PageMeta = {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type ApiWrapper<T> = {
  success: boolean;
  data: T;
  page?: PageMeta;
};

type TokenPair = { accessToken: string; refreshToken: string };

// ── Token refresh with concurrent-request guard ───────────────────────────────
// A single refreshPromise is shared across all in-flight requests.
// If 5 requests all get 401 simultaneously, only ONE refresh call is made;
// all 5 wait on the same promise and then retry with the new token.
let refreshPromise: Promise<string | null> | null = null;

async function refreshTokenOnce(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async (): Promise<string | null> => {
      const { refreshToken, setTokens, clearAuth, userId, email, displayName } =
        useAuthStore.getState();

      if (!refreshToken) {
        clearAuth();
        if (typeof window !== "undefined") window.location.href = "/login";
        return null;
      }

      try {
        // Call fetch directly — NOT through apiClient — to avoid infinite retry loops
        const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);

        const json = (await res.json()) as ApiWrapper<TokenPair>;
        const { accessToken, refreshToken: newRefreshToken } = json.data;
        // Persist both tokens so the rotation chain stays intact
        setTokens(accessToken, newRefreshToken, userId!, email!, displayName ?? undefined);
        return accessToken;
      } catch {
        // Refresh failed — session is unrecoverable; send user to login
        clearAuth();
        if (typeof window !== "undefined") window.location.href = "/login";
        return null;
      }
    })().finally(() => {
      refreshPromise = null; // release lock after completion (success or failure)
    });
  }
  return refreshPromise;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonHeaders(token: string | null): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

function jsonInit(method: string, body: unknown, token: string | null): RequestInit {
  const init: RequestInit = { method, headers: jsonHeaders(token) };
  if (body !== undefined) init.body = JSON.stringify(body);
  return init;
}

// ── request — JSON body in, JSON body out, with 401 retry ─────────────────────

async function request<T>(
  path: string,
  method: string,
  body: unknown,
  token: string | null,
): Promise<T> {
  let res = await fetch(`${API_BASE}${path}`, jsonInit(method, body, token));

  if (res.status === 401) {
    const newToken = await refreshTokenOnce();
    if (newToken) {
      res = await fetch(`${API_BASE}${path}`, jsonInit(method, body, newToken));
    }
  }

  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(error.detail ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  const json = (await res.json()) as ApiWrapper<T>;
  return json.data;
}

// ── requestPaged — paginated GET with 401 retry ───────────────────────────────

async function requestPaged<T>(
  path: string,
  token: string | null,
): Promise<{ items: T[]; page: PageMeta }> {
  let res = await fetch(`${API_BASE}${path}`, { method: "GET", headers: jsonHeaders(token) });

  if (res.status === 401) {
    const newToken = await refreshTokenOnce();
    if (newToken) {
      res = await fetch(`${API_BASE}${path}`, { method: "GET", headers: jsonHeaders(newToken) });
    }
  }

  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(error.detail ?? `HTTP ${res.status}`);
  }

  const json = (await res.json()) as ApiWrapper<T[]>;
  return { items: json.data ?? [], page: json.page! };
}

// ── Public API client ─────────────────────────────────────────────────────────

export const apiClient = {
  get: <T>(path: string, token: string | null = null) =>
    request<T>(path, "GET", undefined, token),

  getPaged: <T>(path: string, token: string | null = null) =>
    requestPaged<T>(path, token),

  post: <T>(path: string, body: unknown, token: string | null = null) =>
    request<T>(path, "POST", body, token),

  put: <T>(path: string, body: unknown, token: string | null = null) =>
    request<T>(path, "PUT", body, token),

  patch: <T>(path: string, body: unknown, token: string | null = null) =>
    request<T>(path, "PATCH", body, token),

  delete: <T>(path: string, token: string | null = null) =>
    request<T>(path, "DELETE", undefined, token),

  // Raw binary upload — 2-step file upload flow (PUT with raw bytes, not JSON)
  uploadFile: async <T>(path: string, file: File, token: string | null = null): Promise<T> => {
    const binaryHeaders = (t: string | null): Record<string, string> => {
      const h: Record<string, string> = { "Content-Type": file.type || "application/octet-stream" };
      if (t) h["Authorization"] = `Bearer ${t}`;
      return h;
    };

    let res = await fetch(`${API_BASE}${path}`, { method: "PUT", headers: binaryHeaders(token), body: file });

    if (res.status === 401) {
      const newToken = await refreshTokenOnce();
      if (newToken) {
        res = await fetch(`${API_BASE}${path}`, { method: "PUT", headers: binaryHeaders(newToken), body: file });
      }
    }

    if (!res.ok) {
      const error = (await res.json().catch(() => ({}))) as { detail?: string };
      throw new Error(error.detail ?? `HTTP ${res.status}`);
    }

    const json = (await res.json()) as ApiWrapper<T>;
    return json.data;
  },
};
