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

  return (
    <Link
      href={`/products/${product.id}`}
      className="card overflow-hidden group"
    >
      <div className="bg-gray-100 aspect-square overflow-hidden">
        <img
          src={product.images?.length ? product.images[0] : "/placeholder.png"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition"
        />
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-500">{product.brand}</p>
        <h3 className="font-semibold line-clamp-2">{product.name}</h3>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-lg font-bold text-blue-600">৳{price}</span>
          {product.discountPrice && (
            <span className="text-sm line-through text-gray-400">
              ৳{product.price}
            </span>
          )}
        </div>
        <button
          onClick={handleAdd}
          disabled={product.stock <= 0}
          className="btn-primary w-full mt-3 text-sm disabled:bg-gray-400"
        >
          {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </Link>
  );
}
