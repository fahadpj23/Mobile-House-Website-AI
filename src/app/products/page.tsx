import { getProducts, getCategories, getSeries } from "@/lib/firestore";
import ProductCard from "@/components/ProductCard";
import ProductListItem from "@/components/ProductListItem";
import ProductVariantCard from "@/components/ProductVariantCard";
import ProductVariantListItem from "@/components/ProductVariantListItem";
import ProductFilters, { FilterSection } from "@/components/ProductFilters";
import ViewToggle from "@/components/ViewToggle";
import Link from "next/link";
import { Suspense } from "react";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: {
    q?: string;
    category?: string;
    series?: string;
    view?: string;
    [key: string]: string | string[] | undefined;
  };
}

/* ---------- Helpers ---------- */
const specParamKey = (key: string) => `spec_${key}`;

function readSpecFilters(
  sp: Record<string, string | string[] | undefined>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (!k.startsWith("spec_")) continue;
    const specKey = k.slice(5);
    const values = Array.isArray(v) ? v : v ? [v] : [];
    if (values.length) out[specKey] = values;
  }
  return out;
}

function buildHref(
  current: Record<string, string | string[] | undefined>,
  overrides: Record<string, string | string[] | undefined>,
): string {
  const merged: Record<string, string | string[]> = {};
  const all = { ...current, ...overrides };
  for (const [k, v] of Object.entries(all)) {
    if (v === undefined || v === null || v === "") continue;
    merged[k] = v as string | string[];
  }
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (Array.isArray(v)) v.forEach((val) => usp.append(k, val));
    else usp.set(k, v);
  }
  const qs = usp.toString();
  return `/products${qs ? `?${qs}` : ""}`;
}

interface VariantRow {
  kind: "variant";
  product: Product;
  variant: NonNullable<Product["variants"]>[number];
}

function explodeVariants(products: Product[]): (Product | VariantRow)[] {
  const out: (Product | VariantRow)[] = [];
  for (const p of products) {
    if (p.variants?.length) {
      for (const v of p.variants) {
        if (!v.enabled) continue;
        out.push({ kind: "variant", product: p, variant: v });
      }
    } else {
      out.push(p);
    }
  }
  return out;
}

