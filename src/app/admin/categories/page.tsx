"use client";
import { useEffect, useState } from "react";
import {
  getCategories,
  addCategory,
  deleteCategory,
  getAllCategorySpecs,
  saveCategorySpec,
} from "@/lib/firestore";
import { Category, CategorySpec, SpecTemplate } from "@/lib/types";
import toast from "react-hot-toast";
import { Trash2, Plus, X, Settings, Save } from "lucide-react";

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [specs, setSpecs] = useState<Record<string, CategorySpec>>({});
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const load = async () => {
    const [cats, allSpecs] = await Promise.all([
      getCategories(),
      getAllCategorySpecs(),
    ]);
    setCategories(cats);
    const map: Record<string, CategorySpec> = {};
    allSpecs.forEach((s) => (map[s.categorySlug] = s));
    setSpecs(map);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    await addCategory({ name, slug });
    setName("");
    toast.success("Category added");
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete category?")) return;
    await deleteCategory(id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Categories & Specifications</h1>

      {/* Add new category */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          placeholder="Category name (e.g. Smartphones)"
          className="input flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn-primary flex items-center gap-1">
          <Plus size={16} /> Add
        </button>
      </form>

      {/* List categories */}
      <div className="card divide-y">
        {categories.map((c) => (
          <div key={c.id} className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-gray-500">
                  /{c.slug} • {specs[c.slug]?.specs?.length || 0} spec fields
                  configured
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(editing === c.slug ? null : c.slug)}
                  className="btn-outline text-sm flex items-center gap-1"
                >
                  <Settings size={14} />
                  {editing === c.slug ? "Close" : "Edit Specs"}
                </button>
                <button
                  onClick={() => handleDelete(c.id!)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {editing === c.slug && (
              <SpecEditor
                category={c}
                initial={specs[c.slug]?.specs || []}
                onSave={async (newSpecs) => {
                  await saveCategorySpec(c.slug, c.name, newSpecs);
                  toast.success("Specs saved");
                  load();
                }}
              />
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <p className="p-4 text-gray-500 text-sm">
            No categories yet. Add one above.
          </p>
        )}
      </div>
    </div>
  );
}

// ===== Spec Editor =====
function SpecEditor({
  category,
  initial,
  onSave,
}: {
  category: Category;
  initial: SpecTemplate[];
  onSave: (specs: SpecTemplate[]) => Promise<void>;
}) {
  const [list, setList] = useState<SpecTemplate[]>(
    initial.length ? initial : [{ key: "", placeholder: "", required: false }],
  );
  const [saving, setSaving] = useState(false);

  const add = () =>
    setList((l) => [...l, { key: "", placeholder: "", required: false }]);

  const update = (
    i: number,
    field: keyof SpecTemplate,
    value: string | boolean,
  ) =>
    setList((l) =>
      l.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)),
    );

  const remove = (i: number) => setList((l) => l.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    const cleaned = list.filter((s) => s.key.trim());
    if (!cleaned.length) {
      toast.error("Add at least one specification");
      return;
    }
    setSaving(true);
    try {
      await onSave(cleaned);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
      <p className="text-sm font-medium text-gray-700 mb-2">
        Specification fields for <b>{category.name}</b>
      </p>
      {list.map((s, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            placeholder="Field name (e.g. RAM)"
            className="input"
            value={s.key}
            onChange={(e) => update(i, "key", e.target.value)}
          />
          <input
            placeholder="Placeholder (e.g. 8GB)"
            className="input"
            value={s.placeholder || ""}
            onChange={(e) => update(i, "placeholder", e.target.value)}
          />
          <label className="flex items-center gap-1 text-xs whitespace-nowrap">
            <input
              type="checkbox"
              checked={!!s.required}
              onChange={(e) => update(i, "required", e.target.checked)}
            />
            Required
          </label>
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-red-500"
          >
            <X size={18} />
          </button>
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={add}
          className="text-blue-600 text-sm flex items-center gap-1"
        >
          <Plus size={14} /> Add field
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary ml-auto text-sm flex items-center gap-1"
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save Specs"}
        </button>
      </div>
    </div>
  );
}
