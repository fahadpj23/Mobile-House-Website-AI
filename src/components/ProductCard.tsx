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

  const outOfStock = firstVariant
    ? !firstVariant.enabled || firstVariant.stock <= 0
    : product.stock <= 0;

  const variantSuffix = useMemo(() => {
    if (!firstVariant || !product.options?.length) return "";
    const parts: string[] = [];
    product.options.forEach((opt, i) => {
      const valId = firstVariant.optionValueIds[i];
      const v = opt.values.find((x) => x.id === valId);
      if (v?.label) parts.push(v.label);
    });
    return parts.length ? parts.join(" · ") : "";
  }, [firstVariant, product.options]);

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
      toast.success(`${product.name} added to cart`);
      return;
    }

    addItem(product, 1);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <Link
      href={`/products/${product.id}`}
      className="group bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all overflow-hidden flex flex-col"
    >
      {/* Image — fills the box edge to edge */}
      <div className="relative aspect-square bg-white overflow-hidden">
        <img
          src={displayImage}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
            -{discountPct}%
          </span>
        )}

        {outOfStock && (
          <span className="absolute top-2 right-2 bg-gray-800/90 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
            Out
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-2.5 flex-1 flex flex-col">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide truncate">
          {product.brand}
        </p>

        <h3 className="text-xs font-medium line-clamp-2 mt-0.5 leading-snug text-gray-800">
          {product.name}
        </h3>

        {variantSuffix && (
          <p className="text-[10px] text-gray-500 truncate mt-1">
            {variantSuffix}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-end gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-blue-600 leading-none">
            ৳{price}
          </span>
          {hasDiscount && (
            <span className="text-[11px] line-through text-gray-400 leading-none">
              ৳{mrp}
            </span>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={outOfStock}
          className={`mt-2 w-full text-[11px] font-semibold py-1.5 rounded-lg transition ${
            outOfStock
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {outOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </Link>
  );
}
