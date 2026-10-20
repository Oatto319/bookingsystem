"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchCurrentUser, login as apiLogin, logout as apiLogout } from "@/lib/booking-api";
import type { SessionUser } from "@/types/booking";

type AuthStatus = "loading" | "anonymous" | "authenticated" | "unavailable";

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser()
      .then((current) => {
        if (cancelled) return;
        setUser(current);
        setStatus("authenticated");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus(error instanceof ApiError && error.status === 401 ? "anonymous" : "unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const current = await apiLogin(username, password);
    setUser(current);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await apiLogout().catch(() => undefined);
    setUser(null);
    setStatus("anonymous");
  }, []);

  /** เรียกเมื่อ API ตอบ 401 (session หมดอายุ) */
  const expire = useCallback(() => {
    setUser(null);
    setStatus("anonymous");
  }, []);

  return { status, user, login, logout, expire };
}
