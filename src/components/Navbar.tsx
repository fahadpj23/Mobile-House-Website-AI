"use client";
import Link from "next/link";
import { ShoppingCart, User, LogOut, Menu, Search } from "lucide-react";
import { useCart } from "./CartProvider";
import { useAuth } from "./AuthProvider";
import { isAdminUser } from "@/lib/adminAuth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { count } = useCart();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [admin, setAdmin] = useState(false);
  const router = useRouter();

  // Check admin status whenever user changes
  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await isAdminUser(user);
      if (alive) setAdmin(ok);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/products?q=${encodeURIComponent(search)}`);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          Mobile<span className="text-gray-900">_house</span>
        </Link>

        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-md"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phones..."
            className="input rounded-r-none"
          />
          <button className="bg-blue-600 text-white px-4 rounded-r-lg">
            <Search size={18} />
          </button>
        </form>

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
              {/* ✅ Admin link only visible to admins */}
              {admin && (
                <Link
                  href="/admin"
                  className="text-blue-600 font-medium hover:text-blue-800 text-sm"
                >
                  Admin
                </Link>
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
          <Menu />
        </button>
      </div>

      {open && (
        <div className="md:hidden px-4 pb-4 space-y-2">
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
              {admin && (
                <Link href="/admin" className="block py-2 text-blue-600">
                  Admin
                </Link>
              )}
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
