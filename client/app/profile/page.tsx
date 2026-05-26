"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";
import { BookCover } from "@/components/book-cover";
import { Icon } from "@/components/icons";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Container,
  EmptyState,
  PageHeader,
  Select,
  Spinner,
  cx,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { PersonalLibrary } from "@/lib/endpoints";
import { useCached } from "@/lib/use-cached";
import type { LibraryStatus, UserBookEntry } from "@/lib/types";

const STATUSES: { value: LibraryStatus; label: string }[] = [
  { value: "want_to_read", label: "Want to read" },
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" },
];

export default function ProfilePage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { user } = useAuth();
  const libraryQ = useCached<{ data: UserBookEntry[] }>(
    "profile:library",
    () => PersonalLibrary.list({ per_page: 100 }),
  );
  const entries = libraryQ.data?.data ?? [];
  const loading = libraryQ.loading;
  const [busyId, setBusyId] = useState<number | null>(null);

  const cartItems = useMemo(
    () => entries.filter((entry) => entry.in_cart),
    [entries],
  );

  async function updateEntry(
    bookId: number,
    patch: { status?: LibraryStatus; in_cart?: boolean },
  ) {
    setBusyId(bookId);
    const prev = entries;
    // Optimistic UI: paint immediately.
    libraryQ.setData({
      data: prev.map((entry) =>
        entry.book_id === bookId
          ? { ...entry, ...patch, updated_at: new Date().toISOString() }
          : entry,
      ),
    });
    try {
      const res = await PersonalLibrary.update(bookId, patch);
      libraryQ.setData({
        data: prev.map((entry) =>
          entry.book_id === bookId ? res.data : entry,
        ),
      });
    } catch {
      // Roll back on failure.
      libraryQ.setData({ data: prev });
    } finally {
      setBusyId(null);
    }
  }

  async function removeEntry(bookId: number) {
    setBusyId(bookId);
    const prev = entries;
    libraryQ.setData({
      data: prev.filter((entry) => entry.book_id !== bookId),
    });
    try {
      await PersonalLibrary.remove(bookId);
    } catch {
      libraryQ.setData({ data: prev });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Container className="py-12 sm:py-16">
      <PageHeader
        eyebrow="Profile"
        title={user?.name ?? "Your profile"}
        description="Manage your personal library and keep track of what you want to read."
        actions={
          <Link href="/books">
            <Button variant="outline">
              <Icon.Book />
              Browse library
            </Button>
          </Link>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <Card className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <Avatar
                name={user?.name ?? "Profile"}
                src={user?.avatar_url ?? undefined}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p
                  className="text-2xl text-foreground"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {user?.name ?? "Profile"}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {user?.email ?? ""}
                </p>
                {user?.role && (
                  <Badge tone="outline" className="mt-2">
                    {user.role}
                  </Badge>
                )}
              </div>
              {user?.role !== "seller" && user?.role !== "admin" && (
                <Link href="/seller">
                  <Button variant="outline">
                    <Icon.Plus />
                    Become a seller
                  </Button>
                </Link>
              )}
              {(user?.role === "seller" || user?.role === "admin") && (
                <Link href="/seller">
                  <Button variant="outline">
                    <Icon.Book />
                    Seller studio
                  </Button>
                </Link>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Personal library
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Track what you want to read, what you are reading, and what
                  you have finished.
                </p>
              </div>
              <Link href="/books">
                <Button size="sm">
                  <Icon.Plus />
                  Add books
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                Loading your library...
              </div>
            ) : entries.length === 0 ? (
              <EmptyState
                icon={<Icon.BookOpen />}
                title="No saved books"
                description="Add books from the library to start your personal list."
                action={
                  <Link href="/books">
                    <Button>Explore books</Button>
                  </Link>
                }
              />
            ) : (
              <div className="mt-6 space-y-4">
                {entries.map((entry) => (
                  <div
                    key={entry.book_id}
                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex gap-4 flex-1 min-w-0">
                      <div className="w-14 h-20 rounded-md bg-white/5 ring-1 ring-white/10 overflow-hidden flex items-center justify-center">
                        <BookCover
                          src={entry.book?.thumbnail ?? null}
                          alt={entry.book?.title ?? ""}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">
                          {entry.book?.title ?? "Untitled"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.book?.authors?.join(", ") ?? "Unknown author"}
                        </p>
                        {entry.in_cart && (
                          <Badge tone="accent" className="mt-2">
                            In cart
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={entry.status}
                        onChange={(e) =>
                          updateEntry(entry.book_id, {
                            status: e.target.value as LibraryStatus,
                          })
                        }
                        className="min-w-[160px]"
                      >
                        {STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </Select>
                      <Button
                        variant={entry.in_cart ? "outline" : "ghost"}
                        size="sm"
                        onClick={() =>
                          updateEntry(entry.book_id, {
                            in_cart: !entry.in_cart,
                          })
                        }
                      >
                        {entry.in_cart ? "Remove from cart" : "Add to cart"}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeEntry(entry.book_id)}
                      >
                        <Icon.Trash />
                        Remove
                      </Button>
                      {busyId === entry.book_id && (
                        <span className="text-xs text-muted-foreground">
                          Saving…
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 h-fit">
          <Card className="p-5">
            <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Cart
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {cartItems.length === 0
                ? "No books in your cart yet."
                : `${cartItems.length} book${cartItems.length === 1 ? "" : "s"} saved to your cart.`}
            </p>
            {cartItems.length > 0 && (
              <div className="mt-4 space-y-2">
                {cartItems.map((entry) => (
                  <div
                    key={entry.book_id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-sm text-foreground truncate">
                      {entry.book?.title ?? "Untitled"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateEntry(entry.book_id, { in_cart: false })
                      }
                      className={cx(
                        "text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Tips
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add books from the Library page, then manage your reading status
              here.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/books">
                <Button variant="outline" size="sm" className="w-full">
                  Go to library
                </Button>
              </Link>
              <Link href="/books">
                <Button variant="ghost" size="sm" className="w-full">
                  Discover new titles
                </Button>
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
