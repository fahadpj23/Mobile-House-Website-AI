import { getProducts, getCategories, getSeries } from "@/lib/firestore";
import ProductCard from "@/components/ProductCard";
import ProductListItem from "@/components/ProductListItem";
import ProductVariantCard from "@/components/ProductVariantCard";
import ProductVariantListItem from "@/components/ProductVariantListItem";
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
    sort?: string;
    [key: string]: string | string[] | undefined;
  };
}

/* ---------- Helpers ---------- */
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

/* ---------- Sort Options (Relevance removed) ---------- */
const SORT_OPTIONS = [
  { key: "popularity", label: "Popularity" },
  { key: "price_asc", label: "Price -- Low to High" },
  { key: "price_desc", label: "Price -- High to Low" },
  { key: "newest", label: "Newest First" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

function getPriceOf(item: Product | VariantRow): number {
  if ("kind" in item && item.kind === "variant") {
    const v = item.variant as any;
    return typeof v.price === "number"
      ? v.price
      : typeof item.product.price === "number"
        ? item.product.price
        : 0;
  }
  return typeof (item as Product).price === "number"
    ? (item as Product).price
    : 0;
}

function getPopularityOf(item: Product | VariantRow): number {
  const p = "kind" in item && item.kind === "variant" ? item.product : item;
  const anyP = p as any;
  const candidates = [
    anyP.popularity,
    anyP.sales,
    anyP.sold,
    anyP.orderCount,
    anyP.viewCount,
    anyP.rating,
  ];
  for (const c of candidates) {
    if (typeof c === "number") return c;
  }
  return 0;
}

function getNewestOf(item: Product | VariantRow): number {
  const p = "kind" in item && item.kind === "variant" ? item.product : item;
  const anyP = p as any;
  const candidates = [anyP.createdAt, anyP.updatedAt, anyP.addedAt];
  for (const c of candidates) {
    if (c?.seconds) return c.seconds;
    if (c instanceof Date) return c.getTime() / 1000;
    if (typeof c === "number") return c;
    if (typeof c === "string") {
      const t = Date.parse(c);
      if (!isNaN(t)) return t / 1000;
    }
  }
  return 0;
}

function sortItems<T extends Product | VariantRow>(
  items: T[],
  sort: SortKey,
): T[] {
  const copy = [...items];
  switch (sort) {
    case "price_asc":
      copy.sort((a, b) => getPriceOf(a) - getPriceOf(b));
      break;
    case "price_desc":
      copy.sort((a, b) => getPriceOf(b) - getPriceOf(a));
      break;
    case "newest":
      copy.sort((a, b) => getNewestOf(b) - getNewestOf(a));
      break;
    case "popularity":
    default:
      copy.sort((a, b) => getPopularityOf(b) - getPopularityOf(a));
      break;
  }
  return copy;
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

  // CATEGORY ONLY — single active category (no mixing)
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

  const activeCategory = categories.find(
    (c) => c.slug === searchParams.category,
  );

  const activeBreadcrumb = searchParams.category
    ? breadcrumbOf(searchParams.category)
    : [];

  const exploded = searchParams.series ? explodeVariants(products) : null;

  // SORT — default is now popularity
  const sortKey: SortKey =
    (SORT_OPTIONS.find((o) => o.key === searchParams.sort)?.key as SortKey) ||
    "popularity";

  const sortedProducts = sortItems(products, sortKey);
  const sortedExploded = exploded ? sortItems(exploded, sortKey) : null;

  const resultCount = sortedExploded
    ? sortedExploded.length
    : sortedProducts.length;

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

      {/* SORT BAR (top) */}
      <div className="mb-4 flex items-center gap-2 flex-wrap bg-white border rounded-xl px-3 py-2">
        <span className="text-xs font-semibold text-gray-700 mr-1">
          Sort by:
        </span>
        {SORT_OPTIONS.map((opt) => {
          const active = sortKey === opt.key;
          return (
            <Link
              key={opt.key}
              href={buildHref(searchParams, {
                // First option (popularity) = default → omit from URL
                sort: opt.key === "popularity" ? undefined : opt.key,
              })}
              className={`text-xs px-2.5 py-1 rounded-md border transition ${
                active
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600"
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>

      {/* RESULTS (full width) */}
      <div>
        {resultCount === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border">
            <p className="text-gray-500 text-sm">
              {activeSeries
                ? `No products found in the "${activeSeries.name}" series.`
                : "No products match these filters."}
            </p>
          </div>
        ) : view === "grid" ? (
          // ─── GRID VIEW ───
          sortedExploded ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {sortedExploded.map((item, idx) =>
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
              {sortedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )
        ) : (
          // ─── LIST VIEW ───
          <div className="bg-white rounded-xl border overflow-hidden divide-y divide-gray-100">
            {sortedExploded
              ? sortedExploded.map((item, idx) =>
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
              : sortedProducts.map((p) => (
                  <ProductListItem key={p.id} product={p} />
                ))}
          </div>
        )}
      </div>
    </div>
  );
}
