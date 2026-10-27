"use client";
import { useMemo, useState } from "react";
import {
  Plus,
  X,
  AlertTriangle,
  Upload,
  Loader2,
  Trash2,
  ImagePlus,
  CheckSquare,
  Square,
  RefreshCw,
} from "lucide-react";
import imageCompression from "browser-image-compression";
import { ProductOption, ProductOptionValue, ProductVariant } from "@/lib/types";
import { uploadImage } from "@/lib/storage";
import toast from "react-hot-toast";

interface Props {
  basePrice: number;
  baseMrp?: number;
  baseStock: number;
  options: ProductOption[];
  variants: ProductVariant[];
  onChange: (options: ProductOption[], variants: ProductVariant[]) => void;
}

function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]],
  );
}

const uid = () => Math.random().toString(36).slice(2, 10);

/** Stable key that ignores option ordering. */
const comboKey = (ids: string[]) => [...ids].sort().join("|");

/**
 * Count how many of the variant's optionValueIds still exist in current options.
 * If it's less than the number of options, the variant is stale (needs regeneration).
 */
function isVariantStale(v: ProductVariant, options: ProductOption[]): boolean {
  if (v.optionValueIds.length !== options.length) return true;
  const liveIds = new Set(options.flatMap((o) => o.values.map((x) => x.id)));
  return !v.optionValueIds.every((id) => liveIds.has(id));
}

