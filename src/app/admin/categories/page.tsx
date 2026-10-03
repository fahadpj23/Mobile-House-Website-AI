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
import {
  Trash2,
  Plus,
  X,
  Settings,
  Save,
  ChevronRight,
  ChevronDown,
  FolderTree,
  Folder,
  File,
} from "lucide-react";

// ===== Types =====
interface TreeNode {
  id?: string;
  name: string;
  slug: string;
  parentSlug?: string | null;
  depth: number;
  specs: SpecTemplate[];
  children: TreeNode[];
}

export default function AdminCategories() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [name, setName] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  const load = async () => {
    const [cats, allSpecs] = await Promise.all([
      getCategories(),
      getAllCategorySpecs(),
    ]);

    const specMap: Record<string, SpecTemplate[]> = {};
    allSpecs.forEach((s) => (specMap[s.categorySlug] = s.specs || []));

    const byParent: Record<string, Category[]> = {};
    cats.forEach((c: any) => {
      const key = c.parentSlug || "__root__";
      (byParent[key] ||= []).push(c);
    });

    const buildNode = (cat: any, depth: number): TreeNode => {
      const children = (byParent[cat.slug] || []).map((child) =>
        buildNode(child, depth + 1),
      );
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parentSlug: cat.parentSlug ?? null,
        depth,
        specs: specMap[cat.slug] || [],
        children,
      };
    };

    const roots = (byParent["__root__"] || []).map((c) => buildNode(c, 0));
    setTree(roots);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAddRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const slug = uniqueSlug(name, tree);
    await addCategory({ name, slug, parentSlug: null } as any);
    setName("");
    toast.success("Category added");
    load();
  };

  const handleAddChild = async (parent: TreeNode, childName: string) => {
    if (!childName.trim()) return;
    const slug = uniqueSlug(`${parent.slug}-${childName}`, tree);
    await addCategory({
      name: childName,
      slug,
      parentSlug: parent.slug,
    } as any);
    toast.success("Child added");
    setExpanded((e) => ({ ...e, [parent.slug]: true }));
    load();
  };

  const handleDelete = async (node: TreeNode) => {
    const count = countNodes(node) - 1;
    if (
      !confirm(
        `Delete "${node.name}"${
          count ? ` and its ${count} descendant(s)` : ""
        }?`,
      )
    )
      return;

    const deleteRecursive = async (n: TreeNode) => {
      for (const c of n.children) await deleteRecursive(c);
      if (n.id) await deleteCategory(n.id);
    };
    await deleteRecursive(node);
    toast.success("Deleted");
    load();
  };

  const toggle = (slug: string) =>
    setExpanded((e) => ({ ...e, [slug]: !e[slug] }));

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Categories (unlimited depth)</h1>

      <form onSubmit={handleAddRoot} className="flex gap-2 mb-6">
        <input
          placeholder="Root category name (e.g. Electronics)"
          className="input flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn-primary flex items-center gap-1">
          <Plus size={16} /> Add Root Category
        </button>
      </form>

      <div className="card divide-y">
        {tree.map((node) => (
          <NodeRow
            key={node.slug}
            node={node}
            expanded={expanded}
            toggle={toggle}
            editingSlug={editingSlug}
            setEditingSlug={setEditingSlug}
            onDelete={handleDelete}
            onAddChild={handleAddChild}
            onSaveSpecs={async (n, specs) => {
              await saveCategorySpec(n.slug, n.name, specs);
              toast.success("Specs saved");
              load();
            }}
          />
        ))}
        {tree.length === 0 && (
          <p className="p-4 text-gray-500 text-sm">
            No categories yet. Add a root category above.
          </p>
        )}
      </div>
    </div>
  );
}

