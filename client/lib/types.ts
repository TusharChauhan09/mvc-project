export type Role = "admin" | "educator" | "reviewer" | "seller" | "student";

export type RoleRequestStatus = "pending" | "approved" | "rejected";

export interface RoleRequest {
  id: number;
  user_id: number;
  requested_role: Role;
  status: RoleRequestStatus;
  reason: string | null;
  decision_note: string | null;
  decided_by: number | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  decider?: User;
}

export type BookStatus = "pending" | "approved" | "rejected";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  institution_id: number | null;
  avatar_url: string | null;
  provider?: string | null;
  created_at: string;
}

export type BookType = "textbook" | "reference" | "ebook";
export type BookSource = "manual" | "google_books" | "open_library";
export type LibraryStatus = "want_to_read" | "reading" | "read";

export interface Book {
  id: number;
  title: string;
  subtitle: string | null;
  authors: string[] | null;
  publisher: string | null;
  published_date: string | null;
  isbn_10: string | null;
  isbn_13: string | null;
  language: string | null;
  page_count: number | null;
  price_paise?: number;
  categories: string[] | null;
  description: string | null;
  thumbnail: string | null;
  preview_link: string | null;
  reader_link: string | null;
  embeddable: boolean;
  viewability: string | null;
  pdf_available: boolean;
  epub_available: boolean;
  type: BookType;
  source: BookSource;
  status?: BookStatus;
  review_note?: string | null;
  external_id: string | null;
  metadata?: Record<string, unknown> | null;
  average_score?: number | null;
  assessments_count?: number;
  created_at: string;
}

export interface ExternalBookHit {
  source: BookSource;
  external_id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  published_date: string | null;
  isbn_10: string | null;
  isbn_13: string | null;
  language: string | null;
  page_count: number | null;
  categories: string[];
  description: string | null;
  thumbnail: string | null;
  preview_link: string | null;
  reader_link: string | null;
  embeddable: boolean;
  viewability: string | null;
  pdf_available: boolean;
  epub_available: boolean;
}

export interface UserBookEntry {
  id: number;
  book_id: number;
  status: LibraryStatus;
  in_cart: boolean;
  created_at: string;
  updated_at: string;
  book?: Book;
}

export interface Criterion {
  id: number;
  key: string;
  name: string;
  description: string | null;
  scale_min: number;
  scale_max: number;
  weight: number;
  is_active: boolean;
  institution_id: number | null;
  sort_order: number;
}

export interface Score {
  id: number;
  criterion_id: number;
  criterion?: Criterion;
  value: number;
  note: string | null;
}

export type AssessmentStatus = "draft" | "submitted" | "archived";

export interface Assessment {
  id: number;
  book_id: number;
  user_id: number;
  institution_id: number | null;
  status: AssessmentStatus;
  overall_score: number | null;
  summary: string | null;
  recommendation: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  book?: Book;
  user?: User;
  scores?: Score[];
}

export type OrderStatus = "created" | "paid" | "failed";

export interface ShippingAddress {
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal: string;
  country?: string;
}

export interface Order {
  id: number;
  user_id: number;
  book_id: number;
  amount: number;
  currency: string;
  status: OrderStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  shipping: ShippingAddress;
  book?: Book;
  user?: User;
  created_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
  links?: { prev: string | null; next: string | null };
}
