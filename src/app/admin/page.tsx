"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getProducts, getOrders, getCategories } from "@/lib/firestore";
import {
  Package,
  ShoppingBag,
  FolderTree,
  DollarSign,
  Users,
} from "lucide-react";
import { useAdminAuth } from "@/components/AdminAuthProvider";

export default function AdminDashboard() {
  const { isSuper, admin } = useAdminAuth();

  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    categories: 0,
    revenue: 0,
  });

  useEffect(() => {
    (async () => {
      const [p, o, c] = await Promise.all([
        getProducts(),
        getOrders(),
        getCategories(),
      ]);
      setStats({
        products: p.length,
        orders: o.length,
        categories: c.length,
        revenue: o
          .filter((x) => x.status !== "cancelled")
          .reduce((s, x) => s + x.total, 0),
      });
    })();
  }, []);

  const cards = [
    {
      label: "Products",
      value: stats.products,
      icon: Package,
      color: "bg-blue-500",
    },
    {
      label: "Orders",
      value: stats.orders,
      icon: ShoppingBag,
      color: "bg-green-500",
    },
    {
      label: "Categories",
      value: stats.categories,
      icon: FolderTree,
      color: "bg-purple-500",
    },
    {
      label: "Revenue",
      value: `৳${stats.revenue}`,
      icon: DollarSign,
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {admin?.email && (
          <p className="text-sm text-gray-500 mt-1">
            Signed in as <b>{admin.email}</b>
            {isSuper ? " (super admin)" : " (limited access)"}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-5">
              <div
                className={`${c.color} w-10 h-10 rounded-lg flex items-center justify-center text-white mb-3`}
              >
                <Icon size={20} />
              </div>
              <p className="text-sm text-gray-500">{c.label}</p>
              <p className="text-2xl font-bold">{c.value}</p>
            </div>
          );
        })}
      </div>

      {isSuper && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-blue-600" />
            <h2 className="font-bold">Manage admin users</h2>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Create new admin accounts and control which sections they can
            access.
          </p>
          <Link
            href="/admin/users"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Users size={16} /> Manage Admin Users
          </Link>
        </div>
      )}
    </div>
  );
}