export default async function ProductsPage({ searchParams }: Props) {
  const [all, categories, allSeries] = await Promise.all([
    getProducts(),
    getCategories(),
    getSeries(),
  ]);

  const catBySlug: Record<string, (typeof categories)[number]> = {};
  categories.forEach((c) => (catBySlug[c.slug] = c));

  const childrenOf: Record<string, typeof categories> = {};
  categories.forEach((c) => {
    const key = c.parentSlug || "__root__";
    (childrenOf[key] ||= []).push(c);
  });

  const descendantsOf = (slug: string): Set<string> => {
    const result = new Set<string>();
    const stack = [slug];
    while (stack.length) {
      const cur = stack.pop()!;
      if (result.has(cur)) continue;
      result.add(cur);
      (childrenOf[cur] || []).forEach((c) => stack.push(c.slug));
    }
    return result;
  };

  const breadcrumbOf = (slug: string): (typeof categories)[number][] => {
    const chain: (typeof categories)[number][] = [];
    let cur = catBySlug[slug];
    const guard = new Set<string>();
    while (cur && !guard.has(cur.slug)) {
      guard.add(cur.slug);
      chain.unshift(cur);
      cur = cur.parentSlug ? catBySlug[cur.parentSlug] : undefined!;
    }
    return chain;
  };

  let products = all;

  if (searchParams.q) {
    const q = searchParams.q.toLowerCase().trim();
    products = products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      return name.includes(q) || brand.includes(q);
    });
  }

  const activeSeries = searchParams.series
    ? allSeries.find((s) => s.slug === searchParams.series)
    : undefined;

  if (searchParams.series) {
    const targetSlug = searchParams.series.toLowerCase();
    const targetName = activeSeries?.name?.toLowerCase();
    products = products.filter((p) => {
      const pSeries = (p.series || "").toLowerCase();
      const pSeriesName = (p.seriesName || "").toLowerCase();
      if (pSeries && pSeries === targetSlug) return true;
      if (targetName && pSeriesName === targetName) return true;
      return false;
    });
  }

  if (searchParams.category) {
    const selected = searchParams.category;
    const scope = descendantsOf(selected);
    products = products.filter((p) => {
      if (p.category && scope.has(p.category)) return true;
      if (p.categoryPath && p.categoryPath.some((s) => scope.has(s)))
        return true;
      return false;
    });
  }

  const appliedSpecs = readSpecFilters(searchParams);
  const availableSpecs: Record<string, Map<string, number>> = {};
  for (const p of products) {
    for (const s of p.specifications || []) {
      if (!s.key?.trim() || !s.value?.trim()) continue;
      const key = s.key.trim();
      const value = s.value.trim();
      if (!availableSpecs[key]) availableSpecs[key] = new Map();
      availableSpecs[key].set(value, (availableSpecs[key].get(value) || 0) + 1);
    }
  }
  const specKeys = Object.keys(availableSpecs).sort();

  for (const [key, values] of Object.entries(appliedSpecs)) {
    if (!values.length) continue;
    products = products.filter((p) =>
      (p.specifications || []).some(
        (s) => s.key === key && values.includes(s.value),
      ),
    );
  }

  const activeCategory = categories.find(
    (c) => c.slug === searchParams.category,
  );
  const activeFilterCount =
    Object.values(appliedSpecs).reduce((n, v) => n + v.length, 0) +
    (searchParams.category ? 1 : 0) +
    (searchParams.series ? 1 : 0) +
    (searchParams.q ? 1 : 0);

  const chipCategories = (() => {
    if (!searchParams.category) {
      return (childrenOf["__root__"] || []).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }
    const sel = searchParams.category;
    const selCat = catBySlug[sel];
    if (!selCat) return [];
    const children = (childrenOf[sel] || []).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    if (children.length > 0) return children;
    const siblings = (childrenOf[selCat.parentSlug || "__root__"] || []).sort(
      (a, b) => a.name.localeCompare(b.name),
    );
    return siblings;
  })();

  const activeBreadcrumb = searchParams.category
    ? breadcrumbOf(searchParams.category)
    : [];

  const exploded = searchParams.series ? explodeVariants(products) : null;
  const resultCount = exploded ? exploded.length : products.length;

  const filterSections: FilterSection[] = specKeys.map((key) => {
    const values = Array.from(availableSpecs[key].entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    return {
      key,
      paramKey: specParamKey(key),
      selected: appliedSpecs[key] || [],
      options: values.map(([value, count]) => ({ value, count })),
    };
  });

  const view = searchParams.view === "grid" ? "grid" : "list";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* BREADCRUMB */}
      {(activeBreadcrumb.length > 0 || activeSeries) && (
        <nav className="text-xs text-gray-500 mb-2 flex flex-wrap items-center gap-1">
          <Link href="/products" className="hover:text-blue-600">
            All Products
          </Link>
          {activeSeries && (
            <span className="flex items-center gap-1">
              <span className="text-gray-300">›</span>
              <span className="text-gray-800 font-medium">
                {activeSeries.name}
              </span>
            </span>
          )}
          {activeBreadcrumb.map((c, i) => {
            const isLast = i === activeBreadcrumb.length - 1;
            return (
              <span key={c.slug} className="flex items-center gap-1">
                <span className="text-gray-300">›</span>
                {isLast ? (
                  <span className="text-gray-800 font-medium">{c.name}</span>
                ) : (
                  <Link
                    href={buildHref(searchParams, { category: c.slug })}
                    className="hover:text-blue-600"
                  >
                    {c.name}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      )}

      {/* HEADER + VIEW TOGGLE */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold mb-1">
            {searchParams.q
              ? `Showing results for "${searchParams.q}"`
              : activeSeries
                ? `${activeSeries.name} — All Variants`
                : activeCategory
                  ? activeCategory.name
                  : "All Products"}
          </h1>
          <p className="text-xs text-gray-500">
            Showing {resultCount} {exploded ? "variant" : "product"}
            {resultCount !== 1 ? "s" : ""}
            {activeFilterCount > 0 && (
              <>
                {" • "}
                <Link
                  href="/products"
                  className="text-blue-600 hover:underline"
                >
                  Clear all filters
                </Link>
              </>
            )}
          </p>
        </div>

        <Suspense fallback={null}>
          <ViewToggle />
        </Suspense>
      </div>

      {/* SERIES BADGE */}
      {activeSeries && (
        <div className="mb-3 inline-flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-800 text-xs px-3 py-1.5 rounded-full">
          <span className="font-semibold">Series:</span>
          {activeSeries.name}
          <Link
            href={buildHref(searchParams, { series: undefined })}
            className="ml-1 hover:text-purple-900 font-bold"
            title="Remove series filter"
          >
            ×
          </Link>
        </div>
      )}

      {/* CATEGORY CHIPS */}
      {!activeSeries && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Link
            href={buildHref(searchParams, { category: undefined })}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              !searchParams.category
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-gray-300 hover:border-blue-500 hover:text-blue-600"
            }`}
          >
            All
          </Link>

          {activeCategory?.parentSlug && (
            <Link
              href={buildHref(searchParams, {
                category: activeCategory.parentSlug,
              })}
              className="text-xs px-3 py-1 rounded-full border bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 transition"
            >
              ← {catBySlug[activeCategory.parentSlug]?.name || "Back"}
            </Link>
          )}

          {chipCategories.map((c) => {
            const active = searchParams.category === c.slug;
            return (
              <Link
                key={c.id ?? c.slug}
                href={buildHref(searchParams, {
                  category: active ? undefined : c.slug,
                })}
                className={`text-xs px-3 py-1 rounded-full border transition ${
                  active
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-gray-300 hover:border-blue-500 hover:text-blue-600"
                }`}
              >
                {c.name}
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid md:grid-cols-[240px_1fr] gap-5">
        {/* FILTERS */}
        <div>
          <ProductFilters
            sections={filterSections}
            activeCount={activeFilterCount}
            clearAllHref="/products"
          />
        </div>

        {/* RESULTS */}
        <div>
          {resultCount === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border">
              <p className="text-gray-500 text-sm mb-3">
                {activeSeries
                  ? `No products found in the "${activeSeries.name}" series.`
                  : "No products match these filters."}
              </p>
              {activeFilterCount > 0 && (
                <Link
                  href="/products"
                  className="inline-block text-xs px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Clear all filters
                </Link>
              )}
            </div>
          ) : view === "grid" ? (
            // ─── GRID VIEW ───
            exploded ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {exploded.map((item, idx) =>
                  "kind" in item && item.kind === "variant" ? (
                    <ProductVariantCard
                      key={`${item.product.id}__${item.variant.id}`}
                      product={item.product}
                      variant={item.variant}
                    />
                  ) : (
                    <ProductCard
                      key={`${(item as Product).id}__${idx}`}
                      product={item as Product}
                    />
                  ),
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )
          ) : (
            // ─── LIST VIEW ───
            <div className="bg-white rounded-xl border overflow-hidden divide-y divide-gray-100">
              {exploded
                ? exploded.map((item, idx) =>
                    "kind" in item && item.kind === "variant" ? (
                      <ProductVariantListItem
                        key={`${item.product.id}__${item.variant.id}`}
                        product={item.product}
                        variant={item.variant}
                      />
                    ) : (
                      <ProductListItem
                        key={`${(item as Product).id}__${idx}`}
                        product={item as Product}
                      />
                    ),
                  )
                : products.map((p) => (
                    <ProductListItem key={p.id} product={p} />
                  ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
