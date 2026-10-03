"use client";
import { useEffect, useState } from "react";
import { listAdmins, updateAdminDoc, deleteAdminDoc } from "@/lib/adminAuth";
import { useAdminAuth } from "@/components/AdminAuthProvider";
import { AdminUser, AdminSection } from "@/lib/types";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Save,
  UserPlus,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

const SECTIONS: { key: AdminSection; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products", label: "Products" },
  { key: "categories", label: "Categories" },
  { key: "brands", label: "Brands" },
  { key: "banners", label: "Banners" },
  { key: "offers", label: "Special Offers" },
  { key: "orders", label: "Orders" },
];

export default function AdminUsersPage() {
  const { admin: currentAdmin, isSuper, refreshAdmin } = useAdminAuth();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  // Create form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newRole, setNewRole] = useState<"admin" | "super">("admin");
  const [newPerms, setNewPerms] = useState<AdminSection[]>([
    "dashboard",
    "products",
  ]);

  const load = async () => {
    setLoading(true);
    try {
      setAdmins(await listAdmins());
    } catch (err) {
      console.error(err);
      toast.error("Failed to load admin users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim()) {
      toast.error("Email and password are required");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!currentAdmin?.uid) {
      toast.error("Super admin session not found");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
          permissions: newRole === "super" ? ["*"] : newPerms,
          callerUid: currentAdmin.uid,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create admin");
      }

      toast.success(`Admin created: ${data.email}`);
      setNewEmail("");
      setNewPassword("");
      setNewRole("admin");
      setNewPerms(["dashboard", "products"]);
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to create admin");
    } finally {
      setCreating(false);
    }
  };

  const togglePerm = (
    uid: string,
    perms: AdminSection[],
    section: AdminSection,
  ) => {
    const next = perms.includes(section)
      ? perms.filter((p) => p !== section)
      : [...perms, section];
    setAdmins((prev) =>
      prev.map((a) => (a.uid === uid ? { ...a, permissions: next } : a)),
    );
  };

  const savePerms = async (uid: string) => {
    const target = admins.find((a) => a.uid === uid);
    if (!target || !currentAdmin?.uid) return;
    setSavingUid(uid);
    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          role: target.role,
          permissions: target.permissions,
          callerUid: currentAdmin.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save");

      toast.success("Permissions saved");
      if (currentAdmin.uid === uid) await refreshAdmin();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save");
    } finally {
      setSavingUid(null);
    }
  };

  const removeAdmin = async (uid: string, email: string) => {
    if (uid === currentAdmin?.uid) {
      toast.error("You can't remove yourself");
      return;
    }
    if (
      !confirm(`Delete admin account ${email}? This also removes their login.`)
    )
      return;
    if (!currentAdmin?.uid) return;

    setDeletingUid(uid);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, callerUid: currentAdmin.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete");

      toast.success("Deleted");
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to delete");
    } finally {
      setDeletingUid(null);
    }
  };

  if (!isSuper) {
    return (
      <div className="card p-6 text-red-600">
        You don't have permission to manage admin users.
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create admin accounts directly from here — no Firebase Console needed.
        </p>
      </div>

      {/* CREATE */}
      <form onSubmit={handleCreate} className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus size={18} className="text-blue-600" />
          <h2 className="font-bold text-lg">Create Admin</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className="input mt-1"
              placeholder="staff@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                className="input pr-10"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setNewRole("admin")}
            className={`px-3 py-1.5 rounded-lg border text-sm ${
              newRole === "admin"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-gray-300"
            }`}
          >
            Admin (limited)
          </button>
          <button
            type="button"
            onClick={() => setNewRole("super")}
            className={`px-3 py-1.5 rounded-lg border text-sm ${
              newRole === "super"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-gray-300"
            }`}
          >
            Super admin (all access)
          </button>
        </div>

        {newRole === "admin" && (
          <div className="border rounded-lg p-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Section access
            </p>
            <div className="flex flex-wrap gap-3">
              {SECTIONS.map((s) => (
                <label key={s.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newPerms.includes(s.key)}
                    onChange={(e) =>
                      setNewPerms((prev) =>
                        e.target.checked
                          ? [...prev, s.key]
                          : prev.filter((p) => p !== s.key),
                      )
                    }
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={creating}
          className="btn-primary flex items-center gap-2 disabled:bg-gray-400"
        >
          {creating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          {creating ? "Creating…" : "Create Admin"}
        </button>
      </form>

      {/* LIST */}
      <div className="space-y-3">
        <h2 className="font-bold text-lg">Existing admins</h2>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            Loading…
          </div>
        ) : admins.length === 0 ? (
          <p className="text-gray-500 text-sm">No admin users yet.</p>
        ) : (
          admins.map((a) => {
            const isSelf = a.uid === currentAdmin?.uid;
            const isWildcard =
              Array.isArray(a.permissions) &&
              a.permissions.includes("*" as AdminSection);
            return (
              <div key={a.uid} className="card p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {a.email}{" "}
                      {isSelf && (
                        <span className="text-[10px] uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-2">
                          you
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      UID: {a.uid}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={a.role}
                      onChange={(e) => {
                        const role = e.target.value as "admin" | "super";
                        setAdmins((prev) =>
                          prev.map((x) =>
                            x.uid === a.uid
                              ? {
                                  ...x,
                                  role,
                                  permissions:
                                    role === "super"
                                      ? (["*"] as any)
                                      : (
                                          x.permissions as AdminSection[]
                                        ).filter((p) => (p as string) !== "*"),
                                }
                              : x,
                          ),
                        );
                      }}
                      disabled={isSelf}
                      className="input py-1 text-sm w-36"
                    >
                      <option value="admin">Admin</option>
                      <option value="super">Super admin</option>
                    </select>

                    <button
                      onClick={() => savePerms(a.uid)}
                      disabled={savingUid === a.uid || deletingUid === a.uid}
                      className="btn-primary text-sm flex items-center gap-1 disabled:bg-gray-400"
                    >
                      {savingUid === a.uid ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      Save
                    </button>

                    <button
                      onClick={() => removeAdmin(a.uid, a.email)}
                      disabled={isSelf || deletingUid === a.uid}
                      className="text-red-500 hover:text-red-700 p-1 disabled:opacity-30"
                      title={isSelf ? "You can't remove yourself" : "Delete"}
                    >
                      {deletingUid === a.uid ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {!isWildcard && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {SECTIONS.map((s) => (
                      <label
                        key={s.key}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          disabled={isSelf}
                          checked={
                            (a.permissions as AdminSection[])?.includes(
                              s.key,
                            ) || false
                          }
                          onChange={() =>
                            togglePerm(
                              a.uid,
                              (a.permissions as AdminSection[]) || [],
                              s.key,
                            )
                          }
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                )}

                {isWildcard && (
                  <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
                    Super admin — full access to every section.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
