"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Tag,
  Percent,
  LogOut,
  Image,
  Menu,
  X,
  Loader2,
  Users,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import {
  AdminAuthProvider,
  useAdminAuth,
} from "@/components/AdminAuthProvider";
import AdminGuard from "@/components/AdminGuard";
import toast from "react-hot-toast";
import type { AdminSection } from "@/lib/types";

const links: {
  href: string;
  label: string;
  icon: any;
  section: AdminSection;
}[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    section: "dashboard",
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: Package,
    section: "products",
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: FolderTree,
    section: "categories",
  },
  { href: "/admin/brands", label: "Brands", icon: Tag, section: "brands" },
  { href: "/admin/banners", label: "Banners", icon: Image, section: "banners" },
  {
    href: "/admin/offers",
    label: "Special Offers",
    icon: Percent,
    section: "offers",
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ShoppingBag,
    section: "orders",
  },
  { href: "/admin/users", label: "Admin Users", icon: Users, section: "users" },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, admin, canAccess, isSuper } = useAdminAuth();

  const [isNavigating, setIsNavigating] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    const t = setTimeout(() => setIsNavigating(false), 300);
    return () => clearTimeout(t);
  }, [pathname]);

  const handleNavClick = (href: string) => {
    if (href !== pathname) setIsNavigating(true);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    if (!confirm("Log out of the admin panel?")) return;
    setLoggingOut(true);
    await logout();
  };

  if (pathname === "/admin/login" || pathname === "/admin/signup") {
    return <>{children}</>;
  }

  const visibleLinks = links.filter((l) => {
    if (l.section === "users") return isSuper;
    return canAccess(l.section);
  });

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-1 flex-1">
      {visibleLinks.map((l) => {
        const active = isActive(l.href);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            prefetch
            onClick={() => {
              handleNavClick(l.href);
              onClick?.();
            }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
              active ? "bg-blue-600" : "hover:bg-gray-800"
            }`}
          >
            <Icon size={18} /> {l.label}
          </Link>
        );
      })}
    </nav>
  );

  const SidebarLogout = () => (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-gray-800 mt-4 transition disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loggingOut ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <LogOut size={18} />
      )}
      {loggingOut ? "Logging out…" : "Logout"}
    </button>
  );

  const AdminInfo = () =>
    admin ? (
      <div className="px-3 py-2 text-[11px] text-gray-400 border-t border-gray-800 mt-2 truncate">
        {admin.email}
        <div className="text-[10px] text-gray-500">
          {isSuper ? "Super admin · all access" : "Admin"}
        </div>
      </div>
    ) : null;

  return (
    <div className="min-h-screen flex">
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-[60] h-1 overflow-hidden bg-blue-100">
          <div className="h-full bg-blue-600 animate-[loading_0.6s_ease-in-out_infinite]" />
          <style jsx>{`
            @keyframes loading {
              0% {
                transform: translateX(-100%);
                width: 40%;
              }
              50% {
                width: 60%;
              }
              100% {
                transform: translateX(300%);
                width: 40%;
              }
            }
          `}</style>
        </div>
      )}

      {/* ── SIDEBAR (dark) ── */}
      <aside className="w-60 bg-gray-900 text-white p-4 hidden md:flex flex-col">
        <h2 className="text-xl font-bold mb-6 text-blue-400">Admin Panel</h2>
        <NavLinks />
        <AdminInfo />
        <SidebarLogout />
      </aside>

      {/* ── MOBILE DRAWER ── */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white p-4 z-50 md:hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-blue-400">Admin Panel</h2>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <NavLinks onClick={() => setMobileOpen(false)} />
            <AdminInfo />
            <SidebarLogout />
          </aside>
        </>
      )}

      {/* ── MAIN ── */}
      <main className="flex-1 bg-gray-50 overflow-x-auto flex flex-col">
        {/* ★ ADMIN TOP BAR — distinct look from customer nav */}
        <header className="sticky top-0 z-30 bg-gray-900 text-white shadow-sm">
          <div className="flex items-center justify-between px-3 md:px-6 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden text-gray-200 shrink-0"
                aria-label="Open menu"
              >
                <Menu size={22} />
              </button>

              <ShieldCheck size={20} className="text-blue-400 shrink-0" />

              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-bold truncate leading-tight">
                  Admin Panel
                </h1>
                {admin?.email && (
                  <p className="text-[11px] text-gray-400 truncate leading-tight">
                    {admin.email}
                    <span className="ml-2 text-[10px] uppercase tracking-wide bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      {isSuper ? "super" : "admin"}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/"
                className="hidden sm:flex items-center gap-1.5 text-xs text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-2.5 py-1.5 transition"
                title="View storefront"
              >
                <ExternalLink size={14} />
                View Store
              </Link>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg px-2.5 py-1.5 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loggingOut ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <LogOut size={15} />
                )}
                <span className="hidden sm:inline">
                  {loggingOut ? "Logging out…" : "Logout"}
                </span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 flex-1 relative">
          {children}

          {isNavigating && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-start justify-center pointer-events-none z-10 pt-24">
              <div className="flex items-center gap-2 bg-white shadow-md border rounded-full px-4 py-2">
                <Loader2 size={16} className="animate-spin text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  Loading…
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <AdminGuard>
        <AdminShell>{children}</AdminShell>
      </AdminGuard>
    </AdminAuthProvider>
  );
}
