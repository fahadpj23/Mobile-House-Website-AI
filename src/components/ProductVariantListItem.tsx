// components/ProductVariantListItem.tsx
"use client";
import Link from "next/link";
import { Product, ProductVariant } from "@/lib/types";
import { useCart } from "./CartProvider";
import toast from "react-hot-toast";

interface Props {
  product: Product;
  variant: ProductVariant;
}

export default function ProductVariantListItem({ product, variant }: Props) {
  const { addItem } = useCart();

  // Build variant label from option values
  const labelParts: string[] = [];
  const selectedOptions: { name: string; value: string }[] = [];
  (product.options || []).forEach((opt, i) => {
    const valId = variant.optionValueIds[i];
    const v = opt.values.find((x) => x.id === valId);
    if (v?.label) {
      labelParts.push(v.label);
      selectedOptions.push({ name: opt.name, value: v.label });
    }
  });
  const variantLabel = labelParts.join(" / ");

  // Image — prefer color variant image
  const colorIdx = (product.options || []).findIndex((o) => o.type === "color");
  let image: string | undefined;
  if (colorIdx !== -1) {
    const valId = variant.optionValueIds[colorIdx];
    const val = product.options![colorIdx].values.find((v) => v.id === valId);
    image = val?.images?.[0];
  }
  if (!image) image = product.images?.[0] || "/placeholder.png";

  // Price / MRP
  const price = variant.price;
  const mrp = variant.discountPrice;
  const hasDiscount = typeof mrp === "number" && mrp > price;
  const discountPct = hasDiscount
    ? Math.round(((mrp! - price) / mrp!) * 100)
    : 0;

  const outOfStock = !variant.enabled || variant.stock <= 0;

  const detailHref = `/products/${product.id}?variant=${variant.id}`;
  const bullets = (product.specifications || [])
    .filter((s) => s.key?.trim() && s.value?.trim())
    .slice(0, 5);

  const handleAdd = (e: React.MouseEvent) => {
    // Prevent the parent <Link> from navigating
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
            alt={`${product.name} ${variantLabel}`}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* ── DETAILS ── */}
        <div className="flex-1 min-w-0 flex flex-col md:flex-row md:gap-6">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm md:text-base font-medium text-gray-900 line-clamp-2">
              {product.name}
              {variantLabel && (
                <span className="text-gray-500"> ({variantLabel})</span>
              )}
            </h3>

            {/* Spec bullets */}
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

            {/* Stock */}
            <p
              className={`mt-2 text-[12px] font-medium ${
                outOfStock
                  ? "text-red-600"
                  : variant.stock <= 5
                    ? "text-amber-600"
                    : "text-green-600"
              }`}
            >
              {outOfStock
                ? "Out of Stock"
                : variant.stock <= 5
                  ? `Only ${variant.stock} left`
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
