"use client";
import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAdminAuth } from "./AdminAuthProvider";
import type { AdminSection } from "@/lib/types";

function sectionForPath(pathname: string): AdminSection | null {
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  if (pathname.startsWith("/admin/products")) return "products";
  if (pathname.startsWith("/admin/categories")) return "categories";
  if (pathname.startsWith("/admin/brands")) return "brands";
  if (pathname.startsWith("/admin/banners")) return "banners";
  if (pathname.startsWith("/admin/offers")) return "offers";
  if (pathname.startsWith("/admin/orders")) return "orders";
  if (pathname.startsWith("/admin/users")) return "users";
  return null;
}

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { user, admin, loading, canAccess, isSuper } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (pathname === "/admin/login" || pathname === "/admin/signup") {
      setChecking(false);
      return;
    }

    (async () => {
      if (!user || !admin) {
        router.replace("/admin/login?error=not_admin");
        return;
      }

      const section = sectionForPath(pathname);
      if (section === "users" && !isSuper) {
        router.replace("/admin?error=no_access");
        return;
      }
      if (section && section !== "users" && !canAccess(section)) {
        router.replace("/admin?error=no_access");
        return;
      }

      setChecking(false);
    })();
  }, [user, admin, loading, pathname, router, canAccess, isSuper]);

  if (pathname === "/admin/login" || pathname === "/admin/signup") {
    return <>{children}</>;
  }

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Checking authorization...
      </div>
    );
  }

  return <>{children}</>;
}
