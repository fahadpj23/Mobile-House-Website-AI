"use client";
import { useMemo, useState } from "react";
import { Plus, X, AlertTriangle, Upload, Loader2, Trash2 } from "lucide-react";
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
  };

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

  const regenerate = () => {
    if (options.length === 0 || options.some((o) => o.values.length === 0)) {
      onChange(options, []);
      return;
    }
    const combos = cartesian(options.map((o) => o.values.map((v) => v.id)));
    const existing = new Map<string, ProductVariant>();
    variants.forEach((v) =>
      existing.set(v.optionValueIds.slice().sort().join("|"), v),
    );

    const nextVariants: ProductVariant[] = combos.map((ids) => {
      const key = ids.slice().sort().join("|");
      const found = existing.get(key);
      if (found) return found;
      return {
        id: uid(),
        optionValueIds: ids,
        price: basePrice,
        discountPrice: baseMrp,
        stock: baseStock,
        enabled: true,
      };
    });

    onChange(options, nextVariants);
  };

  const totalCombos = useMemo(() => {
    if (options.length === 0 || options.some((o) => o.values.length === 0))
      return 0;
    return options.reduce((n, o) => n * o.values.length, 1);
  }, [options]);

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
    onChange(
      options,
      variants.filter((_, idx) => idx !== i),
    );
  };

  const deleteDisabled = () => {
    const count = variants.filter((v) => !v.enabled).length;
    if (!count) {
      toast.error("No disabled variants to delete");
      return;
    }
    if (!confirm(`Delete ${count} disabled variant(s)?`)) return;
    onChange(
      options,
      variants.filter((v) => v.enabled),
    );
  };

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
                if (!e.target.checked) onChange([], []);
              }}
            />
            Enable variants
          </label>
        </div>
        {enabled && (
          <button
            type="button"
            onClick={regenerate}
            className="btn-outline text-sm"
          >
            Generate variants ({totalCombos})
          </button>
        )}
      </div>

      {!enabled && (
        <p className="text-xs text-gray-500">
          Turn on to sell this product in multiple RAM / Storage / Color
          combinations.
        </p>
      )}

      {enabled && (
        <>
          {/* ★ OPTIONS — EVERYTHING ON ONE ROW */}
          <div className="space-y-3">
            {options.map((opt, oi) => (
              <div
                key={opt.id}
                className="border rounded-lg bg-gray-50 p-2.5 flex items-start gap-2"
              >
                {/* Fixed-width left block: name + type */}
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

                {/* Middle: all values inline */}
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  {opt.values.map((val, vi) => {
                    const uploading = uploadingKey === `${oi}-${vi}`;
                    const imgs = val.images || [];
                    return (
                      <div
                        key={val.id}
                        className="flex items-center gap-1 bg-white border border-gray-200 rounded px-1.5 py-1"
                      >
                        {/* Color swatch (color type only) */}
                        {opt.type === "color" && (
                          <input
                            type="color"
                            value={val.colorHex || "#000000"}
                            onChange={(e) =>
                              updateValue(oi, vi, {
                                colorHex: e.target.value,
                              })
                            }
                            className="w-5 h-5 rounded cursor-pointer border p-0 shrink-0"
                            title="Pick color"
                          />
                        )}

                        {/* Value label */}
                        <input
                          value={val.label}
                          onChange={(e) =>
                            updateValue(oi, vi, { label: e.target.value })
                          }
                          className="text-sm outline-none bg-transparent"
                          placeholder="Value"
                          style={{
                            width: `${Math.max(
                              50,
                              val.label.length * 8 + 16,
                            )}px`,
                          }}
                        />

                        {/* Inline thumbnails (color type only) */}
                        {opt.type === "color" && (
                          <>
                            {imgs.map((url, imgIdx) => (
                              <div
                                key={imgIdx}
                                className="relative group w-6 h-6 rounded overflow-hidden border bg-gray-50 shrink-0"
                                title={imgIdx === 0 ? "Main image" : "Image"}
                              >
                                <img
                                  src={url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeColorImage(oi, vi, imgIdx)
                                  }
                                  className="absolute -top-0.5 -right-0.5 bg-red-600 text-white rounded-full p-[1px] opacity-0 group-hover:opacity-100 transition"
                                >
                                  <X size={7} />
                                </button>
                              </div>
                            ))}
                            <label
                              className={`w-6 h-6 rounded border border-dashed border-gray-300 hover:border-blue-500 flex items-center justify-center cursor-pointer bg-gray-50 shrink-0 ${
                                uploading ? "opacity-60" : ""
                              }`}
                              title="Upload image(s)"
                            >
                              {uploading ? (
                                <Loader2
                                  size={10}
                                  className="animate-spin text-blue-600"
                                />
                              ) : (
                                <Upload size={10} className="text-gray-400" />
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
                          </>
                        )}

                        {/* Remove value */}
                        <button
                          type="button"
                          onClick={() => removeValue(oi, vi)}
                          className="text-gray-400 hover:text-red-500 shrink-0"
                          title="Remove value"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    );
                  })}

                  {/* Add value pill */}
                  <AddValueInput onAdd={(label) => addValue(oi, label)} />
                </div>

                {/* Fixed-width right block: remove option */}
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

          {/* VARIANTS TABLE */}
          {variants.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium">
                  {variants.length} variant(s)
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

              <div className="overflow-x-auto border rounded-lg bg-white">
                <table className="text-sm min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      {options.map((o) => (
                        <th
                          key={o.id}
                          className="text-left px-3 py-2 font-medium whitespace-nowrap"
                        >
                          {o.name || "—"}
                        </th>
                      ))}
                      <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                        MRP (৳)
                      </th>
                      <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                        Price (৳)
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
                    {variants.map((v, vi) => (
                      <tr
                        key={v.id}
                        className={v.enabled ? "" : "opacity-50 bg-gray-50"}
                      >
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
                                    className="w-7 h-7 rounded object-cover border border-gray-200"
                                  />
                                )}
                                {isColor && !val?.images?.[0] && (
                                  <span className="w-3.5 h-3.5 rounded-full border border-gray-300 bg-gray-100" />
                                )}
                                <span>{val?.label || "?"}</span>
                                {isColor && (val?.images?.length || 0) > 1 && (
                                  <span className="text-[10px] text-gray-400">
                                    +{(val?.images?.length || 0) - 1}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
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
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-400 flex items-center gap-1">
                <AlertTriangle size={12} />
                MRP is the original price; Price is what the customer pays.
                Turning off a variant hides it from the storefront.
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
        className="flex items-center gap-1 text-xs text-blue-600 border border-dashed border-blue-400 rounded px-2 py-1 hover:bg-blue-50 shrink-0"
      >
        <Plus size={11} /> Add value
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
    <div className="flex items-center gap-1 bg-white border border-blue-400 rounded px-1.5 py-1 shadow-sm shrink-0">
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
        className="w-20 text-sm outline-none bg-transparent"
      />
    </div>
  );
}
