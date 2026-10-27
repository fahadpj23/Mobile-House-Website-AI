"use client";
import { useEffect, useState } from "react";
import imageCompression from "browser-image-compression";
import {
  getBanners,
  addBanner,
  updateBanner,
  deleteBanner,
  getProducts,
  getSeries,
} from "@/lib/firestore";
import { uploadImage } from "@/lib/storage";
import { Banner, Product } from "@/lib/types";
import type { Series } from "@/lib/firestore";
import toast from "react-hot-toast";
import { Plus, Trash2, Upload, Edit, Eye, EyeOff, Loader2 } from "lucide-react";

type BannerPosition = Banner["position"]; // "hero" | "mid" | "bottom"

interface BannerForm {
  imageUrl: string;
  link: string;
  position: BannerPosition;
  active: boolean;
}

const positions: { value: BannerPosition; label: string }[] = [
  { value: "hero", label: "Hero (Top)" },
  { value: "mid", label: "Mid (After Products)" },
  { value: "bottom", label: "Bottom" },
];

const emptyForm: BannerForm = {
  imageUrl: "",
  link: "",
  position: "hero",
  active: true,
};

async function compressBannerImage(file: File): Promise<File> {
  if (file.size < 150 * 1024) return file;
  const options = {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 2000,
    useWebWorker: true,
    initialQuality: 0.9,
    fileType: "image/webp" as const,
    alwaysKeepResolution: false,
  };
  try {
    const compressed = await imageCompression(file, options);
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([compressed], `${baseName}.webp`, { type: "image/webp" });
  } catch (err) {
    console.warn("Banner compression failed, using original:", err);
    return file;
  }
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [linkType, setLinkType] = useState<"product" | "series">("product");
  const [form, setForm] = useState<BannerForm>(emptyForm);

  const load = async (): Promise<void> => {
    setLoading(true);
    setDataLoading(true);
    try {
      const [bannerData, productData, seriesData] = await Promise.all([
        getBanners(),
        getProducts(),
        getSeries(),
      ]);
      setBanners(bannerData);
      setProducts(productData);
      setSeries(seriesData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
      setDataLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image is too large (max 15 MB)");
      e.target.value = "";
      return;
    }
    setUploading(true);
    const toastId = toast.loading("Optimizing image...");
    try {
      const optimized = await compressBannerImage(file);
      toast.loading("Uploading...", { id: toastId });
      const url = await uploadImage(optimized, "banners");
      setForm((f) => ({ ...f, imageUrl: url }));
      toast.success("Image uploaded", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Upload failed", { id: toastId });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.imageUrl) {
      toast.error("Image required");
      return;
    }
    if (!form.link) {
      toast.error("Please select a product or series");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateBanner(editing, form);
        toast.success("Banner updated");
      } else {
        await addBanner(form);
        toast.success("Banner added");
      }
      resetForm();
      await load();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = (): void => {
    setForm(emptyForm);
    setEditing(null);
    setLinkType("product");
  };

  const handleEdit = (b: Banner): void => {
    if (!b.id) return;
    setEditing(b.id);
    setForm({
      imageUrl: b.imageUrl,
      link: b.link || "",
      position: b.position,
      active: b.active,
    });
    setLinkType(
      b.link?.startsWith("/products?category=") ? "series" : "product",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm("Delete this banner?")) return;
    await deleteBanner(id);
    toast.success("Deleted");
    await load();
  };

  const toggleActive = async (b: Banner): Promise<void> => {
    if (!b.id) return;
    await updateBanner(b.id, { active: !b.active });
    await load();
  };

  const busy = uploading || saving;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Banner Management</h1>

      <form onSubmit={handleSubmit} className="card p-5 mb-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Banner Action
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setLinkType("product");
                  setForm((f) => ({ ...f, link: "" }));
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded border ${
                  linkType === "product"
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Product
              </button>
              <button
                type="button"
                onClick={() => {
                  setLinkType("series");
                  setForm((f) => ({ ...f, link: "" }));
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded border ${
                  linkType === "series"
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Series
              </button>
            </div>

            {linkType === "product" && (
              <select
                className="input w-full"
                value={form.link.replace("/products/", "")}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    link: e.target.value ? `/products/${e.target.value}` : "",
                  }))
                }
                disabled={dataLoading}
              >
                <option value="">
                  {dataLoading
                    ? "-- Loading products... --"
                    : "-- Select a Product --"}
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            {linkType === "series" && (
              <select
                className="input w-full"
                value={form.link.replace("/products?category=", "")}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    link: e.target.value
                      ? `/products?category=${e.target.value}`
                      : "",
                  }))
                }
                disabled={dataLoading}
              >
                <option value="">
                  {dataLoading
                    ? "-- Loading series... --"
                    : "-- Select a Series --"}
                </option>
                {series.map((s) => (
                  <option key={s.id} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Display Position
            </label>
            <select
              className="input w-full"
              value={form.position}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  position: e.target.value as BannerPosition,
                }))
              }
            >
              {positions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer bg-white hover:bg-gray-50">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm((f) => ({ ...f, active: e.target.checked }))
              }
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>

          <label
            className={`btn-outline flex items-center gap-2 cursor-pointer ${
              busy ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            {uploading ? "Optimizing & Uploading..." : "Upload Image *"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={busy}
            />
          </label>

          {form.imageUrl && (
            <div className="relative">
              <img
                src={form.imageUrl}
                alt=""
                className="h-16 rounded object-cover border"
              />
              {uploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded">
                  <Loader2 size={18} className="animate-spin text-blue-600" />
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary flex items-center gap-1 disabled:bg-gray-400 ml-auto"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {saving ? "Saving..." : editing ? "Update Banner" : "Add Banner"}
          </button>

          {editing && (
            <button
              type="button"
              onClick={resetForm}
              disabled={busy}
              className="btn-outline text-sm disabled:opacity-60"
            >
              Cancel
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400">
          Images are auto-compressed & converted to WebP for fast loading.
          {!dataLoading && (
            <span className="ml-1">
              · {products.length} products · {series.length} series
            </span>
          )}
        </p>
      </form>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading banners...</span>
          </div>
        ) : banners.length === 0 ? (
          <p className="text-gray-500">No banners yet.</p>
        ) : (
          banners.map((b) => (
            <div key={b.id} className="card p-4 flex gap-4 items-center">
              <img
                src={b.imageUrl}
                alt=""
                className="w-32 h-20 rounded object-cover"
              />
              <div className="flex-1">
                <div
                  className="text-xs font-mono text-gray-500 mb-1 truncate max-w-[200px]"
                  title={b.link}
                >
                  {b.link || "No Link"}
                </div>
                <div className="flex gap-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {b.position}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      b.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {b.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => toggleActive(b)}
                className="text-gray-500 hover:text-blue-600"
                title="Toggle active"
              >
                {b.active ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
              <button
                onClick={() => handleEdit(b)}
                className="text-blue-600 hover:text-blue-800"
              >
                <Edit size={18} />
              </button>
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
