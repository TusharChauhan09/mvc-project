import type { Book, ExternalBookHit } from "./types";

export type BookCategoryKey =
  | "all"
  | "study-preparation"
  | "mathematics"
  | "science"
  | "computer-science"
  | "engineering"
  | "medicine"
  | "business"
  | "romance"
  | "history"
  | "literature"
  | "children"
  | "philosophy"
  | "psychology";

export const BOOK_CATEGORIES: {
  key: BookCategoryKey;
  label: string;
  query: string;
  terms: string[];
}[] = [
  { key: "all", label: "All", query: "", terms: [] },
  {
    key: "study-preparation",
    label: "Study preparation",
    query: "study guide exam preparation",
    terms: ["study", "exam", "preparation", "guide", "test", "entrance"],
  },
  {
    key: "mathematics",
    label: "Maths",
    query: "subject:mathematics",
    terms: ["mathematics", "math", "algebra", "calculus", "geometry", "statistics"],
  },
  {
    key: "science",
    label: "Science",
    query: "subject:science",
    terms: ["science", "physics", "chemistry", "biology", "astronomy"],
  },
  {
    key: "computer-science",
    label: "Computer science",
    query: "subject:computers",
    terms: ["computer", "programming", "software", "data", "algorithm"],
  },
  {
    key: "engineering",
    label: "Engineering",
    query: "subject:technology engineering",
    terms: ["engineering", "technology", "mechanical", "electrical", "civil"],
  },
  {
    key: "medicine",
    label: "Medicine",
    query: "subject:medicine",
    terms: ["medicine", "medical", "anatomy", "health", "nursing"],
  },
  {
    key: "business",
    label: "Business",
    query: "subject:business",
    terms: ["business", "management", "economics", "finance", "marketing"],
  },
  {
    key: "romance",
    label: "Romance",
    query: "subject:romance",
    terms: ["romance", "romantic", "love"],
  },
  {
    key: "history",
    label: "History",
    query: "subject:history",
    terms: ["history", "historical", "civilization", "war"],
  },
  {
    key: "literature",
    label: "Literature",
    query: "subject:literary",
    terms: ["literature", "literary", "fiction", "poetry", "drama"],
  },
  {
    key: "children",
    label: "Children",
    query: "subject:juvenile",
    terms: ["children", "juvenile", "young adult", "school"],
  },
  {
    key: "philosophy",
    label: "Philosophy",
    query: "subject:philosophy",
    terms: ["philosophy", "ethics", "logic", "metaphysics"],
  },
  {
    key: "psychology",
    label: "Psychology",
    query: "subject:psychology",
    terms: ["psychology", "mental", "behavior", "cognitive"],
  },
];

export const VISIBLE_BOOK_CATEGORIES = BOOK_CATEGORIES.filter((c) => c.key !== "all");

export function categorySearchQuery(key: BookCategoryKey, text: string) {
  const category = BOOK_CATEGORIES.find((c) => c.key === key);
  const parts = [text.trim(), category?.query].filter(Boolean);
  return parts.join(" ");
}

export function categoryForBook(book: Pick<Book | ExternalBookHit, "title" | "categories">) {
  const haystack = [book.title, ...(book.categories ?? [])].join(" ").toLowerCase();
  return (
    VISIBLE_BOOK_CATEGORIES.find((category) =>
      category.terms.some((term) => haystack.includes(term)),
    ) ?? VISIBLE_BOOK_CATEGORIES[0]
  );
}
