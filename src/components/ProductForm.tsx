"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import {
  getCategories,
  getBrands,
  getAllCategorySpecs,
  addProduct,
  updateProduct,
  getSeries,
  addSeries,
  addBrand,
  Series,
} from "@/lib/firestore";
import { uploadImage } from "@/lib/storage";
import {
  Category,
  Brand,
  CategorySpec,
  Product,
  SpecTemplate,
} from "@/lib/types";
import toast from "react-hot-toast";
import { Upload, X, Plus, Save, Trash2, Search, Check } from "lucide-react";

interface Props {
  initialData?: Product;
}

interface SpecValue {
  key: string;
  value: string;
  placeholder?: string;
}

// Convert any image file to WebP with the best quality/size trade-off
async function compressToWebp(file: File): Promise<File> {
  if (file.size < 100 * 1024) return file;

  const options = {
    maxSizeMB: 0.4,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    initialQuality: 0.92,
    fileType: "image/webp",
    alwaysKeepResolution: false,
  };

  try {
    const compressed = await imageCompression(file, options);
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([compressed], `${baseName}.webp`, { type: "image/webp" });
  } catch (err) {
    console.warn("Compression failed, using original:", err);
    return file;
  }
}

// Helper: turn "" / "0" / NaN into 0 for persistence; keep input value as string
const toNum = (v: string) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

