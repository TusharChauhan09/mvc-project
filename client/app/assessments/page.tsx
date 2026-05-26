"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Container,
  Card,
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Skeleton,
  Avatar,
  ScoreBar,
  cx,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { RequireAuth } from "@/components/require-auth";
import { Assessments } from "@/lib/endpoints";
import { useCached } from "@/lib/use-cached";
import { useAuth } from "@/lib/auth-context";
import type { Assessment, AssessmentStatus } from "@/lib/types";

const FILTERS: { value: "all" | AssessmentStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "draft", label: "Drafts" },
];

const SCOPE = [
  { value: "all" as const, label: "Everyone" },
  { value: "mine" as const, label: "Only mine" },
];

export default function AssessmentsPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | AssessmentStatus>("all");
  const [scope, setScope] = useState<"all" | "mine">("all");

  const assessmentsQ = useCached<{ data: Assessment[] }>(
    "assessments:list",
    () => Assessments.list({}),
  );
  const items = assessmentsQ.data?.data ?? [];

  const visible = useMemo(() => {
    let rows = items;
    if (filter !== "all") rows = rows.filter((a) => a.status === filter);
    if (scope === "mine" && user) rows = rows.filter((a) => a.user_id === user.id);
    return rows;
  }, [items, filter, scope, user]);

  const submitted = items.filter((a) => a.status === "submitted").length;
  const drafts = items.filter((a) => a.status === "draft").length;

  return (
    <Container className="py-12 sm:py-16 relative">
      <div
        aria-hidden
        className="orb"
        style={{
          width: 520,
          height: 520,
          background:
            "radial-gradient(circle, hsl(220 80% 40% / 0.2), transparent 60%)",
          top: "-15%",
          right: "-10%",
        }}
      />

      <PageHeader
        eyebrow="The registry"
        title="Assessments"
        description="Every verdict in the registry. Filter by status, or narrow to your own work."
        actions={
          <Link href="/books">
            <Button>
              <Icon.Plus />
              New assessment
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-3 animate-fade-rise-delay">
        <Stat label="Total" value={items.length} />
        <Stat label="Submitted" value={submitted} />
        <Stat label="Drafts" value={drafts} />
      </div>

      <Card className="p-4 mb-6 flex flex-wrap items-center justify-between gap-3 animate-fade-rise-delay">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cx(
                "rounded-full px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors",
                filter === f.value
                  ? "bg-white text-[hsl(var(--primary-foreground))]"
                  : "bg-white/5 text-muted-foreground ring-1 ring-white/10 hover:text-foreground hover:bg-white/10",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {SCOPE.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setScope(s.value)}
              className={cx(
                "rounded-full px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors",
                scope === s.value
                  ? "bg-white text-[hsl(var(--primary-foreground))]"
                  : "bg-white/5 text-muted-foreground ring-1 ring-white/10 hover:text-foreground hover:bg-white/10",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Card>

      {assessmentsQ.loading && items.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Icon.ListCheck />}
            title="No assessments here"
            description="Pick a book from Discover and begin your first assessment."
            action={
              <Link href="/books">
                <Button>
                  <Icon.Search />
                  Find a book
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden animate-fade-rise-delay-2">
          {visible.map((a, i) => (
            <Link
              key={a.id}
              href={`/assessments/${a.id}`}
              className={cx(
                "flex flex-col gap-3 p-5 transition-colors hover:bg-white/[0.04] sm:flex-row sm:items-center",
                i !== 0 && "border-t border-white/5",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <Badge tone={a.status === "submitted" ? "success" : "warning"}>
                    {a.status === "submitted" ? "Submitted" : "Draft"}
                  </Badge>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    #{String(a.id).padStart(4, "0")}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {a.submitted_at
                      ? `· ${new Date(a.submitted_at).toLocaleDateString()}`
                      : `· updated ${new Date(a.updated_at).toLocaleDateString()}`}
                  </span>
                </div>
                <p
                  className="text-xl tracking-tight text-foreground line-clamp-1"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {a.book?.title ?? "Untitled volume"}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar name={a.user?.name ?? "?"} size="sm" />
                  <span>
                    {a.user?.name ?? "Reviewer"}
                    {a.user?.role ? ` · ${a.user.role}` : ""}
                  </span>
                </div>
              </div>
              <div className="w-full sm:w-40">
                <ScoreBar
                  value={Number(a.overall_score ?? 0)}
                  max={5}
                  showValue={false}
                />
                <p className="mt-1 text-right text-[11px] font-mono tabular-nums text-muted-foreground">
                  {Number(a.overall_score ?? 0).toFixed(2)}/5
                </p>
              </div>
              <Icon.ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </Link>
          ))}
        </Card>
      )}
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p
        className="text-4xl mt-2 tabular-nums tracking-[-1px]"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {value}
      </p>
    </Card>
  );
}
