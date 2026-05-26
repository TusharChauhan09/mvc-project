"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { setToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Spinner } from "@/components/ui";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params?.get("token");
    const err = params?.get("error");
    if (err) {
      setError(humanError(err));
      return;
    }
    if (token) {
      setToken(token);
      refresh().then(() => router.replace("/books"));
    } else {
      setError("No token returned from provider.");
    }
  }, [params, router, refresh]);

  return (
    <div className="relative min-h-[100svh] -mt-[88px] flex items-center justify-center px-6">
      <div className="text-center animate-fade-rise">
        {error ? (
          <>
            <h1
              className="text-4xl tracking-[-1px] mb-4"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Something{" "}
              <em className="not-italic text-muted-foreground">drifted</em>.
            </h1>
            <p className="text-muted-foreground text-sm mb-8 max-w-md">
              {error}
            </p>
            <Link
              href="/login"
              className="liquid-glass rounded-full px-8 py-3 text-sm hover:scale-[1.03] inline-flex transition-transform"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Spinner className="w-6 h-6" />
            <p className="text-sm">Finishing your journey…</p>
          </div>
        )}
      </div>
    </div>
  );
}

function humanError(code: string): string {
  switch (code) {
    case "invalid_state":
      return "The session expired before you finished signing in. Try again.";
    case "email_missing":
      return "Your provider didn't share an email. Make sure your account has a verified email.";
    case "oauth_failed":
      return "We couldn't reach the provider. Try again in a moment.";
    default:
      return code;
  }
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
