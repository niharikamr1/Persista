"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { useAuth } from "@/hooks/use-auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { _hasHydrated, accessToken, refreshToken } = useAuthStore();
  const { refresh } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait until Zustand has read from localStorage before checking tokens.
    // Without this, refreshToken reads as null on first render in Next.js App Router
    // and the guard incorrectly redirects to /login.
    if (!_hasHydrated) return;

    if (accessToken) {
      setReady(true);
    } else if (refreshToken) {
      refresh()
        .then(() => setReady(true))
        .catch(() => router.replace("/login"));
    } else {
      router.replace("/login");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}
