"use client";
import { useState } from "react";
import { Product } from "@/lib/types";
import { useCart } from "@/components/CartProvider";
import toast from "react-hot-toast";
import { ShoppingCart, Truck, Shield, RotateCcw } from "lucide-react";

export default function ProductDetailClient({ product }: { product: Product }) {
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();

  const price = product.discountPrice || product.price;

  const handleAdd = () => {
    addItem(product, qty);
    toast.success("Added to cart");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8">
      {/* Images */}
      <div>
        <div className="bg-white rounded-xl overflow-hidden aspect-square">
          <img
            src={product.images[activeImg] || "/placeholder.png"}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
        {product.images.length > 1 && (
          <div className="flex gap-2 mt-3">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`w-16 h-16 rounded overflow-hidden border-2 ${
                  activeImg === i ? "border-blue-600" : "border-transparent"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <p className="text-sm text-gray-500">{product.brand}</p>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.name}</h1>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl font-bold text-blue-600">৳{price}</span>
          {product.discountPrice && (
            <span className="text-lg line-through text-gray-400">
              ৳{product.price}
            </span>
          )}
        </div>

        <p
          className={`mb-4 ${product.stock > 0 ? "text-green-600" : "text-red-500"}`}
        >
          {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
        </p>

        <p className="text-gray-700 mb-6">{product.description}</p>

        {/* Quantity + Add */}
        <div className="flex gap-3 mb-6">
          <div className="flex items-center border rounded-lg">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="px-4 py-2"
            >
              −
            </button>
            <span className="px-4">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="px-4 py-2">
              +
            </button>
          </div>
          <button
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:bg-gray-400"
          >
            <ShoppingCart size={18} /> Add to Cart
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mb-6 text-center text-xs">
          <div className="bg-white p-3 rounded-lg">
            <Truck className="mx-auto mb-1 text-blue-600" size={20} />
            Fast Delivery
          </div>
          <div className="bg-white p-3 rounded-lg">
            <Shield className="mx-auto mb-1 text-blue-600" size={20} />
            Warranty
          </div>
          <div className="bg-white p-3 rounded-lg">
            <RotateCcw className="mx-auto mb-1 text-blue-600" size={20} />
            7-Day Return
          </div>
        </div>

        {/* Specifications */}
        <div className="bg-white rounded-xl p-5">
          <h2 className="text-lg font-bold mb-3">Specifications</h2>
          <table className="w-full text-sm">
            <tbody>
              {product.specifications?.map((spec, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 text-gray-500 w-1/3">{spec.key}</td>
                  <td className="py-2 font-medium">{spec.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!product.specifications || product.specifications.length === 0) && (
            <p className="text-gray-500 text-sm">No specifications provided.</p>
          )}
        </div>
      </div>
    </div>
  );
}
