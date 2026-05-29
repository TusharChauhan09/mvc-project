"use client";

import { useEffect, useState } from "react";
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
  Input,
  Textarea,
  cx,
} from "@/components/ui";
import { BookCover } from "@/components/book-cover";
import { Icon } from "@/components/icons";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth-context";
import { Assessments, Books, Notifications, SellerBooks, AdminUsers } from "@/lib/endpoints";
import { useCached } from "@/lib/use-cached";
import { cacheBooks } from "@/lib/book-cache";
import { toast } from "@/components/toaster";
import type { AdminStats, Assessment, Book, SellerSales } from "@/lib/types";

type View = "reviewer" | "seller" | "admin";

function rupees(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { user } = useAuth();
  const isSeller = user?.role === "seller" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  const [view, setView] = useState<View>("reviewer");

  const views: { value: View; label: string; icon: React.ReactNode }[] = [
    { value: "reviewer", label: "Reviewer", icon: <Icon.ListCheck /> },
    ...(isSeller
      ? [{ value: "seller" as View, label: "Seller", icon: <Icon.Book /> }]
      : []),
    ...(isAdmin
      ? [{ value: "admin" as View, label: "Admin", icon: <Icon.ChartBar /> }]
      : []),
  ];

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

      {views.length > 1 && (
        <Card className="p-1 mb-8 inline-flex flex-wrap gap-1 animate-fade-rise-delay">
          {views.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => setView(v.value)}
              className={cx(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-colors",
                view === v.value
                  ? "bg-white text-[hsl(var(--primary-foreground))]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
              )}
            >
              {v.icon}
              {v.label}
            </button>
          ))}
        </Card>
      )}

      {view === "reviewer" && <ReviewerView />}
      {view === "seller" && isSeller && <SellerView />}
      {view === "admin" && isAdmin && <AdminView />}
    </Container>
  );
}

/* ─────────────── Reviewer ─────────────── */

function ReviewerView() {
  const assessmentsQ = useCached<{ data: Assessment[] }>(
    "dashboard:assessments",
    () => Assessments.list(),
  );
  const booksQ = useCached<{ data: Book[] }>("dashboard:books", () =>
    Books.list(),
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
    <>
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
                      alt={b.title}
                      title={b.title}
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
    </>
  );
}

/* ─────────────── Seller ─────────────── */

