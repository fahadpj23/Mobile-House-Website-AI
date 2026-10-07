"use client";
import { useCart } from "@/components/CartProvider";
import Link from "next/link";
import { Trash2 } from "lucide-react";

export default function CartPage() {
  const { items, removeItem, updateQty, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Link href="/products" className="btn-primary inline-block">
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          {items.map((item) => {
            const key = `${item.product.id}__${item.variantId || "base"}`;
            const v = item.product.variants?.find(
              (x) => x.id === item.variantId,
            );
            const unitPrice = v
              ? v.discountPrice || v.price
              : item.product.discountPrice || item.product.price;

            // Thumbnail: use first color image if the variant has a color
            let thumb = item.product.images[0] || "/placeholder.png";
            if (v && item.product.options) {
              const colorOpt = item.product.options.find(
                (o) => o.type === "color",
              );
              if (colorOpt) {
                const idx = item.product.options.findIndex(
                  (o) => o.id === colorOpt.id,
                );
                const valId = v.optionValueIds[idx];
                const img = colorOpt.values.find((cv) => cv.id === valId)
                  ?.images?.[0];
                if (img) thumb = img;
              }
            }

            return (
              <div key={key} className="card p-4 flex gap-4 items-center">
                <img
                  src={thumb}
                  alt=""
                  className="w-20 h-20 object-cover rounded shrink-0 border"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold line-clamp-2">
                    {item.product.name}
                  </h3>
                  {item.variantLabel && (
                    <p className="text-xs text-gray-500">{item.variantLabel}</p>
                  )}
                  <p className="text-blue-600 font-bold mt-1">₹{unitPrice}</p>
                </div>
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => updateQty(key, item.quantity - 1)}
                    className="px-3 py-1"
                  >
                    −
                  </button>
                  <span className="px-3">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(key, item.quantity + 1)}
                    className="px-3 py-1"
                  >
                    +
                  </button>
                </div>
                <p className="font-bold w-20 text-right">
                  ₹{unitPrice * item.quantity}
                </p>
                <button
                  onClick={() => removeItem(key)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="card p-6 h-fit">
          <h2 className="font-bold text-lg mb-4">Order Summary</h2>
          <div className="flex justify-between mb-2">
            <span>Subtotal</span>
            <span>₹{total}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Shipping</span>
            <span>Free</span>
          </div>
          <hr className="my-3" />
          <div className="flex justify-between font-bold text-lg mb-4">
            <span>Total</span>
            <span className="text-blue-600">₹{total}</span>
          </div>
          <Link href="/checkout" className="btn-primary block text-center">
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