export default function ProductForm({ initialData }: Props) {
  const router = useRouter();
  const isEdit = !!initialData?.id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [specTemplates, setSpecTemplates] = useState<
    Record<string, SpecTemplate[]>
  >({});
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Inputs stored as strings so "empty" is a real blank state.
  // Converted to numbers on submit.
  const [form, setForm] = useState({
    name: initialData?.name || "",
    price: initialData?.price ? String(initialData.price) : "",
    discountPrice: initialData?.discountPrice
      ? String(initialData.discountPrice)
      : "",
    category: initialData?.category || "",
    brand: initialData?.brand || "",
    stock: initialData?.stock ? String(initialData.stock) : "",
    images: initialData?.images || ([] as string[]),
    specifications: (initialData?.specifications || []) as SpecValue[],
    isSpecialOffer: initialData?.isSpecialOffer || false,
    isFeatured: initialData?.isFeatured || false,
    totalSold: initialData?.totalSold ? String(initialData.totalSold) : "",
    series: initialData?.series || "",
    seriesName: initialData?.seriesName || "",
  });

  // ===== LOAD DATA =====
  useEffect(() => {
    (async () => {
      const [cats, brs, specs, srs] = await Promise.all([
        getCategories(),
        getBrands(),
        getAllCategorySpecs(),
        getSeries(),
      ]);
      setCategories(cats);
      setBrands(brs);
      const map: Record<string, SpecTemplate[]> = {};
      specs.forEach((s) => (map[s.categorySlug] = s.specs || []));
      setSpecTemplates(map);
      setAllSeries(srs);
    })();
  }, []);

  useEffect(() => {
    if (!form.category) return;
    const templates = specTemplates[form.category];
    if (!templates) return;
    const allBlank = form.specifications.every((s) => !s.key.trim());
    if (form.specifications.length === 0 || allBlank) {
      setForm((f) => ({
        ...f,
        specifications: templates.map((t) => ({
          key: t.key,
          value: "",
          placeholder: t.placeholder,
        })),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category, specTemplates]);

  // ===== IMAGE UPLOAD =====
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const optimized = await compressToWebp(file);
        const url = await uploadImage(optimized, "products");
        uploaded.push(url);
      }
      setForm((f) => ({ ...f, images: [...f.images, ...uploaded] }));
      toast.success(`${uploaded.length} image(s) optimized & uploaded`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  // ===== SPEC HANDLERS =====
  const addSpec = () =>
    setForm((f) => ({
      ...f,
      specifications: [...f.specifications, { key: "", value: "" }],
    }));

  const updateSpec = (i: number, field: keyof SpecValue, value: string) =>
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

  // ===== SUBMIT =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.category) return toast.error("Category is required");
    if (!form.brand) return toast.error("Brand is required");

    const priceNum = toNum(form.price);
    const discountNum = toNum(form.discountPrice);
    const stockNum = toNum(form.stock);
    const totalSoldNum = toNum(form.totalSold);

    if (priceNum <= 0) return toast.error("Price must be greater than 0");
    if (form.images.length === 0) return toast.error("Add at least one image");

    const cleanedSpecs = form.specifications.filter((s) => s.key.trim());

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: priceNum,
        discountPrice: discountNum || undefined,
        category: form.category,
        brand: form.brand,
        stock: stockNum,
        images: form.images,
        specifications: cleanedSpecs,
        isSpecialOffer: form.isSpecialOffer,
        isFeatured: form.isFeatured,
        totalSold: totalSoldNum,
        series: form.series || undefined,
        seriesName: form.seriesName || undefined,
      };

      if (isEdit && initialData?.id) {
        await updateProduct(initialData.id, payload);
        toast.success("Product updated");
      } else {
        await addProduct(payload);
        toast.success("Product added");
      }
      router.push("/admin/products");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-5">
      {/* ===== BASIC INFO ===== */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-lg">Basic Information</h2>

        <input
          placeholder="Product name *"
          className="input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <div className="grid md:grid-cols-2 gap-3">
          {/* CATEGORY */}
          <div>
            <label className="text-sm text-gray-600">Category *</label>
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select Category *</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* BRAND */}
          <div>
            <label className="text-sm text-gray-600">Brand *</label>
            <CreatableCombobox
              items={brands.map((b) => ({
                id: b.id ?? b.name,
                name: b.name,
                value: b.name,
              }))}
              value={form.brand}
              placeholder="Select or add a brand"
              emptyHint="No brand found."
              onCreateLabel={(q) => `Add brand "${q}"`}
              onChange={(val) => setForm((f) => ({ ...f, brand: val || "" }))}
              onCreate={async (name) => {
                const trimmed = name.trim();
                const found = brands.find(
                  (b) => b.name.toLowerCase() === trimmed.toLowerCase(),
                );
                if (found) {
                  setForm((f) => ({ ...f, brand: found.name }));
                  toast(`"${found.name}" already exists — selected it.`);
                  return;
                }
                try {
                  const created = await addBrand(trimmed);
                  setBrands((prev) =>
                    [...prev, created].sort((a, b) =>
                      a.name.localeCompare(b.name),
                    ),
                  );
                  setForm((f) => ({ ...f, brand: created.name }));
                  toast.success(`Brand "${created.name}" added`);
                } catch {
                  toast.error("Failed to add brand");
                }
              }}
            />
          </div>
        </div>

        {/* SERIES */}
        <div className="pt-2 border-t border-gray-100">
          <label className="text-sm text-gray-600">Series</label>
          <CreatableCombobox
            items={allSeries.map((s) => ({
              id: s.id ?? s.slug,
              name: s.name,
              value: s.slug,
            }))}
            value={form.series}
            placeholder="Select or add a series"
            emptyHint="No series found."
            onCreateLabel={(q) => `Add series "${q}"`}
            onChange={(val) => {
              const s = allSeries.find((x) => x.slug === val);
              setForm((f) => ({
                ...f,
                series: s?.slug || "",
                seriesName: s?.name || "",
              }));
            }}
            onCreate={async (name) => {
              const trimmed = name.trim();
              const found = allSeries.find(
                (s) => s.name.toLowerCase() === trimmed.toLowerCase(),
              );
              if (found) {
                setForm((f) => ({
                  ...f,
                  series: found.slug,
                  seriesName: found.name,
                }));
                toast(`"${found.name}" already exists — selected it.`);
                return;
              }
              try {
                const created = await addSeries(trimmed);
                setAllSeries((prev) =>
                  [...prev, created].sort((a, b) =>
                    a.name.localeCompare(b.name),
                  ),
                );
                setForm((f) => ({
                  ...f,
                  series: created.slug,
                  seriesName: created.name,
                }));
                toast.success(`Series "${created.name}" added`);
              } catch {
                toast.error("Failed to add series");
              }
            }}
          />
          <p className="text-xs text-gray-400 mt-1">
            Group related models: S26, S26 Plus, S26 Ultra → "S26 Series"
          </p>
        </div>
      </div>

      {/* ===== PRICING & STOCK ===== */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-lg">Pricing & Stock</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-gray-600">Price (৳) *</label>
            <input
              type="number"
              min={0}
              placeholder="0"
              className="input"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">
              MRP / Discount Price (৳)
            </label>
            <input
              type="number"
              min={0}
              placeholder="0"
              className="input"
              value={form.discountPrice}
              onChange={(e) =>
                setForm({ ...form, discountPrice: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Stock *</label>
            <input
              type="number"
              min={0}
              placeholder="0"
              className="input"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600">
            Total Sold (auto-updates on orders)
          </label>
          <input
            type="number"
            min={0}
            placeholder="0"
            className="input"
            value={form.totalSold}
            onChange={(e) => setForm({ ...form, totalSold: e.target.value })}
          />
        </div>
      </div>

      {/* ===== TAGS / FLAGS ===== */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-lg">Product Tags</h2>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isSpecialOffer}
              onChange={(e) =>
                setForm({ ...form, isSpecialOffer: e.target.checked })
              }
            />
            <span className="text-sm font-medium">Mark as Special Offer</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) =>
                setForm({ ...form, isFeatured: e.target.checked })
              }
            />
            <span className="text-sm font-medium">Featured Product</span>
          </label>
        </div>
      </div>

      {/* ===== IMAGES ===== */}
      <div className="card p-5 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">Images *</h2>
          <label className="btn-outline flex items-center gap-2 cursor-pointer text-sm">
            <Upload size={16} />
            {uploading ? "Optimizing..." : "Upload Images"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
        </div>

        <p className="text-xs text-gray-400">
          Images are auto-compressed & converted to WebP for fast loading.
        </p>

        {form.images.length === 0 ? (
          <p className="text-sm text-gray-500">
            No images yet. Upload at least one.
          </p>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {form.images.map((img, i) => (
              <div key={i} className="relative group">
                <img
                  src={img}
                  alt=""
                  className="w-full aspect-square object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== SPECIFICATIONS ===== */}
      <div className="card p-5 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">Specifications</h2>
          <button
            type="button"
            onClick={addSpec}
            className="text-blue-600 text-sm flex items-center gap-1"
          >
            <Plus size={14} /> Add field
          </button>
        </div>

        {form.specifications.length === 0 ? (
          <p className="text-sm text-gray-500">
            No specifications. Add fields like RAM, Storage, Display, etc.
          </p>
        ) : (
          <div className="space-y-2">
            {form.specifications.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  placeholder="Key (e.g. RAM)"
                  className="input"
                  value={s.key}
                  onChange={(e) => updateSpec(i, "key", e.target.value)}
                />
                <input
                  placeholder={s.placeholder || "Value (e.g. 8GB)"}
                  className="input"
                  value={s.value}
                  onChange={(e) => updateSpec(i, "value", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeSpec(i)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== SUBMIT ===== */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || uploading}
          className="btn-primary flex items-center gap-2 disabled:bg-gray-400"
        >
          <Save size={16} />
          {saving ? "Saving..." : isEdit ? "Update Product" : "Add Product"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-outline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ============================================================
   CreatableCombobox — reusable searchable + add-new dropdown
   ============================================================ */
interface ComboboxItem {
  id: string;
  name: string;
  value: string;
}

interface CreatableComboboxProps {
  items: ComboboxItem[];
  value: string;
  placeholder?: string;
  emptyHint?: string;
  onCreateLabel: (query: string) => string;
  onChange: (value: string | null) => void;
  onCreate: (name: string) => void | Promise<void>;
}

function CreatableCombobox({
  items,
  value,
  placeholder = "Select or add...",
  emptyHint = "No results.",
  onCreateLabel,
  onChange,
  onCreate,
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectedLabel = useMemo(
    () => items.find((i) => i.value === value)?.name || "",
    [items, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query]);

  const trimmed = query.trim();
  const exactExists = items.some(
    (i) => i.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const canCreate = trimmed.length > 0 && !exactExists;

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input text-left flex items-center justify-between"
      >
        <span className={selectedLabel ? "text-gray-900" : "text-gray-400"}>
          {selectedLabel || placeholder}
        </span>
        <Search size={14} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border rounded-lg shadow-lg">
          <div className="p-2 border-b">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1.5 text-sm outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCreate) {
                  e.preventDefault();
                  onCreate(trimmed);
                  setQuery("");
                  setOpen(false);
                }
              }}
            />
          </div>

          <div className="max-h-56 overflow-y-auto">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
              >
                — Clear selection —
              </button>
            )}

            {filtered.length === 0 && !canCreate && (
              <p className="px-3 py-2 text-sm text-gray-400">{emptyHint}</p>
            )}

            {filtered.map((item) => {
              const selected = item.value === value;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.value);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${
                    selected ? "bg-blue-50 text-blue-700" : ""
                  }`}
                >
                  <span>{item.name}</span>
                  {selected && <Check size={14} />}
                </button>
              );
            })}

            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  onCreate(trimmed);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-blue-600 hover:bg-blue-50 border-t"
              >
                <Plus size={14} />
                {onCreateLabel(trimmed)}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
