"use client";
import Link from "next/link";
import {
  ShoppingCart,
  User,
  LogOut,
  Menu,
  Search,
  X,
  Package,
  Layers,
} from "lucide-react";
import { useCart } from "./CartProvider";
import { useAuth } from "./AuthProvider";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getProducts, getSeries, Series } from "@/lib/firestore";
import { Product } from "@/lib/types";

/* ============================================================
   Debounce hook
   ============================================================ */
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Navbar() {
  const { count } = useCart();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(search, 300);

  // ===== Load catalogue once (cached on first search focus) =====
  const ensureLoaded = async () => {
    if (loaded) return;
    setLoaded(true);
    try {
      const [p, s] = await Promise.all([getProducts(), getSeries()]);
      setAllProducts(p);
      setAllSeries(s);
    } catch (err) {
      console.error("Search preload failed:", err);
    }
  };

  // ===== Close dropdown on outside click =====
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ===== Compute matches from debounced query =====
  const { matchedSeries, matchedProducts, totalMatches } = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) {
      return { matchedSeries: [], matchedProducts: [], totalMatches: 0 };
    }

    // Match series by name or slug
    const sMatches = allSeries.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q),
    );

    // Match products by name, brand, seriesName, series slug
    const pMatches = allProducts
      .filter((p) => {
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
      })
      // If matched mainly via series, prioritise those products
      .slice(0, 6);

    return {
      matchedSeries: sMatches.slice(0, 4),
      matchedProducts: pMatches,
      totalMatches: sMatches.length + pMatches.length,
    };
  }, [debouncedQuery, allProducts, allSeries]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setShowResults(false);
    router.push(`/products?q=${encodeURIComponent(search.trim())}`);
  };

  const goToSeries = (slug: string) => {
    setShowResults(false);
    setSearch("");
    router.push(`/products?series=${slug}`);
  };

  const goToProduct = (id: string) => {
    setShowResults(false);
    setSearch("");
    router.push(`/products/${id}`);
  };

  const SearchBox = (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={handleSearchSubmit} className="flex">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => {
            ensureLoaded();
            if (search.trim()) setShowResults(true);
          }}
          placeholder="Search phones, brands, series..."
          className="input rounded-r-none"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 rounded-r-lg"
        >
          <Search size={18} />
        </button>
      </form>

      {/* ===== Search results dropdown ===== */}
      {showResults && debouncedQuery.trim() && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-[70vh] overflow-y-auto">
          {totalMatches === 0 ? (
            <p className="p-3 text-sm text-gray-500">
              No results for "{debouncedQuery}"
            </p>
          ) : (
            <>
              {/* ===== SERIES SECTION ===== */}
              {matchedSeries.length > 0 && (
                <div className="border-b">
                  <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                    Series
                  </p>
                  {matchedSeries.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => goToSeries(s.slug)}
                      className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-blue-50"
                    >
                      <Layers size={14} className="text-blue-600" />
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        View all
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* ===== PRODUCTS SECTION ===== */}
              {matchedProducts.length > 0 && (
                <div>
                  <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                    Products
                  </p>
                  {matchedProducts.map((p) => {
                    const price = p.discountPrice || p.price;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => goToProduct(p.id!)}
                        className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-blue-50"
                      >
                        <img
                          src={p.images?.[0] || "/placeholder.png"}
                          alt=""
                          className="w-10 h-10 rounded object-cover border"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {p.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {p.brand}
                            {p.seriesName ? ` • ${p.seriesName}` : ""}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-blue-600 whitespace-nowrap">
                          ৳{price}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t flex items-center gap-2"
                  >
                    <Package size={14} />
                    See all results for "{debouncedQuery}"
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          Mobile<span className="text-gray-900">_house</span>
        </Link>

        {/* Desktop search */}
        <div className="hidden md:flex flex-1 max-w-md">{SearchBox}</div>

        <nav className="hidden md:flex items-center gap-6 ml-auto">
          <Link href="/products" className="hover:text-blue-600">
            Products
          </Link>
          {user && (
            <Link href="/orders" className="hover:text-blue-600">
              Orders
            </Link>
          )}
          <Link href="/cart" className="relative hover:text-blue-600">
            <ShoppingCart />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold">
                  {(user.displayName || user.email || "U")[0].toUpperCase()}
                </div>
              )}
              <button
                onClick={logout}
                className="text-red-500 hover:text-red-700"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="btn-primary flex items-center gap-1"
            >
              <User size={16} /> Login
            </Link>
          )}
        </nav>

        <button className="md:hidden ml-auto" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden px-4 pb-4 space-y-3">
          <div onClick={ensureLoaded}>{SearchBox}</div>

          <Link href="/products" className="block py-2">
            Products
          </Link>
          <Link href="/cart" className="block py-2">
            Cart ({count})
          </Link>
          {user ? (
            <>
              <Link href="/orders" className="block py-2">
                Orders
              </Link>
              <button onClick={logout} className="block py-2 text-red-500">
                Logout
              </button>
            </>
          ) : (
            <Link href="/auth/login" className="block py-2 text-blue-600">
              Login
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
