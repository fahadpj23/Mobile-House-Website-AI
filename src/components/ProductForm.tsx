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
} from "@/lib/firestore";
import { uploadImage } from "@/lib/storage";
import {
  Category,
  Brand,
  Product,
  SpecTemplate,
  Series,
  ProductOption,
  ProductVariant,
  SpecValue,
} from "@/lib/types";
import toast from "react-hot-toast";
import { Upload, X, Plus, Save, Trash2 } from "lucide-react";
import CreatableCombobox from "./CreatableCombobox";
import VariantEditor from "./VariantEditor";

interface Props {
  initialData?: Product;
}

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
  } catch {
    return file;
  }
}

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
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  const [path, setPath] = useState<string[]>(
    initialData?.categoryPath ||
      (initialData?.category ? [initialData.category] : []),
  );
  const [categoryConfirmed, setCategoryConfirmed] = useState(!!initialData?.id);

  const [form, setForm] = useState(() => {
    const loadedSpecs: SpecValue[] = initialData?.specifications?.length
      ? initialData.specifications
      : [];
    return {
      name: initialData?.name || "",
      description: initialData?.description || "",
      price: initialData?.price ? String(initialData.price) : "",
      mrp: initialData?.discountPrice ? String(initialData.discountPrice) : "",
      brand: initialData?.brand || "",
      stock: initialData?.stock ? String(initialData.stock) : "",
      images: initialData?.images || ([] as string[]),
      specifications: loadedSpecs,
      isSpecialOffer: initialData?.isSpecialOffer || false,
      isFeatured: initialData?.isFeatured || false,
      totalSold: initialData?.totalSold ? String(initialData.totalSold) : "",
      series: initialData?.series || "",
      seriesName: initialData?.seriesName || "",
    };
  });

  const [options, setOptions] = useState<ProductOption[]>(
    initialData?.options || [],
  );
  const [variants, setVariants] = useState<ProductVariant[]>(
    initialData?.variants || [],
  );
  const hasVariants = options.length > 0 && variants.length > 0;

  const hasVariantImages = useMemo(
    () =>
      options.some(
        (o) =>
          o.type === "color" &&
          o.values.some((v) => (v.images?.length || 0) > 0),
      ),
    [options],
  );

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
      setTemplatesLoaded(true);
    })();
  }, []);

  const childrenOf = useMemo(() => {
    const map: Record<string, Category[]> = {};
    categories.forEach((c) => {
      const key = c.parentSlug || "__root__";
      (map[key] ||= []).push(c);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.name.localeCompare(b.name)),
    );
    return map;
  }, [categories]);

  const slugToCat = useMemo(() => {
    const m: Record<string, Category> = {};
    categories.forEach((c) => (m[c.slug] = c));
    return m;
  }, [categories]);

  const leafSlug = path[path.length - 1] || "";

  const mergedSpecs = useMemo<SpecValue[]>(() => {
    const merged: Record<string, SpecValue> = {};
    const order: string[] = [];
    for (const slug of path) {
      for (const t of specTemplates[slug] || []) {
        const key = t.key.trim();
        if (!key) continue;
        if (!(key in merged)) order.push(key);
        merged[key] = {
          key,
          value: merged[key]?.value || "",
          placeholder: t.placeholder,
          required: !!t.required,
        };
      }
    }
    return order.map((k) => merged[k]);
  }, [path, specTemplates]);

  const prevPathRef = useRef<string>("");
  useEffect(() => {
    if (!path.length) return;
    if (!templatesLoaded) return;

    const pathKey = path.join("|");
    if (prevPathRef.current === pathKey) return;
    prevPathRef.current = pathKey;

    setForm((f) => {
      const valuesByKey: Record<string, string> = {};
      f.specifications.forEach((s) => {
        if (s.key.trim()) valuesByKey[s.key.trim()] = s.value;
      });

      const fromTemplates: SpecValue[] = mergedSpecs.map((t) => ({
        key: t.key,
        value: valuesByKey[t.key] ?? "",
        placeholder: t.placeholder,
        required: !!t.required,
      }));

      const templateKeys = new Set(mergedSpecs.map((s) => s.key));
      const customFields: SpecValue[] = f.specifications.filter(
        (s) => s.key.trim() && !templateKeys.has(s.key.trim()),
      );

      return {
        ...f,
        specifications: [...fromTemplates, ...customFields],
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, mergedSpecs, templatesLoaded]);

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
      toast.success(`${uploaded.length} image(s) uploaded`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (idx: number) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) return toast.error("Name is required");
    if (!path.length) return toast.error("Category is required");
    if (!form.brand) return toast.error("Brand is required");

    const priceNum = toNum(form.price);
    const mrpNum = toNum(form.mrp);
    const stockNum = toNum(form.stock);
    const totalSoldNum = toNum(form.totalSold);

    if (form.images.length === 0 && !hasVariantImages) {
      return toast.error("Add at least one image, or upload color images");
    }

    const missing = form.specifications.find(
      (s) => s.required && s.key.trim() && !s.value.trim(),
    );
    if (missing) return toast.error(`"${missing.key}" is required`);

    // ★ Validate only the fields relevant to the current mode
    const enabledVariants = variants.filter((v) => v.enabled);

    if (hasVariants) {
      if (enabledVariants.length === 0) {
        return toast.error("Enable at least one variant");
      }
      const badPrice = enabledVariants.find((v) => v.price <= 0);
      if (badPrice) return toast.error("Every variant needs a price > 0");
      // Base price/stock are ignored when variants exist.
    } else {
      if (priceNum <= 0) return toast.error("Price must be greater than 0");
    }

    const cleanedSpecs = form.specifications.filter(
      (s) => s.key.trim() && s.value.trim(),
    );

    setSaving(true);
    try {
      // ★ Derive top-level price / MRP / stock from variants when present
      const finalPrice = hasVariants
        ? Math.min(...enabledVariants.map((v) => v.price))
        : priceNum;

      const finalMrp = hasVariants
        ? Math.max(...enabledVariants.map((v) => v.discountPrice ?? 0), 0) ||
          undefined
        : mrpNum || undefined;

      const finalStock = hasVariants
        ? enabledVariants.reduce((s, v) => s + v.stock, 0)
        : stockNum;

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: finalPrice,
        discountPrice: finalMrp,
        category: leafSlug,
        categoryPath: path,
        categoryName: slugToCat[leafSlug]?.name || "",
        brand: form.brand,
        stock: finalStock,
        images: form.images,
        specifications: cleanedSpecs,
        isSpecialOffer: form.isSpecialOffer,
        isFeatured: form.isFeatured,
        totalSold: totalSoldNum,
        series: form.series || undefined,
        seriesName: form.seriesName || undefined,
        options: hasVariants ? options : undefined,
        variants: hasVariants ? variants : undefined,
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

  const dropdownLevels: { parentSlug: string | null; options: Category[] }[] =
    [];
  {
    const rootOptions = childrenOf["__root__"] || [];
    dropdownLevels.push({ parentSlug: null, options: rootOptions });
    for (let i = 0; i < path.length; i++) {
      const children = childrenOf[path[i]] || [];
      if (children.length === 0) break;
      dropdownLevels.push({ parentSlug: path[i], options: children });
    }
  }

  const setPathAt = (levelIndex: number, slug: string) => {
    setPath((prev) => {
      const next = prev.slice(0, levelIndex);
      if (slug) next.push(slug);
      return next;
    });
  };

  const isLeaf = path.length > 0 && (childrenOf[leafSlug] || []).length === 0;
  const canConfirm = path.length > 0 && isLeaf;

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-5">
      {/* STEP 1: CATEGORY PICKER */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
            1
          </span>
          <h2 className="font-bold text-lg">Choose Category *</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {dropdownLevels.map((lvl, idx) => {
            const value = path[idx] || "";
            return (
              <select
                key={idx}
                className="input"
                value={value}
                disabled={categoryConfirmed}
                onChange={(e) => setPathAt(idx, e.target.value)}
              >
                <option value="">
                  {idx === 0 ? "Select Category *" : "Select Subcategory"}
                </option>
                {lvl.options.map((c) => (
                  <option key={c.id ?? c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            );
          })}
        </div>

        {path.length > 0 && (
          <p className="text-xs text-gray-500">
            Path: {path.map((s) => slugToCat[s]?.name || s).join(" › ")}
          </p>
        )}

        {!categoryConfirmed && (
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => {
                if (!canConfirm) {
                  toast.error(
                    "Please select a category down to its last level",
                  );
                  return;
                }
                setCategoryConfirmed(true);
              }}
              className="btn-primary disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
            {path.length > 0 && !isLeaf && (
              <p className="text-xs text-amber-600">
                Keep choosing until you reach the deepest subcategory.
              </p>
            )}
          </div>
        )}

        {categoryConfirmed && !isEdit && (
          <button
            type="button"
            onClick={() => setCategoryConfirmed(false)}
            className="text-xs text-blue-600 underline"
          >
            Change category
          </button>
        )}
      </div>

      {/* STEP 2: PRODUCT DETAILS */}
      {categoryConfirmed && templatesLoaded && (
        <>
          {/* BASIC INFO */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                2
              </span>
              <h2 className="font-bold text-lg">Product Details</h2>
            </div>

            <input
              placeholder="Product name *"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <textarea
              placeholder="Description (optional)"
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />

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

          {/* PRICING & STOCK */}
          <div className="card p-5 space-y-3">
            <h2 className="font-bold text-lg">Pricing & Stock</h2>

            {hasVariants ? (
              // ★ Variants take over pricing & stock — no manual input needed
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium mb-1">
                  Pricing & stock are managed by variants
                </p>
                <p className="text-xs text-blue-700">
                  Base values are derived automatically from the enabled
                  variants:
                </p>
                <ul className="text-xs text-blue-700 mt-2 space-y-0.5">
                  <li>
                    <b>Price:</b> ৳
                    {(() => {
                      const enabled = variants.filter((v) => v.enabled);
                      if (!enabled.length) return "—";
                      return Math.min(...enabled.map((v) => v.price));
                    })()}
                  </li>
                  <li>
                    <b>Stock:</b>{" "}
                    {variants
                      .filter((v) => v.enabled)
                      .reduce((s, v) => s + v.stock, 0)}{" "}
                    units
                  </li>
                  <li>
                    <b>Total Sold:</b> {form.totalSold || 0}
                  </li>
                </ul>
                <p className="text-[11px] text-blue-600 mt-2">
                  Edit each variant in the section below to change price / MRP /
                  stock.
                </p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-gray-600">MRP (৳)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      className="input"
                      value={form.mrp}
                      onChange={(e) =>
                        setForm({ ...form, mrp: e.target.value })
                      }
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Original / list price
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Price (৳) *</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      className="input"
                      value={form.price}
                      onChange={(e) =>
                        setForm({ ...form, price: e.target.value })
                      }
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      What the customer pays
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Stock *</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      className="input"
                      value={form.stock}
                      onChange={(e) =>
                        setForm({ ...form, stock: e.target.value })
                      }
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
                    onChange={(e) =>
                      setForm({ ...form, totalSold: e.target.value })
                    }
                  />
                </div>
              </>
            )}
          </div>

          {/* VARIANTS */}
          <VariantEditor
            basePrice={toNum(form.price) || 0}
            baseMrp={toNum(form.mrp) || undefined}
            baseStock={toNum(form.stock) || 0}
            options={options}
            variants={variants}
            onChange={(o, v) => {
              setOptions(o);
              setVariants(v);
            }}
          />

          {/* TAGS */}
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
                <span className="text-sm font-medium">
                  Mark as Special Offer
                </span>
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

          {/* IMAGES */}
          {!hasVariantImages ? (
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
          ) : (
            <div className="card p-5 bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-800">
                <b>Images are provided by the variants.</b> The storefront
                gallery will show each color's uploaded images.
              </p>
            </div>
          )}

          {/* SPECIFICATIONS */}
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
                No specification fields configured for this category path.
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
                      className={`input ${
                        s.required && !s.value.trim() ? "border-red-300" : ""
                      }`}
                      value={s.value}
                      onChange={(e) => updateSpec(i, "value", e.target.value)}
                    />
                    {s.required && (
                      <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">
                        Required
                      </span>
                    )}
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

          {/* SUBMIT */}
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
        </>
      )}
    </form>
  );
}
