"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  Container,
  Card,
  Badge,
  ScoreBar,
  Button,
  Avatar,
  Skeleton,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { RequireAuth } from "@/components/require-auth";
import { Assessments } from "@/lib/endpoints";
import { useCached, invalidateCache } from "@/lib/use-cached";
import { toast } from "@/components/toaster";
import type { Assessment } from "@/lib/types";

export default function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <Inner id={Number(id)} />
    </RequireAuth>
  );
}

function Inner({ id }: { id: number }) {
  const assessmentQ = useCached<{ data: Assessment }>(
    `assessment:${id}`,
    () => Assessments.show(id),
  );
  const a = assessmentQ.data?.data ?? null;
  const loading = assessmentQ.loading;
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!a) return;
    setBusy(true);
    try {
      const r = await Assessments.submit(a.id);
      assessmentQ.setData({ data: r.data });
      invalidateCache("assessments:list");
      invalidateCache("dashboard:assessments");
      toast({ title: "Submitted to registry", tone: "success" });
    } catch (error) {
      toast({
        title: "Submit failed",
        description: error instanceof Error ? error.message : "",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading && !a) {
    return (
      <Container className="py-12 sm:py-16 space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </Container>
    );
  }
  if (!a) {
    return (
      <Container className="py-20">
        <Card>
          <EmptyState
            icon={<Icon.Book />}
            title="Assessment not found"
            description="It may have been deleted, or you don't have access."
            action={
              <Link href="/dashboard">
                <Button>Back to dashboard</Button>
              </Link>
            }
          />
        </Card>
      </Container>
    );
  }

  const isDraft = a.status === "draft";
  const scores = a.scores ?? [];

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

      <Link
        href={a.book?.id ? `/books/${a.book.id}` : "/books"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 animate-fade-rise"
      >
        ← {a.book?.title ?? "Back to library"}
      </Link>

      <PageHeader
        eyebrow={isDraft ? "Draft" : "Submitted assessment"}
        title={a.book?.title ?? "Assessment"}
        description={
          a.user
            ? `Reviewed by ${a.user.name} · ${a.user.role}`
            : "Editorial assessment"
        }
        actions={
          isDraft ? (
            <Button onClick={submit} disabled={busy}>
              {busy ? "Submitting…" : "Submit to registry"}
              <Icon.Check />
            </Button>
          ) : (
            <Link href={a.book?.id ? `/books/${a.book.id}` : "/books"}>
              <Button variant="outline">
                <Icon.Book />
                Open book
              </Button>
            </Link>
          )
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] animate-fade-rise-delay">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge tone={isDraft ? "warning" : "success"}>
                {isDraft ? "Draft" : "Submitted"}
              </Badge>
              <span className="font-mono text-[11px] text-muted-foreground">
                #{String(a.id).padStart(4, "0")}
              </span>
              {a.submitted_at && (
                <span className="text-[11px] text-muted-foreground">
                  · {new Date(a.submitted_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Avatar name={a.user?.name ?? "?"} size="sm" />
              <span>
                Reviewed by{" "}
                <span className="text-foreground font-medium">
                  {a.user?.name ?? "Reviewer"}
                </span>
                {a.user?.role ? ` · ${a.user.role}` : ""}
              </span>
            </div>
          </Card>

          <section>
            <div className="flex items-end justify-between mb-4">
              <h2
                className="text-3xl tracking-[-0.5px]"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Scores by axis
              </h2>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {scores.length} axes
              </p>
            </div>

            {scores.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Icon.ListCheck />}
                  title="No scores recorded"
                  description="This assessment doesn't have any axis scores."
                />
              </Card>
            ) : (
              <Card className="p-0 overflow-hidden">
                {scores.map((s, i) => (
                  <div
                    key={s.id}
                    className={`grid gap-4 p-5 sm:grid-cols-12 sm:items-center ${
                      i !== 0 ? "border-t border-white/5" : ""
                    }`}
                  >
                    <div className="sm:col-span-4 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          #{String(i + 1).padStart(2, "0")}
                        </span>
                        {s.criterion && (
                          <Badge tone="outline">
                            w {Number(s.criterion.weight).toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      <p
                        className="text-xl tracking-tight text-foreground"
                        style={{ fontFamily: "'Instrument Serif', serif" }}
                      >
                        {s.criterion?.name ?? "Axis"}
                      </p>
                    </div>
                    <div className="sm:col-span-4">
                      <ScoreBar
                        value={Number(s.value)}
                        max={s.criterion?.scale_max ?? 5}
                      />
                    </div>
                    <p className="sm:col-span-4 text-sm text-muted-foreground italic leading-relaxed">
                      {s.note ?? (
                        <span className="text-muted-foreground/60">
                          No note
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </Card>
            )}
          </section>

          {(a.summary || a.recommendation) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {a.summary && (
                <Card className="p-6">
                  <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    Summary
                  </h3>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                    {a.summary}
                  </p>
                </Card>
              )}
              {a.recommendation && (
                <Card className="p-6">
                  <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    Recommendation
                  </h3>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                    {a.recommendation}
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 h-fit space-y-4">
          <Card className="p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Overall verdict
            </p>
            <p
              className="text-6xl tabular-nums mt-3 tracking-[-2px] text-foreground"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {Number(a.overall_score ?? 0).toFixed(2)}
              <span className="text-2xl text-muted-foreground ml-2">/5</span>
            </p>
            <div className="mt-4">
              <ScoreBar
                value={Number(a.overall_score ?? 0)}
                max={5}
                showValue={false}
              />
            </div>
          </Card>

          {isDraft && (
            <Card className="p-6 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Submitting locks the assessment and publishes it to everyone in
                the registry.
              </p>
              <Button onClick={submit} disabled={busy} className="w-full">
                {busy ? "Submitting…" : "Submit to registry"}
                <Icon.Check />
              </Button>
            </Card>
          )}
        </aside>
      </div>
    </Container>
  );
}
