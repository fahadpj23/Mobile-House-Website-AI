"use client";
import Link from "next/link";
import { Product } from "@/lib/types";
import { useCart } from "./CartProvider";
import toast from "react-hot-toast";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product);
    toast.success(`${product.name} added to cart`);
  };

  const price = product.discountPrice || product.price;
  const hasDiscount =
    !!product.discountPrice && product.discountPrice < product.price;

  return (
    <Link
      href={`/products/${product.id}`}
      className="card overflow-hidden group flex flex-col"
    >
      {/* Image box — fixed square, padded, contain */}
      <div className="bg-gray-50 aspect-square relative flex items-center justify-center p-3 overflow-hidden">
        <img
          src={product.images?.length ? product.images[0] : "/placeholder.png"}
          alt={product.name}
          className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
        />
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            -
            {Math.round(
              ((product.price - product.discountPrice!) / product.price) * 100,
            )}
            %
          </span>
        )}
        {product.seriesName && (
          <span className="absolute top-2 right-2 bg-blue-600/90 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
            {product.seriesName}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col">
        <p className="text-[11px] text-gray-500 truncate">{product.brand}</p>
        <h3 className="text-sm font-medium line-clamp-2 mt-0.5 leading-snug">
          {product.name}
        </h3>

        <div className="flex items-baseline gap-1.5 mt-2">
          <span className="text-base font-bold text-blue-600">৳{price}</span>
          {hasDiscount && (
            <span className="text-xs line-through text-gray-400">
              ৳{product.price}
            </span>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={product.stock <= 0}
          className="btn-primary w-full mt-2 text-xs py-1.5 disabled:bg-gray-400"
        >
          {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </Link>
  );
}
