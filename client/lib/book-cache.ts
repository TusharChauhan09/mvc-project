import type { Book } from "./types";

const KEY_PREFIX = "book_detail_v1:";

export function cacheBook(book: Book) {
  if (typeof window === "undefined" || !book?.id) return;
  try {
    window.localStorage.setItem(KEY_PREFIX + book.id, JSON.stringify(book));
  } catch {
    // ignore quota errors
  }
}

export function cacheBooks(books: Book[]) {
  for (const b of books) cacheBook(b);
}

export function readCachedBook(id: number): Book | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + id);
    return raw ? (JSON.parse(raw) as Book) : null;
  } catch {
    return null;
  }
}
