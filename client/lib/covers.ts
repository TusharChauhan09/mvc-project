import { API_BASE } from "./api";

export const COVER_FALLBACK = "/cover-placeholder.svg";

export function normalizeCoverUrl(url: string | null | undefined) {
  const raw = url?.trim();
  if (!raw) return null;
  if (raw.startsWith("/")) return raw;

  if (/^(books\.google\.com|covers\.openlibrary\.org|openlibrary\.org)\//i.test(raw)) {
    return normalizeCoverUrl(`https://${raw}`);
  }

  const normalized = raw
    .replace(/^\/\//, "https://")
    .replace(/^http:\/\//, "https://");

  try {
    const parsed = new URL(normalized);

    if (
      parsed.hostname === "books.google.com" &&
      parsed.pathname === "/books/content"
    ) {
      if (!parsed.searchParams.has("printsec")) {
        parsed.searchParams.set("printsec", "frontcover");
      }
      if (!parsed.searchParams.has("img")) {
        parsed.searchParams.set("img", "1");
      }
      if (!parsed.searchParams.has("zoom")) {
        parsed.searchParams.set("zoom", "2");
      }
      if (!parsed.searchParams.has("source")) {
        parsed.searchParams.set("source", "gbs_api");
      }
    }

    return parsed.toString();
  } catch {
    return normalized;
  }
}

export function coverSrc(url: string | null | undefined) {
  return normalizeCoverUrl(url);
}

export function coverProxySrc(url: string | null | undefined) {
  const normalized = normalizeCoverUrl(url);
  if (!normalized || normalized.startsWith("/")) return null;

  return `${API_BASE}/books/external/cover?url=${encodeURIComponent(normalized)}`;
}
