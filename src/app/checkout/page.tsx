// app/checkout/page.tsx
"use client";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { useAuth } from "@/components/AuthProvider";
import { createOrder } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { PaymentMethod } from "@/lib/types";
import { ShieldCheck, Truck, Lock } from "lucide-react";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Fixed to COD only as requested
  const payment: PaymentMethod = "cod";

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login first");
      router.push("/auth/login");
      return;
    }
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setLoading(true);
    try {
      await createOrder({
        userId: user.uid,
        items: items.map((i) => {
          const v = i.product.variants?.find((x) => x.id === i.variantId);

          // ✅ USING ACTUAL PRICE INSTEAD OF MRP
          const unitPrice = v ? v.price : i.product.price;

          // Pick color image as thumbnail if available
          let image = i.product.images[0] || "";
          if (v && i.product.options) {
            const colorOpt = i.product.options.find((o) => o.type === "color");
            if (colorOpt) {
              const colorIdx = i.product.options.findIndex(
                (o) => o.id === colorOpt.id,
              );
              const colorValId = v.optionValueIds[colorIdx];
              const colorImg = colorOpt.values.find(
                (cv) => cv.id === colorValId,
              )?.images?.[0];
              if (colorImg) image = colorImg;
            }
          }

          return {
            productId: i.product.id!,
            variantId: i.variantId,
            variantLabel: i.variantLabel,
            name: i.variantLabel
              ? `${i.product.name} (${i.variantLabel})`
              : i.product.name,
            price: unitPrice,
            quantity: i.quantity,
            image,
          };
        }),
        total,
        status: "pending",
        paymentMethod: payment,
        paymentStatus: "unpaid",
        shipping: form,
      });
      clearCart();
      toast.success("Order placed successfully!");
      router.push("/orders");
    } catch (err) {
      console.error(err);
      toast.error("Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
          Checkout
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Please enter your shipping details to complete the order.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid lg:grid-cols-12 gap-8 items-start"
      >
        {/* LEFT COLUMN: FORM */}
        <div className="lg:col-span-7 space-y-6">
          {/* Shipping Info */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-4 text-gray-900 flex items-center gap-2">
              <Truck size={18} className="text-gray-400" /> Shipping Information
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">
                  Full Name *
                </label>
                <input
                  required
                  placeholder="e.g. John Doe"
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">
                  Phone *
                </label>
                <input
                  required
                  placeholder="e.g. +91 9876543210"
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-600">
                  City *
                </label>
                <input
                  required
                  placeholder="e.g. Mumbai"
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-600">
                  Full Address *
                </label>
                <textarea
                  required
                  placeholder="House no, Street, Area..."
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 min-h-[100px]"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-600">
                  Notes (optional)
                </label>
                <input
                  placeholder="Any delivery instructions?"
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Payment Method (Locked to COD) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-4 text-gray-900 flex items-center gap-2">
              <ShieldCheck size={18} className="text-gray-400" /> Payment Method
            </h2>

            <div className="flex items-center gap-3 p-4 border-2 border-gray-900 bg-gray-50 rounded-xl">
              <div className="w-5 h-5 rounded-full border-2 border-gray-900 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-gray-900 rounded-full" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">
                  Cash on Delivery
                </p>
                <p className="text-xs text-gray-500">
                  Pay with cash when your order is delivered.
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
              <Lock size={12} /> Online payments are currently unavailable.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: ORDER SUMMARY */}
        <div className="lg:col-span-5 w-full">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm sticky top-24">
            <h2 className="font-bold text-lg mb-5 text-gray-900">
              Order Summary
            </h2>

            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar mb-6">
              {items.map((i) => {
                const key = `${i.product.id}__${i.variantId || "base"}`;
                const v = i.product.variants?.find((x) => x.id === i.variantId);

                // ✅ USING ACTUAL PRICE INSTEAD OF MRP
                const unit = v ? v.price : i.product.price;

                let image = i.product.images[0] || "";
                if (v && i.product.options) {
                  const colorOpt = i.product.options.find(
                    (o) => o.type === "color",
                  );
                  if (colorOpt) {
                    const colorIdx = i.product.options.findIndex(
                      (o) => o.id === colorOpt.id,
                    );
                    const colorValId = v.optionValueIds[colorIdx];
                    const colorImg = colorOpt.values.find(
                      (cv) => cv.id === colorValId,
                    )?.images?.[0];
                    if (colorImg) image = colorImg;
                  }
                }

                return (
                  <div
                    key={key}
                    className="flex gap-3 py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden shrink-0">
                      {image && (
                        <img
                          src={image}
                          alt=""
                          className="w-full h-full object-contain p-1"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-[13px] font-semibold text-gray-900 line-clamp-1">
                        {i.product.name}
                      </p>
                      {i.variantLabel && (
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {i.variantLabel}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[12px] text-gray-500">
                          Qty: {i.quantity}
                        </p>
                        <p className="text-[13px] font-bold text-gray-900">
                          ₹{unit * i.quantity}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2.5 text-sm border-t border-gray-100 pt-4">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="text-gray-900">₹{total}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Shipping</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">₹{total}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full h-12 mt-6 rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center ${
                loading
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-gray-900 hover:bg-black text-white active:scale-[0.98]"
              }`}
            >
              {loading ? "Placing Order..." : "Place Order"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
