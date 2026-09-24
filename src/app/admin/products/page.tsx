"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getProducts, deleteProduct } from "@/lib/firestore";
import { Product } from "@/lib/types";
import { Plus, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setProducts(await getProducts());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await deleteProduct(id);
    toast.success("Deleted");
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link
          href="/admin/products/new"
          className="btn-primary flex items-center gap-1"
        >
          <Plus size={18} /> Add Product
        </Link>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-gray-500">No products yet.</p>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3">Image</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Stock</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">
                    <img
                      src={p.images[0]}
                      alt=""
                      className="w-10 h-10 rounded object-cover"
                    />
                  </td>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3">৳{p.discountPrice || p.price}</td>
                  <td className="p-3">{p.stock}</td>
                  <td className="p-3 text-right space-x-2">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="inline-block text-blue-600 hover:text-blue-800"
                    >
                      <Edit size={16} />
                    </Link>
                    <button
                      onClick={() => handleDelete(p.id!)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
