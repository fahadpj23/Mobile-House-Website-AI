// components/MidBannersLazy.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import HomeSectionLoader from "@/components/HomeSectionLoader";

type Banner = {
  id: string;
  imageUrl: string;
  link?: string;
  title?: string;
  subtitle?: string;
  active?: boolean;
};

export default function MidBannersLazy() {
  return (
    <HomeSectionLoader<Banner[]>
      endpoint="/api/home/mid-banners"
      minHeight={180}
      skeleton="banner"
      skeletonCount={2}
    >
      {(banners) =>
        banners.length > 0 ? (
          <section className="max-w-7xl mx-auto px-4 py-3">
            <div
              className={`grid gap-3 ${
                banners.length === 1 ? "grid-cols-1" : "md:grid-cols-2"
              }`}
            >
              {banners.map((b) => (
                <Link
                  key={b.id}
                  href={b.link || "#"}
                  className="block rounded-xl overflow-hidden hover:shadow-xl transition-all group relative"
                >
                  <div className="relative w-full h-36 md:h-44 bg-gray-100">
                    <Image
                      src={b.imageUrl}
                      alt={b.title || "Banner"}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                    {(b.title || b.subtitle) && (
                      <div className="absolute inset-0 flex flex-col justify-end p-4 text-white pointer-events-none">
                        {b.title && (
                          <h3 className="text-base md:text-lg font-bold tracking-tight">
                            {b.title}
                          </h3>
                        )}
                        {b.subtitle && (
                          <p className="text-[11px] text-gray-200 mt-0.5">
                            {b.subtitle}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null
      }
    </HomeSectionLoader>
  );
}
