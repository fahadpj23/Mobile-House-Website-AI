"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getOrdersByUser, updateOrder } from "@/lib/firestore";
import { Order } from "@/lib/types";
import toast from "react-hot-toast";
import Link from "next/link";

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    getOrdersByUser(user.uid).then((data) => {
      setOrders(data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setLoading(false);
    });
  }, [user]);

  const handleReturn = async (orderId: string) => {
    const reason = prompt("Reason for return?");
    if (!reason) return;
    await updateOrder(orderId, {
      returnRequested: true,
      returnReason: reason,
      status: "returned",
    });
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              returnRequested: true,
              returnReason: reason,
              status: "returned",
            }
          : o,
      ),
    );
    toast.success("Return requested");
  };

  if (authLoading || loading)
    return <p className="p-8 text-center">Loading...</p>;

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Please login to view orders</h1>
        <Link href="/auth/login" className="btn-primary">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card p-4">
              <div className="flex justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500">
                    Order #{order.id?.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.createdAt &&
                      new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      order.status === "delivered"
                        ? "bg-green-100 text-green-700"
                        : order.status === "cancelled" ||
                            order.status === "returned"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {order.status.toUpperCase()}
                  </span>
                  <p className="font-bold text-blue-600 mt-1">₹{order.total}</p>
                </div>
              </div>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <img
                      src={item.image}
                      alt=""
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-gray-500">
                        ₹{item.price} × {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-600">
                <p>
                  Payment: {order.paymentMethod.toUpperCase()} (
                  {order.paymentStatus})
                </p>
                <p>
                  Ship to: {order.shipping.name}, {order.shipping.phone} —{" "}
                  {order.shipping.address}
                </p>
              </div>
              {order.status === "delivered" && !order.returnRequested && (
                <button
                  onClick={() => handleReturn(order.id!)}
                  className="btn-outline text-sm mt-3 text-red-500 border-red-300 hover:border-red-500"
                >
                  Request Return
                </button>
              )}
              {order.returnRequested && (
                <p className="text-xs text-red-600 mt-2">
                  Return requested: {order.returnReason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
