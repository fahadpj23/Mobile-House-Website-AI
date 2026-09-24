"use client";
import { useEffect, useState } from "react";
import { getProducts, getOrders, getCategories } from "@/lib/firestore";
import { Package, ShoppingBag, FolderTree, DollarSign } from "lucide-react";
import { makeAdmin } from "@/lib/adminAuth";

export default function AdminDashboard() {
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
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
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
        <button
          onClick={async () => {
            const uid = prompt("Enter user UID to promote:");
            const email = prompt("Enter user email:");
            if (uid && email) {
              await makeAdmin(uid, email);
              alert("User promoted to admin");
            }
          }}
          className="btn-outline mt-4"
        >
          + Promote User to Admin
        </button>
      </div>
    </div>
  );
}
