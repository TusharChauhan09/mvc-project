import { api, API_BASE, getToken } from "./api";
import type {
  Assessment,
  Book,
  Criterion,
  ExternalBookHit,
  Order,
  Paginated,
  Role,
  RoleRequest,
  ShippingAddress,
  User,
  UserBookEntry,
} from "./types";

export const Books = {
  list: (
    params: {
      q?: string;
      type?: string;
      category?: string;
      page?: number;
      per_page?: number;
    } = {},
  ) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.type) sp.set("type", params.type);
    if (params.category) sp.set("category", params.category);
    if (params.page) sp.set("page", String(params.page));
    if (params.per_page) sp.set("per_page", String(params.per_page));
    const qs = sp.toString();
    return api<Paginated<Book>>(`/books${qs ? `?${qs}` : ""}`);
  },
  show: (id: number) => api<{ data: Book }>(`/books/${id}`),
  externalSearch: (q: string, limit = 20) => {
    const sp = new URLSearchParams({ q, limit: String(limit) });
    return api<{ data: ExternalBookHit[] }>(
      `/books/external/search?${sp.toString()}`,
    );
  },
  import: (input: { source: string; external_id: string; type?: string }) =>
    api<{ data: Book }>(`/books/import`, { method: "POST", json: input }),
  create: (input: Partial<Book>) =>
    api<{ data: Book }>(`/books`, { method: "POST", json: input }),
  assessments: (id: number) =>
    api<Paginated<Assessment>>(`/books/${id}/assessments`),
};

export const Criteria = {
  list: () => api<{ data: Criterion[] }>("/criteria"),
  create: (input: Partial<Criterion>) =>
    api<{ data: Criterion }>("/criteria", { method: "POST", json: input }),
  update: (id: number, input: Partial<Criterion>) =>
    api<{ data: Criterion }>(`/criteria/${id}`, { method: "PUT", json: input }),
  remove: (id: number) =>
    api<{ message: string }>(`/criteria/${id}`, { method: "DELETE" }),
};

export const Assessments = {
  list: (params: { book_id?: number; status?: string } = {}) => {
    const sp = new URLSearchParams();
    if (params.book_id) sp.set("book_id", String(params.book_id));
    if (params.status) sp.set("status", params.status);
    const qs = sp.toString();
    return api<Paginated<Assessment>>(`/assessments${qs ? `?${qs}` : ""}`);
  },
  show: (id: number) => api<{ data: Assessment }>(`/assessments/${id}`),
  create: (input: {
    book_id: number;
    summary?: string;
    recommendation?: string;
    scores?: { criterion_id: number; value: number; note?: string }[];
  }) =>
    api<{ data: Assessment }>("/assessments", { method: "POST", json: input }),
  update: (
    id: number,
    input: {
      summary?: string;
      recommendation?: string;
      scores?: { criterion_id: number; value: number; note?: string }[];
    },
  ) =>
    api<{ data: Assessment }>(`/assessments/${id}`, {
      method: "PUT",
      json: input,
    }),
  submit: (id: number) =>
    api<{ data: Assessment }>(`/assessments/${id}/submit`, { method: "POST" }),
  remove: (id: number) =>
    api<{ message: string }>(`/assessments/${id}`, { method: "DELETE" }),
};

export const RoleRequests = {
  mine: () => api<{ data: RoleRequest[] }>("/me/role-requests"),
  create: (input: { requested_role: Role; reason?: string }) =>
    api<{ data: RoleRequest }>("/me/role-requests", {
      method: "POST",
      json: input,
    }),
  adminList: () => api<Paginated<RoleRequest>>("/admin/role-requests"),
  decide: (id: number, input: { status: "approved" | "rejected"; decision_note?: string }) =>
    api<{ data: RoleRequest }>(`/admin/role-requests/${id}`, {
      method: "PATCH",
      json: input,
    }),
};

