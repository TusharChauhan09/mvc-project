"use client";

import Link from "next/link";
import {
  Container,
  Card,
  Badge,
  ScoreBar,
  Button,
  EmptyState,
  PageHeader,
  Skeleton,
} from "@/components/ui";
import { BookCover } from "@/components/book-cover";
import { Icon } from "@/components/icons";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth-context";
import { Assessments, Books } from "@/lib/endpoints";
import { useCached } from "@/lib/use-cached";
import { cacheBooks } from "@/lib/book-cache";
import { useEffect } from "react";
import type { Assessment, Book } from "@/lib/types";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { user } = useAuth();
  const assessmentsQ = useCached<{ data: Assessment[] }>(
    "dashboard:assessments",
    () => Assessments.list(),
  );
  const booksQ = useCached<{ data: Book[] }>(
    "dashboard:books",
    () => Books.list(),
  );
  const assessments = assessmentsQ.data?.data ?? [];
  const books = booksQ.data?.data ?? [];
  const loading = assessmentsQ.loading || booksQ.loading;

  useEffect(() => {
    if (booksQ.data?.data) cacheBooks(booksQ.data.data);
  }, [booksQ.data]);

  const drafts = assessments.filter((a) => a.status === "draft");
  const submitted = assessments.filter((a) => a.status === "submitted");
  const avgScore =
    submitted.length > 0
      ? submitted.reduce((s, a) => s + Number(a.overall_score ?? 0), 0) /
        submitted.length
      : 0;

  return (
    <Container className="py-12 sm:py-16 relative">
      <AmbientGlow />

      <PageHeader
        eyebrow={`Signed in as ${user?.role}`}
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}.`}
        description="Pick up where the silence left off, or open the next page."
        actions={
          <Link href="/books">
            <Button>
              <Icon.Plus />
              New assessment
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 mb-12 animate-fade-rise-delay sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Drafts" value={drafts.length} icon={<Icon.BookOpen />} />
        <Stat
          label="Submitted"
          value={submitted.length}
          icon={<Icon.Check />}
        />
        <Stat label="Library" value={books.length} icon={<Icon.Book />} />
        <Stat
          label="Avg. score"
          value={submitted.length > 0 ? avgScore.toFixed(2) : "—"}
          icon={<Icon.ChartBar />}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 animate-fade-rise-delay-2">
        <section className="lg:col-span-2">
          <SectionHeader
            title="Drafts"
            link={{ href: "/books", label: "Start new →" }}
          />
          <Card className="p-0 overflow-hidden">
            {loading && (
              <div className="p-6 space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            )}
            {!loading && drafts.length === 0 && (
              <EmptyState
                icon={<Icon.BookOpen />}
                title="No drafts in progress"
                description="Find a book on Discover and begin your first assessment."
                action={
                  <Link href="/books">
                    <Button>
                      <Icon.Search />
                      Find a book
                    </Button>
                  </Link>
                }
              />
            )}
            {!loading &&
              drafts.map((a, i) => (
                <Link
                  key={a.id}
                  href={`/assessments/${a.id}`}
                  className={`group flex items-center justify-between gap-4 p-5 hover:bg-white/[0.04] transition-colors ${
                    i !== 0 ? "border-t border-white/5" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge tone="warning">Draft</Badge>
                      <span className="text-[11px] text-muted-foreground">
                        Updated {new Date(a.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p
                      className="text-lg tracking-tight text-foreground truncate"
                      style={{ fontFamily: "'Instrument Serif', serif" }}
                    >
                      {a.book?.title ?? "Untitled"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {a.book?.authors?.join(", ") ?? "—"}
                    </p>
                  </div>
                  <div className="w-32 hidden sm:block">
                    <ScoreBar
                      value={Number(a.overall_score ?? 0)}
                      max={5}
                      showValue={false}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1 text-right tabular-nums">
                      {Number(a.overall_score ?? 0).toFixed(2)}/5
                    </p>
                  </div>
                  <Icon.ArrowRight className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              ))}
          </Card>
        </section>

        <section>
          <SectionHeader
            title="Recent books"
            link={{ href: "/books", label: "View all →" }}
          />
          <Card className="p-0 overflow-hidden">
            {loading && (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            )}
            {!loading && books.length === 0 && (
              <EmptyState
                icon={<Icon.Book />}
                title="No books yet"
                description="Import from Google Books or add manually."
              />
            )}
            {!loading &&
              books.slice(0, 5).map((b, i) => (
                <Link
                  key={b.id}
                  href={`/books/${b.id}`}
                  className={`flex items-center gap-3 p-4 hover:bg-white/[0.04] transition-colors ${
                    i !== 0 ? "border-t border-white/5" : ""
                  }`}
                >
                  <div className="w-10 h-14 rounded bg-white/5 ring-1 ring-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    <BookCover
                      src={b.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">
                      {b.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.authors?.[0] ?? "—"}
                    </p>
                  </div>
                </Link>
              ))}
          </Card>
        </section>
      </div>

      {submitted.length > 0 && (
        <section className="mt-12 animate-fade-rise-delay-3">
          <SectionHeader title="Submitted assessments" />
          <Card className="p-0 overflow-hidden">
            {submitted.map((a, i) => (
              <Link
                key={a.id}
                href={`/assessments/${a.id}`}
                className={`flex flex-col gap-3 p-4 hover:bg-white/[0.04] transition-colors sm:flex-row sm:items-center ${
                  i !== 0 ? "border-t border-white/5" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="text-lg tracking-tight truncate"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {a.book?.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted{" "}
                    {a.submitted_at &&
                      new Date(a.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <Badge tone="success">Submitted</Badge>
                  <span className="w-16 text-right font-mono text-sm tabular-nums">
                    {Number(a.overall_score ?? 0).toFixed(2)}/5
                  </span>
                </div>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </Container>
  );
}

function SectionHeader({
  title,
  link,
}: {
  title: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <h2
        className="text-2xl tracking-[-0.5px]"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {title}
      </h2>
      {link && (
        <Link
          href={link.href}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-5 group hover:bg-white/[0.05] transition-colors">
      <div className="flex items-center justify-between">
        <p className="min-w-0 break-words text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </p>
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
          {icon}
        </span>
      </div>
      <p
        className="text-4xl mt-3 tabular-nums tracking-[-1px]"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {value}
      </p>
    </Card>
  );
}

function AmbientGlow() {
  return (
    <>
      <div
        aria-hidden
        className="orb"
        style={{
          width: 520,
          height: 520,
          background:
            "radial-gradient(circle, hsl(220 80% 40% / 0.25), transparent 60%)",
          top: "-20%",
          right: "-10%",
        }}
      />
    </>
  );
}