async function compressToWebp(file: File): Promise<File> {
  if (file.size < 100 * 1024) return file;
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.35,
      maxWidthOrHeight: 1400,
      useWebWorker: true,
      initialQuality: 0.9,
      fileType: "image/webp",
      alwaysKeepResolution: false,
    });
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([compressed], `${baseName}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
}

export default function VariantEditor({
  basePrice,
  baseMrp,
  baseStock,
  options,
  variants,
  onChange,
}: Props) {
  const [enabled, setEnabled] = useState(
    options.length > 0 || variants.length > 0,
  );
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadingVariant, setUploadingVariant] = useState<string | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleSelectVariant = (id: string) =>
    setSelectedVariantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAll = () => {
    if (selectedVariantIds.size === variants.length) {
      setSelectedVariantIds(new Set());
    } else {
      setSelectedVariantIds(new Set(variants.map((v) => v.id)));
    }
  };

  const clearSelection = () => setSelectedVariantIds(new Set());

  // ── Option management ────────────────────────────────
  const addOption = () => {
    const next: ProductOption = {
      id: uid(),
      name: "",
      type: "text",
      values: [],
    };
    onChange([...options, next], variants);
  };

  const updateOption = (i: number, patch: Partial<ProductOption>) => {
    onChange(
      options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
      variants,
    );
  };

  const removeOption = (i: number) => {
    const next = options.filter((_, idx) => idx !== i);
    const nextVariants = variants.filter((v) =>
      v.optionValueIds.every((id) =>
        next.some((o) => o.values.some((val) => val.id === id)),
      ),
    );
    onChange(next, nextVariants);
    // Drop stale selection ids
    setSelectedVariantIds((prev) => {
      const live = new Set(nextVariants.map((v) => v.id));
      const out = new Set<string>();
      prev.forEach((id) => live.has(id) && out.add(id));
      return out;
    });
  };

  const addValue = (optIdx: number, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const opt = options[optIdx];
    if (opt.values.some((v) => v.label.toLowerCase() === trimmed.toLowerCase()))
      return;

    const newValue: ProductOptionValue = {
      id: uid(),
      label: trimmed,
      images: [],
    };
    onChange(
      options.map((o, idx) =>
        idx === optIdx ? { ...o, values: [...o.values, newValue] } : o,
      ),
      variants,
    );
  };

  const updateValue = (
    optIdx: number,
    valIdx: number,
    patch: Partial<ProductOptionValue>,
  ) => {
    onChange(
      options.map((o, idx) =>
        idx === optIdx
          ? {
              ...o,
              values: o.values.map((v, vi) =>
                vi === valIdx ? { ...v, ...patch } : v,
              ),
            }
          : o,
      ),
      variants,
    );
  };

  const removeValue = (optIdx: number, valIdx: number) => {
    const removedId = options[optIdx].values[valIdx].id;
    const next = options.map((o, idx) =>
      idx === optIdx
        ? { ...o, values: o.values.filter((_, vi) => vi !== valIdx) }
        : o,
    );
    const nextVariants = variants.filter(
      (v) => !v.optionValueIds.includes(removedId),
    );
    onChange(next, nextVariants);
    setSelectedVariantIds((prev) => {
      const live = new Set(nextVariants.map((v) => v.id));
      const out = new Set<string>();
      prev.forEach((id) => live.has(id) && out.add(id));
      return out;
    });
  };

  // ── Color-value image upload ─────────────────────────
  const handleColorImagesUpload = async (
    optIdx: number,
    valIdx: number,
    files: File[],
  ) => {
    if (!files.length) return;
    const key = `${optIdx}-${valIdx}`;
    setUploadingKey(key);
    const toastId = toast.loading(`Uploading ${files.length} image(s)...`);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const optimized = await compressToWebp(file);
        const url = await uploadImage(optimized, "variants/colors");
        urls.push(url);
      }
      const current = options[optIdx].values[valIdx].images || [];
      updateValue(optIdx, valIdx, { images: [...current, ...urls] });
      toast.success(`${urls.length} image(s) uploaded`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Upload failed", { id: toastId });
    } finally {
      setUploadingKey(null);
    }
  };

  const removeColorImage = (optIdx: number, valIdx: number, imgIdx: number) => {
    const current = options[optIdx].values[valIdx].images || [];
    updateValue(optIdx, valIdx, {
      images: current.filter((_, i) => i !== imgIdx),
    });
  };

  // ── Per-variant image upload ────────────────────────
  const handleVariantImagesUpload = async (
    variantId: string,
    files: File[],
  ) => {
    if (!files.length) return;
    setUploadingVariant(variantId);
    const toastId = toast.loading(`Uploading ${files.length} image(s)...`);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const optimized = await compressToWebp(file);
        const url = await uploadImage(optimized, "variants");
        urls.push(url);
      }
      const target = variants.find((v) => v.id === variantId);
      const merged = [...(target?.images || []), ...urls];
      onChange(
        options,
        variants.map((v) =>
          v.id === variantId ? { ...v, images: merged } : v,
        ),
      );
      toast.success(`${urls.length} image(s) uploaded`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Upload failed", { id: toastId });
    } finally {
      setUploadingVariant(null);
    }
  };

  const removeVariantImage = (variantId: string, imgIdx: number) => {
    const target = variants.find((v) => v.id === variantId);
    if (!target) return;
    const next = (target.images || []).filter((_, i) => i !== imgIdx);
    onChange(
      options,
      variants.map((v) => (v.id === variantId ? { ...v, images: next } : v)),
    );
  };

  // ── Bulk upload to selected variants ────────────────
  const handleBulkImagesUpload = async (files: File[]) => {
    if (!files.length) return;
    if (selectedVariantIds.size === 0) {
      toast.error("Select at least one variant first");
      return;
    }
    setBulkUploading(true);
    const toastId = toast.loading(
      `Uploading ${files.length} image(s) to ${selectedVariantIds.size} variant(s)...`,
    );
    try {
      const urls: string[] = [];
      for (const file of files) {
        const optimized = await compressToWebp(file);
        const url = await uploadImage(optimized, "variants");
        urls.push(url);
      }
      onChange(
        options,
        variants.map((v) =>
          selectedVariantIds.has(v.id)
            ? { ...v, images: [...(v.images || []), ...urls] }
            : v,
        ),
      );
      toast.success(
        `Added ${urls.length} image(s) to ${selectedVariantIds.size} variant(s)`,
        { id: toastId },
      );
    } catch (err) {
      console.error(err);
      toast.error("Upload failed", { id: toastId });
    } finally {
      setBulkUploading(false);
    }
  };

  // ── Generate / regenerate (order-independent, merge-preserving) ──
  const regenerate = () => {
    if (options.length === 0 || options.some((o) => o.values.length === 0)) {
      onChange(options, []);
      setSelectedVariantIds(new Set());
      return;
    }

    const combos = cartesian(options.map((o) => o.values.map((v) => v.id)));

    // Key existing variants by unordered set of their option-value ids
    const existingByKey = new Map<string, ProductVariant>();
    variants.forEach((v) => existingByKey.set(comboKey(v.optionValueIds), v));

    let preserved = 0;
    let created = 0;

    const nextVariants: ProductVariant[] = combos.map((ids) => {
      const key = comboKey(ids);
      const found = existingByKey.get(key);
      if (found) {
        preserved += 1;
        // Keep everything, but re-align optionValueIds to current option order
        return { ...found, optionValueIds: ids };
      }
      created += 1;
      return {
        id: uid(),
        optionValueIds: ids,
        price: basePrice,
        discountPrice: baseMrp,
        stock: baseStock,
        enabled: true,
        images: [],
      };
    });

    onChange(options, nextVariants);

    // Prune selection
    const liveIds = new Set(nextVariants.map((v) => v.id));
    setSelectedVariantIds((prev) => {
      const out = new Set<string>();
      prev.forEach((id) => liveIds.has(id) && out.add(id));
      return out;
    });

    toast.success(
      created > 0
        ? `Generated ${nextVariants.length} variant(s) — ${preserved} kept, ${created} new`
        : `Regenerated ${nextVariants.length} variant(s) — images preserved`,
    );
  };

  const totalCombos = useMemo(() => {
    if (options.length === 0 || options.some((o) => o.values.length === 0))
      return 0;
    return options.reduce((n, o) => n * o.values.length, 1);
  }, [options]);

  const staleCount = useMemo(
    () => variants.filter((v) => isVariantStale(v, options)).length,
    [variants, options],
  );

  const hasUnsavedOptionChanges = variants.length > 0 && staleCount > 0;

  const updateVariant = (i: number, patch: Partial<ProductVariant>) => {
    onChange(
      options,
      variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)),
    );
  };

  const applyToAll = (patch: Partial<ProductVariant>) => {
    onChange(
      options,
      variants.map((v) => ({ ...v, ...patch })),
    );
  };

  const deleteVariant = (i: number) => {
    if (!confirm("Delete this variant?")) return;
    const id = variants[i].id;
    onChange(
      options,
      variants.filter((_, idx) => idx !== i),
    );
    setSelectedVariantIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const deleteDisabled = () => {
    const count = variants.filter((v) => !v.enabled).length;
    if (!count) {
      toast.error("No disabled variants to delete");
      return;
    }
    if (!confirm(`Delete ${count} disabled variant(s)?`)) return;
    const kept = variants.filter((v) => v.enabled);
    onChange(options, kept);
    const liveIds = new Set(kept.map((v) => v.id));
    setSelectedVariantIds((prev) => {
      const out = new Set<string>();
      prev.forEach((id) => liveIds.has(id) && out.add(id));
      return out;
    });
  };

  const allSelected =
    variants.length > 0 && selectedVariantIds.size === variants.length;

  return (
    <div className="card p-5 space-y-4">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-lg">Variants</h2>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked);
                if (!e.target.checked) {
                  onChange([], []);
                  setSelectedVariantIds(new Set());
                }
              }}
            />
            Enable variants
          </label>
        </div>
      </div>

      {!enabled && (
        <p className="text-xs text-gray-500">
          Turn on to sell this product in multiple RAM / Storage / Color
          combinations.
        </p>
      )}

      {enabled && (
        <>
          {/* ── OPTIONS ────────────────────────────────── */}
          <div className="space-y-3">
            {options.map((opt, oi) => (
              <div
                key={opt.id}
                className="border rounded-lg bg-gray-50 p-3 flex items-start gap-3"
              >
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    className="input py-1.5 text-sm"
                    style={{ width: "160px" }}
                    placeholder="Option name (RAM)"
                    value={opt.name}
                    onChange={(e) => updateOption(oi, { name: e.target.value })}
                  />
                  <select
                    className="input py-1.5 text-sm"
                    style={{ width: "90px" }}
                    value={opt.type}
                    onChange={(e) =>
                      updateOption(oi, {
                        type: e.target.value as "text" | "color",
                      })
                    }
                  >
                    <option value="text">Text</option>
                    <option value="color">Color</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-start gap-3 flex-1 min-w-0">
                  {opt.values.map((val, vi) => {
                    const uploading = uploadingKey === `${oi}-${vi}`;
                    const imgs = val.images || [];
                    return (
                      <div
                        key={val.id}
                        className="flex flex-col gap-2 bg-white border border-gray-200 rounded-lg p-2.5 min-w-[140px]"
                      >
                        <div className="flex items-center gap-2">
                          {opt.type === "color" && (
                            <input
                              type="color"
                              value={val.colorHex || "#000000"}
                              onChange={(e) =>
                                updateValue(oi, vi, {
                                  colorHex: e.target.value,
                                })
                              }
                              className="w-7 h-7 rounded cursor-pointer border p-0 shrink-0"
                              title="Pick color"
                            />
                          )}

                          <input
                            value={val.label}
                            onChange={(e) =>
                              updateValue(oi, vi, { label: e.target.value })
                            }
                            className="text-sm outline-none bg-transparent flex-1 min-w-0 font-medium"
                            placeholder="Value"
                          />

                          <button
                            type="button"
                            onClick={() => removeValue(oi, vi)}
                            className="text-gray-400 hover:text-red-500 shrink-0 p-0.5"
                            title="Remove value"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        {opt.type === "color" && (
                          <div className="flex flex-wrap items-start gap-2">
                            {imgs.map((url, imgIdx) => (
                              <div
                                key={imgIdx}
                                className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shrink-0"
                              >
                                <img
                                  src={url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                                {imgIdx === 0 && (
                                  <span className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                    Main
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeColorImage(oi, vi, imgIdx)
                                  }
                                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition"
                                  title="Remove image"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            ))}

                            <label
                              className={`w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 flex flex-col items-center justify-center cursor-pointer bg-gray-50 shrink-0 transition-colors ${
                                uploading ? "opacity-60 cursor-wait" : ""
                              }`}
                              title="Upload image(s)"
                            >
                              {uploading ? (
                                <Loader2
                                  size={20}
                                  className="animate-spin text-blue-600"
                                />
                              ) : (
                                <>
                                  <Upload size={18} className="text-gray-400" />
                                  <span className="text-[9px] text-gray-500 mt-0.5 font-medium">
                                    Upload
                                  </span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                disabled={uploading}
                                onChange={(e) => {
                                  const files = Array.from(
                                    e.target.files || [],
                                  );
                                  if (files.length)
                                    handleColorImagesUpload(oi, vi, files);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <AddValueInput onAdd={(label) => addValue(oi, label)} />
                </div>

                <button
                  type="button"
                  onClick={() => removeOption(oi)}
                  className="text-red-500 hover:text-red-700 shrink-0 p-1"
                  title="Remove option"
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addOption}
              className="text-blue-600 text-sm flex items-center gap-1 hover:underline"
            >
              <Plus size={14} /> Add option (e.g. RAM, Storage, Color)
            </button>
          </div>

          {/* ── STALE BANNER (options changed after generate) ── */}
          {hasUnsavedOptionChanges && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-wrap items-center gap-3">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 flex-1 min-w-[200px]">
                {staleCount} variant(s) are out of date because options changed
                after generation. Regenerate to apply the new option to every
                variant — existing images, price, and stock will be preserved.
              </p>
              <button
                type="button"
                onClick={regenerate}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <RefreshCw size={12} /> Regenerate now
              </button>
            </div>
          )}

          {/* ── GENERATE VARIANTS ──────────────────────── */}
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={regenerate}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <RefreshCw size={14} />
              {variants.length ? "Regenerate variants" : "Generate variants"} (
              {totalCombos})
            </button>
            <p className="text-xs text-gray-500">
              {variants.length
                ? "Existing variants keep their images, price, and stock — matched by option-value combination."
                : "Creates every combination from your options. After generating, upload images for each variant below."}
            </p>
          </div>

          {/* ── VARIANTS TABLE ─────────────────────────── */}
          {variants.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium">
                  {variants.length} variant(s)
                  {staleCount > 0 && (
                    <span className="ml-2 text-[10px] font-semibold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      {staleCount} stale
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => applyToAll({ price: basePrice })}
                  className="text-xs text-blue-600 underline"
                >
                  Set all prices to base
                </button>
                <button
                  type="button"
                  onClick={() => applyToAll({ discountPrice: baseMrp })}
                  className="text-xs text-blue-600 underline"
                >
                  Set all MRP to base
                </button>
                <button
                  type="button"
                  onClick={() => applyToAll({ stock: baseStock })}
                  className="text-xs text-blue-600 underline"
                >
                  Set all stock to base
                </button>
                {variants.some((v) => !v.enabled) && (
                  <button
                    type="button"
                    onClick={deleteDisabled}
                    className="text-xs text-red-600 underline"
                  >
                    Delete disabled
                  </button>
                )}
              </div>

              {/* BULK IMAGE UPLOAD BAR */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-800 hover:text-blue-900"
                >
                  {allSelected ? (
                    <CheckSquare size={14} />
                  ) : (
                    <Square size={14} />
                  )}
                  {allSelected ? "Unselect all" : "Select all"}
                </button>

                <span className="text-xs text-blue-700">
                  {selectedVariantIds.size > 0
                    ? `${selectedVariantIds.size} selected`
                    : "No variants selected"}
                </span>

                {selectedVariantIds.size > 0 && (
                  <>
                    <label
                      className={`btn-outline text-xs flex items-center gap-1.5 cursor-pointer bg-white ${
                        bulkUploading ? "opacity-60 cursor-wait" : ""
                      }`}
                    >
                      {bulkUploading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <ImagePlus size={12} />
                      )}
                      {bulkUploading
                        ? "Uploading..."
                        : `Add images to ${selectedVariantIds.size} selected`}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={bulkUploading}
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length) handleBulkImagesUpload(files);
                          e.target.value = "";
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-xs text-gray-500 underline ml-auto"
                    >
                      Clear selection
                    </button>
                  </>
                )}
              </div>

              <div className="overflow-x-auto border rounded-lg bg-white">
                <table className="text-sm min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-center px-2 py-2 font-medium whitespace-nowrap w-10">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          title={allSelected ? "Unselect all" : "Select all"}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {allSelected ? (
                            <CheckSquare size={14} />
                          ) : (
                            <Square size={14} />
                          )}
                        </button>
                      </th>
                      {options.map((o) => (
                        <th
                          key={o.id}
                          className="text-left px-3 py-2 font-medium whitespace-nowrap"
                        >
                          {o.name || "—"}
                        </th>
                      ))}
                      <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                        Images
                      </th>
                      <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                        MRP (₹)
                      </th>
                      <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                        Price (₹)
                      </th>
                      <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                        Stock
                      </th>
                      <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                        SKU
                      </th>
                      <th className="text-center px-3 py-2 font-medium whitespace-nowrap">
                        On
                      </th>
                      <th className="text-center px-3 py-2 font-medium whitespace-nowrap">
                        Del
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {variants.map((v, vi) => {
                      const isUploading = uploadingVariant === v.id;
                      const vImgs = v.images || [];
                      const isSelected = selectedVariantIds.has(v.id);
                      const stale = isVariantStale(v, options);
                      return (
                        <tr
                          key={v.id}
                          className={
                            (v.enabled ? "" : "opacity-50 bg-gray-50") +
                            (isSelected ? " bg-blue-50/60" : "") +
                            (stale
                              ? " outline outline-1 outline-amber-300"
                              : "")
                          }
                        >
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectVariant(v.id)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Select for bulk actions"
                            >
                              {isSelected ? (
                                <CheckSquare size={14} />
                              ) : (
                                <Square size={14} />
                              )}
                            </button>
                          </td>
                          {options.map((o, i) => {
                            const valId = v.optionValueIds[i];
                            const val = o.values.find((x) => x.id === valId);
                            const isColor = o.type === "color";
                            return (
                              <td
                                key={o.id}
                                className="px-3 py-2 whitespace-nowrap"
                              >
                                <div className="flex items-center gap-2">
                                  {isColor && val?.images?.[0] && (
                                    <img
                                      src={val.images[0]}
                                      alt={val.label}
                                      className="w-9 h-9 rounded object-cover border border-gray-200"
                                    />
                                  )}
                                  {isColor && !val?.images?.[0] && (
                                    <span className="w-4 h-4 rounded-full border border-gray-300 bg-gray-100" />
                                  )}
                                  <span>{val?.label || "?"}</span>
                                  {isColor &&
                                    (val?.images?.length || 0) > 1 && (
                                      <span className="text-[10px] text-gray-400">
                                        +{(val?.images?.length || 0) - 1}
                                      </span>
                                    )}
                                </div>
                              </td>
                            );
                          })}

                          {/* Per-variant images */}
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-1.5">
                              {vImgs.map((url, imgIdx) => (
                                <div
                                  key={imgIdx}
                                  className="relative group w-9 h-9 rounded overflow-hidden border border-gray-200 shrink-0"
                                >
                                  <img
                                    src={url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeVariantImage(v.id, imgIdx)
                                    }
                                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition shadow"
                                    title="Remove"
                                  >
                                    <X size={9} />
                                  </button>
                                </div>
                              ))}
                              <label
                                className={`w-9 h-9 rounded border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 flex items-center justify-center cursor-pointer text-gray-400 hover:text-blue-500 shrink-0 transition ${
                                  isUploading ? "opacity-60 cursor-wait" : ""
                                }`}
                                title="Upload variant image(s)"
                              >
                                {isUploading ? (
                                  <Loader2
                                    size={14}
                                    className="animate-spin text-blue-600"
                                  />
                                ) : (
                                  <ImagePlus size={14} />
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  disabled={isUploading}
                                  onChange={(e) => {
                                    const files = Array.from(
                                      e.target.files || [],
                                    );
                                    if (files.length)
                                      handleVariantImagesUpload(v.id, files);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          </td>

                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={v.discountPrice ?? ""}
                              placeholder="MRP"
                              onChange={(e) =>
                                updateVariant(vi, {
                                  discountPrice: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                })
                              }
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={v.price}
                              placeholder="Price"
                              onChange={(e) =>
                                updateVariant(vi, {
                                  price: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={v.stock}
                              onChange={(e) =>
                                updateVariant(vi, {
                                  stock: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              className="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={v.sku || ""}
                              onChange={(e) =>
                                updateVariant(vi, { sku: e.target.value })
                              }
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={v.enabled}
                              onChange={(e) =>
                                updateVariant(vi, {
                                  enabled: e.target.checked,
                                })
                              }
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => deleteVariant(vi)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Delete variant"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-400 flex items-center gap-1">
                <AlertTriangle size={12} />
                MRP is the original price; Price is what the customer pays.
                Turning off a variant hides it from the storefront. Use the
                checkboxes to bulk-upload the same images to multiple variants.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AddValueInput({ onAdd }: { onAdd: (v: string) => void }) {
  const [val, setVal] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-blue-600 border border-dashed border-blue-400 rounded px-3 py-2 hover:bg-blue-50 shrink-0 self-start"
      >
        <Plus size={12} /> Add value
      </button>
    );
  }

  const commit = () => {
    if (val.trim()) {
      onAdd(val);
      setVal("");
    }
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1 bg-white border border-blue-400 rounded px-2 py-2 shadow-sm shrink-0 self-start">
      <input
        autoFocus
        placeholder="e.g. 4GB"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setVal("");
            setOpen(false);
          }
        }}
        onBlur={commit}
        className="w-24 text-sm outline-none bg-transparent"
      />
    </div>
  );
}
