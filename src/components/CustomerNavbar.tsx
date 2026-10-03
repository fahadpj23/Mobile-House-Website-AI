"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import { useAuth } from "./AuthProvider";
import { ShoppingCart, User as UserIcon, Search, Menu } from "lucide-react";

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
  const [open, setOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/products?q=${encodeURIComponent(q.trim())}`);
  };

  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <header className="bg-white border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Mobile menu toggle */}
        <button className="md:hidden" onClick={() => setOpen((o) => !o)}>
          <Menu size={20} />
        </button>

        {/* Logo */}
        <Link href="/" className="font-bold text-lg text-blue-600 shrink-0">
          Mobile_house
        </Link>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-xl relative"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products..."
            className="input pl-9"
          />
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </form>

        {/* Right nav — always customer-only */}
        <nav className="ml-auto flex items-center gap-4">
          <Link
            href="/products"
            className="hidden md:inline text-sm hover:text-blue-600"
          >
            Shop
          </Link>

          {/* Cart */}
          <Link href="/cart" className="relative">
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>

          {/* User / Login */}
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

      {/* Mobile search */}
      {open && (
        <div className="md:hidden border-t px-4 py-2">
          <form onSubmit={handleSearch} className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              className="input pl-9"
            />
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </form>
        </div>
      )}
    </header>
  );
}
