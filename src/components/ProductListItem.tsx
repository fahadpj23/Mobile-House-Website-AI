// components/ProductListItem.tsx
"use client";
import Link from "next/link";
import { Product, ProductVariant } from "@/lib/types";
import { useCart } from "./CartProvider";
import { productThumb } from "@/lib/searchProducts";
import toast from "react-hot-toast";

interface Props {
  product: Product;
}

export default function ProductListItem({ product }: Props) {
  const { addItem } = useCart();

  // ── Safe variant list (filter out null/undefined/malformed entries) ──
  const variants: ProductVariant[] = Array.isArray(product.variants)
    ? product.variants.filter(
        (v): v is ProductVariant =>
          !!v && typeof v === "object" && Array.isArray(v.optionValueIds),
      )
    : [];

  const hasVariants = !!product.options?.length && variants.length > 0;

  // Pick a display variant (first enabled in stock)
  const firstVariant: ProductVariant | undefined = hasVariants
    ? variants.find((v) => v.enabled && v.stock > 0) ||
      variants.find((v) => v.enabled) ||
      variants[0]
    : undefined;

  const image = productThumb(product);

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

  const bullets = (product.specifications || [])
    .filter((s) => s.key?.trim() && s.value?.trim())
    .slice(0, 5);

  // Variant suffix — guard against malformed optionValueIds
  const labelParts: string[] = [];
  if (hasVariants && firstVariant && product.options) {
    product.options.forEach((opt, i) => {
      const valId = firstVariant.optionValueIds?.[i];
      if (!valId) return;
      const v = opt.values?.find((x) => x?.id === valId);
      if (v?.label) labelParts.push(v.label);
    });
  }
  const variantSuffix = labelParts.length ? ` (${labelParts.join(", ")})` : "";
  const displayName = `${product.name}${variantSuffix}`;

  const detailHref = `/products/${product.id}`;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (outOfStock) {
      toast.error("Out of stock");
      return;
    }

    if (hasVariants && firstVariant) {
      const selectedOptions: { name: string; value: string }[] = [];
      product.options!.forEach((opt, i) => {
        const valId = firstVariant.optionValueIds?.[i];
        if (!valId) return;
        const v = opt.values?.find((x) => x?.id === valId);
        if (v?.label) selectedOptions.push({ name: opt.name, value: v.label });
      });
      addItem(product, 1, {
        variantId: firstVariant.id,
        variantLabel: labelParts.join(" / "),
        selectedOptions,
      });
    } else {
      addItem(product, 1);
    }
    toast.success(`${displayName} added to cart`);
  };

  return (
    <Link
      href={detailHref}
      className="block bg-white border-b border-gray-100 hover:shadow-md hover:bg-gray-50/40 transition-all cursor-pointer"
    >
      <div className="flex flex-col md:flex-row gap-3 md:gap-6 p-4 md:p-5">
        {/* ── IMAGE ── */}
        <div className="shrink-0 w-full md:w-40 h-40 md:h-40 flex items-center justify-center bg-white rounded-lg">
          <img
            src={image}
            alt={displayName}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* ── DETAILS ── */}
        <div className="flex-1 min-w-0 flex flex-col md:flex-row md:gap-6">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm md:text-base font-medium text-gray-900 line-clamp-2">
              {displayName}
            </h3>

            {bullets.length > 0 && (
              <ul className="mt-2 md:mt-3 space-y-0.5 text-[12px] md:text-[13px] text-gray-700">
                {bullets.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-gray-400 leading-5">•</span>
                    <span className="line-clamp-1">
                      {s.value}
                      {s.key && s.key !== s.value ? ` ${s.key}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p
              className={`mt-2 text-[12px] font-medium ${
                outOfStock
                  ? "text-red-600"
                  : stock <= 5
                    ? "text-amber-600"
                    : "text-green-600"
              }`}
            >
              {outOfStock
                ? "Out of Stock"
                : stock <= 5
                  ? `Only ${stock} left`
                  : "In Stock"}
            </p>
          </div>

          {/* ── PRICE ── */}
          <div className="md:w-48 md:text-right mt-3 md:mt-0 shrink-0">
            <div className="flex md:justify-end items-baseline gap-2 flex-wrap">
              <span className="text-xl md:text-2xl font-bold text-gray-900">
                ₹{price.toLocaleString("en-IN")}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-sm text-gray-500 line-through">
                    ₹{mrp!.toLocaleString("en-IN")}
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    {discountPct}% off
                  </span>
                </>
              )}
            </div>

            <button
              onClick={handleAdd}
              disabled={outOfStock}
              className={`mt-3 w-full md:w-auto px-4 py-2 rounded-lg text-sm font-semibold transition ${
                outOfStock
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {outOfStock ? "Out of Stock" : "Add to Cart"}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
