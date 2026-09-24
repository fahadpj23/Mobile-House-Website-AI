"use client";
import { useEffect, useState } from "react";
import { getBrands, addBrand, deleteBrand } from "@/lib/firestore";
import { uploadImage } from "@/lib/storage";
import { Brand } from "@/lib/types";
import toast from "react-hot-toast";
import { Plus, Trash2, Upload } from "lucide-react";

export default function AdminBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setBrands(await getBrands());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "brands");
      setLogo(url);
      toast.success("Logo uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addBrand(name, logo);
    setName("");
    setLogo("");
    toast.success("Brand added");
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this brand?")) return;
    await deleteBrand(id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Brands</h1>

      <form onSubmit={handleAdd} className="card p-5 mb-6 space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <input
            placeholder="Brand name (e.g. Samsung)"
            className="input flex-1 min-w-[200px]"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="btn-outline flex items-center gap-2 cursor-pointer">
            <Upload size={16} />
            {uploading ? "..." : "Logo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
              disabled={uploading}
            />
          </label>
          {logo && (
            <img
              src={logo}
              alt=""
              className="w-10 h-10 rounded object-contain bg-white border"
            />
          )}
          <button className="btn-primary flex items-center gap-1">
            <Plus size={16} /> Add
          </button>
        </div>
      </form>

      <div className="card divide-y">
        {loading ? (
          <p className="p-4 text-gray-500">Loading...</p>
        ) : brands.length === 0 ? (
          <p className="p-4 text-gray-500">No brands yet.</p>
        ) : (
          brands.map((b) => (
            <div key={b.id} className="p-3 flex items-center gap-3">
              {b.logo ? (
                <img
                  src={b.logo}
                  alt=""
                  className="w-10 h-10 rounded object-contain bg-white border"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                  {b.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-gray-500">/{b.slug}</p>
              </div>
              <button
                onClick={() => handleDelete(b.id!)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
