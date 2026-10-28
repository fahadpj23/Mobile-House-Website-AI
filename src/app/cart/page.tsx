"use client";
import { useCart } from "@/components/CartProvider";
import Link from "next/link";
import { Trash2, ShoppingBag, Minus, Plus, ArrowLeft } from "lucide-react";

export default function CartPage() {
  const { items, removeItem, updateQty, total, isReady } = useCart();

  /* ---------- LOADING SKELETON ---------- */
  if (!isReady) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-gray-200" />
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="space-y-3 md:col-span-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-gray-100"
              />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </div>
    );
  }

  /* ---------- EMPTY STATE ---------- */
  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-20 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-blue-50">
          <ShoppingBag className="h-9 w-9 text-blue-600" strokeWidth={1.5} />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900 sm:text-3xl">
          Your cart is empty
        </h1>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          Looks like you haven't added anything yet. Explore our collection and
          find something you love.
        </p>
        <Link
          href="/products"
          className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  /* ---------- MAIN ---------- */
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Shopping Cart
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {items.length} {items.length === 1 ? "item" : "items"} in your cart
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue shopping
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3 md:items-start">
        {/* ---------- ITEMS ---------- */}
        <div className="order-2 space-y-3 md:order-1 md:col-span-2">
          {items.map((item) => {
            const key = `${item.product.id}__${item.variantId || "base"}`;
            const v = item.product.variants?.find(
              (x) => x.id === item.variantId,
            );
            const unitPrice = v
              ? (v.mrp ?? v.price)
              : (item.product.mrp ?? item.product.price);
            const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;

            let thumb = item.product.images?.[0] || "/placeholder.png";
            if (v && item.product.options) {
              const colorOpt = item.product.options.find(
                (o) => o.type === "color",
              );
              if (colorOpt) {
                const idx = item.product.options.findIndex(
                  (o) => o.id === colorOpt.id,
                );
                const valId = v.optionValueIds?.[idx];
                const img = colorOpt.values.find((cv) => cv.id === valId)
                  ?.images?.[0];
                if (img) thumb = img;
              }
            }

            return (
              <div
                key={key}
                className="group relative flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 transition-all duration-200 hover:border-gray-200 hover:shadow-md sm:gap-4 sm:p-4"
              >
                {/* Image */}
                <Link
                  href={`/products/${item.product.id}`}
                  className="block shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
                >
                  <img
                    src={thumb}
                    alt={item.product.name}
                    className="h-20 w-20 object-cover transition-transform duration-300 group-hover:scale-105 sm:h-24 sm:w-24"
                  />
                </Link>

                {/* Details */}
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <Link
                      href={`/products/${item.product.id}`}
                      className="line-clamp-2 pr-6 text-sm font-semibold text-gray-900 hover:text-blue-600 sm:text-base"
                    >
                      {item.product.name}
                    </Link>
                    {item.variantLabel && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {item.variantLabel}
                      </p>
                    )}
                    <p className="mt-1.5 text-sm font-semibold text-blue-600 tabular-nums sm:text-base">
                      ₹{unitPrice.toFixed(2)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {/* Qty stepper */}
                    <div className="inline-flex items-center overflow-hidden rounded-full border border-gray-200 bg-white">
                      <button
                        onClick={() => updateQty(key, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="grid h-8 w-8 place-items-center text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(key, item.quantity + 1)}
                        className="grid h-8 w-8 place-items-center text-gray-600 transition hover:bg-gray-50"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Line total */}
                    <span className="ml-auto whitespace-nowrap text-sm font-bold text-gray-900 tabular-nums sm:text-base">
                      ₹{lineTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeItem(key)}
                  className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  aria-label={`Remove ${item.product.name} from cart`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}

          <Link
            href="/products"
            className="inline-flex items-center gap-1 pt-2 text-sm font-medium text-blue-600 hover:underline md:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue shopping
          </Link>
        </div>

        {/* ---------- SUMMARY ---------- */}
        <aside className="order-1 h-fit md:sticky md:top-6 md:order-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-600">Subtotal</dt>
                <dd className="font-medium text-gray-900 tabular-nums">
                  ₹{total.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-600">Shipping</dt>
                <dd className="font-medium text-green-600">Free</dd>
              </div>
            </dl>

            <div className="my-4 border-t border-gray-100" />

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-base font-semibold text-gray-900">
                Total
              </span>
              <span className="text-xl font-bold text-gray-900 tabular-nums">
                ₹{total.toFixed(2)}
              </span>
            </div>

            <Link
              href="/checkout"
              className="btn-primary mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"
            >
              Proceed to Checkout
            </Link>
          </div>
        </aside>
      </div>

      {/* Sticky mobile checkout bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-1">
          <div className="flex-1">
            <p className="text-[11px] text-gray-500">Total</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              ₹{total.toFixed(2)}
            </p>
          </div>
          <Link
            href="/checkout"
            className="btn-primary rounded-full px-6 py-3 text-sm font-semibold shadow-lg"
          >
            Checkout
          </Link>
        </div>
      </div>

      {/* Spacer so sticky bar doesn't cover content */}
      <div className="h-20 md:hidden" />
    </div>
  );
}
