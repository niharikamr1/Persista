import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthState = {
  _hasHydrated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  setHasHydrated: (v: boolean) => void;
  setTokens: (accessToken: string, refreshToken: string, userId: string, email: string, displayName?: string) => void;
  setDisplayName: (displayName: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      accessToken: null,
      refreshToken: null,
      userId: null,
      email: null,
      displayName: null,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setTokens: (accessToken, refreshToken, userId, email, displayName) =>
        set({ accessToken, refreshToken, userId, email, displayName: displayName ?? null }),
      setDisplayName: (displayName) => set({ displayName }),
      clearAuth: () =>
        set({ accessToken: null, refreshToken: null, userId: null, email: null, displayName: null }),
      isAuthenticated: () => get().accessToken !== null,
    }),
    {
      name: "aicc-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        userId: state.userId,
        email: state.email,
        displayName: state.displayName,
      }),
    },
  ),
);
