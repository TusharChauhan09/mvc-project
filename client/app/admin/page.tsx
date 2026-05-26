"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Container,
  Card,
  Button,
  Badge,
  EmptyState,
  PageHeader,
  Skeleton,
  Avatar,
  Input,
  Select,
  cx,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { BookCover } from "@/components/book-cover";
import { RequireAuth } from "@/components/require-auth";
import {
  AdminBooks,
  AdminOrders,
  AdminUsers,
  RoleRequests,
} from "@/lib/endpoints";
import { useCached, invalidateCache } from "@/lib/use-cached";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/toaster";
import type {
  Book,
  Order,
  Paginated,
  Role,
  RoleRequest,
  User,
} from "@/lib/types";

type TabKey = "roles" | "books" | "users" | "sellers" | "allbooks" | "orders";

export default function AdminPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("roles");

  if (!user) return null;

  if (user.role !== "admin") {
    return (
      <Container className="py-20">
        <Card>
          <EmptyState
            icon={<Icon.Lock />}
            title="Admin only"
            description="This page is restricted to administrators."
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

  const tabs: { value: TabKey; label: string }[] = [
    { value: "roles", label: "Role requests" },
    { value: "books", label: "Submissions" },
    { value: "users", label: "Users" },
    { value: "sellers", label: "Sellers" },
    { value: "allbooks", label: "All books" },
    { value: "orders", label: "Purchases" },
  ];

  return (
    <Container className="py-12 sm:py-16 relative">
      <div
        aria-hidden
        className="orb"
        style={{
          width: 520,
          height: 520,
          background:
            "radial-gradient(circle, hsl(0 70% 40% / 0.18), transparent 60%)",
          top: "-15%",
          right: "-10%",
        }}
      />

      <PageHeader
        eyebrow="Admin"
        title="Moderation desk"
        description="Full control over users, sellers, books, and purchases."
      />

      <Card className="p-1 mb-6 inline-flex flex-wrap gap-1 animate-fade-rise-delay">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cx(
              "px-4 py-2 rounded-xl text-sm transition-colors",
              tab === t.value
                ? "bg-white text-[hsl(var(--primary-foreground))]"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5",
            )}
          >
            {t.label}
          </button>
        ))}
      </Card>

      {tab === "roles" && <RolesTab />}
      {tab === "books" && <BooksTab />}
      {tab === "users" && <UsersTab currentUserId={user.id} />}
      {tab === "sellers" && <SellersTab />}
      {tab === "allbooks" && <AllBooksTab />}
      {tab === "orders" && <OrdersTab />}
    </Container>
  );
}

function RolesTab() {
  const q = useCached<Paginated<RoleRequest>>(
    "admin:role-requests",
    () => RoleRequests.adminList(),
  );
  const items = q.data?.data ?? [];

  async function decide(
    req: RoleRequest,
    status: "approved" | "rejected",
    note?: string,
  ) {
    try {
      await RoleRequests.decide(req.id, { status, decision_note: note });
      toast({
        title: status === "approved" ? "Request approved" : "Request rejected",
        tone: "success",
      });
      invalidateCache("admin:role-requests");
    } catch (err) {
      toast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "",
        tone: "error",
      });
    }
  }

  if (q.loading && items.length === 0) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Icon.User />}
          title="No requests"
          description="When users request a role, they'll appear here."
        />
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden animate-fade-rise-delay-2">
      {items.map((r, i) => (
        <div
          key={r.id}
          className={cx(
            "p-5",
            i !== 0 && "border-t border-white/5",
            r.status === "pending" ? "" : "opacity-60",
          )}
        >
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar
              name={r.user?.name ?? "?"}
              src={r.user?.avatar_url ?? undefined}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p
                  className="text-xl tracking-tight text-foreground"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {r.user?.name ?? "User"}
                </p>
                <Badge
                  tone={
                    r.status === "approved"
                      ? "success"
                      : r.status === "rejected"
                        ? "danger"
                        : "warning"
                  }
                >
                  {r.status}
                </Badge>
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  wants {r.requested_role}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {r.user?.email} · current role {r.user?.role ?? "—"} · submitted{" "}
                {new Date(r.created_at).toLocaleString()}
              </p>
              {r.reason && (
                <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
                  {r.reason}
                </p>
              )}
              {r.decision_note && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Admin note: {r.decision_note}
                </p>
              )}
            </div>
            {r.status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const note =
                      window.prompt("Optional rejection note") ?? undefined;
                    void decide(r, "rejected", note || undefined);
                  }}
                >
                  Reject
                </Button>
                <Button size="sm" onClick={() => void decide(r, "approved")}>
                  Approve
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </Card>
  );
}

