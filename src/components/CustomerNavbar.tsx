// CustomerNavbar.tsx
"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import { useAuth } from "./AuthProvider";
import {
  ShoppingCart,
  User as UserIcon,
  Search,
  Menu,
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
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      setShowDropdown(false);
      router.push(`/products?q=${encodeURIComponent(q.trim())}`);
    }
  };

  const handleResultClick = () => {
    setShowDropdown(false);
    setQ("");
  };

  const clearSearch = () => {
    setQ("");
    setShowDropdown(false);
  };

  const count = items.reduce((s, i) => s + i.quantity, 0);

  const hasResults = results.products.length > 0 || results.series.length > 0;

  return (
    <header className="bg-white border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Mobile menu toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <Link href="/" className="font-bold text-lg text-blue-600 shrink-0">
          Mobile_house
        </Link>

        {/* ── Desktop search with live dropdown ── */}
        <div
          ref={dropdownRef}
          className="hidden md:block flex-1 max-w-xl relative"
        >
          <form onSubmit={handleSearch} className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => q.trim() && setShowDropdown(true)}
              placeholder="Search products..."
              className="input"
              style={{ paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
              autoComplete="off"
            />
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            {searching && (
              <Loader2
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin pointer-events-none"
              />
            )}
            {!searching && q && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </form>

          {/* Live search dropdown */}
          {showDropdown && q.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-[70vh] overflow-y-auto z-50">
              {searching && !hasResults ? (
                <div className="p-4 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 size={14} className="animate-spin" />
                  Searching...
                </div>
              ) : !hasResults ? (
                <div className="p-4 text-sm text-gray-500">
                  No results for &quot;{q}&quot;
                  <button
                    onClick={handleSearch}
                    className="block mt-2 text-blue-600 hover:underline text-xs"
                  >
                    Search all products →
                  </button>
                </div>
              ) : (
                <>
                  {/* Series matches */}
                  {results.series.length > 0 && (
                    <div className="border-b">
                      <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                        Series
                      </p>
                      {results.series.map((s) => (
                        <Link
                          key={s.id}
                          href={`/products?series=${encodeURIComponent(s.slug)}`}
                          onClick={handleResultClick}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 transition"
                        >
                          <Layers
                            size={14}
                            className="text-blue-500 shrink-0"
                          />
                          <span className="text-sm font-medium">{s.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Product matches */}
                  {results.products.length > 0 && (
                    <div>
                      <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                        Products
                      </p>
                      {results.products.map((p) => (
                        <Link
                          key={p.id}
                          href={`/products/${p.id}`}
                          onClick={handleResultClick}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 transition"
                        >
                          <img
                            src={productThumb(p)}
                            alt={p.name}
                            className="w-10 h-10 rounded object-cover border bg-gray-50 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium line-clamp-1">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-gray-500 line-clamp-1">
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
                    className="w-full text-left px-3 py-2.5 text-xs text-blue-600 hover:bg-blue-50 border-t font-medium flex items-center gap-1"
                  >
                    <Search size={12} />
                    View all results for &quot;{q}&quot;
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right nav */}
        <nav className="ml-auto flex items-center gap-4">
          <Link
            href="/products"
            className="hidden md:inline text-sm hover:text-blue-600"
          >
            Shop
          </Link>

          <Link href="/cart" className="relative">
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm">
                <UserIcon size={18} />
                <span className="hidden md:inline">
                  {user.displayName || user.email?.split("@")[0]}
                </span>
              </button>
              <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg hidden group-hover:block min-w-[140px]">
                <Link
                  href="/orders"
                  className="block px-3 py-2 text-sm hover:bg-gray-50"
                >
                  My Orders
                </Link>
                <button
                  onClick={logout}
                  className="block w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-gray-50"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <Link href="/auth/login" className="text-sm hover:text-blue-600">
              Login
            </Link>
          )}
        </nav>
      </div>

      {/* ── Mobile search + live dropdown ── */}
      {mobileOpen && (
        <div className="md:hidden border-t px-4 py-2 relative">
          <form onSubmit={handleSearch} className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              className="input"
              style={{ paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
              autoComplete="off"
            />
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            {searching && (
              <Loader2
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin pointer-events-none"
              />
            )}
            {!searching && q && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </form>

          {/* Mobile dropdown results */}
          {q.trim() && (
            <div className="mt-1 bg-white border rounded-lg shadow-lg max-h-[60vh] overflow-y-auto">
              {!hasResults ? (
                <div className="p-3 text-sm text-gray-500">
                  No results for &quot;{q}&quot;
                </div>
              ) : (
                <>
                  {results.series.map((s) => (
                    <Link
                      key={s.id}
                      href={`/products?series=${encodeURIComponent(s.slug)}`}
                      onClick={handleResultClick}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 border-b"
                    >
                      <Layers size={14} className="text-blue-500" />
                      <span className="text-sm font-medium">{s.name}</span>
                    </Link>
                  ))}
                  {results.products.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      onClick={handleResultClick}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 border-b"
                    >
                      <img
                        src={productThumb(p)}
                        alt={p.name}
                        className="w-9 h-9 rounded object-cover border bg-gray-50 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm line-clamp-1">{p.name}</p>
                        <p className="text-[10px] text-gray-500">{p.brand}</p>
                      </div>
                      <span className="text-xs font-bold text-blue-600">
                        ₹{p.price}
                      </span>
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