// ===== Recursive Node Row =====
function NodeRow({
  node,
  expanded,
  toggle,
  editingSlug,
  setEditingSlug,
  onDelete,
  onAddChild,
  onSaveSpecs,
}: {
  node: TreeNode;
  expanded: Record<string, boolean>;
  toggle: (slug: string) => void;
  editingSlug: string | null;
  setEditingSlug: (s: string | null) => void;
  onDelete: (n: TreeNode) => void;
  onAddChild: (parent: TreeNode, name: string) => Promise<void>;
  onSaveSpecs: (n: TreeNode, specs: SpecTemplate[]) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const isExpanded = expanded[node.slug];
  const hasChildren = node.children.length > 0;

  const palette = [
    { Icon: FolderTree, color: "text-blue-600" },
    { Icon: Folder, color: "text-purple-600" },
    { Icon: Folder, color: "text-amber-600" },
    { Icon: File, color: "text-green-600" },
  ];
  const { Icon: LevelIcon, color: levelColor } =
    palette[Math.min(node.depth, palette.length - 1)];

  const indent = node.depth * 24 + 12;

  return (
    <div>
      <div
        className="p-3 flex justify-between items-center hover:bg-gray-50"
        style={{ paddingLeft: `${indent}px` }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => toggle(node.slug)}
            className={`text-gray-400 hover:text-gray-700 ${
              hasChildren ? "" : "opacity-30"
            }`}
            disabled={!hasChildren}
          >
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>

          <LevelIcon size={16} className={levelColor} />

          <div className="min-w-0">
            <p className="font-medium truncate">
              {node.name}
              <span
                className={`ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${levelColor} bg-opacity-10 bg-current`}
              >
                L{node.depth}
              </span>
            </p>
            <p className="text-xs text-gray-500 truncate">
              /{node.slug} • {node.specs.length} spec fields
              {hasChildren && ` • ${node.children.length} child(ren)`}
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center shrink-0">
          <button
            onClick={() =>
              setEditingSlug(editingSlug === node.slug ? null : node.slug)
            }
            className="btn-outline text-xs flex items-center gap-1"
          >
            <Settings size={12} />
            {editingSlug === node.slug ? "Close" : "Edit Specs"}
          </button>

          <button
            onClick={() => {
              setAdding(true);
              setNewName("");
              setExpanded((e) => ({ ...e, [node.slug]: true }));
            }}
            className="text-blue-600 text-xs flex items-center gap-1"
          >
            <Plus size={12} /> Child
          </button>

          <button
            onClick={() => onDelete(node)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {adding && (
        <div className="px-4 pb-3" style={{ paddingLeft: `${indent + 36}px` }}>
          <div className="flex gap-2 items-center">
            <input
              autoFocus
              placeholder={`New child of "${node.name}"`}
              className="input flex-1 text-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  await onAddChild(node, newName);
                  setAdding(false);
                  setNewName("");
                }
                if (e.key === "Escape") setAdding(false);
              }}
            />
            <button
              onClick={async () => {
                await onAddChild(node, newName);
                setAdding(false);
                setNewName("");
              }}
              className="btn-primary text-xs"
            >
              Add
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-gray-500 text-xs"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {editingSlug === node.slug && (
        <div style={{ paddingLeft: `${indent + 12}px` }}>
          <SpecEditor
            title={`Specs for "${node.name}" (L${node.depth})`}
            initial={node.specs}
            onSave={(specs) => onSaveSpecs(node, specs)}
          />
        </div>
      )}

      {isExpanded &&
        node.children.map((c) => (
          <NodeRow
            key={c.slug}
            node={c}
            expanded={expanded}
            toggle={toggle}
            editingSlug={editingSlug}
            setEditingSlug={setEditingSlug}
            onDelete={onDelete}
            onAddChild={onAddChild}
            onSaveSpecs={onSaveSpecs}
          />
        ))}
    </div>
  );
}

// ===== Spec Editor =====
function SpecEditor({
  title,
  initial,
  onSave,
}: {
  title: string;
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
    setSaving(true);
    try {
      await onSave(cleaned);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="m-3 p-3 bg-gray-50 rounded-lg space-y-2">
      <p className="text-sm font-medium text-gray-700 mb-2">{title}</p>

      {list.length === 0 ? (
        <p className="text-xs text-gray-500 py-1">
          No spec fields. Click <b>Add field</b> to start.
        </p>
      ) : (
        list.map((s, i) => (
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
        ))
      )}

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

// ===== Helpers =====
function countNodes(node: TreeNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

function uniqueSlug(base: string, roots: TreeNode[]): string {
  const slugBase = base.toLowerCase().replace(/\s+/g, "-");
  const existing = new Set<string>();
  const walk = (nodes: TreeNode[]) => {
    nodes.forEach((n) => {
      existing.add(n.slug);
      walk(n.children);
    });
  };
  walk(roots);
  if (!existing.has(slugBase)) return slugBase;
  let i = 2;
  while (existing.has(`${slugBase}-${i}`)) i++;
  return `${slugBase}-${i}`;
}
