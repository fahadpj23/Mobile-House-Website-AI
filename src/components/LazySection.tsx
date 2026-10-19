// components/LazySection.tsx
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  minHeight?: number | string;
  rootMargin?: string;
  className?: string;
};

export default function LazySection({
  children,
  minHeight = 320,
  rootMargin = "200px 0px",
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [mounted, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {mounted ? (
        children
      ) : (
        <div
          style={{ minHeight }}
          className="animate-pulse rounded-xl bg-gray-100/70"
          aria-hidden
        />
      )}
    </div>
  );
}
