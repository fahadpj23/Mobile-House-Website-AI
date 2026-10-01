import { getProducts, getCategories, getSeries } from "@/lib/firestore";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: {
    q?: string;
    category?: string;
    series?: string;
    [key: string]: string | string[] | undefined;
  };
}

/* ---------- Helpers ---------- */

const specParamKey = (key: string) => `spec_${key}`;

function readSpecFilters(
  searchParams: Record<string, string | string[] | undefined>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(searchParams)) {
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

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export default async function ProductsPage({ searchParams }: Props) {
  const [all, categories, seriesList] = await Promise.all([
    getProducts(),
    getCategories(),
    getSeries(),
  ]);

  let products = all;

  // ===== Free-text search =====
  if (searchParams.q) {
    const q = searchParams.q.toLowerCase().trim();
    products = products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const seriesName = (p.seriesName || "").toLowerCase();
      const seriesSlug = (p.series || "").toLowerCase();
      return (
        name.includes(q) ||
        brand.includes(q) ||
        seriesName.includes(q) ||
        seriesSlug.includes(q)
      );
    });
  }

  if (searchParams.category) {
    products = products.filter((p) => p.category === searchParams.category);
  }

  if (searchParams.series) {
    products = products.filter((p) => p.series === searchParams.series);
  }

  // ===== Build available spec facets =====
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

  // ===== Apply spec filters =====
  for (const [key, values] of Object.entries(appliedSpecs)) {
    if (!values.length) continue;
    products = products.filter((p) =>
      (p.specifications || []).some(
        (s) => s.key === key && values.includes(s.value),
      ),
    );
  }

  const activeSeries = seriesList.find((s) => s.slug === searchParams.series);
  const activeCategory = categories.find(
    (c) => c.slug === searchParams.category,
  );

  const activeFilterCount =
    Object.values(appliedSpecs).reduce((n, v) => n + v.length, 0) +
    (searchParams.category ? 1 : 0) +
    (searchParams.series ? 1 : 0) +
    (searchParams.q ? 1 : 0);

  /* ---------- Reusable spec filter panel ---------- */
  const SpecFilters = (
    <>
      {specKeys.map((key) => {
        const values = Array.from(availableSpecs[key].entries()).sort((a, b) =>
          a[0].localeCompare(b[0]),
        );
        const selected = appliedSpecs[key] || [];

        return (
          <details key={key} open className="border rounded-lg bg-white">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium flex items-center justify-between">
              <span>{key}</span>
              {selected.length > 0 && (
                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                  {selected.length}
                </span>
              )}
            </summary>

            <div className="px-3 pb-3 space-y-1.5 max-h-56 overflow-y-auto">
              {values.map(([value, count]) => {
                const checked = selected.includes(value);
                const nextValues = toggleValue(selected, value);
                const href = buildHref(searchParams, {
                  [specParamKey(key)]:
                    nextValues.length === 0 ? undefined : nextValues,
                });

                return (
                  <Link
                    key={value}
                    href={href}
                    className="flex items-center gap-2 text-sm py-0.5 hover:text-blue-600"
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        checked
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {checked && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 truncate">{value}</span>
                    <span className="text-xs text-gray-400">{count}</span>
                  </Link>
                );
              })}
            </div>
          </details>
        );
      })}
    </>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-lg md:text-xl font-bold mb-1">
        {searchParams.q
          ? `Search results for "${searchParams.q}"`
          : activeSeries
            ? activeSeries.name
            : activeCategory
              ? activeCategory.name
              : "All Products"}
      </h1>
      <p className="text-xs text-gray-500 mb-3">
        {products.length} product{products.length !== 1 ? "s" : ""} found
        {activeFilterCount > 0 && (
          <>
            {" • "}
            <Link href="/products" className="text-blue-600 hover:underline">
              Clear all filters
            </Link>
          </>
        )}
      </p>

      {/* ===== CATEGORY CHIPS ===== */}
      <div className="flex flex-wrap gap-1.5 mb-2">
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
        {categories.map((c) => {
          const active = searchParams.category === c.slug;
          return (
            <Link
              key={c.id}
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

      {/* ===== SERIES CHIPS ===== */}
      {seriesList.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="text-[11px] text-gray-500 self-center mr-1">
            Series:
          </span>
          {seriesList.map((s) => {
            const active = searchParams.series === s.slug;
            return (
              <Link
                key={s.id}
                href={buildHref(searchParams, {
                  series: active ? undefined : s.slug,
                })}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition ${
                  active
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-gray-300 hover:border-blue-500 hover:text-blue-600"
                }`}
              >
                {s.name}
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid md:grid-cols-[220px_1fr] gap-4">
        {/* ===== SPEC FILTER SIDEBAR (desktop) ===== */}
        {specKeys.length > 0 && (
          <aside className="hidden md:block space-y-3">
            <h2 className="font-bold text-xs uppercase tracking-wide text-gray-500">
              Filters
            </h2>
            {SpecFilters}
            {activeFilterCount > 0 && (
              <Link
                href="/products"
                className="block text-center text-xs text-blue-600 hover:underline pt-1"
              >
                Clear all filters
              </Link>
            )}
          </aside>
        )}

        {/* ===== RESULTS ===== */}
        <div>
          {/* Mobile filter toggle */}
          {specKeys.length > 0 && (
            <details className="md:hidden border rounded-lg bg-white mb-3">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium flex items-center justify-between">
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </summary>
              <div className="p-3 space-y-3 border-t">{SpecFilters}</div>
            </details>
          )}

          {products.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No products match these filters.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
