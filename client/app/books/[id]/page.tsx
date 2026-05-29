"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Container,
  Card,
  Badge,
  Button,
  Avatar,
  Select,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import { BookCover } from "@/components/book-cover";
import { Icon } from "@/components/icons";
import { RequireAuth } from "@/components/require-auth";
import { GoogleBooksViewer } from "@/components/google-books-viewer";
import { Books, PersonalLibrary } from "@/lib/endpoints";
import { cacheBook, readCachedBook } from "@/lib/book-cache";
import { invalidateCache, mutateCache } from "@/lib/use-cached";
import type {
  Assessment,
  Book,
  LibraryStatus,
  UserBookEntry,
} from "@/lib/types";

export default function BookDetailPage({
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
  // Hydrate from cache (populated by list / hover prefetch) so the page paints immediately.
  const initialBook =
    typeof window === "undefined" ? null : readCachedBook(id);
  const [book, setBook] = useState<Book | null>(initialBook);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(true);
  const [bookLoading, setBookLoading] = useState(!initialBook);
  const [libraryEntry, setLibraryEntry] = useState<UserBookEntry | null>(null);
  const [libraryBusy, setLibraryBusy] = useState(false);

  const statusOptions: { value: LibraryStatus; label: string }[] = [
    { value: "want_to_read", label: "Want to read" },
    { value: "reading", label: "Reading" },
    { value: "read", label: "Read" },
  ];

  useEffect(() => {
    let active = true;
    Books.show(id)
      .then((b) => {
        if (!active) return;
        setBook(b.data);
        cacheBook(b.data);
      })
      .finally(() => active && setBookLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    Books.assessments(id)
      .then((a) => {
        if (!active) return;
        setAssessments(a.data);
      })
      .finally(() => active && setAssessmentsLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    PersonalLibrary.list({ book_id: id, per_page: 1 })
      .then((res) => {
        if (!active) return;
        setLibraryEntry(res.data[0] ?? null);
      })
      .catch(() => {
        if (!active) return;
        setLibraryEntry(null);
      });
    return () => {
      active = false;
    };
  }, [id]);

  function optimisticAppend(entry: UserBookEntry) {
    const cache =
      (typeof window !== "undefined"
        ? JSON.parse(
            window.localStorage.getItem("swr_cache_v1:profile:library") ??
              '{"data":[]}',
          )
        : { data: [] }) as { data: UserBookEntry[] };
    const next = {
      data: [
        entry,
        ...cache.data.filter((e) => e.book_id !== entry.book_id),
      ],
    };
    mutateCache("profile:library", next);
  }

  function optimisticPatch(entry: UserBookEntry) {
    const cache =
      (typeof window !== "undefined"
        ? JSON.parse(
            window.localStorage.getItem("swr_cache_v1:profile:library") ??
              '{"data":[]}',
          )
        : { data: [] }) as { data: UserBookEntry[] };
    const next = {
      data: cache.data.map((e) =>
        e.book_id === entry.book_id ? entry : e,
      ),
    };
    mutateCache("profile:library", next);
  }

  function optimisticRemove(bookId: number) {
    const cache =
      (typeof window !== "undefined"
        ? JSON.parse(
            window.localStorage.getItem("swr_cache_v1:profile:library") ??
              '{"data":[]}',
          )
        : { data: [] }) as { data: UserBookEntry[] };
    mutateCache("profile:library", {
      data: cache.data.filter((e) => e.book_id !== bookId),
    });
  }

  async function addToLibrary() {
    if (!book) return;
    setLibraryBusy(true);
    // Optimistic: paint immediately, sync to server in background.
    const now = new Date().toISOString();
    const optimistic: UserBookEntry = {
      id: -book.id, // negative sentinel until server returns
      book_id: book.id,
      status: "want_to_read",
      in_cart: false,
      created_at: now,
      updated_at: now,
      book,
    };
    setLibraryEntry(optimistic);
    optimisticAppend(optimistic);
    try {
      const res = await PersonalLibrary.add({
        book_id: book.id,
        status: "want_to_read",
      });
      setLibraryEntry(res.data);
      optimisticPatch(res.data);
    } catch {
      // Roll back on failure.
      setLibraryEntry(null);
      optimisticRemove(book.id);
      invalidateCache("profile:library");
    } finally {
      setLibraryBusy(false);
    }
  }

  async function updateLibrary(patch: {
    status?: LibraryStatus;
    in_cart?: boolean;
  }) {
    if (!book || !libraryEntry) return;
    setLibraryBusy(true);
    const optimistic: UserBookEntry = {
      ...libraryEntry,
      ...patch,
      updated_at: new Date().toISOString(),
      book: libraryEntry.book ?? book,
    };
    setLibraryEntry(optimistic);
    optimisticPatch(optimistic);
    try {
      const res = await PersonalLibrary.update(book.id, patch);
      setLibraryEntry(res.data);
      optimisticPatch(res.data);
    } catch {
      invalidateCache("profile:library");
    } finally {
      setLibraryBusy(false);
    }
  }

  async function removeFromLibrary() {
    if (!book) return;
    setLibraryBusy(true);
    setLibraryEntry(null);
    optimisticRemove(book.id);
    try {
      await PersonalLibrary.remove(book.id);
    } catch {
      invalidateCache("profile:library");
    } finally {
      setLibraryBusy(false);
    }
  }

  if (bookLoading && !book) {
    return (
      <Container className="py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <Skeleton className="h-96" />
          <div className="lg:col-span-2 space-y-3">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </Container>
    );
  }

  if (!book) {
    return (
      <Container className="py-24">
        <Card>
          <EmptyState
            icon={<Icon.Book />}
            title="Volume not found"
            description="The book you're looking for doesn't exist or was removed."
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

  return (
    <Container className="py-12 sm:py-16 relative">
      <div
        aria-hidden
        className="orb"
        style={{
          width: 520,
          height: 520,
          background:
            "radial-gradient(circle, hsl(220 70% 40% / 0.2), transparent 60%)",
          top: "-15%",
          right: "-10%",
        }}
      />

      <Link
        href="/books"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 animate-fade-rise"
      >
        ← Library
      </Link>

      <div className="grid lg:grid-cols-3 gap-8 items-start animate-fade-rise-delay">
        <aside className="lg:col-span-1 space-y-4 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1 no-scrollbar">
          <div className="aspect-[2/3] rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/[0.03] flex items-center justify-center shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
            <BookCover
              src={book.thumbnail}
              alt={book.title}
              title={book.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>

          {(book.reader_link ||
            book.preview_link ||
            (book.source === "google_books" && book.external_id)) && (
            <Link href={`/books/${book.id}/read`} className="block">
              <Button className="w-full" size="lg">
                <Icon.BookOpen />
                Read mode
              </Button>
            </Link>
          )}

          <Card className="p-5">
            <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Details
            </h3>
            <dl className="space-y-3 text-sm">
              <Meta
                label="Type"
                value={<Badge tone="outline">{book.type}</Badge>}
              />
              <Meta label="Source" value={book.source.replace("_", " ")} />
              {book.isbn_13 && (
                <Meta label="ISBN-13" value={book.isbn_13} mono />
              )}
              {book.isbn_10 && (
                <Meta label="ISBN-10" value={book.isbn_10} mono />
              )}
              <Meta label="Publisher" value={book.publisher ?? "—"} />
              <Meta label="Year" value={book.published_date ?? "—"} />
              <Meta label="Pages" value={book.page_count?.toString() ?? "—"} />
              <Meta label="Language" value={book.language ?? "—"} />
            </dl>
            {book.preview_link && (
              <a
                href={book.preview_link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 text-sm text-foreground underline-offset-4 hover:underline inline-flex items-center gap-1"
              >
                External preview →
              </a>
            )}
          </Card>
        </aside>

        <main className="lg:col-span-2 space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                #{String(book.id).padStart(4, "0")}
              </p>
              {book.status === "pending" && (
                <Badge tone="warning">Pending review</Badge>
              )}
              {book.status === "rejected" && (
                <Badge tone="danger">Rejected</Badge>
              )}
            </div>
            <h1
              className="break-words text-4xl leading-[0.98] text-balance sm:text-6xl"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {book.title}
            </h1>
            {book.subtitle && (
              <p
                className="mt-3 text-2xl text-muted-foreground italic"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                {book.subtitle}
              </p>
            )}
            <p className="mt-4 text-muted-foreground">
              by {book.authors?.join(", ") ?? "Unknown"}
            </p>
          </div>

          <Card className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Overall verdict
                </p>
                <p
                  className="text-6xl tabular-nums mt-2 tracking-[-2px]"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {book.average_score != null
                    ? Number(book.average_score).toFixed(2)
                    : "—"}
                  <span className="text-2xl text-muted-foreground ml-2">
                    /5
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {assessments.length} submitted assessment
                  {assessments.length === 1 ? "" : "s"}
                </p>
              </div>
              <Link href={`/assess/new?book=${book.id}`}>
                <Button size="lg">
                  <Icon.Plus />
                  Begin assessment
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-[200px]">
                <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Buy a copy
                </h2>
                <p
                  className="text-4xl mt-2 tabular-nums tracking-[-1px]"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  ₹{(((book.price_paise ?? 49900) / 100) | 0).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ships across India · secure checkout via Razorpay
                </p>
              </div>
              <Link href={`/buy/${book.id}`}>
                <Button size="lg" variant="buy">
                  <Icon.CartShop />
                  Buy now
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Personal library
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Save this book for later and track your reading status.
                </p>
              </div>
              {!libraryEntry && (
                <Button onClick={addToLibrary} disabled={libraryBusy}>
                  <Icon.BookOpen />
                  Add to library
                </Button>
              )}
            </div>

            {libraryEntry && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Select
                  value={libraryEntry.status}
                  onChange={(e) =>
                    updateLibrary({ status: e.target.value as LibraryStatus })
                  }
                  className="min-w-[180px]"
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Select>
                <Button
                  variant={libraryEntry.in_cart ? "outline" : "ghost"}
                  onClick={() =>
                    updateLibrary({ in_cart: !libraryEntry.in_cart })
                  }
                  disabled={libraryBusy}
                >
                  {libraryEntry.in_cart ? "Remove from cart" : "Add to cart"}
                </Button>
                <Button
                  variant="danger"
                  onClick={removeFromLibrary}
                  disabled={libraryBusy}
                >
                  <Icon.Trash />
                  Remove
                </Button>
              </div>
            )}
          </Card>

          {book.source === "google_books" && book.external_id && (
            <Card className="p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
                <div>
                  <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Google preview
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {book.viewability?.replace("_", " ").toLowerCase() ??
                      "Preview availability unknown"}
                  </p>
                </div>
                {(book.reader_link || book.preview_link) && (
                  <a
                    href={book.reader_link ?? book.preview_link ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <Icon.BookOpen />
                      Open reader
                    </Button>
                  </a>
                )}
              </div>
              <GoogleBooksViewer
                volumeId={book.external_id}
                readerLink={book.reader_link ?? book.preview_link}
                embeddable={book.embeddable}
                title={book.title}
              />
            </Card>
          )}

          {book.description && (
            <Card className="p-6 sm:p-8">
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
                Description
              </h2>
              <div
                className="text-foreground/80 leading-relaxed text-sm sm:text-base [&_a]:text-foreground [&_a]:underline-offset-4 [&_a:hover]:underline"
                dangerouslySetInnerHTML={{ __html: book.description }}
              />
            </Card>
          )}

          <section>
            <h2
              className="text-3xl tracking-[-0.5px] mb-5"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Submitted assessments
            </h2>

            {assessmentsLoading ? (
              <Card className="p-5 space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </Card>
            ) : assessments.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Icon.ListCheck />}
                  title="No assessments yet"
                  description="Be the first to score this book."
                  action={
                    <Link href={`/assess/new?book=${book.id}`}>
                      <Button>
                        <Icon.Plus />
                        Begin assessment
                      </Button>
                    </Link>
                  }
                />
              </Card>
            ) : (
              <Card className="p-0 overflow-hidden">
                {assessments.map((a, i) => (
                  <Link
                    key={a.id}
                    href={`/assessments/${a.id}`}
                    className={`flex flex-col gap-3 p-5 hover:bg-white/[0.04] transition-colors sm:flex-row sm:items-center ${
                      i !== 0 ? "border-t border-white/5" : ""
                    }`}
                  >
                    <Avatar name={a.user?.name ?? "?"} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        {a.user?.name ?? "Reviewer"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.user?.role} ·{" "}
                        {a.submitted_at &&
                          new Date(a.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge tone="success">Submitted</Badge>
                    <span className="font-mono text-sm tabular-nums w-16 text-right">
                      {Number(a.overall_score ?? 0).toFixed(2)}/5
                    </span>
                  </Link>
                ))}
              </Card>
            )}
          </section>
        </main>
      </div>
    </Container>
  );
}

function Meta({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className={mono ? "font-mono text-xs" : "text-sm text-right"}>
        {value}
      </dd>
    </div>
  );
}
