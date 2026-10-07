"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getProducts, deleteProduct } from "@/lib/firestore";
import { Product } from "@/lib/types";
import { Plus, Edit, Trash2, Search, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const list = await getProducts();
      console.log("[AdminProducts] loaded:", list.length);
      setProducts(list || []);
    } catch (err) {
      console.error("[AdminProducts] load failed:", err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteProduct(id);
      toast.success("Deleted");
      load();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
    }
  };

  // Display image: base → first color variant image → placeholder
  const displayImage = (p: Product) => {
    if (p.images?.length) return p.images[0];
    if (p.options?.length) {
      for (const opt of p.options) {
        if (opt.type !== "color") continue;
        for (const val of opt.values) {
          if (val.images?.length) return val.images[0];
        }
      }
    }
    return "/placeholder.png";
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.seriesName?.toLowerCase().includes(q),
    );
  }, [products, search]);

  return (
    <div>
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-xs text-gray-500 mt-1">
            {products.length} product{products.length === 1 ? "" : "s"} total
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="btn-primary flex items-center gap-1"
        >
          <Plus size={18} /> Add Product
        </Link>
      </div>

      {/* SEARCH */}
      <div className="relative mb-4 max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          placeholder="Search by name, brand, category..."
          className="input pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* LIST */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          Loading products...
        </div>
      ) : products.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-gray-500 mb-3">No products yet.</p>
          <Link
            href="/admin/products/new"
            className="btn-primary inline-flex items-center gap-1"
          >
            <Plus size={16} /> Add your first product
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">No products match your search.</p>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3 font-medium">Image</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Variants</th>
                  <th className="text-left p-3 font-medium">Price</th>
                  <th className="text-left p-3 font-medium">Stock</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const variantCount =
                    p.variants?.filter((v) => v.enabled).length || 0;
                  return (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="p-3">
                        <img
                          src={displayImage(p)}
                          alt={p.name}
                          className="w-12 h-12 rounded object-cover border bg-gray-50"
                        />
                      </td>
                      <td className="p-3">
                        <p className="font-medium line-clamp-1">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.brand}</p>
                      </td>
                      <td className="p-3 text-xs">
                        {p.categoryName || p.category || "—"}
                      </td>
                      <td className="p-3 text-xs">
                        {variantCount > 0 ? (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[11px]">
                            {variantCount} variant
                            {variantCount === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="text-gray-400">Simple</span>
                        )}
                      </td>
                      <td className="p-3">
                        <p className="font-medium">
                          ₹{p.discountPrice || p.price}
                        </p>
                        {p.discountPrice && p.discountPrice < p.price && (
                          <p className="text-[11px] text-gray-400 line-through">
                            ₹{p.price}
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            p.stock > 0 ? "text-green-600" : "text-red-500"
                          }
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          className="inline-block text-blue-600 hover:text-blue-800 p-1"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id!, p.name)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
