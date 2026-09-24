"use client";
import { useState, useEffect } from "react";
import {
  Product,
  Specification,
  Category,
  SpecTemplate,
  Brand,
} from "@/lib/types";
import { uploadMultipleImages } from "@/lib/storage";
import {
  addProduct,
  updateProduct,
  getCategories,
  getCategorySpec,
  getBrands,
  addBrand,
} from "@/lib/firestore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, X, Upload, Wand2, Loader2, ImageIcon } from "lucide-react";

// Local preview state — has both blob (fast) and remote (final) URLs
interface PreviewImage {
  id: string; // local id
  preview: string; // blob url or remote url
  remote?: string; // firebase url after upload
  uploading: boolean;
  error?: boolean;
}

export default function ProductForm({ initial }: { initial?: Product }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [specTemplate, setSpecTemplate] = useState<SpecTemplate[]>([]);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newBrand, setNewBrand] = useState("");

  // Track images with preview info
  const [images, setImages] = useState<PreviewImage[]>(
    (initial?.images || []).map((url, i) => ({
      id: `init-${i}-${Date.now()}`,
      preview: url,
      remote: url,
      uploading: false,
    })),
  );

  const [form, setForm] = useState<Omit<Product, "id">>({
    name: initial?.name || "",
    brand: initial?.brand || "",
    price: initial?.price || 0,
    discountPrice: initial?.discountPrice || 0,
    category: initial?.category || "",
    subCategory: initial?.subCategory || "",
    description: initial?.description || "",
    stock: initial?.stock || 0,
    images: initial?.images || [],
    specifications: initial?.specifications || [],
    featured: initial?.featured || false,
  });

  // Load categories & brands once
  useEffect(() => {
    getCategories().then(setCategories);
    getBrands().then(setBrands);
  }, []);

  // Auto-load spec template when category changes
  useEffect(() => {
    if (!form.category) {
      setSpecTemplate([]);
      return;
    }
    setLoadingSpecs(true);
    getCategorySpec(form.category)
      .then((tpl) => {
        const specs = tpl?.specs || [];
        setSpecTemplate(specs);
        setForm((f) => {
          const existing = new Map(
            f.specifications.map((s) => [s.key, s.value]),
          );
          const merged: Specification[] =
            specs.length > 0
              ? specs.map((t) => ({
                  key: t.key,
                  value: existing.get(t.key) || "",
                }))
              : f.specifications.length
                ? f.specifications
                : [{ key: "", value: "" }];
          return { ...f, specifications: merged };
        });
      })
      .finally(() => setLoadingSpecs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  // ===== Image upload with preview =====
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // 1. Create local preview entries instantly
    const previews: PreviewImage[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      preview: URL.createObjectURL(file),
      uploading: true,
    }));

    setImages((prev) => [...prev, ...previews]);

    // 2. Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewItem = previews[i];
      try {
        const { uploadImage } = await import("@/lib/storage");
        const url = await uploadImage(file);
        setImages((prev) =>
          prev.map((img) =>
            img.id === previewItem.id
              ? { ...img, remote: url, uploading: false }
              : img,
          ),
        );
        setForm((f) => ({ ...f, images: [...f.images, url] }));
      } catch (err) {
        console.error(err);
        setImages((prev) =>
          prev.map((img) =>
            img.id === previewItem.id
              ? { ...img, uploading: false, error: true }
              : img,
          ),
        );
        toast.error(`Failed: ${file.name}`);
      }
    }
    toast.success("Upload complete");
    // Reset input so same file can be picked again
    e.target.value = "";
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target?.remote) {
        setForm((f) => ({
          ...f,
          images: f.images.filter((url) => url !== target.remote),
        }));
      }
      // Revoke blob URL if it was a preview
      if (target?.preview.startsWith("blob:")) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const uploadingCount = images.filter((i) => i.uploading).length;

  // ===== Spec rows =====
  const addSpecRow = () =>
    setForm((f) => ({
      ...f,
      specifications: [...f.specifications, { key: "", value: "" }],
    }));

  const updateSpec = (i: number, field: keyof Specification, value: string) =>
    setForm((f) => ({
      ...f,
      specifications: f.specifications.map((s, idx) =>
        idx === i ? { ...s, [field]: value } : s,
      ),
    }));

  const removeSpec = (i: number) =>
    setForm((f) => ({
      ...f,
      specifications: f.specifications.filter((_, idx) => idx !== i),
    }));

  const loadSpecTemplate = async () => {
    if (!form.category) {
      toast.error("Select a category first");
      return;
    }
    setLoadingSpecs(true);
    try {
      const tpl = await getCategorySpec(form.category);
      if (!tpl || !tpl.specs.length) {
        toast.error("No spec template for this category");
        return;
      }
      setForm((f) => ({
        ...f,
        specifications: tpl.specs.map((t) => ({ key: t.key, value: "" })),
      }));
      setSpecTemplate(tpl.specs);
      toast.success("Specs loaded from category");
    } finally {
      setLoadingSpecs(false);
    }
  };

  // ===== Brand =====
  const handleAddNewBrand = async () => {
    if (!newBrand.trim()) return;
    try {
      await addBrand(newBrand);
      const updated = await getBrands();
      setBrands(updated);
      setForm((f) => ({ ...f, brand: newBrand.trim() }));
      setNewBrand("");
      setShowNewBrand(false);
      toast.success("Brand added");
    } catch {
      toast.error("Failed to add brand");
    }
  };

  // ===== Discount % =====
  const discountPercent =
    form.discountPrice && form.price && form.discountPrice < form.price
      ? Math.round(((form.price - form.discountPrice) / form.price) * 100)
      : 0;

  // ===== Submit =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) {
      toast.error("Please select a category");
      return;
    }
    if (form.images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }
    if (uploadingCount > 0) {
      toast.error("Please wait for uploads to finish");
      return;
    }
    if (!form.brand) {
      toast.error("Please select or add a brand");
      return;
    }
    if (!form.price || form.price <= 0) {
      toast.error("Please enter a valid selling price");
      return;
    }
    if (form.discountPrice && form.discountPrice > form.price) {
      toast.error("Selling price cannot be greater than MRP");
      return;
    }

    setLoading(true);
    try {
      const cleaned: Omit<Product, "id"> = {
        ...form,
        specifications: form.specifications.filter((s) => s.key && s.value),
        price: Number(form.price),
        discountPrice: form.discountPrice
          ? Number(form.discountPrice)
          : undefined,
        stock: Number(form.stock),
      };
      if (initial?.id) {
        await updateProduct(initial.id, cleaned);
        toast.success("Product updated");
      } else {
        await addProduct(cleaned);
        toast.success("Product added");
      }
      router.push("/admin/products");
    } catch (err) {
      console.error(err);
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
      {/* ============ BASIC INFO ============ */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold">Basic Info</h2>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            required
            placeholder="e.g. Samsung Galaxy S24 Ultra 12GB/256GB"
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {/* Category */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Brand <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="input"
              value={form.brand}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setShowNewBrand(true);
                  setForm({ ...form, brand: "" });
                } else {
                  setForm({ ...form, brand: e.target.value });
                }
              }}
            >
              <option value="">Select Brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
              <option value="__new__">+ Add new brand…</option>
            </select>
          </div>

          {/* ===== PRICE (Selling) ===== */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Selling Price (৳) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min={0}
              placeholder="e.g. 110000"
              className="input"
              value={form.price || ""}
              onChange={(e) =>
                setForm({ ...form, price: Number(e.target.value) })
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              The actual price customer pays
            </p>
          </div>

          {/* ===== MRP / Discount Price ===== */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              MRP / Original Price (৳)
            </label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 125000"
              className="input"
              value={form.discountPrice || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  discountPrice: Number(e.target.value) || 0,
                })
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty if no discount. Shown as strikethrough.
            </p>
            {discountPercent > 0 && (
              <p className="text-xs text-green-600 font-medium mt-1">
                🎉 {discountPercent}% OFF — customer saves ৳
                {(form.price - (form.discountPrice || 0)).toLocaleString()}
              </p>
            )}
            {form.discountPrice > 0 && form.discountPrice > form.price && (
              <p className="text-xs text-red-600 font-medium mt-1">
                ⚠ MRP should be higher than selling price
              </p>
            )}
          </div>

          {/* Stock */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Stock Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min={0}
              placeholder="e.g. 25"
              className="input"
              value={form.stock || ""}
              onChange={(e) =>
                setForm({ ...form, stock: Number(e.target.value) })
              }
            />
          </div>

          {/* Featured */}
          <div className="flex items-end">
            <label className="flex items-center gap-2 input cursor-pointer w-full">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) =>
                  setForm({ ...form, featured: e.target.checked })
                }
              />
              <span className="text-sm">Featured on homepage</span>
            </label>
          </div>
        </div>

        {/* New brand inline form */}
        {showNewBrand && (
          <div className="flex gap-2 p-3 bg-blue-50 rounded-lg">
            <input
              placeholder="New brand name (e.g. Xiaomi)"
              className="input flex-1"
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddNewBrand}
              className="btn-primary text-sm"
            >
              Save Brand
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewBrand(false);
                setNewBrand("");
              }}
              className="btn-outline text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            placeholder="Describe the product features, highlights, warranty…"
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </div>

      {/* ============ IMAGES ============ */}
      <div className="card p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold">
            Product Images{" "}
            {images.length > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({images.length} uploaded)
              </span>
            )}
          </h2>
          {uploadingCount > 0 && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <Loader2 size={14} className="animate-spin" />
              Uploading {uploadingCount}…
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mb-3">
          {images.map((img) => (
            <div key={img.id} className="relative w-24 h-24 group">
              <img
                src={img.preview}
                alt=""
                className={`w-full h-full object-cover rounded border-2 ${
                  img.error
                    ? "border-red-400"
                    : img.uploading
                      ? "border-blue-400 opacity-70"
                      : "border-gray-200"
                }`}
              />

              {/* Upload spinner overlay */}
              {img.uploading && (
                <div className="absolute inset-0 bg-black/30 rounded flex items-center justify-center">
                  <Loader2 size={20} className="text-white animate-spin" />
                </div>
              )}

              {/* Error badge */}
              {img.error && (
                <div className="absolute inset-0 bg-red-500/30 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">FAILED</span>
                </div>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                title="Remove image"
              >
                <X size={12} />
              </button>

              {/* First image = cover badge */}
              {images[0]?.id === img.id && !img.uploading && !img.error && (
                <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                  COVER
                </span>
              )}
            </div>
          ))}

          {/* Upload button */}
          <label
            className={`w-24 h-24 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer transition ${
              uploadingCount > 0
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-blue-600 hover:bg-blue-50"
            }`}
          >
            {uploadingCount > 0 ? (
              <Loader2 size={20} className="text-blue-600 animate-spin" />
            ) : (
              <>
                <ImageIcon size={20} className="text-gray-400" />
                <span className="text-xs text-gray-500 mt-1">Add Photo</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploadingCount > 0}
            />
          </label>
        </div>

        <p className="text-xs text-gray-500">
          💡 First image = cover. Drag to reorder (coming soon). Supported: JPG,
          PNG, WEBP. Max 5MB each.
        </p>
      </div>

      {/* ============ SPECIFICATIONS ============ */}
      <div className="card p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold">Specifications</h2>
          <div className="flex gap-2">
            {specTemplate.length > 0 && (
              <button
                type="button"
                onClick={loadSpecTemplate}
                disabled={loadingSpecs}
                className="text-blue-600 text-sm flex items-center gap-1"
              >
                <Wand2 size={14} /> Reset to template
              </button>
            )}
            <button
              type="button"
              onClick={addSpecRow}
              className="text-blue-600 text-sm flex items-center gap-1"
            >
              <Plus size={14} /> Add field
            </button>
          </div>
        </div>

        {!form.category && (
          <p className="text-sm text-gray-500">
            Select a category to auto-load its specifications.
          </p>
        )}

        {form.category && specTemplate.length > 0 && (
          <p className="text-xs text-blue-600 mb-2">
            ✨ Auto-loaded {specTemplate.length} fields from{" "}
            <b>{form.category}</b> category
          </p>
        )}

        {form.category && specTemplate.length === 0 && !loadingSpecs && (
          <p className="text-xs text-orange-500 mb-2">
            ⚠ No specification template for "{form.category}". Add one in{" "}
            <a href="/admin/categories" className="underline">
              Categories
            </a>
            .
          </p>
        )}

        <div className="space-y-2">
          {form.specifications.map((spec, i) => {
            const tpl = specTemplate.find((t) => t.key === spec.key);
            return (
              <div key={i} className="flex gap-2">
                <input
                  placeholder="Key (e.g. RAM)"
                  className="input"
                  value={spec.key}
                  onChange={(e) => updateSpec(i, "key", e.target.value)}
                />
                <input
                  placeholder={
                    tpl?.placeholder
                      ? `e.g. ${tpl.placeholder}`
                      : "Value (e.g. 8GB)"
                  }
                  className="input"
                  value={spec.value}
                  onChange={(e) => updateSpec(i, "value", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeSpec(i)}
                  className="text-red-500 px-2"
                >
                  <X size={18} />
                </button>
              </div>
            );
          })}
          {form.specifications.length === 0 && (
            <p className="text-sm text-gray-500">
              No specifications yet. Click "Add field" to start.
            </p>
          )}
        </div>
      </div>

      {/* ============ SUBMIT ============ */}
      <button
        type="submit"
        disabled={loading || uploadingCount > 0}
        className="btn-primary w-full disabled:bg-gray-400 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {uploadingCount > 0
          ? `Uploading ${uploadingCount} image(s)…`
          : loading
            ? "Saving..."
            : initial
              ? "Update Product"
              : "Add Product"}
      </button>
    </form>
  );
}
