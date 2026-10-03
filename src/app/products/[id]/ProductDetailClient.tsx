"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/lib/types";
import { useCart } from "@/components/CartProvider";
import toast from "react-hot-toast";
import {
  ShoppingCart,
  Truck,
  Shield,
  RotateCcw,
  Minus,
  Plus,
  Check,
  AlertTriangle,
} from "lucide-react";

export default function ProductDetailClient({ product }: { product: Product }) {
  const { addItem } = useCart();
  const router = useRouter();

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  const hasVariants = !!product.options?.length && !!product.variants?.length;

  useEffect(() => {
    if (!hasVariants) return;

    const firstAvailable =
      product.variants!.find((v) => v.enabled && v.stock > 0) ||
      product.variants!.find((v) => v.enabled) ||
      product.variants![0];

    if (!firstAvailable) return;

    const preset: Record<string, string> = {};
    product.options!.forEach((opt, i) => {
      preset[opt.id] = firstAvailable.optionValueIds[i];
    });
    setSelected(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const activeVariant = useMemo(() => {
    if (!hasVariants) return undefined;
    return product.variants!.find((v) =>
      product.options!.every((o, i) => v.optionValueIds[i] === selected[o.id]),
    );
  }, [hasVariants, product.options, product.variants, selected]);

  const variantSuffix = useMemo(() => {
    if (!hasVariants) return "";

    const ramOptIdx = product.options!.findIndex((o) => /ram/i.test(o.name));
    const ramLabel =
      ramOptIdx >= 0 ? selected[product.options![ramOptIdx].id] : undefined;

    const ramValue =
      ramLabel && ramOptIdx >= 0
        ? product.options![ramOptIdx].values.find((v) => v.id === ramLabel)
            ?.label
        : undefined;

    const restParts: string[] = [];
    product.options!.forEach((o, i) => {
      if (i === ramOptIdx) return;
      const valId = selected[o.id];
      if (!valId) return;
      const v = o.values.find((x) => x.id === valId);
      if (v?.label) restParts.push(v.label);
    });

    const groups: string[] = [];
    if (restParts.length) groups.push(`(${restParts.join(", ")})`);
    if (ramValue) groups.push(`(${ramValue})`);
    return groups.length ? ` ${groups.join(" ")}` : "";
  }, [hasVariants, product.options, selected]);

  const displayTitle = `${product.name}${variantSuffix}`;

  const gallery = useMemo(() => {
    const base = product.images || [];
    if (!hasVariants || !activeVariant) return base;

    const colorOpt = product.options!.find((o) => o.type === "color");
    if (!colorOpt) return base;

    const colorIdx = product.options!.findIndex((o) => o.id === colorOpt.id);
    const colorValId = activeVariant.optionValueIds[colorIdx];
    const colorImages =
      colorOpt.values.find((v) => v.id === colorValId)?.images || [];

    if (colorImages.length === 0) return base;

    const seen = new Set<string>();
    const out: string[] = [];
    for (const url of [...colorImages, ...base]) {
      if (!seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
    }
    return out;
  }, [hasVariants, activeVariant, product.images, product.options]);

  useEffect(() => {
    setActiveImg(0);
  }, [gallery.length]);

  const safeActiveImg = Math.min(activeImg, gallery.length - 1);

  // ★ Selling price
  const price = activeVariant ? activeVariant.price : product.price;

  // ★ MRP (original list price)
  const originalPrice = activeVariant
    ? activeVariant.discountPrice
    : product.discountPrice;

  const stock = activeVariant ? activeVariant.stock : product.stock;

  useEffect(() => {
    setQty((q) => Math.max(1, Math.min(q, Math.max(1, stock))));
  }, [stock]);

  // ★ Discount only when MRP > price
  const hasMrp = typeof originalPrice === "number" && originalPrice > price;
  const discountPct = hasMrp
    ? Math.round(((originalPrice! - price) / originalPrice!) * 100)
    : 0;

  const valueAvailable = (optId: string, valId: string): boolean => {
    if (!hasVariants) return true;
    const candidate = { ...selected, [optId]: valId };
    const fullySelected = product.options!.every((o) => candidate[o.id]);
    if (!fullySelected) return true;
    const match = product.variants!.find((v) =>
      product.options!.every((o, i) => v.optionValueIds[i] === candidate[o.id]),
    );
    return !!match && match.enabled && match.stock > 0;
  };

  const canDecrement = qty > 1 && stock > 0;
  const canIncrement = qty < stock;

  const decQty = () => {
    if (!canDecrement) return;
    setQty((q) => Math.max(1, q - 1));
  };

  const incQty = () => {
    if (!canIncrement) {
      if (stock > 0) toast.error(`Only ${stock} in stock`);
      return;
    }
    setQty((q) => q + 1);
  };

  const handleAdd = () => {
    if (hasVariants && !activeVariant) {
      toast.error("Please select all options");
      return;
    }
    if (hasVariants && (!activeVariant!.enabled || activeVariant!.stock <= 0)) {
      toast.error("This variant is out of stock");
      return;
    }
    if (stock <= 0) {
      toast.error("Out of stock");
      return;
    }
    if (qty > stock) {
      toast.error(`Only ${stock} in stock`);
      return;
    }

    const trimmedSuffix = variantSuffix.trim();
    const variantLabel = trimmedSuffix || undefined;

    const selectedOptions = hasVariants
      ? product.options!.map((o, i) => ({
          name: o.name,
          value:
            o.values.find((v) => v.id === activeVariant!.optionValueIds[i])
              ?.label || "",
        }))
      : undefined;

    addItem(product, qty, {
      variantId: activeVariant?.id,
      variantLabel,
      selectedOptions,
    });

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);

    toast.success("Added to cart — heading to checkout");
    router.push("/checkout");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8">
      {/* IMAGES */}
      <div className="md:sticky md:top-20 self-start">
        <div className="bg-white rounded-2xl overflow-hidden aspect-square max-w-md mx-auto flex items-center justify-center p-6 border shadow-sm">
          <img
            src={gallery[safeActiveImg] || "/placeholder.png"}
            alt={displayTitle}
            className="w-full h-full object-contain"
          />
        </div>

        {gallery.length > 1 && (
          <div className="flex gap-2 mt-4 justify-center flex-wrap">
            {gallery.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition ${
                  safeActiveImg === i
                    ? "border-blue-600 ring-2 ring-blue-100"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* INFO */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">
            {product.brand}
          </p>

          {stock > 0 ? (
            stock <= 5 ? (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200">
                <AlertTriangle size={13} />
                Only {stock} left
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-200">
                <Check size={13} />
                {stock} in stock
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-red-200">
              <AlertTriangle size={13} />
              Out of stock
            </span>
          )}
        </div>

        <h1 className="text-xl md:text-2xl font-bold mb-3 leading-snug">
          {displayTitle}
        </h1>

        {/* ★ PRICE + MRP + DISCOUNT */}
        <div className="flex items-end gap-3 flex-wrap mb-2">
          <div>
            <p className="text-[11px] text-gray-500 mb-0.5">Price</p>
            <span className="text-2xl md:text-3xl font-bold text-blue-600 leading-none">
              ৳{price}
            </span>
          </div>

          {hasMrp && (
            <>
              <div>
                <p className="text-[11px] text-gray-500 mb-0.5">MRP</p>
                <span className="text-sm line-through text-gray-400 leading-none">
                  ৳{originalPrice}
                </span>
              </div>

              <div>
                <p className="text-[11px] text-transparent mb-0.5 select-none">
                  .
                </p>
                <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {discountPct}% OFF
                </span>
              </div>
            </>
          )}
        </div>

        {hasMrp && (
          <p className="text-sm text-green-700 font-medium mb-4">
            You save ৳{originalPrice! - price}
          </p>
        )}

        {stock > 0 && (
          <p className="text-sm text-gray-600 mb-4">
            <span className="font-semibold text-gray-800">Available:</span>{" "}
            {stock} unit{stock === 1 ? "" : "s"}
            {activeVariant?.sku && (
              <>
                {" • "}
                <span className="font-semibold text-gray-800">SKU:</span>{" "}
                {activeVariant.sku}
              </>
            )}
          </p>
        )}

        {product.description && (
          <p className="text-sm text-gray-700 mb-5 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* OPTIONS */}
        {hasVariants && (
          <div className="space-y-4 mb-5">
            {product.options!.map((opt) => {
              const chosenLabel = opt.values.find(
                (v) => v.id === selected[opt.id],
              )?.label;
              return (
                <div key={opt.id}>
                  <p className="text-sm font-semibold mb-2 flex items-baseline gap-2">
                    <span className="text-gray-800">{opt.name}:</span>
                    <span className="text-gray-500 font-normal">
                      {chosenLabel || "Choose one"}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map((v) => {
                      const active = selected[opt.id] === v.id;
                      const available = valueAvailable(opt.id, v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() =>
                            setSelected((s) => ({ ...s, [opt.id]: v.id }))
                          }
                          disabled={!available}
                          className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                            active
                              ? "border-blue-600 shadow-md shadow-blue-100"
                              : "border-gray-200 hover:border-gray-400"
                          } ${
                            !available ? "opacity-40 cursor-not-allowed" : ""
                          }`}
                        >
                          {opt.type === "color" ? (
                            <div className="w-14">
                              {v.images?.[0] ? (
                                <img
                                  src={v.images[0]}
                                  alt={v.label}
                                  className="w-14 h-14 object-cover"
                                />
                              ) : (
                                <div
                                  className="w-14 h-14 flex items-center justify-center text-xs text-gray-400 bg-gray-50"
                                  style={
                                    v.colorHex
                                      ? { background: v.colorHex }
                                      : undefined
                                  }
                                >
                                  {!v.colorHex && v.label}
                                </div>
                              )}
                              <p className="text-[10px] text-center py-0.5 truncate">
                                {v.label}
                              </p>
                              {active && (
                                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-blue-600 text-white rounded-full flex items-center justify-center">
                                  <Check size={9} />
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-3 py-1.5 text-sm font-medium block">
                              {v.label}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* QTY + ADD */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
          <div className="flex items-center border-2 border-gray-200 rounded-lg h-11 bg-white">
            <button
              type="button"
              onClick={decQty}
              disabled={!canDecrement}
              className="w-11 h-full flex items-center justify-center text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              min={1}
              max={Math.max(1, stock)}
              value={qty}
              onChange={(e) => {
                const v = Math.max(
                  1,
                  Math.min(stock || 1, Number(e.target.value) || 1),
                );
                setQty(v);
              }}
              className="w-12 h-full text-center text-sm font-semibold outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={incQty}
              disabled={!canIncrement}
              className="w-11 h-full flex items-center justify-center text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            onClick={handleAdd}
            disabled={stock <= 0}
            className={`flex-1 h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition ${
              stock <= 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : justAdded
                  ? "bg-green-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md"
            }`}
          >
            {justAdded ? (
              <>
                <Check size={18} /> Added!
              </>
            ) : (
              <>
                <ShoppingCart size={18} /> Add to Cart
              </>
            )}
          </button>
        </div>

        {/* FEATURES */}
        <div className="grid grid-cols-3 gap-2.5 mb-5 text-center">
          <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl">
            <Truck className="mx-auto mb-1 text-blue-600" size={18} />
            <p className="text-xs font-medium text-gray-700">Fast Delivery</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl">
            <Shield className="mx-auto mb-1 text-blue-600" size={18} />
            <p className="text-xs font-medium text-gray-700">Warranty</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl">
            <RotateCcw className="mx-auto mb-1 text-blue-600" size={18} />
            <p className="text-xs font-medium text-gray-700">7-Day Return</p>
          </div>
        </div>

        {/* SPECS */}
        <div className="bg-white rounded-2xl p-4 border shadow-sm">
          <h2 className="text-base font-bold mb-2.5">Specifications</h2>
          {product.specifications?.length ? (
            <table className="w-full text-sm">
              <tbody>
                {product.specifications.map((spec, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 text-gray-500 w-1/3 align-top">
                      {spec.key}
                    </td>
                    <td className="py-2 font-medium text-gray-800">
                      {spec.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-sm">No specifications provided.</p>
          )}
        </div>
      </div>
    </div>
  );
}
