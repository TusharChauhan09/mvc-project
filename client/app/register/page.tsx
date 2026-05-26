"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container, Input, Button, Select, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useAuth } from "@/lib/auth-context";
import { oauthUrl } from "@/lib/api";

export default function RegisterPage() {
  const { register, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("reviewer");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) router.replace("/books");
  }, [authLoading, user, router]);

  if (authLoading || user) {
    return (
      <Container className="py-32 flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <Spinner />
          <span>Loading…</span>
        </div>
      </Container>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await register({
        name,
        email,
        password,
        password_confirmation: confirm,
        role,
      });
      router.push("/books");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-[100svh] -mt-[88px] overflow-hidden flex items-center justify-center px-4 pt-32 pb-20 sm:px-6">
      <div
        aria-hidden
        className="orb"
        style={{
          width: 520,
          height: 520,
          background:
            "radial-gradient(circle, hsl(200 90% 50% / 0.35), transparent 60%)",
          top: "-15%",
          right: "-10%",
        }}
      />
      <div
        aria-hidden
        className="orb"
        style={{
          width: 420,
          height: 420,
          background:
            "radial-gradient(circle, hsl(260 70% 50% / 0.3), transparent 60%)",
          bottom: "-15%",
          left: "-5%",
          animationDelay: "2s",
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-fade-rise">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
            Begin your craft
          </p>
          <h1
            className="break-words text-4xl leading-[0.95] sm:text-6xl"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Build a <em className="not-italic text-muted-foreground">quiet</em>{" "}
            library of{" "}
            <em className="not-italic text-muted-foreground">truth.</em>
          </h1>
        </div>

        <div className="liquid-glass-strong rounded-3xl p-5 sm:p-8">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <a
              href={oauthUrl("google")}
              className="liquid-glass rounded-full px-4 py-3 text-sm flex items-center justify-center gap-2 hover:scale-[1.03] transition-transform"
            >
              <Icon.Google className="w-4 h-4" />
              Google
            </a>
            <a
              href={oauthUrl("github")}
              className="liquid-glass rounded-full px-4 py-3 text-sm flex items-center justify-center gap-2 hover:scale-[1.03] transition-transform"
            >
              <Icon.Github className="w-4 h-4" />
              GitHub
            </a>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              or with email
            </span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <Input
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              name="name"
              required
              placeholder="Jane Carter"
              leading={<Icon.User className="w-4 h-4" />}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              name="email"
              required
              placeholder="you@institution.edu"
              leading={<Icon.Mail className="w-4 h-4" />}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                name="password"
                required
                hint="Min 8 chars"
              />
              <Input
                label="Confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                name="password_confirmation"
                required
              />
            </div>
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="reviewer">Reviewer · score &amp; submit</option>
              <option value="educator">Educator · curate &amp; add</option>
              <option value="student">Student · read assessments</option>
            </Select>

            {err && (
              <div className="rounded-xl bg-[hsl(var(--danger))]/10 border border-[hsl(var(--danger))]/30 px-4 py-3 text-sm text-[hsl(var(--danger))]">
                {err}
              </div>
            )}

            <Button type="submit" disabled={busy} className="w-full mt-2">
              {busy ? "Creating…" : "Begin Journey"}
            </Button>
          </form>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-8">
          Already a member?{" "}
          <Link href="/login" className="text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
