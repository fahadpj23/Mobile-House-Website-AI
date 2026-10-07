"use client";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { useAuth } from "@/components/AuthProvider";
import { createOrder } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { PaymentMethod } from "@/lib/types";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("cod");
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
          const unitPrice = v
            ? v.discountPrice || v.price
            : i.product.discountPrice || i.product.price;

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
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="card p-5">
            <h2 className="font-bold mb-3">Shipping Information</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                required
                placeholder="Full Name"
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                required
                placeholder="Phone"
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <input
                required
                placeholder="City"
                className="input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <input
                placeholder="Notes (optional)"
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <textarea
                required
                placeholder="Full Address"
                className="input sm:col-span-2"
                rows={3}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-bold mb-3">Payment Method</h2>
            <div className="space-y-2">
              {[
                { id: "cod", label: "Cash on Delivery" },
                { id: "card", label: "Card Payment" },
                { id: "bkash", label: "bKash" },
                { id: "nagad", label: "Nagad" },
              ].map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-blue-50"
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === m.id}
                    onChange={() => setPayment(m.id as PaymentMethod)}
                  />
                  <span>{m.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-5 h-fit">
          <h2 className="font-bold text-lg mb-4">Your Order</h2>
          <div className="space-y-3 max-h-80 overflow-auto mb-4">
            {items.map((i) => {
              const key = `${i.product.id}__${i.variantId || "base"}`;
              const v = i.product.variants?.find((x) => x.id === i.variantId);
              const unit = v
                ? v.discountPrice || v.price
                : i.product.discountPrice || i.product.price;

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
                <div key={key} className="flex gap-3 text-sm">
                  {image && (
                    <img
                      src={image}
                      alt=""
                      className="w-12 h-12 rounded object-cover border shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-2">{i.product.name}</p>
                    {i.variantLabel && (
                      <p className="text-[11px] text-gray-500">
                        {i.variantLabel}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-500">
                      ₹{unit} × {i.quantity}
                    </p>
                  </div>
                  <span className="font-medium whitespace-nowrap">
                    ₹{unit * i.quantity}
                  </span>
                </div>
              );
            })}
          </div>
          <hr className="my-3" />
          <div className="flex justify-between text-sm mb-1">
            <span>Subtotal</span>
            <span>₹{total}</span>
          </div>
          <div className="flex justify-between text-sm mb-3">
            <span>Shipping</span>
            <span>Free</span>
          </div>
          <div className="flex justify-between font-bold text-lg mb-4">
            <span>Total</span>
            <span className="text-blue-600">₹{total}</span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:bg-gray-400"
          >
            {loading ? "Placing..." : "Place Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
