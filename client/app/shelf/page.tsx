"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";
import { BookCover } from "@/components/book-cover";
import { Icon } from "@/components/icons";
import {
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
import { PersonalLibrary } from "@/lib/endpoints";
import { useCached } from "@/lib/use-cached";
import type { LibraryStatus, UserBookEntry } from "@/lib/types";

const STATUSES: { value: LibraryStatus; label: string }[] = [
  { value: "want_to_read", label: "Want to read" },
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" },
];

export default function ShelfPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const libraryQ = useCached<{ data: UserBookEntry[] }>(
    "profile:library",
    () => PersonalLibrary.list({ per_page: 100 }),
  );
  const entries = libraryQ.data?.data ?? [];
  const loading = libraryQ.loading;
  const [busyId, setBusyId] = useState<number | null>(null);
  const [tab, setTab] = useState<"all" | LibraryStatus>("all");

  const cartItems = useMemo(
    () => entries.filter((entry) => entry.in_cart),
    [entries],
  );

  const counts = useMemo(() => {
    return {
      all: entries.length,
      want_to_read: entries.filter((e) => e.status === "want_to_read").length,
      reading: entries.filter((e) => e.status === "reading").length,
      read: entries.filter((e) => e.status === "read").length,
    };
  }, [entries]);

  const visible = useMemo(
    () => (tab === "all" ? entries : entries.filter((e) => e.status === tab)),
    [entries, tab],
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

  const TABS: { value: "all" | LibraryStatus; label: string; count: number }[] =
    [
      { value: "all", label: "All", count: counts.all },
      { value: "want_to_read", label: "Want to read", count: counts.want_to_read },
      { value: "reading", label: "Reading", count: counts.reading },
      { value: "read", label: "Read", count: counts.read },
    ];

  return (
    <Container className="py-12 sm:py-16 relative">
      <div
        aria-hidden
        className="orb"
        style={{
          width: 480,
          height: 480,
          background:
            "radial-gradient(circle, hsl(160 70% 40% / 0.18), transparent 60%)",
          top: "-15%",
          left: "-10%",
        }}
      />

      <PageHeader
        eyebrow="My shelf"
        title="Your reading list"
        description="Every book you've saved — track what you want to read, what you're reading, and what you've finished."
        actions={
          <Link href="/books">
            <Button>
              <Icon.Plus />
              Add books
            </Button>
          </Link>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="p-4 flex flex-wrap gap-2 animate-fade-rise-delay">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={cx(
                  "rounded-full px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors",
                  tab === t.value
                    ? "bg-white text-[hsl(var(--primary-foreground))]"
                    : "bg-white/5 text-muted-foreground ring-1 ring-white/10 hover:text-foreground hover:bg-white/10",
                )}
              >
                {t.label} · {t.count}
              </button>
            ))}
          </Card>

          <Card className="p-6">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                Loading your shelf...
              </div>
            ) : entries.length === 0 ? (
              <EmptyState
                icon={<Icon.BookOpen />}
                title="No saved books"
                description="Add books from the library to start your personal shelf."
                action={
                  <Link href="/books">
                    <Button>Explore books</Button>
                  </Link>
                }
              />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={<Icon.BookOpen />}
                title="Nothing here yet"
                description="No books in this list. Move a book here or pick another tab."
              />
            ) : (
              <div className="space-y-4">
                {visible.map((entry) => (
                  <div
                    key={entry.book_id}
                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center"
                  >
                    <Link
                      href={`/books/${entry.book_id}`}
                      className="flex gap-4 flex-1 min-w-0 group"
                    >
                      <div className="w-14 h-20 rounded-md bg-white/5 ring-1 ring-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                        <BookCover
                          src={entry.book?.thumbnail ?? null}
                          alt={entry.book?.title ?? ""}
                          title={entry.book?.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate group-hover:underline underline-offset-4">
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
                    </Link>

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
                    <Link
                      href={`/books/${entry.book_id}`}
                      className="text-sm text-foreground truncate hover:underline underline-offset-4"
                    >
                      {entry.book?.title ?? "Untitled"}
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        updateEntry(entry.book_id, { in_cart: false })
                      }
                      className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
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
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="w-full">
                  View profile
                </Button>
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
