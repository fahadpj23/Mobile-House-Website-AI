// components/ProductVariantCard.tsx
"use client";
import Link from "next/link";
import { Product, ProductVariant } from "@/lib/types";
import { useCart } from "./CartProvider";
import toast from "react-hot-toast";

interface Props {
  product: Product;
  variant: ProductVariant;
}

export default function ProductVariantCard({ product, variant }: Props) {
  const { addItem } = useCart();

  // ── Build variant label from option values ──
  const labelParts: string[] = [];
  const selectedOptions: { name: string; value: string }[] = [];

  (product.options || []).forEach((opt, i) => {
    const valId = variant.optionValueIds[i];
    const val = opt.values.find((v) => v.id === valId);
    if (val?.label) {
      labelParts.push(val.label);
      selectedOptions.push({ name: opt.name, value: val.label });
    }
  });

  const variantLabel = labelParts.join(" / ");

  // ── Image: prefer color variant image ──
  const colorIdx = (product.options || []).findIndex((o) => o.type === "color");
  let image: string | undefined;
  if (colorIdx !== -1) {
    const valId = variant.optionValueIds[colorIdx];
    const val = product.options![colorIdx].values.find((v) => v.id === valId);
    image = val?.images?.[0];
  }
  if (!image) image = product.images?.[0] || "/placeholder.png";

  // ── Price / MRP ──
  const price = variant.price;
  const mrp = variant.discountPrice; // change to variant.mrp if you renamed
  const hasDiscount = typeof mrp === "number" && mrp > price;
  const discountPct = hasDiscount
    ? Math.round(((mrp! - price) / mrp!) * 100)
    : 0;

  const outOfStock = !variant.enabled || variant.stock <= 0;

  // ★ Link with variant query param so detail page pre-selects this variant
  const detailHref = `/products/${product.id}?variant=${variant.id}`;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (outOfStock) {
      toast.error("Out of stock");
      return;
    }

    addItem(product, 1, {
      variantId: variant.id,
      variantLabel,
      selectedOptions,
    });

    toast.success(`${product.name} (${variantLabel}) added to cart`);
  };

  const stockLabel = outOfStock
    ? "Out of stock"
    : variant.stock <= 5
      ? `Only ${variant.stock} left`
      : "In stock";

  const stockClass = outOfStock
    ? "text-red-600 hover:text-red-700"
    : variant.stock <= 5
      ? "text-amber-600 hover:text-amber-700"
      : "text-green-600 hover:text-green-700";

  return (
    <div className="group bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Image */}
      <Link
        href={detailHref}
        className="relative block bg-gradient-to-br from-gray-50 to-white p-2"
      >
        <div className="relative aspect-square rounded-md overflow-hidden bg-white">
          <img
            src={image}
            alt={`${product.name} ${variantLabel}`}
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
        <Link
          href={detailHref}
          className="text-[11px] font-medium line-clamp-2 mt-0.5 leading-snug text-gray-800 hover:text-blue-600 transition-colors"
        >
          {product.name}
          {variantLabel && (
            <span className="text-gray-500"> ({variantLabel})</span>
          )}
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

        <Link
          href={detailHref}
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
