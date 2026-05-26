"use client";

import { useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { coverProxySrc, coverSrc, COVER_FALLBACK } from "@/lib/covers";

type BookCoverProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src: string | null | undefined;
  alt: string;
};

export function BookCover({ src, alt, onError, loading, decoding, ...props }: BookCoverProps) {
  const directSrc = coverSrc(src) ?? COVER_FALLBACK;
  const proxySrc = coverProxySrc(src);
  const [failedSrcs, setFailedSrcs] = useState<string[]>([]);

  const directFailed = failedSrcs.includes(directSrc);
  const proxyFailed = proxySrc ? failedSrcs.includes(proxySrc) : false;

  // Try CDN direct first (fast). Fall back to backend proxy only if direct fails (CORS/hotlink block).
  let currentSrc: string;
  if (!directFailed) {
    currentSrc = directSrc;
  } else if (proxySrc && !proxyFailed) {
    currentSrc = proxySrc;
  } else {
    currentSrc = COVER_FALLBACK;
  }

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    onError?.(event);
    if (currentSrc === COVER_FALLBACK) {
      return;
    }
    setFailedSrcs((prev) =>
      prev.includes(currentSrc) ? prev : [...prev, currentSrc],
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      loading={loading ?? "lazy"}
      decoding={decoding ?? "async"}
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
}
