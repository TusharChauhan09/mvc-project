"use client";

import { useMemo } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";
import { Icon } from "@/components/icons";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Container,
  EmptyState,
  PageHeader,
  Skeleton,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { Assessments, Orders, PersonalLibrary } from "@/lib/endpoints";
import { useCached } from "@/lib/use-cached";
import type { Assessment, Order, UserBookEntry } from "@/lib/types";

export default function ProfilePage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { user } = useAuth();
  const isSeller = user?.role === "seller" || user?.role === "admin";

  const assessmentsQ = useCached<{ data: Assessment[] }>(
    "assessments:list",
    () => Assessments.list(),
  );
  const libraryQ = useCached<{ data: UserBookEntry[] }>(
    "profile:library",
    () => PersonalLibrary.list({ per_page: 100 }),
  );
  const ordersQ = useCached<{ data: Order[] }>(
    "profile:orders",
    () => Orders.mine(),
  );

  const myAssessments = useMemo(
    () => (assessmentsQ.data?.data ?? []).filter((a) => a.user_id === user?.id),
    [assessmentsQ.data, user?.id],
  );
  const submitted = myAssessments.filter((a) => a.status === "submitted");
  const drafts = myAssessments.filter((a) => a.status === "draft");
  const shelfCount = libraryQ.data?.data?.length ?? 0;
  const orders = ordersQ.data?.data ?? [];
  const paidOrders = orders.filter((o) => o.status === "paid");

  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      })
    : null;

  return (
    <Container className="py-12 sm:py-16 relative">
      <div
        aria-hidden
        className="orb"
        style={{
          width: 480,
          height: 480,
          background:
            "radial-gradient(circle, hsl(280 70% 45% / 0.2), transparent 60%)",
          top: "-15%",
          right: "-10%",
        }}
      />

      <PageHeader
        eyebrow="Profile"
        title="Your account"
        description="Your identity, role, and a snapshot of everything you've done on Bookify."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          {/* Identity */}
          <Card className="p-6 animate-fade-rise-delay">
            <div className="flex items-start gap-5 flex-wrap">
              <Avatar
                name={user?.name ?? "Profile"}
                src={user?.avatar_url ?? undefined}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p
                  className="text-3xl text-foreground leading-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {user?.name ?? "Profile"}
                </p>
                <p className="text-sm text-muted-foreground truncate mt-1 inline-flex items-center gap-1.5">
                  <Icon.Mail className="h-3.5 w-3.5" />
                  {user?.email ?? ""}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {user?.role && <Badge tone="outline">{user.role}</Badge>}
                  {user?.provider && (
                    <Badge tone="outline">via {user.provider}</Badge>
                  )}
                  {joined && (
                    <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Joined {joined}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Become a seller lives here only — not on the shelf. */}
            <div className="mt-6 border-t border-white/5 pt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-foreground">
                  {isSeller ? "Seller studio" : "Sell your own books"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isSeller
                    ? "Submit new titles and manage your catalogue."
                    : "Request seller access to list textbooks and references."}
                </p>
              </div>
              <Link href="/seller">
                <Button variant={isSeller ? "outline" : "primary"}>
                  {isSeller ? <Icon.Book /> : <Icon.Plus />}
                  {isSeller ? "Open seller studio" : "Become a seller"}
                </Button>
              </Link>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 animate-fade-rise-delay-2">
            <Stat
              label="Submitted"
              value={submitted.length}
              icon={<Icon.Check />}
            />
            <Stat label="Drafts" value={drafts.length} icon={<Icon.BookOpen />} />
            <Stat label="On shelf" value={shelfCount} icon={<Icon.Book />} />
            <Stat
              label="Orders"
              value={paidOrders.length}
              icon={<Icon.Sparkles />}
            />
          </div>

          {/* Recent orders */}
          <section className="animate-fade-rise-delay-2">
            <h2
              className="text-2xl tracking-[-0.5px] mb-4"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Recent orders
            </h2>
            <Card className="p-0 overflow-hidden">
              {ordersQ.loading && orders.length === 0 ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : orders.length === 0 ? (
                <EmptyState
                  icon={<Icon.Sparkles />}
                  title="No orders yet"
                  description="Books you buy will appear here."
                  action={
                    <Link href="/books">
                      <Button>Browse library</Button>
                    </Link>
                  }
                />
              ) : (
                orders.slice(0, 5).map((o, i) => (
                  <div
                    key={o.id}
                    className={`flex items-center justify-between gap-4 p-5 ${
                      i !== 0 ? "border-t border-white/5" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">
                        {o.book?.title ?? `Order #${o.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      tone={
                        o.status === "paid"
                          ? "success"
                          : o.status === "failed"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {o.status}
                    </Badge>
                    <span className="font-mono text-sm tabular-nums w-20 text-right">
                      ₹{((o.amount ?? 0) / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))
              )}
            </Card>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 h-fit">
          <Card className="p-5">
            <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Quick links
            </h3>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/shelf">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Icon.BookOpen />
                  My shelf
                </Button>
              </Link>
              <Link href="/books">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Icon.Book />
                  Library
                </Button>
              </Link>
              <Link href="/assessments">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Icon.ListCheck />
                  My reviews
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Icon.ChartBar />
                  Dashboard
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Reviewer status
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {["admin", "educator", "reviewer"].includes(user?.role ?? "")
                ? "You can submit assessments to the registry."
                : "Your role can't submit assessments yet. Ask an admin to upgrade you to reviewer."}
            </p>
          </Card>
        </aside>
      </div>
    </Container>
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
