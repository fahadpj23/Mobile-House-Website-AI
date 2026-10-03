"use client";
import { useState, useEffect, Suspense } from "react";
import { useAdminAuth } from "@/components/AdminAuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { ShieldCheck, Lock } from "lucide-react";

function AdminLoginForm() {
  const { user, admin, loading } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !user || !admin) return;
    router.replace(redirect);
  }, [user, admin, loading, router, redirect]);

  useEffect(() => {
    if (errorParam === "not_admin") {
      toast.error("This account is not an admin.");
    } else if (errorParam === "no_access") {
      toast.error("You don't have access to that section.");
    }
  }, [errorParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { adminAuth } = await import("@/lib/firebase");
      const { signInWithEmailAndPassword } = await import("firebase/auth");

      const cred = await signInWithEmailAndPassword(
        adminAuth,
        email.trim(),
        password,
      );

      // Wait briefly for AdminAuthProvider to load the admin doc
      const { getAdminDoc } = await import("@/lib/adminAuth");
      const adminDoc = await getAdminDoc(cred.user);

      if (!adminDoc) {
        await adminAuth.signOut();
        toast.error(
          "This account is not an admin. Ask a super admin to add you.",
        );
        setSubmitting(false);
        return;
      }

      toast.success(`Welcome, ${adminDoc.email}`);
      router.replace(redirect);
    } catch (err: any) {
      console.error("[admin login]", err);
      toast.error(err?.message || "Login failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-sm text-gray-500 mt-1">
            Mobile_house Control Panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              autoFocus
              placeholder="admin@mobilehouse.com"
              className="input mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="input mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:bg-gray-400"
          >
            <Lock size={16} />
            {submitting ? "Signing in..." : "Sign in as Admin"}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Restricted area. Only authorized administrators may proceed.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading...</p>}>
      <AdminLoginForm />
    </Suspense>
  );
}
