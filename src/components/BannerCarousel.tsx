// components/BannerCarousel.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Banner } from "@/lib/types";

export default function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0);
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    if (current >= banners.length) setCurrent(0);
  }, [banners.length, current]);

  // Preload next banner in background for instant transitions
  useEffect(() => {
    if (banners.length <= 1) return;
    const next = banners[(current + 1) % banners.length];
    if (!next?.imageUrl || loadedMap[next.imageUrl]) return;

    const img = new Image();
    img.src = next.imageUrl;
    img.onload = () => setLoadedMap((m) => ({ ...m, [next.imageUrl]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, banners]);

  if (banners.length === 0) return null;

  const banner = banners[current];
  const isLoaded = loadedMap[banner.imageUrl];

  return (
    <section
      className="
        relative w-full overflow-hidden bg-gray-100
        h-[160px]
        sm:h-[220px]
        md:h-[280px]
        lg:h-[340px]
        xl:h-[400px]
        2xl:h-[420px]
      "
    >
      <Link href={banner.link || "#"} className="block w-full h-full relative">
        {/* ── Skeleton shimmer — visible until image loads ── */}
        {!isLoaded && (
          <div className="absolute inset-0 overflow-hidden bg-gray-200">
            {/* Base gradient tint */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200" />

            {/* Sweeping shine */}
            <div className="absolute inset-0 -translate-x-full animate-[bannerShimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />

            {/* Optional skeleton "content" blocks to mimic banner layout */}
            <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-8 gap-2">
              <div className="h-4 md:h-6 w-1/3 rounded bg-gray-300/80" />
              <div className="h-2 md:h-3 w-2/3 rounded bg-gray-300/60" />
            </div>
          </div>
        )}

        {/* ── Banner image — stretch to fill ── */}
        <img
          key={banner.imageUrl}
          src={banner.imageUrl}
          alt={banner.title || "Banner"}
          className={`w-full h-full object-fill transition-opacity duration-500 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          loading={current === 0 ? "eager" : "lazy"}
          onLoad={() =>
            setLoadedMap((m) => ({ ...m, [banner.imageUrl]: true }))
          }
          onError={() =>
            setLoadedMap((m) => ({ ...m, [banner.imageUrl]: true }))
          }
        />

        {/* Overlay + text — fade in after image loads */}
        {(banner.title || banner.subtitle) && (
          <>
            <div
              className={`absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent transition-opacity duration-500 ${
                isLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
            <div
              className={`absolute inset-0 flex flex-col justify-end p-4 md:p-8 text-white transition-opacity duration-500 ${
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

      {banners.length > 1 && (
        <>
          <button
            onClick={() =>
              setCurrent((c) => (c - 1 + banners.length) % banners.length)
            }
            aria-label="Previous banner"
            className="
              absolute left-2 md:left-4 top-1/2 -translate-y-1/2
              bg-white/80 hover:bg-white rounded-full
              p-1.5 md:p-2
              z-10 shadow-md transition
            "
          >
            <ChevronLeft size={20} className="md:hidden" />
            <ChevronLeft size={24} className="hidden md:block" />
          </button>

          <button
            onClick={() => setCurrent((c) => (c + 1) % banners.length)}
            aria-label="Next banner"
            className="
              absolute right-2 md:right-4 top-1/2 -translate-y-1/2
              bg-white/80 hover:bg-white rounded-full
              p-1.5 md:p-2
              z-10 shadow-md transition
            "
          >
            <ChevronRight size={20} className="md:hidden" />
            <ChevronRight size={24} className="hidden md:block" />
          </button>

          <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2 z-10">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to banner ${i + 1}`}
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

      {/* ── Keyframes for the shimmer (scoped to this component) ── */}
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
