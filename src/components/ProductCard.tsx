"use client";
import { useMemo } from "react";
import Link from "next/link";
import { Product, ProductVariant } from "@/lib/types";
import { useCart } from "./CartProvider";
import toast from "react-hot-toast";

export default function ProductCard({
  product,
}: {
  product: Product | null | undefined;
}) {
  const { addItem } = useCart();

  if (!product || !product.id) return null;

  const hasVariants = !!product.options?.length && !!product.variants?.length;

  const firstVariant: ProductVariant | undefined = useMemo(() => {
    if (!hasVariants) return undefined;
    return (
      product.variants!.find((v) => v.enabled && v.stock > 0) ||
      product.variants!.find((v) => v.enabled) ||
      product.variants![0]
    );
  }, [hasVariants, product.variants]);

  const displayImage = useMemo(() => {
    if (product.images?.length) return product.images[0];

    if (firstVariant && product.options?.length) {
      const colorIdx = product.options.findIndex((o) => o.type === "color");
      if (colorIdx !== -1) {
        const valId = firstVariant.optionValueIds[colorIdx];
        const img = product.options[colorIdx].values.find((v) => v.id === valId)
          ?.images?.[0];
        if (img) return img;
      }
    }

    if (product.options?.length) {
      for (const opt of product.options) {
        if (opt.type !== "color") continue;
        for (const val of opt.values) {
          if (val.images?.length) return val.images[0];
        }
      }
    }

    return "/placeholder.png";
  }, [product.images, product.options, firstVariant]);

  const price = firstVariant ? firstVariant.price : product.price;
  const mrp = firstVariant ? firstVariant.discountPrice : product.discountPrice;
  const hasDiscount = typeof mrp === "number" && mrp > price;
  const discountPct = hasDiscount
    ? Math.round(((mrp! - price) / mrp!) * 100)
    : 0;

  const stock = firstVariant ? firstVariant.stock : product.stock;
  const outOfStock = firstVariant
    ? !firstVariant.enabled || firstVariant.stock <= 0
    : product.stock <= 0;

  /* ───────── Variant suffix — same logic as ProductDetailClient ───────── */
  const variantSuffix = useMemo(() => {
    if (!hasVariants || !firstVariant) return "";

    const selected: Record<string, string> = {};
    product.options!.forEach((opt, i) => {
      selected[opt.id] = firstVariant.optionValueIds[i];
    });

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
  }, [hasVariants, firstVariant, product.options]);

  const displayName = `${product.name}${variantSuffix}`;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (outOfStock) {
      toast.error("Out of stock");
      return;
    }

    if (hasVariants && firstVariant) {
      const labelParts: string[] = [];
      const selectedOptions: { name: string; value: string }[] = [];

      product.options!.forEach((opt, i) => {
        const valId = firstVariant.optionValueIds[i];
        const v = opt.values.find((x) => x.id === valId);
        if (v?.label) {
          labelParts.push(v.label);
          selectedOptions.push({ name: opt.name, value: v.label });
        }
      });

      addItem(product, 1, {
        variantId: firstVariant.id,
        variantLabel: labelParts.join(" / "),
        selectedOptions,
      });
      toast.success(`${displayName} added to cart`);
      return;
    }

    addItem(product, 1);
    toast.success(`${displayName} added to cart`);
  };

  /* Stock link label + color */
  const stockLabel = outOfStock
    ? "Out of stock"
    : stock <= 5
      ? `Only ${stock} left`
      : "In stock";
  const stockClass = outOfStock
    ? "text-red-600 hover:text-red-700"
    : stock <= 5
      ? "text-amber-600 hover:text-amber-700"
      : "text-green-600 hover:text-green-700";

  return (
    <div className="group bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Image — clickable */}
      <Link
        href={`/products/${product.id}`}
        className="relative block bg-gradient-to-br from-gray-50 to-white p-2"
      >
        <div className="relative aspect-square rounded-md overflow-hidden bg-white">
          <img
            src={displayImage}
            alt={displayName}
            className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />

          {hasDiscount && (
            <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
              -{discountPct}%
            </span>
          )}

          {outOfStock && (
            <span className="absolute top-1.5 right-1.5 bg-gray-800/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
              Out
            </span>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="px-2.5 pb-2.5 pt-1 flex-1 flex flex-col">
        {/* Product name — clickable link */}
        <Link
          href={`/products/${product.id}`}
          className="text-[11px] font-medium line-clamp-2 mt-0.5 leading-snug text-gray-800 hover:text-blue-600 transition-colors"
        >
          {displayName}
        </Link>

        <div className="mt-auto pt-1.5 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[13px] font-bold text-blue-600 leading-none">
            ₹{price}
          </span>
          {hasDiscount && (
            <span className="text-[10px] line-through text-gray-400 leading-none">
              ₹{mrp}
            </span>
          )}
        </div>

        {/* Stock link — navigates to product page */}
        <Link
          href={`/products/${product.id}`}
          className={`text-[10px] font-medium underline-offset-2 hover:underline mt-0.5 ${stockClass}`}
        >
          {stockLabel}
        </Link>

        <button
          onClick={handleAdd}
          disabled={outOfStock}
          className={`mt-1.5 w-full text-[10px] font-semibold py-1.5 rounded-md transition-all ${
            outOfStock
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-sm hover:shadow"
          }`}
        >
          {outOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
