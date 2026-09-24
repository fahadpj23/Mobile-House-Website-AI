"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Tag,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import AdminGuard from "@/components/AdminGuard";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/brands", label: "Brands", icon: Tag },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  if (pathname === "/admin/login" || pathname === "/admin/signup") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-gray-900 text-white p-4 hidden md:flex flex-col">
        <h2 className="text-xl font-bold mb-6 text-blue-400">Admin Panel</h2>
        <nav className="space-y-1 flex-1">
          {links.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  active ? "bg-blue-600" : "hover:bg-gray-800"
                }`}
              >
                <Icon size={18} /> {l.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-gray-800 mt-4"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>
      <main className="flex-1 p-6 bg-gray-50 overflow-x-auto">{children}</main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
