"use client";
import { useEffect, useState } from "react";
import imageCompression from "browser-image-compression";
import {
  getBanners,
  addBanner,
  updateBanner,
  deleteBanner,
} from "@/lib/firestore";
import { uploadImage } from "@/lib/storage";
import { Banner } from "@/lib/types";
import toast from "react-hot-toast";
import { Plus, Trash2, Upload, Edit, Eye, EyeOff, Loader2 } from "lucide-react";

const positions = [
  { value: "hero", label: "Hero (Top)" },
  { value: "mid", label: "Mid (After Products)" },
  { value: "bottom", label: "Bottom" },
];

/**
 * Compress + convert any image file to WebP.
 * Banner images are wide, so we allow up to 2000px wide.
 */
async function compressBannerImage(file: File): Promise<File> {
  // Skip compression for already-tiny files
  if (file.size < 150 * 1024) return file;

  const options = {
    maxSizeMB: 0.6, // banners are wide → allow a bit more size
    maxWidthOrHeight: 2000, // keep detail for large hero areas
    useWebWorker: true,
    initialQuality: 0.9,
    fileType: "image/webp",
    alwaysKeepResolution: false,
  };

  try {
    const compressed = await imageCompression(file, options);
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([compressed], `${baseName}.webp`, {
      type: "image/webp",
    });
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
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    imageUrl: "",
    link: "",
    position: "hero" as Banner["position"],
    active: true,
    order: 0,
  });

  const load = async () => {
    setLoading(true);
    setBanners(await getBanners());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // ===== IMAGE UPLOAD (compressed → WebP) =====
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Sanity-check size before compressing (avoid 50 MB uploads stalling the browser)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.imageUrl) {
      toast.error("Title and image required");
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
      load();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      subtitle: "",
      imageUrl: "",
      link: "",
      position: "hero",
      active: true,
      order: 0,
    });
    setEditing(null);
  };

  const handleEdit = (b: Banner) => {
    setEditing(b.id!);
    setForm({
      title: b.title,
      subtitle: b.subtitle || "",
      imageUrl: b.imageUrl,
      link: b.link || "",
      position: b.position,
      active: b.active,
      order: b.order || 0,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await deleteBanner(id);
    toast.success("Deleted");
    load();
  };

  const toggleActive = async (b: Banner) => {
    await updateBanner(b.id!, { active: !b.active });
    load();
  };

  const busy = uploading || saving;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Banner Management</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-5 mb-6 space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <input
            placeholder="Title *"
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            placeholder="Subtitle"
            className="input"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />
          <input
            placeholder="Link (e.g. /products?category=phone)"
            className="input"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
          />
          <select
            className="input"
            value={form.position}
            onChange={(e) =>
              setForm({
                ...form,
                position: e.target.value as Banner["position"],
              })
            }
          >
            {positions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Order (0 = first)"
            className="input"
            value={form.order}
            onChange={(e) =>
              setForm({ ...form, order: Number(e.target.value) })
            }
          />
          <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Active
          </label>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
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
            className="btn-primary flex items-center gap-1 disabled:bg-gray-400"
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
        </p>
      </form>

      {/* List */}
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
                <p className="font-medium">{b.title}</p>
                <p className="text-xs text-gray-500">{b.subtitle}</p>
                <div className="flex gap-2 mt-1">
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
                  <span className="text-xs text-gray-400">
                    Order: {b.order}
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
