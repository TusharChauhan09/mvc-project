"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import { RequireAuth } from "@/components/require-auth";
import { GoogleBooksViewer } from "@/components/google-books-viewer";
import { Books } from "@/lib/endpoints";
import { readCachedBook } from "@/lib/book-cache";
import type { Book } from "@/lib/types";

export default function ReadPage({
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
  const initial = typeof window === "undefined" ? null : readCachedBook(id);
  const [book, setBook] = useState<Book | null>(initial);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    let active = true;
    Books.show(id)
      .then((r) => active && setBook(r.data))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const readerLink = book?.reader_link ?? book?.preview_link ?? null;
  const isGoogle = book?.source === "google_books" && !!book?.external_id;

  return (
    // Fixed overlay so reading mode takes the whole screen, above the page chrome.
    <div className="fixed inset-0 z-[60] flex flex-col bg-[hsl(var(--background))]">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <Link
          href={`/books/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon.ArrowRight className="h-4 w-4 rotate-180" />
          Back to book
        </Link>
        <p
          className="min-w-0 flex-1 truncate text-center text-base text-foreground sm:text-lg"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {book?.title ?? "Reading"}
        </p>
        <div className="flex items-center gap-2">
          {readerLink && (
            <a href={readerLink} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Icon.Globe />
                <span className="hidden sm:inline">Open in Google</span>
              </Button>
            </a>
          )}
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden p-3 sm:p-5">
        {loading && !book ? (
          <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
            <Spinner />
            Loading…
          </div>
        ) : !book ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Icon.Book className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Book not found.</p>
            <Link href="/books">
              <Button>Back to library</Button>
            </Link>
          </div>
        ) : isGoogle ? (
          <GoogleBooksViewer
            volumeId={book.external_id}
            readerLink={readerLink}
            title={book.title}
            className="h-full"
          />
        ) : readerLink ? (
          <iframe
            src={readerLink}
            title={`${book.title} reader`}
            className="h-full w-full rounded-xl border border-white/10 bg-white"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Icon.BookOpen className="h-8 w-8 text-muted-foreground" />
            <p className="max-w-sm text-sm text-muted-foreground">
              No readable preview is available for this title.
            </p>
            <Link href={`/books/${id}`}>
              <Button variant="outline">Back to book</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
