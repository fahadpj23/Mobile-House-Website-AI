"use client";

import { useEffect, useState } from "react";
import {
  getCategories,
  addCategory,
  deleteCategory,
  getAllCategorySpecs,
  saveCategorySpec,
} from "@/lib/firestore";
import { Category, SpecField, SpecGroup, normalizeSpecs } from "@/lib/types";
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
  specs: SpecGroup[];
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

    const specMap: Record<string, SpecGroup[]> = {};
    allSpecs.forEach((s: any) => {
      specMap[s.categorySlug] = normalizeSpecs(s.specs);
    });

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
            setExpanded={setExpanded}
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
  setExpanded,
  editingSlug,
  setEditingSlug,
  onDelete,
  onAddChild,
  onSaveSpecs,
}: {
  node: TreeNode;
  expanded: Record<string, boolean>;
  toggle: (slug: string) => void;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  editingSlug: string | null;
  setEditingSlug: (s: string | null) => void;
  onDelete: (n: TreeNode) => void;
  onAddChild: (parent: TreeNode, name: string) => Promise<void>;
  onSaveSpecs: (n: TreeNode, specs: SpecGroup[]) => Promise<void>;
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

  const totalFields = node.specs.reduce(
    (n, g) => n + (g.fields?.length || 0),
    0,
  );

  return (
    <div>
      <div
        className="p-3 flex justify-between items-center hover:bg-gray-50"
        style={{ paddingLeft: `${indent}px` }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasChildren ? (
            <button
              onClick={() => toggle(node.slug)}
              className="text-gray-400 hover:text-gray-700"
            >
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          ) : (
            <span className="w-4 h-4 inline-block" aria-hidden="true" />
          )}

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
              /{node.slug} • {node.specs.length} group(s) • {totalFields}{" "}
              field(s)
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
            setExpanded={setExpanded}
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

// ===== Spec Editor (grouped) =====
function SpecEditor({
  title,
  initial,
  onSave,
}: {
  title: string;
  initial: SpecGroup[];
  onSave: (specs: SpecGroup[]) => Promise<void>;
}) {
  const [groups, setGroups] = useState<SpecGroup[]>(
    initial.length ? initial : [emptyGroup()],
  );
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  // ---- group ops ----
  const addGroup = () => setGroups((g) => [...g, emptyGroup()]);
  const removeGroup = (gi: number) =>
    setGroups((g) => g.filter((_, i) => i !== gi));
  const updateGroupName = (gi: number, name: string) =>
    setGroups((g) =>
      g.map((grp, i) => (i === gi ? { ...grp, group: name } : grp)),
    );

  // ---- field ops ----
  const addField = (gi: number) =>
    setGroups((g) =>
      g.map((grp, i) =>
        i === gi ? { ...grp, fields: [...grp.fields, emptyField()] } : grp,
      ),
    );
  const removeField = (gi: number, fi: number) =>
    setGroups((g) =>
      g.map((grp, i) =>
        i === gi
          ? { ...grp, fields: grp.fields.filter((_, j) => j !== fi) }
          : grp,
      ),
    );
  const updateField = (gi: number, fi: number, patch: Partial<SpecField>) =>
    setGroups((g) =>
      g.map((grp, i) =>
        i === gi
          ? {
              ...grp,
              fields: grp.fields.map((f, j) =>
                j === fi ? { ...f, ...patch } : f,
              ),
            }
          : grp,
      ),
    );

  const handleSave = async () => {
    const cleaned: SpecGroup[] = groups
      .map((grp) => ({
        group: grp.group.trim(),
        fields: grp.fields
          .map((f) => ({
            key: f.key.trim(),
            placeholder: f.placeholder?.trim() || "",
            required: !!f.required,
          }))
          .filter((f) => f.key),
      }))
      .filter((grp) => grp.group && grp.fields.length > 0);

    setSaving(true);
    try {
      await onSave(cleaned);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="m-3 p-3 bg-gray-50 rounded-lg space-y-3">
      <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>

      {groups.length === 0 && (
        <p className="text-xs text-gray-500 py-1">
          No spec groups. Click <b>Add group</b> to start.
        </p>
      )}

      {groups.map((grp, gi) => {
        const isCollapsed = collapsed[gi];
        return (
          <div
            key={gi}
            className="border border-gray-200 rounded-lg bg-white p-2 space-y-2"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [gi]: !c[gi] }))}
                className="text-gray-500 hover:text-gray-700"
              >
                {isCollapsed ? (
                  <ChevronRight size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
              <input
                placeholder="Group heading (e.g. General, In the Box)"
                className="input flex-1 font-medium"
                value={grp.group}
                onChange={(e) => updateGroupName(gi, e.target.value)}
              />
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {grp.fields.length} field(s)
              </span>
              <button
                type="button"
                onClick={() => removeGroup(gi)}
                className="text-red-500 hover:text-red-700"
                title="Remove group"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {!isCollapsed && (
              <div className="pl-6 space-y-2">
                {grp.fields.length === 0 && (
                  <p className="text-xs text-gray-500 py-1">
                    No fields yet. Click <b>Add field</b>.
                  </p>
                )}
                {grp.fields.map((f, fi) => (
                  <div key={fi} className="flex gap-2 items-center">
                    <input
                      placeholder="Field name (e.g. Brand)"
                      className="input"
                      value={f.key}
                      onChange={(e) =>
                        updateField(gi, fi, { key: e.target.value })
                      }
                    />
                    <input
                      placeholder="Placeholder (e.g. PHILIPS)"
                      className="input"
                      value={f.placeholder || ""}
                      onChange={(e) =>
                        updateField(gi, fi, { placeholder: e.target.value })
                      }
                    />
                    <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={!!f.required}
                        onChange={(e) =>
                          updateField(gi, fi, { required: e.target.checked })
                        }
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      onClick={() => removeField(gi, fi)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addField(gi)}
                  className="text-blue-600 text-sm flex items-center gap-1"
                >
                  <Plus size={14} /> Add field
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={addGroup}
          className="text-blue-600 text-sm flex items-center gap-1"
        >
          <Plus size={14} /> Add group
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
function emptyField(): SpecField {
  return { key: "", placeholder: "", required: false };
}

function emptyGroup(): SpecGroup {
  return { group: "", fields: [emptyField()] };
}

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