export const SellerBooks = {
  mine: () => api<{ data: Book[] }>("/me/seller/books"),
  /** Submit a new book with optional cover image via multipart upload. */
  create: async (input: {
    title: string;
    subtitle?: string;
    authors?: string;
    publisher?: string;
    published_date?: string;
    isbn_10?: string;
    isbn_13?: string;
    language?: string;
    page_count?: number;
    categories?: string;
    description?: string;
    type?: string;
    cover?: File | null;
  }): Promise<{ data: Book }> => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined || v === null || v === "") continue;
      if (v instanceof File) fd.append(k, v);
      else fd.append(k, String(v));
    }
    const token = getToken();
    const res = await fetch(`${API_BASE}/me/seller/books`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: fd,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (json && (json.message || json.error)) || `Upload failed (${res.status})`;
      throw new Error(msg);
    }
    return json as { data: Book };
  },
};

export const AdminBooks = {
  list: (
    status: "pending" | "approved" | "rejected" | "all" = "pending",
    q?: string,
  ) => {
    const sp = new URLSearchParams({ status });
    if (q) sp.set("q", q);
    return api<Paginated<Book>>(`/admin/books?${sp.toString()}`);
  },
  approve: (id: number) =>
    api<{ data: Book }>(`/admin/books/${id}/approve`, { method: "PATCH" }),
  reject: (id: number, note?: string) =>
    api<{ data: Book }>(`/admin/books/${id}/reject`, {
      method: "PATCH",
      json: note ? { note } : {},
    }),
  update: (id: number, input: Partial<Book> & { price_paise?: number }) =>
    api<{ data: Book }>(`/admin/books/${id}`, { method: "PATCH", json: input }),
  remove: (id: number) =>
    api<{ message: string }>(`/admin/books/${id}`, { method: "DELETE" }),
};

export const AdminUsers = {
  list: (params: { q?: string; role?: Role | "" } = {}) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.role) sp.set("role", params.role);
    const qs = sp.toString();
    return api<Paginated<User>>(`/admin/users${qs ? `?${qs}` : ""}`);
  },
  sellers: () => api<Paginated<User & { seller_books_count?: number }>>("/admin/sellers"),
  show: (id: number) => api<{ data: User }>(`/admin/users/${id}`),
  update: (
    id: number,
    input: { name?: string; email?: string; role?: Role; password?: string | null },
  ) =>
    api<{ data: User }>(`/admin/users/${id}`, { method: "PATCH", json: input }),
  remove: (id: number) =>
    api<{ message: string }>(`/admin/users/${id}`, { method: "DELETE" }),
};

export const Orders = {
  create: (input: { book_id: number; shipping: ShippingAddress }) =>
    api<{
      data: Order;
      razorpay: { key_id: string; order_id: string; amount: number; currency: string };
    }>("/orders", { method: "POST", json: input }),
  verify: (input: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) =>
    api<{ message: string; data: Order }>("/orders/verify", {
      method: "POST",
      json: input,
    }),
  mine: () => api<Paginated<Order>>("/me/orders"),
};

export const AdminOrders = {
  list: (params: { status?: string; q?: string } = {}) => {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", params.status);
    if (params.q) sp.set("q", params.q);
    const qs = sp.toString();
    return api<Paginated<Order>>(`/admin/orders${qs ? `?${qs}` : ""}`);
  },
  show: (id: number) => api<{ data: Order }>(`/admin/orders/${id}`),
};

export const PersonalLibrary = {
  list: (
    params: {
      status?: string;
      in_cart?: boolean;
      book_id?: number;
      per_page?: number;
    } = {},
  ) => {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", params.status);
    if (params.in_cart !== undefined) sp.set("in_cart", String(params.in_cart));
    if (params.book_id) sp.set("book_id", String(params.book_id));
    if (params.per_page) sp.set("per_page", String(params.per_page));
    const qs = sp.toString();
    return api<Paginated<UserBookEntry>>(`/me/library${qs ? `?${qs}` : ""}`);
  },
  add: (input: { book_id: number; status?: string; in_cart?: boolean }) =>
    api<{ data: UserBookEntry }>(`/me/library`, {
      method: "POST",
      json: input,
    }),
  update: (bookId: number, input: { status?: string; in_cart?: boolean }) =>
    api<{ data: UserBookEntry }>(`/me/library/${bookId}`, {
      method: "PATCH",
      json: input,
    }),
  remove: (bookId: number) =>
    api<{ message: string }>(`/me/library/${bookId}`, { method: "DELETE" }),
};
