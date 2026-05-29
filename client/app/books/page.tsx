"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Container,
  Card,
  Input,
  Badge,
  Button,
  PageHeader,
  EmptyState,
  Skeleton,
  ScoreBar,
  cx,
} from "@/components/ui";
import { BookCover } from "@/components/book-cover";
import { Icon } from "@/components/icons";
import { RequireAuth } from "@/components/require-auth";
import { Books } from "@/lib/endpoints";
import type { Book } from "@/lib/types";
import {
  BOOK_CATEGORIES,
  type BookCategoryKey,
  categoryForBook,
} from "@/lib/book-categories";
import { cacheBooks, cacheBook } from "@/lib/book-cache";

const TYPES = [
  { value: "", label: "All" },
  { value: "textbook", label: "Textbook" },
  { value: "reference", label: "Reference" },
  { value: "ebook", label: "E-book" },
];

const PER_PAGE = 24;
const BOOKS_CACHE_PREFIX = "books_cache_v2:";
const PREFETCH_ROOT_MARGIN = "1200px";

type BooksCache = {
  books: Book[];
  hasMore: boolean;
  ts: number;
};

function cacheKeyFor(q: string, type: string, category: BookCategoryKey) {
  return `${BOOKS_CACHE_PREFIX}${q}|${type}|${category}`;
}

function readBooksCache(
  q: string,
  type: string,
  category: BookCategoryKey,
): BooksCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKeyFor(q, type, category));
    return raw ? (JSON.parse(raw) as BooksCache) : null;
  } catch {
    return null;
  }
}

function writeBooksCacheSig(
  q: string,
  type: string,
  category: BookCategoryKey,
  c: BooksCache,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cacheKeyFor(q, type, category), JSON.stringify(c));
  } catch {
    // ignore quota errors
  }
}

