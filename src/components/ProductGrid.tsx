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

export default function ProductGrid({
  products,
  pageSize = 5,
  className = DEFAULT_GRID,
}: Props) {
  const [visible, setVisible] = useState(() =>
    Math.min(pageSize, products.length),
  );
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showMoreSpinner, setShowMoreSpinner] = useState(false);

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
          // Only show spinner if the next page takes > 300ms to feel "instant"
          setShowMoreSpinner(false);
          timer = setTimeout(() => setShowMoreSpinner(true), 300);

          setVisible((v) => {
            const next = Math.min(v + pageSize, products.length);
            if (next !== v) {
              clearTimeout(timer);
              setShowMoreSpinner(false);
            }
            return next;
          });
        }
      },
      { rootMargin: "300px 0px" },
    );

    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [visible, products.length, pageSize]);

  return (
    <>
      <div className={className}>
        {products.slice(0, visible).map((p) => (
          <ProductCard key={p.id} product={p as never} />
        ))}
      </div>

      {visible < products.length && (
        <div
          ref={sentinelRef}
          className="h-12 flex flex-col items-center justify-center gap-1"
          aria-live="polite"
        >
          {showMoreSpinner ? (
            <>
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              <span className="text-[11px] text-gray-500">Loading more…</span>
            </>
          ) : (
            <span className="text-[11px] text-transparent select-none">.</span>
          )}
        </div>
      )}
    </>
  );
}
