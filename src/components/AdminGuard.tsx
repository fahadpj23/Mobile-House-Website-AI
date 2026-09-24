"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { isAdminUser } from "@/lib/adminAuth";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Skip guard on the admin login page itself
    if (pathname === "/admin/login") {
      setChecking(false);
      return;
    }

    if (loading) return;

    if (!user) {
      router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    (async () => {
      const ok = await isAdminUser(user);
      if (!ok) {
        router.replace("/admin/login?error=not_admin");
        return;
      }
      setChecking(false);
    })();
  }, [user, loading, pathname, router]);

  if (pathname === "/admin/login") return <>{children}</>;

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
