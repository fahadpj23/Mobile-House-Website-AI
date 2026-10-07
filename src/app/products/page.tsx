import { getProducts, getCategories } from "@/lib/firestore";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: {
    q?: string;
    category?: string;
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
  const [all, categories] = await Promise.all([getProducts(), getCategories()]);

  // ─────────────────────────────────────────────────────
  // Build category lookup helpers
  // ─────────────────────────────────────────────────────
  const catBySlug: Record<string, (typeof categories)[number]> = {};
  categories.forEach((c) => (catBySlug[c.slug] = c));

  // childrenOf: parentSlug → Category[]
  const childrenOf: Record<string, typeof categories> = {};
  categories.forEach((c) => {
    const key = c.parentSlug || "__root__";
    (childrenOf[key] ||= []).push(c);
  });

  // Walk up to find root ancestor slug of any category
  const rootOf = (slug: string): string => {
    let cur = catBySlug[slug];
    const guard = new Set<string>();
    while (cur?.parentSlug && catBySlug[cur.parentSlug] && !guard.has(slug)) {
      guard.add(cur.slug);
      cur = catBySlug[cur.parentSlug];
    }
    return cur?.slug || slug;
  };

  // Collect all descendant slugs of a category (including itself)
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

  // Build the ordered breadcrumb path (root → leaf) for a category
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

  // ===== Free-text search =====
  if (searchParams.q) {
    const q = searchParams.q.toLowerCase().trim();
    products = products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      return name.includes(q) || brand.includes(q);
    });
  }

  // ─────────────────────────────────────────────────────
  // CATEGORY FILTER — now matches descendants too
  //
  // A product belongs to the selected category if:
  //   • product.category === selectedSlug        (exact leaf match), OR
  //   • product.categoryPath includes selectedSlug (ancestor match)
  // ─────────────────────────────────────────────────────
  if (searchParams.category) {
    const selected = searchParams.category;
    const scope = descendantsOf(selected); // includes selected itself

    products = products.filter((p) => {
      // Exact leaf match
      if (p.category && scope.has(p.category)) return true;
      // Any node in the product's categoryPath matches
      if (p.categoryPath && p.categoryPath.some((s) => scope.has(s)))
        return true;
      return false;
    });
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

  const activeCategory = categories.find(
    (c) => c.slug === searchParams.category,
  );

  const activeFilterCount =
    Object.values(appliedSpecs).reduce((n, v) => n + v.length, 0) +
    (searchParams.category ? 1 : 0) +
    (searchParams.q ? 1 : 0);

  // ─────────────────────────────────────────────────────
  // Category chips — show contextually relevant categories:
  //   • No category selected → show root categories only
  //   • Category selected    → show siblings + children of
  //                            the selected category
  // ─────────────────────────────────────────────────────
  const chipCategories = (() => {
    if (!searchParams.category) {
      // No category filter → show roots
      return (childrenOf["__root__"] || []).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }
    const sel = searchParams.category;
    const selCat = catBySlug[sel];
    if (!selCat) return [];

    // Show children of selected category (if any),
    // otherwise show siblings (siblings usually means they
    // are at the same depth and are alternatives).
    const children = (childrenOf[sel] || []).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    if (children.length > 0) return children;

    const siblings = (childrenOf[selCat.parentSlug || "__root__"] || []).sort(
      (a, b) => a.name.localeCompare(b.name),
    );
    return siblings;
  })();

  // Breadcrumb for the active category
  const activeBreadcrumb = searchParams.category
    ? breadcrumbOf(searchParams.category)
    : [];

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
      {/* ===== BREADCRUMB ===== */}
      {activeBreadcrumb.length > 0 && (
        <nav className="text-xs text-gray-500 mb-2 flex flex-wrap items-center gap-1">
          <Link href="/products" className="hover:text-blue-600">
            All Products
          </Link>
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

      <h1 className="text-lg md:text-xl font-bold mb-1">
        {searchParams.q
          ? `Search results for "${searchParams.q}"`
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

        {/* If a category is selected, offer its parent as a "up" link */}
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
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm mb-3">
                No products match these filters.
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
