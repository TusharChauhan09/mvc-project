"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { cx } from "./ui";
import { Notifications } from "@/lib/endpoints";
import type { UserNotification } from "@/lib/types";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement | null>(null);

  // No synchronous setState here — the first state change happens after the
  // await, so mounting this in an effect doesn't trigger cascading renders.
  const load = useCallback(async () => {
    try {
      const res = await Notifications.list();
      setItems(res.data);
      setUnread(res.unread_count);
    } catch {
      // ignore — bell stays empty
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + light polling so broadcasts surface without a refresh.
  useEffect(() => {
    // Fetch-on-mount + poll; setState only happens post-await inside load().
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      await load();
      if (unread > 0) {
        // Optimistically clear the badge; persist in background.
        setUnread(0);
        setItems((prev) =>
          prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
        );
        void Notifications.markAll().catch(() => {});
      }
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label="Notifications"
        className="liquid-glass relative flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-transform hover:scale-[1.03]"
      >
        <Icon.Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--danger))] px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[hsl(var(--background)/0.96)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <p className="text-sm font-medium text-foreground">Notifications</p>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setUnread(0);
                  void Notifications.markAll().catch(() => {});
                  setItems((prev) =>
                    prev.map((n) =>
                      n.read_at ? n : { ...n, read_at: new Date().toISOString() },
                    ),
                  );
                }}
                className="text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Icon.Bell className="mx-auto h-6 w-6 text-muted-foreground/60" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No notifications yet
                </p>
              </div>
            ) : (
              items.map((n, i) => (
                <div
                  key={n.id}
                  className={cx(
                    "px-4 py-3",
                    i !== 0 && "border-t border-white/5",
                    !n.read_at && "bg-white/[0.03]",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.read_at && (
                      <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-sky-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground/70">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
