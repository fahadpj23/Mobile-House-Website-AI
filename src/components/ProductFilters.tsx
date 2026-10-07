"use client";

import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";

export interface FilterOption {
  value: string;
  count: number;
}

export interface FilterSection {
  key: string;
  paramKey: string;
  selected: string[];
  options: FilterOption[];
}

interface Props {
  sections: FilterSection[];
  activeCount: number;
  clearAllHref: string;
}

const INITIAL_VISIBLE = 6;

function buildHrefFromParams(
  current: URLSearchParams,
  overrides: Record<string, string | string[] | undefined>,
): string {
  const usp = new URLSearchParams(current.toString());

  for (const [k, v] of Object.entries(overrides)) {
    usp.delete(k);
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      v.forEach((val) => usp.append(k, val));
    } else {
      usp.set(k, v);
    }
  }

  const qs = usp.toString();
  return `/products${qs ? `?${qs}` : ""}`;
}

/* ─────────────────────────────────────────────────────
   Outer wrapper — provides Suspense for useSearchParams.
   The page renders <ProductFilters />, which internally
   wraps the hook-using piece in Suspense.
   ───────────────────────────────────────────────────── */
export default function ProductFilters(props: Props) {
  if (props.sections.length === 0) return null;

  return (
    <Suspense
      fallback={
        <div className="bg-white border border-gray-200 rounded-xl h-32 animate-pulse" />
      }
    >
      <ProductFiltersInner {...props} />
    </Suspense>
  );
}

/* ─────────────────────────────────────────────────────
   Inner component — this one uses useSearchParams()
   ───────────────────────────────────────────────────── */
function ProductFiltersInner({ sections, activeCount, clearAllHref }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchParams = useSearchParams();

  return (
    <>
      {/* ─── Mobile trigger ─── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden inline-flex items-center gap-2 text-sm font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white hover:border-blue-500 hover:text-blue-600 transition w-full justify-center mb-3"
      >
        <SlidersHorizontal size={16} />
        Filters
        {activeCount > 0 && (
          <span className="ml-1 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
            {activeCount}
          </span>
        )}
      </button>

      {/* ─── Desktop sidebar ─── */}
      <aside className="hidden md:block">
        <FilterPanel
          sections={sections}
          activeCount={activeCount}
          clearAllHref={clearAllHref}
          currentParams={searchParams}
        />
      </aside>

      {/* ─── Mobile drawer ─── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-[85%] max-w-sm bg-gray-50 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-blue-600" />
                <h2 className="font-bold">Filters</h2>
                {activeCount > 0 && (
                  <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                    {activeCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-800"
                aria-label="Close filters"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <FilterPanel
                sections={sections}
                activeCount={activeCount}
                clearAllHref={clearAllHref}
                currentParams={searchParams}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────
   Shared panel
   ───────────────────────────────────────────────────── */
function FilterPanel({
  sections,
  activeCount,
  clearAllHref,
  currentParams,
  onNavigate,
}: {
  sections: FilterSection[];
  activeCount: number;
  clearAllHref: string;
  currentParams: URLSearchParams;
  onNavigate?: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-blue-600" />
          <span className="font-bold text-sm text-gray-800">Filters</span>
          {activeCount > 0 && (
            <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-semibold">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <Link
            href={clearAllHref}
            onClick={onNavigate}
            className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Clear all
          </Link>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {sections.map((s) => (
          <FilterSectionBlock
            key={s.key}
            section={s}
            currentParams={currentParams}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   One collapsible section
   ───────────────────────────────────────────────────── */
function FilterSectionBlock({
  section,
  currentParams,
  onNavigate,
}: {
  section: FilterSection;
  currentParams: URLSearchParams;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(section.selected.length > 0);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return section.options;
    return section.options.filter((o) => o.value.toLowerCase().includes(q));
  }, [section.options, search]);

  const visible = showAll
    ? filteredOptions
    : filteredOptions.slice(0, INITIAL_VISIBLE);
  const hasMore = filteredOptions.length > INITIAL_VISIBLE;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-800 truncate">
            {section.key}
          </span>
          {section.selected.length > 0 && (
            <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded-full shrink-0">
              {section.selected.length}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform shrink-0 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-4 pb-3">
          {section.options.length > 8 && (
            <div className="relative mb-2">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${section.key}...`}
                className="w-full text-xs border border-gray-200 rounded-md pl-7 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          <div className="space-y-0.5">
            {visible.map((o) => {
              const checked = section.selected.includes(o.value);
              const next = checked
                ? section.selected.filter((v) => v !== o.value)
                : [...section.selected, o.value];

              const href = buildHrefFromParams(currentParams, {
                [section.paramKey]: next.length === 0 ? undefined : next,
              });

              return (
                <Link
                  key={o.value}
                  href={href}
                  onClick={onNavigate}
                  className={`group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition ${
                    checked
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                      checked
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-300 group-hover:border-blue-500"
                    }`}
                  >
                    {checked && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>

                  <span className="flex-1 truncate">{o.value}</span>
                  <span className="text-[10px] text-gray-400 tabular-nums">
                    {o.count}
                  </span>
                </Link>
              );
            })}

            {filteredOptions.length === 0 && (
              <p className="text-xs text-gray-400 px-2 py-1">
                No matches for &quot;{search}&quot;
              </p>
            )}
          </div>

          {hasMore && !search && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-2 text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              {showAll
                ? "Show less"
                : `Show ${filteredOptions.length - INITIAL_VISIBLE} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
