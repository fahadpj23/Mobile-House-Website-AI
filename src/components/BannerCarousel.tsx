// components/BannerCarousel.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/lib/types";

const AUTOPLAY_MS = 5000;

export default function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0);
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});
  const [failedMap, setFailedMap] = useState<Record<string, boolean>>({});
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Keep index valid if banners shrink
  useEffect(() => {
    if (banners.length === 0) return;
    if (current >= banners.length) setCurrent(0);
  }, [banners.length, current]);

  const markLoaded = useCallback((url: string) => {
    if (!url) return;
    setLoadedMap((m) => (m[url] ? m : { ...m, [url]: true }));
  }, []);

  const markFailed = useCallback((url: string) => {
    if (!url) return;
    setFailedMap((m) => (m[url] ? m : { ...m, [url]: true }));
    setLoadedMap((m) => (m[url] ? m : { ...m, [url]: true }));
  }, []);

  // Background preload for slides 2..N — after mount, so it never
  // competes with first-paint network requests.
  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = window.setTimeout(() => {
      banners.slice(1).forEach((b) => {
        const url = b.imageUrl;
        if (!url) return;
        if (loadedMap[url] || failedMap[url]) return;

        const img = new window.Image();
        img.src = url;
        img.onload = () => markLoaded(url);
        img.onerror = () => markFailed(url);
      });
    }, 1200); // delay so hero #1 wins the network race

    return () => window.clearTimeout(timer);
  }, [banners, loadedMap, failedMap, markLoaded, markFailed]);

  // Recover from missed onLoad (cache / hydration race)
  useEffect(() => {
    const img = imgRef.current;
    const url = banners[current]?.imageUrl;
    if (!img || !url) return;
    if (img.complete && img.naturalWidth > 0) markLoaded(url);
  }, [current, banners, markLoaded]);

  // Autoplay only once current banner is ready
  useEffect(() => {
    if (banners.length <= 1) return;
    const url = banners[current]?.imageUrl;
    if (!url || !loadedMap[url] || failedMap[url]) return;

    const t = window.setTimeout(() => {
      setCurrent((c) => (c + 1) % banners.length);
    }, AUTOPLAY_MS);

    return () => window.clearTimeout(t);
  }, [current, banners, loadedMap, failedMap]);

  const normalizedImageUrl = useMemo(() => {
    const url = banners[current]?.imageUrl?.trim();
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return url.startsWith("/") ? url : `/${url}`;
  }, [banners, current]);

  if (banners.length === 0) return null;

  const banner = banners[current];
  const hasImage = Boolean(normalizedImageUrl);
  const isLoaded = hasImage ? Boolean(loadedMap[normalizedImageUrl]) : true;
  const isFailed = hasImage ? Boolean(failedMap[normalizedImageUrl]) : true;

  const goPrev = () =>
    setCurrent((c) => (c - 1 + banners.length) % banners.length);
  const goNext = () => setCurrent((c) => (c + 1) % banners.length);

  return (
    <section
      className="
        relative w-full overflow-hidden bg-gray-100 mb-4 md:mb-8
        h-[160px] sm:h-[220px] md:h-[280px] lg:h-[340px] xl:h-[400px] 2xl:h-[420px]
      "
    >
      <Link
        href={banner.link || "#"}
        className="block w-full h-full relative"
        aria-label={banner.title || "Banner"}
      >
        {/* Skeleton shimmer */}
        {!isLoaded && (
          <div className="absolute inset-0 overflow-hidden bg-gray-200">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200" />
            <div className="absolute inset-0 -translate-x-full animate-[bannerShimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-8 gap-2">
              <div className="h-4 md:h-6 w-1/3 rounded bg-gray-300/80" />
              <div className="h-2 md:h-3 w-2/3 rounded bg-gray-300/60" />
            </div>
          </div>
        )}

        {/* Image — object-fill stretches to container */}
        {isFailed || !hasImage ? (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400" />
        ) : (
          <Image
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ref={imgRef as any}
            key={normalizedImageUrl}
            src={normalizedImageUrl}
            alt={banner.title || "Banner"}
            fill
            // Only the very first banner loads with priority
            priority={current === 0}
            // All other slides lazy-load via next/image default
            loading={current === 0 ? "eager" : "lazy"}
            sizes="100vw"
            className={`object-fill transition-opacity duration-500 ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => markLoaded(normalizedImageUrl)}
            onError={() => markFailed(normalizedImageUrl)}
          />
        )}

        {/* Overlay + text */}
        {(banner.title || banner.subtitle) && (
          <>
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent transition-opacity duration-500 ${
                isLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
            <div
              className={`pointer-events-none absolute inset-0 flex flex-col justify-end p-4 md:p-8 text-white transition-opacity duration-500 ${
                isLoaded ? "opacity-100" : "opacity-0"
              }`}
            >
              {banner.title && (
                <h2 className="text-lg md:text-2xl lg:text-3xl font-bold tracking-tight drop-shadow-md">
                  {banner.title}
                </h2>
              )}
              {banner.subtitle && (
                <p className="text-xs md:text-sm text-gray-100 mt-1 max-w-xl drop-shadow">
                  {banner.subtitle}
                </p>
              )}
            </div>
          </>
        )}
      </Link>

      {/* Navigation */}
      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous banner"
            className="
              absolute left-2 md:left-4 top-1/2 -translate-y-1/2
              bg-white/80 hover:bg-white rounded-full
              p-1.5 md:p-2 z-10 shadow-md transition
            "
          >
            <ChevronLeft size={20} className="md:hidden" />
            <ChevronLeft size={24} className="hidden md:block" />
          </button>

          <button
            type="button"
            onClick={goNext}
            aria-label="Next banner"
            className="
              absolute right-2 md:right-4 top-1/2 -translate-y-1/2
              bg-white/80 hover:bg-white rounded-full
              p-1.5 md:p-2 z-10 shadow-md transition
            "
          >
            <ChevronRight size={20} className="md:hidden" />
            <ChevronRight size={24} className="hidden md:block" />
          </button>

          <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2 z-10">
            {banners.map((b, i) => (
              <button
                type="button"
                key={`${b.imageUrl || "slide"}-${i}`}
                onClick={() => setCurrent(i)}
                aria-label={`Go to banner ${i + 1}`}
                aria-current={i === current}
                className={`
                  rounded-full transition-all duration-300
                  ${
                    i === current
                      ? "bg-white w-5 md:w-6 h-1.5 md:h-2"
                      : "bg-white/50 hover:bg-white/80 w-1.5 md:w-2 h-1.5 md:h-2"
                  }
                `}
              />
            ))}
          </div>
        </>
      )}

      {/* Shimmer keyframes */}
      <style jsx>{`
        @keyframes bannerShimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </section>
  );
}
