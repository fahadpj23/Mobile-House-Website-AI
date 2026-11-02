// components/BottomBannersLazy.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getBanners } from "@/lib/firestore";
import type { Banner } from "@/lib/types";

export default function BottomBannersLazy() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    void getBanners("bottom")
      .then((b) => setBanners(b.filter((x) => x.active)))
      .catch((err) => console.error("Failed to load bottom banners", err));
  }, [visible]);

  // Render a small spacer until visible so the IO has something to observe
  if (!visible) {
    return <div ref={ref} className="h-4" aria-hidden />;
  }

  if (banners.length === 0) return null;

  return (
    <section ref={ref} className="max-w-7xl mx-auto px-4 py-4 space-y-3">
      {banners.map((b) =>
        b.link ? (
          <Link
            key={b.id}
            href={b.link}
            prefetch={true}
            className="block overflow-hidden rounded-2xl"
          >
            <img
              src={b.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-auto object-cover hover:opacity-95 transition-opacity"
            />
          </Link>
        ) : (
          <div key={b.id} className="overflow-hidden rounded-2xl">
            <img
              src={b.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-auto object-cover"
            />
          </div>
        ),
      )}
    </section>
  );
}
