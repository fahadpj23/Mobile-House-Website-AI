// components/CategorySectionLazy.tsx
"use client";

import HomeSectionLoader from "@/components/HomeSectionLoader";
import ProductGrid from "@/components/ProductGrid";

type Product = { id: string } & Record<string, unknown>;

type Props = {
  slug: string;
  name: string;
  icon: string;
};

export default function CategorySectionLazy({ slug, name, icon }: Props) {
  return (
    <HomeSectionLoader<Product[]>
      endpoint={`/api/home/categories/${encodeURIComponent(slug)}`}
      minHeight={520}
      skeleton="grid"
      skeletonCount={10}
    >
      {(products) =>
        products.length > 0 ? (
          <section className="max-w-7xl mx-auto px-4 py-10 md:py-14 border-t border-gray-100">
            <div className="flex items-center gap-2.5 min-w-0 mb-4">
              <span className="w-0.5 h-6 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base md:text-lg font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
                  <span className="text-lg">{icon}</span>
                  <span className="truncate">{name}</span>
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Handpicked selections
                </p>
              </div>
            </div>
            <ProductGrid products={products} pageSize={5} />
          </section>
        ) : null
      }
    </HomeSectionLoader>
  );
}
