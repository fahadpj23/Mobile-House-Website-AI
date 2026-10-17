"use client";
import Link from "next/link";
import Image from "next/image"; // 👈 added
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import { useAuth } from "./AuthProvider";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { adminAuth } from "@/lib/firebase";
import {
  ShoppingCart,
  User as UserIcon,
  Search,
  Menu,
  ShieldCheck,
  LogOut,
  Package,
  ShoppingBag,
  FolderTree,
  LayoutDashboard,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  // If we're on an admin route, don't render anything here —
  // the admin layout supplies its own top bar.
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return <CustomerNavbar />;
}

/* ============================================================
   CUSTOMER TOP BAR
   ============================================================ */
function CustomerNavbar() {
  const { items } = useCart();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  // Detect an active admin session so we can hide customer UI
  const [adminUser, setAdminUser] = useState<FirebaseUser | null>(null);
  const [adminChecked, setAdminChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(adminAuth, (u) => {
      setAdminUser(u);
      setAdminChecked(true);
    });
    return () => unsub();
  }, []);

  const adminSignedIn = adminChecked && !!adminUser;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/products?q=${encodeURIComponent(q.trim())}`);
  };

  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <header className="bg-white border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Mobile menu */}
        <button className="md:hidden" onClick={() => setOpen((o) => !o)}>
          <Menu size={20} />
        </button>

        {/* Logo — always links to home for customers */}
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/mobileHouseLogo.png"
            alt="Mobile House"
            width={160}
            height={40}
            priority
            className="h-8 md:h-9 w-auto object-contain"
          />
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

        {/* Right side */}
        <nav className="ml-auto flex items-center gap-4">
          <Link
            href="/products"
            className="hidden md:inline text-sm hover:text-blue-600"
          >
            Shop
          </Link>

          {/* Cart */}
          {!adminSignedIn && (
            <Link href="/cart" className="relative">
              <ShoppingCart size={20} />
              {count > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
          )}

          {/* Admin signed in → show a link to their panel instead of Login */}
          {adminSignedIn ? (
            <Link
              href="/admin"
              className="flex items-center gap-1 text-sm font-medium text-blue-600 border border-blue-200 hover:border-blue-400 rounded-lg px-3 py-1.5"
            >
              <ShieldCheck size={15} />
              <span className="hidden sm:inline">Admin Panel</span>
            </Link>
          ) : user ? (
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
                <Link
                  href="/admin"
                  className="block px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Admin
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