export default function BooksPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  // Hydrate the default-view cache synchronously so first paint shows real books, not skeletons.
  const initialCache =
    typeof window === "undefined" ? null : readBooksCache("", "", "all");

  const [books, setBooks] = useState<Book[]>(
    initialCache ? initialCache.books : [],
  );
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState<BookCategoryKey>("all");
  const [loading, setLoading] = useState(initialCache === null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(
    initialCache ? initialCache.hasMore : true,
  );
  const [sentinelVisible, setSentinelVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const randomTopics = useMemo(() => {
    const pool = BOOK_CATEGORIES.filter((c) => c.key !== "all");
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 5);
  }, []);
  const hasActiveFilters =
    q.trim().length > 0 || type !== "" || category !== "all";

  function resetPaging(
    nextQ = q,
    nextType = type,
    nextCategory = category,
  ) {
    // Prefer cached page-1 for this filter signature for instant paint.
    const cached = readBooksCache(nextQ, nextType, nextCategory);
    if (cached) {
      setBooks(cached.books);
      setHasMore(cached.hasMore);
      setLoading(false);
    } else {
      // Don't blank the grid — keep showing prior books while server fetches.
      // Client-side filter (below) gives instant feedback on text queries.
      setHasMore(true);
      setLoading(true);
    }
    setPage(1);
    setLoadingMore(false);
  }

  function mergeBooks(prev: Book[], next: Book[]) {
    const seen = new Set(prev.map((b) => b.id));
    const merged = [...prev];
    for (const book of next) {
      if (!seen.has(book.id)) {
        merged.push(book);
      }
    }
    return merged;
  }

  function applyCategory(nextCategory: BookCategoryKey) {
    setCategory(nextCategory);
    resetPaging(q, type, nextCategory);
  }

  function applyType(nextType: string) {
    setType(nextType);
    resetPaging(q, nextType, category);
  }

  function resetFilters() {
    setQ("");
    setType("");
    setCategory("all");
    resetPaging("", "", "all");
  }

  // Cache for next-page prefetch. Keyed by the exact filter signature so stale prefetches are ignored.
  const prefetchRef = useRef<{
    key: string;
    page: number;
    promise: Promise<Awaited<ReturnType<typeof Books.list>>>;
  } | null>(null);

  const filterKey = `${q}|${type}|${category}`;

  const prevQ = useRef(q);
  useEffect(() => {
    let active = true;
    const isFirstPage = page === 1;
    // Debounce only typing in the search box. Filters/category/page changes fire instantly.
    const qChanged = prevQ.current !== q;
    prevQ.current = q;
    const delay = qChanged && q.trim().length > 0 ? 150 : 0;

    const fetchPage = (targetPage: number) => {
      // Reuse the prefetched promise if it matches the request we are about to make.
      const pref = prefetchRef.current;
      if (
        pref &&
        pref.key === filterKey &&
        pref.page === targetPage
      ) {
        prefetchRef.current = null;
        return pref.promise;
      }
      return Books.list({
        q: q || undefined,
        type: type || undefined,
        category: category !== "all" ? category : undefined,
        page: targetPage,
        per_page: PER_PAGE,
      });
    };

    const t = setTimeout(() => {
      fetchPage(page)
        .then((r) => {
          if (!active) return;
          const nextBooks = page === 1 ? r.data : mergeBooks(books, r.data);
          setBooks(nextBooks);
          cacheBooks(r.data);
          let nextHasMore: boolean;
          if (r.links && "next" in r.links) {
            nextHasMore = Boolean(r.links.next);
          } else if (r.meta) {
            const current = r.meta.current_page ?? page;
            const last = r.meta.last_page ?? page;
            nextHasMore = current < last;
          } else {
            nextHasMore = r.data.length >= PER_PAGE;
          }
          setHasMore(nextHasMore);
          // Persist page-1 per filter signature so re-searching the same query is instant.
          if (page === 1) {
            writeBooksCacheSig(q, type, category, {
              books: nextBooks,
              hasMore: nextHasMore,
              ts: Date.now(),
            });
          }

          // Prefetch the next page in the background so the next scroll feels instant.
          if (nextHasMore) {
            const nextPage = page + 1;
            prefetchRef.current = {
              key: filterKey,
              page: nextPage,
              promise: Books.list({
                q: q || undefined,
                type: type || undefined,
                category: category !== "all" ? category : undefined,
                page: nextPage,
                per_page: PER_PAGE,
              }).catch(
                () =>
                  ({
                    data: [] as Book[],
                  }) as Awaited<ReturnType<typeof Books.list>>,
              ),
            };
          } else {
            prefetchRef.current = null;
          }
        })
        .finally(() => {
          if (!active) return;
          if (isFirstPage) {
            setLoading(false);
          } else {
            setLoadingMore(false);
          }
        });
    }, delay);
    return () => {
      active = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, category, page]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setSentinelVisible(entries[0]?.isIntersecting ?? false);
      },
      { rootMargin: PREFETCH_ROOT_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!sentinelVisible || loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    setPage((p) => p + 1);
  }, [hasMore, loading, loadingMore, sentinelVisible]);

  // Invalidate any prefetched next-page when filters change.
  useEffect(() => {
    prefetchRef.current = null;
  }, [filterKey]);

  // Instant client-side filter for text search: paint matches from what's already
  // loaded while the authoritative server query is still in flight.
  const displayBooks = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return books;
    return books.filter((b) => {
      const t = (b.title ?? "").toLowerCase();
      const s = (b.subtitle ?? "").toLowerCase();
      const a = (b.authors ?? []).join(" ").toLowerCase();
      return (
        t.includes(term) ||
        s.includes(term) ||
        a.includes(term) ||
        (b.isbn_10 ?? "").includes(term) ||
        (b.isbn_13 ?? "").includes(term)
      );
    });
  }, [books, q]);

  // After the default view loads, prefetch every category's page-1 in the background
  // so the first click on any topic chip paints instantly from cache.
  const prefetchedCategoriesRef = useRef(false);
  useEffect(() => {
    if (prefetchedCategoriesRef.current) return;
    if (loading || books.length === 0) return;
    if (q !== "" || type !== "" || category !== "all") return;
    prefetchedCategoriesRef.current = true;

    const idle =
      typeof window !== "undefined" &&
      "requestIdleCallback" in window
        ? (window as unknown as {
            requestIdleCallback: (fn: () => void) => number;
          }).requestIdleCallback
        : (fn: () => void) => window.setTimeout(fn, 600);

    idle(() => {
      for (const c of BOOK_CATEGORIES) {
        if (c.key === "all") continue;
        if (readBooksCache("", "", c.key)) continue;
        Books.list({ category: c.key, page: 1, per_page: PER_PAGE })
          .then((r) => {
            cacheBooks(r.data);
            const next = r.links?.next != null;
            writeBooksCacheSig("", "", c.key, {
              books: r.data,
              hasMore: next || r.data.length >= PER_PAGE,
              ts: Date.now(),
            });
          })
          .catch(() => {});
      }
    });
  }, [loading, books.length, q, type, category]);

  return (
    <Container className="py-12 sm:py-16 relative">
      <div
        aria-hidden
        className="orb"
        style={{
          width: 480,
          height: 480,
          background:
            "radial-gradient(circle, hsl(220 80% 40% / 0.22), transparent 60%)",
          top: "-15%",
          left: "-10%",
        }}
      />

      <PageHeader
        eyebrow="The shelf"
        title="Library"
        description="Every volume in the registry. Search, filter, or bring in something new."
        actions={
          <Link href="/seller">
            <Button>
              <Icon.Plus />
              Add a book
            </Button>
          </Link>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <Card className="p-4 mb-6 flex flex-col gap-3 animate-fade-rise-delay">
            <Input
              value={q}
              onChange={(e) => {
                const next = e.target.value;
                setQ(next);
                resetPaging(next, type, category);
              }}
              placeholder="Search by title or ISBN…"
              leading={<Icon.Search className="w-4 h-4" />}
            />
          </Card>

          <Card className="p-4 mb-8 animate-fade-rise-delay">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Random topics
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Jump into a topic and explore the shelf.
                </p>
              </div>
              <button
                type="button"
                onClick={() => applyCategory("all")}
                className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                View all
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {randomTopics.map((topic) => (
                <button
                  key={topic.key}
                  type="button"
                  onClick={() => applyCategory(topic.key)}
                  className={cx(
                    "rounded-full px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors",
                    category === topic.key
                      ? "bg-white text-[hsl(var(--primary-foreground))]"
                      : "bg-white/5 text-muted-foreground ring-1 ring-white/10 hover:text-foreground hover:bg-white/10",
                  )}
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </Card>

          {loading && books.length === 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-32 mb-4" />
                  <Skeleton className="h-4 mb-2 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </Card>
              ))}
            </div>
          ) : displayBooks.length === 0 && !loading ? (
            <Card>
              <EmptyState
                icon={<Icon.Book />}
                title="No books found"
                description="Try another topic or clear the filters."
                action={
                  <button onClick={resetFilters} className="w-full">
                    <Button>Clear filters</Button>
                  </button>
                }
              />
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-rise-delay-2">
              {loading && (
                <div className="col-span-full flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full bg-white/40 animate-pulse" />
                  Refreshing…
                </div>
              )}
              {displayBooks.map((b) => (
                <Link
                  key={b.id}
                  href={`/books/${b.id}`}
                  className="group"
                  onMouseEnter={() => cacheBook(b)}
                  onTouchStart={() => cacheBook(b)}
                >
                  <Card className="p-5 h-full transition-all group-hover:bg-white/[0.06] group-hover:border-white/20">
                    <div className="flex gap-4">
                      <div className="w-16 h-24 rounded-md bg-white/5 ring-1 ring-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        <BookCover
                          src={b.thumbnail}
                          alt={b.title}
                          title={b.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge tone="outline">{b.type}</Badge>
                          <Badge tone="outline">
                            {categoryForBook(b).label}
                          </Badge>
                        </div>
                        <h3
                          className="text-xl tracking-tight leading-tight line-clamp-2"
                          style={{ fontFamily: "'Instrument Serif', serif" }}
                        >
                          {b.title}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {b.authors?.join(", ") ?? "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                          {b.published_date ?? "n.d."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5">
                      {b.average_score != null ? (
                        <ScoreBar value={Number(b.average_score)} max={5} />
                      ) : (
                        <p className="text-xs text-muted-foreground text-center">
                          No assessments yet
                        </p>
                      )}
                      {b.assessments_count != null && b.assessments_count > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-2 text-center">
                          {b.assessments_count} assessment
                          {b.assessments_count === 1 ? "" : "s"}
                        </p>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {loadingMore && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-32 mb-4" />
                  <Skeleton className="h-4 mb-2 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </Card>
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-8" />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 h-fit">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Filters
              </h3>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Topic
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {BOOK_CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => applyCategory(c.key)}
                    className={cx(
                      "rounded-full px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors",
                      category === c.key
                        ? "bg-white text-[hsl(var(--primary-foreground))]"
                        : "bg-white/5 text-muted-foreground ring-1 ring-white/10 hover:text-foreground hover:bg-white/10",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Type
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => applyType(t.value)}
                    className={cx(
                      "h-9 rounded-full px-3 text-[11px] uppercase tracking-widest transition-all",
                      type === t.value
                        ? "bg-white text-[hsl(var(--primary-foreground))] font-medium"
                        : "bg-white/5 text-muted-foreground ring-1 ring-white/10 hover:text-foreground hover:bg-white/10",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Active filters
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="outline">
                {category === "all"
                  ? "All topics"
                  : BOOK_CATEGORIES.find((c) => c.key === category)?.label}
              </Badge>
              <Badge tone="outline">
                {type === ""
                  ? "All types"
                  : TYPES.find((t) => t.value === type)?.label}
              </Badge>
              <Badge tone="outline">
                {q.trim() === "" ? "Any title" : `“${q.trim()}”`}
              </Badge>
            </div>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
