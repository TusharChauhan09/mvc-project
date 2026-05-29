"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Container,
  Card,
  Textarea,
  Button,
  Badge,
  Skeleton,
  EmptyState,
  PageHeader,
  cx,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { BookCover } from "@/components/book-cover";
import { RequireAuth } from "@/components/require-auth";
import { Assessments, Books, Criteria } from "@/lib/endpoints";
import { useCached, invalidateCache } from "@/lib/use-cached";
import { readCachedBook } from "@/lib/book-cache";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/toaster";
import type { Book, Criterion } from "@/lib/types";

export default function NewAssessmentPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

interface ScoreInput {
  value: number;
  note: string;
}

function Inner() {
  const search = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const bookId = Number(search.get("book"));

  const bookQ = useCached<{ data: Book }>(
    bookId ? `book:${bookId}` : null,
    () => Books.show(bookId),
  );
  const criteriaQ = useCached<{ data: Criterion[] }>(
    "criteria:list",
    () => Criteria.list(),
  );

  const initialBook = bookId ? readCachedBook(bookId) : null;
  const book = bookQ.data?.data ?? initialBook;
  const criteria = useMemo(
    () => (criteriaQ.data?.data ?? []).filter((c) => c.is_active !== false),
    [criteriaQ.data],
  );

  const loading =
    (bookQ.loading && !book) || (criteriaQ.loading && criteria.length === 0);

  const [scores, setScores] = useState<Record<number, ScoreInput>>({});
  const [summary, setSummary] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [busy, setBusy] = useState<"draft" | "submit" | null>(null);

  useEffect(() => {
    setScores((prev) => {
      const next: Record<number, ScoreInput> = {};
      for (const c of criteria) {
        next[c.id] = prev[c.id] ?? {
          value: Math.round((c.scale_min + c.scale_max) / 2),
          note: "",
        };
      }
      return next;
    });
  }, [criteria]);

  const overall = useMemo(() => {
    if (criteria.length === 0) return 0;
    let weight = 0;
    let weighted = 0;
    for (const c of criteria) {
      const s = scores[c.id];
      if (!s) continue;
      const w = Number(c.weight);
      weight += w;
      weighted += w * s.value;
    }
    return weight > 0 ? weighted / weight : 0;
  }, [criteria, scores]);

  const completedCount = useMemo(
    () => criteria.filter((c) => scores[c.id]).length,
    [criteria, scores],
  );

  function setScore(id: number, patch: Partial<ScoreInput>) {
    setScores((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  }

  async function save(submit: boolean) {
    setBusy(submit ? "submit" : "draft");
    try {
      const created = await Assessments.create({
        book_id: bookId,
        summary: summary || undefined,
        recommendation: recommendation || undefined,
        scores: Object.entries(scores).map(([id, v]) => ({
          criterion_id: Number(id),
          value: v.value,
          note: v.note || undefined,
        })),
      });
      if (submit) {
        await Assessments.submit(created.data.id);
      }
      toast({
        title: submit ? "Assessment submitted" : "Draft saved",
        tone: "success",
      });
      invalidateCache("assessments:list");
      invalidateCache("dashboard:assessments");
      router.push(`/assessments/${created.data.id}`);
    } catch (error) {
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "",
        tone: "error",
      });
      setBusy(null);
    }
  }

  // Role gate — server enforces this too, but a friendlier UX here avoids 403 surprise.
  if (user && !["admin", "educator", "reviewer"].includes(user.role)) {
    return (
      <Container className="py-20">
        <Card>
          <EmptyState
            icon={<Icon.Lock />}
            title="Access restricted"
            description={`Your role (${user.role}) cannot submit assessments. Ask an admin to upgrade you to reviewer or higher.`}
            action={
              <Link href="/books">
                <Button>Back to library</Button>
              </Link>
            }
          />
        </Card>
      </Container>
    );
  }

  if (!bookId) {
    return (
      <Container className="py-20">
        <Card>
          <EmptyState
            icon={<Icon.Book />}
            title="No book selected"
            description="Pick a book from the library or discover one to begin."
            action={
              <Button onClick={() => router.push("/books")}>
                <Icon.Search />
                Find a book
              </Button>
            }
          />
        </Card>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="py-12 sm:py-16 space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </Container>
    );
  }

  return (
    <Container className="py-12 sm:py-16 relative">
      <div
        aria-hidden
        className="orb"
        style={{
          width: 520,
          height: 520,
          background:
            "radial-gradient(circle, hsl(220 80% 40% / 0.22), transparent 60%)",
          top: "-15%",
          right: "-10%",
        }}
      />
      <div
        aria-hidden
        className="orb"
        style={{
          width: 380,
          height: 380,
          background:
            "radial-gradient(circle, hsl(260 70% 50% / 0.20), transparent 60%)",
          bottom: "-10%",
          left: "-5%",
          animationDelay: "3s",
        }}
      />

      <Link
        href={`/books/${bookId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 animate-fade-rise"
      >
        ← {book?.title ?? "Back"}
      </Link>

      <PageHeader
        eyebrow="New assessment"
        title={book?.title ?? "Untitled volume"}
        description={
          book?.authors?.length
            ? `by ${book.authors.join(", ")}`
            : "Score each axis, then save a draft or submit to the registry."
        }
      />

      {criteria.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Icon.ListCheck />}
            title="No active criteria"
            description="An admin must define a rubric before assessments can be made."
            action={
              <Link href="/criteria">
                <Button variant="outline">Open rubric</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] animate-fade-rise-delay">
          <div className="space-y-6">
            <Card className="p-5 sm:p-6">
              <div className="flex items-start gap-5">
                {book && (
                  <div className="hidden sm:flex w-20 h-28 rounded-md bg-white/5 ring-1 ring-white/10 overflow-hidden items-center justify-center flex-shrink-0">
                    <BookCover
                      src={book.thumbnail}
                      alt={book.title}
                      title={book.title}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge tone="warning">Draft</Badge>
                    {book?.type && <Badge tone="outline">{book.type}</Badge>}
                    <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {completedCount}/{criteria.length} axes scored
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Move through each axis below and assign a score. Add a short
                    note when the evidence isn&apos;t obvious from the text.
                  </p>
                </div>
              </div>
            </Card>

            <section>
              <div className="flex items-end justify-between mb-4">
                <h2
                  className="text-3xl tracking-[-0.5px]"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Axes
                </h2>
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  weighted average
                </p>
              </div>

              <div className="space-y-4">
                {criteria.map((c, idx) => {
                  const s = scores[c.id];
                  return (
                    <Card key={c.id} className="p-5 sm:p-6">
                      <div className="grid lg:grid-cols-[1fr_1.6fr] gap-6">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              #{String(idx + 1).padStart(2, "0")}
                            </span>
                            <Badge tone="outline">
                              w {Number(c.weight).toFixed(2)}
                            </Badge>
                          </div>
                          <h3
                            className="text-2xl tracking-tight text-foreground"
                            style={{ fontFamily: "'Instrument Serif', serif" }}
                          >
                            {c.name}
                          </h3>
                          {c.description && (
                            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                              {c.description}
                            </p>
                          )}
                        </div>

                        <div className="space-y-4">
                          <ScoreSelector
                            min={c.scale_min}
                            max={c.scale_max}
                            value={s?.value ?? c.scale_min}
                            onChange={(v) => setScore(c.id, { value: v })}
                          />
                          <Textarea
                            label="Note (optional)"
                            placeholder="Evidence that justifies this score…"
                            rows={2}
                            value={s?.note ?? ""}
                            onChange={(e) =>
                              setScore(c.id, { note: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>

            <section>
              <h2
                className="text-3xl tracking-[-0.5px] mb-4"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Editor&apos;s notes
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="p-5 sm:p-6">
                  <Textarea
                    label="Summary"
                    rows={6}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="A few sentences on the volume as a whole."
                  />
                </Card>
                <Card className="p-5 sm:p-6">
                  <Textarea
                    label="Recommendation"
                    rows={6}
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    placeholder="For whom, in what context, with what caveats?"
                  />
                </Card>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 h-fit space-y-4">
            <Card className="p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Provisional verdict
              </p>
              <p
                className="text-6xl tabular-nums mt-3 tracking-[-2px] text-foreground"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                {overall.toFixed(2)}
                <span className="text-2xl text-muted-foreground ml-2">/5</span>
              </p>
              <div className="mt-4 h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[hsl(var(--success))] to-white/80 transition-all"
                  style={{ width: `${Math.min(100, (overall / 5) * 100)}%` }}
                />
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {completedCount}/{criteria.length} axes scored
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <Button
                onClick={() => save(true)}
                disabled={busy !== null || criteria.length === 0}
                className="w-full"
                size="lg"
              >
                {busy === "submit" ? "Submitting…" : "Submit to registry"}
                <Icon.Check />
              </Button>
              <Button
                variant="outline"
                onClick={() => save(false)}
                disabled={busy !== null}
                className="w-full"
              >
                {busy === "draft" ? "Saving…" : "Save as draft"}
              </Button>
              <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
                Submitted assessments are time-stamped, locked, and visible to
                everyone in the registry.
              </p>
            </Card>
          </aside>
        </div>
      )}
    </Container>
  );
}

function ScoreSelector({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {ticks.map((t) => {
          const active = t === value;
          const dimmed = t < value;
          return (
            <button
              type="button"
              key={t}
              onClick={() => onChange(t)}
              className={cx(
                "h-12 min-w-[3rem] flex-1 rounded-xl border text-base font-medium tabular-nums transition-all focus-ring",
                active
                  ? "bg-white text-[hsl(var(--primary-foreground))] border-white shadow-[0_8px_24px_-8px_rgba(255,255,255,0.4)] scale-[1.02]"
                  : dimmed
                    ? "bg-white/10 text-foreground border-white/20 hover:bg-white/15"
                    : "bg-white/[0.03] text-muted-foreground border-white/10 hover:bg-white/[0.06] hover:text-foreground",
              )}
              aria-label={`score ${t}`}
              aria-pressed={active}
            >
              {t}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Selected:{" "}
        <span className="text-foreground font-medium tabular-nums">
          {value}
        </span>{" "}
        of {max}
      </p>
    </div>
  );
}
