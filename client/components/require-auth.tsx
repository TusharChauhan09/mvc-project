"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getToken } from "@/lib/api";
import { Container, Spinner } from "./ui";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  // Synchronous client-only signal: if a token exists, optimistically render children.
  // We still redirect later if /auth/me confirms the token is invalid.
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(getToken()));
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // If we have either a confirmed user or any stored token, render the page.
  // Only show the spinner when there is truly no signal yet (cold first visit, no token).
  if (user || hasToken) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <Container className="py-32 flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted text-sm">
          <Spinner />
          <span>Loading…</span>
        </div>
      </Container>
    );
  }
  return null;
}
