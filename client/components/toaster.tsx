"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Toast = {
  id: number;
  title: string;
  description?: string;
  tone?: "default" | "success" | "error";
};

const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(
  null,
);

let _push: ((t: Omit<Toast, "id">) => void) | null = null;

export function toast(input: Omit<Toast, "id">) {
  _push?.(input);
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  return ctx?.push ?? (() => {});
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { ...t, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4000);
  }, []);

  useEffect(() => {
    _push = push;
    return () => {
      if (_push === push) _push = null;
    };
  }, [push]);

  return (
    <ToastCtx.Provider value={{ push }}>
      <div className="fixed bottom-4 left-4 right-4 z-50 flex max-w-sm flex-col gap-2 sm:bottom-6 sm:left-auto sm:right-6">
        {items.map((t) => (
          <div
            key={t.id}
            className={`fade-up rounded-lg border bg-surface px-4 py-3 shadow-md ${
              t.tone === "error"
                ? "border-danger/40"
                : t.tone === "success"
                  ? "border-success/40"
                  : "border-border"
            }`}
          >
            <p className="text-sm font-medium">{t.title}</p>
            {t.description && (
              <p className="text-xs text-muted mt-0.5">{t.description}</p>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
