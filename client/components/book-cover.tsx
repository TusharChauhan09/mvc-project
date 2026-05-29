"use client";

import { useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { coverProxySrc, coverSrc, COVER_FALLBACK } from "@/lib/covers";

type BookCoverProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src: string | null | undefined;
  alt: string;
  /** Text shown on the generated fallback when no cover image is available. Defaults to `alt`. */
  title?: string;
};

// Deterministic gradient per title so each missing-cover looks distinct but stable.
const FALLBACK_GRADIENTS: [string, string][] = [
  ["#1e3a8a", "#0f172a"],
  ["#312e81", "#0f172a"],
  ["#3730a3", "#111827"],
  ["#155e75", "#0f172a"],
  ["#374151", "#0f172a"],
  ["#4c1d95", "#0f172a"],
  ["#1f2937", "#0b1120"],
];

function gradientFor(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return FALLBACK_GRADIENTS[Math.abs(hash) % FALLBACK_GRADIENTS.length];
}

export function BookCover({
  src,
  alt,
  title,
  onError,
  loading,
  decoding,
  className,
  ...props
}: BookCoverProps) {
  const directSrc = coverSrc(src) ?? COVER_FALLBACK;
  const proxySrc = coverProxySrc(src);
  const [failedSrcs, setFailedSrcs] = useState<string[]>([]);

  const directFailed = failedSrcs.includes(directSrc);
  const proxyFailed = proxySrc ? failedSrcs.includes(proxySrc) : false;

  // Try CDN direct first (fast). Fall back to backend proxy only if direct fails (CORS/hotlink block).
  let currentSrc: string;
  if (directSrc !== COVER_FALLBACK && !directFailed) {
    currentSrc = directSrc;
  } else if (proxySrc && !proxyFailed) {
    currentSrc = proxySrc;
  } else {
    currentSrc = COVER_FALLBACK;
  }

  // No usable remote cover — render a branded, titled placeholder instead of a blank image.
  if (currentSrc === COVER_FALLBACK) {
    const label = (title ?? alt ?? "").trim();
    const [from, to] = gradientFor(label || "book");
    return (
      <div
        role="img"
        aria-label={alt || "Book cover"}
        className={className}
        style={{
          background: `linear-gradient(150deg, ${from}, ${to})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "10%",
          width: "100%",
          height: "100%",
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: "8%", flexShrink: 0 }}
          aria-hidden
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        {label ? (
          <span
            style={{
              color: "rgba(255,255,255,0.82)",
              fontFamily: "'Instrument Serif', serif",
              fontSize: "clamp(0.7rem, 1.6vw, 0.95rem)",
              lineHeight: 1.15,
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {label}
          </span>
        ) : null}
      </div>
    );
  }

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    onError?.(event);
    setFailedSrcs((prev) =>
      prev.includes(currentSrc) ? prev : [...prev, currentSrc],
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      className={className}
      src={currentSrc}
      alt={alt}
      loading={loading ?? "lazy"}
      decoding={decoding ?? "async"}
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
}
