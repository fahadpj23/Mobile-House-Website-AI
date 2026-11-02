"use client";
import { useEffect, useState } from "react";
import { getOrders, updateOrder } from "@/lib/firestore";
import { Order, OrderStatus } from "@/lib/types";
import toast from "react-hot-toast";
import { ImageOff, Package } from "lucide-react";

const statuses: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

/* ─────────────────────────────────────────────────────
   Helpers
   The order item type may store the image under different
   names depending on how checkout saves it, so we check
   the common ones. Add yours here if it is named differently.
   ───────────────────────────────────────────────────── */
function getItemImage(it: any): string {
  return (
    it?.image ||
    it?.imageUrl ||
    it?.thumbnail ||
    (Array.isArray(it?.images) ? it.images[0] : "") ||
    (Array.isArray(it?.product?.images) ? it.product.images[0] : "") ||
    ""
  );
}

function getItemVariantLabel(it: any): string {
  return (it?.variantLabel || "").toString().trim();
}

function getItemOptions(it: any): { name: string; value: string }[] {
  return Array.isArray(it?.selectedOptions)
    ? it.selectedOptions.filter((o: any) => o?.name && o?.value)
    : [];
}

/* ─────────────────────────────────────────────────────
   Product thumbnail (fixed size box, image never changes
   the layout while loading)
   ───────────────────────────────────────────────────── */
function ItemThumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full max-w-full max-h-full object-contain p-1"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-gray-300">
          {failed ? <ImageOff size={20} /> : <Package size={20} />}
        </div>
      )}
    </div>
  );
}

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
    <div className="w-full max-w-full overflow-x-clip">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const totalUnits = o.items.reduce((s, it) => s + it.quantity, 0);

            return (
              <div key={o.id} className="card p-4 min-w-0">
                {/* ───────── Order header ───────── */}
                <div className="flex flex-wrap justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="font-bold">
                      Order #{o.id?.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {o.createdAt && new Date(o.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm mt-1">
                      <b>Customer:</b> {o.shipping.name} ({o.shipping.phone})
                    </p>
                    <p className="text-xs text-gray-600 break-words">
                      {o.shipping.address}, {o.shipping.city}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-600">
                      ₹{o.total}
                    </p>
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

                {/* ───────── Products (each one separate) ───────── */}
                <div className="border-t pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    {o.items.length} product{o.items.length === 1 ? "" : "s"}
                    {" · "}
                    {totalUnits} unit{totalUnits === 1 ? "" : "s"}
                  </p>

                  <div className="space-y-2">
                    {o.items.map((it: any, i: number) => {
                      const image = getItemImage(it);
                      const variantLabel = getItemVariantLabel(it);
                      const options = getItemOptions(it);

                      return (
                        <div
                          key={`${it.productId || it.name}-${it.variantId || i}-${i}`}
                          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5 sm:p-3 min-w-0"
                        >
                          <ItemThumb src={image} alt={it.name} />

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 line-clamp-2 break-words">
                              {it.name}
                            </p>

                            {variantLabel && (
                              <p className="text-xs text-gray-500 mt-0.5 break-words">
                                {variantLabel}
                              </p>
                            )}

                            {options.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {options.map((opt: any, k: number) => (
                                  <span
                                    key={k}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                                  >
                                    {opt.name}: {opt.value}
                                  </span>
                                ))}
                              </div>
                            )}

                            <p className="text-xs text-gray-500 mt-1">
                              ₹{it.price} × {it.quantity}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-gray-900">
                              ₹{it.price * it.quantity}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              Qty {it.quantity}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {o.returnRequested && (
                  <p className="text-xs text-red-600 mt-3">
                    ⚠ Return requested: {o.returnReason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
