"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, setToken, getToken, TOKEN_KEY } from "./api";
import { prewarmDataForUser, resetPrewarm } from "./prewarm";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

const USER_CACHE_KEY = "codex_user";

function readCachedUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_CACHE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  // Hydrate from cache after mount to avoid SSR/CSR markup mismatch; still skips spinner if cached.
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    writeCachedUser(u);
    if (u) {
      prewarmDataForUser(u.role);
    } else {
      resetPrewarm();
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api<{ data: User }>("/auth/me");
      setUser(me.data);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    // Optimistic hydrate from cache: skip the spinner if we already know who the user is.
    const cached = readCachedUser();
    const token = getToken();
    if (cached && token) {
      setUserState(cached);
      setLoading(false);
      // Already-cached user: prewarm immediately so every page lands warm.
      prewarmDataForUser(cached.role);
      // Refresh in background to catch role/avatar/etc. changes.
      void refresh();
    } else {
      void refresh();
    }
  }, [refresh]);

  // Sync auth state across tabs: token written/cleared in another tab fires a storage event here.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === null || e.key === TOKEN_KEY || e.key === USER_CACHE_KEY) {
        refresh();
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<{ user: User; token: string }>("/auth/login", {
        method: "POST",
        json: { email, password },
      });
      setToken(res.token);
      setUser(res.user);
    },
    [setUser],
  );

  const register = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      password_confirmation: string;
      role?: string;
    }) => {
      const res = await api<{ user: User; token: string }>("/auth/register", {
        method: "POST",
        json: input,
      });
      setToken(res.token);
      setUser(res.user);
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    // Optimistic: clear local state + redirect immediately so UI feels instant.
    // Token revoke fires in background — failure here is harmless (token expires server-side anyway).
    setToken(null);
    setUser(null);
    router.push("/");
    void api("/auth/logout", { method: "POST" }).catch(() => {});
  }, [router, setUser]);

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
