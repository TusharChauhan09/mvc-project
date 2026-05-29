"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { Icon } from "./icons";
import { Avatar, cx } from "./ui";
import { NotificationBell } from "./notification-bell";

const PUBLIC_LINKS = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Sign in" },
];

type AppLink = {
  href: string;
  label: string;
  adminOnly?: boolean;
  sellerOnly?: boolean;
};

const APP_LINKS: AppLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/books", label: "Library" },
  { href: "/assessments", label: "Reviews" },
  { href: "/shelf", label: "My shelf" },
  { href: "/seller", label: "Seller", sellerOnly: true },
  { href: "/admin", label: "Admin", adminOnly: true },
  { href: "/criteria", label: "Rubric", adminOnly: true },
];

export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = user
    ? APP_LINKS.filter((l) => {
        if (l.adminOnly && user.role !== "admin") return false;
        if (l.sellerOnly && user.role !== "seller" && user.role !== "admin")
          return false;
        return true;
      })
    : PUBLIC_LINKS;
  const headerBg =
    transparent && !scrolled
      ? "bg-transparent"
      : "bg-[hsl(var(--background)/0.6)] backdrop-blur-xl border-b border-white/5";

  function closeMobileMenu(event: MouseEvent<HTMLElement>) {
    event.currentTarget.closest("details")?.removeAttribute("open");
  }

  return (
    <header
      className={cx(
        "sticky top-0 z-50 transition-colors duration-300",
        headerBg,
      )}
    >
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 md:px-8 md:py-6">
        <Link
          href={user ? "/books" : "/"}
          className="min-w-0 select-none truncate font-serif text-2xl text-foreground sm:text-3xl"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          Bookify<sup className="text-xs">&reg;</sup>
        </Link>

        <nav className="hidden items-center gap-6 md:flex lg:gap-8">
          {links.map((it) => {
            const active =
              pathname === it.href ||
              (it.href !== "/" && pathname.startsWith(it.href));
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cx(
                  "text-sm transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!loading && !user && (
            <Link
              href="/login"
              className="liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground transition-transform hover:scale-[1.03]"
            >
              Begin Journey
            </Link>
          )}
          {user && (
            <>
              <span className="hidden text-xs uppercase tracking-widest text-muted-foreground sm:inline">
                {user.role}
              </span>
              <NotificationBell />
              <Link
                href="/profile"
                className="liquid-glass flex items-center gap-2 rounded-full px-2 py-1.5 text-sm text-foreground transition-transform hover:scale-[1.03]"
              >
                <Avatar
                  name={user.name ?? "Profile"}
                  src={user.avatar_url ?? undefined}
                  size="sm"
                />
                <span className="hidden sm:inline">Profile</span>
              </Link>
              <button
                onClick={() => logout()}
                className="liquid-glass rounded-full px-5 py-2 text-sm text-foreground transition-transform hover:scale-[1.03]"
              >
                Sign out
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {user && <NotificationBell />}
          <details className="group">
          <summary
            className="liquid-glass flex h-10 w-10 flex-shrink-0 list-none items-center justify-center rounded-full text-foreground [&::-webkit-details-marker]:hidden"
            role="button"
            aria-controls="mobile-navigation"
            aria-label="Open navigation"
          >
            <Icon.Menu className="group-open:hidden" />
            <Icon.X className="hidden group-open:block" />
          </summary>

          <div
            id="mobile-navigation"
            className="fixed inset-x-0 top-[72px] border-t border-white/10 bg-[hsl(var(--background)/0.9)] backdrop-blur-xl"
          >
            <nav className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6">
              {links.map((it) => {
                const active =
                  pathname === it.href ||
                  (it.href !== "/" && pathname.startsWith(it.href));
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={closeMobileMenu}
                    className={cx(
                      "rounded-lg px-3 py-3 text-sm transition-colors",
                      active
                        ? "bg-white/10 text-foreground"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    {it.label}
                  </Link>
                );
              })}

              <div className="mt-2 border-t border-white/10 pt-3">
                {!loading && !user && (
                  <Link
                    href="/login"
                    onClick={closeMobileMenu}
                    className="liquid-glass flex w-full items-center justify-center rounded-full px-5 py-3 text-sm text-foreground transition-transform hover:scale-[1.02]"
                  >
                    Begin Journey
                  </Link>
                )}
                {user && (
                  <div className="flex flex-col gap-3">
                    <span className="px-3 text-xs uppercase tracking-widest text-muted-foreground">
                      {user.role}
                    </span>
                    <Link
                      href="/profile"
                      onClick={closeMobileMenu}
                      className="liquid-glass flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm text-foreground transition-transform hover:scale-[1.02]"
                    >
                      <Avatar
                        name={user.name ?? "Profile"}
                        src={user.avatar_url ?? undefined}
                        size="sm"
                      />
                      Profile
                    </Link>
                    <button
                      onClick={(event) => {
                        closeMobileMenu(event);
                        void logout();
                      }}
                      className="liquid-glass flex w-full items-center justify-center rounded-full px-5 py-3 text-sm text-foreground transition-transform hover:scale-[1.02]"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>
          </details>
        </div>
      </div>
    </header>
  );
}
