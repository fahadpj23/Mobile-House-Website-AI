// components/FeaturedSection.tsx
"use client";

import HomeSectionLoader from "@/components/HomeSectionLoader";
import ProductGrid from "@/components/ProductGrid";

type Product = { id: string } & Record<string, unknown>;

export default function FeaturedSection() {
  return (
    <HomeSectionLoader<Product[]>
      endpoint="/api/home/featured"
      minHeight={260}
      skeleton="grid"
      skeletonCount={5}
    >
      {(products) =>
        products.length > 0 ? (
          <section className="max-w-7xl mx-auto px-4 py-10 md:py-14">
            <div className="flex items-center gap-2.5 min-w-0 mb-4">
              <span className="w-0.5 h-6 rounded-full bg-gradient-to-b from-amber-400 to-orange-500 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base md:text-lg font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
                  <span className="text-lg">⭐</span>
                  <span className="truncate">Featured Products</span>
                </h2>
              </div>
            </div>
            <ProductGrid products={products} pageSize={5} />
          </section>
        ) : null
      }
    </HomeSectionLoader>
  );
}
