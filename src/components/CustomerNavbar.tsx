// CustomerNavbar.tsx
"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import { useAuth } from "./AuthProvider";
import {
  ShoppingCart,
  User as UserIcon,
  Search,
  X,
  Loader2,
  Layers,
} from "lucide-react";
import { useDebounce } from "@/lib/useDebounce";
import { searchProductsLive, productThumb } from "@/lib/searchProducts";
import type { Product, Series } from "@/lib/types";

export default function CustomerNavbar() {
  const pathname = usePathname();
  // Never render on admin routes
  if (pathname?.startsWith("/admin")) return null;
  return <CustomerBar />;
}

function CustomerBar() {
  const { items } = useCart();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  // ── Live search state ──
  const [results, setResults] = useState<{
    products: Product[];
    series: Series[];
  }>({
    products: [],
    series: [],
  });
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null); // 👈 NEW: to blur after submit

  const debouncedQ = useDebounce(q, 250);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Live search effect
  useEffect(() => {
    const term = debouncedQ.trim();
    if (!term) {
      setResults({ products: [], series: [] });
      setSearching(false);
      setShowDropdown(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setShowDropdown(true);

    searchProductsLive(term, 6, 3)
      .then((res) => {
        if (!cancelled) {
          setResults(res);
          setSearching(false);
        }
      })
      .catch((err) => {
        console.error("[live search]", err);
        if (!cancelled) {
          setResults({ products: [], series: [] });
          setSearching(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  const clearSearch = () => {
    setQ("");
    setShowDropdown(false);
  };

  /* 👇 NEW: submit → navigate → clear input */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;

    // Navigate first
    router.push(`/products?q=${encodeURIComponent(term)}`);

    // Then clear the input + close dropdown
    clearSearch();
    setResults({ products: [], series: [] });
    setSearching(false);

    // Blur the input so the focus ring disappears
    inputRef.current?.blur();
    setFocused(false);
  };

  /* 👇 Click a suggestion → navigate → clear */
  const handleResultClick = () => {
    clearSearch();
    setResults({ products: [], series: [] });
    setSearching(false);
    inputRef.current?.blur();
    setFocused(false);
  };

  const count = items.reduce((s, i) => s + i.quantity, 0);

  const hasResults = results.products.length > 0 || results.series.length > 0;

  /* ══════════════════════════════════════════════════════════
     SEARCH BOX
     ══════════════════════════════════════════════════════════ */
  const SearchBox = (
    <div ref={dropdownRef} className="w-full relative">
      <form onSubmit={handleSearch} className="relative">
        {/* Search icon — left */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <Search
            size={18}
            className={`transition-colors duration-200 ${
              focused ? "text-blue-500" : "text-gray-400"
            }`}
          />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            setFocused(true);
            if (q.trim()) setShowDropdown(true);
          }}
          onBlur={() => setFocused(false)}
          placeholder="Search phones, accessories, brands..."
          className={`w-full h-11 pl-12 pr-12 text-sm rounded-full bg-gray-100 border transition-all duration-200 outline-none placeholder:text-gray-400 ${
            focused
              ? "bg-white border-blue-400 ring-4 ring-blue-100 shadow-sm"
              : "border-transparent hover:bg-gray-150 hover:bg-gray-200/70"
          }`}
          autoComplete="off"
        />

        {/* Right side: spinner or clear button */}
        {searching && (
          <Loader2
            size={16}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin pointer-events-none"
          />
        )}
        {!searching && q && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center transition-colors"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </form>

      {/* Live search dropdown */}
      {showDropdown && q.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-[70vh] overflow-y-auto z-50 overflow-hidden">
          {searching && !hasResults ? (
            <div className="p-5 flex items-center gap-2.5 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin text-blue-500" />
              Searching...
            </div>
          ) : !hasResults ? (
            <div className="p-5 text-sm text-gray-500">
              <p>
                No results for{" "}
                <span className="font-semibold text-gray-700">
                  &quot;{q}&quot;
                </span>
              </p>
              <button
                onClick={handleSearch}
                className="mt-2 text-blue-600 hover:text-blue-700 hover:underline text-xs font-medium"
              >
                Search all products →
              </button>
            </div>
          ) : (
            <>
              {/* Series matches */}
              {results.series.length > 0 && (
                <div className="border-b border-gray-100">
                  <p className="px-4 pt-3 pb-1.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    Series
                  </p>
                  {results.series.map((s) => (
                    <Link
                      key={s.id}
                      href={`/products?series=${encodeURIComponent(s.slug)}`}
                      onClick={handleResultClick}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/70 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Layers size={14} className="text-blue-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-800">
                        {s.name}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Product matches */}
              {results.products.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    Products
                  </p>
                  {results.products.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      onClick={handleResultClick}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/70 transition-colors"
                    >
                      <img
                        src={productThumb(p)}
                        alt={p.name}
                        className="w-11 h-11 rounded-lg object-cover border border-gray-100 bg-gray-50 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                          {p.brand}
                          {p.seriesName ? ` • ${p.seriesName}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-blue-600 shrink-0">
                        ₹{p.price}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Footer */}
              <button
                onClick={handleSearch}
                className="w-full text-left px-4 py-3 text-xs text-blue-600 hover:bg-blue-50/70 border-t border-gray-100 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Search size={13} />
                View all results for &quot;{q}&quot;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* ════════════ DESKTOP (md and up) ════════════ */}
        <div className="hidden md:flex items-center justify-between gap-6 py-3">
          {/* LEFT — Logo */}
          <Link href="/" className="flex items-center shrink-0 group">
            <Image
              src="/mobileHouseLogo.png"
              alt="Mobile House"
              width={200}
              height={56}
              priority
              className="h-10 lg:h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </Link>

          {/* CENTER — Search */}
          <div className="flex-1 max-w-2xl">{SearchBox}</div>

          {/* RIGHT — Profile + Cart */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-full hover:bg-gray-100 transition-colors">
                  <UserIcon size={20} />
                  <span className="hidden lg:inline max-w-[110px] truncate font-medium">
                    {user.displayName || user.email?.split("@")[0]}
                  </span>
                </button>
                <div className="absolute right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl hidden group-hover:block min-w-[160px] z-50 overflow-hidden">
                  <Link
                    href="/orders"
                    className="block px-4 py-2.5 text-sm hover:bg-gray-50"
                  >
                    My Orders
                  </Link>
                  <button
                    onClick={logout}
                    className="block w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 border-t border-gray-100"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-full hover:bg-gray-100 transition-colors font-medium"
              >
                <UserIcon size={20} />
                <span>Login</span>
              </Link>
            )}

            <Link
              href="/cart"
              className="relative p-2.5 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart size={22} />
              {count > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-blue-600 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center ring-2 ring-white">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* ════════════ MOBILE (below md) ════════════ */}
        <div className="md:hidden py-3">
          {/* Row 1: Logo — Cart & Profile */}
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center shrink-0">
              <Image
                src="/mobileHouseLogo.png"
                alt="Mobile House"
                width={170}
                height={48}
                priority
                className="h-9 w-auto object-contain"
              />
            </Link>

            <div className="flex items-center gap-1.5">
              {user ? (
                <div className="relative group">
                  <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <UserIcon size={22} />
                  </button>
                  <div className="absolute right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl hidden group-hover:block min-w-[160px] z-50 overflow-hidden">
                    <Link
                      href="/orders"
                      className="block px-4 py-2.5 text-sm hover:bg-gray-50"
                    >
                      My Orders
                    </Link>
                    <button
                      onClick={logout}
                      className="block w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 border-t border-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Login"
                >
                  <UserIcon size={22} />
                </Link>
              )}

              <Link
                href="/cart"
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Cart"
              >
                <ShoppingCart size={22} />
                {count > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-blue-600 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center ring-2 ring-white">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Row 2: Search bar below */}
          <div className="mt-3">{SearchBox}</div>
        </div>
      </div>
    </header>
  );
}
