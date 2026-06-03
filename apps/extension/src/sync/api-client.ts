import { authManager } from "@/auth/auth-manager";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; status: number; error: string };
export type ApiResult<T> = ApiOk<T> | ApiErr;

async function request<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const [apiBase, token] = await Promise.all([
    authManager.getApiBase(),
    authManager.getValidAccessToken(),
  ]);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const init: RequestInit = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await fetch(`${apiBase}${path}`, init);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: text || `HTTP ${res.status}` };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, status: 0, error: String(err) };
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
