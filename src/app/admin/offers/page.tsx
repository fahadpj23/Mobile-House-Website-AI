"use client";
import { useEffect, useState } from "react";
import imageCompression from "browser-image-compression";
import {
  getSpecialOffers,
  addSpecialOffer,
  updateSpecialOffer,
  deleteSpecialOffer,
} from "@/lib/firestore";
import { uploadImage } from "@/lib/storage";
import { SpecialOffer } from "@/lib/types";
import toast from "react-hot-toast";
import { Plus, Trash2, Upload, Edit, Loader2 } from "lucide-react";

/**
 * Compress + convert any image file to WebP.
 * Offer cards are usually displayed ~600-800px wide, so 1400px is plenty.
 */
async function compressOfferImage(file: File): Promise<File> {
  if (file.size < 100 * 1024) return file;

  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1400,
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
    console.warn("Offer compression failed, using original:", err);
    return file;
  }
}

export default function AdminOffers() {
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    link: "",
    discount: "",
    active: true,
  });

  const load = async () => {
    setLoading(true);
    setOffers(await getSpecialOffers());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // ===== IMAGE UPLOAD (compressed → WebP) =====
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const optimized = await compressOfferImage(file);
      toast.loading("Uploading...", { id: toastId });
      const url = await uploadImage(optimized, "offers");
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
        await updateSpecialOffer(editing, form);
        toast.success("Offer updated");
      } else {
        await addSpecialOffer(form);
        toast.success("Offer added");
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
      description: "",
      imageUrl: "",
      link: "",
      discount: "",
      active: true,
    });
    setEditing(null);
  };

  const handleEdit = (o: SpecialOffer) => {
    setEditing(o.id!);
    setForm({
      title: o.title,
      description: o.description || "",
      imageUrl: o.imageUrl,
      link: o.link || "",
      discount: o.discount || "",
      active: o.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this offer?")) return;
    await deleteSpecialOffer(id);
    toast.success("Deleted");
    load();
  };

  const busy = uploading || saving;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Special Offers</h1>

      <form onSubmit={handleSubmit} className="card p-5 mb-6 space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <input
            placeholder="Title *"
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            placeholder="Discount badge (e.g. 30% OFF)"
            className="input"
            value={form.discount}
            onChange={(e) => setForm({ ...form, discount: e.target.value })}
          />
          <input
            placeholder="Link (optional)"
            className="input"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
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
        <textarea
          placeholder="Description"
          className="input"
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

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
            {saving ? "Saving..." : editing ? "Update Offer" : "Add Offer"}
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

      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading offers...</span>
          </div>
        ) : offers.length === 0 ? (
          <p className="text-gray-500">No offers yet.</p>
        ) : (
          offers.map((o) => (
            <div key={o.id} className="card p-4">
              <img
                src={o.imageUrl}
                alt=""
                className="w-full h-40 rounded object-cover mb-3"
              />
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{o.title}</p>
                  <p className="text-xs text-gray-500">{o.description}</p>
                  {o.discount && (
                    <span className="inline-block mt-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                      {o.discount}
                    </span>
                  )}
                  <span
                    className={`inline-block ml-1 text-xs px-2 py-0.5 rounded ${
                      o.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {o.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(o)}
                    className="text-blue-600"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(o.id!)}
                    className="text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