function BooksTab() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">(
    "pending",
  );
  const q = useCached<Paginated<Book>>(
    `admin:books:${status}`,
    () => AdminBooks.list(status),
  );
  const items = q.data?.data ?? [];

  async function approve(book: Book) {
    try {
      await AdminBooks.approve(book.id);
      toast({ title: `"${book.title}" approved`, tone: "success" });
      invalidateCache(`admin:books:${status}`);
      invalidateCache("dashboard:books");
    } catch (err) {
      toast({
        title: "Approve failed",
        description: err instanceof Error ? err.message : "",
        tone: "error",
      });
    }
  }

  async function reject(book: Book) {
    const note = window.prompt("Optional rejection note") ?? undefined;
    try {
      await AdminBooks.reject(book.id, note || undefined);
      toast({ title: `"${book.title}" rejected`, tone: "success" });
      invalidateCache(`admin:books:${status}`);
    } catch (err) {
      toast({
        title: "Reject failed",
        description: err instanceof Error ? err.message : "",
        tone: "error",
      });
    }
  }

  return (
    <div>
      <Card className="p-1 mb-4 inline-flex gap-1">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cx(
              "px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-widest transition-colors",
              status === s
                ? "bg-white text-[hsl(var(--primary-foreground))]"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5",
            )}
          >
            {s}
          </button>
        ))}
      </Card>

      {q.loading && items.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Icon.Book />}
            title={`No ${status} books`}
            description={
              status === "pending"
                ? "Submissions from sellers will appear here for verification."
                : `Books with status "${status}" will show here.`
            }
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden animate-fade-rise-delay-2">
          {items.map((b, i) => (
            <div
              key={b.id}
              className={cx(
                "flex flex-col gap-4 p-5 sm:flex-row",
                i !== 0 && "border-t border-white/5",
              )}
            >
              <Link
                href={`/books/${b.id}`}
                className="w-16 h-24 rounded-md bg-white/5 ring-1 ring-white/10 overflow-hidden flex items-center justify-center flex-shrink-0"
              >
                <BookCover
                  src={b.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    tone={
                      b.status === "approved"
                        ? "success"
                        : b.status === "rejected"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {b.status ?? "approved"}
                  </Badge>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    #{String(b.id).padStart(4, "0")}
                  </span>
                </div>
                <Link
                  href={`/books/${b.id}`}
                  className="block mt-1 text-xl tracking-tight text-foreground hover:underline"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {b.title}
                </Link>
                <p className="text-xs text-muted-foreground truncate">
                  {b.authors?.join(", ") ?? "—"}
                </p>
                {b.description && (
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {b.description}
                  </p>
                )}
                {b.review_note && (
                  <p className="mt-1 text-[11px] text-[hsl(var(--danger))]">
                    Note: {b.review_note}
                  </p>
                )}
              </div>
              {status === "pending" && (
                <div className="flex flex-wrap gap-2 sm:flex-col">
                  <Button size="sm" onClick={() => void approve(b)}>
                    <Icon.Check />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void reject(b)}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function UsersTab({ currentUserId }: { currentUserId: number }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const cacheKey = `admin:users:${role}:${q}`;
  const usersQ = useCached<Paginated<User>>(
    cacheKey,
    () => AdminUsers.list({ q: q || undefined, role: role || undefined }),
  );
  const items = usersQ.data?.data ?? [];

  async function updateRole(u: User, newRole: Role) {
    try {
      await AdminUsers.update(u.id, { role: newRole });
      toast({ title: `Updated ${u.name} → ${newRole}`, tone: "success" });
      invalidateCache(cacheKey);
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "",
        tone: "error",
      });
    }
  }

  async function remove(u: User) {
    if (!window.confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    try {
      await AdminUsers.remove(u.id);
      toast({ title: `${u.name} deleted`, tone: "success" });
      invalidateCache(cacheKey);
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "",
        tone: "error",
      });
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <Select value={role} onChange={(e) => setRole(e.target.value as Role | "")}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="educator">Educator</option>
          <option value="reviewer">Reviewer</option>
          <option value="seller">Seller</option>
          <option value="student">Student</option>
        </Select>
      </div>

      {usersQ.loading && items.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={<Icon.User />} title="No users" description="Adjust filters or search." />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          {items.map((u, i) => (
            <div
              key={u.id}
              className={cx(
                "flex flex-wrap gap-4 p-5 items-center",
                i !== 0 && "border-t border-white/5",
              )}
            >
              <Avatar name={u.name} src={u.avatar_url ?? undefined} />
              <div className="min-w-0 flex-1">
                <p
                  className="text-lg tracking-tight text-foreground"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {u.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {u.email} · #{u.id} · joined {new Date(u.created_at).toLocaleDateString()}
                </p>
              </div>
              <Select
                value={u.role}
                onChange={(e) => void updateRole(u, e.target.value as Role)}
                className="min-w-[140px]"
              >
                <option value="admin">Admin</option>
                <option value="educator">Educator</option>
                <option value="reviewer">Reviewer</option>
                <option value="seller">Seller</option>
                <option value="student">Student</option>
              </Select>
              <Button
                size="sm"
                variant="danger"
                disabled={u.id === currentUserId}
                onClick={() => void remove(u)}
              >
                <Icon.Trash />
                Delete
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function SellersTab() {
  const q = useCached<Paginated<User & { seller_books_count?: number }>>(
    "admin:sellers",
    () => AdminUsers.sellers(),
  );
  const items = q.data?.data ?? [];

  if (q.loading && items.length === 0) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Icon.User />}
          title="No sellers yet"
          description="When users get seller access, they'll appear here."
        />
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      {items.map((u, i) => (
        <div
          key={u.id}
          className={cx(
            "flex flex-wrap items-center gap-4 p-5",
            i !== 0 && "border-t border-white/5",
          )}
        >
          <Avatar name={u.name} src={u.avatar_url ?? undefined} />
          <div className="min-w-0 flex-1">
            <p
              className="text-lg tracking-tight text-foreground"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {u.name}
            </p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
          <Badge tone="outline">
            {u.seller_books_count ?? 0} book{(u.seller_books_count ?? 0) === 1 ? "" : "s"}
          </Badge>
        </div>
      ))}
    </Card>
  );
}

function AllBooksTab() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const cacheKey = `admin:allbooks:${status}:${q}`;
  const booksQ = useCached<Paginated<Book>>(
    cacheKey,
    () => AdminBooks.list(status, q || undefined),
  );
  const items = booksQ.data?.data ?? [];

  async function editPrice(b: Book) {
    const current = ((b.price_paise ?? 49900) / 100).toString();
    const next = window.prompt(`New price (₹) for "${b.title}"`, current);
    if (!next) return;
    const paise = Math.round(Number(next) * 100);
    if (!Number.isFinite(paise) || paise < 0) {
      toast({ title: "Invalid price", tone: "error" });
      return;
    }
    try {
      await AdminBooks.update(b.id, { price_paise: paise });
      toast({ title: "Price updated", tone: "success" });
      invalidateCache(cacheKey);
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "",
        tone: "error",
      });
    }
  }

  async function remove(b: Book) {
    if (!window.confirm(`Delete "${b.title}" from registry?`)) return;
    try {
      await AdminBooks.remove(b.id);
      toast({ title: "Book deleted", tone: "success" });
      invalidateCache(cacheKey);
      invalidateCache("dashboard:books");
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "",
        tone: "error",
      });
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search title or ISBN"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>

      {booksQ.loading && items.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={<Icon.Book />} title="No books" description="Adjust filters or search." />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          {items.map((b, i) => (
            <div
              key={b.id}
              className={cx(
                "flex flex-wrap items-center gap-4 p-5",
                i !== 0 && "border-t border-white/5",
              )}
            >
              <Link
                href={`/books/${b.id}`}
                className="w-12 h-16 rounded-md overflow-hidden bg-white/5 ring-1 ring-white/10 flex-shrink-0"
              >
                <BookCover src={b.thumbnail} alt="" className="w-full h-full object-cover" />
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
                    {b.status ?? "approved"}
                  </Badge>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    #{String(b.id).padStart(4, "0")}
                  </span>
                </div>
                <Link
                  href={`/books/${b.id}`}
                  className="block text-lg tracking-tight text-foreground hover:underline truncate"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {b.title}
                </Link>
                <p className="text-xs text-muted-foreground truncate">
                  {b.authors?.join(", ") ?? "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm tabular-nums">
                  ₹{(((b.price_paise ?? 49900) / 100) | 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void editPrice(b)}>
                  Edit price
                </Button>
                <Button size="sm" variant="danger" onClick={() => void remove(b)}>
                  <Icon.Trash />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function OrdersTab() {
  const [status, setStatus] = useState<"" | "created" | "paid" | "failed">("");
  const [q, setQ] = useState("");
  const cacheKey = `admin:orders:${status}:${q}`;
  const ordersQ = useCached<Paginated<Order>>(
    cacheKey,
    () => AdminOrders.list({ status: status || undefined, q: q || undefined }),
  );
  const items = ordersQ.data?.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search order/payment id, name, phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="created">Created</option>
          <option value="failed">Failed</option>
        </Select>
      </div>

      {ordersQ.loading && items.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Icon.Sparkles />}
            title="No purchases yet"
            description="Once users buy books, orders will appear here."
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          {items.map((o, i) => (
            <div
              key={o.id}
              className={cx(
                "flex flex-wrap items-start gap-4 p-5",
                i !== 0 && "border-t border-white/5",
              )}
            >
              <div className="w-12 h-16 rounded-md overflow-hidden bg-white/5 ring-1 ring-white/10 flex-shrink-0">
                <BookCover
                  src={o.book?.thumbnail ?? null}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
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
                  <span className="font-mono text-[11px] text-muted-foreground">
                    #{String(o.id).padStart(4, "0")}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()}
                  </span>
                </div>
                <p
                  className="text-lg tracking-tight text-foreground truncate"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {o.book?.title ?? "Unknown book"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {o.user?.name ?? "—"} · {o.user?.email ?? "—"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ship to: {o.shipping.name}, {o.shipping.line1}
                  {o.shipping.line2 ? `, ${o.shipping.line2}` : ""},{" "}
                  {o.shipping.city}, {o.shipping.state} {o.shipping.postal} ·{" "}
                  {o.shipping.phone}
                </p>
                {o.razorpay_payment_id && (
                  <p className="text-[11px] font-mono text-muted-foreground mt-1">
                    rzp: {o.razorpay_order_id} / {o.razorpay_payment_id}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg tabular-nums">
                  ₹{((o.amount / 100) | 0).toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-muted-foreground">{o.currency}</p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
