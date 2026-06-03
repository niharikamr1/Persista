"use client";

import { useAuthStore } from "@/stores/auth.store";
import { apiClient } from "@/lib/api-client";
import type { AuthResponse, UserResponse } from "@/types/api";

function parseJwt(token: string): { sub: string; email: string } {
  try {
    const part = token.split(".")[1] ?? "";
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as { sub: string; email: string };
  } catch {
    return { sub: "", email: "" };
  }
}

export function useAuth() {
  const { accessToken, refreshToken, userId, email, displayName, setTokens, setDisplayName, clearAuth, isAuthenticated } =
    useAuthStore();

  async function login(emailInput: string, password: string) {
    const data = await apiClient.post<AuthResponse>("/api/v1/auth/login", {
      email: emailInput,
      password,
    });
    const claims = parseJwt(data.accessToken);
    setTokens(data.accessToken, data.refreshToken, claims.sub, claims.email);
    // Fetch displayName since JWT doesn't carry it
    const profile = await apiClient.get<UserResponse>("/api/v1/auth/me", data.accessToken).catch(() => null);
    if (profile?.displayName) setDisplayName(profile.displayName);
  }

  async function register(displayName: string, emailInput: string, password: string) {
    const data = await apiClient.post<AuthResponse>("/api/v1/auth/register", {
      displayName,
      email: emailInput,
      password,
    });
    const claims = parseJwt(data.accessToken);
    setTokens(data.accessToken, data.refreshToken, claims.sub, claims.email, displayName);
  }

  async function refresh() {
    if (!refreshToken) throw new Error("No refresh token");
    const data = await apiClient.post<AuthResponse>("/api/v1/auth/refresh", { refreshToken });
    // Save both tokens — backend rotates the refresh token on each use
    setTokens(data.accessToken, data.refreshToken, userId!, email!, displayName ?? undefined);
  }

  async function logout() {
    if (accessToken) {
      await apiClient.post("/api/v1/auth/logout", {}, accessToken).catch(() => null);
    }
    clearAuth();
  }

  return { accessToken, refreshToken, userId, email, displayName, isAuthenticated, login, register, refresh, logout };
}
