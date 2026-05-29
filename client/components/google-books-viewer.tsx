"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";

declare global {
  interface Window {
    google?: {
      books?: {
        load: () => void;
        setOnLoadCallback: (callback: () => void) => void;
        DefaultViewer: new (element: HTMLElement) => {
          load: (
            identifier: string,
            notFoundCallback?: () => void,
            successCallback?: () => void,
          ) => void;
        };
      };
    };
  }
}

let googleBooksReady: Promise<void> | null = null;

function loadGoogleBooks() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Books viewer requires a browser."));
  }

  if (window.google?.books?.DefaultViewer) {
    return Promise.resolve();
  }

  if (googleBooksReady) {
    return googleBooksReady;
  }

  googleBooksReady = new Promise((resolve, reject) => {
    const loadBooks = () => {
      if (!window.google?.books) {
        reject(new Error("Google Books viewer failed to load."));
        return;
      }

      window.google.books.load();
      window.google.books.setOnLoadCallback(resolve);
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.google.com/books/jsapi.js"]',
    );
    if (existing) {
      if (window.google?.books) {
        loadBooks();
        return;
      }
      existing.addEventListener("load", loadBooks, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Google Books script failed.")),
        {
          once: true,
        },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.google.com/books/jsapi.js";
    script.async = true;
    script.onload = loadBooks;
    script.onerror = () => reject(new Error("Google Books script failed."));
    document.head.appendChild(script);
  });

  return googleBooksReady;
}

export function GoogleBooksViewer({
  volumeId,
  readerLink,
  title,
  className,
}: {
  volumeId: string | null;
  readerLink?: string | null;
  embeddable?: boolean;
  title: string;
  className?: string;
}) {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    volumeId ? "loading" : "unavailable",
  );

  useEffect(() => {
    let active = true;
    if (!volumeId || !viewerRef.current) {
      setStatus("unavailable");
      return;
    }

    setStatus("loading");
    const node = viewerRef.current;
    let observer: MutationObserver | null = null;
    let timeoutId: number | null = null;

    const markReady = () => active && setStatus("ready");
    const markUnavailable = () => active && setStatus("unavailable");
    const watchForIframe = () => {
      if (!node || !active) return;
      if (node.querySelector("iframe")) {
        markReady();
        return;
      }
      observer = new MutationObserver(() => {
        if (!active || !node) return;
        if (node.querySelector("iframe")) {
          markReady();
          observer?.disconnect();
          observer = null;
        }
      });
      observer.observe(node, { childList: true, subtree: true });
    };

    loadGoogleBooks()
      .then(() => {
        if (!active || !node || !window.google?.books) return;
        const viewer = new window.google.books.DefaultViewer(node);
        viewer.load(
          volumeId,
          () => markUnavailable(),
          () => markReady(),
        );
        watchForIframe();
        timeoutId = window.setTimeout(() => {
          if (!active) return;
          setStatus((prev) => (prev === "loading" ? "unavailable" : prev));
        }, 8000);
      })
      .catch(() => markUnavailable());

    return () => {
      active = false;
      observer?.disconnect();
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [volumeId]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] ${
        className ?? "min-h-[420px]"
      }`}
    >
      <div
        ref={viewerRef}
        className="absolute inset-0 bg-white"
        aria-label={`${title} preview`}
      />
      {status !== "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[hsl(var(--background))]/95 p-6 text-center">
          <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-muted-foreground">
            {status === "loading" ? (
              <Icon.Loader className="animate-spin" />
            ) : (
              <Icon.BookOpen />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {status === "loading"
                ? "Loading Google preview"
                : "Embedded preview unavailable"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Google only allows page previews for some volumes. Use the reader
              link when a preview is restricted.
            </p>
          </div>
          {readerLink && (
            <a href={readerLink} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Icon.BookOpen />
                Open Google reader
              </Button>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
