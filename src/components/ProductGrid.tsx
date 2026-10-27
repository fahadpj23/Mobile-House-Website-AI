// components/ProductGrid.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";

type ProductLike = { id: string } & Record<string, unknown>;

type Props = {
  products: ProductLike[];
  /** How many to render initially (and per additional page). */
  pageSize?: number;
  /** Grid classes — keep identical to your current layout. */
  className?: string;
};

const DEFAULT_GRID =
  "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 md:gap-3";

/* ═══════════════════════════════════════════════════════
   Skeleton Card (Matches standard product card aspect)
   ═══════════════════════════════════════════════════════ */
function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 w-full animate-pulse p-2 bg-white rounded-xl border border-gray-100">
      {/* Image Box */}
      <div className="aspect-square w-full rounded-lg bg-gray-200" />
      {/* Title Lines */}
      <div className="h-3 w-4/5 rounded bg-gray-200 mt-1" />
      <div className="h-3 w-3/5 rounded bg-gray-200" />
      {/* Price Line */}
      <div className="h-4 w-2/5 rounded bg-gray-200 mt-1" />
    </div>
  );
}

export default function ProductGrid({
  products,
  pageSize = 5,
  className = DEFAULT_GRID,
}: Props) {
  const [visible, setVisible] = useState(() =>
    Math.min(pageSize, products.length),
  );
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (visible >= products.length) return;
    const el = sentinelRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(products.length);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setIsLoadingMore(true);

          // Simulate a slight delay so the skeleton is actually visible
          timer = setTimeout(() => {
            setVisible((v) => Math.min(v + pageSize, products.length));
            setIsLoadingMore(false);
          }, 500);
        }
      },
      // Removed rootMargin: "400px 0px" so it only triggers when actually scrolled to
    );

    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [visible, products.length, pageSize]);

  // Handle empty state
  if (!products || products.length === 0) {
    return (
      <div className="mt-6 py-12 text-center text-gray-500 text-sm">
        No products found.
      </div>
    );
  }

  return (
    // Added mt-6 to ensure there is always space between the banner/header and the grid
    <div className="mt-6">
      {/* Main Product Grid */}
      <div className={className}>
        {products.slice(0, visible).map((p) => (
          <ProductCard key={p.id} product={p as never} />
        ))}
      </div>

      {/* Infinite Scroll Trigger & Loading Skeleton */}
      {visible < products.length && (
        <div
          ref={sentinelRef}
          className="mt-8 pt-6 border-t border-gray-100 w-full"
        >
          {/* Render a full row of skeleton cards matching the grid layout */}
          <div className={className}>
            {Array.from({
              length: Math.min(pageSize, products.length - visible),
            }).map((_, i) => (
              <ProductCardSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