function SellerView() {
  const salesQ = useCached<SellerSales>("seller:sales", () =>
    SellerBooks.sales(),
  );
  const data = salesQ.data;
  const books = data?.data ?? [];
  const totals = data?.totals;
  const loading = salesQ.loading && !data;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-10 animate-fade-rise-delay lg:grid-cols-4">
        <Stat label="Listings" value={totals?.books ?? 0} icon={<Icon.Book />} />
        <Stat label="On sale" value={totals?.on_sale ?? 0} icon={<Icon.Check />} />
        <Stat
          label="Units sold"
          value={totals?.units_sold ?? 0}
          icon={<Icon.CartShop />}
        />
        <Stat
          label="Revenue"
          value={rupees(totals?.revenue_paise ?? 0)}
          icon={<Icon.ChartBar />}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <SectionHeader title="Your catalogue & sales" />
        <Link href="/seller">
          <Button variant="outline" size="sm">
            <Icon.Plus />
            Seller studio
          </Button>
        </Link>
      </div>

      <Card className="p-0 overflow-hidden animate-fade-rise-delay-2">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : books.length === 0 ? (
          <EmptyState
            icon={<Icon.Book />}
            title="No listings yet"
            description="Submit your first book from the seller studio."
            action={
              <Link href="/seller">
                <Button>Open seller studio</Button>
              </Link>
            }
          />
        ) : (
          books.map((b, i) => (
            <div
              key={b.id}
              className={cx(
                "flex items-center gap-4 p-5",
                i !== 0 && "border-t border-white/5",
              )}
            >
              <Link
                href={`/books/${b.id}`}
                className="w-12 h-16 rounded-md overflow-hidden bg-white/5 ring-1 ring-white/10 flex-shrink-0"
              >
                <BookCover
                  src={b.thumbnail}
                  alt={b.title}
                  title={b.title}
                  className="w-full h-full object-cover"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      b.status === "approved"
                        ? "success"
                        : b.status === "rejected"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {b.status}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {rupees(b.price_paise)}
                  </span>
                </div>
                <Link
                  href={`/books/${b.id}`}
                  className="block mt-1 text-base tracking-tight text-foreground hover:underline truncate"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {b.title}
                </Link>
                <p className="text-xs text-muted-foreground truncate">
                  {b.authors?.join(", ") ?? "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg tabular-nums text-foreground">
                  {b.units_sold}
                </p>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  sold
                </p>
              </div>
              <div className="text-right w-24">
                <p className="text-sm tabular-nums text-foreground">
                  {rupees(b.revenue_paise)}
                </p>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  revenue
                </p>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}

/* ─────────────── Admin ─────────────── */

function AdminView() {
  const statsQ = useCached<{ data: AdminStats }>("admin:stats", () =>
    AdminUsers.stats(),
  );
  const s = statsQ.data?.data;
  const loading = statsQ.loading && !s;

  const links = [
    { href: "/admin?tab=users", label: "All users", icon: <Icon.User /> },
    { href: "/admin?tab=sellers", label: "Sellers & sales", icon: <Icon.ChartBar /> },
    { href: "/admin?tab=allbooks", label: "All books", icon: <Icon.Book /> },
    { href: "/admin?tab=orders", label: "All purchases", icon: <Icon.CartShop /> },
    { href: "/admin?tab=books", label: "Submissions", icon: <Icon.ListCheck /> },
    { href: "/admin?tab=roles", label: "Role requests", icon: <Icon.Sparkles /> },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-10 animate-fade-rise-delay lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <Stat label="Users" value={s?.users_total ?? 0} icon={<Icon.User />} />
            <Stat label="Sellers" value={s?.sellers_total ?? 0} icon={<Icon.ChartBar />} />
            <Stat label="Books" value={s?.books_total ?? 0} icon={<Icon.Book />} />
            <Stat
              label="Revenue"
              value={rupees(s?.revenue_paise ?? 0)}
              icon={<Icon.CartShop />}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 animate-fade-rise-delay-2">
        <div className="lg:col-span-2">
          <SectionHeader title="Manage" />
          <div className="grid sm:grid-cols-2 gap-3">
            {links.map((l) => (
              <Link key={l.href} href={l.href}>
                <Card className="flex items-center justify-between gap-3 p-5 transition-colors hover:bg-white/[0.06]">
                  <span className="inline-flex items-center gap-3 text-foreground">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-muted-foreground ring-1 ring-white/10">
                      {l.icon}
                    </span>
                    {l.label}
                  </span>
                  <Icon.ArrowRight className="text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniStat label="Pending books" value={s?.books_pending ?? 0} />
            <MiniStat label="Orders" value={s?.orders_total ?? 0} />
            <MiniStat label="Paid orders" value={s?.orders_paid ?? 0} />
          </div>
        </div>

        <div>
          <SectionHeader title="Broadcast" />
          <BroadcastComposer />
        </div>
      </div>
    </>
  );
}

function BroadcastComposer() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const res = await Notifications.broadcast({
        title: title.trim(),
        body: body.trim() || undefined,
      });
      toast({ title: res.message, tone: "success" });
      setTitle("");
      setBody("");
    } catch (err) {
      toast({
        title: "Failed to send",
        description: err instanceof Error ? err.message : "",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon.Bell className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-foreground">Notify all users</p>
      </div>
      <form onSubmit={send} className="flex flex-col gap-3">
        <Input
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New books just landed"
        />
        <Textarea
          label="Message (optional)"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="A short note for everyone…"
        />
        <Button type="submit" disabled={busy || !title.trim()}>
          {busy ? "Sending…" : "Send to everyone"}
          <Icon.ArrowRight />
        </Button>
      </form>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p
        className="text-2xl mt-1 tabular-nums tracking-[-0.5px]"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {value}
      </p>
    </Card>
  );
}

/* ─────────────── shared ─────────────── */

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
  );
}
