"use client";
import { useEffect, useState } from "react";
import { getOrders, updateOrder } from "@/lib/firestore";
import { Order, OrderStatus } from "@/lib/types";
import toast from "react-hot-toast";

const statuses: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setOrders(await getOrders());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const changeStatus = async (id: string, status: OrderStatus) => {
    await updateOrder(id, { status });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success(`Status: ${status}`);
  };

  const togglePayment = async (id: string, current: string) => {
    const next = current === "paid" ? "unpaid" : "paid";
    await updateOrder(id, { paymentStatus: next as "paid" | "unpaid" });
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, paymentStatus: next as "paid" | "unpaid" } : o,
      ),
    );
    toast.success(`Payment: ${next}`);
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="card p-4">
              <div className="flex flex-wrap justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold">
                    Order #{o.id?.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {o.createdAt && new Date(o.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm mt-1">
                    <b>Customer:</b> {o.shipping.name} ({o.shipping.phone})
                  </p>
                  <p className="text-xs text-gray-600">
                    {o.shipping.address}, {o.shipping.city}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-blue-600">৳{o.total}</p>
                  <p className="text-xs">
                    {o.paymentMethod.toUpperCase()} -{" "}
                    <button
                      onClick={() => togglePayment(o.id!, o.paymentStatus)}
                      className={`underline ${
                        o.paymentStatus === "paid"
                          ? "text-green-600"
                          : "text-orange-600"
                      }`}
                    >
                      {o.paymentStatus}
                    </button>
                  </p>
                  <select
                    value={o.status}
                    onChange={(e) =>
                      changeStatus(o.id!, e.target.value as OrderStatus)
                    }
                    className="input mt-2 py-1 text-sm"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1 text-sm border-t pt-2">
                {o.items.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span>
                      {it.name} × {it.quantity}
                    </span>
                    <span>৳{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>
              {o.returnRequested && (
                <p className="text-xs text-red-600 mt-2">
                  ⚠ Return requested: {o.returnReason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
