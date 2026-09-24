"use client";
import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/components/AuthProvider";
import { isAdminUser } from "@/lib/adminAuth";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { ShieldCheck, Lock } from "lucide-react";

function AdminLoginForm() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in as admin, skip login
  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const ok = await isAdminUser(user);
      if (ok) router.replace(redirect);
    })();
  }, [user, loading, router, redirect]);

  useEffect(() => {
    if (errorParam === "not_admin") {
      toast.error("This account is not an admin.");
    }
  }, [errorParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email.trim(), password);

      // Wait a tick for onAuthStateChanged → user becomes available
      setTimeout(async () => {
        const { auth } = await import("@/lib/firebase");
        const current = auth.currentUser;
        const ok = await isAdminUser(current);
        if (!ok) {
          toast.error("Not an admin account");
          setSubmitting(false);
          return;
        }
        toast.success("Welcome, admin!");
        router.replace(redirect);
      }, 500);
    } catch (err: any) {
      toast.error(err.message || "Login failed");
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
