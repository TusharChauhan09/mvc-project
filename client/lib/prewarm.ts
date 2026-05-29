"use client";

import { mutateCache } from "./use-cached";
import { cacheBooks } from "./book-cache";
import {
  AdminBooks,
  Assessments,
  Books,
  Criteria,
  Orders,
  PersonalLibrary,
  RoleRequests,
  SellerBooks,
} from "./endpoints";
import type { Role } from "./types";

let prewarmed = false;
let prewarmedRole: Role | null = null;

/**
 * Once the user is confirmed authed, fire background fetches for every page's
 * landing dataset and seed the SWR cache. Subsequent navigation reads from cache
 * instantly and refreshes silently. Role-specific data (seller/admin) is also
 * prewarmed so role-gated pages open instantly.
 */
export function prewarmDataForUser(role?: Role | null) {
  if (typeof window === "undefined") return;
  if (prewarmed && prewarmedRole === (role ?? null)) return;
  prewarmed = true;
  prewarmedRole = role ?? null;

  void Books.list({})
    .then((r) => {
      mutateCache("dashboard:books", r);
      cacheBooks(r.data);
    })
    .catch(() => {});

  void Assessments.list({})
    .then((r) => {
      mutateCache("dashboard:assessments", r);
      mutateCache("assessments:list", r);
    })
    .catch(() => {});

  void PersonalLibrary.list({ per_page: 100 })
    .then((r) => mutateCache("profile:library", r))
    .catch(() => {});

  void Criteria.list()
    .then((r) => mutateCache("criteria:list", r))
    .catch(() => {});

  void Orders.mine()
    .then((r) => mutateCache("profile:orders", r))
    .catch(() => {});

  void RoleRequests.mine()
    .then((r) => mutateCache("me:role-requests", r))
    .catch(() => {});

  if (role === "seller" || role === "admin") {
    void SellerBooks.mine()
      .then((r) => mutateCache("seller:books", r))
      .catch(() => {});
  }

  if (role === "admin") {
    void RoleRequests.adminList()
      .then((r) => mutateCache("admin:role-requests", r))
      .catch(() => {});
    void AdminBooks.list("pending")
      .then((r) => mutateCache("admin:books:pending", r))
      .catch(() => {});
  }
}

export function resetPrewarm() {
  prewarmed = false;
  prewarmedRole = null;
}
