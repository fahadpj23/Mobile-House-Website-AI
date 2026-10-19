// components/HomeSectionLoader.tsx
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ═══════════════════════════════════════════════════════
   Skeleton building blocks
   ═══════════════════════════════════════════════════════ */
function Sk({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      aria-hidden
    />
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <Sk className="w-full aspect-square rounded-none" />
      <div className="p-2.5 space-y-2">
        <Sk className="h-3 w-4/5" />
        <Sk className="h-3 w-2/3" />
        <Sk className="h-4 w-1/2 mt-1" />
      </div>
    </div>
  );
}

function GridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 md:gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

function BannerSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div
      className={`grid gap-3 ${count === 1 ? "grid-cols-1" : "md:grid-cols-2"}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Sk key={i} className="h-36 md:h-44 rounded-xl" />
      ))}
    </div>
  );
}

function OffersSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
      <div className="flex items-center gap-2.5 mb-4">
        <Sk className="w-0.5 h-6 rounded-full" />
        <Sk className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-white overflow-hidden">
            <Sk className="w-full h-40 rounded-none" />
            <div className="p-3 space-y-2">
              <Sk className="h-4 w-3/4" />
              <Sk className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */
type SkeletonKind = "grid" | "banner" | "offers" | "custom";

type Props<T> = {
  endpoint: string;
  children: (data: T) => ReactNode;
  minHeight?: number | string;
  rootMargin?: string;
  className?: string;
  skeleton?: SkeletonKind;
  skeletonCount?: number;
  skeletonNode?: ReactNode;
};

/* ═══════════════════════════════════════════════════════
   Loader — skeletons only, no spinner
   ═══════════════════════════════════════════════════════ */
export default function HomeSectionLoader<T>({
  endpoint,
  children,
  minHeight = 260,
  rootMargin = "200px 0px",
  className,
  skeleton = "grid",
  skeletonCount,
  skeletonNode,
}: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // 1. Wait until the section is near the viewport.
  useEffect(() => {
    if (started) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setStarted(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [started, rootMargin]);

  // 2. Fetch only after started.
  useEffect(() => {
    if (!started || data || error) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as T;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [started, endpoint, data, error, reloadKey]);

  // 3. Error
  if (error) {
    return (
      <div ref={ref} className={className}>
        <div
          style={{ minHeight }}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gray-50 text-gray-500"
        >
          <p className="text-xs">Could not load this section.</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setReloadKey((k) => k + 1);
            }}
            className="text-xs px-3 py-1.5 border rounded-lg hover:bg-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // 4. Loading — skeleton only
  if (!started || !data) {
    const renderSkeleton = () => {
      if (skeleton === "custom" && skeletonNode) return skeletonNode;
      if (skeleton === "banner")
        return <BannerSkeleton count={skeletonCount ?? 2} />;
      if (skeleton === "offers")
        return <OffersSkeleton count={skeletonCount ?? 3} />;
      return <GridSkeleton count={skeletonCount ?? 5} />;
    };

    return (
      <div ref={ref} className={className}>
        <div style={{ minHeight }} aria-busy="true" aria-live="polite">
          {renderSkeleton()}
        </div>
      </div>
    );
  }

  // 5. Loaded
  return (
    <div ref={ref} className={className}>
      {children(data as T)}
    </div>
  );
}
